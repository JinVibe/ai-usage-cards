/**
 * Registry of AI coding-agent co-author signatures.
 *
 * This is the community extension point: to support a new agent, add an entry
 * here (a PR with one object literal). Matching runs locally on commit
 * messages already fetched from GitHub, so adding entries never costs extra
 * API calls.
 *
 * Emails are matched exactly (case-insensitive); `namePatterns` are a
 * fallback for agents that sign with varying noreply addresses.
 */
export interface AiSignature {
  /** Stable identifier, e.g. "claude". Safe to render. */
  id: string;
  /** Human-readable label. Safe to render. */
  label: string;
  /** Lowercased trailer emails that identify this agent. Never rendered. */
  emails: string[];
  /** Fallback patterns applied to the trailer's name part. */
  namePatterns: RegExp[];
}

export const AI_SIGNATURES: AiSignature[] = [
  {
    id: 'claude',
    label: 'Claude',
    emails: ['noreply@anthropic.com', 'claude@anthropic.com'],
    namePatterns: [/^claude\b/i],
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot',
    emails: ['copilot@github.com'],
    namePatterns: [/^(github )?copilot$/i, /^copilot swe agent$/i],
  },
  {
    id: 'codex',
    label: 'OpenAI Codex',
    emails: ['codex@openai.com', 'chatgpt@openai.com'],
    namePatterns: [/^(openai )?codex\b/i, /^chatgpt\b/i],
  },
  {
    id: 'gemini',
    label: 'Gemini',
    emails: ['gemini-cli@google.com'],
    namePatterns: [/^gemini\b/i],
  },
  {
    id: 'cursor',
    label: 'Cursor',
    emails: ['cursoragent@cursor.com'],
    namePatterns: [/^cursor( agent)?$/i],
  },
  {
    id: 'devin',
    label: 'Devin',
    emails: [],
    namePatterns: [/^devin(-ai-integration)?(\[bot\])?$/i],
  },
  {
    id: 'aider',
    label: 'Aider',
    emails: [],
    namePatterns: [/\(aider\)$/i, /^aider\b/i],
  },
];
