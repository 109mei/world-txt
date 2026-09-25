import {
  CHANNEL_MODES,
  IMPULSE_KEYS,
  INDICATOR_IDS,
  type Crisis,
  type Ending,
  type EventDef,
  type EventEffects,
  type IconKey,
  type ImpulseKey,
  type IndicatorId,
  type StageId,
  type StateEffectKey,
  type TwistRef,
} from '../data/schema';
import { activeMeanings, carriedIncoherence, computeChannels, lawTotals, NOISE_INCOHERENCE } from './channels';
import { checkAll, checkCondition, parseCondition } from './conditions';
import { capacityLevel, coherenceLevel, computeScores, indicatorLevel, trendOf } from './indicators';
import { originalText, phraseName } from './interpret';
import { carriesPhrase, eachLine, lineWithPhrase, NO_MEANING, type LineRef } from './lines';
import { clamp } from './math';
import { measure, simulateYear, targetsOf } from './model';
import { nextRandom, seedRng } from './rng';
import { activeTags } from './summary';
import type { CauseRef, Channels, FailReason, GameData, GameState, HistoryEntry, IndicatorChange, IndicatorMove, NewsItem, SimState, StepReport, WorldSnapshot, WriteAccess } from './types';

/**
 * GameState の形の版（セーブの版とは別）。3：行が運ぶ意味（carried）。4：無限の世界の危機と今日の世界。5：結末（ending）。6：心・物価・くり返す世界。
 * 7：去年効いていた意味（inEffect）と書き換えの勢い（impulse）。8：書き換えられる範囲（access。筆の位）
 */
export const STATE_SCHEMA = 8;

export const FAIL_TEXT: Record<FailReason, string> = {
  humanity: '人類の多くが失われ、文明を支えられなくなった。',
  civilization: '文明が崩壊した。',
  coherence: '世界整合性が崩壊し、世界は意味を失った。',
  capacity: '世界容量が限界を超え、世界を維持できなくなった。',
};

function option(data: GameData, lawId: string, optionId: string) {
  return data.optionOf.get(lawId)?.get(optionId);
}

function stageOf(data: GameData, id: StageId) {
  const st = data.stageById.get(id);
  if (!st) throw new Error(`知らないステージ: ${id}`);
  return st;
}

/** 状態を測り直す（法則を書き換えたあとなど） */
export function refresh(g: GameState, data: GameData): Channels {
  const { ch, combos } = computeChannels(g, data);
  g.combos = combos;
  const t = lawTotals(data, g);
  g.derived = measure(g.sim, ch, data.balance, g.startPop, t.cost, t.incoherence);
  return ch;
}

/** 古い形の GameState（セーブ）に、あとから足した項目を補う */
export function upgradeState(g: GameState, data: GameData): GameState {
  if (!Array.isArray(g.found)) g.found = [];
  if (!g.trace || !Array.isArray(g.trace.pop) || !Array.isArray(g.trace.civ)) g.trace = { pop: [], civ: [] };
  // 版2まで：書き足した行の読み取りは extras[].phrase にあった
  if (!g.carried || typeof g.carried !== 'object') g.carried = {};
  for (const x of g.extras) {
    if (x.phrase && !g.carried[x.id]) g.carried[x.id] = { phrases: [x.phrase], law: null };
    delete x.phrase;
  }
  // 版3まで：危機（無限の世界）と今日の世界はなかった
  if (g.crisis === undefined) g.crisis = null;
  if (typeof g.nextCrisis !== 'number') g.nextCrisis = -1;
  if (!g.crises || typeof g.crises !== 'object') g.crises = { averted: 0, softened: 0, struck: 0 };
  if (g.daily === undefined) g.daily = null;
  // 版4まで：結末はなかった（終わった世界は、ふつうの終わり方として補う）
  if (g.ending === undefined) g.ending = g.status === 'playing' ? null : g.status === 'cleared' ? 'clear' : g.failReason;
  if (!g.endingYears || typeof g.endingYears !== 'object') g.endingYears = {};
  // 版5まで：世界容量は「重さ」で数えていた（初めの WORLD.txt が重さ93・552文字なので、空きを保って文字数に直す）
  if (typeof g.schema === 'number' && g.schema < 6) g.sim.capacityMax = g.sim.capacityMax * data.balance.capacity.legacyChars - data.balance.capacity.legacyShift;
  // 版5まで：心・物価・くり返す世界はなかった（ふだんの心、はじめの物価として補う）
  if (typeof g.sim.mind !== 'number' || !Number.isFinite(g.sim.mind)) g.sim.mind = data.balance.mind.base;
  if (typeof g.sim.prices !== 'number' || !Number.isFinite(g.sim.prices)) g.sim.prices = 1;
  if (g.loop === undefined) g.loop = null;
  // 版6まで：去年効いていた意味と、書き換えの勢いはなかった
  if (!Array.isArray(g.inEffect)) g.inEffect = meaningKeys(meaningsInEffect(g, data));
  if (!g.impulse || typeof g.impulse !== 'object') g.impulse = {};
  // 版7まで：書き換えられる範囲はなかった（それまでの世界は、すべて書き換えられるまま遊べる）
  if (g.access === undefined) g.access = null;
  // 画面の項目が増えたときは、足りない項目の点数だけを今の様子から求める
  if (g.derived && INDICATOR_IDS.some((id) => typeof g.scores?.[id] !== 'number')) {
    const now = computeScores(g.sim, { ...g.derived, money: g.derived.money ?? 1 }, data.balance, g.startPop);
    g.scores = { ...now, ...g.scores };
    g.prevScores = { ...now, ...g.prevScores };
  }
  g.schema = STATE_SCHEMA;
  return g;
}

/** 言い回しの立てる印（地震が起きない など）を、今どこかの行がその言い回しを運んでいるかに合わせる */
export function syncPhraseFlags(g: GameState, data: GameData): void {
  for (const p of data.phrases) {
    if (!p.setFlag) continue;
    if (carriesPhrase(g, p.id)) g.flags[p.setFlag] = true;
    else delete g.flags[p.setFlag];
  }
}

/** 年ごとの人口と文明を記録する（セーブが大きくならないよう丸める） */
function traceYear(g: GameState): void {
  g.trace.pop.push(Math.round(g.sim.pop * 10) / 10);
  g.trace.civ.push(Math.round(g.derived.civ));
}

/** 観測記録に残す（同じものは一度だけ） */
export function discover(g: GameState, id: string): void {
  if (!g.found.includes(id)) g.found.push(id);
}

export function discoverTags(g: GameState, data: GameData): void {
  for (const t of activeTags(g, data)) discover(g, `g:${t.id}`);
}

