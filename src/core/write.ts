import type { IconKey, Law, Phrase } from '../data/schema';
import { openConcepts, rankForDepth, rankOpening } from './access';
import { covered, lawTotals, type Written } from './channels';
import { addImpulse, discover, discoverTags, syncPhraseFlags, targetsNow } from './game';
import { canonical, interpretAsLaw, interpretLaw, lineCost, phraseName, matchPhrases, noiseOf, normalize, originalText, subjectWords, textCost, type AddedAsLaw } from './interpret';
import { NO_MEANING } from './lines';
import type { Carried, EditBlock, EditResult, ExtraLine, GameData, GameState, NoiseInfo } from './types';

/**
 * WORLD.txt を書き換える命令（行を書き換える・消す・書き足す・書き足した行を書き換える）。
 * どの命令も「書いたあとの WORLD.txt」を先に組み立て（plan）、世界容量を確かめてから書き込む。
 * 書き換え画面の世界容量の見積もり（costAfter）も同じ組み立てを使う。
 */

/** 書き換える場所 */
export type WriteTarget = { kind: 'law'; id: string } | { kind: 'line'; id: string } | { kind: 'new' };

/** 画面に出す形に整える（前後の空白を取り、文末に句点を付ける） */
export function sentence(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length === 0) return '';
  return /[。．.!！?？」]$/u.test(t) ? t : `${t}。`;
}

const NONE: EditResult = {
  block: null,
  understood: false,
  reading: null,
  shortage: 0,
  redirect: null,
  sameAs: null,
  replaced: false,
  stacked: null,
  noise: null,
};

/** 書き足した文章から読み取れる意味：言い回し（概念）、既存の行の書き換えとしての読み取り、読み取れなかった理由 */
interface Meanings {
  phrases: Phrase[];
  law: AddedAsLaw | null;
  noise: NoiseInfo | null;
}

/**
 * 言い回し集 → 既存の行の書き換え → あとで読む言い回し（願い・世界そのものへの命令）
 * → 種類ごとの読み取り（「猫がいなくなる」）の順に読む。
 * 種類ごとの読み取りは、ほかに何も読めなかったときだけ当てる（「服は存在しない」を「服を着なくなる」と重ねて読まない）。
 * exceptLaw：その行自身は「既存の行」として探さない
 */
function readMeanings(data: GameData, text: string, exceptLaw: string | null): Meanings {
  const specific = matchPhrases(data.phrases, text, false);
  const law = specific.length > 0 ? null : interpretAsLaw(data.laws, text, exceptLaw);
  const fallback = law ? [] : matchPhrases(data.phrases, text, true);
  const generic = law || specific.length > 0 || fallback.length > 0 ? [] : matchPhrases(data.phrases, text, true, true);
  const phrases = [...specific, ...fallback, ...generic];
  return { phrases, law, noise: phrases.length === 0 && !law ? noiseOf(text) : null };
}

function isEmptyCarried(c: Carried | undefined): boolean {
  return !c || (c.phrases.length === 0 && !c.law);
}

/** その言い回しを、指定した行のほかに運んでいる行があるか */
function carriedElsewhere(w: Written, phraseId: string, lineId: string | null): boolean {
  for (const [id, c] of Object.entries(w.carried)) if (id !== lineId && c.phrases.includes(phraseId)) return true;
  return false;
}

function lineOf(w: Written, data: GameData, phraseId: string, except: string | null): { kind: 'law' | 'line'; id: string } | null {
  for (const law of data.laws) if (law.id !== except && (w.carried[law.id]?.phrases ?? []).includes(phraseId)) return { kind: 'law', id: law.id };
  for (const x of w.extras) if (x.id !== except && (w.carried[x.id]?.phrases ?? []).includes(phraseId)) return { kind: 'line', id: x.id };
  return null;
}

/** 法則の行がまだ誰にも書き換えられていないか（元の文・元の意味・何も運んでいない） */
function untouched(g: GameState, data: GameData, lawId: string): boolean {
  const law = data.lawById.get(lawId)!;
  return (g.texts[lawId] ?? '') === originalText(law) && g.laws[lawId] === law.initial && isEmptyCarried(g.carried[lawId]);
}

interface Plan {
  block: EditBlock | null;
  result: EditResult;
  written: Written;
  /** 書き換えた法則の行（書き換えた年を残す） */
  laws: string[];
  /** 新しく書き足した行 */
  added: boolean;
  discoveries: string[];
  history: { icon: IconKey; text: string } | null;
}

