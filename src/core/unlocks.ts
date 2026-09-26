import type { Law, StageId, UnlockStep, WorldRule } from '../data/schema';
import type { GameData } from './types';

/**
 * 開いていく順番（P18・分析の13章）。救った世界・遊び終えた世界・観測記録（初めて起きたこと）だけで決まり、運では開かない。
 * 記録は増えるだけなので、一度開いたものは閉じない
 */
export interface Journey {
  /** 救った世界（ステージ） */
  cleared: readonly string[];
  /** 遊び終えた世界（勝ち負けは問わない。放棄は入らない） */
  played: readonly string[];
  /** 観測記録（初めて起きたこと h:* を含む） */
  discovered: readonly string[];
  /** ステージごとの負けた数 */
  losses?: Readonly<Partial<Record<string, number>>>;
}

/** 段が開くまでに足りないもの：あと何回救う・どの世界を遊び終える・何が世界で起きる */
export type Need = { kind: 'clears'; left: number } | { kind: 'played'; stage: StageId } | { kind: 'found'; id: string };

/** 段が開くまでに足りないもの（開いていれば空） */
export function stepNeeds(step: UnlockStep, j: Journey): Need[] {
  const w = step.when;
  const out: Need[] = [];
  if (w.clears !== undefined && j.cleared.length < w.clears) out.push({ kind: 'clears', left: w.clears - j.cleared.length });
  if (w.played !== undefined && !j.played.includes(w.played)) out.push({ kind: 'played', stage: w.played });
  if (w.found !== undefined && !j.discovered.includes(w.found)) out.push({ kind: 'found', id: w.found });
  return out;
}

export function stepOpen(step: UnlockStep, j: Journey): boolean {
  return stepNeeds(step, j).length === 0;
}

/** そのステージを開く段（段のないステージは、stages.json の unlock の数だけ救うと開く） */
export function stageStep(data: GameData, stageId: string): UnlockStep | undefined {
  return data.unlocks.steps.find((s) => s.stage === stageId);
}

/** ステージが開くまでに足りないもの（開いていれば空） */
export function stageNeeds(data: GameData, j: Journey, stageId: string): Need[] {
  const step = stageStep(data, stageId);
  if (step) return stepNeeds(step, j);
  const left = (data.stageById.get(stageId as StageId)?.unlock ?? 0) - j.cleared.length;
  return left > 0 ? [{ kind: 'clears', left }] : [];
}

export function stageOpen(data: GameData, j: Journey, stageId: string): boolean {
  return stageNeeds(data, j, stageId).length === 0;
}

/** 最後の段（すべての決まりを本来の強さで動かす段）が開いた */
export function allOpen(data: GameData, j: Journey): boolean {
  return data.unlocks.steps.some((s) => s.full && stepOpen(s, j));
}

/** 決まりを紹介する段 */
export function ruleStep(data: GameData, ruleId: string): UnlockStep | undefined {
  return data.unlocks.steps.find((s) => s.rules.includes(ruleId));
}

/**
 * わかった世界の決まり：世界で初めてそれが起きた（観測記録にある）か、紹介する段が開いていて、その段のステージを遊び終えた
 * （ステージのない段は、開いたとき）
 */
export function ruleKnown(data: GameData, j: Journey, rule: WorldRule): boolean {
  if (rule.found.some((f) => j.discovered.includes(f))) return true;
  const step = ruleStep(data, rule.id);
  if (!step || !stepOpen(step, j)) return false;
  return step.stage === undefined || j.played.includes(step.stage);
}

export function knownRules(data: GameData, j: Journey): WorldRule[] {
  return data.unlocks.rules.filter((r) => ruleKnown(data, j, r));
}

/**
 * 世界を始めるときの、世界の決まりの強さ（書かない決まりは本来の強さ）。
 * わかった決まりと、すべて開いたあとは本来の強さ。まだの決まりは紹介する前の強さ（balance.intro.before）で動かし、
 * この世界で紹介する決まり（この世界のステージの段・ステージのない段）と、世界で初めて起きた決まりは、年ごとに本来の強さへ上がる（rampIntro）
 */
export function introFor(data: GameData, j: Journey): Record<string, number> {
  if (allOpen(data, j)) return {};
  const out: Record<string, number> = {};
  for (const r of data.unlocks.rules) if (!ruleKnown(data, j, r)) out[r.id] = data.balance.intro.before;
  return out;
}

/** その世界で出会う決まり（そのステージの段で紹介する決まり） */
export function stageRules(data: GameData, stageId: string): WorldRule[] {
  const step = stageStep(data, stageId);
  return step ? step.rules.map((id) => data.unlocks.rules.find((r) => r.id === id)!).filter(Boolean) : [];
}

/** 開いた兆しの読み方（同じステージで3回負けるごとに1つ。開いたものは閉じない） */
export function openHints(data: GameData, j: Journey, stageId: string): string[] {
  const st = data.stageById.get(stageId as StageId);
  if (!st) return [];
  const n = Math.floor((j.losses?.[stageId] ?? 0) / data.balance.intro.hintEvery);
  return st.hints.slice(0, n);
}

/** 書き換えたことのある行（その行の「現実では」がノートの現実のカードになる） */
function touchedLaw(j: Journey, law: Law): boolean {
  const head = `r:${law.id}.`;
  return j.discovered.some((id) => id.startsWith(head));
}

/** 現実のカード：わかった決まりのカードと、書き換えたことのある行の「現実では」 */
export function realCards(data: GameData, j: Journey): { rules: WorldRule[]; laws: Law[]; found: number; total: number } {
  const rules = knownRules(data, j);
  const withFact = data.laws.filter((l) => l.fact);
  const laws = withFact.filter((l) => touchedLaw(j, l));
  return { rules, laws, found: rules.length + laws.length, total: data.unlocks.rules.length + withFact.length };
}

/** まだ出会っていない決まりのうち、次に開く段（開く条件の近い順の先頭） */
export function nextStep(data: GameData, j: Journey): UnlockStep | undefined {
  const pending = data.unlocks.steps.filter((s) => s.rules.some((id) => !ruleKnown(data, j, data.unlocks.rules.find((r) => r.id === id)!)));
  // 開いている段（遊べば出会える）を先に、次に足りないものが少ない段
  return [...pending].sort((a, b) => stepNeeds(a, j).length - stepNeeds(b, j).length)[0];
}
