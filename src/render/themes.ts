/**
 * Theme token records. Single-hue by design: one accent color per theme, the
 * rest is neutral — no per-tool rainbow. Community themes are added here.
 */
export interface Theme {
  bg: string;
  border: string;
  /** Card title. */
  title: string;
  /** Primary numbers. */
  text: string;
  /** Labels, arrows, footer. */
  muted: string;
  /** Repo names, emphasis. */
  accent: string;
}

export const themes: Record<string, Theme> = {
  light: {
    bg: '#ffffff',
    border: '#e4e2e2',
    title: '#0969da',
    text: '#24292f',
    muted: '#6e7781',
    accent: '#0969da',
  },
  dark: {
    bg: '#0d1117',
    border: '#30363d',
    title: '#58a6ff',
    text: '#c9d1d9',
    muted: '#8b949e',
    accent: '#58a6ff',
  },
  dim: {
    bg: '#22272e',
    border: '#444c56',
    title: '#539bf5',
    text: '#adbac7',
    muted: '#768390',
    accent: '#539bf5',
  },
};

export const DEFAULT_THEME = 'light';

/** Unknown theme names fall back to the default — never an error. */
export function resolveTheme(name: string | undefined): Theme {
  const light = themes[DEFAULT_THEME] as Theme;
  if (!name) return light;
  return themes[name] ?? light;
}
