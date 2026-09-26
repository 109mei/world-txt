import { CHANNEL_IDS, CHANNEL_MODES, type ChannelId, type Mods, type Phrase, type ReadMode } from '../data/schema';
import { checkAll } from './conditions';
import { lineCost } from './interpret';
import { eachLine, NO_MEANING } from './lines';
import { balanceFor, introOf } from './intro';
import { hoarding, trustFactor } from './people';
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

/** 係数に変化を重ねる。scale は副作用の育ち具合・書いた文の言い切りの強さ（1 でそのまま効く） */
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
  // 原因の型の環境
  const cause = stage?.causes.find((c) => c.id === g.cause);
  if (cause) applyMods(ch, cause.mods);
  // 改稿者の試練：重なる2つ目の型の環境
  const cause2 = g.trial?.cause2 ? stage?.causes.find((c) => c.id === g.trial!.cause2) : undefined;
  if (cause2) applyMods(ch, cause2.mods);
  // 書いた行の意味は、その文の言い切りの強さだけ強く（控えめな文なら弱く）効き、年とともに世界が慣れて効きが落ちる
  const strength = (lineId: string) => g.strength?.[lineId] ?? 1;
  for (const law of data.laws) {
    const opt = data.optionOf.get(law.id)?.get(g.laws[law.id] ?? law.initial);
    if (!opt) continue;
    const adapts = opt.kind !== 'original' && !!data.conceptById.get(law.concept)?.adapt;
    const onset = opt.kind === 'original' ? 1 : onsetFactor(g, law.id, delayOf(data, law.concept, null));
    applyMods(ch, opt.mods, strength(law.id) * (adapts ? adaptFactor(g, data, law.id) : 1) * onset);
  }
  for (const m of activeMeanings(g, data)) {
    for (const p of m.phrases) {
      const onset = onsetFactor(g, m.lineId, delayOf(data, null, p.id));
      applyMods(ch, p.mods, strength(m.lineId) * (p.adapt ? adaptFactor(g, data, m.lineId) : 1) * modeFactor(g, data, m.lineId, p) * onset);
    }
    if (m.law) {
      const concept = data.lawById.get(m.law.id)?.concept ?? '';
      const adapts = !!data.conceptById.get(concept)?.adapt;
      const onset = onsetFactor(g, m.lineId, delayOf(data, concept, null));
      applyMods(ch, data.optionOf.get(m.law.id)!.get(m.law.option)!.mods, strength(m.lineId) * (adapts ? adaptFactor(g, data, m.lineId) : 1) * onset);
    }
  }
  const combos = activeCombos(g, data);
  for (const id of combos) applyMods(ch, data.comboById.get(id)!.mods);
  for (const t of data.twists) {
    const level = g.twists[t.id] ?? 0;
    if (level > 0) applyMods(ch, t.mods, level);
  }
  for (const e of g.effects) applyMods(ch, e.mods);
  // 先行きの不安が線を超え、信頼が低いと、買いだめで物の流れが細る（予言の自己成就）
  if (g.sim && hoarding(g.sim, data.balance)) ch.distribution *= 1 - balanceFor(g, data).people.anxiety.hoardHit;
  // 掛け算の係数が負にならないようにする
  for (const id of CHANNEL_IDS) if (CHANNEL_MODES[id] === 'mul' && ch[id] < 0) ch[id] = 0;
  return { ch, combos };
}

/** 効き始めまでの遅れ（年）：書き足す仕組みごと、なければ行の概念ごと（balance.delays） */
export function delayOf(data: GameData, concept: string | null, phrase: string | null): number {
  const d = data.balance.delays;
  if (phrase !== null && d.phrases[phrase] !== undefined) return d.phrases[phrase]!;
  return concept !== null ? (d.concepts[concept] ?? 0) : 0;
}

/** 書いてから遅れの年数がたつまで、意味はまだ効かない（書いていない行は、ずっと効いている。遅れを紹介する前は、遅れも短い） */
export function onsetFactor(g: Pick<GameState, 'lawYear' | 'extras' | 'year' | 'intro'>, lineId: string, delay: number): number {
  const d = Math.round(delay * introOf(g, 'delay'));
  if (d <= 0) return 1;
  const at = writtenYear(g, lineId);
  return at === null || g.year - at >= d ? 1 : 0;
}

/** 効き始めまで、あと何年か（効いていれば 0） */
export function onsetLeft(g: Pick<GameState, 'lawYear' | 'extras' | 'year' | 'intro'>, lineId: string, delay: number): number {
  const at = writtenYear(g, lineId);
  const d = Math.round(delay * introOf(g, 'delay'));
  return at === null ? 0 : Math.max(0, d - (g.year - at));
}

/** 人の振る舞いの言い回しが、その行でどう読まれたか（性質・制度・条件つき）。読み分けない言い回しは null */
export function lineMode(g: Pick<GameState, 'modes'>, lineId: string, p: Phrase): ReadMode | null {
  if (!p.mode) return null;
  return g.modes?.[lineId] ?? p.mode;
}

/**
 * 書き方の読み分けの効き方（balance.modes）：
 * 性質は考え方が広がった割合の分だけ効き（S字で広がる）、国家の行がなくても効く。制度は翌年から効くが、国家の行が消えている年・
 * 空白の年は効かず、信頼が低いと形だけ守られる。
 * 条件つきは、足りない年・揺らいだ年（条件を満たした年）だけ、小さく効く
 */
