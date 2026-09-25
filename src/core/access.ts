import type { StageId } from '../data/schema';
import type { GameData, GameState, WriteAccess } from './types';

/**
 * 筆の位：救った世界の数で上がり、書き換えられる範囲が広がる。
 * 範囲＝どの分野の行を書き換えられるか、場所＝書き足せる行の数、対象＝書ける概念の重さ（無理の大きさ）。
 * 最後の位（創世の筆）は、すべて自由。
 * 世界を作るときに、位とステージから範囲を決めて GameState.access に持たせる（遊んでいる途中で位が上がっても、その世界は変わらない）
 */

/** 救った世界の数から、筆の位（access.ranks の何番目か） */
export function rankOf(data: GameData, clears: number): number {
  let rank = 0;
  data.access.ranks.forEach((r, i) => {
    if (clears >= r.clears) rank = i;
  });
  return rank;
}

/** その位とステージで書き換えられる範囲（ステージの危機に関わる行は、位にかかわらず開いている） */
export function accessFor(data: GameData, stageId: StageId, clears: number): WriteAccess {
  const rank = rankOf(data, clears);
  const def = data.access.ranks[rank]!;
  const open = new Set<string>(data.access.stages[stageId] ?? []);
  for (const id of def.realms) for (const c of data.access.realms.find((r) => r.id === id)?.concepts ?? []) open.add(c);
  // 概念の並びは内容の順にそろえる（同じ位・同じステージなら、同じ形）
  return { rank, concepts: data.concepts.map((c) => c.id).filter((id) => open.has(id)), margin: def.margin, depth: def.depth };
}

/** 危機を防ぐ・弱める行の概念（その危機が知らされているあいだは、位にかかわらず封が解ける） */
export function crisisConcepts(data: GameData, crisisId: string): string[] {
  const c = data.crisisById.get(crisisId);
  if (!c) return [];
  const out = new Set<string>();
  for (const cond of [...c.avertedBy, ...c.softenedBy].flat()) {
    const m = /^law:(\w+)=/u.exec(cond);
    const law = m ? data.lawById.get(m[1]!) : undefined;
    if (law) out.add(law.concept);
  }
  return [...out];
}

/** いま書き換えられる概念の行（null なら、すべて） */
export function openConcepts(g: GameState, data: GameData): Set<string> | null {
  if (!g.access) return null;
  const open = new Set(g.access.concepts);
  if (g.crisis && g.status === 'playing') for (const c of crisisConcepts(data, g.crisis.id)) open.add(c);
  return open;
}

/** その法則の行が、いまは封じられているか */
export function isSealed(g: GameState, data: GameData, lawId: string): boolean {
  const open = openConcepts(g, data);
  const law = data.lawById.get(lawId);
  return !!open && !!law && !open.has(law.concept);
}

/** その概念の行が開く、いちばん低い位（ステージの行は、位にかかわらず開いている） */
export function rankOpening(data: GameData, concept: string): number {
  const realm = data.access.realms.find((r) => r.concepts.includes(concept))?.id;
  const i = data.access.ranks.findIndex((r) => !!realm && r.realms.includes(realm));
  return i >= 0 ? i : data.access.ranks.length - 1;
}

/** その重さ（無理の大きさ）の概念を書ける、いちばん低い位 */
export function rankForDepth(data: GameData, incoherence: number): number {
  const i = data.access.ranks.findIndex((r) => r.depth === null || incoherence <= r.depth);
  return i >= 0 ? i : data.access.ranks.length - 1;
}
