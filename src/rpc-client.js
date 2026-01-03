/**
 * Copyright (c) 2020-2026 The DigiByte Core developers
 *
 * Modern Bitcoin RPC client using axios
 * Replaces deprecated rpc-bitcoin package which depends on vulnerable 'request' library
 *
 * This client provides a secure, modern HTTP interface to DigiByte Core's JSON-RPC API.
 */

const axios = require('axios');
const Config = require('../config');

/**
 * DigiByteRPCClient - Axios-based RPC client for DigiByte Core
 *
 * Provides both low-level call() method and convenience methods for common RPC operations.
 * All methods return Promises that resolve to the RPC result or reject with errors.
 */
class DigiByteRPCClient {
  constructor(config) {
    this.config = {
      user: config.user,
      pass: config.pass,
      url: config.url,
      port: config.port,
      timeout: config.timeout || 30000, // 30 second default timeout
    };

    // Create axios instance with RPC-specific configuration
    this.client = axios.create({
      baseURL: `${this.config.url}:${this.config.port}`,
      timeout: this.config.timeout,
      auth: {
        username: this.config.user,
        password: this.config.pass,
      },
      headers: {
        'Content-Type': 'text/plain',
      },
      // Prevent axios from throwing on non-2xx status codes
      // We'll handle RPC errors ourselves
      validateStatus: () => true,
    });

    // Counter for JSON-RPC IDs
    this.idCounter = 0;
  }

