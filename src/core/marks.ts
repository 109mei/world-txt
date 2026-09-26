import type { EventDef } from '../data/schema';
import { checkAll, checkCondition } from './conditions';
import { startCharge } from './hash';
import type { GameData, GameState } from './types';

/**
 * 世界ごとの3つの印（P22・分析の17章）：救った・少ない手で・早く見抜いた。
 * どれも世界で起きたことと書いた手だけで決まり、運では付かない
 */
export type Mark = 'saved' | 'few' | 'early';
export const MARKS: readonly Mark[] = ['saved', 'few', 'early'];

/** 仕組みの条件（それを書けば壁が起きなくなる条件）：言い回しがないこと・法則の行の読み取り */
function isCounter(c: string): boolean {
  return c.startsWith('!phrase:') || c.startsWith('law:');
}

/**
 * その世界の原因の壁：そのステージの出来事のうち、仕組みの条件があるもの（仕組みがないと、くり返し起きて世界を崩す）。
 * 原因の型のある世界はその型の壁だけ、型のない世界は型の条件のない壁
 */
export function wallsOf(data: GameData, g: Pick<GameState, 'stageId' | 'cause' | 'trial'>): EventDef[] {
  const causes = [g.cause, g.trial?.cause2].filter((c): c is string => !!c);
  return data.events.filter(
    (ev) =>
      !!ev.stages?.includes(g.stageId) &&
      ev.when.some(isCounter) &&
      (causes.length > 0 ? causes.some((c) => ev.when.includes(`cause:${c}`)) : !ev.when.some((c) => c.startsWith('cause:'))),
  );
}

/** 壁が仕組みで止められている（仕組みの条件のどれかが満たされない） */
function walled(g: GameState, ev: EventDef): boolean {
  return ev.when.filter(isCounter).some((c) => !checkCondition(g, c));
}

/** いま仕組みで止められている壁の id */
export function walledNow(g: GameState, data: GameData): Set<string> {
  return new Set(wallsOf(data, g).filter((ev) => walled(g, ev)).map((ev) => ev.id));
}

/**
 * 書いた手で、止められていなかった壁が止まったなら、原因に効く手を打った年を残す（はじめの1度だけ）。
 * before は書く前に止められていた壁
 */
export function noticeCounter(g: GameState, data: GameData, before: Set<string>): void {
  if (g.countered !== null) return;
  for (const id of walledNow(g, data)) {
    if (!before.has(id)) {
      g.countered = g.year;
      return;
    }
  }
}

/**
 * 分かれ道の年：原因の壁の兆しが最初に出た年（兆しのない壁は、はじめて起きた年）。
 * 1年進めたあとに呼ぶ（兆しは、その年の世界の画面に出る）
 */
export function noticeBranch(g: GameState, data: GameData): void {
  if (g.branch !== null) return;
  const at = data.balance.signs.eventAt;
  for (const ev of wallsOf(data, g)) {
    const fired = g.fired[ev.id] !== undefined;
    const key = `e:${ev.id}`;
    const signed = !!ev.sign && checkAll(g, ev.when) && (g.charge[key] ?? startCharge(g.seed, key)) >= at;
    if (fired || signed) {
      g.branch = { year: g.year, id: ev.id, pass: g.loop?.count ?? 0 };
      return;
    }
  }
}

/** 作り手の解の手数（原因の型ごと。型のない世界はステージの手数）。決めていなければ null */
export function parOf(data: GameData, g: Pick<GameState, 'stageId' | 'cause'>): number | null {
  const st = data.stageById.get(g.stageId);
  if (!st) return null;
  const c = g.cause ? st.causes.find((x) => x.id === g.cause) : undefined;
  return c?.par ?? st.par ?? null;
}

/**
 * 終わった世界の印。救った：最後の年まで線を割らなかった。少ない手で：救い、手の数（書き換え・書き足し・消す）が作り手の解の手数以内。
 * 早く見抜いた：分かれ道の年（兆しが最初に出た年）より前に、原因に効く手を打った（兆しが出なかった世界は、効く手を打っていれば）。
 * 分かれ道からやり直した世界には、少ない手で・早く見抜いたは付かない
 */
export function marksOf(g: GameState, data: GameData): Mark[] {
  const st = data.stageById.get(g.stageId);
  if (g.status === 'playing' || !st?.marks) return [];
  const out: Mark[] = [];
  const saved = g.status === 'cleared';
  if (saved) out.push('saved');
  if (g.branched) return out;
  const par = parOf(data, g);
  if (saved && par !== null && g.moves.length <= par) out.push('few');
  if (g.countered !== null && (g.branch === null || g.countered < g.branch.year)) out.push('early');
  return out;
}
