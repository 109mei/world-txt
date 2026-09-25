import type { GameData } from '../core';
import type { Progress } from '../save';

/** 無限の世界の記録簿（この端末でのランキング）に残す数 */
export const RANKING_SIZE = 10;

export type RankRun = Progress['ranking'][number];

/**
 * 記録簿の並べ方：文明が続いた年数の長い順。同じなら、防いだ危機の多い順、書き換えの少ない順、先に記録した順
 */
export function compareRuns(a: RankRun, b: RankRun): number {
  return b.years - a.years || b.averted - a.averted || a.edits - b.edits || a.at - b.at;
}

/** 記録簿に1件を加え、上位だけを残す。加えた記録が何位になったか（記録簿の外なら null）も返す */
export function insertRun(list: readonly RankRun[], run: RankRun): { list: RankRun[]; rank: number | null } {
  const next = [...list, run].sort(compareRuns);
  const at = next.indexOf(run);
  return { list: next.slice(0, RANKING_SIZE), rank: at < RANKING_SIZE ? at + 1 : null };
}

/** 年数に応じた称号（indicators.json の ranks） */
export function rankTitle(data: GameData, years: number): string {
  let title = data.indicators.ranks[0]![1];
  for (const [min, name] of data.indicators.ranks) if (years >= min) title = name;
  return title;
}

/** 記録簿の中で、この記録（書いた時刻で見分ける）が何位か */
export function rankOf(list: readonly RankRun[], at: number): number | null {
  const i = list.findIndex((r) => r.at === at);
  return i >= 0 ? i + 1 : null;
}
