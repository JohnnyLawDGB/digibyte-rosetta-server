# DigiByte Rosetta Server - Claude Code Assessment & Improvement Prompt

## Context

You are helping Johnny, a blockchain analyst specializing in DigiByte, prepare a Rosetta API server implementation for a Coinbase listing submission. The project is a Dockerized NodeJS implementation of the Coinbase Rosetta Specification (v1.4.1) designed to interface with DigiByte Core v8.22.2+.

**Current State**: The project was nearly running but needs assessment, cleanup, and incremental improvements. Johnny has a fully indexed DigiByte node running locally.

**Repository**: `digibyte-rosetta-server`
**Target Rosetta Version**: 1.4.12 (upgrade from 1.4.1)
**DigiByte Core**: v8.22.2+ (v8.26+ has Taproot support)

---

## Phase 1: Project Assessment

### Step 1.1 - Directory Structure Analysis

```bash
# Map the complete project structure
find . -type f -name "*.js" -o -name "*.json" -o -name "*.ts" | head -100
tree -I 'node_modules|.git' -L 3

# Check package.json for dependencies and scripts
cat package.json

# Identify configuration files
ls -la *.json *.yaml *.yml .env* Dockerfile docker-compose* 2>/dev/null
```

**Deliverable**: Create `docs/PROJECT_STRUCTURE.md` documenting:
- Source code organization
- Configuration files and their purposes
- Docker setup details
- Dependency analysis (outdated packages, security vulnerabilities)

### Step 1.2 - Rosetta API Compliance Check

```bash
# Review implemented endpoints
grep -r "router\." --include="*.js" src/ | grep -E "(post|get)" 

# Check against Rosetta spec requirements:
# Data API: /network/*, /block/*, /account/*, /mempool/*, /call
# Construction API: /construction/*
```

**Create checklist** comparing implemented endpoints vs Rosetta 1.4.12 spec:

| Endpoint | Required | Implemented | Status |
|----------|----------|-------------|--------|
| `/network/list` | Yes | ? | |
| `/network/status` | Yes | ? | |
| `/network/options` | Yes | ? | |
| `/block` | Yes | ? | |
| `/block/transaction` | Yes | ? | |
| `/account/balance` | Yes | ? | |
| `/account/coins` | Optional | ? | |
| `/mempool` | Yes | ? | |
| `/mempool/transaction` | Yes | ? | |
| `/construction/derive` | Yes | ? | |
| `/construction/preprocess` | Yes | ? | |
| `/construction/metadata` | Yes | ? | |
| `/construction/payloads` | Yes | ? | |
| `/construction/parse` | Yes | ? | |
| `/construction/combine` | Yes | ? | |
| `/construction/hash` | Yes | ? | |
| `/construction/submit` | Yes | ? | |

### Step 1.3 - Local Environment Verification

```bash
# Check if DigiByte node is accessible
curl --user <rpc_user>:<rpc_pass> --data-binary '{"jsonrpc":"1.0","method":"getblockchaininfo","params":[]}' -H 'content-type:text/plain;' http://127.0.0.1:14022/

# Verify required indices are enabled
digibyte-cli getindexinfo

# Check node sync status
digibyte-cli getblockcount
```

**Document** in `docs/LOCAL_SETUP.md`:
- RPC connection parameters
- Required `digibyte.conf` settings for Rosetta compatibility
- Index requirements (txindex, addressindex if available)

---

## Phase 2: Codebase Cleanup

### Step 2.1 - Dependency Audit & Update

```bash
# Check for outdated packages
npm outdated

# Security audit
npm audit

# Update package-lock.json
npm install
```

**Actions**:
1. Update non-breaking dependencies
2. Document breaking changes that need code modifications
3. Create `docs/DEPENDENCY_UPDATES.md` with migration notes

### Step 2.2 - Code Quality Analysis

```bash
# Install linting tools if not present
npm install --save-dev eslint prettier

# Generate ESLint config
npx eslint --init

# Run linter
npx eslint src/ --ext .js --report-unused-disable-directives

# Check for dead code
npx unimported
```

**Create** `.eslintrc.js` and `.prettierrc` with project-appropriate settings.

### Step 2.3 - Documentation Cleanup

