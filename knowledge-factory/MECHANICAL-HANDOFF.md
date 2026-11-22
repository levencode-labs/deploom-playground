# Knowledge Factory — mechanical Windows operator handoff

> **Read-only reconciliation FIRST. No raw API keys, agent outputs or local files
> in public GitHub. No edits to the Python product code in this handoff.**
>
> Code owner maintains `feat/collective-knowledge-factory` / draft PR #8.
> Operator coordinates the original Windows host and its local `.runs`
> evidence, not a fresh empty cloud checkout.

## Requirements

- Exact checkout: `C:\Users\levenskikh\Desktop\Knowledge\deploom-knowledge-lab`.
- Python 3.12+ and native Windows PowerShell 5.1.
- Do not touch system proxy/VPN, credentials, global Git configuration.
- The original Windows `OPENAI_API_KEY` is a secret: NEVER print, copy, upload
  or give it to a model. The local controller reads it directly.
- Confirm no stale `parallel_batch.py`, `resume_batch.py` or other
  Knowledge Factory controllers are still active.
- The user must explicitly authorize each new billable wave. Do not guess
  available grants or assert that $2 reservations are hard caps.

## Stage A — inventory and recovery (ZERO paid agent sessions)

1. Check git status, exact draft PR HEAD and latest CI on GitHub. If the local
   worktree has modifications, do not reset, discard or overwrite them.
2. Preserve a private copy of the original `knowledge-factory/.runs/`
   directory before changing anything. No cleanup by deletion.
3. `git fetch origin feat/collective-knowledge-factory`, and use
   `git pull --ff-only origin feat/collective-knowledge-factory` only if
   existing local state permits a safe fast-forward.
4. From repo root, with a unique temp filename:
   ```powershell
   $corpus = Join-Path $env:TEMP ("deploom-reconcile-" + [guid]::NewGuid().ToString('N') + ".json")
   python .\knowledge-factory\research\combine_batches.py --out $corpus
   python .\knowledge-factory\reconcile_batch.py --corpus $corpus --summary-only
   python .\knowledge-factory\reconcile_batch.py --corpus $corpus --online --write --recover-terminal --summary-only
   ```
5. Compare all **80 original source-exact tasks** against historic receipts,
   recovered sidecars and provider GET status; classify completed/failed/
   cancelled/unknown/not-launched. If any session is still active, report it
   without sending new paid input; do not cancel except on explicit instruction.
6. For previously interrupted *completed* sessions, verify terminal root turns
   and both artifact hashes, create append-only `.runs/recovered/*.json`
   sidecars and privately download with
   `knowledge-factory/download_artifacts.py`. Keep existing receipts intact.
   Recovered `UNKNOWN` remains independent migration verification `NOT_RUN`.

## Stage B — small, explicitly authorized paid waves

Default: **six never-launched tasks, two parallel Luna agents**, 30-minute
per-agent deadline with server-side cancellation and terminal confirmation.

Read-only plan (zero API credits):
```powershell
.\knowledge-factory\start-cloud-resume.ps1 -Mode Plan -Count 6 -Workers 2 -Model gpt-6-luna -TimeoutMinutes 30
```

Run **only when the user approves** the presented exact task IDs:
```powershell
.\knowledge-factory\start-cloud-resume.ps1 -Mode Run -Count 6 -Workers 2 -Model gpt-6-luna -TimeoutMinutes 30 -ConfirmPaid
```

For each wave: preserve complete/failed/cancelled/unknown counts and receipts,
reconcile any UNKNOWN before another paid wave; never retry old tasks,
even on rate limits, unless expressly scoped as a distinct experiment.
A `FAILED_TERMINAL` root turn does not block other queued tasks. UNKNOWN,
missing artifacts and unconfirmed cancellation block new submissions.
Always re-plan based on original corpus after the last wave, no manual offsets.
No blind looping on failure. If the user requested a maximum cost or total
number of waves, stop at that boundary; report actual usage separately.

### Crash / Ctrl+C

The scheduler checkpoints terminal turns before downloading artifacts, writes
partial summary and drains workers on an interrupt. If the local process
is force-terminated, do not assume cloud cancellation; use saved session ID
and `cancel_session.py` for a read-only status check. A cancellation API 202
is not proof that the root turn stopped.

## Stage C — mechanical evidence and reporting

- Produce a sanitized report of 80 tasks: exact SHA, local status, server
  terminal status, artifact status, model, number of agent sessions.
- Download both JSON artifacts for each completed source-exact turn, verifying
  provider metadata and SHA-256 against the receipt. Store privately, not in
  public CI or GitHub.
- Report verified *agent artifacts* separately from **verified migration
  knowledge cards**; the latter remain zero until independent fixture CI.
- Append a short, sanitized progress note to GitHub issue #9 if authorized.
  Do not edit Core/MCP/npm or PR #8 code, merge, release, deploy, or publish
  the signed v2 knowledge snapshot.
- If reconciliation detects a code defect, preserve red evidence, report the
  failing SHA/test/reproduction to the code owner; no workaround that
  reduces the acceptance matrix.
