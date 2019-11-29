const _ = require("lodash"),
  Transactions = require("./transactions");

const { validateTx } = Transactions;

let mempool = []; //txs[]

const getMempool = () => _.cloneDeep(mempool);

const getTxInsInPool = mempool => {
  return _(mempool)
    .map(tx => tx.txIns)
    .flatten()
    .value();
};

//Tx 이 멤풀 내에서 올바른지 검증
const isTxValidForPool = (tx, mempool) => {
    const txInsInPool = getTxInsInPool(mempool);
  
    const isTxInAlreadyInPool = (txIns, txIn) => {
      return _.find(txIns, txInInPool => {
        return (
          txIn.txOutIndex === txInInPool.txOutIndex &&
          txIn.txOutId === txInInPool.txOutId
        );
      });
    };
   // 트랜잭션이 풀에 이미 존재하는지 확인
    for (const txIn of tx.txIns) {
      if (isTxInAlreadyInPool(txInsInPool, txIn)) {
        return false;
      }
    }
    return true;
  };
  
//txIn 이 사용되지 않았는지 확인 
  const hasTxIn = (txIn, uTxOutList) => {
    const foundTxIn = uTxOutList.find(
      uTxO => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex
    );
  
    return foundTxIn !== undefined;
  };
  

  const hasTxIn = (txIn, uTxOutList) => {
    const foundTxIn = uTxOutList.find(
      uTxO => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex
    );
  
    return foundTxIn !== undefined;
  };
  
  const updateMempool = uTxOutList => {
    const invalidTxs = [];
    //txIn 이 실제 사용되지 않았는지 확인
    for (const tx of mempool) {
      for (const txIn of tx.txIns) {
        if (!hasTxIn(txIn, uTxOutList)) {
          invalidTxs.push(tx);
          break;
        }
      }
    }
    //사용된게 있다면 멤풀에서 제외
    if (invalidTxs.length > 0) {
      mempool = _.without(mempool, ...invalidTxs);
    }
  };
  
  const addToMempool = (tx, uTxOutList) => {
    if (!validateTx(tx, uTxOutList)) {
      throw Error("이 tx 은 invalid 하므로 멤풀에 넣지 않음.");
    } else if (!isTxValidForPool(tx, mempool)) {
      throw Error("이 tx 은 이미 존재 하므로 멤풀에 넣지 않음.");
    }
    mempool.push(tx);
  };
  
  module.exports = {
    addToMempool,
    getMempool,
    updateMempool
  };
  