/**
 * 新しい世界を作る。access は書き換えられる範囲（筆の位。core の accessFor で作る）。
 * 渡さなければ、すべての行と概念を自由に書き換えられる（シミュレーターやテストの世界）
 */
export function createGame(data: GameData, stageId: StageId, seed: number, access: WriteAccess | null = null): GameState {
  const stage = stageOf(data, stageId);
  const laws: Record<string, string> = {};
  const texts: Record<string, string> = {};
  const understood: Record<string, boolean> = {};
  for (const law of data.laws) {
    laws[law.id] = stage.overrides[law.id] ?? law.initial;
    texts[law.id] = originalText(law);
    understood[law.id] = true;
  }
  const sim: SimState = { ...stage.start, blight: 0, foodStock: 0, war: 0, coherence: 100, capacityMax: stage.capacity, mind: data.balance.mind.base, prices: 1 };
  const g: GameState = {
    schema: STATE_SCHEMA,
    seed,
    rng: seedRng(seed),
    stageId,
    year: 0,
    status: 'playing',
    failReason: null,
    startPop: stage.start.pop,
    sim,
    derived: null as never,
    scores: {} as Record<IndicatorId, number>,
    prevScores: {} as Record<IndicatorId, number>,
    prevMeta: { capacityRatio: 0, coherence: 100, civ: 0 },
    texts,
    laws,
    understood,
    extras: [],
    carried: {},
    nextExtra: 1,
    lawYear: {},
    edits: { left: stage.edits.start, used: 0, nextAt: stage.edits.every },
    twists: {},
    twistAge: {},
    effects: [],
    flags: {},
    fired: {},
    combos: [],
    counters: { civLow: 0, capOver: 0, peaceYears: 0, warCooldown: 0, warYears: 0 },
    history: [],
    report: null,
    stats: { edits: 0, wars: 0, anomalies: 0, minPop: stage.start.pop, maxPop: stage.start.pop },
    found: [],
    trace: { pop: [], civ: [] },
    crisis: null,
    nextCrisis: stage.endless ? data.balance.crisis.firstAt : -1,
    crises: { averted: 0, softened: 0, struck: 0 },
    daily: null,
    ending: null,
    endingYears: {},
    loop: null,
    inEffect: [],
    impulse: {},
    access: access ? { ...access, concepts: [...access.concepts] } : null,
  };
  // はじまりの世界（ステージの形を含む）は、もう効いている
  g.inEffect = meaningKeys(meaningsInEffect(g, data));
  refresh(g, data);
  g.sim.coherence = clamp(100 - g.derived.incoherence, 0, 100);
  refresh(g, data);
  g.scores = computeScores(g.sim, g.derived, data.balance, g.startPop);
  // 最初の変化の向きは「このまま1年進んだらどうなるか」から決める
  const next = projectScores(g, data, 1);
  for (const id of INDICATOR_IDS) g.prevScores[id] = 2 * g.scores[id] - next[id];
  g.prevMeta = { capacityRatio: g.derived.capacityRatio, coherence: g.sim.coherence, civ: g.derived.civ };
  g.history.push({ year: 0, kind: 'start', icon: stage.icon, text: `MISSION：${stage.mission}`, why: null, severity: 'info', cause: null });
  traceYear(g);
  // くり返す世界：巻き戻る先は、はじまりの年の世界
  if (stage.loop) g.loop = { start: 0, snapshot: worldSnapshot(g), count: 0, done: false };
  return g;
}

// ---------------------------------------------------------------- 原因（どの行から来たか）

type Source = LineRef;

/** 行の今の文章を、原因として示す形にする。プレイヤーが書き換えていない行は原因にしない */
function causeOf(g: GameState, data: GameData, src: Source): CauseRef | null {
  if (src.kind === 'line') {
    const line = g.extras.find((e) => e.id === src.id);
    return line ? { text: line.text, deleted: false, year: line.year } : null;
  }
  const law = data.lawById.get(src.id);
  const year = g.lawYear[src.id];
  if (!law || year === undefined) return null;
  const text = g.texts[src.id] ?? '';
  return text === '' ? { text: originalText(law), deleted: true, year } : { text, deleted: false, year };
}

type TwistCauses = Map<string, { ref: TwistRef; src: Source }[]>;

function lineRef(data: GameData, id: string): Source {
  return data.lawById.has(id) ? { kind: 'law', id } : { kind: 'line', id };
}

/** 副作用ごとに、それを育てている行（法則の読み取り・行が運ぶ概念・重ね書き）を集める */
function twistCauses(g: GameState, data: GameData): TwistCauses {
  const causes: TwistCauses = new Map();
  const add = (ref: TwistRef, src: Source) => {
    const list = causes.get(ref.id) ?? [];
    list.push({ ref, src });
    causes.set(ref.id, list);
  };
  for (const law of data.laws) {
    const opt = option(data, law.id, g.laws[law.id]!);
    if (opt) for (const ref of opt.twists) add(ref, { kind: 'law', id: law.id });
  }
  // 同じ概念・同じ重ね書きは1つだけ、法則の読み取りと同じ意味の概念は効かない（activeMeanings と同じ数え方）
  for (const m of activeMeanings(g, data)) {
    const src = lineRef(data, m.lineId);
    for (const p of m.phrases) for (const ref of p.twists) add(ref, src);
    if (m.law) for (const ref of option(data, m.law.id, m.law.option)!.twists) add(ref, src);
  }
  return causes;
}

/** いちばん強く副作用を育てている行 */
function topSource(list: { ref: TwistRef; src: Source }[] | undefined): Source | null {
  if (!list || list.length === 0) return null;
  let best = list[0]!;
  for (const x of list) if (x.ref.rate > best.ref.rate) best = x;
  return best.src;
}

/** その法則の読み取り（options のどれか）を世界に書いている行 */
function lineWithReading(g: GameState, data: GameData, lawId: string, options: readonly string[]): Source | null {
  if (options.includes(g.laws[lawId] ?? '') && g.lawYear[lawId] !== undefined) return { kind: 'law', id: lawId };
  for (const { ref, carried } of eachLine(g, data)) if (carried.law && carried.law.id === lawId && options.includes(carried.law.option)) return ref;
  return null;
}

/**
 * 1つの条件を満たしている行。「||」でつないだ条件は、成り立っているほうから探す。
 * 出来事（tc あり）は、法則を書き換えてからの年数と副作用の元も、結末・危機（tc なし）は、印を立てる言い回しも原因に数える
 */