function blockPlan(g: GameState, block: EditBlock, extra: Partial<EditResult> = {}): Plan {
  return {
    block,
    result: { ...NONE, ...extra, block },
    written: { laws: g.laws, texts: g.texts, understood: g.understood, extras: g.extras, carried: g.carried },
    laws: [],
    added: false,
    discoveries: [],
    history: null,
  };
}

function labels(data: GameData, lawId: string | null, base: string | null, c: Carried, text?: string): string[] {
  const out: string[] = [];
  if (lawId && base) {
    const law = data.lawById.get(lawId)!;
    if (base !== law.initial) out.push(data.optionOf.get(lawId)!.get(base)!.label);
  }
  for (const id of c.phrases) out.push(phraseName(data.phraseById.get(id)!.name, text));
  if (c.law) {
    const law = data.lawById.get(c.law.id)!;
    // 別の行の元の意味と同じ文（「作物は海では育たない」→「植物は水と光と二酸化炭素で育つ」と同じ）
    out.push(c.law.option === law.initial ? `「${originalText(law).replace(/。$/u, '')}」と同じ` : data.optionOf.get(c.law.id)!.get(c.law.option)!.label);
  }
  return out;
}

function carriedOf(m: { phrases: Phrase[]; law: AddedAsLaw | null }): Carried {
  return { phrases: m.phrases.map((p) => p.id), law: m.law ? { id: m.law.law.id, option: m.law.optionId } : null };
}

function discoveriesOf(lawId: string | null, base: string | null, initial: string | null, c: Carried): string[] {
  const out: string[] = [];
  if (lawId && base && base !== initial) out.push(`r:${lawId}.${base}`);
  for (const id of c.phrases) out.push(`p:${id}`);
  if (c.law) out.push(`r:${c.law.id}.${c.law.option}`);
  return out;
}

/** 既存の行を書き換える（空にすると消す）ときの、書いたあとの WORLD.txt */
function planLaw(g: GameState, data: GameData, lawId: string, raw: string): Plan {
  const law = data.lawById.get(lawId)!;
  const before = g.texts[lawId] ?? '';
  const next = sentence(raw);
  if (normalize(next) === normalize(before)) return blockPlan(g, 'same', { understood: true });
  let base = g.laws[lawId]!;
  let understood = true;
  let carried: Carried = NO_MEANING;
  let replaced = false;
  let noise: NoiseInfo | null = null;
  if (next === '') {
    base = law.options.find((o) => o.kind === 'delete')!.id;
  } else {
    const r = interpretLaw(law, next);
    if (r.understood) {
      // その行の意味として読めた。同じ文に書いた新しい概念も運ぶ（「人間は数日に一度食べ、空を飛べる」）
      base = r.optionId;
      carried = { phrases: matchPhrases(data.phrases, next, false).map((p) => p.id), law: null };
    } else {
      const m = readMeanings(data, next, lawId);
      if (m.phrases.length > 0 || m.law) {
        // まったく別の話に書き換えた：元の定義は世界から消え、新しい意味がその行に宿る。
        // ただし新しい概念がその行の法則を前提にしている（太陽が二つ → 太陽は照らす）なら、元の意味は残る
        const keeps = m.phrases.some((p) => p.keeps.includes(lawId)) || subjectKept(law, next, m);
        if (!keeps) {
          base = law.options.find((o) => o.kind === 'delete')!.id;
          replaced = true;
        }
        carried = carriedOf(m);
      } else {
        understood = false;
        noise = m.noise;
      }
    }
  }
  const written: Written = {
    laws: { ...g.laws, [lawId]: base },
    texts: { ...g.texts, [lawId]: next },
    understood: { ...g.understood, [lawId]: understood },
    extras: g.extras,
    carried: { ...g.carried, [lawId]: dedupe(g, carried, lawId) },
  };
  const c = written.carried[lawId]!;
  const history = next === '' ? `「${before}」を削除` : before === '' ? `「${next}」を書き戻した` : `「${before}」→「${next}」`;
  const reading = understood ? labels(data, lawId, base, c, next) : [];
  return {
    block: null,
    result: { ...NONE, understood, reading: reading.length > 0 ? reading.join('・') : null, replaced, noise },
    written,
    laws: [lawId],
    added: false,
    discoveries: understood ? discoveriesOf(lawId, base, law.initial, c) : [],
    history: { icon: data.conceptById.get(law.concept)!.icon, text: history },
  };
}

