const WebSockets = require("ws");
const Blockchain = require("./blockchain");

  const {
    getNewestBlock,
    isBlockStructureValid,
    replaceChain,
    getBlockchain,
    addBlockToChain,
    //handleIncomingTx // TODO: With Tx
  } = Blockchain;

const sockets = [];

const GET_LATEST = "GET_LATEST";
const GET_ALL = "GET_ALL";
const BLOCKCHAIN_RESPONSE = "BLOCKCHAIN_RESPONSE";

//TODO : Mempool with Tx
//const REQUEST_MEMPOOL = "REQUEST_MEMPOOL";
//const MEMPOOL_RESPONSE = "MEMPOOL_RESPONSE";

// Message Creators
const getLatest = () => {
    return {
      type: GET_LATEST,
      data: null
    };
  };
  
const getAll = () => {
    return {
      type: GET_ALL,
      data: null
    };
  };
  
const blockchainResponse = data => {
  return {
    type: BLOCKCHAIN_RESPONSE,
    data
  };
};

/* TODO : Tx
const getAllMempool = () => {
    return {
      type: REQUEST_MEMPOOL,
      data: null
    };
  };
  
const mempoolResponse = data => {
  return {
    type: MEMPOOL_RESPONSE,
    data
  };
};
*/

//TODO : Tx
//const returnMempool = () => mempoolResponse(getMempool());

const responseLatest = () => blockchainResponse([getNewestBlock()]);

const responseAll = () => blockchainResponse(getBlockchain());

const sendMessage = (ws, message) => ws.send(JSON.stringify(message));

const sendMessageToAll = message =>
  sockets.forEach(ws => sendMessage(ws, message));

const broadcastNewBlock = () => sendMessageToAll(responseLatest());

//TODO : Tx
//const broadcastMempool = () => sendMessageToAll(returnMempool());

const getSockets = () => sockets;

const initSocketConnection = ws => {
  sockets.push(ws);
  handleSocketMessages(ws);
  handleSocketError(ws);
  sendMessage(ws, getLatest());
  // TODO : Tx
  // setTimeout(() => {
  //   sendMessageToAll(getAllMempool()); // changed line
  // }, 1000);
  setInterval(() => {
    if (sockets.includes(ws)) {
      sendMessage(ws, "");
    }
  }, 1000);
};


const startP2PServer = server => {
  const wsServer = new WebSockets.Server({ server });
  wsServer.on("connection", ws => {
    initSocketConnection(ws);
  });
  wsServer.on("error", () => {
    console.log("error");
  });
  console.log("lectureChain P2P Server running");
};




const handleBlockchainResponse = receivedBlocks => {
  if (receivedBlocks.length === 0) {
    console.log("받은 블럭체인 길이가 0");
    return;
  }
  const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
  if (!isBlockStructureValid(latestBlockReceived)) {
    console.log("받은 블록체인 구조가 이상함.");
    return;
  }
  const newestBlock = getNewestBlock();
  if (latestBlockReceived.index > newestBlock.index) {
    if (newestBlock.hash === latestBlockReceived.previousHash) {
      if (addBlockToChain(latestBlockReceived)) {
        broadcastNewBlock();
      }
    } else if (receivedBlocks.length === 1) {
      sendMessageToAll(getAll());
    } else {
      replaceChain(receivedBlocks);
    }
  }
};

const handleSocketMessages = ws => {
  ws.on("message", data => {
    //try / catch 필요
    const message = JSON.parse(data);
    if (message === null) {
      return;
    }
    switch (message.type) {
      case GET_LATEST:
        sendMessage(ws, responseLatest());
        break;
      case GET_ALL:
        sendMessage(ws, responseAll());
        break;
      case BLOCKCHAIN_RESPONSE:
        const receivedBlocks = message.data;
        if (receivedBlocks === null) {
          break;
        }
        handleBlockchainResponse(receivedBlocks);
        break;
      // TODO : Tx
      // case REQUEST_MEMPOOL:
      //   sendMessage(ws, returnMempool());
      //   break;
      // case MEMPOOL_RESPONSE:
      //   const receivedTxs = message.data;
      //   if (receivedTxs === null) {
      //     return;
      //   }
      //   receivedTxs.forEach(tx => {
      //     try {
      //       handleIncomingTx(tx);
      //       broadcastMempool();
      //     } catch (e) {
      //       console.log(e);
      //     }
      //   });
      //  break;
    }
  });
};


const handleSocketError = ws => {
  const closeSocketConnection = ws => {
    ws.close();
    sockets.splice(sockets.indexOf(ws), 1);
  };
  ws.on("close", () => closeSocketConnection(ws));
  ws.on("error", () => closeSocketConnection(ws));
};

const connectToPeers = newPeer => {
  const ws = new WebSockets(newPeer);
  ws.on("open", () => {
    initSocketConnection(ws);
  });
  ws.on("error", () => console.log("Connection failed"));
  ws.on("close", () => console.log("Connection failed"));
};

module.exports = {
  startP2PServer,
  connectToPeers,
  broadcastNewBlock
// TODO : Tx
//  broadcastMempool
};
