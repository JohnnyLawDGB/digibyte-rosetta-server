#!/bin/bash
# DigiByte Rosetta Server - Environment Verification Script
# Run this before starting the improvement workflow

set -e

echo "=========================================="
echo "DigiByte Rosetta Server - Environment Check"
echo "=========================================="
echo ""

# Configuration - Update these for your environment
RPC_HOST="${RPC_HOST:-127.0.0.1}"
RPC_PORT="${RPC_PORT:-14022}"
RPC_USER="${RPC_USER:-}"
RPC_PASS="${RPC_PASS:-}"
ROSETTA_PORT="${ROSETTA_PORT:-8080}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Check if DigiByte node is running
echo "1. Checking DigiByte Node..."
echo "----------------------------"

if command -v digibyte-cli &> /dev/null; then
    check_pass "digibyte-cli found in PATH"
    
    # Try to get blockchain info
    if digibyte-cli getblockchaininfo &> /dev/null; then
        BLOCK_COUNT=$(digibyte-cli getblockcount)
        CHAIN=$(digibyte-cli getblockchaininfo | grep -o '"chain": "[^"]*"' | cut -d'"' -f4)
        check_pass "Node responding - Chain: $CHAIN, Height: $BLOCK_COUNT"
        
        # Check sync status
        HEADERS=$(digibyte-cli getblockchaininfo | grep -o '"headers": [0-9]*' | grep -o '[0-9]*')
        if [ "$BLOCK_COUNT" -eq "$HEADERS" ]; then
            check_pass "Node fully synced"
        else
            check_warn "Node syncing: $BLOCK_COUNT / $HEADERS blocks"
        fi
        
        # Check txindex
        if digibyte-cli getindexinfo 2>/dev/null | grep -q "txindex"; then
            check_pass "txindex enabled"
        else
            check_warn "txindex status unknown - verify in digibyte.conf"
        fi
    else
        check_fail "Cannot connect to DigiByte node via CLI"
        echo "    Ensure digibyted is running and digibyte.conf is configured"
    fi
else
    check_warn "digibyte-cli not in PATH - checking RPC directly..."
fi

# 2. Check RPC connectivity
echo ""
echo "2. Checking RPC Connectivity..."
echo "-------------------------------"

if [ -n "$RPC_USER" ] && [ -n "$RPC_PASS" ]; then
    RPC_RESPONSE=$(curl -s --user "$RPC_USER:$RPC_PASS" \
        --data-binary '{"jsonrpc":"1.0","method":"getblockchaininfo","params":[]}' \
        -H 'content-type:text/plain;' \
        "http://$RPC_HOST:$RPC_PORT/" 2>&1)
    
    if echo "$RPC_RESPONSE" | grep -q '"result"'; then
        check_pass "RPC connection successful at $RPC_HOST:$RPC_PORT"
    else
        check_fail "RPC connection failed"
        echo "    Response: $RPC_RESPONSE"
    fi
else
    check_warn "RPC credentials not set - export RPC_USER and RPC_PASS"
fi

# 3. Check Node.js environment
echo ""
echo "3. Checking Node.js Environment..."
echo "-----------------------------------"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js installed: $NODE_VERSION"
    
    # Check if version is adequate (>=14)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | tr -d 'v')
    if [ "$MAJOR_VERSION" -ge 14 ]; then
        check_pass "Node.js version adequate for Rosetta server"
    else
        check_warn "Node.js 14+ recommended, found $NODE_VERSION"
    fi
else
    check_fail "Node.js not found - install Node.js 14+"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_pass "npm installed: $NPM_VERSION"
else
    check_fail "npm not found"
fi

# 4. Check Docker (optional but recommended)
echo ""
echo "4. Checking Docker Environment..."
echo "----------------------------------"

if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    check_pass "Docker installed: $DOCKER_VERSION"
    
    if docker info &> /dev/null; then
        check_pass "Docker daemon running"
    else
        check_warn "Docker daemon not accessible (may need sudo)"
    fi
