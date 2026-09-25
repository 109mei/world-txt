import { carriesPhrase, readingsOf } from './lines';
import type { GameData, GameState } from './types';

/**
 * 条件の短い文を読む。
 *   "foodRatio < 0.9"                 状態・計算した量
 *   "law:human_food=few_days|weekly"  法則の形（!= で否定）
 *   "twist:overgrowth >= 0.3"         副作用の育ち具合
 *   "flag:war_started" / "!flag:..."  印
 *   "combo:photo_civ" / "!combo:..."  コンボ
 *   "phrase:flight"                  どこかの行が運んでいる言い回し（書き足した概念）
 *   "stage:food|climate"              ステージ
 *   "since:human_food >= 3"           その法則を書き換えてからの年数
 *   "since:phrase:immortal >= 4"      その言い回しを書いてからの年数
 *   "ending:gravity_void"             世界の結末（終わった世界）
 *   "daily"                           今日の世界で遊んでいる
 *   "law:death=not_human || phrase:immortal"   どちらかが成り立つ（同じ意味を、法則の行でも言い回しでも書けるとき）
 */

type Op = '<' | '<=' | '>' | '>=' | '==' | '!=';

export type Cond =
  | { t: 'var'; name: string; op: Op; value: number }
  | { t: 'law'; law: string; options: string[]; neg: boolean }
  | { t: 'twist'; id: string; op: Op; value: number }
  | { t: 'flag'; name: string; neg: boolean }
  | { t: 'combo'; id: string; neg: boolean }
  | { t: 'phrase'; id: string; neg: boolean }
  | { t: 'stage'; ids: string[] }
  | { t: 'since'; law: string; op: Op; value: number }
  | { t: 'sincePhrase'; id: string; op: Op; value: number }
  | { t: 'ending'; id: string; neg: boolean }
  | { t: 'daily'; neg: boolean }
  | { t: 'or'; parts: string[] };

/** 条件に使える量 */
export const VARS = [
  'year',
  'pop',
  'popRatio',
  'agri',
  'industry',
  'energyCap',
  'renewShare',
  'oilReserve',
  'infra',
  'science',
  'eco',
  'co2',
  'temp',
  'pathogen',
  'immunity',
  'strainV',
  'strainR',
  'blight',
  'stability',
  'happiness',
  'tension',
  'war',
  'unemployment',
  'coherence',
  'capacityRatio',
  'foodRatio',
  'waterRatio',
  'energyRatio',
  'research',
  'medicine',
  'civ',
  'excessDeaths',
  'diseaseDeaths',
  'famineDeaths',
  'heatDeaths',
  'peaceYears',
  'warYears',
  'foodStock',
  // 書き手のしたこと（実績の条件などに使う）
  'edits',
  'averted',
  'struck',
  'lines',
  'maxPhrases',
  'noiseLines',
  'stacked',
  'anomalies',
  'combos',
  // 14項目のうち、いちばん低い点数（楽園の条件）
  'minScore',
  // 心・物価（状態）と、時間が巻き戻った回数
  'mind',
  'prices',
  'loops',
] as const;
export type VarName = (typeof VARS)[number];
const VAR_SET = new Set<string>(VARS);

export class ConditionError extends Error {}

/** 特別な結末ではない、ふつうの終わり方 */
export const GENERIC_ENDINGS = ['clear', 'humanity', 'civilization', 'coherence', 'capacity'];

const cache = new Map<string, Cond>();

const CMP = /^([A-Za-z_][\w.]*)\s*(<=|>=|==|!=|<|>)\s*(-?\d+(?:\.\d+)?)$/;

