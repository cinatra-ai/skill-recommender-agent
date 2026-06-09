# Coding Conventions

**Analysis Date:** 2026-06-09

## Repository Nature

This is a content-only Cinatra agent extension. It ships no TypeScript `src/` tree — the implementation is a declarative `cinatra/oas.json` OAS spec plus a self-contained JavaScript gate script (`extension-kind-gate.mjs`). Conventions below apply to those two artifacts.

## Naming Patterns

**Files:**
- `extension-kind-gate.mjs` — kebab-case, `.mjs` suffix for zero-dependency ES-module scripts
- `cinatra/oas.json` — lowercase, matches the Cinatra sidecar convention (`cinatra/<artifact>`)
- `package.json`, `tsconfig.json`, `README.md` — standard tool-convention names

**Functions (in `extension-kind-gate.mjs`):**
- `camelCase` for all exported and internal functions: `parseArgs`, `validateAgent`, `validateWorkflow`, `validateBpmnSanity`, `runGate`, `walkLlmStrings`, `scanOasString`, `findWorkflowSidecars`, `wordBoundary`
- `UPPER_SNAKE_CASE` for module-level constants: `LLM_VISIBLE_FIELDS`, `BANNED_PRIMITIVES`, `BANNED_TYPEHINTS`, `PRIMITIVE_PATTERNS`, `OBJECTS_LIST_CRM_RE`, `BPMN_MODEL_NS`, `WORKFLOW_PACKAGE_NAME_RE`

**Variables:**
- `camelCase` for locals: `packageRoot`, `findings`, `oasPath`, `openTags`
- Single-letter loop vars accepted for tight loops (`m`, `nm`, `k`, `e`)

**OAS spec identifiers:**
- `snake_case` for OAS node ids and field names: `skill-recommender-flow`, `start_to_recommend_gate`, `cinatra_run_id`
- Hyphenated for component/package names: `@cinatra-ai/skill-recommender-agent`

## Code Style

**Formatting:**
- No Prettier or ESLint config file present. Code in `extension-kind-gate.mjs` is consistently formatted: 2-space indentation, double-quoted strings, trailing commas in multi-line arrays/objects.

**Linting:**
- Not detected (no `.eslintrc*`, `biome.json`, or similar config)

**Module system:**
- `"type": "module"` in `package.json` — all scripts are native ES modules using `import`/`export`
- Only Node.js built-ins imported: `node:fs`, `node:path`

**TypeScript config (for any future `src/`):**
- `strict: true`, `noImplicitAny: false` (strict mode with implicit-any relaxed)
- `verbatimModuleSyntax: true` — type-only imports must use `import type`
- `isolatedModules: true` — each file must be independently compilable
- Target: `ES2023`, module: `ESNext`, moduleResolution: `bundler`

## Import Organization

**Order (observed in `extension-kind-gate.mjs`):**
1. Node built-in imports (`node:fs`, `node:path`) — grouped together at top
2. No third-party or internal imports (zero-dependency design requirement)

**Path Aliases:**
- None — zero-dependency constraint prohibits package resolution

## Error Handling

**Patterns in `extension-kind-gate.mjs`:**
- Functions return `string[]` errors (pure, no throws for validation logic): `validateAgent`, `validateBpmnSanity`, `validateWorkflowPackageShape`, `validateWorkflow`
- File I/O wrapped in `try/catch`, errors pushed into the errors array with descriptive messages including the caught `err.message`
- `instanceof Error` guard used before accessing `.message`: `err instanceof Error ? err.message : String(err)`
- `main()` wrapped in a top-level `try/catch` that prints unexpected errors and exits with code 1
- Exit codes: `0` = pass, `1` = violations found, `2` = dependency-shape regression (used in CI shell script)

## Comments

**When to Comment:**
- Header block at top of `extension-kind-gate.mjs` explains scope, design constraints, and usage (multi-line comment block)
- Section dividers use `// ---...---` banners with a label
- Inline comments explain non-obvious decisions (e.g., why `npx` is used instead of `pnpm dlx`, why OAS is optional at the gate)

**JSDoc/TSDoc:**
- JSDoc-style block comments on all exported functions: `/** ... */` with prose explanation of behavior, inputs, and return semantics. No `@param`/`@returns` tags — prose only.

## Function Design

**Size:** Functions are focused and single-purpose. `walkLlmStrings` is a recursive tree walker; `scanOasString` handles pattern matching; `validateAgent` composes them.

**Parameters:** Primitive types preferred (`string`, `string[]`). No options-objects pattern detected.

**Return Values:** Validation functions return `string[]` (empty = pass). Gate runner returns `{ kind, errors }` object.

## Module Design

**Exports:**
- All gate logic exported as named exports for testability: `parseArgs`, `validateAgent`, `validateWorkflow`, `validateBpmnSanity`, `validateWorkflowPackageShape`, `findWorkflowSidecars`, `runGate`
- `main()` is NOT exported — invoked only when the script is run directly (guarded by `invokedDirectly` check)

**Barrel Files:** Not applicable — single script file.

## OAS Spec Conventions (`cinatra/oas.json`)

- `agentspec_version` field declares the Cinatra spec version
- `component_type: "Flow"` for top-level agent flows
- Node references use `{ "$component_ref": "<id>" }` pattern
- Inputs/outputs typed as `"type": "string"` with optional `"default"`
- Metadata under `metadata.cinatra` carries runtime hints (hitlScreens, packageName, packageVersion)

---

*Convention analysis: 2026-06-09*
