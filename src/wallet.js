const elliptic = require("elliptic"),
  path = require("path"),
  fs = require("fs"),
  _ = require("lodash"),
  Transactions = require("./transactions");

const {
  getPublicKey,
  getTxId,
  signTxIn,
  TxIn,
  Transaction,
  TxOut
} = Transactions;

const ec = new elliptic.ec("secp256k1");

const privateKeyLocation = path.join(__dirname, "privateKey");

const generatePrivateKey = () => {
  const keyPair = ec.genKeyPair();
  const privateKey = keyPair.getPrivate();
  return privateKey.toString(16);
};

const getPrivateFromWallet = () => {
  const buffer = fs.readFileSync(privateKeyLocation, "utf8");
  return buffer.toString();
};

const getPublicFromWallet = () => {
  const privateKey = getPrivateFromWallet();
  const key = ec.keyFromPrivate(privateKey, "hex");
  return key.getPublic().encode("hex");
};

const getBalance = (address, uTxOuts) => {
  return _(uTxOuts)
    .filter(uTxO => uTxO.address === address) // uTxOuts 돌면서 address 가 나의 address 인것들로 필터링
    .map(uTxO => uTxO.amount)                 // 이 중 금액을 끌어모아서
    .sum();                                   // 다 더한게 나의 잔고
};

const initWallet = () => {
  if (fs.existsSync(privateKeyLocation)) {
    return;
  }
  const newPrivateKey = generatePrivateKey();

  fs.writeFileSync(privateKeyLocation, newPrivateKey);
};

const findAmountInUTxOuts = (amountNeeded, myUTxOuts) => {
  let currentAmount = 0;
  const includedUTxOuts = [];
  for (const myUTxOut of myUTxOuts) { // 내가 가진 UTxOuts 중에서
    includedUTxOuts.push(myUTxOut);   // 일단 하나 넣고
    currentAmount = currentAmount + myUTxOut.amount; //현재 금액에 더한 다음
    if (currentAmount >= amountNeeded) { // 필요한 금액 이상이면 
      const leftOverAmount = currentAmount - amountNeeded;
      return { includedUTxOuts, leftOverAmount }; // 포함한 UTXOut 들과 남은 금액 리턴
    }
  }
  throw Error("돈이 충분하지 않습니다.");
};

const createTxOuts = (receiverAddress, myAddress, amount, leftOverAmount) => {
  const receiverTxOut = new TxOut(receiverAddress, amount);
  //넘치는 금액이 0 이면 그대로 전달
  if (leftOverAmount === 0) {
    return [receiverTxOut];
  } else { 
    // 넘치는 금액이 있으면, 자신의 주소로 거스름돈을 받음
    const leftOverTxOut = new TxOut(myAddress, leftOverAmount);
    return [receiverTxOut, leftOverTxOut];
  }
};

//todo : mempool
const filterUTxOutsFromMempool = (uTxOutList, mempool) => {
  const txIns = _(mempool)
    .map(tx => tx.txIns)
    .flatten()
    .value();

  const removables = [];

  for (const uTxOut of uTxOutList) {
    const txIn = _.find(
      txIns,
      txIn =>
        txIn.txOutIndex === uTxOut.txOutIndex && txIn.txOutId === uTxOut.txOutId
    );
    if (txIn !== undefined) {
      removables.push(uTxOut);
    }
  }

  return _.without(uTxOutList, ...removables);
};

//todo : createTx + mempool
const createTx = (receiverAddress, amount, privateKey, uTxOutList, memPool) => {
  const myAddress = getPublicKey(privateKey);
  const myUTxOuts = uTxOutList.filter(uTxO => uTxO.address === myAddress);

  const filteredUTxOuts = filterUTxOutsFromMempool(myUTxOuts, memPool);

  const { includedUTxOuts, leftOverAmount } = findAmountInUTxOuts(
    amount,
    filteredUTxOuts
  );

  const toUnsignedTxIn = uTxOut => {
    const txIn = new TxIn();
    txIn.txOutId = uTxOut.txOutId;
    txIn.txOutIndex = uTxOut.txOutIndex;
    return txIn;
  };

  const unsignedTxIns = includedUTxOuts.map(toUnsignedTxIn);

  const tx = new Transaction();

  tx.txIns = unsignedTxIns;
  tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);

  tx.id = getTxId(tx);

  tx.txIns = tx.txIns.map((txIn, index) => {
    txIn.signature = signTxIn(tx, index, privateKey, uTxOutList);
    return txIn;
  });

  return tx;
};

module.exports = {
  initWallet,
  getBalance,
  getPublicFromWallet,
  createTx,
  getPrivateFromWallet
};
