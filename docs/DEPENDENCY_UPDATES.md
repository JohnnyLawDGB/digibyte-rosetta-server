# DigiByte Rosetta Server - Dependency Update Plan

**Generated**: January 3, 2026
**Current Status**: 30 security vulnerabilities (5 critical, 12 high, 8 moderate, 5 low)
**Goal**: Update to secure, modern dependencies while maintaining compatibility

---

## Executive Summary

### Critical Issues

1. **rpc-bitcoin** - Uses deprecated `request` library with unfixable vulnerabilities
   - **Solution**: Replace with custom axios-based RPC client

2. **axios 0.20.0** - Multiple known CVEs
   - **Solution**: Upgrade to 1.13.2

3. **Babel dependencies** - Critical arbitrary code execution vulnerability
   - **Solution**: Update via npm audit fix

4. **Crypto libraries** (cipher-base, sha.js) - Type check vulnerabilities
   - **Solution**: Update to patched versions

### Unnecessary Dependencies

- **React ESLint plugins** - Not needed for Node.js server
  - `eslint-plugin-react`
  - `eslint-plugin-react-hooks`
  - `eslint-plugin-jsx-a11y`

---

## Dependency Analysis

### Production Dependencies

| Package | Current | Latest | Update Strategy | Breaking Changes | Priority |
|---------|---------|--------|-----------------|------------------|----------|
| `rosetta-node-sdk` | git#v1.4.1 | v1.4.12 (target) | Manual upgrade | Yes (Rosetta API changes) | **Phase 3** |
| `rpc-bitcoin` | 2.0.0 | N/A | **Replace with custom** | Yes (API change) | **Critical** |
| `axios` | 0.20.0 | 1.13.2 | Safe upgrade | Minimal | **Critical** |
| `bitcoinjs-lib` | 6.0.2 | 7.0.0 | Test carefully | Yes (v7 breaking) | High |
| `ecpair` | 2.1.0 | 3.0.0 | Test carefully | Likely breaking | High |
| `level` | 6.0.1 | 10.0.0 | Test carefully | Yes (major version) | Medium |
| `bluebird` | 3.7.2 | 3.7.2 | No update needed | N/A | Low |
| `tiny-secp256k1` | 2.2.1 | 2.2.4 | Safe patch | No | Low |
| `js-binary` | 1.2.0 | 1.2.0 | No update needed | N/A | Low |

### Development Dependencies

| Package | Current | Latest | Update Strategy | Priority |
|---------|---------|--------|-----------------|----------|
| `axios` | 0.20.0 | 1.13.2 | Upgrade (also in prod) | **Critical** |
| `eslint` | 7.32.0 | 9.39.2 | Upgrade to v8 first | High |
| `eslint-plugin-react` | 7.31.10 | 7.37.5 | **Remove** (not needed) | High |
| `eslint-plugin-react-hooks` | 4.6.0 | 7.0.1 | **Remove** (not needed) | High |
| `eslint-plugin-jsx-a11y` | 6.6.1 | 6.10.2 | **Remove** (not needed) | High |
| `eslint-plugin-import` | 2.26.0 | 2.32.0 | Update | Medium |
| `eslint-config-airbnb` | 18.2.1 | 19.0.4 | Update (or remove) | Medium |
| `eslint-config-airbnb-base` | 14.2.1 | 15.0.0 | Update | Medium |
| `mocha` | 8.4.0 | 11.7.5 | Update | Medium |
| `chai` | 4.3.6 | 6.2.2 | Update to v5 first | Medium |

---

## Update Strategy (Phased Approach)

### Phase 2.1a: Automatic Fixes (Low Risk)

Run `npm audit fix` to automatically update packages with backward-compatible fixes.

**Estimated Fixes**: ~20 vulnerabilities
**Risk**: Low (only patch/minor version updates)
**Time**: 5 minutes
**Testing**: Run existing tests

```bash
# Backup package-lock.json
cp package-lock.json package-lock.json.backup

# Run automatic fixes
npm audit fix

# Test
npm test
npm start  # Verify server starts
```

**Expected Updates**:
- `semver` 6.3.0 → 6.3.1
- `json5` 2.2.1 → 2.2.3
- `js-yaml` 3.14.1 → 3.14.2
- `cookie` 0.4.1 → 0.7.2
- `express` 4.18.2 → 4.22.1
- `cipher-base` 1.0.4 → 1.0.7
- `sha.js` 2.4.11 → 2.4.12
- Many transitive dependency updates

---

### Phase 2.1b: Replace rpc-bitcoin (High Priority)