/**
 * 書き換えた文が、その行の主語についての話のままか。
 * 主語の同じ文（「人間は毎日食事を必要とする」→「人間は空を飛べる」）は、元の行の意味を残して意味を足す。
 * 主語の違う文（「争いは戦争になりうる」→「人間は空を飛べる」）は、元の定義が消えて新しい定義になる
 */
function subjectKept(law: Law, text: string, m: Meanings): boolean {
  const t = canonical(text);
  const subjects = subjectWords(law).filter((w) => w.length >= 2);
  return subjects.some((w) => t.includes(w)) && m.phrases.every((p) => p.keeps.length === 0 || p.keeps.includes(law.id));
}

/** ほかの行がすでに運んでいる言い回しは、この行では運ばない（同じ意味を重ねない） */
function dedupe(g: GameState, c: Carried, lineId: string): Carried {
  return { phrases: c.phrases.filter((id) => !carriedElsewhere(g, id, lineId)), law: c.law };
}

/** 書き足した文章（新しい行、または書き足した行の書き換え）の、書いたあとの WORLD.txt */
function planLine(g: GameState, data: GameData, lineId: string | null, raw: string): Plan {
  const old = lineId ? g.extras.find((e) => e.id === lineId)! : null;
  const next = sentence(raw);
  if (old && normalize(next) === normalize(old.text)) return blockPlan(g, 'same', { understood: true });
  if (next === '') {
    if (!old) return blockPlan(g, 'empty');
    const carried = { ...g.carried };
    delete carried[old.id];
    return {
      block: null,
      result: { ...NONE, understood: true },
      written: { laws: g.laws, texts: g.texts, understood: g.understood, extras: g.extras.filter((e) => e.id !== old.id), carried },
      laws: [],
      added: false,
      discoveries: [],
      history: { icon: 'edit', text: `「${old.text}」を削除` },
    };
  }
  // この行が今運んでいる意味は、重なりを調べるときに数えない
  const others: Carried[] = Object.entries(g.carried)
    .filter(([id]) => id !== lineId)
    .map(([, c]) => c);
  const m = readMeanings(data, next, null);
  const id = old?.id ?? `x${g.nextExtra}`;
  const withoutOld = { ...g.carried };
  if (old) delete withoutOld[old.id];
  const extrasWithout = old ? g.extras.filter((e) => e.id !== old.id) : g.extras;

  if (m.law) {
    const b = m.law.law;
    const opt = m.law.optionId;
    const effective = [g.laws[b.id]!, ...others.filter((c) => c.law?.id === b.id).map((c) => c.law!.option)];
    if (effective.includes(opt)) {
      return blockPlan(g, 'redundant', { understood: true, reading: labels(data, null, null, { phrases: [], law: { id: b.id, option: opt } }).join('・'), sameAs: { kind: 'law', id: b.id } });
    }
    if (untouched(g, data, b.id) || (g.texts[b.id] ?? '') === '') {
      // まだ誰も書き換えていない行（または消した行）の話なら、その行の書き換えとして読む。書き足した行はその行に溶け込む
      const before = g.texts[b.id] ?? '';
      const written: Written = {
        laws: { ...g.laws, [b.id]: opt },
        texts: { ...g.texts, [b.id]: next },
        understood: { ...g.understood, [b.id]: true },
        extras: extrasWithout,
        carried: withoutOld,
      };
      const history = before === '' ? `「${next}」を書き戻した` : old ? `「${old.text}」→「${next}」` : `「${before}」→「${next}」`;
      return {
        block: null,
        result: { ...NONE, understood: true, reading: labels(data, b.id, opt, NO_MEANING).join('・') || null, redirect: b.id },
        written,
        laws: [b.id],
        added: false,
        discoveries: opt !== b.initial ? [`r:${b.id}.${opt}`] : [],
        history: { icon: data.conceptById.get(b.concept)!.icon, text: history },
      };
    }
    // すでに書き換えた行と同じものについて、別の意味を書き足した：重ね書き（同じものに2つの定義があり、世界は少し揺らぐ）
    const carried: Carried = { phrases: [], law: { id: b.id, option: opt } };
    return linePlan(g, data, old, id, next, carried, extrasWithout, withoutOld, { stacked: b.id });
  }

  if (m.phrases.length > 0) {
    const fresh = m.phrases.filter((p) => !others.some((c) => c.phrases.includes(p.id)) && !covered(g, p));
    if (fresh.length === 0) {
      const p = m.phrases[0]!;
      const holder = lineOf({ ...g, carried: withoutOld }, data, p.id, lineId);
      const sameAs = holder ?? coveringLaw(data, p);
      return blockPlan(g, 'redundant', { understood: true, reading: p.name, sameAs });
    }
    return linePlan(g, data, old, id, next, { phrases: fresh.map((p) => p.id), law: null }, extrasWithout, withoutOld, {});
  }

  // 読み取れない一文：意味が伝わらず、世界は何も変わらない（文字数だけを使う）
  return linePlan(g, data, old, id, next, NO_MEANING, extrasWithout, withoutOld, { noise: m.noise });
}

