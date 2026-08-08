#!/bin/bash

# Deployment Verification Script
# This script verifies that the system is ready for production deployment

set -e

echo "🔍 Starting Deployment Verification..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Verification counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Function to check and report
check() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    local description=$1
    local command=$2
    
    echo -n "Checking: $description... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Change to project root
cd "$PROJECT_ROOT"

echo "📁 Directory Structure Checks"
echo "─────────────────────────────"
check "client directory exists" "[ -d client ]"
check "server directory exists" "[ -d server ]"
check "scripts directory exists" "[ -d scripts ]"
check "package.json exists" "[ -f package.json ]"
check "server/package.json exists" "[ -f server/package.json ]"
check "client/package.json exists" "[ -f client/package.json ]"
check "server/.env exists" "[ -f server/.env ]"
check "client/.env exists" "[ -f client/.env ]"
echo ""

echo "📦 Dependency Checks"
echo "─────────────────────────────"
check "node_modules exists" "[ -d node_modules ]"
check "server/node_modules exists" "[ -d server/node_modules ]"
check "client/node_modules exists" "[ -d client/node_modules ]"
check "root package.json is valid" "node -e 'require(\"./package.json\")'"
check "server package.json is valid" "node -e 'require(\"./server/package.json\")'"
check "client package.json is valid" "node -e 'require(\"./client/package.json\")'"
echo ""

echo "🔧 Build Artifacts Checks"
echo "─────────────────────────────"
check "server/dist exists" "[ -d server/dist ]"
check "server/dist/index.js exists" "[ -f server/dist/index.js ]"
check "client/dist exists" "[ -d client/dist ]"
check "client/dist/index.html exists" "[ -f client/dist/index.html ]"
echo ""

echo "📝 Configuration Checks"
echo "─────────────────────────────"
check "ecosystem.config.js exists" "[ -f server/ecosystem.config.js ]"
check "nginx.conf exists" "[ -f nginx.conf ]"
check "docker-compose.yml exists" "[ -f docker-compose.yml ]"
check "Dockerfile exists (server)" "[ -f server/Dockerfile ]"
check "Dockerfile exists (client)" "[ -f client/Dockerfile ]"
echo ""

echo "📜 Script Checks"
echo "─────────────────────────────"
check "backup-mongodb.sh exists" "[ -f scripts/backup-mongodb.sh ]"
check "backup-mongodb.sh is executable" "[ -x scripts/backup-mongodb.sh ]"
check "restore-mongodb.sh exists" "[ -f scripts/restore-mongodb.sh ]"
check "restore-mongodb.sh is executable" "[ -x scripts/restore-mongodb.sh ]"
check "backup-system.sh exists" "[ -f scripts/backup-system.sh ]"
check "backup-system.sh is executable" "[ -x scripts/backup-system.sh ]"
check "deploy.sh exists" "[ -f scripts/deploy.sh ]"
check "deploy.sh is executable" "[ -x scripts/deploy.sh ]"
echo ""

echo "🧪 Testing Infrastructure"
echo "─────────────────────────────"
check "jest.config.js exists" "[ -f server/jest.config.js ]"
check "vitest.config.js exists" "[ -f client/vitest.config.js ]"
check "tests directory exists" "[ -d server/tests ]"
check "integration tests exist" "[ -f server/tests/integration/auth.integration.test.js ]"
check "test setup exists" "[ -f server/tests/setup.js ]"
echo ""

echo "⚡ Performance & Load Testing"
echo "─────────────────────────────"
check "k6 directory exists" "[ -d k6 ]"
check "load-test.js exists" "[ -f k6/load-test.js ]"
echo ""

echo "📚 Documentation"
echo "─────────────────────────────"
check "README.md exists" "[ -f README.md ]"
check "MIGRATION_GUIDE.md exists" "[ -f MIGRATION_GUIDE.md ]"
check "CLEANUP_SUMMARY.md exists" "[ -f CLEANUP_SUMMARY.md ]"
check "AWS_DEPLOYMENT_CHECKLIST.md exists" "[ -f AWS_DEPLOYMENT_CHECKLIST.md ]"
check "PRODUCTION_AUDIT.md exists" "[ -f PRODUCTION_AUDIT.md ]"
echo ""

echo "🔒 Security Checks"
echo "─────────────────────────────"
check ".gitignore exists" "[ -f .gitignore ]"
check ".env in .gitignore" "grep -q '\.env' .gitignore"
check "node_modules in .gitignore" "grep -q 'node_modules' .gitignore"
check "logs in .gitignore" "grep -q 'logs' .gitignore"
echo ""

echo "🚀 Environment Validation"
echo "─────────────────────────────"
if [ -f server/.env ]; then
    check "MONGODB_URI in server/.env" "grep -q 'MONGODB_URI' server/.env"
    check "JWT_SECRET in server/.env" "grep -q 'JWT_SECRET' server/.env"
    check "ADMIN_USER in server/.env" "grep -q 'ADMIN_USER' server/.env"
    check "ADMIN_PASS in server/.env" "grep -q 'ADMIN_PASS' server/.env"
else
    echo -e "${YELLOW}⚠️  server/.env not found${NC}"
fi

if [ -f client/.env ]; then
    check "VITE_API_URL in client/.env" "grep -q 'VITE_API_URL' client/.env"
else
    echo -e "${YELLOW}⚠️  client/.env not found${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 VERIFICATION SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total Checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $PASSED_CHECKS${NC}"
echo -e "${RED}Failed: $FAILED_CHECKS${NC}"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED - SYSTEM READY FOR DEPLOYMENT${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME CHECKS FAILED - REVIEW AND FIX BEFORE DEPLOYMENT${NC}"
    exit 1
fi