Review and update:
- `README.md` - Ensure accuracy for current state
- `docs/ExampleRequests.md` - Verify all examples work
- `docs/Validation.md` - Update validation procedures
- Add `CHANGELOG.md` if missing

### Step 2.4 - Docker Optimization

```dockerfile
# Review Dockerfile for:
# - Multi-stage build optimization
# - Layer caching efficiency  
# - Security (non-root user, minimal base image)
# - Build arg documentation
```

**Deliverable**: Optimized `Dockerfile` with comments explaining each stage.

---

## Phase 3: Rosetta 1.4.12 Upgrade Path

### Step 3.1 - Spec Diff Analysis

Compare Rosetta 1.4.1 → 1.4.12 changes:

```bash
# Key changes to implement:
# 1. New fields in NetworkStatusResponse
# 2. Updated error codes
# 3. New optional endpoints
# 4. Schema validation updates
```

**Create** `docs/ROSETTA_UPGRADE.md` documenting required changes.

### Step 3.2 - Schema Updates

Update OpenAPI/JSON schemas to match 1.4.12:

```bash
# Download latest Rosetta types
curl -O https://raw.githubusercontent.com/coinbase/rosetta-specifications/master/api.json

# Compare with current implementation
diff api.json current-api.json
```

### Step 3.3 - Incremental Implementation

For each endpoint requiring updates:

1. Write/update tests first (TDD approach)
2. Implement changes
3. Validate with rosetta-cli
4. Document in changelog

---

## Phase 4: Testing & Validation

### Step 4.1 - Unit Test Coverage

```bash
# Check current coverage
npm run test -- --coverage

# Identify untested code paths
```

**Target**: 80%+ coverage on critical paths (balance calculation, transaction parsing).

### Step 4.2 - Integration Testing

```bash
# Start local environment
docker-compose up -d

# Run rosetta-cli checks
rosetta-cli check:data --configuration-file rosetta-cli-conf.json
rosetta-cli check:construction --configuration-file rosetta-cli-conf.json
```

### Step 4.3 - Balance Validation

Validate Rosetta balance responses against direct RPC calls to your local node:

```bash
# Direct RPC balance check using scantxoutset
digibyte-cli scantxoutset start '["addr(dgb1qlsmt5a8vqqus5fwslx8pyyemgjtg4y6uth5s6x)"]'

# Compare with Rosetta /account/balance endpoint
curl -s -X POST http://localhost:8080/account/balance \
  -H "Content-Type: application/json" \
  -d '{
    "network_identifier": {"blockchain": "DigiByte", "network": "mainnet"},
    "account_identifier": {"address": "dgb1qlsmt5a8vqqus5fwslx8pyyemgjtg4y6uth5s6x"}
  }' | jq '.balances'
```

**Validation script** - create `scripts/validate-balances.sh`:
```bash
#!/bin/bash
# Compare RPC scantxoutset results with Rosetta API responses

TEST_ADDRESSES=(
    "dgb1qlsmt5a8vqqus5fwslx8pyyemgjtg4y6uth5s6x"
    "dgb1qncmk6enuykzc8dmzzf7t27u4xekgkkawlnrd43"
)

for addr in "${TEST_ADDRESSES[@]}"; do
    echo "Testing: $addr"
    
    # Get balance from local node RPC
    RPC_BALANCE=$(digibyte-cli scantxoutset start "[\"addr($addr)\"]" | jq -r '.total_amount')
    
    # Get balance from Rosetta API
    ROSETTA_BALANCE=$(curl -s -X POST http://localhost:8080/account/balance \
      -H "Content-Type: application/json" \
      -d "{\"network_identifier\":{\"blockchain\":\"DigiByte\",\"network\":\"mainnet\"},\"account_identifier\":{\"address\":\"$addr\"}}" \
      | jq -r '.balances[0].value')
    
    # Convert Rosetta satoshis to DGB for comparison
    ROSETTA_DGB=$(echo "scale=8; $ROSETTA_BALANCE / 100000000" | bc)
    
    echo "  RPC:     $RPC_BALANCE DGB"
    echo "  Rosetta: $ROSETTA_DGB DGB"
    
    if [ "$RPC_BALANCE" == "$ROSETTA_DGB" ]; then
        echo "  ✓ MATCH"
    else
        echo "  ✗ MISMATCH"
    fi
    echo ""
done
```

