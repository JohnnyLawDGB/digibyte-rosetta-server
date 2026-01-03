# DigiByte Rosetta Server - Project Structure

**Generated**: January 3, 2026
**Current Version**: 1.4.1 (Target: 1.4.12)
**DigiByte Core Version**: v8.22.2+

---

## Overview

This is a Node.js implementation of the Coinbase Rosetta API Specification for DigiByte blockchain. The project provides a complete REST API server that interfaces with a DigiByte Core node to enable standardized blockchain interactions for exchanges and integrators.

**Key Features**:
- Custom UTXO indexing middleware using LevelDB
- Support for mainnet, testnet, and regtest
- Docker-based deployment
- Historical balance lookups
- Reorg handling support

---

## Directory Structure

```
digibyte-rosetta-server/
├── config/                     # Configuration modules
│   ├── errors.js              # Rosetta error code definitions
│   ├── index.js               # Main configuration loader (ENV vars)
│   ├── networkIdentifier.js   # Network identification logic
│   └── serverConfig.js        # Server-specific configuration
│
├── src/                       # Core application source code
│   ├── services/              # Rosetta API service implementations
│   │   ├── AccountService.js      # /account/* endpoints
│   │   ├── BlockService.js        # /block/* endpoints
│   │   ├── ConstructionService.js # /construction/* endpoints
│   │   ├── MempoolService.js      # /mempool/* endpoints
│   │   ├── NetworkService.js      # /network/* endpoints
│   │   └── index.js               # Service exports
│   │
│   ├── BlockCache.js          # In-memory block caching layer
│   ├── constants.js           # Application constants
│   ├── CustomNetworks.js      # Network configurations (mainnet/testnet/regtest)
│   ├── digibyteIndexer.js     # DigiByte-specific indexing logic
│   ├── digibyteSyncer.js      # DigiByte-specific syncing logic
│   ├── Indexer.js             # Base indexer class
│   ├── rpc.js                 # DigiByte Core RPC client wrapper
│   ├── syncBlockCache.js      # Block cache synchronization
│   ├── Syncer.js              # Base syncer class
│   └── utils.js               # Utility functions
│
├── test/                      # Test suite
│   └── js/
│       ├── BlockCache.test.js
│       ├── construction/
│       │   └── index.test.js
│       └── DigiByteIndexer.test.js
│
├── docs/                      # Documentation
│   ├── Bugs.md                       # Known bugs and issues
│   ├── ExampleRequests.md            # Sample API requests
│   ├── LivenetValidationResults.md   # rosetta-cli validation results
│   ├── utxoIndexer.md                # UTXO indexer implementation details
│   ├── Validation.md                 # Balance validation procedures
│   └── images/                       # Documentation assets
│
├── data/                      # UTXO index database (LevelDB)
│                              # Created at runtime, currently ~16GB
│
├── .env                       # Environment configuration (RPC credentials, etc.)
├── Dockerfile                 # Docker build configuration
├── docker-entrypoint.sh       # Docker container startup script
├── index.js                   # Application entry point
├── package.json               # Node.js dependencies and scripts
├── package-lock.json          # Locked dependency versions
├── README.md                  # Project documentation
├── rosetta-config.json        # Rosetta CLI configuration
├── rosetta-data-check.json    # Rosetta validation config
├── .eslintrc.js               # ESLint configuration
└── verify-rosetta-environment.sh  # Environment verification script

```

---

## Configuration Files

### 1. `.env` - Environment Variables
**Purpose**: Stores runtime configuration for RPC connection and server settings

**Current Configuration**:
```
RPC_HOST=127.0.0.1
RPC_PORT=14022
RPC_USER=johnnytest
RPC_PASS=Il1ke2drive!
RPC_PROTO=http
DGB_NETWORK=livenet
HOST=127.0.0.1
PORT=8080
DATA_PATH=/home/polloloco/rosetta-dgb
PUBLIC_URL=http://127.0.0.1:8080
BASE_URL=http://127.0.0.1:8080
SERVER_URL=http://127.0.0.1:8080
ONLINE_URL=http://127.0.0.1:8080
```

**Security Note**: This file contains sensitive credentials and should not be committed to version control.

