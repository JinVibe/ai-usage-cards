# ai-usage-cards

**The AI-era contribution graph.** Green squares showed *that* you code — this card shows *how you build with AI*: verifiable outcomes straight from your public git history, embeddable in your README from a single URL.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://ai-usage-cards.vercel.app/api/card?username=octocat&modules=funnel,repos&theme=dark">
    <img src="https://ai-usage-cards.vercel.app/api/card?username=octocat&modules=funnel,repos&theme=light" alt="AI-assisted shipping stats">
  </picture>
</p>

No install, no tokens, no data collection — the card reads AI co-author trailers
(`Co-Authored-By: Claude <...>` and friends) already sitting in your public commits and
aggregates them into an outcome funnel: **commits → merged PRs → releases**.

## Quick start

1. Open the [card builder](https://ai-usage-cards.vercel.app) and type your GitHub username.
2. Click **Copy markdown**.
3. Paste into your README. Done — light/dark switches automatically.

Or paste this directly, replacing `YOUR_USERNAME`:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://ai-usage-cards.vercel.app/api/card?username=YOUR_USERNAME&theme=dark">
  <img src="https://ai-usage-cards.vercel.app/api/card?username=YOUR_USERNAME&theme=light" alt="AI-assisted shipping stats">
</picture>
```

## Options

| Parameter | Values | Default | Notes |
|---|---|---|---|
| `username` | GitHub login | *(required)* | |
| `modules` | `funnel`, `repos` (comma-separated) | `funnel` | All modules are opt-in — you choose what to show |
| `theme` | `light`, `dark`, `dim` | `light` | Unknown values fall back to `light` |

- **`funnel`** — the headline: `≥N AI-assisted commits → ≥M merged PRs → K releases`.
- **`repos`** — per-repo case cards (`spark-app — shipped v1.2.0 · ≥20 AI-assisted commits`), a unit you can paste next to a resume line.

## Themes

| `light` | `dark` | `dim` |
|---|---|---|
| ![light](https://ai-usage-cards.vercel.app/api/card?username=octocat&theme=light) | ![dark](https://ai-usage-cards.vercel.app/api/card?username=octocat&theme=dark) | ![dim](https://ai-usage-cards.vercel.app/api/card?username=octocat&theme=dim) |

New themes are welcome — add a token record in [`src/render/themes.ts`](src/render/themes.ts) (single-hue, please).

## What counts (and what doesn't)

Honesty first — the numbers are framed as **"at least N"** because:

- Co-author trailers are **lost on squash merges** and can be disabled, so real usage is higher than what's visible.
- Only **public repos** and default branches are counted. Private work is invisible by design.
- Merged-PR resolution is sampled (bounded API usage), so `≥M` is a floor, not a census.

What is never shown: emails (matched internally, never rendered), token counts, costs,
or any leaderboard. This card shows *what you shipped with AI* — not how much AI you consumed.

## Supported AI agents

Claude, GitHub Copilot, OpenAI Codex, Gemini, Cursor, Devin, Aider — anything that signs
commits with a `Co-authored-by` trailer. Adding an agent is a one-object PR to
[`src/config/ai-signatures.ts`](src/config/ai-signatures.ts); matching runs locally, so new
patterns never cost extra API calls.

## Self-hosting

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FJinVibe%2Fai-usage-cards&env=GITHUB_TOKEN&envDescription=GitHub%20PAT%20(no%20scopes%20needed)%20for%20higher%20rate%20limits%20and%20PR%2Frelease%20enrichment)

The shared instance survives GitHub API rate limits through aggressive CDN caching
(6 h fresh + 24 h stale-while-revalidate). If you self-host, set a `GITHUB_TOKEN`
environment variable — a classic PAT with **no scopes** is enough (public data only).
Without a token the card still works, but PR/release enrichment (GraphQL) is skipped.

## Development

```bash
npm install
npm test          # vitest — trailer matching, aggregation, rendering, privacy guards
npm run typecheck
npm run dev       # vercel dev
```

## License

[MIT](LICENSE)
