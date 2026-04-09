<#
.SYNOPSIS
  Nexvault local quality gate.
  Run this before every push to verify the workspace is green.

.DESCRIPTION
  Runs typecheck across all packages, then runs the api-server test suite.
  Exits with code 1 on the first failure.

.EXAMPLE
  pwsh -File scripts/verify-local.ps1
  # or via pnpm:
  pnpm run verify:local
#>

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent

function Run-Step {
  param([string]$Label, [string[]]$Command)
  Write-Host ""
  Write-Host "━━━ $Label ━━━" -ForegroundColor Cyan
  $start = Get-Date
  & $Command[0] $Command[1..($Command.Length - 1)]
  $exit = $LASTEXITCODE
  $elapsed = [math]::Round(((Get-Date) - $start).TotalSeconds, 1)
  if ($exit -ne 0) {
    Write-Host "FAIL: $Label (exit $exit, ${elapsed}s)" -ForegroundColor Red
    exit $exit
  }
  Write-Host "PASS: $Label (${elapsed}s)" -ForegroundColor Green
}

Set-Location $Root

Write-Host "Nexvault — local quality gate" -ForegroundColor White
Write-Host "Root: $Root"
Write-Host (Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Run-Step "Typecheck (all packages)" @("pnpm", "run", "typecheck")
Run-Step "API Server tests" @("pnpm", "--filter", "@workspace/api-server", "test")

Write-Host ""
Write-Host "━━━ ALL CHECKS PASSED ━━━" -ForegroundColor Green
Write-Host "Safe to push." -ForegroundColor Green
