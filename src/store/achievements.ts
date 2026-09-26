import { checkAll, GENERIC_ENDINGS, knownRules, type GameData, type GameState } from '../core';
import { PROGRESS_CONDITION } from '../data/schema';
import type { Progress } from '../save';
import { buildCausalMap } from './causal';
import { journeyOf } from './journey';

/**
 * 実績。遊んでいる世界の条件（core の条件の書き方）・世界の終わり方・これまでの進み具合から判断する。
 * 得た実績は progress.achievements に残る（世界をまたいで集まる）
 */

/** 観測記録のうち、世界の中身ではない記録（開いていく順番の h:・使った読まれ方の m:） */
export function metaRecord(id: string): boolean {
  return id.startsWith('h:') || id.startsWith('m:');
}

/** 進み具合の量（prevBeaten だけは、いま終わった世界 g と前回の線を比べる） */
export function progressValue(data: GameData, p: Progress, key: string, g: GameState | null = null): number {
  switch (key) {
    // 無限の世界のほかの、救った世界の数
    case 'cleared':
      return p.cleared.filter((id) => !data.stageById.get(id)?.endless).length;
    case 'worlds':
      return p.worlds;
    // 観測記録（読み取り・出来事など。開いていく順番と読まれ方の記録は数えない）
    case 'discovered':
      return p.discovered.filter((id) => !metaRecord(id)).length;
    case 'endlessBest':
      return p.endless.reduce((m, r) => Math.max(m, r.years), 0);
    // 見た特別な結末の数
    case 'endings':
      return p.discovered.filter((id) => id.startsWith('x:')).length;
    // 得た実績の数（隠しのおまけは数えない）
    case 'achievements':
      return p.achievements.filter((id) => !data.achievements.find((a) => a.id === id)?.bonus).length;
    case 'abandoned':
      return p.abandoned;
    // 使った読まれ方の数（性質・制度・条件つき）
    case 'modes':
      return p.discovered.filter((id) => id.startsWith('m:')).length;
    // わかった世界の決まりの数
    case 'rules':
      return knownRules(data, journeyOf(p)).length;
    // 3つの印をそろえた世界の数
    case 'marks3':
      return Object.values(p.best).filter((b) => (b?.marks?.length ?? 0) >= 3).length;
    // 世界番号を入れて開いた（番号で開く）
    case 'numbered':
      return p.discovered.includes('h:number') ? 1 : 0;
    // 救った改稿者の試練の数
    case 'trials':
      return p.trials.length;
    // 世界の辞書に集めた、世界に通じた言葉の数
    case 'words':
      return p.words.known.length;
    // 因果の地図で見つけた線の数（見つけた読み取りから、見つけた想定外の変化・組み合わせへ）
    case 'links':
      return buildCausalMap(data, p.discovered).found;
    // 前回は救えなかった同じ世界（ステージと世界番号が同じ）で、前回より長く世界を保った（前回の線は次の世界を開くまで残る）
    case 'prevBeaten': {
      const prev = p.prevRun;
      if (!g || !prev || prev.key !== `${g.stageId}:${g.seed}`) return 0;
      return g.trace.pop.length > prev.pop.length ? 1 : 0;
    }
    default:
      return 0;
  }
}

function progressCheck(data: GameData, p: Progress, src: string, g: GameState | null): boolean {
  const m = PROGRESS_CONDITION.exec(src.trim());
  if (!m) return false;
  const a = progressValue(data, p, m[1]!, g);
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
    if (!a.progress.every((c) => progressCheck(data, p, c, g))) continue;
    out.push(a.id);
  }
  return out;
}

/** 結末の名前（特別な結末ならその名前、ふつうの終わり方なら null） */
export function endingTitle(data: GameData, id: string | null): string | null {
  if (!id || GENERIC_ENDINGS.includes(id)) return null;
  return data.endingById.get(id)?.title ?? null;
}
