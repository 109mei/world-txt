import {
  capacityLevel,
  civLevel,
  coherenceLevel,
  FAIL_TEXT,
  indicatorLevel,
  trendOf,
  worldSummary,
  activeTags,
  lineCost,
  NO_MEANING,
  originalText,
  phraseName,
  type Carried,
  type GameData,
  type GameState,
  type HistoryEntry,
  type NewsItem,
  type StepReport,
  type Trend,
  type WorldSummary,
} from '../core';
import { clamp } from '../core/math';
import {
  CHANNEL_IDS,
  INDICATOR_IDS,
  type ChannelId,
  type IconKey,
  type IndicatorId,
  type StageId,
  type Tone,
} from '../data/schema';

/** 画面に見せる写し。core の状態から作り、React はこれだけを読む */

export interface IndicatorView {
  id: IndicatorId;
  label: string;
  icon: IconKey;
  word: string;
  tone: Tone;
  trend: Trend;
  score: number;
}

export interface MeterView {
  word: string;
  tone: Tone;
  trend: Trend;
  /** メーターの位置（0 が左端） */
  pos: number;
  ends: [string, string];
}

/** WORLD.txt の1行（既存の法則か、書き足した一文） */
export interface LawLine {
  id: string;
  kind: 'law' | 'line';
  no: number | null;
  concept: string;
  conceptName: string;
  icon: IconKey;
  /** 今の文章（削除した行は元の文） */
  text: string;
  state: 'original' | 'changed' | 'deleted' | 'added';
  /** 世界が意味を読み取れたか */
  understood: boolean;
  /** 世界がどう読み取ったか（書き換えた行・書き足した行だけ） */
  reading: string | null;
  /** 世界容量で使う文字数（文章と、行が運ぶ概念の重さ） */
  cost: number;
}

/** 特別な結末（重力の消えた星・楽園 など） */
export interface EndingView {
  id: string;
  kind: 'clear' | 'fail';
  title: string;
  text: string;
  why: string;
  icon: IconKey;
}

/** 知らされている危機（無限の世界） */
export interface CrisisView {
  id: string;
  name: string;
  icon: IconKey;
  /** 襲うまでの年数 */
  left: number;
  text: string;
}

export interface GameView {
  stage: { id: StageId; title: string; icon: IconKey; mission: string; goalYears: number; endless: boolean };
  crisis: CrisisView | null;
  /** 危機を防いだ・弱めた・受けた数 */
  crises: { averted: number; softened: number; struck: number };
  daily: string | null;
  /** 特別な結末で終わった（またはふつうの滅び方に名前がついた）ときの結末 */
  ending: EndingView | null;
  /** くり返す世界：何回巻き戻ったか、巻き戻りまであと何年か、抜け出したか */
  loop: { count: number; left: number; done: boolean; rule: string; wear: number; ink: number } | null;
  year: number;
  yearsLeft: number;
  status: GameState['status'];
  failText: string | null;
  headline: { word: string; sentence: string; tone: Tone };
  population: { text: string; trend: Trend };
  indicators: IndicatorView[];
  focus: IndicatorId[];
  capacity: MeterView & { used: number; max: number };
  coherence: MeterView;
  edits: { left: number; max: number; nextIn: number; used: number };
  tags: { id: string; label: string; icon: IconKey }[];
  alerts: NewsItem[];
  laws: LawLine[];
  concepts: { id: string; name: string; icon: IconKey }[];
  history: HistoryEntry[];
  report: StepReport | null;
  summary: WorldSummary;
  analysis: { label: string; value: string }[];
}

export function populationText(pop: number): string {
  return `約${Math.round(pop)}億人`;
}

export const ADDED_CONCEPT = '__added__';