export function modeFactor(g: GameState, data: GameData, lineId: string, p: Phrase): number {
  const mode = lineMode(g, lineId, p);
  if (mode === null) return 1;
  const b = data.balance.modes;
  if (mode === 'nature') {
    // 性質は、考え方が広がった割合の分だけ効く（書いた年は、まだ一部の人の考え）
    const at = writtenYear(g, lineId);
    if (at === null) return 1;
    // 考え方の広がりを紹介する前は、広がりの仕組みを弱く動かす
    const spread = g.spread?.[lineId] ?? data.balance.people.spread.seed;
    return 1 - introOf(g, 'spread') * (1 - spread);
  }
  // 制度は、国家の行がない世界では効かず、信頼が低いと形だけ守られる
  if (mode === 'rule') return isGone(data, g, 'nation') ? 0 : trustFactor(g.sim, balanceFor(g, data));
  const d = g.derived;
  const need = !d || Math.min(d.foodRatio, d.waterRatio, d.energyRatio) < b.needBelow.supply || g.sim.stability < b.needBelow.stability;
  return need ? b.conditionalScale : 0;
}

/** その行を書いた年（法則の行は書き換えた年、書き足した行は書いた年。書いていなければ null） */
export function writtenYear(g: Pick<GameState, 'lawYear' | 'extras'>, lineId: string): number | null {
  const y = g.lawYear?.[lineId];
  if (y !== undefined) return y;
  return g.extras?.find((x) => x.id === lineId)?.year ?? null;
}

/**
 * 世界の適応：書いてから balance.adapt.after 年たつと効きが落ち始め、span 年かけて floor 倍まで落ちる。
 * 書き直せば、また書いた年から数える（書換の力と上書きの傷がかかる）
 */
export function adaptFactor(g: Pick<GameState, 'lawYear' | 'extras' | 'year'>, data: GameData, lineId: string): number {
  const at = writtenYear(g, lineId);
  if (at === null) return 1;
  const a = data.balance.adapt;
  const t = Math.min(1, Math.max(0, (g.year - at - a.after) / a.span));
  return 1 - (1 - a.floor) * t;
}

/** 行が運ぶ意味の「無理さ」（概念の無理さ、詰め込みすぎ、重ね書き） */
export function carriedIncoherence(data: GameData, c: Carried): number {
  let inc = 0;
  for (const id of c.phrases) inc += data.phraseById.get(id)?.incoherence ?? 0;
  inc += CROWD_INCOHERENCE * Math.max(0, c.phrases.length - 1);
  if (c.law) inc += (data.optionOf.get(c.law.id)?.get(c.law.option)?.incoherence ?? 0) + STACK_INCOHERENCE;
  return inc;
}

export type Written = Pick<GameState, 'laws' | 'texts' | 'understood' | 'extras' | 'carried'> & { scars?: Record<string, number>; rewrites?: Record<string, number> };

/** その行が、消したときの意味になっているか（空白の行も、打ち消して書いた行も） */
function isGone(data: GameData, g: Written, lawId: string): boolean {
  return data.optionOf.get(lawId)?.get(g.laws[lawId] ?? '')?.kind === 'delete';
}

/**
 * WORLD.txt 全体の重さ（世界容量の消費）と、整合性を下げる量の合計。
 * 空白の行は消し跡の字数を使い、支えている行が消えていると、頼っている行の分だけ世界が揺らぐ
 */
/** 1つの法則の行の重さ（使える文字数の消費）：文の字数と、行が運ぶ新しい概念の重さ。空の行は消し跡 */
export function lawLineCost(data: GameData, g: Written, lawId: string): number {
  const c = g.carried[lawId] ?? NO_MEANING;
  const text = g.texts[lawId] ?? '';
  return lineCost(data.phraseById, text, c.phrases) + (text === '' ? (g.scars?.[lawId] ?? 0) : 0);
}

export function lawTotals(data: GameData, g: Written): { cost: number; incoherence: number } {
  let cost = 0;
  let incoherence = 0;
  const unsupported = data.balance.voids.supportIncoherence;
  for (const law of data.laws) {
    const c = g.carried[law.id] ?? NO_MEANING;
    cost += lawLineCost(data, g, law.id);
    const opt = data.optionOf.get(law.id)?.get(g.laws[law.id] ?? law.initial);
    if (opt) incoherence += opt.incoherence;
    if (g.understood[law.id] === false) incoherence += NOISE_INCOHERENCE;
    incoherence += carriedIncoherence(data, c);
    if (law.supports.length > 0 && isGone(data, g, law.id)) for (const d of law.supports) if (!isGone(data, g, d)) incoherence += unsupported;
    incoherence += overwriteScar(data, g, law.id);
  }
  for (const line of g.extras) {
    const c = g.carried[line.id] ?? NO_MEANING;
    cost += lineCost(data.phraseById, line.text, c.phrases);
    incoherence += c.phrases.length > 0 || c.law ? carriedIncoherence(data, c) : NOISE_INCOHERENCE;
    incoherence += overwriteScar(data, g, line.id);
  }
  return { cost, incoherence };
}

/** 上書きの傷：同じ行を2度目から書き直した回数だけ、世界が揺らぐ */
function overwriteScar(data: GameData, g: Written, lineId: string): number {
  const n = g.rewrites?.[lineId] ?? 0;
  return n > 1 ? (n - 1) * data.balance.overwrite.incoherence : 0;
}

export function channelKind(id: ChannelId): 'mul' | 'add' {
  return CHANNEL_MODES[id];
}