export function parseCondition(src: string): Cond {
  const hit = cache.get(src);
  if (hit) return hit;
  const text = src.trim();
  let cond: Cond;
  if (text.includes('||')) {
    const parts = text.split('||').map((p) => p.trim());
    if (parts.some((p) => p.length === 0)) throw new ConditionError(`「||」の前後が空: ${src}`);
    for (const p of parts) parseCondition(p);
    cond = { t: 'or', parts };
  } else if (text.startsWith('since:phrase:')) {
    const m = CMP.exec(text.slice(13));
    if (!m) throw new ConditionError(`条件が読めない: ${src}`);
    cond = { t: 'sincePhrase', id: m[1]!, op: m[2] as Op, value: Number(m[3]) };
  } else if (text.startsWith('law:')) {
    const m = /^law:([\w]+)(!?=)([\w|]+)$/.exec(text);
    if (!m) throw new ConditionError(`法則の条件が読めない: ${src}`);
    cond = { t: 'law', law: m[1]!, options: m[3]!.split('|'), neg: m[2] === '!=' };
  } else if (text.startsWith('flag:') || text.startsWith('!flag:')) {
    const neg = text.startsWith('!');
    cond = { t: 'flag', name: text.slice(neg ? 6 : 5), neg };
  } else if (text.startsWith('combo:') || text.startsWith('!combo:')) {
    const neg = text.startsWith('!');
    cond = { t: 'combo', id: text.slice(neg ? 7 : 6), neg };
  } else if (text.startsWith('phrase:') || text.startsWith('!phrase:')) {
    const neg = text.startsWith('!');
    cond = { t: 'phrase', id: text.slice(neg ? 8 : 7), neg };
  } else if (text.startsWith('ending:') || text.startsWith('!ending:')) {
    const neg = text.startsWith('!');
    cond = { t: 'ending', id: text.slice(neg ? 8 : 7), neg };
  } else if (text === 'daily' || text === '!daily') {
    cond = { t: 'daily', neg: text.startsWith('!') };
  } else if (text.startsWith('stage:')) {
    cond = { t: 'stage', ids: text.slice(6).split('|') };
  } else if (text.startsWith('twist:') || text.startsWith('since:')) {
    const m = CMP.exec(text.slice(6));
    if (!m) throw new ConditionError(`条件が読めない: ${src}`);
    const op = m[2] as Op;
    const value = Number(m[3]);
    cond = text.startsWith('twist:') ? { t: 'twist', id: m[1]!, op, value } : { t: 'since', law: m[1]!, op, value };
  } else {
    const m = CMP.exec(text);
    if (!m) throw new ConditionError(`条件が読めない: ${src}`);
    if (!VAR_SET.has(m[1]!)) throw new ConditionError(`知らない量: ${m[1]}（${src}）`);
    cond = { t: 'var', name: m[1]!, op: m[2] as Op, value: Number(m[3]) };
  }
  cache.set(src, cond);
  return cond;
}

function compare(a: number, op: Op, b: number): boolean {
  switch (op) {
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    case '==':
      return a === b;
    case '!=':
      return a !== b;
  }
}

export function varValue(g: GameState, name: VarName): number {
  const s = g.sim;
  const d = g.derived;
  switch (name) {
    case 'year':
      return g.year;
    case 'popRatio':
      return s.pop / g.startPop;
    case 'capacityRatio':
      return d.capacityRatio;
    case 'foodRatio':
      return d.foodRatio;
    case 'waterRatio':
      return d.waterRatio;
    case 'energyRatio':
      return d.energyRatio;
    case 'research':
      return d.research;
    case 'medicine':
      return d.medicine;
    case 'civ':
      return d.civ;
    case 'excessDeaths':
      return d.excessDeaths;
    case 'diseaseDeaths':
      return d.diseaseDeaths;
    case 'famineDeaths':
      return d.famineDeaths;
    case 'heatDeaths':
      return d.heatDeaths;
    case 'peaceYears':
      return g.counters.peaceYears;
    case 'warYears':
      return g.counters.warYears;
    case 'edits':
      return g.stats.edits;
    case 'averted':
      return g.crises.averted;
    case 'struck':
      return g.crises.struck;
    case 'lines':
      return g.extras.length;
    case 'maxPhrases':
      return Math.max(0, ...Object.values(g.carried).map((c) => c.phrases.length));
    case 'noiseLines': {
      let n = Object.values(g.understood).filter((u) => u === false).length;
      for (const x of g.extras) if (!g.carried[x.id] || (g.carried[x.id]!.phrases.length === 0 && !g.carried[x.id]!.law)) n += 1;
      return n;
    }
    case 'stacked':
      return Object.values(g.carried).filter((c) => c.law).length;
    case 'anomalies':
      return g.stats.anomalies;
    case 'combos':
      return g.combos.length;
    case 'loops':
      return g.loop?.count ?? 0;
    case 'minScore': {
      const v = Object.values(g.scores);
      return v.length > 0 ? Math.min(...v) : 0;
    }
    default:
      return s[name];
  }
}