function sourceOfCondition(g: GameState, data: GameData, src: string, tc: TwistCauses | null): CauseRef | null {
  const c = parseCondition(src);
  if (c.t === 'or') {
    for (const p of c.parts) {
      if (!checkCondition(g, p)) continue;
      const cause = sourceOfCondition(g, data, p, tc);
      if (cause) return cause;
    }
    return null;
  }
  let s: Source | null = null;
  if (c.t === 'law' && !c.neg) s = lineWithReading(g, data, c.law, c.options);
  else if ((c.t === 'phrase' && !c.neg) || c.t === 'sincePhrase') s = lineWithPhrase(g, data, c.id);
  else if (tc) {
    if (c.t === 'since') s = { kind: 'law', id: c.law };
    else if (c.t === 'twist') s = topSource(tc.get(c.id));
  } else if (c.t === 'flag' && !c.neg) {
    const p = data.phrases.find((x) => x.setFlag === c.name);
    s = p ? lineWithPhrase(g, data, p.id) : null;
  }
  return s ? causeOf(g, data, s) : null;
}

/** 出来事の条件に書かれた行（書き換えた法則・書き足した言い回し・副作用の元）から原因を探す */
function eventCause(g: GameState, data: GameData, ev: EventDef, tc: TwistCauses): CauseRef | null {
  for (const src of ev.when) {
    const cause = sourceOfCondition(g, data, src, tc);
    if (cause) return cause;
  }
  return null;
}

/** 条件の組を満たしている行（書き換えた法則・書き足した言い回し・印を立てる言い回し）から原因を探す */
function conditionCause(g: GameState, data: GameData, group: readonly string[]): CauseRef | null {
  for (const src of group) {
    const cause = sourceOfCondition(g, data, src, null);
    if (cause) return cause;
  }
  return null;
}

/** 世界をいちばん揺らしている行（世界異常の原因として示す） */
function mostIncoherent(g: GameState, data: GameData): CauseRef | null {
  let best = 0;
  let src: Source | null = null;
  for (const { ref, carried } of eachLine(g, data)) {
    let inc = carriedIncoherence(data, carried);
    if (ref.kind === 'law') {
      if (g.lawYear[ref.id] === undefined) continue;
      inc += option(data, ref.id, g.laws[ref.id]!)?.incoherence ?? 0;
      if (g.understood[ref.id] === false) inc += NOISE_INCOHERENCE;
    } else if (carried.phrases.length === 0 && !carried.law) inc += NOISE_INCOHERENCE;
    if (inc > best) {
      best = inc;
      src = ref;
    }
  }
  return src ? causeOf(g, data, src) : null;
}

// ---------------------------------------------------------------- 世界に効いている意味（効き始めた年の知らせと、情景に使う）

/** 世界に効いている意味の1つ。key は o:法則.読み取り か p:言い回し（どの行が運んでいても同じ意味は1つ） */
export interface Meaning {
  key: string;
  law: string | null;
  option: string | null;
  phrase: string | null;
  src: Source;
}

/** 今の WORLD.txt で世界に効いている意味（元の文のままの行は数えない）。決まった順に並べる */
export function meaningsInEffect(g: GameState, data: GameData): Meaning[] {
  const out: Meaning[] = [];
  const seen = new Set<string>();
  const push = (m: Meaning) => {
    if (seen.has(m.key)) return;
    seen.add(m.key);
    out.push(m);
  };
  for (const law of data.laws) {
    const opt = g.laws[law.id] ?? law.initial;
    if (opt !== law.initial) push({ key: `o:${law.id}.${opt}`, law: law.id, option: opt, phrase: null, src: { kind: 'law', id: law.id } });
  }
  for (const m of activeMeanings(g, data)) {
    const src = lineRef(data, m.lineId);
    for (const p of m.phrases) push({ key: `p:${p.id}`, law: null, option: null, phrase: p.id, src });
    if (m.law) push({ key: `o:${m.law.id}.${m.law.option}`, law: m.law.id, option: m.law.option, phrase: null, src });
  }
  return out;
}

export function meaningKeys(ms: readonly Meaning[]): string[] {
  return ms.map((m) => m.key);
}

/** 行の今の文章（言い回しの {X} を埋めるため） */
function lineText(g: GameState, src: Source): string {
  if (src.kind === 'law') return g.texts[src.id] ?? '';
  return g.extras.find((x) => x.id === src.id)?.text ?? '';
}

function meaningIcon(data: GameData, m: Meaning): IconKey {
  if (m.phrase) return data.phraseById.get(m.phrase)?.icon ?? 'edit';
  const law = data.lawById.get(m.law ?? '');
  return (law && data.conceptById.get(law.concept)?.icon) ?? 'edit';
}

/** 意味が効き始めた年の知らせ（世界がそのとおりに変わった姿） */
function onsetText(g: GameState, data: GameData, m: Meaning): string | null {
  if (m.phrase) {
    const p = data.phraseById.get(m.phrase);
    return p ? phraseName(p.onset, lineText(g, m.src)) : null;
  }
  return data.optionOf.get(m.law ?? '')?.get(m.option ?? '')?.onset ?? null;
}

/** 意味が世界から消えた年の知らせ（書き足した概念を消した・法則を元の文に戻した） */
function returnText(g: GameState, data: GameData, key: string): { text: string; icon: IconKey; src: Source | null } | null {
  if (key.startsWith('p:')) {
    const p = data.phraseById.get(key.slice(2));
    // 「{X}がいなくなる」のような言い回しは、何のことだったか分からなくなるので知らせない
    if (!p || p.name.includes('{X')) return null;
    return { text: `「${p.name.replace(/（[^）]*）$/u, '')}」世界は、終わった`, icon: p.icon, src: null };
  }
  const m = /^o:([^.]+)\./u.exec(key);
  const law = m ? data.lawById.get(m[1]!) : undefined;
  // 別の読み取りに書き換えたときは、新しい読み取りの知らせだけを出す
  if (!law || (g.laws[law.id] ?? law.initial) !== law.initial) return null;
  return { text: `「${originalText(law)}」が、世界に戻った`, icon: data.conceptById.get(law.concept)?.icon ?? 'edit', src: { kind: 'law', id: law.id } };
}

/**
 * 去年書いた一文が、今年から世界に効き始める。効き始めた意味と、世界から消えた意味を知らせ、
 * 効いている意味を覚え直す（書いただけでは知らせない。時間を進めて初めてわかる）
 */
