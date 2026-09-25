import { CHANNEL_IDS, CHANNEL_MODES, type ChannelId, type Mods, type Phrase } from '../data/schema';
import { checkAll } from './conditions';
import { lineCost } from './interpret';
import { eachLine, NO_MEANING } from './lines';
import type { Carried, Channels, GameData, GameState } from './types';

/** 読み取れなかった文章が、世界整合性を下げる量。意味が伝わらない文章は、世界を何も変えない（使うのは文字数と書換の力だけ） */
export const NOISE_INCOHERENCE = 0;
/** 1行に概念をいくつも書くと、2つ目からひとつにつき世界が揺らぐ量 */
export const CROWD_INCOHERENCE = 4;
/** 書き換えた法則に、別の行から重ねて意味を書いたときの揺らぎ（同じものに2つの定義） */
export const STACK_INCOHERENCE = 6;

export function defaultChannels(): Channels {
  const ch = {} as Channels;
  for (const id of CHANNEL_IDS) ch[id] = CHANNEL_MODES[id] === 'mul' ? 1 : 0;
  return ch;
}

/** 係数に変化を重ねる。scale は副作用の育ち具合（1 で全部効く） */
export function applyMods(ch: Channels, mods: Mods, scale = 1): void {
  for (const id of CHANNEL_IDS) {
    const v = mods[id];
    if (v === undefined) continue;
    if (CHANNEL_MODES[id] === 'mul') ch[id] *= 1 + (v - 1) * scale;
    else ch[id] += v * scale;
  }
}

/** 今の法則の形でできているコンボ（内容の順に並べる） */
export function activeCombos(g: GameState, data: GameData): string[] {
  const out: string[] = [];
  for (const c of data.combos) if (checkAll(g, c.when, g.laws, [])) out.push(c.id);
  return out;
}

/** 同じ意味の法則の読み取りが世界にあって、重ねて効かない言い回しか */
export function covered(g: GameState, p: Phrase): boolean {
  return p.covers.length > 0 && p.covers.some((c) => checkAll(g, [c]));
}

/**
 * 世界で効いている「行が運ぶ意味」を、決まった順に1つずつ返す。
 * 同じ言い回しは最初の1行だけ、法則の読み取りと同じ意味の言い回しは効かない、同じ重ね書きは1つだけ
 */
export function activeMeanings(
  g: GameState,
  data: GameData,
): { lineId: string; phrases: Phrase[]; law: { id: string; option: string } | null }[] {
  const seenPhrase = new Set<string>();
  const seenLaw = new Set<string>();
  const out: { lineId: string; phrases: Phrase[]; law: { id: string; option: string } | null }[] = [];
  for (const { ref, carried } of eachLine(g, data)) {
    const phrases: Phrase[] = [];
    for (const id of carried.phrases) {
      const p = data.phraseById.get(id);
      if (!p || seenPhrase.has(id) || covered(g, p)) continue;
      seenPhrase.add(id);
      phrases.push(p);
    }
    let law = carried.law;
    if (law) {
      const key = `${law.id}.${law.option}`;
      // その法則の行の読み取りと同じなら、重ねても効かない
      if (seenLaw.has(key) || g.laws[law.id] === law.option || !data.optionOf.get(law.id)?.has(law.option)) law = null;
      else seenLaw.add(key);
    }
    if (phrases.length > 0 || law) out.push({ lineId: ref.id, phrases, law });
  }
  return out;
}

/** 今の世界の係数を組み立てる：ステージの環境 → 法則 → 行が運ぶ意味 → コンボ → 副作用 → 一時的な出来事 */
export function computeChannels(g: GameState, data: GameData): { ch: Channels; combos: string[] } {
  const ch = defaultChannels();
  const stage = data.stageById.get(g.stageId);
  if (stage) applyMods(ch, stage.mods);
  for (const law of data.laws) {
    const opt = data.optionOf.get(law.id)?.get(g.laws[law.id] ?? law.initial);
    if (opt) applyMods(ch, opt.mods);
  }
  for (const m of activeMeanings(g, data)) {
    for (const p of m.phrases) applyMods(ch, p.mods);
    if (m.law) applyMods(ch, data.optionOf.get(m.law.id)!.get(m.law.option)!.mods);
  }
  const combos = activeCombos(g, data);
  for (const id of combos) applyMods(ch, data.comboById.get(id)!.mods);
  for (const t of data.twists) {
    const level = g.twists[t.id] ?? 0;
    if (level > 0) applyMods(ch, t.mods, level);
  }
  for (const e of g.effects) applyMods(ch, e.mods);
  // 掛け算の係数が負にならないようにする
  for (const id of CHANNEL_IDS) if (CHANNEL_MODES[id] === 'mul' && ch[id] < 0) ch[id] = 0;
  return { ch, combos };
}

/** 行が運ぶ意味の「無理さ」（概念の無理さ、詰め込みすぎ、重ね書き） */
export function carriedIncoherence(data: GameData, c: Carried): number {
  let inc = 0;
  for (const id of c.phrases) inc += data.phraseById.get(id)?.incoherence ?? 0;
  inc += CROWD_INCOHERENCE * Math.max(0, c.phrases.length - 1);
  if (c.law) inc += (data.optionOf.get(c.law.id)?.get(c.law.option)?.incoherence ?? 0) + STACK_INCOHERENCE;
  return inc;
}

export type Written = Pick<GameState, 'laws' | 'texts' | 'understood' | 'extras' | 'carried'>;

/** WORLD.txt 全体の重さ（世界容量の消費）と、整合性を下げる量の合計 */
export function lawTotals(data: GameData, g: Written): { cost: number; incoherence: number } {
  let cost = 0;
  let incoherence = 0;
  for (const law of data.laws) {
    const c = g.carried[law.id] ?? NO_MEANING;
    cost += lineCost(data.phraseById, g.texts[law.id] ?? '', c.phrases);
    const opt = data.optionOf.get(law.id)?.get(g.laws[law.id] ?? law.initial);
    if (opt) incoherence += opt.incoherence;
    if (g.understood[law.id] === false) incoherence += NOISE_INCOHERENCE;
    incoherence += carriedIncoherence(data, c);
  }
  for (const line of g.extras) {
    const c = g.carried[line.id] ?? NO_MEANING;
    cost += lineCost(data.phraseById, line.text, c.phrases);
    incoherence += c.phrases.length > 0 || c.law ? carriedIncoherence(data, c) : NOISE_INCOHERENCE;
  }
  return { cost, incoherence };
}

export function channelKind(id: ChannelId): 'mul' | 'add' {
  return CHANNEL_MODES[id];
}

