<!-- refreshed: 2026-06-09 -->
# Architecture

**Analysis Date:** 2026-06-09

## System Overview

```text
┌──────────────────────────────────────────────────────────────┐
│               Cinatra Platform (host monorepo)               │
│   Invokes the agent flow before any drafting step begins     │
└──────────────────────────┬───────────────────────────────────┘
                           │  cinatra_run_id (input)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                  Skill Recommender Agent                     │
│              (agentspec Flow — cinatra/oas.json)             │
│                                                              │
│   StartNode  ──►  InputMessageNode (recommend_gate)  ──►  EndNode
│   "Inputs"         "Review skills" (HITL)             "End"  │
│                    renderer: :recommend                       │
│                    requiresApproval: true                     │
│                    output: confirmed (string)                 │
└──────────────────────────────────────────────────────────────┘
                           │  confirmed (output)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│           Downstream drafting step in host workflow          │
└──────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| OAS flow definition | Declarative agent spec — nodes, edges, I/O schema | `cinatra/oas.json` |
| StartNode (`start`) | Accepts `cinatra_run_id`; hidden from user UI | `cinatra/oas.json` (`$referenced_components.start`) |
| InputMessageNode (`recommend_gate`) | HITL checkpoint — renders skill review UI, collects user confirmation | `cinatra/oas.json` (`$referenced_components.recommend_gate`) |
| EndNode (`end`) | Emits the `confirmed` output string to the caller | `cinatra/oas.json` (`$referenced_components.end`) |
| Extension-kind gate | CI pre-publish sanity validator for agent and workflow extensions | `extension-kind-gate.mjs` |

## Pattern Overview

**Overall:** Content-only Cinatra agent extension — no TypeScript/JavaScript runtime of its own. The entire agent behaviour is declared as a data-flow graph in the OAS JSON spec (`cinatra/oas.json`) and evaluated by the Cinatra platform at runtime.

**Key Characteristics:**
- Zero custom runtime code — all logic is expressed declaratively in `cinatra/oas.json`
- Single Human-In-The-Loop (HITL) step (`recommend_gate`) gated with `requiresApproval: true`
- Output is a single boolean (`confirmed`) serialised as a string for downstream consumption
- Renderer (`@cinatra-ai/skill-recommender-agent:recommend`) is a HITL screen served by the platform; it is referenced by ID, not shipped as code in this repo
- No external dependencies — `package.json` declares `cinatra.dependencies: []`

## Layers

**Agent Spec (declaration layer):**
- Purpose: Defines the complete flow graph — nodes, control-flow edges, data-flow edges, I/O schemas, and UI renderer references
- Location: `cinatra/oas.json`
- Contains: `agentspec_version`, `component_type: Flow`, node definitions, edge wiring
- Depends on: Cinatra platform runtime (host monorepo) to execute
- Used by: Any host workflow that embeds this agent as a pre-draft step

**CI Gate (validation layer):**
- Purpose: Self-contained pre-publish sanity check run in standalone CI without registry access
- Location: `extension-kind-gate.mjs`
- Contains: OAS JSON parse + retired-CRM-primitive scan (for `agent` kind); BPMN well-formedness + package shape check (for `workflow` kind)
- Depends on: Node.js builtins only (`fs`, `path`) — intentionally zero npm dependencies
- Used by: `.github/workflows/ci.yml` (`kind-gates` job)

## Data Flow

### Primary Agent Execution Path

1. Host workflow invokes agent with `cinatra_run_id` → `StartNode` (`cinatra/oas.json` node `start`)
2. Control passes to `InputMessageNode` (`recommend_gate`) — platform renders the `:recommend` HITL screen
3. User reviews/adjusts skills and clicks confirm → node emits `confirmed` output
4. `DataFlowEdge` (`recommend_gate_to_end_confirmed`) carries `confirmed` → `EndNode`
5. `EndNode` returns `confirmed` to the calling host workflow

### CI Validation Path

1. `ci.yml` `build` job: checkout → Node 24 → classify repo (first-party vs standalone) → pack dry-run
2. `ci.yml` `kind-gates` job (needs `build`): runs `node extension-kind-gate.mjs --package-root .`
3. `extension-kind-gate.mjs` reads `package.json` → detects `cinatra.kind: "agent"` → calls `validateAgent()`
4. `validateAgent()` reads and parses `cinatra/oas.json` → walks all LLM-visible string fields → checks for banned CRM primitives
5. Exit 0 (pass) or exit 1 (violations printed to stderr)

**State Management:**
- No in-process state. The flow is stateless; all state (run ID, confirmed value) is carried via the Cinatra platform's execution context.

## Key Abstractions

**OAS Flow Graph:**
- Purpose: Declarative representation of agent behaviour as a directed graph
- Examples: `cinatra/oas.json`
- Pattern: Nodes typed as `StartNode`, `InputMessageNode`, `EndNode`; edges typed as `ControlFlowEdge` / `DataFlowEdge`

**HITL InputMessageNode:**
- Purpose: Pauses execution for explicit human approval; renders a named UI screen
- Examples: `recommend_gate` node in `cinatra/oas.json`
- Pattern: `requiresApproval: true`, `renderer: "<package>:<screen-id>"`, `inputMessageSchema` defines the JSON form the user submits

**Extension-kind gate exports:**
- Purpose: Pure validation functions importable by tests or other tooling
- Examples: `extension-kind-gate.mjs` exports `parseArgs`, `validateAgent`, `validateWorkflow`, `validateWorkflowPackageShape`, `validateBpmnSanity`, `findWorkflowSidecars`, `runGate`
- Pattern: All validators are pure (string/object in → `string[]` errors out); side effects (file I/O) are in `validateAgent` / `validateWorkflow` wrappers and the `main()` CLI entrypoint

## Entry Points

**Agent runtime entry:**
- Location: `cinatra/oas.json` (`start_node.$component_ref: "start"`)
- Triggers: Cinatra platform invokes the flow with `cinatra_run_id`
- Responsibilities: Route execution through the HITL gate and return `confirmed`

**CI gate CLI entry:**
- Location: `extension-kind-gate.mjs` (`main()` function, invoked when `process.argv[1]` matches the module URL)
- Triggers: `node extension-kind-gate.mjs --package-root .` in `.github/workflows/ci.yml`
- Responsibilities: Parse args, dispatch to kind-specific validator, exit 0/1

## Architectural Constraints

- **No runtime code:** This repo ships no executable TypeScript/JavaScript for the agent itself. All agent logic lives in the declarative OAS spec.
- **Zero-dependency gate:** `extension-kind-gate.mjs` uses only Node.js builtins. Adding any npm dependency to this file would break standalone CI (no registry access before auth).
- **Global state:** None. `extension-kind-gate.mjs` is fully pure outside `main()`.
- **Circular imports:** Not applicable — single module file.
- **First-party peers:** Any `@cinatra-ai/*` packages MUST be optional `peerDependencies` (not `dependencies`/`devDependencies`); enforced by CI classification step.

## Anti-Patterns

### Inline workflow definition

**What happens:** Placing the agent/workflow definition inline in `package.json` under `cinatra.workflow`
**Why it's wrong:** The platform requires a sidecar file (`cinatra/oas.json` for agents, `cinatra/workflow.bpmn` for workflows); inline definitions are explicitly forbidden and fail the gate
**Do this instead:** Keep all flow definition in `cinatra/oas.json`

### Adding npm dependencies to extension-kind-gate.mjs

**What happens:** Importing an npm package inside `extension-kind-gate.mjs`
**Why it's wrong:** The gate runs in standalone CI before any registry is reachable; an npm dependency will cause a resolution failure and close the gate on every PR
**Do this instead:** Use only `node:fs`, `node:path`, and other Node.js builtins

### Using retired CRM primitives in OAS prompt strings

**What happens:** Referencing `contacts_list`, `accounts_get`, legacy entity typeHints, etc. in `system`/`user`/`description` fields of `cinatra/oas.json`
**Why it's wrong:** These are banned by the monorepo audit gate (`oas-banned-primitives-gate.mjs`) and will fail CI
**Do this instead:** Route CRM operations through the `crm_*` facade primitives

## Error Handling

**Strategy:** Validation-only (no runtime error handling in this repo). The gate collects all errors as `string[]` and prints them in bulk before exiting 1.

**Patterns:**
- `validateAgent` / `validateWorkflow` return `string[]` — empty array = pass, non-empty = fail
- All file-read errors are caught and pushed as error strings rather than thrown, ensuring the gate always exits cleanly

## Cross-Cutting Concerns

**Logging:** `console.log` (pass) / `console.error` (failures) in `extension-kind-gate.mjs` `main()` only
**Validation:** Centralised in `extension-kind-gate.mjs`; pure functions, no shared mutable state
**Authentication:** Not applicable — agent has no auth of its own; platform-level auth is handled by the host

---

*Architecture analysis: 2026-06-09*
