#requires -version 5.1
<#
 Source-exact DepLoom Agents API research pilot.
 Defaults to PLAN (zero API credits). RUN creates hosted sessions.
 Uncapped modes require explicit opt-in; local reservations do not cap spend.
 Does not change system proxy, credentials, shell profile, Git global config
 or the package registry.
#>
[CmdletBinding()]
param(
    [ValidateSet('Plan','Run')][string]$Mode = 'Plan',
    [ValidateRange(1,80)][int]$Count = 8,
    [ValidateSet(1,2,4,8)][int]$Workers = 4,
    [ValidateRange(0,79)][int]$Offset = 0,
    [ValidateRange(1,60)][int]$TimeoutMinutes = 60,
    [ValidateSet('gpt-6.2-sol','gpt-6-luna','gpt-6-astra')][string]$Model = 'gpt-6.2-sol',
    [switch]$AllowUncappedSession,
    [switch]$AllowUncappedBatch
)
$ErrorActionPreference = 'Stop'
if ($AllowUncappedSession -and $AllowUncappedBatch) {
    throw 'Select either single or batch uncapped mode.'
}
if ($AllowUncappedSession -and ($Count -ne 1 -or $Workers -ne 1)) {
    throw 'Single uncapped mode requires -Count 1 -Workers 1.'
}
if ($AllowUncappedBatch -and ($Count -lt 2 -or $Workers -gt 4 -or $Model -eq 'gpt-6-astra')) {
    throw 'Uncapped batch requires -Count 2..80, up to 4 workers, and Sol/Luna model.'
}
$project = Split-Path -Parent $PSScriptRoot
$root = Join-Path $env:TEMP ('deploom-cloud-research-' + [guid]::NewGuid().ToString('N'))
$queue = Join-Path $root 'balanced.json'
$promptedKey = $false

try {
    New-Item -Path $root -ItemType Directory -Force | Out-Null
    Push-Location $project
    try {
        & python 'knowledge-factory/research/combine_batches.py' '--out' $queue
        if ($LASTEXITCODE -ne 0) { throw 'Unable to generate source-exact research queue' }

        if ($Mode -eq 'Run' -and [string]::IsNullOrWhiteSpace($env:OPENAI_API_KEY)) {
            $secure = Read-Host 'OpenAI API key for the local controller (masked; never sent to agent)' -AsSecureString
            $handle = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
            try {
                $env:OPENAI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($handle)
            } finally {
                [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($handle)
            }
            $promptedKey = $true
            if ([string]::IsNullOrWhiteSpace($env:OPENAI_API_KEY)) {
                throw 'API key required for a paid run'
            }
        }

        $total = $Count * 2
        $command = @(
            'knowledge-factory/parallel_batch.py',
            $Mode.ToLowerInvariant(), '--corpus', $queue,
            '--max-sessions', [string]$Count,
            '--workers', [string]$Workers, '--offset', [string]$Offset,
            '--budget-usd', [string]$total, '--reserve-usd', '2',
            '--timeout', [string]($TimeoutMinutes * 60), '--model', $Model
        )
        if ($AllowUncappedSession) {
            Write-Warning 'No API per-session spend limit. $2 reservation is NOT a spending ceiling.'
            $command += '--allow-uncapped-session'
        }
        if ($AllowUncappedBatch) {
            Write-Warning 'UNCAPPED MASS BATCH. Local reservations are NOT billing limits; each session gets a server-side cancel deadline.'
            $command += '--allow-uncapped-batch'
        }
        if ($Mode -eq 'Run') {
            $command += '--execute'
        }
        & python @command
        if ($LASTEXITCODE -ne 0) {
            throw 'One or more agent sessions lack terminal published evidence; inspect .runs receipts, do not rerun blindly'
        }
        if ($Mode -eq 'Run') {
            Write-Output 'Agent receipts are in knowledge-factory/.runs/research-balanced-001/'
            Write-Output 'Session completion is NOT independent migration acceptance.'
        }
    } finally {
        Pop-Location
    }
} finally {
    if ($promptedKey) { Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue }
}