function lawLines(g: GameState, data: GameData): LawLine[] {
  const lines: LawLine[] = [];
  // 概念の順に並べ、その中は内容の順
  const order = new Map(data.concepts.map((c, i) => [c.id, i]));
  const laws = [...data.laws].sort((a, b) => (order.get(a.concept) ?? 0) - (order.get(b.concept) ?? 0));
  let no = 0;
  for (const law of laws) {
    const concept = data.conceptById.get(law.concept)!;
    const orig = originalText(law);
    const text = g.texts[law.id] ?? orig;
    const state: LawLine['state'] = text === '' ? 'deleted' : text === orig ? 'original' : 'changed';
    const c = g.carried[law.id] ?? NO_MEANING;
    const understood = g.understood[law.id] !== false;
    const base = g.laws[law.id] ?? law.initial;
    no += 1;
    lines.push({
      id: law.id,
      kind: 'law',
      no,
      concept: law.concept,
      conceptName: concept.name,
      icon: concept.icon,
      text: state === 'deleted' ? orig : text,
      state,
      understood,
      reading: state !== 'original' && understood ? readingText(data, base !== law.initial ? { law: law.id, option: base } : null, c, text) : null,
      cost: lineCost(data.phraseById, text, c.phrases),
    });
  }
  for (const x of g.extras) {
    no += 1;
    const c = g.carried[x.id] ?? NO_MEANING;
    const first = c.phrases[0] ? data.phraseById.get(c.phrases[0]) : null;
    const lawIcon = c.law ? data.conceptById.get(data.lawById.get(c.law.id)?.concept ?? '')?.icon : undefined;
    lines.push({
      id: x.id,
      kind: 'line',
      no,
      concept: ADDED_CONCEPT,
      conceptName: '書き足した定義',
      icon: first?.icon ?? lawIcon ?? 'edit',
      text: x.text,
      state: 'added',
      understood: c.phrases.length > 0 || !!c.law,
      reading: readingText(data, null, c, x.text),
      cost: lineCost(data.phraseById, x.text, c.phrases),
    });
  }
  return lines;
}

/** 行の読み取りを短い言葉で（行の法則の読み取り・運ぶ概念・重ね書きを「・」でつなぐ） */
function readingText(data: GameData, base: { law: string; option: string } | null, c: Carried, text?: string): string | null {
  const out: string[] = [];
  if (base) out.push(data.optionOf.get(base.law)?.get(base.option)?.label ?? '');
  for (const id of c.phrases) out.push(phraseName(data.phraseById.get(id)?.name ?? '', text));
  if (c.law) out.push(data.optionOf.get(c.law.id)?.get(c.law.option)?.label ?? '');
  const t = out.filter(Boolean);
  return t.length > 0 ? t.join('・') : null;
}

function meterTrend(delta: number): Trend {
  return trendOf(delta, 6, 1.5);
}

function endingView(g: GameState, data: GameData): EndingView | null {
  const e = g.ending ? data.endingById.get(g.ending) : undefined;
  if (!e) return null;
  return { id: e.id, kind: e.kind, title: e.title, text: e.text, why: e.why, icon: e.icon };
}

function crisisView(g: GameState, data: GameData): CrisisView | null {
  if (!g.crisis || g.status !== 'playing') return null;
  const c = data.crisisById.get(g.crisis.id);
  if (!c) return null;
  const left = Math.max(0, g.crisis.at - g.year);
  return { id: c.id, name: c.name, icon: c.icon, left, text: c.warn.replace('{n}', String(left)) };
}

