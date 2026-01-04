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

const Types = RosettaSDK.Client;

const Config = require('../../config');
const rpc = require('../rpc');
const Errors = require('../../config/errors');

const pruneError = (e) => ({ code: e.code, message: e.message, retriable: !!e.retriable });

/* Data API: Network */

/**
* Get List of Available Networks
* This endpoint returns a list of NetworkIdentifiers that the Rosetta server can handle.
*
* metadataRequest MetadataRequest
* returns NetworkListResponse
* */
const networkList = async (params) => {
  // eslint-disable-next-line no-unused-vars
  const { metadataRequest } = params;

  const response = new Types.NetworkListResponse(
    Config.serverConfig.networkIdentifiers,
  );

  return response;
};

/**
* Get Network Options
* This endpoint returns the version information and allowed network-specific types for a NetworkIdentifier. Any NetworkIdentifier returned by /network/list should be accessible here.  Because options are retrievable in the context of a NetworkIdentifier, it is possible to define unique options for each network.
*
* networkRequest NetworkRequest
* returns NetworkOptionsResponse
* */
const networkOptions = async (params) => {
  // eslint-disable-next-line no-unused-vars
  const { networkRequest } = params;

  const version = new Types.Version(
    Config.rosettaVersion,
    Config.digibyteVersion,
  );

  const allow = new Types.Allow(
    Config.serverConfig.operationStatusesList,
    Config.serverConfig.operationTypesList,
    (Config.serverConfig.errorsList || []).map(pruneError),
    Config.serverConfig.historicalBalanceLookup,
  );

  return new Types.NetworkOptionsResponse(version, allow);
};

/**
* Get Network Status
* This endpoint returns the current status of the network requested. Any NetworkIdentifier returned by /network/list should be accessible here.
*
* networkRequest NetworkRequest
* returns NetworkStatusResponse
* */
const networkStatus = async (params) => {
  // eslint-disable-next-line no-unused-vars
  const { networkRequest } = params;

  let currentBlockIdentifier;
  let currentBlockTimestamp;
  let genesisBlockIdentifier;
  let peers;

  try {
    const info = await rpc.getblockchaininfo();
    currentBlockIdentifier = new Types.BlockIdentifier(
      info.blocks, // height
      info.bestblockhash, // hash
    );

    const bestBlock = await rpc.getblock({ blockhash: currentBlockIdentifier.hash, verbosity: 1 });
    currentBlockTimestamp = bestBlock.time * 1000; // milliseconds

    const genesisBlock = await rpc.getblockhash({ height: 0 });
    genesisBlockIdentifier = new Types.BlockIdentifier(
      0, // index: 0
      genesisBlock, // hash
    );

    const peersData = await rpc.getpeerinfo();
    peers = peersData.map((p) => Types.Peer.constructFromObject({
      peer_id: p.id,
      metadata: {
        addr: p.addr,
        version: p.version,
        subver: p.subver,
      },
    }));

    // Rosetta v1.4.9: Add sync_status with synced field
    // The node is considered synced if it's not in initial block download
    // and verification progress is very close to 1.0
    const syncStatus = new Types.SyncStatus(
      info.blocks, // current_index
      info.verificationprogress >= 0.9999, // synced - true if fully synced
    );

    const response = new Types.NetworkStatusResponse(
      currentBlockIdentifier,
      currentBlockTimestamp,
      genesisBlockIdentifier,
      peers,
    );

    // Add sync_status to response
    response.sync_status = syncStatus;

    return response;
  } catch (e) {
    console.error(e);
    throw Errors.UNABLE_TO_RETRIEVE_NODE_STATUS;
  }
};

module.exports = {
  /* /network/list */
  networkList,

  /* /network/options */
  networkOptions,

  /* /network/status */
  networkStatus,
};
