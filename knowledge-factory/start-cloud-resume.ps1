#requires -version 5.1
<#
 Source-exact DepLoom Knowledge Factory safe recovery and resume.
 Plan is local/offline and costs no API credits.
 Run is explicitly authorized and first reconciles old cloud sessions
 with read-only GET requests before submitting any new agent input.
 Does not change global Git, Python, credentials, VPN or proxy.
#>
[CmdletBinding()]
param(
    [ValidateSet('Plan','Run')][string]$Mode = 'Plan',
    [ValidateRange(1,80)][int]$Count = 80,
    [ValidateSet(1,2,4)][int]$Workers = 2,
    [ValidateRange(1,60)][int]$TimeoutMinutes = 30,
    [ValidateSet('gpt-6-luna','gpt-6.2-sol')][string]$Model = 'gpt-6-luna',
    [switch]$ConfirmPaid
)
$ErrorActionPreference = 'Stop'
if ($Mode -eq 'Run' -and -not $ConfirmPaid) {
    throw 'Paid resume requires explicit -ConfirmPaid. Plan first; $2 reservations are not spending limits.'
}
$project = Split-Path -Parent $PSScriptRoot
Push-Location $project
try {
    $cmd = @(
        'knowledge-factory/resume_batch.py',
        $Mode.ToLowerInvariant(),
        '--max-sessions', [string]$Count,
        '--workers', [string]$Workers,
        '--model', $Model,
        '--timeout', [string]($TimeoutMinutes * 60)
    )
    if ($Mode -eq 'Run') {
        Write-Warning 'Paid resume: NO per-session API spend cap. Known completed/failed/UNKNOWN tasks will NOT be retried.'
        Write-Warning 'Keep Windows awake, PowerShell and TUN online for server-side cancellation.'
        $cmd += '--execute'
    }
    & python @cmd
    if ($LASTEXITCODE -ne 0) {
        throw 'Resume is incomplete or unconfirmed. Inspect reconciliation/receipts; do not retry blindly.'
    }
} finally {
    Pop-Location
}
