# Agent guide

Instructions for AI coding agents working with this repository — whether you are
**setting up cards for your user** or **contributing to the codebase**.

## Setting up cards for your user

Goal: your user ends up with embeddable card URLs in their README. Full context:
[README](README.md). Steps you can run end-to-end:

1. **Outcome card needs no setup.** Emit this URL with their GitHub username:
   `https://ai-usage-cards-swart.vercel.app/api/card?username=<login>&modules=funnel,repos&theme=<light|dark>`
   Their card fills as they commit with `Co-authored-by` AI trailers on public default branches.
2. **Usage/buddy/combined cards need a gist.** Ask the user for a GitHub PAT with **only
   the `gist` scope** (they can mint one at
   `https://github.com/settings/tokens/new?scopes=gist`). Never store it in a repo.
3. Create a secret gist with that token: `POST https://api.github.com/gists` with body
   `{"public": false, "files": {"usage.json": {"content": "{}"}}}` — the response `id` is the gist id.
4. Download and run the collector on the user's machine (Node 20+):
   `https://raw.githubusercontent.com/JinVibe/ai-usage-cards/main/collector/collect.mjs`
   with env `AIUC_GIST_ID`, `AIUC_GIST_TOKEN`, `AIUC_SOURCE_ID` (any machine label).
   Success prints `Uploaded N days`.
5. Schedule the collector daily (cron / Windows Task Scheduler / a Claude Code hook),
   keeping the token in a local file the user owns — see README Step 5 for templates.
6. Emit the embed snippets. Endpoints (all take `username`, `gist`, optional
   `providers=claude-code,codex,...` filter and `theme`):
   - `/api/usage-card` — heatmap + totals + monthly bars
   - `/api/buddy-card` — evolving mascot (240px wide)
   - `/api/combined-card` — usage + shipping funnel in one
   Wrap light/dark variants in `<picture>` (template in the README quick start).

Ask before acting on anything outward-facing (creating gists, editing their profile README).

## Contributing to this codebase

- Runtime deps: **zero**. Dev commands: `npm install`, `npm test` (vitest),
  `npm run typecheck` (tsc). Both must pass; CI runs both.
- Layout: `api/*.ts` Vercel handlers (thin) → `src/github|usage` data → `src/core`
  aggregation → `src/render` SVG. Pure logic lives outside `api/` and gets tests.
- Extension points: AI signatures in `src/config/ai-signatures.ts`, themes in
  `src/render/themes.ts` (single-hue: `accent === title`, guarded by tests).
- Hard rules (tests enforce; do not weaken): rendered SVG never contains emails, token
  costs/dollar amounts, leaderboards, or gist source labels. Metric wording stays
  outcome-first ("directed AI to ship") with `≥` framing.
- Cards always return HTTP 200 + `image/svg+xml`, even for errors.
- The buddy mascot is an original character — never substitute vendor logos or mascots.
