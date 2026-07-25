/**
 * Theme token records. One accent *gradient* per theme (accent → accent2),
 * neutral everything else — still no per-tool rainbow. Community themes are
 * added here.
 */
export interface Theme {
  bg: string;
  border: string;
  /** Card title. Kept equal to `accent` (guarded by tests). */
  title: string;
  /** Primary numbers and text. */
  text: string;
  /** Labels, arrows, footer. */
  muted: string;
  /** Gradient start: repo names, emphasis, heatmap. */
  accent: string;
  /** Gradient end: glow, peaks, the border beam's tail. */
  accent2: string;
}

export const themes: Record<string, Theme> = {
  light: {
    bg: '#ffffff',
    border: '#e4e2e2',
    title: '#0969da',
    text: '#24292f',
    muted: '#6e7781',
    accent: '#0969da',
    accent2: '#8250df',
  },
  dark: {
    bg: '#0d1117',
    border: '#30363d',
    title: '#58a6ff',
    text: '#c9d1d9',
    muted: '#8b949e',
    accent: '#58a6ff',
    accent2: '#bc8cff',
  },
  dim: {
    bg: '#22272e',
    border: '#444c56',
    title: '#539bf5',
    text: '#adbac7',
    muted: '#768390',
    accent: '#539bf5',
    accent2: '#b083f0',
  },
  neon: {
    bg: '#0a0b16',
    border: '#272945',
    title: '#22d3ee',
    text: '#e6e6f0',
    muted: '#8b8ca7',
    accent: '#22d3ee',
    accent2: '#a78bfa',
  },
};

export const DEFAULT_THEME = 'light';

/** Unknown theme names fall back to the default — never an error. */
export function resolveTheme(name: string | undefined): Theme {
  const light = themes[DEFAULT_THEME] as Theme;
  if (!name) return light;
  return themes[name] ?? light;
}