This validates that the Rosetta UTXO indexer is correctly tracking balances against the authoritative source: your local node.

---

## Phase 5: Performance & Reliability

### Step 5.1 - UTXO Indexer Optimization

The current LevelDB-based UTXO indexer (6.7GB as of 2020) needs review:

```bash
# Check current index size
du -sh data/

# Analyze query performance
# Add timing instrumentation to balance lookups
```

**Consider**:
- Index compression options
- Query caching for frequently accessed addresses
- Batch operation optimization

### Step 5.2 - Error Handling Hardening

```javascript
// Ensure all RPC calls have:
// - Timeout handling
// - Retry logic with exponential backoff
// - Graceful degradation
// - Structured error responses per Rosetta spec
```

### Step 5.3 - Monitoring & Logging

Implement structured logging:

```javascript
// Add request/response logging
// Track sync status
// Monitor RPC connection health
// Alert on reorg events
```

---

## Phase 6: Coinbase Submission Preparation

### Step 6.1 - rosetta-cli Validation Suite

```bash
# Full validation run
rosetta-cli check:data \
  --configuration-file rosetta-cli-conf.json \
  --end 1000 \
  --log-level debug

# Construction API validation
rosetta-cli check:construction \
  --configuration-file rosetta-cli-conf.json \
  --log-level debug
```

**Deliverable**: `docs/VALIDATION_RESULTS.md` with full test output.

### Step 6.2 - Documentation Package

Prepare submission materials:

1. `docs/INTEGRATION_GUIDE.md` - How to run the Rosetta server
2. `docs/ARCHITECTURE.md` - Technical implementation details
3. `docs/SECURITY.md` - Security considerations
4. `docs/OPERATIONAL_NOTES.md` - Production deployment guidance

### Step 6.3 - GitHub Repository Cleanup

```bash
# Ensure .gitignore is comprehensive
# Remove any sensitive data from git history
# Tag release version
git tag -a v1.1.0 -m "Rosetta 1.4.12 compliance release"
```

---

## Execution Instructions

Run phases incrementally, committing after each step:

```bash
# Start with assessment
git checkout -b feature/rosetta-upgrade

# After each phase
git add -A
git commit -m "Phase X.Y: Description of changes"

# Create PR for review before merging
```

**Priority Order**:
1. Phase 1 (Assessment) - Understand current state
2. Phase 4.2 (Integration Testing) - Verify it runs at all
3. Phase 2 (Cleanup) - Stabilize codebase
4. Phase 3 (Upgrade) - Rosetta 1.4.12 compliance
5. Phase 5 (Performance) - Production readiness
6. Phase 6 (Submission) - Coinbase package

---

## Reference Links

- [Rosetta API Specification](https://www.rosetta-api.org/docs/Reference.html)
- [Rosetta CLI Tool](https://github.com/coinbase/rosetta-cli)
- [Rosetta SDK (Node)](https://github.com/coinbase/rosetta-sdk-go) 
- [DigiByte Core RPC](https://github.com/DigiByte-Core/digibyte)
- [Coinbase Asset Listing Requirements](https://www.coinbase.com/assethub)

---

## Notes for Claude Code

When executing this prompt:

1. **Be incremental** - Complete one step before moving to next
2. **Preserve working code** - Don't break what's functional
3. **Test frequently** - Validate after each change
4. **Document everything** - Future maintainers need context
5. **Local node is source of truth** - All validation against RPC, no external APIs

**Johnny's Local Environment**:
- DigiByte Core node running with full txindex
- RPC available at 127.0.0.1:14022 (verify actual port)
- Node version: v8.22.2+ (possibly v8.26+ with Taproot)

**Key RPC Methods for Rosetta**:
- `getblockchaininfo` - Network status
- `getblock` / `getblockhash` - Block data
- `getrawtransaction` - Transaction details (requires txindex)
- `scantxoutset` - Balance validation
- `sendrawtransaction` - Construction API submission

**Test Addresses** (known exchange wallets):
- `dgb1qlsmt5a8vqqus5fwslx8pyyemgjtg4y6uth5s6x` - Binance cold wallet
- `dgb1qncmk6enuykzc8dmzzf7t27u4xekgkkawlnrd43` - Crypto.com hot wallet
