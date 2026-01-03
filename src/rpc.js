/**
 * Copyright (c) 2020-2026 The DigiByte Core developers
 *
 * RPC Client - now using modern axios-based implementation
 * Previously used deprecated rpc-bitcoin package
 *
 * This file maintains backward compatibility by re-exporting the new client.
 * All existing code using `require('./rpc')` will continue to work.
 */

const rpc = require('./rpc-client');

module.exports = rpc;
