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
**not** independent migration acceptance. Returned recipes remain DRAFT.

Every task has an immutable 40-character commit SHA. The sandbox has
restricted egress to named GitHub/GitLab/npm/PyPI hosts; restricted
downloads may fail and must be recorded as UNKNOWN, never as PASS. No
GitHub/GitLab token, API key or Ed25519 signing key enters the sandbox.

## Validate safely without tokens

From the repository root, with Python 3.12+:

\`\`\`powershell
python -m unittest discover -s knowledge-factory/tests -v
python knowledge-factory/run_batch.py plan --max-sessions 2 --reserve-usd 2
\`\`\`

## Explicit paid launch

Create an API project/key authorized for api.agents.read,
api.agents.write, and api.responses.write; set an **actual hard
spending limit in OpenAI Platform**. The runner's --budget-usd enforces
only *reserved sessions*, not billing. Usage can be delayed, and
an API disconnection must NOT prompt an automatic paid retry.

\`\`\`powershell
$env:OPENAI_API_KEY = '<set-locally-not-in-repo>'
python knowledge-factory/run_batch.py run --execute --max-sessions 1 --budget-usd 2 --reserve-usd 2
Remove-Item Env:OPENAI_API_KEY
\`\`\`

For a CI-based manual launch, configure OPENAI_API_KEY as an Actions secret,
create a protected knowledge-lab-paid environment and explicitly select
paid_execute=true. PR checks always run offline with no API key.

Receipts (task, commit, model, prompt SHA256, reserved budget, event-stream
digest, session ID if observed and terminal status) are saved under
knowledge-factory/.runs/<batch>/; the runner never stores raw messages or keys.
A reservation is persisted before a paid call; existing receipts are skipped.
Use the workflow artifact for review, then commit **sanitized** reports into
a long-lived evidence branch to survive ephemeral sandbox/CI retention.
No receipt is marked VERIFIED by this runner.

## Still required for production acceptance

- Download immutable /workspace/outputs artifacts and verify exact project
  SHA, command receipts, install/build/test/runtime checks on independent runners.
- Add and pin real GitLab projects after source/licensing verification;
  current GitLab support is in validator/runner, not a claimed live GitLab
  migration result.
- Add a reviewed v2-native admission schema that permits arbitrary npm
  packages without bypassing pinned-source checks.
- Independent held-out Bare-vs-DepLoom A/B, fixed SHA, equal budgets and
  honest snapshotSource + no-matching-record reporting.
- Keep the v1 verified-pages endpoint working until cross-version acceptance.