### 2. `config/index.js` - Main Configuration Module
**Purpose**: Loads environment variables with fallback defaults

**Key Settings**:
- **Rosetta Version**: 1.4.1 (currently)
- **DigiByte Version**: v8.22.2 (default)
- **Default RPC Port**: 14022 (mainnet)
- **Default Data Path**: `./data`
- **Syncer Secret**: Random 128-byte hex (for /block endpoint protection)

**Configuration Validation**: Throws errors if critical environment variables are missing (RPC credentials, network, etc.)

### 3. `rosetta-config.json` - Rosetta CLI Configuration
**Purpose**: Configuration for running rosetta-cli validation tests

### 4. `.eslintrc.js` - ESLint Configuration
**Purpose**: Code quality and style enforcement

---

## Docker Setup

### Dockerfile Analysis

**Base Image**: `ubuntu:focal` (Ubuntu 20.04 LTS)

**Multi-Stage Characteristics**:
- Stage 1: Build DigiByte Core from source
- Stage 2: Install Node.js dependencies
- Stage 3: Copy application source

**Build Arguments**:
- `dgb_version`: DigiByte Core version (default: v8.22.2)
- `arch`: Architecture (default: x86_64)
- `local_timezone`: Timezone setting (default: Europe/Berlin)
- `parallize_build`: Number of cores for compilation (default: 0 = single core)
- `rpc_username`: RPC username (default: user)
- `rpc_password`: RPC password (default: pass)
- `use_testnet`: Enable testnet (default: 0)
- `use_regtest`: Enable regtest (default: 0)
- `prunesize`: Blockchain pruning size (default: 0 = no pruning)
- `offline`: Offline mode (default: 0)
- `regtest_simulate_mining`: Auto-mining for regtest (default: 0)

**Node.js Version**: 14.x (via NodeSource setup script)

**Exposed Ports**:
- 8080: Rosetta API HTTP server
- 12024: DigiByte mainnet P2P
- 14022: DigiByte mainnet RPC
- 12026: DigiByte testnet P2P
- 14023: DigiByte testnet RPC
- 18444: DigiByte regtest P2P
- 18443: DigiByte regtest RPC

**Data Directories**:
- `/data/.digibyte`: DigiByte blockchain data
- `/data/utxodb`: LevelDB UTXO index
- `/root/rosetta-node`: Application source

**Current Issues**:
1. Uses Node.js 14.x (outdated - current LTS is 20.x)
2. Not optimized for layer caching (dependencies installed before source copy)
3. No multi-stage build to reduce final image size
4. Runs as root user (security concern)
5. Commented-out source deletion line (line 51)

---

## Dependencies Analysis

### Production Dependencies (package.json)

| Package | Current Version | Purpose | Security Notes |
|---------|----------------|---------|----------------|
| `rosetta-node-sdk` | git+https://github.com/DigiByte-Core/digibyte-rosetta-nodeapi.git#v1.4.1 | Custom fork of Rosetta SDK | Git dependency, version locked |
| `bitcoinjs-lib` | ^6.0.1 | Bitcoin transaction library | Stable |
| `bluebird` | ^3.7.2 | Promise library | Consider native Promises |
| `ecpair` | ^2.0.1 | Elliptic curve cryptography | For transaction signing |
| `js-binary` | ^1.2.0 | Binary data handling | Low download count |
| `level` | ^6.0.1 | LevelDB wrapper | Core dependency for UTXO index |
| `rpc-bitcoin` | ^2.0.0 | Bitcoin RPC client | Works with DigiByte |
| `tiny-secp256k1` | ^2.2.0 | Elliptic curve operations | Performance-critical |

### Development Dependencies

| Package | Current Version | Status |
|---------|----------------|--------|
| `axios` | ^0.20.0 | Outdated (current: 1.x) |
| `chai` | ^4.2.0 | Stable testing framework |
| `eslint` | ^7.7.0 | Outdated (current: 8.x) |
| `eslint-config-airbnb` | ^18.2.0 | Outdated |
| `eslint-config-airbnb-base` | ^14.2.0 | Outdated |
| `eslint-plugin-import` | ^2.22.0 | Outdated |
| `eslint-plugin-jsx-a11y` | ^6.3.1 | Not needed (no React) |
| `eslint-plugin-react` | ^7.20.6 | Not needed (no React) |
| `eslint-plugin-react-hooks` | ^4.0.0 | Not needed (no React) |
| `mocha` | ^8.1.1 | Stable testing framework |