/** その言い回しを運ぶ行が書かれた年（いくつもあれば、いちばん早いもの） */
function phraseYear(g: GameState, id: string): number | null {
  let at: number | null = null;
  for (const [lineId, c] of Object.entries(g.carried)) {
    if (!c.phrases.includes(id)) continue;
    const y = g.extras.find((x) => x.id === lineId)?.year ?? g.lawYear[lineId];
    if (y !== undefined && (at === null || y < at)) at = y;
  }
  return at;
}

export function checkCondition(g: GameState, src: string, laws: Record<string, string> = g.laws, combos: readonly string[] = g.combos): boolean {
  const c = parseCondition(src);
  switch (c.t) {
    case 'or':
      return c.parts.some((p) => checkCondition(g, p, laws, combos));
    case 'sincePhrase': {
      const at = phraseYear(g, c.id);
      return at !== null && compare(g.year - at, c.op, c.value);
    }
    case 'var':
      return compare(varValue(g, c.name as VarName), c.op, c.value);
    case 'law': {
      // その行の読み取りか、ほかの行の重ね書きのどれかが当てはまる
      const hit = readingsOf(g, c.law, laws).some((o) => c.options.includes(o));
      return c.neg ? !hit : hit;
    }
    case 'twist':
      return compare(g.twists[c.id] ?? 0, c.op, c.value);
    case 'flag':
      return c.neg ? !g.flags[c.name] : !!g.flags[c.name];
    case 'combo': {
      const hit = combos.includes(c.id);
      return c.neg ? !hit : hit;
    }
    case 'phrase': {
      const hit = carriesPhrase(g, c.id);
      return c.neg ? !hit : hit;
    }
    case 'stage':
      return c.ids.includes(g.stageId);
    case 'since': {
      const at = g.lawYear[c.law];
      return at !== undefined && compare(g.year - at, c.op, c.value);
    }
    case 'ending': {
      const hit = g.ending === c.id;
      return c.neg ? !hit : hit;
    }
    case 'daily':
      return c.neg ? g.daily === null : g.daily !== null;
  }
}

export function checkAll(
  g: GameState,
  conds: readonly string[],
  laws: Record<string, string> = g.laws,
  combos: readonly string[] = g.combos,
): boolean {
  for (const c of conds) if (!checkCondition(g, c, laws, combos)) return false;
  return true;
}

/** 内容の中の条件が、知っている法則・形・副作用・コンボ・ステージを指しているか確かめる */
export function validateCondition(data: GameData, src: string): string | null {
  let c: Cond;
  try {
    c = parseCondition(src);
  } catch (e) {
    return (e as Error).message;
  }
  switch (c.t) {
    case 'or':
      for (const p of c.parts) {
        const err = validateCondition(data, p);
        if (err) return err;
      }
      return null;
    case 'sincePhrase':
      return data.phraseById.has(c.id) ? null : `知らない言い回し: ${c.id}（${src}）`;
    case 'law': {
      const opts = data.optionOf.get(c.law);
      if (!opts) return `知らない法則: ${c.law}（${src}）`;
      for (const o of c.options) if (!opts.has(o)) return `知らない形: ${c.law}=${o}（${src}）`;
      return null;
    }
    case 'since':
      return data.lawById.has(c.law) ? null : `知らない法則: ${c.law}（${src}）`;
    case 'twist':
      return data.twistById.has(c.id) ? null : `知らない副作用: ${c.id}（${src}）`;
    case 'combo':
      return data.comboById.has(c.id) ? null : `知らないコンボ: ${c.id}（${src}）`;
    case 'phrase':
      return data.phraseById.has(c.id) ? null : `知らない言い回し: ${c.id}（${src}）`;
    case 'stage':
      for (const id of c.ids) if (!data.stageById.has(id as never)) return `知らないステージ: ${id}（${src}）`;
      return null;
    case 'ending':
      return data.endingById.has(c.id) || GENERIC_ENDINGS.includes(c.id) ? null : `知らない結末: ${c.id}（${src}）`;
    default:
      return null;
  }
}
