import { checkAll, GENERIC_ENDINGS, type GameData, type GameState } from '../core';
import type { Progress } from '../save';

/**
 * 実績。遊んでいる世界の条件（core の条件の書き方）・世界の終わり方・これまでの進み具合から判断する。
 * 得た実績は progress.achievements に残る（世界をまたいで集まる）
 */

const PROGRESS = /^(cleared|worlds|discovered|endlessBest|endings|achievements|abandoned)\s*(<=|>=|==|<|>)\s*(\d+)$/;

/** 進み具合の量 */
export function progressValue(data: GameData, p: Progress, key: string): number {
  switch (key) {
    // 無限の世界のほかの、救った世界の数
    case 'cleared':
      return p.cleared.filter((id) => !data.stageById.get(id)?.endless).length;
    case 'worlds':
      return p.worlds;
    // 観測記録（実績と結末は含めない読み取り・出来事など）
    case 'discovered':
      return p.discovered.length;
    case 'endlessBest':
      return p.endless.reduce((m, r) => Math.max(m, r.years), 0);
    // 見た特別な結末の数
    case 'endings':
      return p.discovered.filter((id) => id.startsWith('x:')).length;
    case 'achievements':
      return p.achievements.length;
    case 'abandoned':
      return p.abandoned;
    default:
      return 0;
  }
}

function progressCheck(data: GameData, p: Progress, src: string): boolean {
  const m = PROGRESS.exec(src.trim());
  if (!m) return false;
  const a = progressValue(data, p, m[1]!);
  const b = Number(m[3]);
  switch (m[2]) {
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    default:
      return a === b;
  }
}

/** いま新しく得られる実績（まだ得ていないもの） */
export function newAchievements(data: GameData, g: GameState | null, p: Progress): string[] {
  const out: string[] = [];
  for (const a of data.achievements) {
    if (p.achievements.includes(a.id)) continue;
    if (a.world.length > 0 || a.end) {
      if (!g) continue;
      if (a.end) {
        if (g.status === 'playing') continue;
        if (a.end !== 'any' && (a.end === 'clear') !== (g.status === 'cleared')) continue;
      }
      if (!checkAll(g, a.world)) continue;
    }
    if (!a.progress.every((c) => progressCheck(data, p, c))) continue;
    out.push(a.id);
  }
  return out;
}

/** 結末の名前（特別な結末ならその名前、ふつうの終わり方なら null） */
export function endingTitle(data: GameData, id: string | null): string | null {
  if (!id || GENERIC_ENDINGS.includes(id)) return null;
  return data.endingById.get(id)?.title ?? null;
}
