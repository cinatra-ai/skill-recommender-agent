# External Integrations

**Analysis Date:** 2026-06-09

## APIs & External Services

**Cinatra Agent Platform:**
- Cinatra AI — this package is a Cinatra agent extension consumed by the Cinatra platform at runtime
  - Spec file: `cinatra/oas.json` (agentspec v26.1.0, component_type: Flow)
  - Flow ID: `skill-recommender-flow`
  - The flow exposes a human-in-the-loop (HITL) screen registered as `@cinatra-ai/skill-recommender-agent:recommend`
  - The `recommend_gate` node uses renderer `@cinatra-ai/skill-recommender-agent:recommend` and surface ID `skill-recommender:recommend-gate:input`
  - Auth: platform-internal (no external API key; auth is managed by the Cinatra monorepo runtime)

**Cinatra Marketplace:**
- Publish target: `registry.cinatra.ai`
  - Submission flow: GitHub Release → `extension-submit-for-review` → approve → promotion saga → registry
  - Reusable workflow: `cinatra-ai/.github/.github/workflows/reusable-extension-release.yml@main`
  - Auth: `CINATRA_MARKETPLACE_VENDOR_TOKEN` (org secret, inherited by `release.yml`)

## Data Storage

**Databases:**
- Not applicable — this agent extension holds no persistent state; state is managed by the Cinatra platform runtime

**File Storage:**
- Not applicable

**Caching:**
- Not applicable

## Authentication & Identity

**Auth Provider:**
- Platform-managed — the `recommend_gate` node is marked `riskClass: read_only` and `requiresApproval: true`; approval is gated by the Cinatra platform's HITL mechanism, not a standalone auth integration
- No external identity provider SDK present in this repo

## Monitoring & Observability

**Error Tracking:**
- Not detected — no error tracking SDK or configuration present

**Logs:**
- CI gate (`extension-kind-gate.mjs`) writes to stdout/stderr using `console.error`; no structured logging integration

## CI/CD & Deployment

**Hosting:**
- Cinatra Marketplace (`registry.cinatra.ai`)

**CI Pipeline:**
- GitHub Actions
  - `ci.yml` — runs on push/PR to `main`; classifies repo, validates dependency shape, runs pack dry-run, and executes `extension-kind-gate.mjs` for OAS validation
  - `release.yml` — triggered on GitHub Release publish or manual `workflow_dispatch`; delegates to centralized reusable release workflow
- Node.js version: 24 (pinned in both workflows via `actions/setup-node@v4`)

## Environment Configuration

**Required env vars:**
- `CINATRA_MARKETPLACE_VENDOR_TOKEN` — org-level GitHub secret; required only for the release workflow; not needed for development or CI

**Secrets location:**
- GitHub Actions org secrets (not stored in repo files)
- No `.env` file present in the repository

## Webhooks & Callbacks

**Incoming:**
- Not applicable — the agent flow is invoked by the Cinatra platform runtime, not via webhooks

**Outgoing:**
- Not applicable

---

*Integration audit: 2026-06-09*