The `rpc-bitcoin` package depends on the deprecated `request` library with unfixable vulnerabilities. We must replace it with a modern HTTP client.

#### Current Usage

The RPC client is used in 7 files with approximately 17 RPC method calls:

**Files Using RPC**:
1. `src/services/NetworkService.js` - getblockchaininfo, getpeerinfo
2. `src/services/AccountService.js` - getblockhash
3. `src/services/BlockService.js` - getblockhash, getblock
4. `src/services/ConstructionService.js` - scantxoutset, estimatesmartfee, sendrawtransaction
5. `src/services/MempoolService.js` - getrawmempool, getrawtransaction
6. `src/Indexer.js` - Various calls during indexing

#### Replacement Implementation

Create a new RPC client using axios (after upgrading axios):

**File**: `src/rpc-client.js` (new file)

```javascript
const axios = require('axios');
const Config = require('../config');

/**
 * Modern Bitcoin RPC client using axios
 * Replaces deprecated rpc-bitcoin package
 */
class DigiByteRPCClient {
  constructor(config) {
    this.config = {
      user: config.user,
      pass: config.pass,
      url: config.url,
      port: config.port,
      timeout: config.timeout || 30000,
    };

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
    });
  }

  /**
   * Make a JSON-RPC call to DigiByte Core
   * @param {string} method - RPC method name
   * @param {array} params - RPC method parameters
   * @returns {Promise} - Resolves to result or rejects with error
   */
  async call(method, params = []) {
    try {
      const response = await this.client.post('/', {
        jsonrpc: '1.0',
        id: Date.now(),
        method,
        params,
      });

      if (response.data.error) {
        const error = new Error(response.data.error.message);
        error.code = response.data.error.code;
        throw error;
      }

      return response.data.result;
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        const rpcError = new Error(error.response.data.error.message);
        rpcError.code = error.response.data.error.code;
        throw rpcError;
      }
      throw error;
    }
  }

  // Convenience methods for common RPC calls
  async getblockchaininfo() {
    return this.call('getblockchaininfo');
  }

  async getpeerinfo() {
    return this.call('getpeerinfo');
  }

  async getblockhash({ height }) {
    return this.call('getblockhash', [height]);
  }

  async getblock({ blockhash, verbosity = 2 }) {
    return this.call('getblock', [blockhash, verbosity]);
  }

  async getrawtransaction({ txid, verbose = true }) {
    return this.call('getrawtransaction', [txid, verbose]);
  }

  async getrawmempool({ verbose = false }) {
    return this.call('getrawmempool', [verbose]);
  }

  async scantxoutset({ action, scanobjects }) {
    return this.call('scantxoutset', [action, scanobjects]);
  }

  async estimatesmartfee({ conf_target, estimate_mode = 'CONSERVATIVE' }) {
    return this.call('estimatesmartfee', [conf_target, estimate_mode]);
  }

  async sendrawtransaction({ hexstring, maxfeerate }) {
    const params = maxfeerate ? [hexstring, maxfeerate] : [hexstring];
    return this.call('sendrawtransaction', params);
  }

  async testmempoolaccept({ rawtxs, maxfeerate }) {
    const params = maxfeerate ? [rawtxs, maxfeerate] : [rawtxs];
    return this.call('testmempoolaccept', params);
  }
}

// Create and export singleton instance
const rpcConfig = {
  user: Config.rpc.rpc_user,
  pass: Config.rpc.rpc_pass,
  url: `${Config.rpc.rpc_proto}://${Config.rpc.rpc_host}`,
  port: Config.rpc.rpc_port,
  timeout: 30000,
};

const rpc = new DigiByteRPCClient(rpcConfig);

module.exports = rpc;
```

#### Migration Steps

1. **Create new RPC client** (`src/rpc-client.js`)
2. **Update `src/rpc.js`** to use new client
3. **Test all RPC calls** in each service
4. **Remove `rpc-bitcoin` dependency** from package.json
5. **Remove `bluebird`** dependency (no longer needed)

**Testing Checklist**:
- [ ] NetworkService endpoints work
- [ ] AccountService balance lookups work
- [ ] BlockService returns blocks correctly
- [ ] ConstructionService can build/submit transactions
- [ ] MempoolService returns mempool data
- [ ] Indexer can sync blocks

**Estimated Time**: 2-3 hours
**Risk**: Medium (requires thorough testing)

---

### Phase 2.1c: Upgrade axios (Critical)

Current: 0.20.0 (from September 2020)
Target: 1.13.2 (latest stable)

**Known CVEs in 0.20.0**:
- CVE-2021-3749 - ReDoS via crafted URLs
- CVE-2023-45857 - CSRF bypass

**Breaking Changes (0.x → 1.x)**:
- Minimal - mostly internal refactoring
- Response/error handling should be the same
- Might need to update import style if using TypeScript types

**Update Command**:
```bash
npm install axios@1.13.2
```

**Testing**:
- Verify RPC client works (if using axios-based replacement)
- Test all external HTTP requests (if any)

---

### Phase 2.1d: Remove Unnecessary React Dependencies

The following ESLint plugins are only needed for React projects:

```bash
npm uninstall eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y
```

Update `.eslintrc.js` to remove references:

```javascript
// Before
extends: [
  'airbnb',  // Includes React rules
  'airbnb-base',
],
plugins: [
  'react',
  'react-hooks',
  'jsx-a11y',
],