export function buildView(g: GameState, data: GameData): GameView {
  const stage = data.stageById.get(g.stageId)!;
  const ind = data.indicators;
  const t = data.balance.trend;
  const indicators: IndicatorView[] = INDICATOR_IDS.map((id) => {
    const def = ind.items[id];
    const lv = indicatorLevel(ind, id, g.scores[id], g.sim, g.derived);
    return {
      id,
      label: def.label,
      icon: def.icon,
      word: lv.word,
      tone: lv.tone,
      trend: trendOf(g.scores[id] - (g.prevScores[id] ?? g.scores[id]), t.fast, t.slow),
      score: g.scores[id],
    };
  });
  const civ = civLevel(ind, g.derived.civ);
  const cap = capacityLevel(ind, g.derived.capacityRatio);
  const coh = coherenceLevel(ind, g.sim.coherence);
  const popDelta = g.derived.birthRate - g.derived.deathRate;
  const summary = worldSummary(g, data);
  const tags = activeTags(g, data)
    .slice(0, 8)
    .map((tg) => ({ id: tg.id, label: tg.label, icon: tg.icon }));
  // 知らされている危機は上の帯で見せるので、ここには重ねない
  const alerts = (g.report?.news ?? []).filter((n) => (n.severity === 'critical' || n.surprise) && !(g.crisis && n.category === 'CRISIS')).slice(-4);
  const sim = g.sim;
  const d = g.derived;
  return {
    stage: { id: stage.id, title: stage.title, icon: stage.icon, mission: stage.mission, goalYears: stage.goalYears, endless: stage.endless },
    crisis: crisisView(g, data),
    crises: { ...g.crises },
    daily: g.daily,
    ending: endingView(g, data),
    loop:
      stage.loop && g.loop
        ? {
            count: g.loop.count,
            left: Math.max(0, stage.loop.years - (g.year - g.loop.start)),
            done: g.loop.done,
            rule: stage.loop.rule,
            wear: stage.loop.wear,
            ink: stage.loop.ink,
          }
        : null,
    year: g.year,
    yearsLeft: Math.max(0, stage.goalYears - g.year),
    status: g.status,
    failText: g.failReason ? FAIL_TEXT[g.failReason] : g.status === 'failed' && g.ending ? (data.endingById.get(g.ending)?.text ?? null) : null,
    headline: civ,
    population: { text: populationText(sim.pop), trend: trendOf(popDelta * 100, 1, 0.2) },
    indicators,
    focus: stage.focus,
    capacity: {
      word: cap.word,
      tone: cap.tone,
      trend: meterTrend(-(d.capacityRatio - g.prevMeta.capacityRatio) * 100),
      pos: clamp(d.capacityRatio / 1.1, 0, 1),
      ends: ['余裕', '限界'],
      used: d.capacityUsed,
      max: Math.floor(sim.capacityMax),
    },
    coherence: {
      word: coh.word,
      tone: coh.tone,
      trend: meterTrend(sim.coherence - g.prevMeta.coherence),
      pos: clamp(1 - sim.coherence / 100, 0, 1),
      ends: ['正常', '崩壊'],
    },
    edits: { left: g.edits.left, max: stage.edits.max, nextIn: Math.max(0, g.edits.nextAt - g.year), used: g.edits.used },
    tags,
    alerts,
    laws: lawLines(g, data),
    concepts: data.concepts.map((c) => ({ id: c.id, name: c.name, icon: c.icon })),
    history: [...g.history].reverse(),
    report: g.report,
    summary,
    analysis: [
      { label: '人口', value: `${sim.pop.toFixed(1)}億人` },
      { label: '出生率 / 死亡率', value: `${(d.birthRate * 1000).toFixed(1)}‰ / ${(d.deathRate * 1000).toFixed(1)}‰` },
      { label: '食料の充足', value: `${Math.round(d.foodRatio * 100)}%` },
      { label: '食料の蓄え', value: `${Math.round(sim.foodStock * 365)}日分` },
      { label: '水の充足', value: `${Math.round(d.waterRatio * 100)}%` },
      { label: 'エネルギーの充足', value: `${Math.round(d.energyRatio * 100)}%` },
      { label: '再生可能エネルギー', value: `${Math.round(sim.renewShare * 100)}%` },
      { label: '石油の残り', value: `約${Math.round(sim.oilReserve)}年分` },
      { label: '気温（産業革命前との差）', value: `${sim.temp >= 0 ? '+' : ''}${sim.temp.toFixed(2)}℃` },
      { label: 'CO₂濃度', value: `${Math.round(sim.co2)} ppm` },
      { label: '感染の広がり', value: `${sim.pathogen.toFixed(1)}%` },
      { label: '免疫を持つ人', value: `${Math.round(sim.immunity * 100)}%` },
      { label: '失業率', value: `${(sim.unemployment * 100).toFixed(1)}%` },
      { label: '農業の規模', value: `${Math.round(sim.agri * 100)}` },
      { label: '産業の規模', value: `${Math.round(sim.industry * 100)}` },
      { label: '科学の水準', value: `${Math.round(sim.science * 100)}` },
      { label: '社会の安定', value: `${Math.round(sim.stability)}` },
      { label: '国際緊張', value: `${Math.round(sim.tension)}` },
      { label: '心', value: `${Math.round(sim.mind)}` },
      { label: '物価（はじめを1として）', value: d.money > 0 ? `${priceText(sim.prices)}倍` : 'お金なし' },
      { label: '文明', value: `${Math.round(d.civ)}` },
      { label: '世界整合性', value: `${Math.round(sim.coherence)}` },
      { label: '世界容量', value: `${d.capacityUsed} / ${Math.floor(sim.capacityMax)}字` },
    ],
  };
}

