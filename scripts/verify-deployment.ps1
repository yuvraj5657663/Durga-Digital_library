# Deployment Verification Script (Windows PowerShell)
# This script verifies that the system is ready for production deployment

$ErrorActionPreference = "Stop"

Write-Host "Starting Deployment Verification..." -ForegroundColor Cyan
Write-Host ""

# Get script directory
$ScriptDir = $PSScriptRoot
$ProjectRoot = Split-Path -Parent $ScriptDir

# Verification counters
$TotalChecks = 0
$PassedChecks = 0
$FailedChecks = 0

# Function to check and report
function Test-Check {
    param(
        [string]$Description,
        [scriptblock]$Test
    )
    
    $script:TotalChecks++
    Write-Host "Checking: $Description... " -NoNewline
    
    try {
        $result = & $Test
        if ($result) {
            Write-Host "PASS" -ForegroundColor Green
            $script:PassedChecks++
            return $true
        } else {
            Write-Host "FAIL" -ForegroundColor Red
            $script:FailedChecks++
            return $false
        }
    } catch {
        Write-Host "FAIL" -ForegroundColor Red
        $script:FailedChecks++
        return $false
    }
}

# Change to project root
Set-Location $ProjectRoot

Write-Host "Directory Structure Checks" -ForegroundColor Yellow
Write-Host "-----------------------------"
Test-Check "client directory exists" { Test-Path "client" }
Test-Check "server directory exists" { Test-Path "server" }
Test-Check "scripts directory exists" { Test-Path "scripts" }
Test-Check "package.json exists" { Test-Path "package.json" }
Test-Check "server/package.json exists" { Test-Path "server/package.json" }
Test-Check "client/package.json exists" { Test-Path "client/package.json" }
Test-Check "server/.env exists" { Test-Path "server/.env" }
Test-Check "client/.env exists" { Test-Path "client/.env" }
Write-Host ""

Write-Host "Dependency Checks" -ForegroundColor Yellow
Write-Host "-----------------------------"
Test-Check "node_modules exists" { Test-Path "node_modules" }
Test-Check "root package.json is valid" { $null = Get-Content "package.json" | ConvertFrom-Json; $true }
Test-Check "server package.json is valid" { $null = Get-Content "server/package.json" | ConvertFrom-Json; $true }
Test-Check "client package.json is valid" { $null = Get-Content "client/package.json" | ConvertFrom-Json; $true }
Write-Host "NOTE: Dependencies managed via npm workspaces" -ForegroundColor Gray
Write-Host ""

Write-Host "Build Artifacts Checks" -ForegroundColor Yellow
Write-Host "-----------------------------"
Test-Check "server/dist exists" { Test-Path "server/dist" }
Test-Check "server/dist/index.js exists" { Test-Path "server/dist/index.js" }
Test-Check "client/dist exists" { Test-Path "client/dist" }
Test-Check "client/dist/index.html exists" { Test-Path "client/dist/index.html" }
Write-Host ""

Write-Host "Configuration Checks" -ForegroundColor Yellow
Write-Host "-----------------------------"
Test-Check "ecosystem.config.js exists" { Test-Path "server/ecosystem.config.js" }
Test-Check "nginx.conf exists" { Test-Path "nginx.conf" }
Test-Check "docker-compose.yml exists" { Test-Path "docker-compose.yml" }
Test-Check "Dockerfile exists (server)" { Test-Path "server/Dockerfile" }
Test-Check "Dockerfile exists (client)" { Test-Path "client/Dockerfile" }
Write-Host ""

Write-Host "Script Checks" -ForegroundColor Yellow
Write-Host "-----------------------------"
Test-Check "backup-mongodb.sh exists" { Test-Path "scripts/backup-mongodb.sh" }
Test-Check "restore-mongodb.sh exists" { Test-Path "scripts/restore-mongodb.sh" }
Test-Check "backup-system.sh exists" { Test-Path "scripts/backup-system.sh" }
Test-Check "deploy.sh exists" { Test-Path "scripts/deploy.sh" }
Test-Check "verify-deployment.sh exists" { Test-Path "scripts/verify-deployment.sh" }
Write-Host ""