// After
extends: [
  'airbnb-base',  // Node.js only
],
plugins: [
  'import',
],
```

**Estimated Savings**: ~50MB in node_modules, faster lint runs

---

### Phase 2.1e: Update ESLint (Medium Priority)

Current: 7.32.0 (from 2021)
Target: 8.57.0 (stable, v9 is too new)

**Why not v9**: ESLint 9 has significant breaking changes (flat config). Upgrade to v8 first.

**Update Command**:
```bash
npm install --save-dev eslint@8.57.0
npm install --save-dev eslint-plugin-import@latest
npm install --save-dev eslint-config-airbnb-base@latest
```

**Configuration Changes**: Minimal for v7 → v8

**Testing**:
```bash
npm run lint
```

---

### Phase 2.1f: Update Test Framework (Low Priority)

**Mocha**: 8.4.0 → 11.7.5
**Chai**: 4.3.6 → 5.1.1 (then to 6.x if needed)

**Breaking Changes**:
- Mocha 10+: Drops Node 12/14 support (we have Node 20 ✓)
- Chai 5+: ES modules support, some assertion changes

**Update Command**:
```bash
npm install --save-dev mocha@11.7.5 chai@5.1.1
```

**Testing**:
```bash
npm test
```

---

### Phase 2.1g: Update bitcoinjs-lib and ecpair (Test Carefully)

**bitcoinjs-lib**:
- Current: 6.0.2
- Target: 6.1.7 (safe) or 7.0.0 (breaking)

**ecpair**:
- Current: 2.1.0
- Target: 3.0.0 (breaking)

**Breaking Changes (v7)**:
- TypeScript rewrite
- Changed some API methods
- Better SegWit/Taproot support

**Recommendation**: Update to 6.1.7 first (safe), defer v7 to Phase 3 (Rosetta upgrade)

**Update Command** (safe):
```bash
npm install bitcoinjs-lib@6.1.7
npm install tiny-secp256k1@latest
```

**Update Command** (breaking - Phase 3):
```bash
npm install bitcoinjs-lib@7.0.0 ecpair@3.0.0
```

**Testing**:
- Construction API tests
- Transaction parsing/building
- Address derivation

---

### Phase 2.1h: Update LevelDB (Test Carefully)

**level**:
- Current: 6.0.1
- Target: 10.0.0

**Breaking Changes**:
- v7+: Streams API changed
- v8+: Encoding changes
- v9+: New features

**Risk**: High - This is the UTXO index database
**Recommendation**: Defer to Phase 5 (Performance) or test on separate index

**Testing Required**:
- Full UTXO index rebuild
- Balance queries
- Historical lookups
- Reorg handling

**Data Migration**: May need to rebuild entire UTXO index (6-12 hours)

---

## Implementation Plan

### Step 1: Backup (Before any changes)

```bash
# Backup current state
cp package.json package.json.pre-update
cp package-lock.json package-lock.json.pre-update

# Create git commit
git add package.json package-lock.json
git commit -m "Backup: Pre-dependency update state"
```

### Step 2: Automatic Fixes (Safe)

```bash
npm audit fix
npm test
npm run lint
```

**Rollback if needed**:
```bash
git checkout package.json package-lock.json
npm install
```

### Step 3: Manual Updates (Incremental)

Do these one at a time, testing between each:

```bash
# 1. Upgrade axios
npm install axios@1.13.2
npm test
git commit -am "Update axios to 1.13.2"

# 2. Replace rpc-bitcoin
# (Create new rpc-client.js first)
npm uninstall rpc-bitcoin bluebird
npm test
git commit -am "Replace rpc-bitcoin with custom axios client"

# 3. Remove React dependencies
npm uninstall eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y
# Update .eslintrc.js
npm run lint
git commit -am "Remove unnecessary React ESLint plugins"