else
    check_warn "Docker not installed - optional for local development"
fi

if command -v docker-compose &> /dev/null; then
    check_pass "docker-compose available"
else
    check_warn "docker-compose not found - optional"
fi

# 5. Check Rosetta CLI (for validation)
echo ""
echo "5. Checking Rosetta CLI..."
echo "--------------------------"

if command -v rosetta-cli &> /dev/null; then
    ROSETTA_CLI_VERSION=$(rosetta-cli version 2>/dev/null || echo "unknown")
    check_pass "rosetta-cli installed: $ROSETTA_CLI_VERSION"
else
    check_warn "rosetta-cli not found"
    echo "    Install with: go install github.com/coinbase/rosetta-cli@latest"
fi

# 6. Check project directory
echo ""
echo "6. Checking Project Files..."
echo "----------------------------"

if [ -f "package.json" ]; then
    check_pass "package.json found"
    
    # Check if node_modules exists
    if [ -d "node_modules" ]; then
        check_pass "node_modules directory exists"
    else
        check_warn "node_modules not found - run 'npm install'"
    fi
    
    # Check for key source files
    if [ -d "src" ]; then
        JS_COUNT=$(find src -name "*.js" | wc -l)
        check_pass "Source directory found with $JS_COUNT JS files"
    else
        check_warn "src directory not found"
    fi
    
    # Check for Dockerfile
    if [ -f "Dockerfile" ]; then
        check_pass "Dockerfile present"
    else
        check_warn "Dockerfile not found"
    fi
else
    check_warn "package.json not found - are you in the project root?"
fi

# 7. Test RPC methods needed by Rosetta
echo ""
echo "7. Testing Critical RPC Methods..."
echo "-----------------------------------"

if [ -n "$RPC_USER" ] && [ -n "$RPC_PASS" ]; then
    # Test getblockchaininfo
    if curl -s --user "$RPC_USER:$RPC_PASS" \
        --data-binary '{"jsonrpc":"1.0","method":"getblockchaininfo","params":[]}' \
        -H 'content-type:text/plain;' "http://$RPC_HOST:$RPC_PORT/" | grep -q '"chain"'; then
        check_pass "getblockchaininfo working"
    else
        check_fail "getblockchaininfo failed"
    fi
    
    # Test getrawtransaction (requires txindex)
    # Using genesis coinbase as test
    if curl -s --user "$RPC_USER:$RPC_PASS" \
        --data-binary '{"jsonrpc":"1.0","method":"getblockhash","params":[1]}' \
        -H 'content-type:text/plain;' "http://$RPC_HOST:$RPC_PORT/" | grep -q '"result"'; then
        check_pass "getblockhash working"
    else
        check_fail "getblockhash failed"
    fi
    
    # Test scantxoutset (needed for balance validation)
    SCAN_TEST=$(curl -s --user "$RPC_USER:$RPC_PASS" \
        --data-binary '{"jsonrpc":"1.0","method":"scantxoutset","params":["status"]}' \
        -H 'content-type:text/plain;' "http://$RPC_HOST:$RPC_PORT/" 2>&1)
    if echo "$SCAN_TEST" | grep -q '"result"'; then
        check_pass "scantxoutset available"
    else
        check_warn "scantxoutset may not be available"
    fi
else
    check_warn "Skipping RPC method tests - credentials not set"
fi

# Summary
echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "If all critical checks passed, you're ready to proceed with:"
echo "  1. npm install (if node_modules missing)"
echo "  2. Configure .env or export environment variables"
echo "  3. npm start (to run Rosetta server locally)"
echo ""
echo "For Docker deployment:"
echo "  docker build -t digibyte/rosetta:latest ."
echo "  docker run -p 8080:8080 digibyte/rosetta:latest"
echo ""
echo "For full assessment, use the Claude Code prompt in:"
echo "  rosetta-server-improvement-prompt.md"