**Critical Findings**:
1. **axios 0.20.0** has known security vulnerabilities (CVE-2021-3749, CVE-2023-45857)
2. React-related ESLint plugins are unnecessary for a Node.js server
3. All dev dependencies are ~4 years old and should be updated

### Package Scripts

```json
{
  "test-api": "cd test && docker-compose build && docker-compose up",
  "test": "mocha test/js/*.test.js",
  "build": "docker build -t digibyte-rosetta:latest .",
  "start": "node --max-old-space-size=4096 index.js",
  "dev": "nodemon .",
  "lint": "eslint ."
}
```

**Notes**:
- Memory allocation: 4GB max old space size (appropriate for UTXO indexing)
- `nodemon` is referenced but not listed in dependencies

---

## Source Code Organization

### Service Layer Architecture

The project follows the Rosetta specification's endpoint structure:

#### 1. **NetworkService.js** - Network Information Endpoints
Implements:
- `/network/list` - Returns available networks
- `/network/status` - Returns current blockchain status
- `/network/options` - Returns supported operations

**Current Location**: `src/services/NetworkService.js`

#### 2. **AccountService.js** - Account Balance Endpoints
Implements:
- `/account/balance` - Returns account balance at a given block

**UTXO Indexer Integration**: Uses custom LevelDB index for balance lookups

**Current Location**: `src/services/AccountService.js`

#### 3. **BlockService.js** - Block Data Endpoints
Implements:
- `/block` - Returns block information
- `/block/transaction` - Returns transaction details

**Current Location**: `src/services/BlockService.js`

#### 4. **MempoolService.js** - Mempool Endpoints
Implements:
- `/mempool` - Returns mempool transaction IDs
- `/mempool/transaction` - Returns mempool transaction details

**Current Location**: `src/services/MempoolService.js`

#### 5. **ConstructionService.js** - Transaction Construction Endpoints
Implements:
- `/construction/derive` - Derive address from public key
- `/construction/preprocess` - Preprocess transaction metadata
- `/construction/metadata` - Get transaction metadata
- `/construction/payloads` - Generate unsigned transaction
- `/construction/parse` - Parse transaction
- `/construction/combine` - Combine signatures with unsigned transaction
- `/construction/hash` - Get transaction hash
- `/construction/submit` - Submit signed transaction

**Current Location**: `src/services/ConstructionService.js`

---

## UTXO Indexer Implementation

**Database**: LevelDB (via `level` package)
**Current Size**: ~16GB (as of January 2026)
**Original Size**: 6.7GB (as of September 2020)

### Key Components:

1. **digibyteIndexer.js**
   - Extends base `Indexer.js` class
   - Processes blocks to build UTXO set
   - Tracks spent/unspent outputs
   - Supports historical balance queries
   - Handles blockchain reorganizations

2. **Encoding Strategy**
   - Space-efficient key-value encoding
   - Avoids redundancy
   - Documented in `docs/utxoIndexer.md`

3. **Performance Characteristics**
   - Tested with addresses containing 399k+ transactions
   - Historical balance calculation may take several seconds for high-activity addresses
   - Syncer class provides reliable synchronization
   - Automatic UTXO removal on reorgs

---

## Current State Assessment

### Working Components
- ✅ Core service implementations (all Rosetta endpoints)
- ✅ UTXO indexer with LevelDB
- ✅ Docker build process
- ✅ RPC connectivity to DigiByte Core
- ✅ Testing framework setup
- ✅ ESLint configuration

