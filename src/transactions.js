const CryptoJS = require("crypto-js"),
  elliptic = require("elliptic"),
  _ = require("lodash"),
  utils = require("./utils");

const ec = new elliptic.ec("secp256k1");

//CoinBase 로 부터 오는 보상 금액 (50BTC)
//실제로는 매 210000 블록마다 반으로 줄어듬
const COINBASE_AMOUNT = 50;

//트랜잭션 구조체

//트랜잭션 
class TxOut {
  constructor(address, amount) {
    this.address = address;
    this.amount = amount;
  }
}

class TxIn {
    // txOutId
    // txOutIndex
    // Signature
}

class Transaction {
  // ID
  // txIns[]
  // txOuts[]
}

//constructor 로 잡으면 클래스가 클래스를 참조해서 가독성이 떨어짐
// const txIn = new TxIn("",blockIndex,"");
// const tx = new Transaction(getTxId(tx),[txIn],[new TxOut(address, COINBASE_AMOUNT)]);
  

class UTxOut {
    constructor(txOutId, txOutIndex, address, amount) {
      this.txOutId = txOutId;
      this.txOutIndex = txOutIndex;
      this.address = address;
      this.amount = amount;
    }
  }
  
//Transaction ID : 모두 다 해시 한 것.
const getTxId = tx => {
  const txInContent = tx.txIns //txIns 에서 txOutId 와 txOutIndex를 모두 더함
    .map(txIn => txIn.txOutId + txIn.txOutIndex)
    .reduce((a, b) => a + b, "");

  const txOutContent = tx.txOuts //txOuts 에서 주소, amount 를 모두 더함
    .map(txOut => txOut.address + txOut.amount)
    .reduce((a, b) => a + b, "");
  //위에서 더한 것과 timestamp 를 더해서 해시
  return CryptoJS.SHA256(txInContent + txOutContent + tx.timestamp).toString();
};

//사용되지 않은 트랜잭션 리스트에서 txOutId가 같고 txOutIndex 가 같은 것을 찾음.
const findUTxOut = (txOutId, txOutIndex, uTxOutList) => {
  return uTxOutList.find(
    uTxO => uTxO.txOutId === txOutId && uTxO.txOutIndex === txOutIndex
  );
};

//트랜잭션의 id 는 해시값임. 이걸 사이닝 할 것임.
const signTxIn = (tx, txInIndex, privateKey, uTxOutList) => {
  const txIn = tx.txIns[txInIndex];
  const dataToSign = tx.id;
  const referencedUTxOut = findUTxOut(
    txIn.txOutId,
    txIn.txOutIndex,
    uTxOutList
  );
  if (referencedUTxOut === null || referencedUTxOut === undefined) {
    throw Error("uTxOut 참조를 찾지 못했으므로 사이닝 안함.");
    return;
  }
  const referencedAddress = referencedUTxOut.address;
  if (getPublicKey(privateKey) !== referencedAddress) {
    return false;
  }
  const key = ec.keyFromPrivate(privateKey, "hex");
  const signature = utils.toHexString(key.sign(dataToSign).toDER());
  return signature;
};


const getPublicKey = privateKey => {
  return ec
    .keyFromPrivate(privateKey, "hex")
    .getPublic()
    .encode("hex");
};

//UTxOuts 를 업데이트함. ?? 
const updateUTxOuts = (newTxs, uTxOutList) => {
  const newUTxOuts = newTxs
    .map(tx =>
      tx.txOuts.map(
        (txOut, index) => new UTxOut(tx.id, index, txOut.address, txOut.amount)
      )
    )
    .reduce((a, b) => a.concat(b), []);

  const spentTxOuts = newTxs
    .map(tx => tx.txIns)
    .reduce((a, b) => a.concat(b), [])
    .map(txIn => new UTxOut(txIn.txOutId, txIn.txOutIndex, "", 0));

  const resultingUTxOuts = uTxOutList
    .filter(uTxO => !findUTxOut(uTxO.txOutId, uTxO.txOutIndex, spentTxOuts))
    .concat(newUTxOuts);
  return resultingUTxOuts;
};


