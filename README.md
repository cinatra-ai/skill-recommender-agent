# Skill Recommender Agent

A human-in-the-loop checkpoint that runs right before the email drafting step. It displays the skills currently assigned to guide the draft — tone, brand voice, writing style, and any custom skills you have installed — and pauses the workflow until you click Continue. Once you continue, the confirmation signal is passed downstream and the email drafting step proceeds with those skills.

Install via the Cinatra marketplace and attach it as a dependency to any email drafting workflow. The agent requires only a `cinatra_run_id` at runtime; it reads skill assignments from the host context using the `skill-recommend` renderer and opens a read-only review screen. No external service credentials or configuration are required.

## Works with

- Cinatra email drafting agent (`@cinatra-ai/email-drafting-agent`)

## Capabilities

- Display the skills assigned to the email drafting step in a read-only review screen before the draft is generated
- Pause the drafting workflow at the skill review step and wait for an explicit user confirmation to continue
- Pass a `confirmed` signal downstream so the calling workflow can gate on the user's decision
- Always show the review screen regardless of whether prior inputs are present (`autoSkipWhenInputsPresent: false`)
