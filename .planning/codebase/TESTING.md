# Testing Patterns

**Analysis Date:** 2026-06-09

## Repository Nature

This is a content-only Cinatra agent extension with no `src/` TypeScript tree and no dedicated test files. The sole testable logic is in `extension-kind-gate.mjs` — a self-contained, zero-dependency Node.js script. No test framework is installed or configured.

## Test Framework

**Runner:**
- Not detected — no `jest.config.*`, `vitest.config.*`, `mocha.*`, or equivalent config present
- `package.json` has no `scripts.test` entry and no test-framework devDependencies

**Run Commands:**
```bash
corepack pnpm test --if-present   # CI command — exits 0 when no test script is present
```

## Test File Organization

**Location:**
- No test files detected in the repository

**Naming:**
- Not applicable

## CI Test Behavior

The GitHub Actions CI workflow (`.github/workflows/ci.yml`) runs `corepack pnpm test --if-present` in the `build` job. Because this repo declares no host-internal `@cinatra-ai/*` peers (`first_party=0`), the test step IS executed — but since no `test` script exists in `package.json`, `--if-present` causes it to exit 0 silently.

The effective quality gate for this repo is the **kind-gate** job in CI, not a unit test suite:

```bash
node extension-kind-gate.mjs --package-root .
```

This validates `cinatra/oas.json` for retired CRM primitive references in LLM-visible fields (`system`, `user`, `description`). It is a pure static-analysis pass, not a behavioral test.

## What the Gate Tests (Functional Scope)

The gate script (`extension-kind-gate.mjs`) exports pure functions that ARE individually testable without a framework:

| Function | Tested by gate run | Scope |
|---|---|---|
| `parseArgs` | Indirectly (CLI args) | Argument parsing |
| `validateAgent` | Yes | OAS JSON parse + banned primitive scan |
| `walkLlmStrings` | Yes (via validateAgent) | Recursive OAS field walker |
| `scanOasString` | Yes (via validateAgent) | Regex + string match for banned tokens |
| `validateWorkflowPackageShape` | Not exercised (kind=agent) | package.json shape rules |
| `validateBpmnSanity` | Not exercised (kind=agent) | BPMN XML well-formedness |
| `findWorkflowSidecars` | Not exercised (kind=agent) | Filesystem walk for .bpmn files |
| `runGate` | Yes (called by main) | Dispatch by kind |

## Mocking

**Framework:** Not applicable
**Patterns:** Not applicable — gate functions are pure (string in → string[] out) and require no mocking for unit testing

## Fixtures and Factories

**Test Data:**
- Not detected — no fixtures directory or factory functions

## Coverage

**Requirements:** None enforced
**View Coverage:** Not applicable

## Test Types

**Unit Tests:** Not present — all exported functions in `extension-kind-gate.mjs` are pure and could be unit-tested without a framework using Node's built-in `assert` module, but no tests are written.

**Integration Tests:** Not present

**E2E Tests:** Not present

## Adding Tests (Guidance)

If tests are added to this repo, the zero-dependency constraint means the test runner must also be zero-dependency or resolved without `@cinatra-ai/*` peers. Recommended approach:

```bash
# Run gate against a fixture directory using only Node builtins
node -e "
  import('./extension-kind-gate.mjs').then(({ validateAgent }) => {
    const errors = validateAgent('./test-fixtures/valid-agent');
    console.assert(errors.length === 0, 'Expected no errors');
  });
"
```

A `scripts.test` entry in `package.json` pointing to a Node-native test runner (e.g., `node --test`) would be picked up automatically by the existing CI `pnpm test --if-present` step with no CI changes required.

---

*Testing analysis: 2026-06-09*
