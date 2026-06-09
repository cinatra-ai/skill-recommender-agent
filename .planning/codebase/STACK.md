# Technology Stack

**Analysis Date:** 2026-06-09

## Languages

**Primary:**
- JSON — agent flow definition in `cinatra/oas.json` (agentspec v26.1.0)
- JavaScript (ES modules, Node.js) — CI gate script `extension-kind-gate.mjs`

**Secondary:**
- TypeScript — `tsconfig.json` present, configured for `src/` (no `src/` directory tracked in this source mirror; typechecking runs in the cinatra monorepo)

## Runtime

**Environment:**
- Node.js 24 (specified in `.github/workflows/ci.yml` via `actions/setup-node@v4`)

**Package Manager:**
- pnpm (via corepack) — `corepack enable` + `corepack pnpm` in CI
- Lockfile: not committed (CI runs `--no-frozen-lockfile` for standalone repos; this repo is a source mirror so install is skipped in standalone CI)

## Frameworks

**Core:**
- Cinatra Agent Platform — agentspec version `26.1.0`; flow defined in `cinatra/oas.json`

**Testing:**
- Not applicable — no test files tracked; this is a source mirror; tests run in the cinatra monorepo

**Build/Dev:**
- `extension-kind-gate.mjs` — zero-dependency CI gate (Node builtins only); validates `cinatra/oas.json` for banned CRM primitives

## Key Dependencies

**Critical:**
- `@cinatra-ai/skill-recommender-agent` (self, v0.1.0) — package name in `package.json`
- No `dependencies`, `devDependencies`, or `optionalDependencies` declared in `package.json`
- Cinatra monorepo provides all `@cinatra-ai/*` host-internal packages as optional peers (none declared in this repo)

**Infrastructure:**
- `npm pack --dry-run` — used in CI to validate package publish shape

## Configuration

**Environment:**
- No `.env` files detected
- `.npmrc` present — contains `auto-install-peers=false`

**Build:**
- `tsconfig.json` — targets ES2023, ESNext modules, `bundler` module resolution, JSX react-jsx, strict mode, outputs to `dist/`, roots at `src/`
- `cinatra/oas.json` — authoritative agent flow spec consumed by the Cinatra Marketplace

## Platform Requirements

**Development:**
- Node.js 24+
- pnpm via corepack
- Cinatra monorepo workspace (for host-internal `@cinatra-ai/*` peer resolution, typechecking, and tests)

**Production:**
- Cinatra Marketplace — published via GitHub Release + reusable workflow `cinatra-ai/.github/.github/workflows/reusable-extension-release.yml@main`
- Registry: `registry.cinatra.ai` (marketplace promotion saga)

---

*Stack analysis: 2026-06-09*