//txIn 을 가져와서 구조가 올바른지 본다.
const isTxInStructureValid = txIn => {
  if (txIn === null) {
    console.log("txIn 이 없음");
    return false;
  } else if (typeof txIn.signature !== "string") {
    console.log("txIn의 signature가 문자열이 아님 ");
    return false;
  } else if (typeof txIn.txOutId !== "string") {
    console.log("txIn의 txOutId 가 문자열이 아님");
    return false;
  } else if (typeof txIn.txOutIndex !== "number") {
    console.log("txIn의 txOutIndex 가 숫자가 아님");
    return false;
  } else {
    return true;
  }
};

//주소 구조가 올바른지 확인
const isAddressValid = address => {
  if (address.length !== 130) {
    console.log("주소 길이가 130자가 아님");
    return false;
  } else if (address.match("^[a-fA-F0-9]+$") === null) {
    console.log("주소에 이상한 문자가 있음");
    return false;
  } else if (!address.startsWith("04")) {
    console.log("주소가 04로 시작 해야 함");
    return false;
  } else {
    return true;
  }
};

//TxOut 구조가 올바른지 확인
const isTxOutStructureValid = txOut => {
  if (txOut === null) {
    return false;
  } else if (typeof txOut.address !== "string") {
    console.log("txOut의 주소가 문자열이 아님");
    return false;
  } else if (!isAddressValid(txOut.address)) {
    console.log("txOut의 주소가 문자열은 맞긴한데 올바르지 않음.");
    return false;
  } else if (typeof txOut.amount !== "number") {
    console.log("txOut의 양이 숫자가 아님.");
    return false;
  } else {
    return true;
  }
};

//트랜잭션 구조 검증
const isTxStructureValid = tx => {
  if (typeof tx.id !== "string") {
    console.log("Tx id 가 문자열이 아님");
    return false;
  } else if (!(tx.txIns instanceof Array)) {
    console.log("txIns 가 배열이 아님");
    return false;
  } else if (
    !tx.txIns.map(isTxInStructureValid).reduce((a, b) => a && b, true)
  ) {
    console.log("txIn The structure of one of the txIn is not valid");
    return false;
  } else if (!(tx.txOuts instanceof Array)) {
    console.log("The txOuts are not an array");
    return false;
  } else if (
    !tx.txOuts.map(isTxOutStructureValid).reduce((a, b) => a && b, true)
  ) {
    console.log("The structure of one of the txOut is not valid");
    return false;
  } else {
    return true;
  }
};

//TxIn 검증 - 
const validateTxIn = (txIn, tx, uTxOutList) => {
  const wantedTxOut = uTxOutList.find(
    //uTxOutList 에서 인풋의 txOutId 가 존재하는지.
    //txOutIndex 가 존재하는지.
    uTxO => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex
  );
  if (wantedTxOut === undefined) {
    console.log(`uTxOut를 못 찾았음, tx: ${tx} 가 올바르지 않음.`);
    return false;
  } else {
    const address = wantedTxOut.address;
    const key = ec.keyFromPublic(address, "hex");
    return key.verify(tx.id, txIn.signature);
  }
};

const getAmountInTxIn = (txIn, uTxOutList) =>
  findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOutList).amount;

//tx 를 검증함. 
const validateTx = (tx, uTxOutList) => {
  //tx 구조 검증
  if (!isTxStructureValid(tx)) {
    console.log("Tx 구조가 이상함.");
    return false;
  }

  //실제 해시 계산
  if (getTxId(tx) !== tx.id) {
    console.log("tx 해시한거랑 id 랑 다름.");
    return false;
  }

  const hasValidTxIns = tx.txIns.map(txIn =>
    validateTxIn(txIn, tx, uTxOutList)
  );

  //validTxIns
  if (!hasValidTxIns) {
    console.log(`tx: ${tx} 올바르지 않음.`);
    return false;
  }

  //amountInTxIns
  const amountInTxIns = tx.txIns
    .map(txIn => getAmountInTxIn(txIn, uTxOutList))
    .reduce((a, b) => a + b, 0);

  const amountInTxOuts = tx.txOuts
    .map(txOut => txOut.amount)
    .reduce((a, b) => a + b, 0);

  if (amountInTxIns !== amountInTxOuts) {
    console.log(
      `tx: ${tx} txIns 의 잔고가 txOuts 의 잔고와 다름`
    );
    return false;
  } else {
    return true;
  }
};

