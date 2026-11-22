# DepLoom Collective Intelligence — Knowledge Factory

**Development status: opt-in only.** No public release, automatic PR merge,
signed-cache intake, or automatic paid API calls.

The existing [DepLoom Playground](https://github.com/levencode-labs/deploom-playground)
is a **separate repository** from Core/MCP/npm and now hosts this isolated
knowledge-factory subtree. The GitHub connector currently cannot create a new
organization repository, so the subtree may later be extracted to a dedicated
deploom-knowledge-lab repository without breaking task IDs.

## What is executable

The zero-dependency Python runner validates a pinned public GitHub/GitLab
corpus, prepares a deterministic dry-run plan, and (only when --execute
and a key are explicitly supplied) creates OpenAI Agents API sessions.
One separate hosted sandbox per task; each agent performs research, migration,
verification and curation phases sequentially. A finished agent turn is
**not** independent migration acceptance. Returned knowledge cards remain DRAFT.

Every task has an immutable 40-character commit SHA. The sandbox has
restricted egress to named GitHub/GitLab/npm/PyPI hosts; restricted
downloads may fail and must be recorded as UNKNOWN, never as PASS. No
GitHub/GitLab token, API key or Ed25519 signing key enters the sandbox.

## 🚀 Start the first real cloud-agent wave (Windows, no GitHub merge required)

The parallel implementation is in **PR #8's source branch**, which is not
deployed to the default branch. GitHub's manual workflow_dispatch UI is only
available for workflows on the repository's default branch. Therefore the
fastest safe first run uses a **small local PowerShell controller** to launch
**OpenAI-hosted** cloud agents; your local PC only dispatches and reads events.
The agents themselves research in separate OpenAI-managed Linux sandboxes.

On a machine with Python 3.12+ and Git, fetch this feature branch and switch
to it in your existing local checkout (without changing global settings):

```powershell
git fetch origin feat/collective-knowledge-factory
git switch --track origin/feat/collective-knowledge-factory
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\knowledge-factory\start-cloud-research.ps1 -Mode Plan -Count 8 -Workers 4
```

After reviewing the offline plan, **explicitly** launch the first paid pilot:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\knowledge-factory\start-cloud-research.ps1 -Mode Run -Count 8 -Workers 4 -Offset 0
```

The script prompts for a masked OpenAI Platform API key when the environment
does not already contain `OPENAI_API_KEY`. The key stays in the controller
and is never included in any agent sandbox request. **Do not paste it into a
chat, Git repository or action log.** Required project permissions:
`api.agents.read`, `api.agents.write`, `api.responses.write`.

This launch is **eight parallel, pinned public GitHub tasks drawn from eight
dependency ecosystems**, with up to four concurrent sessions and at most two
subagents per session. Each session has an **OpenAI Agents API spend_control
limit of 200 USD cents**, with aggregate launch reservations of $16. This is
**not a guaranteed billing cap**: check actual project usage in OpenAI
Platform, and do not start a large batch until the first wave's outputs and
cost are inspected. The initial `Plan` step costs zero API credits.

Receipts and session IDs are written locally to
`knowledge-factory/.runs/research-balanced-001/`. They have no confidential
raw model output. On an incomplete turn, transport error, missing artifact or
quota error, the dispatcher **stops submitting additional tasks** and retains
the prior receipts. It never retries ambiguous paid calls automatically.

To run the next *nonoverlapping* wave after reviewing the first and configuring
proper source/evaluation separation, use `-Offset 8 -Count 8`; then 16, 24
and so on. A different offset has a different persistent summary, and already
reserved tasks cannot silently be rerun. Before extending to all 80, set up a
genuinely private blind holdout or select **new unseen projects** for later
acceptance. The publicly committed 80-project list is not itself a blind holdout.

The complete hosted task results remain **DRAFT/UNKNOWN** until independently
reproduced against pinned source and negative controls. The signed v2
publisher is never automatically fed results from this run.

## Agents API gateways rejecting the documented spend_control create field

A real paid-controller attempt on 2026-11-22 returned HTTP 400 with
`error.code=unknown_parameter` and `error.param=spend_control`, even though
OpenAI's public Create session reference documents that field. This is an
API/runtime compatibility boundary, **not a migration FAIL**.

The runner first uses the documented atomic capped create+stream protocol.
**Only** on that exact validation error it switches to a staged protocol:

1. Create an idle hosted session **without an initial user message**.
2. Update the session's `spend_control.limit` and require an exact matching
   value in the server's response while the session is still idle.
3. Only then submit an idempotency-keyed research message and poll the
   terminal root turn. Session, turn, cap and any structured failure are
   recorded; the result is still DRAFT until independent source verification.

If the server also rejects the separate cap update, the controller **never
submits the research message** and returns UNKNOWN with the idle session ID
when available. A staged session can provision an environment before the cap
is set; this is **not a guarantee of zero charges**, and reported spending
may be delayed. Never treat the local reservation or session limit as a
prepaid hard cap. For cloud reconciliation check the Platform usage page.
Do not change the code to submit an uncapped research message merely to
work around a 400. Unknown/failed prior tasks are not automatically retried.

Historical receipts remain immutable. To investigate a new, unreserved
task after updating the branch, use an unused `-Offset` value with
`-Count 1 -Workers 1`, then inspect the new receipt rather than starting
a mass batch.

## Explicit single-session experiment WITHOUT `spend_control`

Observed live API behavior: HTTP 400 `unknown_parameter: spend_control`
on both session create **and** session update. The documented spending cap
cannot be applied through this API gateway. Default execution remains
**fail-closed**, retaining the documented capped request and safe staged
fallback; it never silently executes uncapped.

For a user-authorized **single** experiment only, enable the separate
`-AllowUncappedSession` PowerShell switch with `-Count 1 -Workers 1`.
This completely **omits** `spend_control`. It creates an **idle**
session without a user message, durably saves its session ID **before**
submitting input, polls the active turn, and after the deadline sends the
server-side `agent.session.input.cancel` event. Cancellation is only
confirmed when a terminal root-turn status is observed; HTTP 202 alone
does not prove cancellation. There is NO per-session API spending cap.
The displayed $2 is a **local planning reservation only**, not
a spending limit, and actual charges may exceed it. This is a
**wall-clock execution limit**, not an API token/dollar cap. The controller
must stay running with network access to send the cancel event; OS sleep,
a force-killed process, lost internet or a lost session ID can prevent
timely cancellation. A separate server-side watchdog is not yet deployed.
No API-based stop based on tracked consumption is claimed. Use an isolated OpenAI project, configure
a project-level **Enforce a hard limit** if available (enforcement may lag),
and check https://platform.openai.com/usage. Never expose its API key.

From the project root, after `git pull --ff-only`, plan an **unused**
source-exact offset (first never-attempted in this run is 4):
```powershell
.\knowledge-factory\start-cloud-research.ps1 -Mode Plan -Count 1 -Workers 1 -Offset 4 -AllowUncappedSession -TimeoutMinutes 60
```
Only after reviewing the unlimited-spend warning and project controls:
```powershell
.\knowledge-factory\start-cloud-research.ps1 -Mode Run -Count 1 -Workers 1 -Offset 4 -AllowUncappedSession
```
Offsets 0–3 already have immutable local receipts; never overwrite or
automatically retry them. On unexpected HTTP response, transport disconnect,
or incomplete artifacts, stop and reconcile before attempting another offset.
Do not use the uncapped flag for the multi-agent/CI paid workflow.

### Live status in the next PowerShell run

A newly started `-AllowUncappedSession` run now emits redacted progress
to **stderr**, so the final JSON printed on stdout keeps its original schema.
The controller polls the root turn every ~3 seconds and prints a heartbeat
every **15 seconds**, or immediately when the observed status changes.
Each line contains a UTC timestamp, task ID, lifecycle phase, time elapsed,
time remaining before the server-side cancellation deadline, root-turn status
and poll count. It also logs cancellation submission and terminal observation.

Sample (illustrative rather than actual results):

```text
[12:00:00Z][KnowledgeFactory][example-task] input-accepted elapsed=00:03 remaining=59:57 status=unknown polls=0
[12:00:15Z][KnowledgeFactory][example-task] polling elapsed=00:18 remaining=59:42 status=in_progress polls=6
```

No API keys, prompts, raw responses, stack traces or untrusted agent output
are logged. A heartbeat confirms the **controller** is polling, not that
the migration is making progress or what files the agent is reading.
Already-running PowerShell processes cannot load new code from GitHub:
update the checkout before starting another distinct task.

### Cancel a managed agent, including after a controller crash

While Python is active, it attempts server cancellation on timeout, any
uncertain input submission, or an interrupted turn. Receipts checkpoint the
session ID before input. The API's documented cancel endpoint is a POST
to `/v1/agents/sessions/{session_id}/events` containing
`{"events":[{"type":"agent.session.input.cancel"}]}`.
**Never claim the agent is stopped from HTTP 202 alone.**

If PowerShell crashed, restore TUN/network, then inspect the known receipt
(with no new agent creation or replay):
```powershell
python .\knowledge-factory\cancel_session.py .\knowledge-factory\.runs\research-balanced-001\antfu-eslint-config-bb201369.json
```
If it reports an active or uncertain turn, explicitly request server
cancellation and verify the terminal turn:
```powershell
python .\knowledge-factory\cancel_session.py .\knowledge-factory\.runs\research-balanced-001\antfu-eslint-config-bb201369.json --cancel
```
The original immutable receipt is retained; the cancellation action creates
a separate, append-only `*.cancel-recovery-*.json` record. If cancellation
is unconfirmed, do **not** launch more uncapped research until it is
reconciled. A missing/unknown session ID cannot be recovered automatically
without consulting the Platform session list.


## Validate safely without tokens

From the repository root, with Python 3.12+:

```powershell
python -m unittest discover -s knowledge-factory/tests -v
python knowledge-factory/run_batch.py plan --max-sessions 2 --reserve-usd 2
```

## Explicit paid launch

Create an API project/key authorized for api.agents.read,
api.agents.write, and api.responses.write; set a **project spending
limit/alerts in OpenAI Platform**. Each session also receives an explicit
Agents API spend_control.limit (USD cents), independent of the local
reservation ceiling. Reported spending is best-effort, so neither mechanism
should be treated as a guaranteed prepaid billing cap. Usage can be delayed,
and an API disconnection must NOT prompt an automatic paid retry.

```powershell
$env:OPENAI_API_KEY = '<set-locally-not-in-repo>'
python knowledge-factory/run_batch.py run --execute --max-sessions 1 --budget-usd 2 --reserve-usd 2
Remove-Item Env:OPENAI_API_KEY
```

For a CI-based manual launch, configure OPENAI_API_KEY as an Actions secret,
create a protected knowledge-lab-paid environment and explicitly select
paid_execute=true. PR checks always run offline with no API key.

Receipts (task, commit, model, prompt SHA256, reserved budget, event-stream
digest, session ID if observed and terminal status) are saved under
knowledge-factory/.runs/<batch>/; the runner never stores raw messages or keys.
A reservation is persisted before a paid call; existing receipts are skipped.
On a completed root turn the runner looks up two immutable published JSON
artifacts from the same session/turn, checks bounded size and stores their
artifact IDs and SHA-256 digests, **never raw AI evidence in a public build
artifact**. Missing/ambiguous artifacts keep the gate UNKNOWN. Hosted artifacts
are fetched using OpenAI's Artifacts API and never implicitly trusted.
Use the workflow artifact for review, then commit **sanitized** reports into
a long-lived evidence branch to survive ephemeral sandbox/CI retention.
No receipt is marked VERIFIED by this runner.

## Mass cloud research: lower-cost Sol and four concurrent sessions

After the completed source-exact Astra pilot, the next **explicit** batch
can use `gpt-6.2-sol` for code research at roughly one fifth of Astra's
token rates (Sol input/output $2/$10 per million; old `gpt-6-astra`
$10/$50). `gpt-6-luna` ($0.10/$0.50) is available for lightweight discovery
but should not be treated as an independent full migration verifier.
These rates exclude hosted sandbox and tool charges. The actual model's
availability and budget must be checked with the project API key.

An explicit `-AllowUncappedBatch` flag allows **2–80 source-exact tasks,
up to 4 independent concurrent sessions**, with no nested subagents.
Each task has a unique durable reservation/receipt, its own cloud
`sessionId`, an independent time deadline, and API-side turn
cancellation when needed. One uncertain task halts the dispatch of
**further** queued tasks; already-running peers must finish or attempt
server-side cancellation. Offsets containing previous receipts are
rejected before any new paid task. No task gets an API spending limit,
because the observed server rejects `spend_control`; the $2-per-task
local reservation remains **NOT a billing cap**. All proposals remain DRAFT.

From the repo root, on Windows with TUN and `OPENAI_API_KEY` set,
first inspect the source-exact plan (zero credits):

```powershell
.\knowledge-factory\start-cloud-research.ps1 -Mode Plan -Count 16 -Workers 4 -Offset 5 -Model gpt-6.2-sol -TimeoutMinutes 30 -AllowUncappedBatch
```

Then launch the user-authorized **16-task wave**:

```powershell
.\knowledge-factory\start-cloud-research.ps1 -Mode Run -Count 16 -Workers 4 -Offset 5 -Model gpt-6.2-sol -TimeoutMinutes 30 -AllowUncappedBatch
```

The controller prints sanitized 15-second heartbeats with the public task
ID, latest observed status and countdown. This is parallel cloud research,
not continuous background work: **leave Windows, PowerShell and VPN online**.
A terminated controller, loss of internet, or sleeping PC can prevent
server-side cancellation. An independent always-on cloud watchdog has
NOT been deployed. Configure project-level spend enforcement if available,
monitor https://platform.openai.com/usage and the Agents logs, and do not
treat the planned 16 × $2 = $32 reservation as a billing limit.

For a further wave, choose an entirely new offset/count after checking
`.runs` and reconciling UNKNOWNs. If prior sessions failed, do not
automatically retry their source identities. Do not sign or upload agent
proposals until independent positive/negative checks confirm source SHA
and actual dependency migration.

## Verify and download the first completed agent's evidence

After the controller reports `turnOutcome=completed` and
`artifactStatus=complete`, that means the **root turn** and expected
published JSON artifacts are available, **not** that any migration passed.

Use the local controller's exact immutable receipt to retrieve and compare
the provider's source session/turn IDs, names, byte sizes and SHA-256 digests.
This uses **read-only API GETs**, does not create a new paid agent,
and refuses to overwrite previously exported files:

```powershell
python .\knowledge-factory\download_artifacts.py .\knowledge-factory\.runs\research-balanced-001\antfu-eslint-config-bb201369.json
```

Files are saved privately to
`knowledge-factory/.runs/research-balanced-001/downloaded/antfu-eslint-config-bb201369/`:
`migration-report.json`, `commands.json`, and `review-manifest.json`.
Keep these out of public GitHub. The tool checks that both bytes match the
*original* receipt; its `independentVerification=NOT_RUN` is deliberate.
No agent-authored claims are trusted or executed by this download step.

Inspect these files before deciding which exact source checkout,
upgrade/install/build/test and negative controls can be repeated on an
independent runner. Do **not** turn agent completion into verified knowledge
or automatically sign the cache; the signed publisher requires independent
pinned-source fixtures.

## Still required for production acceptance

- Download immutable /workspace/outputs artifacts and verify exact project
  SHA, command receipts, install/build/test/runtime checks on independent runners.
- The corpus contains a **pinned public GitLab.org/GitLab repository** in
  addition to two public GitHub fixtures; no GitLab migration has been run yet.
  Verify checkout/source/license on the first real pilot and keep the result
  NOT_APPLICABLE/UNKNOWN unless a concrete migration is validated.
- Add a reviewed v2-native admission schema that permits arbitrary npm
  packages without bypassing pinned-source checks.
- Independent held-out Bare-vs-DepLoom A/B, fixed SHA, equal budgets and
  honest snapshotSource + no-matching-record reporting.
- Keep the v1 verified-pages endpoint working until cross-version acceptance.

## GitLab Pages signed-byte mirror

`mirror_v2.mjs` reads only the official GitHub Pages v2 index, verifies its
Ed25519 signature against the pinned public key, and copies exactly the
verified immutable shard bytes. It refuses an existing output destination,
rejects damaged shards and accepts a monotonic revision floor via
`DEPLOOM_MIRROR_MIN_REVISION`. No GitLab project, API token, or signing key is
needed for its offline tests:

```sh
node --test knowledge-factory/tests/mirror-v2.test.mjs
```

An example manual GitLab Pages pipeline is in
`knowledge-factory/examples/gitlab-pages.yml`. You must create/configure
a GitLab mirror repository before any deployment. Do not claim GitLab Pages
is live merely because the GitHub CI tests passed.

## Current v2 native publisher boundary

The curated format is implemented in `levencode-labs/deploom-mcp` as
`src/deploom_mcp/knowledge_contract_v2.py`. The signed publisher in
`deploom-npm` accepts only records that cite a verified, pinned first-party
fixture from trusted main with a matching positive claim and negative probes.
The factory may propose breaking changes, codemod descriptions, compatibility
findings, playbooks and failure modes, but **cannot submit user telemetry, open
knowledge PRs automatically, mark a record verified, or sign a snapshot**.
The previous contributor/LLM admission pipeline is intentionally retired.

For a new package, independently reproduce the migration against exact public
npm versions and its negative control. Commit the approved fixture separately,
then curate the knowledge record against that immutable fixture SHA. A major-line
candidate is a hypothesis for the recipient's specific versions, even if a
related exact transition was verified elsewhere.


## Source-exact internet research and the 80-project corpus

The research-only corpus currently contains **80 public GitHub project
snapshots in eight balanced dependency families**, each with an exact commit
SHA and source tree SHA. They were verified against the GitHub API on
2026-11-22, but **none of the 80 are claimed to be successful migrations**.
A previously listed GitLab pilot does not count toward those 80: its
commit/CI evidence must be independently verified before use.

The separate `research/official-guides.json` catalog contains 12
**official** migration references for React, Next.js, Vite, Vitest, ESLint,
Tailwind CSS, Prisma, Zod, Jest, Material UI, TypeScript and NestJS.
Each points to documented breaking-change/codemod hypotheses and explicitly
names negative conditions. Official documentation is research evidence,
not a verified project outcome. No arbitrary installer or upstream codemod
is executed merely because it appears in a guide.

Offline, with no OpenAI API key, generate eight constrained source-exact
Agent task batches (choose a fresh directory; existing output is not
overwritten):

```powershell
python knowledge-factory/research/validate_catalog.py
python -m unittest discover -s knowledge-factory/tests -v
$research = Join-Path $env:TEMP "deploom-research-001"
python knowledge-factory/research/prepare_batches.py --output-dir $research
python knowledge-factory/run_batch.py plan --corpus (Join-Path $research "research-next-react.json") --max-sessions 2 --reserve-usd 2
```

Each task instructs the research agent to inspect the exact pinned tree,
confirm that a documented breaking change or codemod applies, and return
`NOT_APPLICABLE` or `UNKNOWN` instead of manufacturing a migration.
To opt in to a small paid batch, configure the protected GitHub Actions
`knowledge-lab-paid` environment and secret `OPENAI_API_KEY`, then use
**Actions → Knowledge factory contracts → Run workflow** with
`paid_execute=true` and an explicit `lane` and `max_sessions`.
By default that control is off. Per-session API spend limits and local
reservation ceilings are **not guarantees of total billable spend**.

### True blind holdout is separate from this public directory

The same batch preparer supports an optional secret-keyed 64/16 split.
The seed **must** be at least 32 bytes and stored outside the public repo.
The withheld 16 identities and any training manifest revealing their
complement must be kept in an access-controlled private vault outside
GitHub's public PR and job artifact surfaces. The project requires both
a `DEPLOOM_HOLDOUT_SECRET` environment variable and
`--private-holdout <private-absolute-path>`; it rejects private output
inside the repository. Never upload those files as CI artifacts.

CI uses only a synthetic test secret and does **not** create a true blind
holdout. Real evaluation needs separately frozen labels, a private vault
and independent test execution before any cache-hit-rate claim.

### Knowledge lookup in MCP/Skill

The stacked [MCP P3 PR #40](https://github.com/levencode-labs/deploom-mcp/pull/40)
adds a bounded local `get_shared_migration_knowledge_batch` tool and
Skill 2.0.32. It is called after a real plan has established exact,
host-authorized public version transitions and before applying edits.
The tool reads only previously signed local shards, never uploads
project package names, and labels its results `ADVISORY_ONLY`.
A major-line hit is a candidate, not project verification.
