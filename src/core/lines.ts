import type { Carried, GameData, GameState } from './types';

/** 何も運ばない行 */
export const NO_MEANING: Carried = { phrases: [], law: null };

export type LineRef = { kind: 'law'; id: string } | { kind: 'line'; id: string };

type Lines = Pick<GameState, 'extras' | 'carried'>;

/** WORLD.txt の行を決まった順に並べる：法則の行（内容の順）、書き足した行（書いた順） */
export function eachLine(g: Lines, data: GameData): { ref: LineRef; carried: Carried }[] {
  const out: { ref: LineRef; carried: Carried }[] = [];
  for (const law of data.laws) out.push({ ref: { kind: 'law', id: law.id }, carried: g.carried[law.id] ?? NO_MEANING });
  for (const x of g.extras) out.push({ ref: { kind: 'line', id: x.id }, carried: g.carried[x.id] ?? NO_MEANING });
  return out;
}

/** その法則について、世界で効いている読み取り（その行の読み取りと、ほかの行の重ね書き） */
export function readingsOf(g: Pick<GameState, 'laws' | 'carried'>, lawId: string, laws: Record<string, string> = g.laws): string[] {
  const out = [laws[lawId] ?? ''];
  for (const c of Object.values(g.carried)) if (c.law && c.law.id === lawId) out.push(c.law.option);
  return out;
}

/** どこかの行がその言い回しを運んでいるか */
export function carriesPhrase(g: Pick<GameState, 'carried'>, phraseId: string): boolean {
  for (const c of Object.values(g.carried)) if (c.phrases.includes(phraseId)) return true;
  return false;
}

/** その言い回しを運んでいる最初の行 */
export function lineWithPhrase(g: Lines, data: GameData, phraseId: string): LineRef | null {
  return eachLine(g, data).find((l) => l.carried.phrases.includes(phraseId))?.ref ?? null;
}