function announceMeanings(g: GameState, data: GameData, now: readonly Meaning[], news: NewsItem[]): void {
  const prev = new Set(g.inEffect);
  const cur = new Set(meaningKeys(now));
  for (const m of now) {
    if (prev.has(m.key)) continue;
    const text = onsetText(g, data, m);
    if (!text) continue;
    const icon = meaningIcon(data, m);
    const cause = causeOf(g, data, m.src);
    news.push({ year: g.year, category: 'WORLD', icon, text, why: null, severity: 'info', surprise: false, cause, onset: true });
    g.history.push({ year: g.year, kind: 'event', icon, text, why: null, severity: 'info', cause });
  }
  for (const key of g.inEffect) {
    if (cur.has(key)) continue;
    const back = returnText(g, data, key);
    if (!back) continue;
    const cause = back.src ? causeOf(g, data, back.src) : null;
    news.push({ year: g.year, category: 'WORLD', icon: back.icon, text: back.text, why: null, severity: 'info', surprise: false, cause, onset: true });
    g.history.push({ year: g.year, kind: 'event', icon: back.icon, text: back.text, why: null, severity: 'info', cause });
  }
  g.inEffect = [...cur];
}

// ---------------------------------------------------------------- 書き換えの勢い

/** 今の WORLD.txt での、ゆっくり動く量の向かう先（世界は変えない） */
export function targetsNow(g: GameState, data: GameData): Record<ImpulseKey, number> {
  const { ch } = computeChannels(g, data);
  const t = lawTotals(data, g);
  const d = measure(g.sim, ch, data.balance, g.startPop, t.cost, t.incoherence);
  return targetsOf(g.sim, d, ch, data.balance);
}

/** 書き換えの前と後の向かう先の差を、次の1年に届ける勢いとして貯める */
export function addImpulse(g: GameState, before: Record<ImpulseKey, number>, after: Record<ImpulseKey, number>): void {
  for (const k of IMPULSE_KEYS) {
    const v = (g.impulse[k] ?? 0) + (after[k] - before[k]);
    if (Math.abs(v) < 1e-9) delete g.impulse[k];
    else g.impulse[k] = v;
  }
}

const IMPULSE_RANGE: Record<ImpulseKey, [number, number]> = {
  industry: [0.05, 10],
  unemployment: [0, 0.6],
  eco: [0, 100],
  stability: [0, 100],
  happiness: [0, 100],
  tension: [0, 100],
  mind: [0, 100],
  coherence: [0, 100],
  temp: [-10, 10],
};

/**
 * 書き換えの勢いを世界に届ける：向かう先が動いた分の balance.impulse の割合だけ、すぐに動かす
 * （残りは、ふだんの速さで追いつく）。気温が変わらない世界では、気温は動かさない
 */
function applyImpulse(g: GameState, data: GameData): void {
  if (Object.keys(g.impulse).length === 0) return;
  const share = data.balance.impulse;
  const hold = clamp(computeChannels(g, data).ch.tempHold, 0, 1);
  for (const k of IMPULSE_KEYS) {
    const v = g.impulse[k];
    if (!v) continue;
    const [lo, hi] = IMPULSE_RANGE[k];
    g.sim[k] = clamp(g.sim[k] + v * share[k] * (k === 'temp' ? hold : 1), lo, hi);
  }
  g.impulse = {};
}

// ---------------------------------------------------------------- 予測

/** 今の世界を、出来事なしで years 年進めたときの点数（最初の変化の向きに使う） */
export function projectScores(g: GameState, data: GameData, years: number): Record<IndicatorId, number> {
  const b = data.balance;
  const c: GameState = structuredClone({ ...g, history: [], report: null });
  for (let i = 0; i < years; i++) {
    const { ch } = computeChannels(c, data);
    const t = lawTotals(data, c);
    c.derived = measure(c.sim, ch, b, c.startPop, t.cost, t.incoherence);
    simulateYear(c, ch, b, true);
    c.effects = c.effects.map((e) => ({ ...e, remaining: e.remaining - 1 })).filter((e) => e.remaining > 0);
  }
  const { ch } = computeChannels(c, data);
  const t = lawTotals(data, c);
  c.derived = measure(c.sim, ch, b, c.startPop, t.cost, t.incoherence);
  return computeScores(c.sim, c.derived, b, c.startPop);
}

// ---------------------------------------------------------------- 時間を進める

const STATE_RANGE: Record<StateEffectKey, [number, number]> = {
  pop: [0, 1e6],
  agri: [0.05, 10],
  industry: [0.05, 10],
  energyCap: [0.05, 10],
  infra: [0.02, 1],
  science: [0.05, 100],
  eco: [0, 100],
  co2: [180, 2000],
  temp: [-10, 10],
  pathogen: [0, 100],
  immunity: [0, 0.98],
  stability: [0, 100],
  happiness: [0, 100],
  tension: [0, 100],
  unemployment: [0, 0.6],
  coherence: [0, 100],
  mind: [0, 100],
};

/** 作物の病気への強さ（農業の規模と科学で上がる） */
export function blightResilience(g: GameState, data: GameData): number {
  const f = data.balance.food;
  return clamp(f.resBase + f.resAgri * Math.min(1, g.sim.agri) + f.resSci * clamp(g.sim.science - 1, 0, 1), 0, 0.9);
}

function applyEffects(g: GameState, data: GameData, ch: Channels, eff: EventEffects, source: string, news: NewsItem[]): void {
  const s = g.sim;
  for (const [k, v] of Object.entries(eff.add) as [StateEffectKey, number][]) {
    const [lo, hi] = STATE_RANGE[k];
    s[k] = clamp(s[k] + v, lo, hi);
  }
  for (const [k, v] of Object.entries(eff.mul) as [StateEffectKey, number][]) {
    const [lo, hi] = STATE_RANGE[k];
    s[k] = clamp(s[k] * v, lo, hi);
  }
  if (Object.keys(eff.mods).length > 0) g.effects.push({ source, mods: eff.mods, remaining: eff.duration });
  if (eff.blight !== undefined) {
    s.blight = clamp(s.blight + eff.blight * (1 - blightResilience(g, data)) * ch.cropDisease, 0, 0.85);
  }
  if (eff.strain) {
    s.pathogen = clamp(s.pathogen + eff.strain.seed * Math.min(1.5, ch.transmission), 0, data.balance.disease.max);
    s.immunity = Math.max(clamp(ch.immunityFloor, 0, 0.95), s.immunity * (1 - eff.strain.escape));
    s.strainR = Math.max(s.strainR, eff.strain.r);
    s.strainV = Math.max(s.strainV, eff.strain.virulence);
  }
  if (eff.war !== undefined && ch.war > 0) s.war = Math.max(s.war, eff.war * clamp(ch.warHarm, 0.05, 2));
  if (eff.setFlag) g.flags[eff.setFlag] = true;
  if (eff.clearFlag) delete g.flags[eff.clearFlag];
  if (eff.vanishLaw) vanishLaw(g, data, news);
}