function coveringLaw(data: GameData, p: Phrase): { kind: 'law'; id: string } | null {
  const m = /^law:([\w]+)/.exec(p.covers[0] ?? '');
  return m && data.lawById.has(m[1]!) ? { kind: 'law', id: m[1]! } : null;
}

function linePlan(
  g: GameState,
  data: GameData,
  old: ExtraLine | null,
  id: string,
  next: string,
  carried: Carried,
  extrasWithout: ExtraLine[],
  withoutOld: Record<string, Carried>,
  extra: Partial<EditResult>,
): Plan {
  const line: ExtraLine = { id, text: next, year: old?.year ?? g.year };
  const extras = old ? g.extras.map((e) => (e.id === old.id ? line : e)) : [...extrasWithout, line];
  const understood = carried.phrases.length > 0 || !!carried.law;
  const reading = labels(data, null, null, carried, next);
  const icon: IconKey = carried.phrases[0] ? data.phraseById.get(carried.phrases[0])!.icon : 'edit';
  return {
    block: null,
    result: { ...NONE, understood, reading: reading.length > 0 ? reading.join('・') : null, ...extra },
    written: { laws: g.laws, texts: g.texts, understood: g.understood, extras, carried: understood ? { ...withoutOld, [id]: carried } : withoutOld },
    laws: [],
    added: !old,
    discoveries: discoveriesOf(null, null, null, carried),
    history: { icon, text: old ? `「${old.text}」→「${next}」` : `「${next}」を書き足した` },
  };
}

function blocked(g: GameState): EditBlock | null {
  if (g.status !== 'playing') return 'ended';
  if (g.edits.left <= 0) return 'no-edits';
  return null;
}

/**
 * 筆の位で書けない書き換えを止める：封じられた行（書き足した文が溶け込む行・重ねて書く行も）、
 * 余白のない書き足し、いまの筆には重すぎる概念。止めたときは書換の力も世界容量も使わない
 */
function guard(g: GameState, data: GameData, plan: Plan, text: string): Plan {
  const a = g.access;
  if (!a || plan.block) return plan;
  const open = openConcepts(g, data)!;
  for (const id of [...plan.laws, ...(plan.result.stacked ? [plan.result.stacked] : [])]) {
    const law = data.lawById.get(id);
    if (law && !open.has(law.concept)) return blockPlan(g, 'sealed', { sealed: { law: id, rank: rankOpening(data, law.concept) } });
  }
  if (plan.added && a.margin !== null && g.extras.length >= a.margin) return blockPlan(g, 'margin');
  if (a.depth !== null) {
    for (const d of plan.discoveries) {
      const p = d.startsWith('p:') ? data.phraseById.get(d.slice(2)) : undefined;
      if (p && p.incoherence > a.depth) return blockPlan(g, 'heavy', { heavy: { name: phraseName(p.name, sentence(text)), rank: rankForDepth(data, p.incoherence) } });
    }
  }
  return plan;
}

/** 書いたあとの WORLD.txt を組み立てる（世界はまだ変えない） */
export function planWrite(g: GameState, data: GameData, target: WriteTarget, text: string): Plan {
  if (target.kind === 'law') {
    if (!data.lawById.has(target.id)) return blockPlan(g, 'unknown');
    const b = blocked(g);
    return b ? blockPlan(g, b) : guard(g, data, planLaw(g, data, target.id, text), text);
  }
  if (target.kind === 'line' && !g.extras.some((e) => e.id === target.id)) return blockPlan(g, 'unknown');
  const b = blocked(g);
  if (b) return blockPlan(g, b);
  return guard(g, data, planLine(g, data, target.kind === 'line' ? target.id : null, text), text);
}