### Known Issues
- ⚠️ Rosetta version 1.4.1 (target: 1.4.12)
- ⚠️ Outdated dependencies (security vulnerabilities in axios)
- ⚠️ Node.js 14 in Dockerfile (EOL'd, should use Node.js 20 LTS)
- ⚠️ Docker image not optimized (no multi-stage size reduction)
- ⚠️ Docker runs as root user
- ⚠️ Unnecessary React ESLint plugins
- ⚠️ UTXO index size has grown significantly (6.7GB → 16GB)

### Missing Components
- ❌ Rosetta 1.4.12 spec compliance
- ❌ Continuous Integration setup
- ❌ Comprehensive test coverage
- ❌ Performance benchmarks
- ❌ Production deployment guide
- ❌ Security audit documentation

---

## Data Storage

### DigiByte Blockchain Data
**Location**: `~/.digibyte/` (when running locally) or `/data/.digibyte/` (in Docker)

**Required Indices** (from digibyte.conf):
```
txindex=1         # Required for getrawtransaction
addressindex=1    # Helpful for address queries
spentindex=1      # Track spent outputs
timestampindex=1  # Time-based queries
```

**Current Node Status**:
- Chain: mainnet
- Block height: Loading (90% complete as of verification)
- Sync status: In progress

### Rosetta UTXO Index
**Location**: `/home/polloloco/rosetta-dgb` (configured in .env DATA_PATH)

**Size**: ~16GB (current)

**Purpose**:
- Fast balance lookups without scanning entire blockchain
- Historical balance queries at specific block heights
- Support for address-based queries not available in standard Bitcoin RPC

**Technology**: LevelDB (same as Bitcoin Core)

---

## Entry Point

**File**: `index.js`

**Responsibilities**:
1. Load configuration from `config/index.js`
2. Initialize RPC connection to DigiByte Core
3. Start UTXO indexer/syncer
4. Launch Rosetta API HTTP server
5. Handle graceful shutdown

**Memory Settings**: `--max-old-space-size=4096` (4GB) for UTXO indexing

---

## Testing Infrastructure

### Unit Tests
**Location**: `test/js/`

**Test Files**:
- `BlockCache.test.js` - Block caching layer tests
- `DigiByteIndexer.test.js` - UTXO indexer tests
- `construction/index.test.js` - Transaction construction tests

**Test Runner**: Mocha
**Assertion Library**: Chai

**Command**: `npm test`

### Integration Tests
**Location**: `test/` (Docker Compose setup)

**Command**: `npm run test-api`

**Purpose**: Tests online/offline endpoints in Docker environment

### Validation Tests
**Tool**: rosetta-cli (installed and available)

**Configuration Files**:
- `rosetta-config.json`
- `rosetta-data-check.json`

**Validation Results**: Documented in `docs/LivenetValidationResults.md`

---

## Build and Deployment

### Local Development

**Prerequisites**:
1. DigiByte Core node with RPC enabled
2. Node.js 14+ (current system has 20.19.6 ✅)
3. npm 6+ (current system has 10.8.2 ✅)

**Setup**:
```bash
npm install
# Configure .env file
npm start
```

### Docker Deployment

**Build**:
```bash
docker build -t digibyte-rosetta:latest .
```

**Run**:
```bash
docker run -p 8080:8080 -p 12024:12024 digibyte-rosetta:latest
```

**Networks Supported**:
- Mainnet (default)
- Testnet (`--build-arg use_testnet=1`)
- Regtest (`--build-arg use_regtest=1`)

---

## Next Steps

Based on this structural analysis, the following improvements are recommended:

### Phase 2 - Immediate Cleanup
1. **Security**: Update axios and other vulnerable dependencies
2. **Dependencies**: Remove unnecessary React ESLint plugins
3. **Dependencies**: Update ESLint and related tools
4. **Docker**: Upgrade to Node.js 20 LTS
5. **Docker**: Implement proper multi-stage build
6. **Docker**: Run as non-root user

### Phase 3 - Rosetta 1.4.12 Upgrade
1. Upgrade `rosetta-node-sdk` dependency
2. Update API response schemas
3. Implement new optional endpoints
4. Update error code mappings

### Phase 4 - Testing & Validation
1. Increase unit test coverage
2. Run full rosetta-cli validation suite
3. Validate balances against node RPC

### Phase 5 - Performance
1. Optimize UTXO indexer queries
2. Implement caching strategies
3. Monitor and optimize memory usage

### Phase 6 - Documentation
1. Create INTEGRATION_GUIDE.md
2. Create ARCHITECTURE.md
3. Create SECURITY.md
4. Create OPERATIONAL_NOTES.md

---

**Document Status**: Complete
**Next Document**: Phase 1.2 - Rosetta API Compliance Checklist