# 4. Update ESLint
npm install --save-dev eslint@8.57.0
npm run lint
git commit -am "Update ESLint to v8"

# 5. Update test framework
npm install --save-dev mocha@11.7.5 chai@5.1.1
npm test
git commit -am "Update Mocha and Chai"

# 6. Update bitcoinjs-lib (safe version)
npm install bitcoinjs-lib@6.1.7
npm test
git commit -am "Update bitcoinjs-lib to 6.1.7"
```

### Step 4: Final Security Audit

```bash
npm audit

# Should show significant reduction in vulnerabilities
# Target: 0-5 low/moderate, 0 high/critical
```

### Step 5: Full Testing

```bash
# Unit tests
npm test

# Linting
npm run lint

# Start server and test endpoints
npm start

# Test key endpoints
curl -X POST http://localhost:8080/network/list \
  -H "Content-Type: application/json" \
  -d '{"metadata":{}}' | jq

curl -X POST http://localhost:8080/network/status \
  -H "Content-Type: application/json" \
  -d '{"network_identifier":{"blockchain":"DigiByte","network":"livenet"}}' | jq
```

---

## Expected Outcomes

### Before Updates

- **Total Vulnerabilities**: 30
  - Critical: 5
  - High: 12
  - Moderate: 8
  - Low: 5

### After Phase 2.1 Updates

- **Total Vulnerabilities**: 0-3 (target)
  - Critical: 0
  - High: 0
  - Moderate: 0-2
  - Low: 0-1

### Code Quality Improvements

- ✅ Modern, maintained dependencies
- ✅ Removed deprecated packages (request, rpc-bitcoin)
- ✅ Cleaner dev dependencies (no React overhead)
- ✅ Better error handling (modern axios)
- ✅ Faster npm installs (~50MB smaller)

---

## Deferred Updates (Phase 3+)

These updates are deferred to later phases due to:
- **Breaking changes** requiring extensive testing
- **Coordination** with Rosetta 1.4.12 upgrade
- **Data migration** complexity

| Package | Current | Target | Phase | Reason |
|---------|---------|--------|-------|--------|
| `rosetta-node-sdk` | v1.4.1 | v1.4.12 | Phase 3 | Requires API updates |
| `bitcoinjs-lib` | 6.1.7 | 7.0.0 | Phase 3 | Breaking changes, test with Rosetta upgrade |
| `ecpair` | 2.1.0 | 3.0.0 | Phase 3 | Breaking changes |
| `level` | 6.0.1 | 10.0.0 | Phase 5 | Requires UTXO index rebuild |

---

## Rollback Procedures

If any update causes issues:

### Immediate Rollback

```bash
# Restore previous package files
cp package.json.pre-update package.json
cp package-lock.json.pre-update package-lock.json

# Reinstall old dependencies
rm -rf node_modules
npm install

# Verify
npm test
npm start
```

### Git-based Rollback

```bash
# Show recent commits
git log --oneline -5

# Revert to specific commit
git revert <commit-hash>

# Or reset (destructive)
git reset --hard <commit-hash>

# Reinstall
npm install
```

---

## Success Criteria

Phase 2.1 is complete when:

- [ ] `npm audit` shows ≤3 vulnerabilities (all low/moderate)
- [ ] All unit tests pass (`npm test`)
- [ ] ESLint passes with no errors (`npm run lint`)
- [ ] Server starts without errors
- [ ] All Rosetta endpoints respond correctly
- [ ] No React dependencies in package.json
- [ ] `rpc-bitcoin` and `request` removed from dependency tree
- [ ] axios upgraded to 1.x
- [ ] Documentation updated with new RPC client usage

---

## Timeline Estimate

| Task | Estimated Time | Risk Level |
|------|----------------|------------|
| Automatic fixes (npm audit fix) | 15 minutes | Low |
| Create new RPC client | 1 hour | Medium |
| Replace rpc-bitcoin | 1-2 hours | Medium |
| Update axios | 30 minutes | Low |
| Remove React dependencies | 30 minutes | Low |
| Update ESLint | 1 hour | Low |
| Update test framework | 1 hour | Low |
| Update bitcoinjs-lib | 1 hour | Medium |
| Testing and validation | 2-3 hours | - |
| **Total** | **8-11 hours** | **Medium** |

---

## Next Document

After completing Phase 2.1:
- **Phase 2.2**: Code quality analysis and linting setup
- **Phase 2.3**: Documentation cleanup
- **Phase 2.4**: Docker optimization

---

**Document Status**: Ready for execution
**Recommended Approach**: Incremental updates with testing between each step
**Critical Path**: Replace rpc-bitcoin → Update axios → Remove vulnerabilities
