const CryptoJS = require("crypto-js"),
  _ = require("lodash"),
  Wallet = require("./wallet"),
  Mempool = require("./mempool"),
  Transactions = require("./transactions"),
  hexToBinary = require("hex-to-binary");

  const {
    getBalance,
    getPublicFromWallet,
    createTx,
    getPrivateFromWallet
  } = Wallet;
  
  const { createCoinbaseTx, processTxs } = Transactions;
  
  const { addToMempool, getMempool, updateMempool } = Mempool;

class Block {
    constructor(index, hash, previousHash, timestamp, data, difficulty, nonce) {
      this.index = index;
      this.hash = hash; // 이 값을 제외한 모든 값을 직렬화한 뒤 SHA256
      this.previousHash = previousHash;
      this.timestamp = timestamp;
      this.data = data; // TX
      this.difficulty = difficulty;
      this.nonce = nonce;
    }
  }


//UTIL//
const getTimestamp = () => Math.round(new Date().getTime() / 1000);

const createHash = (index, previousHash, timestamp, data, difficulty, nonce) =>
    CryptoJS.SHA256(
    index + previousHash + timestamp + JSON.stringify(data) + difficulty + nonce
    ).toString();

    const genesisTx = {
      txIns: [{ signature: "", txOutId: "", txOutIndex: 0 }],
      txOuts: [
        {
          address:
            "04f20aec39b4c5f79355c053fdaf30410820400bb83ad93dd8ff16834b555e0f6262efba6ea94a87d3c267b5e6aca433ca89b342ac95c40230349ea4bf9caff1ed",
          amount: 50
        }
      ],
      id: "ad67c73cd8e98af6db4ac14cc790664a890286d4b06c6da7ef223aef8c281e76"
    };

    const genesisBlock = new Block(
      0,
      "82a3ecd4e76576fccce9999d560a31c7ad1faff4a3f4c6e7507a227781a8537f",
      "",
      1518512316,
      [genesisTx],
      0,
      0
    );

// 블록체인 선언
let blockchain = [genesisBlock];

//가장 최신 블록 
const getNewestBlock = () => blockchain[blockchain.length - 1];

//블록 체인 전체
const getBlockchain = () => blockchain;

//블록이 몇초에 하나씩 생겨야 할지.
const BLOCK_GENERATION_INTERVAL = 1;
//블록 몇개에 한번씩 난이도 조절을 해야 할지. 
const DIFFICULTY_ADJUSTMENT_INTERVAL = 10;

//사용되지 않은 트랜잭션(UTXO) 관리 시작
let uTxOuts = processTxs(blockchain[0].data, [], 0);

const calculateNewDifficulty = (newestBlock, blockchain) => {
//현재 블록체인으로 부터 10 블록 전 블록을 가져옵니다.
  const lastCalculatedBlock =
    blockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
//10 블록 * 1초 즉, 10 개 만들어지는데 10초가 예상 됩니다.
  const timeExpected =
    BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
//현재 블록의 시각에서 10 블록전의 시각을 빼면 걸린 시간이 나옵니다.
  const timeTaken = newestBlock.timestamp - lastCalculatedBlock.timestamp;
  if (timeTaken < timeExpected) { // 채굴 시간이 예상한 시간보다 더 짧으면 난이도를 높입니다.
    console.log("timeTaken :"+timeTaken+", timeExpected:"+timeExpected+
      " Difficulty + 1 = " + (lastCalculatedBlock.difficulty + 1));
    return lastCalculatedBlock.difficulty + 1;
  } else if (timeTaken > timeExpected) { // 채굴 시간이 예상 시간보다 더 걸리면 난이도를 낮춥니다.
    console.log("timeTaken :"+timeTaken+", timeExpected:"+timeExpected+
      " Difficulty - 1 = " + (lastCalculatedBlock.difficulty - 1));
    return lastCalculatedBlock.difficulty - 1;
  } else { //아니면 난이도를 유지합니다.
    console.log("timeTaken :"+timeTaken+", timeExpected:"+timeExpected);
    return lastCalculatedBlock.difficulty;
  }
};

const findDifficulty = () => {
    const newestBlock = getNewestBlock();
    if (
      newestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 &&
      newestBlock.index !== 0
    ) {
      return calculateNewDifficulty(newestBlock, getBlockchain());
    } else {
      return newestBlock.difficulty;
    }
};

const hashMatchesDifficulty = (hash, difficulty = 0) => {
  const hashInBinary = hexToBinary(hash);
  const requiredZeros = "0".repeat(difficulty);
  //console.log("Trying difficulty:", difficulty, "with hash", hashInBinary);
  return hashInBinary.startsWith(requiredZeros);
};