/** 世界異常「存在消失」：法則を1つ、書換の権利を使わずに消す */
function vanishLaw(g: GameState, data: GameData, news: NewsItem[]): void {
  const pool = data.laws.filter((law) => (g.texts[law.id] ?? '') !== '' && law.options.some((o) => o.kind === 'delete'));
  if (pool.length === 0) return;
  const law = pool[Math.floor(nextRandom(g) * pool.length)]!;
  const del = law.options.find((o) => o.kind === 'delete')!;
  const before = g.texts[law.id]!;
  // 文章ごと消えるので、その行が運んでいた意味も消える
  g.laws[law.id] = del.id;
  g.texts[law.id] = '';
  g.understood[law.id] = true;
  g.lawYear[law.id] = g.year;
  g.carried[law.id] = NO_MEANING;
  syncPhraseFlags(g, data);
  const text = `「${before}」が世界から消えた`;
  news.push({ year: g.year, category: 'ANOMALY', icon: 'anomaly', text, why: null, severity: 'warn', surprise: true, cause: null });
  g.history.push({ year: g.year, kind: 'anomaly', icon: 'anomaly', text, why: null, severity: 'warn', cause: null });
}

function growTwists(g: GameState, data: GameData, tc: TwistCauses, news: NewsItem[]): void {
  for (const t of data.twists) {
    const refs = tc.get(t.id);
    const before = g.twists[t.id] ?? 0;
    let level = before;
    let top: { rate: number; src: Source } | null = null;
    if (refs) {
      const age = (g.twistAge[t.id] ?? 0) + 1;
      g.twistAge[t.id] = age;
      let rate = 0;
      for (const { ref, src } of refs) {
        if (age <= ref.delay || !checkAll(g, ref.when)) continue;
        rate += ref.rate;
        if (!top || ref.rate > top.rate) top = { rate: ref.rate, src };
      }
      level = rate > 0 ? Math.min(1, level + rate) : Math.max(0, level - t.decay * 0.5);
    } else {
      delete g.twistAge[t.id];
      level = Math.max(0, level - t.decay);
    }
    if (level > 0) g.twists[t.id] = level;
    else delete g.twists[t.id];
    for (const n of t.news) {
      if (before < n.at && level >= n.at) {
        const why = n.why ?? null;
        const cause = top ? causeOf(g, data, top.src) : null;
        discover(g, `t:${t.id}`);
        news.push({ year: g.year, category: n.category, icon: t.icon, text: n.text, why, severity: 'warn', surprise: true, cause });
        g.history.push({ year: g.year, kind: 'twist', icon: t.icon, text: n.text, why, severity: 'warn', cause });
      }
    }
  }
}

function runEvents(g: GameState, data: GameData, ch: Channels, tc: TwistCauses, news: NewsItem[]): void {
  for (const ev of data.events) {
    if (ev.stages && !ev.stages.includes(g.stageId)) continue;
    const last = g.fired[ev.id];
    if (last !== undefined && (ev.once || g.year - last < ev.cooldown)) continue;
    if (!checkAll(g, ev.when)) continue;
    const p = ev.chance * (ev.chanceChannel ? ch[ev.chanceChannel] : 1);
    if (p < 1 && nextRandom(g) >= p) continue;
    g.fired[ev.id] = g.year;
    discover(g, `e:${ev.id}`);
    const cause = eventCause(g, data, ev, tc);
    if (ev.effects) applyEffects(g, data, ch, ev.effects, ev.id, news);
    const why = ev.why ?? null;
    news.push({ year: g.year, category: ev.category, icon: ev.icon, text: ev.text, why, severity: ev.severity, surprise: ev.surprise, cause });
    if (ev.history ?? ev.severity !== 'info') {
      g.history.push({ year: g.year, kind: 'event', icon: ev.icon, text: ev.text, why, severity: ev.severity, cause });
    }
  }
}

function runAnomaly(g: GameState, data: GameData, ch: Channels, news: NewsItem[]): void {
  const c = data.balance.coherence;
  const coh = g.sim.coherence;
  if (coh >= c.anomalyFrom) return;
  const p = Math.min(c.anomalyMax, (c.anomalyFrom - coh) / c.anomalyScale);
  if (nextRandom(g) >= p) return;
  const pool = data.anomalies.filter((a) => coh < a.below);
  const total = pool.reduce((sum, a) => sum + a.weight, 0);
  if (total <= 0) return;
  let roll = nextRandom(g) * total;
  const pick = pool.find((a) => (roll -= a.weight) < 0) ?? pool[pool.length - 1]!;
  g.stats.anomalies += 1;
  discover(g, `a:${pick.id}`);
  const cause = mostIncoherent(g, data);
  news.push({ year: g.year, category: 'ANOMALY', icon: 'anomaly', text: pick.text, why: pick.why ?? null, severity: 'warn', surprise: true, cause });
  g.history.push({ year: g.year, kind: 'anomaly', icon: 'anomaly', text: pick.text, why: pick.why ?? null, severity: 'warn', cause });
  applyEffects(g, data, ch, pick.effects, pick.id, news);
}

// ---------------------------------------------------------------- 危機（無限の世界）

/** 危機の効果を強さに合わせる（足し算は強さ倍、掛け算と係数は 1 からの離れ方を強さ倍） */
function scaleEffects(eff: EventEffects, s: number): EventEffects {
  const away = (v: number) => (v < 1 ? clamp(1 - (1 - v) * s, 0.05, 1) : 1 + (v - 1) * s);
  const add: EventEffects['add'] = {};
  const mul: EventEffects['mul'] = {};
  const mods: EventEffects['mods'] = {};
  for (const [k, v] of Object.entries(eff.add) as [StateEffectKey, number][]) add[k] = v * s;
  for (const [k, v] of Object.entries(eff.mul) as [StateEffectKey, number][]) mul[k] = away(v);
  for (const [k, v] of Object.entries(eff.mods) as [keyof typeof CHANNEL_MODES, number][]) mods[k] = CHANNEL_MODES[k] === 'add' ? v * s : away(v);
  return {
    ...eff,
    add,
    mul,
    mods,
    blight: eff.blight !== undefined ? clamp(eff.blight * s, 0, 0.85) : undefined,
    strain: eff.strain ? { ...eff.strain, seed: eff.strain.seed * s, virulence: clamp(eff.strain.virulence * Math.sqrt(s), 0, 0.9) } : undefined,
    war: eff.war !== undefined ? clamp(eff.war * s, 0, 1) : undefined,
  };
}

