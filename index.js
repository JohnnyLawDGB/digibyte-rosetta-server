/**
 * Copyright (c) 2020-2022 The DigiByte Core developers
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const RosettaSDK = require('rosetta-node-sdk');

const Config = require('./config');
const ServiceHandlers = require('./src/services');
const DigiByteSyncer = require('./src/digibyteSyncer');
const DigiByteIndexer = require('./src/digibyteIndexer');
const rpc = require('./src/rpc');

console.log(`                                                                    
 ____  _     _ _____     _          _____             _   _          _____       _     
|    \\|_|___|_| __  |_ _| |_ ___   | __  |___ ___ ___| |_| |_ ___   |   | |___ _| |___ 
|  |  | | . | | __ -| | |  _| -_|  |    -| . |_ -| -_|  _|  _| .'|  | | | | . | . | -_|
|____/|_|_  |_|_____|_  |_| |___|  |__|__|___|___|___|_| |_| |__,|  |_|___|___|___|___|
        |___|       |___|                                                              

             Version                  ${Config.version}
             Rosetta Version          ${Config.rosettaVersion}
             DigiByte Node Version    ${Config.digibyteVersion}
             Networks                 ${JSON.stringify(Config.serverConfig.networkIdentifiers)}
             Port                     ${Config.port}
`);

/* Create a server configuration */
const Server = new RosettaSDK.Server({
  URL_HOST: Config.host,
  URL_PORT: Config.port,
});

/*
 * Rosetta CLI 1.4.1 sends the syncer secret inside a "headers"
 * property on the request body (in addition to the HTTP header).
 *
 * express-openapi-validator performs schema validation before the
 * request reaches our handlers. If the request body does not contain
 * the optional "headers" object, the validator rejects the call with
 * "request should have required property 'headers'".
 *
 * When the server makes internal fetcher calls we always include the
 * HTTP header defined in Config.syncer.defaultHeaders, but external
 * clients (like curl) were missing the body property.  We mirror the
 * trusted HTTP header into req.body.headers so validation succeeds for
 * both the syncer and manual requests.
 */
Server.expressServer.app.use((req, res, next) => {
  if (!req || req.method !== 'POST') return next();

  const { body } = req;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return next();

  // Only add the property when the header is present to avoid masking
  // genuine validation issues on unrelated requests.
  const syncerSecretHeader = req.headers && req.headers['syncer-secret'];
  if (!syncerSecretHeader) return next();

  if (!Object.prototype.hasOwnProperty.call(req, 'headers')) {
    // express-openapi-validator clones the request using Object.assign, which
    // only copies own enumerable properties. Ensure the headers are directly
    // attached so validation can see them.
    Object.defineProperty(req, 'headers', {
      value: { ...req.headers },
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }

  if (!body.headers || typeof body.headers !== 'object') {
    body.headers = {};
  }

  if (!body.headers['syncer-secret']) {
    body.headers['syncer-secret'] = syncerSecretHeader;
  }

  return next();
});

const asserter = RosettaSDK.Asserter.NewServer(
  Config.serverConfig.operationTypesList,
  Config.serverConfig.historicalBalanceLookup,
  Config.serverConfig.networkIdentifiers,
);

// Register global asserter
Server.useAsserter(asserter);

/* Data API: Network */
Server.register('/network/list', ServiceHandlers.Network.networkList);
Server.register('/network/options', ServiceHandlers.Network.networkOptions);
Server.register('/network/status', ServiceHandlers.Network.networkStatus);

/* Data API: Block */
Server.register('/block', ServiceHandlers.Block.block);
Server.register('/block/transaction', ServiceHandlers.Block.blockTransaction);

/* Data API: Account */
Server.register('/account/balance', ServiceHandlers.Account.balance);
Server.register('/account/coins', ServiceHandlers.Account.coins);

/* Data API: Mempool */
Server.register('/mempool', ServiceHandlers.Mempool.mempool);
Server.register('/mempool/transaction', ServiceHandlers.Mempool.mempoolTransaction);

/* Construction API */
if (Config.offline) {
  Server.register('/construction/derive', ServiceHandlers.Construction.constructionDerive); // 1
  Server.register('/construction/preprocess', ServiceHandlers.Construction.constructionPreprocess); // 2
  Server.register('/construction/payloads', ServiceHandlers.Construction.constructionPayloads); // 4
  Server.register('/construction/parse', ServiceHandlers.Construction.constructionParse); // 5, 7
  Server.register('/construction/combine', ServiceHandlers.Construction.constructionCombine); // 6
  Server.register('/construction/hash', ServiceHandlers.Construction.constructionHash); // 8
} else {
  Server.register('/construction/metadata', ServiceHandlers.Construction.constructionMetadata); // 3
  Server.register('/construction/submit', ServiceHandlers.Construction.constructionSubmit); // 9
}

/* Initialize Syncer */
const startSyncer = async () => {
  console.log(`Starting sync from height ${DigiByteIndexer.lastBlockSymbol + 1}...`);
  await DigiByteSyncer.initSyncer();

  continueSyncIfNeeded();
  return true;
};

const continueSyncIfNeeded = async () => {
  const currentHeight = DigiByteIndexer.lastBlockSymbol;
  const blockCount = await rpc.getblockcount();

  if (currentHeight >= blockCount) {
    // If the sync block height equals the best block height,
    // set the syncer as synced.
    DigiByteSyncer.setIsSynced();
    return setTimeout(continueSyncIfNeeded, 10000);
  }

  const nextHeight = currentHeight + 1;

  // Sync the next blocks
  const syncCount = Math.min(blockCount - nextHeight, 1000);
  const targetHeight = nextHeight + syncCount;

  await DigiByteSyncer.sync(nextHeight, targetHeight);
  await DigiByteIndexer.saveState();

  setImmediate(() => {
    // Continue to sync, but using the event queue.
    // That way, the promise chain gets interrupted
    // and memory leaks are prevented.
    continueSyncIfNeeded(); // loop
  });
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const startServer = async () => {
  Server.launch();
};

const checkConnection = async () => {
  process.stdout.write('Waiting for RPC node to be ready...');

  for (;;) {
    try {
      const response = await rpc.getblockcount();
      if (response === 0) throw new Error('Block height is zero');
      break;
    } catch (e) {
      await wait(30000);
      process.stdout.write('.');
    }
  }

  console.log(' RPC Node ready!');
};

const init = async () => {
  // Wait until rpc is reachable
  await checkConnection();

  // Start the REST Server
  await startServer();

  // Init the UTXO indexing service
  await DigiByteIndexer.initIndexer();

  // Start the UTXO indexer
  await startSyncer();
};

const initOffline = async () => {
  // Start the REST Server
  await startServer();
};

if (Config.offline) {
  console.log('Starting in offline mode...');
  initOffline().catch((e) => {
    console.error(`Could not start node in offline mode: ${e.message}`);
    console.error(e);
  });
} else {
  console.log('Starting in online mode...');
  init().catch((e) => {
    console.error(`Could not start node in online mode: ${e.message}`);
    console.error(e);
  });
}