//Nonce 를 1씩 증가시키며 Mining 하는 작업. 
//실제로는 timestamp 값도 바꿔가면서 함
const findBlock = (index, previousHash, timestamp, data, difficulty) => {
    let nonce = 0;
    while (true) {
      //console.log("Current nonce", nonce);
      const hash = createHash(
        index,
        previousHash,
        timestamp,
        data,
        difficulty,
        nonce
      );
      if (hashMatchesDifficulty(hash, difficulty)) {
        return new Block(
          index,
          hash,
          previousHash,
          timestamp,
          data,
          difficulty,
          nonce
        );
      }
      nonce++;
    }
  };

  const getBlocksHash = block =>
  createHash(
    block.index,
    block.previousHash,
    block.timestamp,
    block.data,
    block.difficulty,
    block.nonce
  );
  
  const isBlockStructureValid = block => {
    return (
      typeof block.index === "number" &&
      typeof block.hash === "string" &&
      typeof block.previousHash === "string" &&
      typeof block.timestamp === "number" &&
      typeof block.data === "object"
    );
  };

  const isTimeStampValid = (newBlock, oldBlock) => {
    return (
      oldBlock.timestamp - 60 < newBlock.timestamp &&
      newBlock.timestamp - 60 < getTimestamp()
    );
  };
  
  const isBlockValid = (candidateBlock, latestBlock) => {
    if (!isBlockStructureValid(candidateBlock)) {
      console.log("후보 블록의 구조가 이상합니다.");
      return false;
    } else if (latestBlock.index + 1 !== candidateBlock.index) {
      console.log("후보 블록의 인덱스가 이상합니다.");
      return false;
    } else if (latestBlock.hash !== candidateBlock.previousHash) {
      console.log(
        "후보 블록의 이전 해시값이 실제 최근 블록의 해시값과 다릅니다."
      );
      return false;
    } else if (getBlocksHash(candidateBlock) !== candidateBlock.hash) {
      console.log("후보 블록의 다이제스트와 해시 계산값이 다릅니다.");
      return false;
    } else if (!isTimeStampValid(candidateBlock, latestBlock)) {
      console.log("후보 블록의 시간이 올바르지 않습니다.");
      return false;
    }
    return true;
  };

  const addBlockToChain = candidateBlock => {
    if (isBlockValid(candidateBlock, getNewestBlock())) {
      const processedTxs = processTxs(
        candidateBlock.data,
        uTxOuts,
        candidateBlock.index
      );
      if (processedTxs === null) {
        console.log("process txs 실패");
        return false;
      } else { 
        blockchain.push(candidateBlock);
        uTxOuts = processedTxs;
        updateMempool(uTxOuts);
        return true;
      }
    } else {
      return false;
    }
  };
  
//UTIL END//

const createNewRawBlock = data => {
    const previousBlock = getNewestBlock();
    const newBlockIndex = previousBlock.index + 1;
    const newTimestamp = getTimestamp();
    const difficulty = findDifficulty();
    const newBlock = findBlock(
      newBlockIndex,
      previousBlock.hash,
      newTimestamp,
      data,
      difficulty
    );
    addBlockToChain(newBlock);
    require("./p2p").broadcastNewBlock();
    return newBlock;
  };


const isChainValid = candidateChain => {
  const isGenesisValid = block => {
    return JSON.stringify(block) === JSON.stringify(genesisBlock);
  };
  if (!isGenesisValid(candidateChain[0])) {
    console.log(
      "제네시스 블록이 다름."
    );
    return null;
  }
  
  let foreignUTxOuts = [];

  for (let i = 0; i < candidateChain.length; i++) {
    const currentBlock = candidateChain[i];
    if (i !== 0 && !isBlockValid(currentBlock, candidateChain[i - 1])) {
      return null;
    }
    //트랜잭션 프로세싱
    foreignUTxOuts = processTxs(
      currentBlock.data,
      foreignUTxOuts,
      currentBlock.index
    );

    if (foreignUTxOuts === null) {
      return null;
    }
  }
  return foreignUTxOuts;
};

    

  const sumDifficulty = anyBlockchain =>
  anyBlockchain
    .map(block => block.difficulty)             // [1, 2, 2, 4,  5  ]
    .map(difficulty => Math.pow(2, difficulty)) // [1, 4, 4, 16, 25 ]
    .reduce((a, b) => a + b);                   // [1+ 4+ 4+ 16+ 25 ] 
    

  const replaceChain = candidateChain => {
    //isChainValid 에서 후보체인 검증 및 
    //트랜잭션 프로세싱(Tx 검증, UTxOuts) 결과도 리턴 해 줌
    const foreignUTxOuts = isChainValid(candidateChain);
    const validChain = foreignUTxOuts !== null;
    if (
      validChain &&
      sumDifficulty(candidateChain) > sumDifficulty(getBlockchain())
    ) {
      blockchain = candidateChain;
      //멤풀에서 UTXO 업데이트
      uTxOuts = foreignUTxOuts;
      updateMempool(uTxOuts);
      require("./p2p").broadcastNewBlock();
      return true;
    } else {
      console.log("ReplaceChain - 후보체인이 올바르지 않음.")
      return false;
    }
  };
  //UTxOut 리스트 딥클론 및 리턴
  const getUTxOutList = () => _.cloneDeep(uTxOuts);
  //지갑에 있는 돈 리턴
  const getAccountBalance = () => getBalance(getPublicFromWallet(), uTxOuts);
  //들어오는 트랜잭션 핸들링 하기 (멤풀에 추가하기) 
  const handleIncomingTx = tx => {
    addToMempool(tx, getUTxOutList()); // <-- new line
  };

  //트랜잭션 보내기
  const sendTx = (address, amount) => {
    const tx = createTx(
      address,
      amount,
      getPrivateFromWallet(),
      getUTxOutList(),
      getMempool()
    );
    addToMempool(tx, getUTxOutList());
    require("./p2p").broadcastMempool(); // <--- new line
    return tx;
  };
  
  
  const createNewBlock = () => {
    const coinbaseTx = createCoinbaseTx(
      getPublicFromWallet(),
      getNewestBlock().index + 1
    );
    const blockData = [coinbaseTx].concat(getMempool());
    console.log("Mining !", getNewestBlock().index + 1);
    return createNewRawBlock(blockData);
  };
  
  //while(true){ createNewBlock({}); }

  module.exports = {
    getNewestBlock,
    getBlockchain,
    isBlockStructureValid,
    addBlockToChain,
    replaceChain,
    createNewBlock,
    getAccountBalance,  
    sendTx,             
    handleIncomingTx,   
    getUTxOutList       
  };
  