/** 危機が去ってから、次の危機が知らされるまでの年数（年とともに縮む） */
function crisisGap(g: GameState, data: GameData): number {
  const k = data.balance.crisis;
  const base = Math.max(k.gapMin, k.gapStart - k.gapShrink * g.year);
  return Math.round(base + nextRandom(g) * k.jitter);
}

function crisisNews(g: GameState, c: Crisis, text: string, why: string | null, severity: NewsItem['severity'], cause: CauseRef | null): NewsItem {
  return { year: g.year, category: 'CRISIS', icon: c.icon, text, why, severity, surprise: false, cause };
}

/**
 * 無限の世界の危機。知らせが届き、数年後に世界を襲う。
 * 襲う年の世界の定義しだいで、防げる（起きない）・弱まる・そのまま襲う
 */
function runCrisis(g: GameState, data: GameData, ch: Channels, news: NewsItem[]): void {
  const k = data.balance.crisis;
  if (g.crisis) {
    const c = data.crisisById.get(g.crisis.id);
    if (!c) {
      g.crisis = null;
      return;
    }
    const left = g.crisis.at - g.year;
    if (left > 0) {
      news.push(crisisNews(g, c, c.warn.replace('{n}', String(left)), null, 'warn', null));
      return;
    }
    const saved = c.avertedBy.find((group) => checkAll(g, group));
    if (saved) {
      const cause = conditionCause(g, data, saved);
      g.crises.averted += 1;
      discover(g, `k:${c.id}.averted`);
      news.push(crisisNews(g, c, c.averted, null, 'info', cause));
      g.history.push({ year: g.year, kind: 'crisis', icon: c.icon, text: c.averted, why: null, severity: 'info', cause });
    } else {
      const soft = c.softenedBy.find((group) => checkAll(g, group));
      const cause = soft ? conditionCause(g, data, soft) : null;
      const text = soft ? c.softened : c.strike;
      const severity = soft ? 'warn' : 'critical';
      if (soft) g.crises.softened += 1;
      else g.crises.struck += 1;
      discover(g, soft ? `k:${c.id}.softened` : `k:${c.id}`);
      news.push(crisisNews(g, c, text, c.why, severity, cause));
      g.history.push({ year: g.year, kind: 'crisis', icon: c.icon, text, why: c.why, severity, cause });
      applyEffects(g, data, ch, scaleEffects(c.effects, g.crisis.strength * (soft ? k.soften : 1)), `crisis:${c.id}`, news);
    }
    g.crisis = null;
    g.nextCrisis = g.year + crisisGap(g, data);
    return;
  }
  if (g.nextCrisis < 0 || g.year < g.nextCrisis) return;
  // 同じ危機が続けて来ないよう、直前の危機は選ばない
  let last: string | null = null;
  let lastYear = -1;
  for (const c of data.crises) {
    const y = g.fired[`crisis:${c.id}`];
    if (y !== undefined && y > lastYear) {
      lastYear = y;
      last = c.id;
    }
  }
  const pool = data.crises.filter((c) => c.minYear <= g.year && c.id !== last);
  const total = pool.reduce((sum, c) => sum + c.weight, 0);
  if (total <= 0) {
    g.nextCrisis = g.year + 1;
    return;
  }
  let roll = nextRandom(g) * total;
  const c = pool.find((x) => (roll -= x.weight) < 0) ?? pool[pool.length - 1]!;
  g.fired[`crisis:${c.id}`] = g.year;
  g.crisis = { id: c.id, at: g.year + c.lead, strength: Math.min(k.maxStrength, 1 + k.growth * g.year) };
  const text = c.warn.replace('{n}', String(c.lead));
  news.push(crisisNews(g, c, text, null, 'critical', null));
  g.history.push({ year: g.year, kind: 'crisis', icon: c.icon, text: `知らせ：${text}`, why: null, severity: 'warn', cause: null });
}

// ---------------------------------------------------------------- くり返す世界（ステージ「くり返す十年」）

/** 巻き戻すときに戻す、世界の側の様子を写しておく */
function worldSnapshot(g: GameState): WorldSnapshot {
  return structuredClone({
    sim: g.sim,
    rng: g.rng,
    twists: g.twists,
    twistAge: g.twistAge,
    effects: g.effects,
    flags: g.flags,
    fired: g.fired,
    counters: g.counters,
    endingYears: g.endingYears,
  });
}

/**
 * 世界を、くり返しが始まった年の様子に巻き戻す。暦も乱数も戻るので、同じ書き方なら同じ出来事がくり返す。
 * 書いた WORLD.txt・観測記録・世界史は残る。巻き戻るたびに世界の頁が擦り切れて世界容量が減り、書換の力が少し戻る
 */
function rewindWorld(g: GameState, data: GameData, text: string, news: NewsItem[]): void {
  const loop = g.loop!;
  const st = stageOf(data, g.stageId);
  const cfg = st.loop!;
  const snap = structuredClone(loop.snapshot);
  const back = g.year - loop.start;
  const capacityMax = Math.max(0, g.sim.capacityMax - cfg.wear);
  // 世界容量の限界を超えていた年数は、書き手の側のものなので戻らない
  const capOver = g.counters.capOver;
  g.sim = { ...snap.sim, capacityMax };
  g.rng = snap.rng;
  g.twists = snap.twists;
  g.twistAge = snap.twistAge;
  g.effects = snap.effects;
  g.flags = snap.flags;
  g.fired = snap.fired;
  g.counters = { ...snap.counters, capOver };
  g.endingYears = snap.endingYears;
  g.year = loop.start;
  loop.count += 1;
  // くり返しの中で書いた行は、戻った年に書いたことになる
  for (const [id, y] of Object.entries(g.lawYear)) if (y > g.year) g.lawYear[id] = g.year;
  for (const x of g.extras) if (x.year > g.year) x.year = g.year;
  g.edits.left = Math.min(st.edits.max, g.edits.left + cfg.ink);
  syncPhraseFlags(g, data);
  refresh(g, data);
  g.scores = computeScores(g.sim, g.derived, data.balance, g.startPop);
  const msg = text.replace('{n}', String(back)).replace('{count}', String(loop.count));
  news.push({ year: g.year, category: 'ANOMALY', icon: 'cycle', text: msg, why: null, severity: 'critical', surprise: false, cause: null });
  g.history.push({ year: g.year, kind: 'anomaly', icon: 'cycle', text: msg, why: null, severity: 'critical', cause: null });
}

// ---------------------------------------------------------------- 結末

/** 無限の世界では、何年続いたかを添える */
function withYears(g: GameState, text: string): string {
  return g.nextCrisis >= 0 || g.crisis ? `${text}人類文明は${g.year}年続いた。` : text;
}