/** 物価の倍率を読みやすくする（10倍からは整数に区切りを入れる） */
function priceText(p: number): string {
  return p >= 10 ? Math.round(p).toLocaleString('ja-JP') : p.toFixed(p >= 2 ? 1 : 2);
}

// ---------------------------------------------------------------- 詳しく見る（原因の説明）

/** 係数がどの項目に効くか（関連する法則を探すため） */
const CHANNEL_TARGETS: Partial<Record<ChannelId, IndicatorId[]>> = {
  foodDemand: ['food'],
  yield: ['food'],
  agriMax: ['food', 'eco'],
  agriWater: ['water', 'food'],
  distribution: ['food', 'logistics'],
  photosynth: ['food'],
  cropDisease: ['food'],
  foodStorage: ['food'],
  waterDemand: ['water'],
  waterSupply: ['water'],
  fossilOutput: ['energy'],
  fossilCO2: ['climate'],
  fossilDepletion: ['energy'],
  renewGrowth: ['energy', 'climate'],
  renewPower: ['energy'],
  cleanEnergy: ['energy'],
  energyDemand: ['energy'],
  energySupply: ['energy'],
  industry: ['industry'],
  unemployment: ['society', 'industry'],
  science: ['science'],
  medicine: ['health'],
  transmission: ['health'],
  virulence: ['health'],
  outbreak: ['health'],
  mutation: ['health'],
  immunityDecay: ['health'],
  immunityFloor: ['health'],
  strainRelax: ['health'],
  fertility: ['humanity'],
  aging: ['humanity'],
  mortality: ['humanity'],
  heatHuman: ['humanity', 'climate'],
  heatLife: ['food', 'climate'],
  sun: ['climate', 'food'],
  greenhouse: ['climate'],
  tempEq: ['climate'],
  tempHold: ['climate'],
  co2Removal: ['climate'],
  plantSink: ['climate'],
  oceanSink: ['climate'],
  humanSink: ['climate'],
  emissions: ['climate'],
  wildfire: ['eco', 'climate'],
  eco: ['eco'],
  ecoRecovery: ['eco'],
  infraDamage: ['logistics'],
  stability: ['society'],
  happiness: ['society'],
  tension: ['peace'],
  war: ['peace'],
  warHarm: ['peace', 'humanity'],
  mind: ['mind'],
  inflation: ['prices'],
  money: ['prices', 'industry'],
  misfortune: ['eco', 'society'],
};

/** その項目に関わる行（法則のどれかの読み取り、または書き足した行の意味が、項目に効く係数を動かすもの） */
export function relatedLaws(g: GameState, data: GameData, id: IndicatorId): string[] {
  const hits = (mods: Partial<Record<ChannelId, number>>) => CHANNEL_IDS.some((c) => mods[c] !== undefined && CHANNEL_TARGETS[c]?.includes(id));
  const out: string[] = [];
  for (const law of data.laws) if (law.options.some((o) => hits(o.mods))) out.push(law.id);
  for (const x of g.extras) {
    const c = g.carried[x.id] ?? NO_MEANING;
    const phraseHit = c.phrases.some((pid) => hits(data.phraseById.get(pid)?.mods ?? {}));
    const lawHit = c.law ? hits(data.optionOf.get(c.law.id)?.get(c.law.option)?.mods ?? {}) : false;
    if (phraseHit || lawHit) out.push(x.id);
  }
  return out;
}