Write-Host "Testing Infrastructure" -ForegroundColor Yellow
Write-Host "-----------------------------"
Test-Check "jest.config.js exists" { Test-Path "server/jest.config.js" }
Test-Check "vitest.config.js exists" { Test-Path "client/vitest.config.js" }
Test-Check "tests directory exists" { Test-Path "server/tests" }
Test-Check "integration tests exist" { Test-Path "server/tests/integration/auth.integration.test.js" }
Test-Check "test setup exists" { Test-Path "server/tests/setup.js" }
Write-Host ""

Write-Host "Performance & Load Testing" -ForegroundColor Yellow
Write-Host "-----------------------------"
Test-Check "k6 directory exists" { Test-Path "k6" }
Test-Check "load-test.js exists" { Test-Path "k6/load-test.js" }
Write-Host ""

Write-Host "Documentation" -ForegroundColor Yellow
Write-Host "-----------------------------"
Test-Check "README.md exists" { Test-Path "README.md" }
Test-Check "MIGRATION_GUIDE.md exists" { Test-Path "MIGRATION_GUIDE.md" }
Test-Check "CLEANUP_SUMMARY.md exists" { Test-Path "CLEANUP_SUMMARY.md" }
Test-Check "AWS_DEPLOYMENT_CHECKLIST.md exists" { Test-Path "AWS_DEPLOYMENT_CHECKLIST.md" }
Test-Check "PRODUCTION_AUDIT.md exists" { Test-Path "PRODUCTION_AUDIT.md" }
Write-Host ""

Write-Host "Security Checks" -ForegroundColor Yellow
Write-Host "-----------------------------"
Test-Check ".gitignore exists" { Test-Path ".gitignore" }
Test-Check ".env in .gitignore" { Select-String -Path ".gitignore" -Pattern "\.env" -Quiet }
Test-Check "node_modules in .gitignore" { Select-String -Path ".gitignore" -Pattern "node_modules" -Quiet }
Test-Check "logs in .gitignore" { Select-String -Path ".gitignore" -Pattern "logs" -Quiet }
Write-Host ""

Write-Host "Environment Validation" -ForegroundColor Yellow
Write-Host "-----------------------------"
if (Test-Path "server/.env") {
    Test-Check "MONGODB_URI in server/.env" { Select-String -Path "server/.env" -Pattern "MONGODB_URI" -Quiet }
    Test-Check "JWT_SECRET in server/.env" { Select-String -Path "server/.env" -Pattern "JWT_SECRET" -Quiet }
    Test-Check "ADMIN_USER in server/.env" { Select-String -Path "server/.env" -Pattern "ADMIN_USER" -Quiet }
    Test-Check "ADMIN_PASS in server/.env" { Select-String -Path "server/.env" -Pattern "ADMIN_PASS" -Quiet }
} else {
    Write-Host "WARNING: server/.env not found" -ForegroundColor Yellow
}

if (Test-Path "client/.env") {
    Test-Check "VITE_API_URL in client/.env" { Select-String -Path "client/.env" -Pattern "VITE_API_URL" -Quiet }
} else {
    Write-Host "WARNING: client/.env not found" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "================================" -ForegroundColor Cyan
Write-Host "VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Total Checks: $TotalChecks"
Write-Host "Passed: $PassedChecks" -ForegroundColor Green
Write-Host "Failed: $FailedChecks" -ForegroundColor Red
Write-Host ""

if ($FailedChecks -eq 0) {
    Write-Host "ALL CHECKS PASSED - SYSTEM READY FOR DEPLOYMENT" -ForegroundColor Green
    exit 0
} else {
    Write-Host "SOME CHECKS FAILED - REVIEW AND FIX BEFORE DEPLOYMENT" -ForegroundColor Red
    exit 1
}