/** 特別な結末で世界を終える */
function finishWith(g: GameState, data: GameData, e: Ending, news: NewsItem[]): void {
  g.status = e.kind === 'clear' ? 'cleared' : 'failed';
  g.failReason = null;
  g.ending = e.id;
  discover(g, `x:${e.id}`);
  if (e.kind === 'clear') discover(g, `end:${g.stageId}.clear`);
  const cause = conditionCause(g, data, e.when);
  const text = withYears(g, e.text);
  news.push({ year: g.year, category: 'WORLD', icon: e.icon, text, why: e.why, severity: 'critical', surprise: false, cause });
  g.history.push({ year: g.year, kind: 'end', icon: e.icon, text: `「${e.title}」${text}`, why: e.why, severity: e.kind === 'clear' ? 'info' : 'critical', cause });
}

/** 無限の世界で、クリアの結末に到達した（観測記録に残し、世界は続く） */
function reachWithoutEnding(g: GameState, data: GameData, e: Ending, news: NewsItem[]): void {
  g.fired[`ending:${e.id}`] = g.year;
  delete g.endingYears[e.id];
  discover(g, `x:${e.id}`);
  const cause = conditionCause(g, data, e.when);
  const text = `「${e.title}」に到達した。${e.text}（無限の世界は続く）`;
  news.push({ year: g.year, category: 'WORLD', icon: e.icon, text, why: e.why, severity: 'info', surprise: true, cause });
  g.history.push({ year: g.year, kind: 'end', icon: e.icon, text, why: e.why, severity: 'info', cause });
}

/**
 * 特別な結末（trigger）：条件が続いた年数を数え、決まった年数に達したら世界を終える（重力の消失・星々への旅立ち など）。
 * 終えたら true
 */
function runEndings(g: GameState, data: GameData, news: NewsItem[]): boolean {
  const endless = stageOf(data, g.stageId).endless;
  for (const e of data.endings) {
    if (e.type !== 'trigger') continue;
    // 無限の世界では、クリアの結末には一度だけ到達し、世界は続く（何年続くかを競うため）
    if (endless && e.kind === 'clear' && g.fired[`ending:${e.id}`] !== undefined) continue;
    if (!checkAll(g, e.when)) {
      delete g.endingYears[e.id];
      continue;
    }
    const n = (g.endingYears[e.id] ?? 0) + 1;
    g.endingYears[e.id] = n;
    if (n >= e.years) {
      if (endless && e.kind === 'clear') {
        reachWithoutEnding(g, data, e, news);
        continue;
      }
      finishWith(g, data, e, news);
      return true;
    }
    if (n === 1 && e.warn) {
      const cause = conditionCause(g, data, e.when);
      news.push({ year: g.year, category: 'WORLD', icon: e.icon, text: e.warn.replace('{n}', String(e.years - n)), why: null, severity: 'warn', surprise: true, cause });
    }
  }
  return false;
}

function endGame(g: GameState, data: GameData, reason: FailReason | null, news: NewsItem[]): void {
  discover(g, `end:${g.stageId}.${reason ?? 'clear'}`);
  if (reason) {
    g.status = 'failed';
    g.failReason = reason;
    // 滅び方に名前をつける（核の冬・凍りついた星 など）
    // 滅び方の名前は、人口と文明の崩壊のときだけ（世界容量・整合性の限界は、世界の文章そのものの終わり）
    const physical = reason === 'humanity' || reason === 'civilization';
    const flavor = physical ? (data.endings.find((e) => e.type === 'flavor' && e.kind === 'fail' && checkAll(g, e.when)) ?? null) : null;
    g.ending = flavor?.id ?? reason;
    if (flavor) discover(g, `x:${flavor.id}`);
    const text = withYears(g, flavor ? `${FAIL_TEXT[reason]}${flavor.text}` : FAIL_TEXT[reason]);
    const why = flavor?.why ?? null;
    news.push({ year: g.year, category: 'WORLD', icon: flavor?.icon ?? 'warning', text, why, severity: 'critical', surprise: false, cause: null });
    g.history.push({ year: g.year, kind: 'end', icon: flavor?.icon ?? 'warning', text: flavor ? `「${flavor.title}」${text}` : text, why, severity: 'critical', cause: null });
  } else {
    g.status = 'cleared';
    g.ending = 'clear';
    const text = `人類文明は${g.year}年を生き延びた。MISSION COMPLETE`;
    news.push({ year: g.year, category: 'WORLD', icon: 'civilization', text, why: null, severity: 'critical', surprise: false, cause: null });
    g.history.push({ year: g.year, kind: 'end', icon: 'civilization', text, why: null, severity: 'info', cause: null });
  }
}

