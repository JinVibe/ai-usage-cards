# Contributing

Thanks for helping build the AI-era contribution graph. The two easiest ways in:

## Add a theme

Themes live in [`src/render/themes.ts`](src/render/themes.ts) — one token record per theme:

```ts
mytheme: {
  bg: '#0f0f14',
  border: '#2a2a35',
  title: '#8b7ef8',   // the single accent hue
  text: '#e4e2f0',
  muted: '#7a7a8c',
  accent: '#8b7ef8',  // keep identical to title — single-hue by design
},
```

Rules:
- **Single-hue**: one accent color, neutral everything else. No rainbows.
- Keep enough contrast for the muted labels in both GitHub light and dark READMEs.
- Run `npm test` — a guard test enforces `accent === title`.

## Add an AI agent signature

Signatures live in [`src/config/ai-signatures.ts`](src/config/ai-signatures.ts). If your agent
writes `Co-authored-by:` trailers, add one entry:

```ts
{
  id: 'myagent',            // stable slug, safe to render
  label: 'My Agent',
  emails: ['bot@myagent.dev'],   // exact trailer emails (matched, never rendered)
  namePatterns: [/^my agent$/i], // fallback on the trailer's name part
},
```

Matching runs locally on already-fetched commit messages, so new entries never add API calls.
Please include a real-world example trailer in your PR description and a test case in
[`test/trailer.test.ts`](test/trailer.test.ts).

## Everything else

- `npm test` and `npm run typecheck` must pass; CI runs both.
- Privacy rules are non-negotiable: no emails, token counts, costs, or leaderboards in any
  rendered output. Tests guard this — don't weaken them.
- Metric wording stays outcome-first ("directed AI to ship"), with "at least N" framing.
