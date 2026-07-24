import type { UsageData } from './types.js';

/** 4213000 → "4.2M", 890000 → "890k", 950 → "950" */
export function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${trim(n / 1_000_000_000)}B`;
  if (n >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (n >= 1_000) return `${trim(n / 1_000)}k`;
  return String(Math.round(n));
}

function trim(value: number): string {
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return String(rounded);
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, delta: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + delta);
  return copy;
}

/** Sessions and tokens summed over the calendar month containing `now`. */
export function monthTotals(data: UsageData, now: Date): { tokens: number; sessions: number } {
  const prefix = isoDate(now).slice(0, 7);
  let tokens = 0;
  let sessions = 0;
  for (const [date, day] of data.days) {
    if (date.startsWith(prefix)) {
      tokens += day.tokens;
      sessions += day.sessions;
    }
  }
  return { tokens, sessions };
}

/**
 * Consecutive active days ending today — or ending yesterday, so the streak
 * doesn't read as broken before today's collector run has happened.
 */
export function currentStreak(data: UsageData, now: Date): number {
  const active = (d: Date) => (data.days.get(isoDate(d))?.tokens ?? 0) > 0;
  let cursor = new Date(now);
  if (!active(cursor)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (active(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export interface HeatmapCell {
  date: string;
  /** 0 = no activity, 1–4 = single-hue intensity quartiles. */
  level: number;
}

/**
 * GitHub-style heatmap grid: `weeks` columns ending in the week of `now`,
 * rows Sunday→Saturday. Intensity is relative to the visible window's max.
 */
export function heatmapGrid(data: UsageData, now: Date, weeks: number): HeatmapCell[][] {
  const end = new Date(now);
  const lastColumnStart = addDays(end, -end.getUTCDay());
  const start = addDays(lastColumnStart, -(weeks - 1) * 7);

  let max = 0;
  const tokensAt: number[][] = [];
  for (let w = 0; w < weeks; w++) {
    tokensAt.push([]);
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      const tokens = date > end ? 0 : (data.days.get(isoDate(date))?.tokens ?? 0);
      tokensAt[w]!.push(tokens);
      if (tokens > max) max = tokens;
    }
  }

  return tokensAt.map((column, w) =>
    column.map((tokens, d) => ({
      date: isoDate(addDays(start, w * 7 + d)),
      level: tokens === 0 || max === 0 ? 0 : Math.min(4, Math.max(1, Math.ceil((tokens / max) * 4))),
    })),
  );
}