/** 1年進める。起きたことをニュースとして返す */
export function stepYear(g: GameState, data: GameData): NewsItem[] {
  const b = data.balance;
  const stage = stageOf(data, g.stageId);
  const news: NewsItem[] = [];
  g.prevScores = g.scores;
  g.prevMeta = { capacityRatio: g.derived.capacityRatio, coherence: g.sim.coherence, civ: g.derived.civ };

  // 書き換えで生まれた組み合わせも、時間を進めて初めて知らせる（書き換えただけでは結果を見せない）
  const known = g.combos;

  // 1) 書き換えの勢いを届け、今の法則で世界を1年動かす
  applyImpulse(g, data);
  const meanings = meaningsInEffect(g, data);
  const ch0 = refresh(g, data);
  const out = simulateYear(g, ch0, b, false);
  g.year += 1;
  g.sim.capacityMax = Math.max(stage.capacity * 0.5, g.sim.capacityMax - stage.capacityDecay);
  // 去年書いた一文が、今年から世界に効き始めた（世界がそのとおりに変わった姿を、まず知らせる）
  announceMeanings(g, data, meanings, news);

  // 2) 遅れて効く副作用が育ち、一時的な出来事の効果が切れていく
  const tc = twistCauses(g, data);
  growTwists(g, data, tc, news);
  g.effects = g.effects.map((e) => ({ ...e, remaining: e.remaining - 1 })).filter((e) => e.remaining > 0);

  // 3) 出来事（戦争の始まり・終わりもここでニュースになる）
  if (out.warStarted) {
    g.flags._warStart = true;
    g.stats.wars += 1;
  }
  if (out.warEnded) g.flags._warEnd = true;
  const ch1 = refresh(g, data);
  for (const id of g.combos) {
    if (known.includes(id)) continue;
    const c = data.comboById.get(id)!;
    discover(g, `c:${id}`);
    news.push({ year: g.year, category: 'WORLD', icon: c.icon, text: c.text, why: c.why ?? null, severity: 'info', surprise: !c.good, cause: null });
    g.history.push({ year: g.year, kind: 'combo', icon: c.icon, text: `「${c.name}」成立`, why: c.why ?? null, severity: 'info', cause: null });
  }
  runEvents(g, data, ch1, tc, news);
  delete g.flags._warStart;
  delete g.flags._warEnd;
  runAnomaly(g, data, ch1, news);
  runCrisis(g, data, ch1, news);

  // 4) 書換の権利が戻る
  if (g.year >= g.edits.nextAt) {
    if (g.edits.left < stage.edits.max) g.edits.left += 1;
    g.edits.nextAt += stage.edits.every;
  }

  // 5) 測り直して、終わりの条件を確かめる
  refresh(g, data);
  g.scores = computeScores(g.sim, g.derived, b, g.startPop);
  g.stats.minPop = Math.min(g.stats.minPop, g.sim.pop);
  g.stats.maxPop = Math.max(g.stats.maxPop, g.sim.pop);
  traceYear(g);
  discoverTags(g, data);

  // 特別な結末（重力の消失・宇宙の消滅・星々への旅立ち・楽園 など）
  const special = runEndings(g, data, news);

  let fail: FailReason | null = null;
  if (g.sim.pop < stage.fail.pop) fail = 'humanity';
  if (g.derived.civ < stage.fail.civ) g.counters.civLow += 1;
  else g.counters.civLow = 0;
  if (!fail && g.counters.civLow >= b.civ.graceYears) fail = 'civilization';
  if (!fail && g.sim.coherence < b.coherence.collapse) fail = 'coherence';
  if (g.derived.capacityRatio > 1) g.counters.capOver += 1;
  else g.counters.capOver = 0;
  if (!fail && g.counters.capOver >= b.capacity.graceYears) fail = 'capacity';

  // くり返す世界：決まった年の終わりに世界が保たれていなければ、0年目へ巻き戻る。その前に人類や文明が崩れても巻き戻る。
  // 世界整合性と世界容量の崩壊は、世界の頁そのものの終わりなので巻き戻らない
  const cfg = stage.loop;
  if (cfg && g.loop && !g.loop.done && !special) {
    if (fail === 'humanity' || fail === 'civilization') {
      rewindWorld(g, data, cfg.fallNews, news);
      fail = null;
    } else if (!fail && g.year - g.loop.start >= cfg.years) {
      if (checkAll(g, cfg.breakWhen)) {
        g.loop.done = true;
        g.flags.loop_broken = true;
        news.push({ year: g.year, category: 'WORLD', icon: 'cycle', text: cfg.breakNews, why: null, severity: 'critical', surprise: false, cause: null });
        g.history.push({ year: g.year, kind: 'event', icon: 'cycle', text: cfg.breakNews, why: null, severity: 'info', cause: null });
      } else {
        rewindWorld(g, data, cfg.news, news);
      }
    }
  }

  if (special) {
    // 特別な結末で終わった
  } else if (fail) {
    endGame(g, data, fail, news);
  } else {
    if (g.counters.capOver > 0) {
      const left = b.capacity.graceYears - g.counters.capOver;
      news.push({
        year: g.year,
        category: 'ANOMALY',
        icon: 'capacity',
        text: `世界容量が限界を超えている。あと${left}年で世界が維持できなくなる`,
        why: null,
        severity: 'critical',
        surprise: false,
        cause: null,
      });
    }
    if (g.counters.civLow > 0) {
      news.push({
        year: g.year,
        category: 'WORLD',
        icon: 'civilization',
        text: `文明が崩壊しかけている（あと${b.civ.graceYears - g.counters.civLow}年）`,
        why: null,
        severity: 'critical',
        surprise: false,
        cause: null,
      });
    }
    if (!stage.endless && g.year >= stage.goalYears) endGame(g, data, null, news);
  }
  // 長く続く世界（無限の世界）でも、世界史が大きくなりすぎないよう、古いものから忘れる（最初の1行は残す）
  const keep = b.news.historyMax;
  if (g.history.length > keep) g.history.splice(1, g.history.length - keep);
  return news;
}

function wordsOf(g: GameState, data: GameData): Record<IndicatorChange['id'], { word: string; score: number }> {
  const ind = data.indicators;
  const out = {} as Record<IndicatorChange['id'], { word: string; score: number }>;
  for (const id of INDICATOR_IDS) out[id] = { word: indicatorLevel(ind, id, g.scores[id], g.sim, g.derived).word, score: g.scores[id] };
  out.capacity = { word: capacityLevel(ind, g.derived.capacityRatio).word, score: -g.derived.capacityRatio * 100 };
  out.coherence = { word: coherenceLevel(ind, g.sim.coherence).word, score: g.sim.coherence };
  return out;
}

/** years 年進める。重大な出来事があればその年で止まる */
export function advance(g: GameState, data: GameData, years: number): StepReport {
  const from = g.year;
  const before = wordsOf(g, data);
  const popFrom = g.sim.pop;
  const effectBefore = new Set(g.inEffect);
  const news: NewsItem[] = [];
  let interrupted: string | null = null;
  for (let i = 0; i < years && g.status === 'playing'; i++) {
    const got = stepYear(g, data);
    news.push(...got);
    const critical = got.find((n) => n.severity === 'critical');
    if (critical && i < years - 1 && g.status === 'playing') {
      interrupted = critical.text;
      break;
    }
  }
  const after = wordsOf(g, data);
  const t = data.balance.trend;
  const changes: IndicatorChange[] = [];
  for (const id of Object.keys(after) as IndicatorChange['id'][]) {
    if (before[id].word === after[id].word) continue;
    const delta = after[id].score - before[id].score;
    const per = delta / Math.max(1, g.year - from);
    changes.push({ id, from: before[id].word, to: after[id].word, trend: trendOf(per, t.fast, t.slow), better: delta > 0 });
  }
  // 状態語は変わらなくても、はっきり動いた項目は矢印で見せる
  const moves: IndicatorMove[] = [];
  for (const id of INDICATOR_IDS) {
    if (before[id].word !== after[id].word) continue;
    const delta = after[id].score - before[id].score;
    const per = delta / Math.max(1, g.year - from);
    if (Math.abs(per) < t.slow) continue;
    moves.push({ id, trend: trendOf(per, t.fast, t.slow), better: delta > 0 });
  }
  const became = g.inEffect.filter((k) => !effectBefore.has(k));
  const report: StepReport = { from, to: g.year, requested: years, interrupted, changes, moves, pop: { from: popFrom, to: g.sim.pop }, became, news };
  g.report = report;
  return report;
}

export function historyTail(g: GameState, n: number): HistoryEntry[] {
  return g.history.slice(-n);
}
