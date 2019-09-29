const CryptoJS = require("crypto-js"),
  hexToBinary = require("hex-to-binary");

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

const genesisBlock = new Block(
    0,
    "4d1bff8db689882e2bb4c5236d054d3513ad4f4500caebfb7b14b4531981aa45",
    "",
    1569523151,
    "", //genesisTx
    4,
    0
  );
  
// 블록체인 선언
let blockchain = [genesisBlock];

//가장 최신 블록 
const getNewestBlock = () => blockchain[blockchain.length - 1];

//블록 체인 전체
const getBlockchain = () => blockchain;

const calculateNewDifficulty = (newestBlock, blockchain) => {
    //TODO : 새로운 Difficulty 계산
    return 0;
};

const findDifficulty = () => {
    //TODO : Difficulty 리턴 (새로운 Difficulty 로 계산 할지, 기존 것 쓸 지)
    return 0;
};

const hashMatchesDifficulty = (hash, difficulty = 0) => {
  const hashInBinary = hexToBinary(hash);
  const requiredZeros = "0".repeat(difficulty);
  console.log("Trying difficulty:", difficulty, "with hash", hashInBinary);
  return hashInBinary.startsWith(requiredZeros);
};

//Nonce 를 1씩 증가시키며 Mining 하는 작업. 
//실제로는 timestamp 값도 바꿔가면서 함
const findBlock = (index, previousHash, timestamp, data, difficulty) => {
    let nonce = 0;
    while (true) {
      console.log("Current nonce", nonce);
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

  const addBlockToChain = candidateBlock => {
    if (isBlockValid(candidateBlock, getNewestBlock())) {
        //TODO : Tx 관련 작업
        blockchain.push(candidateBlock);
        return true;
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
    //TODO : 새로운 블록 브로드 캐스팅
    return newBlock;
  };

  //TODO : 남이 보내준 블록 Valid 한지 확인 및 교체 결정

  //TODO : Tx 핸들링 하기

  //TODO : 계정 밸런스
  
  findBlock(1, "4d1bff8db689882e2bb4c5236d054d3513ad4f4500caebfb7b14b4531981aa45", getTimestamp(), "", 4);