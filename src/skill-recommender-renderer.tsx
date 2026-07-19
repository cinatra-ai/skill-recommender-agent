"use client";

// HITL field renderer for @cinatra-ai/skill-recommender-agent, binding
// `@cinatra-ai/skill-recommender-agent:recommend` (kind "skill-recommend").
// Relocated OUT of the host (packages/agents/src/skill-recommender-agent-renderers.tsx)
// into its claiming extension per cinatra#1625 (epic #1620 S8 — M3). The host
// resolves this module through the generated field-renderer component map keyed
// by the binding id; a degraded/absent module falls back to the host's
// SchemaFieldRenderer floor.
//
// ACTION-BOUNDARY RESTRUCTURE (owner ruling 2026-07-18; enablement #1794):
// the in-core renderer fetched the drafting agent's assigned skills at mount via
// the authenticated host action `getSkillsForAgentAction`. The public
// field-renderer props contract is a pure `snapshot → onChange` surface and
// CANNOT reach an authenticated host action. So the authenticated data-gathering
// moved into the agent's OWN workflow: a deterministic pre-interrupt prep node
// (`prep_skills`) invokes the run-bound skills primitive
// `skills_installed_resolve_for_agent` through the `/api/agents/passthrough`
// seam and wires the resolved skills into the gate payload via a DataFlowEdge.
// This renderer is now pure DISPLAY over that gathered snapshot — it reads the
// skills off `value` and never calls a host action.
//
// A source mirror the host builds into its own graph: props type comes from the
// public `@cinatra-ai/sdk-ui/field-renderer-props` contract (an agent extension
// may import only @cinatra-ai/sdk-extensions + @cinatra-ai/sdk-ui as first-party
// code); the shadcn primitives are VENDORED (own-your-code copies under
// ./components/ui), not imported from the host `@/` alias.

import { useCallback, useMemo, useRef, useState } from "react";

import type { FieldRendererProps } from "@cinatra-ai/sdk-ui/field-renderer-props";

import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";

// ---------------------------------------------------------------------------
// Snapshot shape
// ---------------------------------------------------------------------------
// The prep node's `skills_installed_resolve_for_agent` call returns
// `{ skillIds: string[] }`, wired into the gate as `value.skillIds`. The
// renderer ALSO tolerates a richer `value.skills` array of `{ id, name,
// description }` objects, so a future host enrichment (or an alternate prep
// primitive) that carries display metadata renders without a renderer change.
// Either source degrades to an empty list with a functional Continue — the gate
// stays advanceable (pinned by test), mirroring the in-core degrade contract.

type SkillChip = {
  id: string;
  name: string;
  description?: string;
};

function labelFromId(id: string): string {
  // "@cinatra-ai/email-drafting-agent:tone-guide" -> "tone-guide"
  // "some/path:name" -> "name"; bare "name" -> "name".
  const afterColon = id.includes(":") ? id.slice(id.lastIndexOf(":") + 1) : id;
  const leaf = afterColon.includes("/")
    ? afterColon.slice(afterColon.lastIndexOf("/") + 1)
    : afterColon;
  return leaf.trim() || id;
}

function toSkillChips(value: unknown): SkillChip[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const v = value as Record<string, unknown>;

  // Preferred: an already-shaped object array under `skills`.
  if (Array.isArray(v.skills)) {
    return v.skills
      .map((entry): SkillChip | null => {
        if (typeof entry === "string") {
          return { id: entry, name: labelFromId(entry) };
        }
        if (entry && typeof entry === "object" && !Array.isArray(entry)) {
          const e = entry as Record<string, unknown>;
          const id = typeof e.id === "string" ? e.id : "";
          if (!id) return null;
          const name =
            typeof e.name === "string" && e.name.trim() !== ""
              ? e.name
              : labelFromId(id);
          const description =
            typeof e.description === "string" ? e.description : undefined;
          return { id, name, description };
        }
        return null;
      })
      .filter((s): s is SkillChip => s !== null);
  }

  // Fallback: the primitive's native `skillIds` string array.
  if (Array.isArray(v.skillIds)) {
    return v.skillIds
      .filter((id): id is string => typeof id === "string" && id.trim() !== "")
      .map((id) => ({ id, name: labelFromId(id) }));
  }

  return [];
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export function SkillRecommenderRenderer({
  value,
  onChange,
  disabled,
}: FieldRendererProps) {
  const skills = useMemo(() => toSkillChips(value), [value]);
  const [submitting, setSubmitting] = useState(false);

  // Stable onChange ref (mirrors the precedent renderers' pattern): `value`
  // is a fresh inline-literal object on every polling render tick, so a
  // captured `onChange` closure is refreshed each render without re-binding
  // the callback.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Terminal-action LATCH: Continue advances the interrupt exactly once.
  // `onChange` is synchronous, so a `submitting` state flipped true→false in a
  // finally would neither show the pending label nor block a double-click. A
  // ref latch makes the second click a no-op (idempotent submit) and the
  // `submitting` state stays set until the gate advances and unmounts us.
  const submittedRef = useRef(false);

  const handleContinue = useCallback(() => {
    if (submittedRef.current || disabled === true) return;
    submittedRef.current = true;
    setSubmitting(true);
    onChangeRef.current({ confirmed: true });
  }, [disabled]);

  return (
    <Card className="border-line bg-surface backdrop-blur-none">
      <CardHeader>
        <CardTitle>Skills for email drafting</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          These skills will guide the drafting step. Review them before
          continuing.
        </p>

        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge
                key={skill.id}
                variant="outline"
                title={skill.description ?? skill.id}
              >
                {skill.name}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No skills are currently assigned to the drafting step.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button
          type="button"
          onClick={handleContinue}
          disabled={submitting || disabled === true}
        >
          {submitting ? "Continuing…" : "Continue"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default SkillRecommenderRenderer;