export interface Cause {
  icon: IconKey;
  text: string;
  good: boolean;
}

/** 今その項目を動かしている主な原因（多い順に最大4つ） */
export function explainIndicator(g: GameState, data: GameData, id: IndicatorId): Cause[] {
  const s = g.sim;
  const d = g.derived;
  const b = data.balance;
  const f = d.factors.food;
  const out: (Cause & { weight: number })[] = [];
  const add = (weight: number, icon: IconKey, text: string, good = false) => out.push({ weight, icon, text, good });
  const heatOver = s.temp - b.climate.comfort;
  switch (id) {
    case 'food':
      if (f.water < 0.97) add(1 - f.water, 'water', '畑に回す水が足りない');
      if (f.heat < 0.97) add(1 - f.heat, s.temp < 0 ? 'cold' : 'temperature', s.temp < 0 ? '寒さで作物が育たない' : '暑さで作物が実りにくい');
      if (f.blight > 0.01 && f.blight < 0.97) add(1 - f.blight, 'pathogen', '作物の病気が広がっている');
      if (f.energy < 0.97) add(1 - f.energy, 'energy', 'エネルギー不足で肥料や燃料が足りない');
      if (f.eco < 0.95) add(1 - f.eco, 'eco', '生態系が弱り、土や受粉の力が落ちている');
      if (f.logistics < 0.93) add(1 - f.logistics, 'logistics', '食料が必要な所へ届いていない');
      if (f.land > 0.97 * (d.foodRatio < 1 ? 1 : 2)) add(0.1, 'agriculture', '農地が限界まで広がっている');
      if (s.pop > g.startPop * 1.05) add((s.pop / g.startPop - 1) * 0.6, 'population', '人口が増え、必要な量が増えた');
      if (f.stock > 0.02) add(0.01, 'food', `蓄えがある（約${Math.round(f.stock * 365)}日分）`, true);
      if (d.foodRatio > 1.1) add(0.02, 'food', '必要な量より多く作られている', true);
      break;
    case 'water':
      if (d.factors.water.heat < 0.97) add(1 - d.factors.water.heat, 'temperature', '暑さで水が蒸発しやすい');
      add(0.05, 'agriculture', `使う水の約${Math.round(((b.water.agri * s.agri) / Math.max(0.01, d.factors.water.demand)) * 10)}割は農業`);
      if (d.waterRatio > 1.1) add(0.03, 'water', '水は十分にある', true);
      break;
    case 'energy':
      if (d.factors.energy.fuel < 0.95) add(1 - d.factors.energy.fuel, 'oil', '燃料が足りない（石油の枯渇・燃えにくさ）');
      if (s.war > 0) add(0.2, 'war', '戦争で発電所が壊れている');
      if (s.renewShare > 0.4) add(0.05, 'sun', `再生可能エネルギーが約${Math.round(s.renewShare * 10)}割`, true);
      if (d.energyRatio < 0.97) add(0.1, 'industry', '発電の増設が需要に追いつかない');
      break;
    case 'health':
      if (s.pathogen > 5) add(s.pathogen / 50, 'pathogen', `感染が広がっている（約${Math.round(s.pathogen)}%）`);
      if (s.pathogen > b.medicine.overload) add(0.3, 'medicine', '病院があふれ、医療が追いつかない');
      if (s.strainV > 0.12) add(s.strainV, 'dna', '今の病原体は重症になりやすい');
      if (s.immunity > 0.6) add(0.05, 'immunity', '多くの人が免疫を持っている', true);
      break;
    case 'society':
      if (d.foodRatio < 0.97) add(0.98 - d.foodRatio, 'food', '食料が足りない');
      if (d.waterRatio < 0.95) add(0.95 - d.waterRatio, 'water', '水が足りない');
      if (d.energyRatio < 0.95) add((0.95 - d.energyRatio) * 0.6, 'energy', 'エネルギーが足りない');
      if (s.unemployment > 0.08) add(s.unemployment, 'industry', `失業が増えている（約${Math.round(s.unemployment * 100)}%）`);
      if (s.pathogen > 10) add(s.pathogen / 100, 'pathogen', '病気が広がっている');
      if (s.war > 0) add(0.3, 'war', '戦争が起きている');
      if (s.coherence < 70) add((70 - s.coherence) / 100, 'anomaly', '世界の揺らぎに人々がおびえている');
      if (d.excessDeaths > 0.004) add(d.excessDeaths * 10, 'death', '多くの人が亡くなっている');
      break;
    case 'peace':
      if (d.foodRatio < 0.95) add(0.95 - d.foodRatio, 'food', '食料をめぐる争い');
      if (d.waterRatio < 0.95) add(0.95 - d.waterRatio, 'water', '水をめぐる争い');
      if (s.stability < 50) add((60 - s.stability) / 100, 'society', '各国の社会が不安定');
      if (heatOver > 0.8) add(heatOver / 10, 'climate', '暑さで住めない土地から人が移動している');
      if (s.war > 0) add(0.5, 'war', '戦争が続いている');
      break;
    case 'climate':
      add(Math.abs(s.temp) / 5, s.temp >= 0 ? 'temperature' : 'cold', `気温は産業革命前より${s.temp >= 0 ? '+' : ''}${s.temp.toFixed(1)}℃`);
      add(0.1, 'co2', `二酸化炭素は約${Math.round(s.co2)}ppm（産業革命前は約280）`);
      break;
    case 'eco':
      if (s.agri > b.eco.landFree + 0.3) add(0.1, 'agriculture', '農地のために森や草原が削られている');
      if (heatOver > 0.5) add(heatOver / 8, 'temperature', '暑さで生き物が弱っている');
      if (s.war > 0) add(0.1, 'war', '戦争で自然が壊されている');
      if (s.eco > 65) add(0.02, 'eco', '自然が豊かに保たれている', true);
      break;
    case 'science':
      if (s.stability < 50) add((60 - s.stability) / 100, 'society', '社会の混乱で研究が進まない');
      if (s.industry < 0.85) add(1 - s.industry, 'industry', '産業が弱り、研究にお金が回らない');
      if (d.research > 0.025) add(0.02, 'science', '研究が盛んに進んでいる', true);
      break;
    case 'logistics':
      if (s.infra < 0.8) add(0.9 - s.infra, 'logistics', '道路や港、送電網が傷んでいる');
      if (s.war > 0) add(0.3, 'war', '戦争で輸送路が断たれている');
      if (d.distribution < 0.97) add(1 - d.distribution, 'nation', '物の流れが滞っている');
      break;
    case 'industry':
      if (d.energyRatio < 0.97) add(1 - d.energyRatio, 'energy', 'エネルギーが足りない');
      if (s.infra < 0.8) add(0.9 - s.infra, 'logistics', '物流が滞っている');
      if (s.stability < 50) add((60 - s.stability) / 100, 'society', '社会が不安定');
      if (s.pathogen > 10) add(s.pathogen / 100, 'pathogen', '病気で働けない人が多い');
      if (s.pop < g.startPop * 0.9) add(1 - s.pop / g.startPop, 'population', '働き手が減った');
      break;
    case 'humanity':
      if (d.famineDeaths > 0.001) add(d.famineDeaths * 20, 'food', '飢えで亡くなる人が多い');
      if (d.diseaseDeaths > 0.001) add(d.diseaseDeaths * 20, 'pathogen', '病気で亡くなる人が多い');
      if (d.heatDeaths > 0.0005) add(d.heatDeaths * 20, 'temperature', '暑さで亡くなる人が多い');
      if (s.war > 0) add(0.2, 'war', '戦争で多くの命が失われている');
      if (s.pop < g.startPop * 0.95) add(1 - s.pop / g.startPop, 'population', `人口が${Math.round((1 - s.pop / g.startPop) * 100)}%減った`);
      if (d.birthRate - d.deathRate > 0.012) add(0.05, 'population', '人口が急速に増えている', true);
      break;
    case 'mind': {
      const base = b.mind.base;
      if (s.mind < base - 2) add((base - s.mind) / 40, 'mind', '書き換えた世界のあり方が、人々の心をすり減らしている');
      if (s.mind > base + 2) add((s.mind - base) / 40, 'mind', '人々の心に張り合いがある', true);
      if (s.happiness < b.mind.viewRef - 5) add((b.mind.viewRef - s.happiness) / 60, 'happiness', '暮らしの苦しさが心に響いている');
      if (s.prices > 3 && d.money > 0) add(Math.log10(s.prices) / 4, 'money', '物価の暴騰で、明日の暮らしが見えない');
      if (s.war > 0) add(0.15, 'war', '戦争が心に傷を残している');
      break;
    }
    case 'prices':
      if (d.money <= 0) add(0.1, 'money', 'お金のない世界。物は交換で行き来している', true);
      else {
        if (s.prices > 1.05) add(Math.log10(s.prices) / 2, 'money', `お金が刷られすぎ、物価は約${priceText(s.prices)}倍になった`);
        if (d.foodRatio < 0.97) add(1 - d.foodRatio, 'food', '食料が足りず、値段が上がっている');
        if (d.energyRatio < 0.97) add((1 - d.energyRatio) * 0.5, 'energy', 'エネルギーが足りず、値段が上がっている');
        if (s.prices <= 1.05 && d.foodRatio >= 1 && d.energyRatio >= 1) add(0.02, 'money', 'お金の価値は保たれている', true);
      }
      break;
  }
  return out.sort((a, b2) => b2.weight - a.weight).slice(0, 4).map(({ icon, text, good }) => ({ icon, text, good }));
}

