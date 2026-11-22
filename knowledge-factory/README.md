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
