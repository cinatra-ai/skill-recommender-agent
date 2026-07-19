// @vitest-environment jsdom
/**
 * Vitest coverage for SkillRecommenderRenderer (relocated into the claiming
 * extension, cinatra#1625 S8/M3). Component-only assertions — the
 * binding-resolution / G2 cutover parity is proved host-side (the
 * field-renderer component-map + fallback suites). Skipped in this repo's
 * standalone CI (first-party @cinatra-ai/* optional peers); the monorepo runs it.
 *
 * Asserts the pure snapshot → onChange contract of the action-boundary
 * restructure (cinatra#1625, enablement #1794):
 *   - Renders one chip per resolved skill from `value.skillIds` (the
 *     `skills_installed_resolve_for_agent` native shape), with an id-derived
 *     label.
 *   - Renders richer chips from a `value.skills` object array (name/description),
 *     the forward-compatible enriched shape.
 *   - Continue emits onChange({ confirmed: true }) exactly once.
 *   - An empty/degraded snapshot still renders an advanceable Continue (the gate
 *     never dead-ends) and the empty-state copy.
 *   - The renderer NEVER performs data-fetching on mount (no host action) — a
 *     bare snapshot renders synchronously.
 */
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import type { FieldRendererProps } from "@cinatra-ai/sdk-ui/field-renderer-props";
import { SkillRecommenderRenderer } from "../skill-recommender-renderer";

const MINIMAL_CONTEXT: FieldRendererProps["context"] = { connectedApps: [] };

function renderField(overrides: { value?: unknown; disabled?: boolean } = {}) {
  const onChange = vi.fn();
  return {
    onChange,
    ...render(
      <SkillRecommenderRenderer
        fieldName="confirmed"
        schema={{ "x-renderer": "@cinatra-ai/skill-recommender-agent:recommend" }}
        value={overrides.value ?? {}}
        onChange={onChange}
        disabled={overrides.disabled}
        context={MINIMAL_CONTEXT}
      />,
    ),
  };
}

describe("SkillRecommenderRenderer", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders one chip per skillIds entry with an id-derived label", () => {
    renderField({
      value: {
        skillIds: [
          "@cinatra-ai/email-drafting-agent:tone-guide",
          "@cinatra-ai/email-drafting-agent:brevity",
        ],
      },
    });
    expect(screen.getByText("tone-guide")).toBeDefined();
    expect(screen.getByText("brevity")).toBeDefined();
  });

  it("renders enriched chips from a skills object array (name over id)", () => {
    renderField({
      value: {
        skills: [
          { id: "s1", name: "Tone Guide", description: "Keep it warm" },
          { id: "s2", name: "Brevity" },
        ],
      },
    });
    expect(screen.getByText("Tone Guide")).toBeDefined();
    expect(screen.getByText("Brevity")).toBeDefined();
  });

  it("Continue calls onChange({ confirmed: true }) exactly once", () => {
    const { onChange } = renderField({
      value: { skillIds: ["@cinatra-ai/email-drafting-agent:tone-guide"] },
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual({ confirmed: true });
  });

  it("is idempotent — a double-click still emits onChange only once", () => {
    const { onChange } = renderField({
      value: { skillIds: ["@cinatra-ai/email-drafting-agent:tone-guide"] },
    });
    const btn = screen.getByRole("button", { name: /continue/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("keeps Continue advanceable and shows empty-state copy on a degraded snapshot", () => {
    const { onChange } = renderField({ value: {} });
    expect(screen.getByText(/no skills are currently assigned/i)).toBeDefined();
    const btn = screen.getByRole("button", { name: /continue/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(onChange).toHaveBeenCalledWith({ confirmed: true });
  });

  it("respects disabled (no onChange, button disabled)", () => {
    const { onChange } = renderField({
      value: { skillIds: ["a:b"] },
      disabled: true,
    });
    const btn = screen.getByRole("button", { name: /continue/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onChange).not.toHaveBeenCalled();
  });
});