/**
 * この世界の歩み：世界史から大事な出来事を最大 n 件選び、年の順に並べる
 * （終わり・想定外の変化・組み合わせ・重大な出来事・最初の書き換えを優先する）
 */
export function chronicle(g: GameState, n = 6): HistoryEntry[] {
  let firstEdit = true;
  const seen = new Set<string>();
  const scored = g.history.map((h, i) => {
    let score = 0;
    // 同じ出来事が何度も起きたときは、最初の1回だけを歩みに残す
    if (seen.has(h.text)) return { h, i, score };
    seen.add(h.text);
    if (h.kind === 'end') score = 1000;
    else if (h.kind === 'edit') {
      // 物語は、最初の書き換えから始まる
      score = firstEdit ? 900 : 12;
      firstEdit = false;
    } else if (h.kind === 'combo') score = 45;
    else if (h.kind === 'twist') score = 40 + (h.cause ? 8 : 0);
    else if (h.kind === 'event') score = (h.severity === 'critical' ? 50 : h.severity === 'warn' ? 15 : 5) + (h.cause ? 8 : 0);
    else if (h.kind === 'anomaly') score = 30;
    // 危機：襲われたことと、書き換えで防いだこと（知らせそのものは残さない）
    else if (h.kind === 'crisis') score = h.text.startsWith('知らせ：') ? 0 : (h.severity === 'critical' ? 55 : h.severity === 'warn' ? 35 : 50) + (h.cause ? 10 : 0);
    return { h, i, score };
  });
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, n)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.h);
}

/** 詳しく見る画面のメーター（0 が悪い側、1 が良い側。気候は寒い側から暑い側） */
export function indicatorMeter(g: GameState, id: IndicatorId): number {
  if (id === 'climate') return clamp((g.sim.temp + 3) / 7, 0, 1);
  return clamp(g.scores[id] / 100, 0, 1);
}