/** 書き換えたあとの WORLD.txt が上限を何だけ超えるか。軽くなる書き換えはいつでもできる */
function shortageAfter(g: GameState, data: GameData, next: Written): number {
  const before = lawTotals(data, g).cost;
  const after = lawTotals(data, next).cost;
  if (after <= before) return 0;
  return Math.max(0, after - g.sim.capacityMax);
}

/** 書き換える。書換の力を1つ使う（書けなかったときは使わない） */
export function write(g: GameState, data: GameData, target: WriteTarget, text: string): EditResult {
  const plan = planWrite(g, data, target, text);
  if (plan.block) return plan.result;
  const shortage = shortageAfter(g, data, plan.written);
  if (shortage > 0) return { ...plan.result, block: 'capacity', shortage };
  // 書き換えの勢い：書き換える前と後で、ゆっくり動く量の向かう先がどれだけ動いたか（次の1年に届ける）
  const before = targetsNow(g, data);
  const w = plan.written;
  g.laws = w.laws;
  g.texts = w.texts;
  g.understood = w.understood;
  g.extras = w.extras;
  g.carried = w.carried;
  for (const id of plan.laws) g.lawYear[id] = g.year;
  if (plan.added) g.nextExtra += 1;
  for (const id of plan.discoveries) discover(g, id);
  commit(g, data, plan.history!);
  addImpulse(g, before, targetsNow(g, data));
  return plan.result;
}

/**
 * 書き換えを世界に刻む。世界の様子（食料や人口など）は、時間を進めるまで計算し直さない
 * （書き換えただけで結果が見えないように。世界容量と整合性の元になる重さだけは、すぐ変わる）
 */
function commit(g: GameState, data: GameData, history: { icon: IconKey; text: string }): void {
  g.edits.left -= 1;
  g.edits.used += 1;
  g.stats.edits += 1;
  g.history.push({ year: g.year, kind: 'edit', icon: history.icon, text: history.text, why: null, severity: 'info', cause: null });
  syncPhraseFlags(g, data);
  const t = lawTotals(data, g);
  g.derived = { ...g.derived, capacityUsed: t.cost, capacityRatio: t.cost / Math.max(1, g.sim.capacityMax), incoherence: t.incoherence };
  discoverTags(g, data);
}

// ---------------------------------------------------------------- 命令（呼びやすい形）

/** 既存の法則の文章を書き換える（空にすると削除） */
export function rewriteLaw(g: GameState, data: GameData, lawId: string, text: string): EditResult {
  return write(g, data, { kind: 'law', id: lawId }, text);
}

/** 新しい一文を書き足す。既存の行と同じものについての文なら、その行の書き換えとして読む */
export function addLine(g: GameState, data: GameData, text: string): EditResult {
  return write(g, data, { kind: 'new' }, text);
}

/** 書き足した一文を書き換える（空にすると消す） */
export function rewriteLine(g: GameState, data: GameData, lineId: string, text: string): EditResult {
  return write(g, data, { kind: 'line', id: lineId }, text);
}

/** この文章で書き換えたら、WORLD.txt 全体の重さ（世界容量の消費）がいくつになるか（命令と同じ組み立て） */
export function costAfter(g: GameState, data: GameData, target: WriteTarget, text: string): number {
  const plan = planWrite(g, data, target, text);
  return lawTotals(data, plan.block ? g : plan.written).cost;
}

/** 入力中の文章の重さ（文章の長さと、読み取れる概念の重さ） */
export function weightOf(data: GameData, text: string, isLine: boolean): number {
  const s = sentence(text);
  if (!isLine) return textCost(s) + matchPhrases(data.phrases, s, false).reduce((n, p) => n + p.weight, 0);
  const specific = matchPhrases(data.phrases, s, false);
  const fallback = specific.length > 0 ? [] : matchPhrases(data.phrases, s, true);
  const phrases = specific.length > 0 ? specific : fallback.length > 0 ? fallback : matchPhrases(data.phrases, s, true, true);
  return lineCost(
    data.phraseById,
    s,
    phrases.map((p) => p.id),
  );
}
