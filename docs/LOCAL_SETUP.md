# DigiByte Rosetta Server - Local Setup Guide

**Generated**: January 3, 2026
**Target Users**: Developers running Rosetta server against an existing DigiByte Core node
**Prerequisites**: DigiByte Core v8.22.2+ with full blockchain sync

---

## Overview

This guide documents how to run the DigiByte Rosetta Server in local development mode, connecting to an existing DigiByte Core node instead of using the Docker container with bundled DigiByte daemon.

**Benefits of Local Setup**:
- Faster development iteration (no Docker rebuilds)
- Direct access to node for debugging
- Easier log monitoring
- Lower resource usage (shared node)

---

## Prerequisites

### 1. DigiByte Core Node

**Minimum Version**: v8.22.2
**Recommended Version**: v8.26+ (includes Taproot support)
**Installation**: [DigiByte Core Releases](https://github.com/DigiByte-Core/digibyte/releases)

**Current Local Node Status**:
```
Location: /usr/local/bin/digibyted
CLI: /usr/local/bin/digibyte-cli
Data Directory: ~/.digibyte/
Status: Running (PID 19195)
Sync Progress: Loading blocks (90% complete as of verification)
```

### 2. Node.js Environment

**Current System**:
- Node.js: v20.19.6 ✅ (Excellent - LTS version)
- npm: 10.8.2 ✅
- Platform: Linux 6.8.0-48-generic (Ubuntu)

**Minimum Requirements**:
- Node.js 14+ (v20 recommended for long-term support)
- npm 6+

### 3. System Resources

**Disk Space**:
- DigiByte blockchain: ~30-40GB (full node with txindex)
- Rosetta UTXO index: ~16GB (as of January 2026)
- **Total**: ~50-60GB minimum

**Memory**:
- DigiByte Core: 2-4GB RAM
- Rosetta Server: 4GB RAM (configured via --max-old-space-size)
- **Total**: 6-8GB RAM recommended

---

## DigiByte Core Configuration

### Required Configuration (`~/.digibyte/digibyte.conf`)

The DigiByte node must be configured with specific settings for Rosetta compatibility.

**Current Working Configuration**:

```conf
# Server mode (required for RPC)
server=1
daemon=1

# RPC Configuration
rpcuser=johnnytest
rpcpassword=Il1ke2drive!
rpcallowip=127.0.0.1
rpcbind=127.0.0.1
rpcport=14022
rpcthreads=32
rpcworkqueue=256

# Network Settings
maxconnections=100
disabledandelion=0
disablewallet=0

# Required Indices for Rosetta
txindex=1          # CRITICAL: Required for getrawtransaction
addressindex=1     # Helpful for address-based queries
spentindex=1       # Track spent outputs
timestampindex=1   # Time-based queries

# Transaction Relay Settings
minrelaytxfee=0.00001
fallbackfee=0.00001

# Wallet Settings
descriptorwallet=1
wallet=JohnnyTest
wallet=taproot-lab

# Debugging
debug=rpc
```

### Critical Settings Explained

#### 1. `txindex=1` (REQUIRED)
**Purpose**: Maintains a complete index of all transactions
**Why Required**: Rosetta's `/block/transaction` and Construction API need to retrieve arbitrary transactions by TXID
**Disk Impact**: Adds ~5-10GB to blockchain size
**Rebuild Required**: Yes (if enabling after initial sync)

```bash
# To rebuild txindex (if not initially enabled):
# WARNING: This will take several hours to days depending on hardware
digibyte-cli stop
# Edit digibyte.conf to add: txindex=1
digibyted -reindex
```

#### 2. `addressindex=1` (RECOMMENDED)
**Purpose**: Indexes transactions by address
**Why Helpful**: Speeds up address-based queries (though Rosetta uses its own UTXO index)
**Disk Impact**: ~3-5GB
**Rebuild Required**: Yes

#### 3. `spentindex=1` (RECOMMENDED)
**Purpose**: Tracks which outputs have been spent
**Why Helpful**: Useful for UTXO validation and debugging
**Disk Impact**: ~2-3GB
**Rebuild Required**: Yes

#### 4. `timestampindex=1` (RECOMMENDED)
**Purpose**: Indexes blocks by timestamp
**Why Helpful**: Enables time-based queries
**Disk Impact**: Minimal
**Rebuild Required**: Yes

#### 5. RPC Settings
```conf
rpcuser=<your_username>      # Set a strong username
rpcpassword=<your_password>  # Use a strong password (20+ characters)
rpcport=14022                # Default mainnet RPC port
rpcallowip=127.0.0.1         # Only allow local connections (security)
rpcbind=127.0.0.1            # Bind to localhost only
rpcthreads=32                # Higher thread count for concurrent requests
rpcworkqueue=256             # Larger queue for Rosetta's parallel queries
```

**Security Note**: Never expose RPC to the internet. Always use `rpcallowip=127.0.0.1` for local-only access.

### Network-Specific Ports

| Network | P2P Port | RPC Port | Network Flag |
|---------|----------|----------|--------------|
| Mainnet | 12024 | 14022 | (default) |
| Testnet | 12026 | 14023 | `testnet=1` |
| Regtest | 18444 | 18443 | `regtest=1` |

---

## Rosetta Server Configuration

### Environment Variables (`.env` file)

The Rosetta server is configured via environment variables, typically stored in `.env`.

**Current Configuration**:

```bash
# DigiByte Node RPC Connection
RPC_HOST=127.0.0.1
RPC_PORT=14022
RPC_USER=johnnytest
RPC_PASS=Il1ke2drive!
RPC_PROTO=http

# Network Selection
DGB_NETWORK=livenet           # Options: livenet, testnet, regtest

# Rosetta Server Settings
HOST=127.0.0.1                # Listen address (0.0.0.0 for all interfaces)
PORT=8080                     # Rosetta API port

# UTXO Index Database Path
DATA_PATH=/home/polloloco/rosetta-dgb

# Public URLs (for responses)
PUBLIC_URL=http://127.0.0.1:8080
BASE_URL=http://127.0.0.1:8080
SERVER_URL=http://127.0.0.1:8080
ONLINE_URL=http://127.0.0.1:8080
```

### Configuration Fields Explained

#### RPC Connection Settings

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `RPC_HOST` | DigiByte node hostname | 127.0.0.1 | Use localhost for local node |
| `RPC_PORT` | DigiByte RPC port | 14022 | 14023 for testnet, 18443 for regtest |
| `RPC_USER` | RPC username | (required) | Must match digibyte.conf |
| `RPC_PASS` | RPC password | (required) | Must match digibyte.conf |
| `RPC_PROTO` | RPC protocol | http | Use http for local connections |

#### Network Configuration

| Variable | Description | Options |
|----------|-------------|---------|
| `DGB_NETWORK` | Target network | `livenet`, `testnet`, `regtest` |
| `DGB_VERSION` | DigiByte Core version | `v8.22.2` (default) |

#### Server Settings

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `HOST` | Rosetta listening address | 127.0.0.1 | Use 0.0.0.0 for external access |
| `PORT` | Rosetta HTTP port | 8080 | Standard Rosetta port |

#### Data Storage

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `DATA_PATH` | UTXO index location | `./data` | ~16GB required, must be persistent |

**Important**: The `DATA_PATH` directory contains the LevelDB UTXO index. Do not delete this directory between restarts or the index will need to be rebuilt from genesis (takes hours to days).

---

## Installation and Startup

### Step 1: Install Dependencies

```bash
cd /home/polloloco/digibyte-rosetta-server
npm install
```

**Current Status**: ✅ Dependencies already installed (node_modules exists)

### Step 2: Configure Environment

```bash
# Copy example .env or create new one
cp .env.example .env  # (if exists)

# Edit .env with your RPC credentials
nano .env
```

**Current Status**: ✅ `.env` file exists and configured

**Security Checklist**:
- [ ] RPC password is strong (20+ characters, mixed case, numbers, symbols)
- [ ] `.env` is in `.gitignore` (never commit credentials)
- [ ] File permissions: `chmod 600 .env` (read/write for owner only)

### Step 3: Verify DigiByte Node

Before starting Rosetta, ensure the DigiByte node is fully synced:

```bash
# Check sync status
digibyte-cli getblockchaininfo

# Look for:
# - "blocks" should equal "headers" (fully synced)
# - "initialblockdownload" should be false
# - "verificationprogress" should be 0.9999999+

# Example output:
# {
#   "chain": "main",
#   "blocks": 21234567,
#   "headers": 21234567,
#   "initialblockdownload": false,
#   "verificationprogress": 0.9999999,
#   ...
# }
```

**Current Node Status**:
```
⚠️ Node is loading blocks (90% complete)
Wait for full sync before starting Rosetta server
```

**Monitor Sync Progress**:
```bash
# Watch sync progress
watch -n 5 'digibyte-cli getblockchaininfo | grep -E "blocks|headers|verificationprogress"'
```

### Step 4: Start Rosetta Server

```bash
# Start in foreground (for debugging)
npm start

# Or start in background
nohup npm start > rosetta.log 2>&1 &

# Or use a process manager (recommended for production)
pm2 start index.js --name digibyte-rosetta --max-memory-restart 4G
```

**Expected Startup Sequence**:
1. Load configuration from `config/index.js`
2. Initialize RPC connection to DigiByte Core
3. Start UTXO indexer/syncer
4. Begin syncing blocks (if first run or catching up)
5. Launch HTTP server on configured port (default: 8080)

**First-Time Startup**:
On first launch, the Rosetta server will build its UTXO index from genesis block. This process:
- Takes 6-12 hours on modern hardware (SSD recommended)
- Creates ~16GB of data in `DATA_PATH`
- Shows progress logs: `Syncing block 12345...`
- Can be interrupted and resumed (progress is saved)

**Subsequent Startups**:
- Loads existing UTXO index from `DATA_PATH`
- Catches up any new blocks since last run
- Usually ready in 1-5 minutes

### Step 5: Verify Rosetta Server

Once started, test the server:

```bash
# Test /network/list endpoint
curl -X POST http://localhost:8080/network/list \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {}
  }' | jq

# Expected response:
# {
#   "network_identifiers": [
#     {
#       "blockchain": "DigiByte",
#       "network": "livenet"
#     }
#   ]
# }

# Test /network/status endpoint
curl -X POST http://localhost:8080/network/status \
  -H "Content-Type: application/json" \
  -d '{
    "network_identifier": {
      "blockchain": "DigiByte",
      "network": "livenet"
    }
  }' | jq

# Should return current block height, peers, etc.
```

More example requests in `docs/ExampleRequests.md`

---

## Critical RPC Methods for Rosetta

The Rosetta server relies on these DigiByte Core RPC methods:

### Data API Methods

| RPC Method | Used By | Requires txindex | Purpose |
|------------|---------|------------------|---------|
| `getblockchaininfo` | `/network/status` | No | Network status, sync state |
| `getpeerinfo` | `/network/status` | No | Connected peers |
| `getblockhash` | `/block`, indexer | No | Get block hash by height |
| `getblock` | `/block` | No | Get block data with transactions |
| `getrawtransaction` | `/block/transaction` | **Yes** | Get transaction by TXID |
| `getrawmempool` | `/mempool` | No | Get mempool transaction IDs |
| `scantxoutset` | `/construction/metadata` | No | Get UTXOs for address (slow) |

### Construction API Methods

| RPC Method | Used By | Purpose |
|------------|---------|---------|
| `estimatesmartfee` | `/construction/metadata` | Fee estimation |
| `sendrawtransaction` | `/construction/submit` | Broadcast transaction |
| `testmempoolaccept` | Validation (optional) | Test transaction validity |

### Test All Critical Methods

```bash
# Test getblockchaininfo
digibyte-cli getblockchaininfo

# Test getrawtransaction (requires txindex=1)
# Using a known transaction ID from genesis block
TXID="insert_known_txid_here"
digibyte-cli getrawtransaction $TXID 1

# If this fails with "No such mempool or blockchain transaction":
# - txindex is not enabled, OR
# - node needs to reindex with txindex=1

# Test scantxoutset (for balance validation)
digibyte-cli scantxoutset start '["addr(dgb1qlsmt5a8vqqus5fwslx8pyyemgjtg4y6uth5s6x)"]'
# This will scan the UTXO set for the given address (can take several minutes)

# Test estimatesmartfee
digibyte-cli estimatesmartfee 6
# Returns fee estimate for confirmation within 6 blocks
```

---

## Troubleshooting

### Issue: RPC Connection Refused

**Symptoms**:
```
Error: connect ECONNREFUSED 127.0.0.1:14022
```

**Solutions**:
1. Verify DigiByte daemon is running:
   ```bash
   ps aux | grep digibyted
   # Or
   digibyte-cli getblockchaininfo
   ```

2. Check RPC port in `digibyte.conf` matches `.env` RPC_PORT

3. Ensure `server=1` is set in `digibyte.conf`

4. Check firewall (should allow localhost connections)

### Issue: RPC Authentication Failed

**Symptoms**:
```
Error 401: Unauthorized
```

**Solutions**:
1. Verify RPC_USER and RPC_PASS in `.env` match `digibyte.conf`
2. Restart DigiByte daemon after changing credentials:
   ```bash
   digibyte-cli stop
   digibyted -daemon
   ```

### Issue: getrawtransaction Fails

**Symptoms**:
```
Error: No such mempool or blockchain transaction
```

**Solutions**:
1. Check if `txindex=1` is in `digibyte.conf`
2. If added later, rebuild index:
   ```bash
   digibyte-cli stop
   digibyted -reindex
   ```
3. Reindexing can take 12-48 hours depending on hardware

### Issue: Node Loading Blocks (90%)

**Current Status**: Your node is at this stage

**Symptoms**:
```
error code: -28
error message: Loading blocks... 90%
```

**Solutions**:
1. **Wait for completion** - This is normal during initial sync
2. Monitor progress:
   ```bash
   watch -n 10 'digibyte-cli getblockchaininfo | grep verificationprogress'
   ```
3. Do NOT start Rosetta server until fully synced
4. Estimated time remaining: ~30-60 minutes (at 90%)

### Issue: UTXO Index Corruption

**Symptoms**:
- Rosetta crashes during balance queries
- LevelDB errors in logs
- Incorrect balance responses

**Solutions**:
1. Stop Rosetta server
2. Delete UTXO index database:
   ```bash
   rm -rf /home/polloloco/rosetta-dgb/*
   ```
3. Restart Rosetta server (will rebuild index from genesis)
4. Wait for complete re-sync (6-12 hours)

### Issue: Out of Memory

**Symptoms**:
```
JavaScript heap out of memory
```

**Solutions**:
1. Current setting: `--max-old-space-size=4096` (4GB)
2. Increase if needed (requires sufficient RAM):
   ```bash
   # Edit package.json "start" script:
   "start": "node --max-old-space-size=8192 index.js"  # 8GB
   ```
3. Monitor memory usage:
   ```bash
   top -p $(pgrep -f "node.*index.js")
   ```

### Issue: Slow Balance Queries

**Symptoms**:
- `/account/balance` takes 10+ seconds
- Timeouts for high-activity addresses

**Known Limitation**:
- Addresses with 399k+ transactions can take several seconds
- This is expected for UTXO-based indexing

**Mitigation**:
1. Implement caching for frequently queried addresses
2. Use `/account/coins` endpoint when implemented (faster for UTXO details)
3. Consider query timeout warnings for clients

---

## Performance Optimization

### 1. Use SSD Storage

**Impact**: 3-5x faster sync and queries
**Recommendation**: Store both blockchain data and UTXO index on SSD

```bash
# Check current storage type
df -Th ~/ ~/.digibyte/ /home/polloloco/rosetta-dgb
```

### 2. Increase RPC Threads

In `digibyte.conf`:
```conf
rpcthreads=32        # More threads for concurrent Rosetta queries
rpcworkqueue=256     # Larger queue
```

### 3. Optimize DigiByte Node Memory

```conf
# In digibyte.conf
dbcache=4096         # 4GB cache (if you have 16GB+ RAM)
maxmempool=1000      # 1GB mempool
```

### 4. Monitor and Tune

```bash
# Watch Rosetta server performance
pm2 monit digibyte-rosetta

# Watch DigiByte node resource usage
watch -n 5 'digibyte-cli getmempoolinfo; digibyte-cli getnetworkinfo'
```

---

## Maintenance

### Regular Tasks

**Daily**:
- Monitor sync status (ensure node stays synced)
- Check Rosetta server uptime
- Review error logs

**Weekly**:
- Check disk space (blockchain grows ~5-10GB/year)
- Verify balance accuracy against known addresses
- Review RPC performance metrics

**Monthly**:
- Update DigiByte Core if new version released
- Review security advisories
- Backup UTXO index (optional, can be rebuilt)

### Log Files

| Component | Log Location | Rotation |
|-----------|--------------|----------|
| DigiByte Core | `~/.digibyte/debug.log` | Manual (grows indefinitely) |
| Rosetta Server | `stdout` or configured file | Application-dependent |

**Rotate DigiByte debug.log**:
```bash
# Stop node
digibyte-cli stop

# Rotate log (keeps last backup)
mv ~/.digibyte/debug.log ~/.digibyte/debug.log.old

# Restart
digibyted -daemon
```

---

## Security Best Practices

### 1. RPC Security

- ✅ Never expose RPC to the internet (`rpcallowip=127.0.0.1` only)
- ✅ Use strong RPC credentials (20+ char password)
- ✅ Store credentials in `.env` with `chmod 600` permissions
- ✅ Add `.env` to `.gitignore`

### 2. Rosetta Server Security

- ✅ Run behind a reverse proxy (nginx, caddy) for HTTPS
- ✅ Implement rate limiting to prevent abuse
- ✅ Monitor for unusual query patterns
- ❌ Don't expose to public internet without authentication (if not needed)

### 3. System Security

- Keep OS and dependencies updated
- Use firewall to restrict access
- Monitor system logs for intrusion attempts
- Run as non-root user (especially in production)

---

## Validation Against Node

Use the validation script to ensure Rosetta balances match node balances:

```bash
# From rosetta-server-improvement-prompt.md
bash scripts/validate-balances.sh
```

**Test Addresses** (known exchange wallets with verified balances):
- `dgb1qlsmt5a8vqqus5fwslx8pyyemgjtg4y6uth5s6x` - Binance cold wallet
- `dgb1qncmk6enuykzc8dmzzf7t27u4xekgkkawlnrd43` - Crypto.com hot wallet

---

## Next Steps

After local setup is complete and verified:

1. ✅ **Phase 2**: Codebase cleanup and dependency updates
2. **Phase 3**: Upgrade to Rosetta 1.4.12
3. **Phase 4**: Run comprehensive rosetta-cli validation
4. **Phase 5**: Performance optimization
5. **Phase 6**: Prepare Coinbase submission

---

## Quick Reference

### Start Services
```bash
# Start DigiByte node
digibyted -daemon

# Start Rosetta server
cd /home/polloloco/digibyte-rosetta-server
npm start
```

### Check Status
```bash
# DigiByte node
digibyte-cli getblockchaininfo

# Rosetta server
curl http://localhost:8080/network/status \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"network_identifier":{"blockchain":"DigiByte","network":"livenet"}}' \
  | jq
```

### Stop Services
```bash
# Stop Rosetta (if in background)
pkill -f "node.*index.js"

# Stop DigiByte node
digibyte-cli stop
```

---

**Document Status**: Complete
**Environment Status**: DigiByte node syncing (90%), Rosetta ready to start after full sync
**Next Document**: Phase 2 - Dependency Audit and Updates