  /**
   * Make a JSON-RPC call to DigiByte Core
   *
   * @param {string} method - RPC method name (e.g., 'getblockchaininfo')
   * @param {Array} params - Array of parameters for the RPC method
   * @returns {Promise<any>} - Resolves to RPC result, rejects on error
   *
   * @throws {Error} - RPC error with code and message from DigiByte Core
   * @throws {Error} - Network/HTTP errors from axios
   */
  async call(method, params = []) {
    const id = ++this.idCounter;

    try {
      const response = await this.client.post('/', {
        jsonrpc: '1.0',
        id,
        method,
        params,
      });

      // Check for RPC-level errors
      if (response.data && response.data.error !== null && response.data.error !== undefined) {
        const error = new Error(response.data.error.message || 'RPC Error');
        error.code = response.data.error.code;
        error.retriable = this._isRetriableError(response.data.error.code);
        throw error;
      }

      // Check for HTTP-level errors
      if (response.status !== 200) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.retriable = response.status >= 500; // 5xx errors are retriable
        throw error;
      }

      // Return the result
      return response.data.result;

    } catch (error) {
      // If it's already a structured error, re-throw it
      if (error.code !== undefined || error.status !== undefined) {
        throw error;
      }

      // Handle axios-specific errors (network, timeout, etc.)
      if (error.response) {
        // Server responded with error status
        const rpcError = new Error(
          error.response.data?.error?.message ||
          `HTTP ${error.response.status}: ${error.response.statusText}`
        );
        rpcError.code = error.response.data?.error?.code || error.response.status;
        rpcError.status = error.response.status;
        rpcError.retriable = error.response.status >= 500;
        throw rpcError;
      } else if (error.request) {
        // Request made but no response received (network error, timeout)
        const networkError = new Error(`Network error: ${error.message}`);
        networkError.code = 'NETWORK_ERROR';
        networkError.retriable = true; // Network errors are retriable
        throw networkError;
      } else {
        // Error in setting up the request
        throw error;
      }
    }
  }

  /**
   * Determine if an RPC error code indicates a retriable error
   *
   * @private
   * @param {number} code - RPC error code
   * @returns {boolean} - True if error is retriable
   */
  _isRetriableError(code) {
    // RPC error codes that indicate retriable conditions
    const retriableErrors = [
      -28, // RPC_IN_WARMUP - "Loading block index..."
      -10, // RPC_CLIENT_NOT_CONNECTED - "Bitcoin is not connected"
      -2,  // RPC_INVALID_ADDRESS_OR_KEY - Sometimes temporary
    ];
    return retriableErrors.includes(code);
  }

  // ============================================================================
  // Convenience Methods for Common RPC Calls
  // ============================================================================

  /**
   * Get blockchain information and status
   * @returns {Promise<Object>} - Blockchain info object
   */
  async getblockchaininfo() {
    return this.call('getblockchaininfo');
  }

  /**
   * Get information about connected peers
   * @returns {Promise<Array>} - Array of peer info objects
   */
  async getpeerinfo() {
    return this.call('getpeerinfo');
  }

  /**
   * Get block hash for a given height
   * @param {Object} params - Parameters object
   * @param {number} params.height - Block height
   * @returns {Promise<string>} - Block hash
   */
  async getblockhash({ height }) {
    return this.call('getblockhash', [height]);
  }

  /**
   * Get block data
   * @param {Object} params - Parameters object
   * @param {string} params.blockhash - Block hash
   * @param {number} [params.verbosity=2] - Verbosity level (0=hex, 1=json, 2=json+txs)
   * @returns {Promise<Object>} - Block data
   */
  async getblock({ blockhash, verbosity = 2 }) {
    return this.call('getblock', [blockhash, verbosity]);
  }

  /**
   * Get raw transaction data
   * @param {Object} params - Parameters object
   * @param {string} params.txid - Transaction ID
   * @param {boolean} [params.verbose=true] - If true, return JSON; if false, return hex
   * @returns {Promise<Object|string>} - Transaction data (object if verbose, hex string if not)
   */
  async getrawtransaction({ txid, verbose = true }) {
    return this.call('getrawtransaction', [txid, verbose]);
  }

  /**
   * Get raw mempool data
   * @param {Object} [params={}] - Parameters object
   * @param {boolean} [params.verbose=false] - If true, return detailed mempool info
   * @returns {Promise<Array|Object>} - Array of txids (if not verbose) or object with detailed info
   */
  async getrawmempool({ verbose = false } = {}) {
    return this.call('getrawmempool', [verbose]);
  }

  /**
   * Get mempool information
   * @returns {Promise<Object>} - Mempool info object
   */
  async getmempoolinfo() {
    return this.call('getmempoolinfo');
  }

  /**
   * Scan the UTXO set for specific addresses or scripts
   * @param {Object} params - Parameters object
   * @param {string} params.action - Scan action ('start', 'abort', 'status')
   * @param {Array} params.scanobjects - Array of scan objects (e.g., ["addr(address)"])
   * @returns {Promise<Object>} - Scan results
   */
  async scantxoutset({ action, scanobjects }) {
    return this.call('scantxoutset', [action, scanobjects]);
  }

  /**
   * Estimate smart fee for transaction confirmation
   * @param {Object} params - Parameters object
   * @param {number} params.conf_target - Target number of blocks for confirmation
   * @param {string} [params.estimate_mode='CONSERVATIVE'] - Estimation mode ('CONSERVATIVE', 'ECONOMICAL')
   * @returns {Promise<Object>} - Fee estimate object
   */
  async estimatesmartfee({ conf_target, estimate_mode = 'CONSERVATIVE' }) {
    return this.call('estimatesmartfee', [conf_target, estimate_mode]);
  }

  /**
   * Broadcast a signed transaction to the network
   * @param {Object} params - Parameters object
   * @param {string} params.hexstring - Signed transaction hex
   * @param {number} [params.maxfeerate] - Maximum fee rate allowed
   * @returns {Promise<string>} - Transaction ID (txid)
   */
  async sendrawtransaction({ hexstring, maxfeerate }) {
    const params = maxfeerate !== undefined ? [hexstring, maxfeerate] : [hexstring];
    return this.call('sendrawtransaction', params);
  }

  /**
   * Test if a transaction would be accepted by mempool
   * @param {Object} params - Parameters object
   * @param {Array<string>} params.rawtxs - Array of raw transaction hex strings
   * @param {number} [params.maxfeerate] - Maximum fee rate allowed
   * @returns {Promise<Array>} - Array of acceptance test results
   */
  async testmempoolaccept({ rawtxs, maxfeerate }) {
    const params = maxfeerate !== undefined ? [rawtxs, maxfeerate] : [rawtxs];
    return this.call('testmempoolaccept', params);
  }

  /**
   * Get network information
   * @returns {Promise<Object>} - Network info object
   */
  async getnetworkinfo() {
    return this.call('getnetworkinfo');
  }

  /**
   * Get connection count
   * @returns {Promise<number>} - Number of connections
   */
  async getconnectioncount() {
    return this.call('getconnectioncount');
  }

  /**
   * Get current block count (height)
   * @returns {Promise<number>} - Current block height
   */
  async getblockcount() {
    return this.call('getblockcount');
  }

  /**
   * Get best block hash
   * @returns {Promise<string>} - Best block hash
   */
  async getbestblockhash() {
    return this.call('getbestblockhash');
  }
}

// ============================================================================
// Create and Export Singleton Instance
// ============================================================================

const rpcConfig = {
  user: Config.rpc.rpc_user,
  pass: Config.rpc.rpc_pass,
  url: `${Config.rpc.rpc_proto}://${Config.rpc.rpc_host}`,
  port: Config.rpc.rpc_port,
  timeout: 30000, // 30 seconds
};

const rpc = new DigiByteRPCClient(rpcConfig);

module.exports = rpc;