//Coinbase Transaction 검증
const validateCoinbaseTx = (tx, blockIndex) => {
  if (getTxId(tx) !== tx.id) {
    console.log("잘못 계산된 Tx id");
    return false;
  } else if (tx.txIns.length !== 1) {
    console.log("Coinbase TX 는 반드시 하나의 Input 만 있어야 함");
    return false;
  } else if (tx.txIns[0].txOutIndex !== blockIndex) {
    console.log(
      "txOutIndex 의 Coinbase Tx 은 Block Index 와 같아야 함."
    );
    return false;
  } else if (tx.txOuts.length !== 1) {
    console.log("Coinbase TX 는 하나의 Output 만 가져야 함.");
    return false;
  } else if (tx.txOuts[0].amount !== COINBASE_AMOUNT) {
    console.log(
      `Coinbase TX 은 오직 정해진 양이어야 함. ${COINBASE_AMOUNT} != ${
        tx.txOuts[0].amount
      }`
    );
    return false;
  } else {
    return true;
  }
};


//Coinbase 기반 트랜잭션 생성
const createCoinbaseTx = (address, blockIndex) => {
  const tx = new Transaction();
  const txIn = new TxIn();
  txIn.signature = "";
  txIn.txOutId = "";
  txIn.txOutIndex = blockIndex;
  tx.txIns = [txIn];
  tx.txOuts = [new TxOut(address, COINBASE_AMOUNT)];
  tx.id = getTxId(tx);
  return tx;
};

//txIns 에 중복된게 있는지 찾음.
//txOutId 랑 txOutIndex를 더한 것을 센다 -> Identity 이므로 하나씩 밖에 안나옴
//-> 2개 이상 나오면 중복된게 있는것
const hasDuplicates = txIns => {
  const groups = _.countBy(txIns, txIn => txIn.txOutId + txIn.txOutIndex);

  return _(groups)
    .map(value => {
      if (value > 1) {
        console.log("두개 이상의 중복된 txIn");
        return true;
      } else {
        return false;
      }
    })
    .includes(true);
};


//TODO : BlockTxs 검증
const validateBlockTxs = (txs, uTxOutList, blockIndex) => {
  const coinbaseTx = txs[0];
  if (!validateCoinbaseTx(coinbaseTx, blockIndex)) {
    console.log("Coinbase Tx 가 이상합니다"); //Q: return
    return false;
  }

  //txs 는 트랜잭션을 모아놓은 것.
  //[ tx1, tx2, ... ]
  // tx1 = {txIns[], txOuts[]}
  //여기서 이런 구조에서 다시 1차원 배열을 만들려면 flatten 이 필요하다.
  const txIns = _(txs)
    .map(tx => tx.txIns)
    .flatten()
    .value();

  if (hasDuplicates(txIns)) {
    return false;
  }

  const nonCoinbaseTxs = txs.slice(1);

  return nonCoinbaseTxs
    .map(tx => validateTx(tx, uTxOutList))  // 리턴되는게 true / false
    .reduce((a, b) => a && b, true);         // Q: a && b - 하나라도 false 면 false
};

//Tx에 이상이 없는 경우 UTxOuts 업데이트
const processTxs = (txs, uTxOutList, blockIndex) => {
  if (!validateBlockTxs(txs, uTxOutList, blockIndex)) {
    return null;
  }
  return updateUTxOuts(txs, uTxOutList);
};

module.exports = {
  getPublicKey,
  getTxId,
  signTxIn,
  TxIn,
  Transaction,
  TxOut,
  createCoinbaseTx,
  processTxs,
  validateTx
};
