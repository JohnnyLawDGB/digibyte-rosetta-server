# Rosetta 1.4.12 Upgrade Analysis

**Date:** January 4, 2026
**Current Version:** 1.4.1
**Target Version:** 1.4.12
**Status:** Research & Planning

---

## Executive Summary

The project currently uses **Rosetta API v1.4.1** via the DigiByte-Core fork of rosetta-node-sdk. The official Rosetta API specification has progressed to **v1.4.12** with significant improvements. However, **both the official rosetta-node-sdk and the DigiByte fork are inactive**, presenting challenges for a straightforward upgrade.

### Key Findings

✅ **Good News:**
- Current implementation (v1.4.1) is **fully functional**
- All 16/16 required Rosetta endpoints are implemented
- Rosetta-CLI validation has passed historically

⚠️ **Challenges:**
- Official rosetta-node-sdk: **Last updated 4 years ago** (v1.3.1-b)
- DigiByte fork: **Last updated October 2022** (v1.4.1)
- **No official v1.4.12 Node.js SDK exists**
- Rosetta is now branded as ["Mesh API"](https://github.com/coinbase/mesh-specifications)

---

## Version Comparison

### Changes from 1.4.1 → 1.4.12

#### v1.4.4 (Breaking Change)
- **Deprecated:** `signers` field
- **New:** `account_identifier_signers` field
- **Impact:** Medium - Construction API affected

#### v1.4.7 (Breaking Change)
- **Removed:** `coins` field from account balance
- **New Endpoint:** `/account/coins`
- **Impact:** High - New endpoint required

#### v1.4.9 (Enhancement)
- **Added:** Support for quiescent blockchains
- **New Field:** `SyncStatus.Synced` for health assessment
- **New Field:** `total_count` in indexer
- **Impact:** Low - Optional feature

#### v1.4.10 (Enhancement)
- **Added:** Support for related transactions (multi-block/multi-network)
- **New:** Ability to query subset of currencies on `/account/balance` and `/account/coins`
- **Changed:** `Operation.Status` now optional in Construction API
- **Impact:** Medium - Affects multiple endpoints

#### v1.4.11 (Enhancement)
- **Added:** Pallas curve type support
- **Added:** Hash case sensitivity
- **Impact:** Low - New crypto curve support

#### v1.4.12 (Bug Fix)
- **Fixed:** Case sensitivity bug in specification
- **Impact:** Low - Minor spec correction

---

## Current Implementation Status

### ✅ Implemented (v1.4.1)

**Data API (6 endpoints):**
- ✅ `/network/list`
- ✅ `/network/status`
- ✅ `/network/options`
- ✅ `/block`
- ✅ `/block/transaction`
- ✅ `/mempool`
- ✅ `/mempool/transaction`
- ✅ `/account/balance`

**Construction API (8 endpoints):**
- ✅ `/construction/derive`
- ✅ `/construction/preprocess`
- ✅ `/construction/metadata`
- ✅ `/construction/payloads`
- ✅ `/construction/parse`
- ✅ `/construction/combine`
- ✅ `/construction/hash`
- ✅ `/construction/submit`

### ❌ Not Implemented (v1.4.7+)

**Data API:**
- ❌ `/account/coins` - Added in v1.4.7

**Construction API:**
- ❌ `/call` - Optional endpoint for smart contracts

---

## Upgrade Options

### Option 1: Manual Code Updates (Recommended)

**Approach:** Update our codebase to support v1.4.12 features without upgrading the SDK

**Pros:**
- ✅ Full control over implementation
- ✅ Can cherry-pick features we need
- ✅ No dependency on inactive SDK
- ✅ Minimal risk to existing functionality

**Cons:**
- ⚠️ More development work
- ⚠️ Need to manually track spec changes

**Estimated Effort:** 6-8 hours

**Tasks:**
1. Implement `/account/coins` endpoint
2. Update Construction API to make `Operation.Status` optional
3. Add support for currency filtering on `/account/balance`
4. Update response schemas where needed
5. Test with rosetta-cli

---

### Option 2: Fork and Update SDK

**Approach:** Fork rosetta-node-sdk, update to v1.4.12, use our fork

**Pros:**
- ✅ Clean SDK-based approach
- ✅ Could benefit other projects
- ✅ Follows official patterns

**Cons:**
- ⚠️ Significant development effort
- ⚠️ Need to maintain fork long-term
- ⚠️ SDK internals are complex
- ⚠️ No upstream support

**Estimated Effort:** 20-30 hours

**Not Recommended:** Too much work for uncertain benefit

---

### Option 3: Wait for Official Update

**Approach:** Stay on v1.4.1 until official SDK updates

**Pros:**
- ✅ Zero development effort
- ✅ Current version works fine

**Cons:**
- ⚠️ No official SDK updates in 4 years
- ⚠️ Missing modern features
- ⚠️ Potential Coinbase compliance issues

**Not Recommended:** Official update unlikely to happen

---

### Option 4: Migrate to Mesh SDKs

**Approach:** Migrate to official Coinbase Mesh SDKs (Rosetta rebrand)

**Pros:**
- ✅ Official support
- ✅ Active development
- ✅ Latest features

**Cons:**
- ⚠️ Complete rewrite required
- ⚠️ Mesh SDKs are primarily Go-based
- ⚠️ No Node.js Mesh SDK available
- ⚠️ Breaking change for users

**Estimated Effort:** 40+ hours

**Not Recommended:** Too disruptive, no Node.js option

---

## Recommended Approach

### **Option 1: Manual Implementation of v1.4.12 Features**

We recommend implementing v1.4.12 features manually in our codebase:

#### Phase 1: Critical Features (Required)
1. **Implement `/account/coins` endpoint** ⭐ Priority 1
   - Required by v1.4.7 spec
   - Replaces `coins` field in balance response
   - Estimated: 3-4 hours

2. **Make `Operation.Status` optional in Construction API** ⭐ Priority 2
   - Required by v1.4.10 spec
   - Update validation logic
   - Estimated: 1 hour

#### Phase 2: Enhanced Features (Optional)
3. **Add currency filtering to `/account/balance`**
   - Nice-to-have from v1.4.10
   - Improves API flexibility
   - Estimated: 2 hours

4. **Add `SyncStatus.Synced` field**
   - Nice-to-have from v1.4.9
   - Improves health monitoring
   - Estimated: 1 hour

#### Phase 3: Testing & Validation
5. **Test with rosetta-cli v0.10.3+**
   - Ensure compliance
   - Validate all endpoints
   - Estimated: 2-3 hours

---

## Implementation Plan

### Step 1: Implement `/account/coins` Endpoint

**Location:** `src/services/AccountService.js`

**Required:** New endpoint handler

**Functionality:**
- Return unspent UTXOs for an address
- Support block_identifier parameter
- Support currencies filtering
- Return coin identifiers (txid:vout)

**Response Format:**
```json
{
  "block_identifier": {
    "index": 1000,
    "hash": "..."
  },
  "coins": [
    {
      "coin_identifier": {
        "identifier": "txid:vout"
      },
      "amount": {
        "value": "1000000",
        "currency": {
          "symbol": "DGB",
          "decimals": 8
        }
      }
    }
  ]
}
```

---

### Step 2: Update Construction API Status Handling

**Location:** `src/services/ConstructionService.js`

**Change:** Make `Operation.Status` optional in request parsing

**Current:** Status field expected
**New:** Status field optional (will be unpopulated in Construction API)

---

### Step 3: Add Currency Filtering

**Location:** `src/services/AccountService.js`

**Enhancement:** Support `currencies` array in `/account/balance` request

**Allows:**
```json
{
  "network_identifier": {...},
  "account_identifier": {...},
  "currencies": [
    {"symbol": "DGB", "decimals": 8}
  ]
}
```

---

### Step 4: Update Network Status

**Location:** `src/services/NetworkService.js`

**Enhancement:** Add `sync_status.synced` boolean field

**Purpose:** Explicit sync status for quiescent blockchains

---

## Testing Strategy

### Unit Tests
- ✅ Existing tests continue to pass
- ➕ New tests for `/account/coins`
- ➕ New tests for currency filtering

### Integration Tests
- Test with rosetta-cli `check:data`
- Test with rosetta-cli `check:construction`

### Manual Tests
- Verify `/account/coins` returns correct UTXOs
- Verify currency filtering works
- Verify backward compatibility

---

## Risks & Mitigation

### Risk 1: Breaking Changes
**Mitigation:** Thorough testing, maintain backward compatibility where possible

### Risk 2: Rosetta-CLI Validation Failures
**Mitigation:** Test early and often with rosetta-cli

### Risk 3: Incomplete Spec Understanding
**Mitigation:** Reference official specification files, test against known working implementations

---

## Timeline Estimate

| Phase | Duration | Status |
|-------|----------|--------|
| Research & Planning | 2 hours | ✅ Complete |
| `/account/coins` Implementation | 3-4 hours | ⏳ Pending |
| Construction API Updates | 1 hour | ⏳ Pending |
| Optional Enhancements | 3 hours | ⏳ Pending |
| Testing & Validation | 2-3 hours | ⏳ Pending |
| **Total** | **11-13 hours** | |

---

## Decision

**Recommended:** Proceed with Option 1 - Manual implementation

**Rationale:**
1. Pragmatic approach given SDK situation
2. Focused on actual Rosetta spec compliance
3. Maintains control and flexibility
4. Reasonable time investment
5. Positions project for future Coinbase submission

---

## References

- [Rosetta API Specification v1.4.12](https://github.com/coinbase/mesh-specifications)
- [Mesh Specifications Releases](https://github.com/coinbase/mesh-specifications/releases)
- [Rosetta API Documentation](https://www.rosetta-api.org/docs/Reference.html)
- [DigiByte Rosetta SDK](https://github.com/DigiByte-Core/digibyte-rosetta-nodeapi)
- [Current Implementation Status](./ROSETTA_COMPLIANCE_CHECKLIST.md)

---

## Next Steps

1. **User Decision:** Approve implementation plan
2. **Implementation:** Begin with `/account/coins` endpoint
3. **Testing:** Validate with rosetta-cli
4. **Documentation:** Update compliance checklist
5. **Submission:** Consider Coinbase Asset Hub submission

---

**Status:** Awaiting approval to proceed with Phase 1 implementation
