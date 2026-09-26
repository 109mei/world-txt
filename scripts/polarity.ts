/**
 * 逆の読み取りを見つける（P2）：書いた文と逆の意味に読まれる文をなくす。
 *   npx tsx scripts/polarity.ts
 * 言い回し（phrases.json）と法則の読み取り（laws.json の options）の例文から、機械的に言い換えを作って読む。
 *   打ち消し：「人間は空を飛べる」→「人間は空を飛べない」。同じ言い回し・同じ読み取りに読まれたら「逆向き」
 *   よける：「隕石が落ちてくる」→「隕石は地球を避ける」「それる」「燃え尽きる」「届かない」。落ちてくると読まれたら「逆向き」
 *   少なくても：「植物は水と光で育つ」→「植物は水が少なくても育つ」。ほかのものが「なし」になる読み取りなら「逆向き」
 * 向きは、読み取りの名前の対（落ちてくる／それる）と、係数（mods）の符号で比べる
 */
import { createGame, features, planWrite, type GameState } from '../src/core';
import { gameData } from '../src/data';
import type { ChannelId, Mods } from '../src/data/schema';
import { CHANNEL_MODES } from '../src/data/schema';
import { negate } from '../src/ui/wording';

export type Verdict = 'same' | 'reversed' | 'unrelated' | 'noise';

export interface PolarityCase {
  source: string;
  kind: 'neg' | 'avoid' | 'little';
  text: string;
  got: string[];
  verdict: Verdict;
}

/** 読み取った意味の一覧（言い回し p:… と、法則の読み取り r:法則.読み取り） */
function readAdd(text: string): string[] | null {
  const g: GameState = createGame(gameData, 'food', 1);
  const plan = planWrite(g, gameData, { kind: 'new' }, text);
  if (plan.block === 'redundant') return ['same-as-world'];
  if (plan.block || !plan.result.understood) return null;
  if (plan.result.redirect) return [`r:${plan.result.redirect}.${plan.written.laws[plan.result.redirect]}`];
  const c = plan.written.carried[`x${g.nextExtra}`];
  if (!c) return [];
  return [...c.phrases.map((p) => `p:${p}`), ...(c.law ? [`r:${c.law.id}.${c.law.option}`] : [])];
}

function readLaw(lawId: string, text: string): string[] | null {
  const g: GameState = createGame(gameData, 'food', 1);
  const plan = planWrite(g, gameData, { kind: 'law', id: lawId }, text);
  if (plan.block === 'same') return [`r:${lawId}.${g.laws[lawId]}`];
  if (plan.block || !plan.result.understood) return null;
  const c = plan.written.carried[lawId];
  return [`r:${lawId}.${plan.written.laws[lawId]}`, ...(c?.phrases.map((p) => `p:${p}`) ?? [])];
}

function modsOf(key: string): Mods {
  if (key.startsWith('p:')) return gameData.phraseById.get(key.slice(2))?.mods ?? {};
  const m = /^r:(\w+)\.(.+)$/u.exec(key);
  return (m && gameData.optionOf.get(m[1]!)?.get(m[2]!)?.mods) ?? {};
}

/** 係数の動く向きが、ほとんど同じか（打ち消しても同じ向きに効くなら、逆の読み取り） */
export function sameDirection(a: Mods, b: Mods): boolean {
  let agree = 0;
  let total = 0;
  for (const [k, v] of Object.entries(a) as [ChannelId, number][]) {
    const w = b[k];
    if (w === undefined) continue;
    const base = CHANNEL_MODES[k] === 'mul' ? 1 : 0;
    const da = v - base;
    const db = w - base;
    if (Math.abs(da) < 1e-9 || Math.abs(db) < 1e-9) continue;
    total += 1;
    if (Math.sign(da) === Math.sign(db)) agree += 1;
  }
  return total > 0 && agree === total;
}

/**
 * 向きを比べる。元と同じ読み取りに戻ったら逆向き。言い回しの打ち消しは、係数が同じ向きに効く読み取りも逆向きとみる
 * （法則の読み取りの打ち消しは、その行を消した読み取りになるのが自然なので、同じ読み取りに戻ったときだけ）
 */
function judge(base: string, got: string[] | null): Verdict {
  if (got === null) return 'noise';
  if (got.includes(base)) return 'reversed';
  const b = modsOf(base);
  if (base.startsWith('p:') && Object.keys(b).length > 0 && got.some((k) => k !== 'same-as-world' && Object.keys(modsOf(k)).length > 0 && sameDirection(b, modsOf(k)))) return 'reversed';
  return got.length === 0 ? 'unrelated' : 'same';
}

/** 落ちてくる・現れる・近づく・襲うものの言い回し（よける言い換えを作る） */
const ARRIVAL = /(落ちて|降って|現れ|近づ|襲|やって来|来る)/u;
const AVOID = ['は地球を避ける', 'はそれていく', 'は大気で燃え尽きる', 'は地球に届かない', 'は来ない', 'は地球に近づかない'];

/** 少なくても：その行の、なくてはならないもの */
const NEEDS: { law: string; subject: string; items: string[]; verb: string }[] = [
  { law: 'plant_grow', subject: '植物', items: ['水', '光', '二酸化炭素'], verb: '育つ' },
  { law: 'human_water', subject: '人間', items: ['水'], verb: '生きられる' },
  { law: 'human_food', subject: '人間', items: ['食事'], verb: '生きられる' },
  { law: 'human_oxygen', subject: '人間', items: ['酸素'], verb: '生きられる' },
  { law: 'human_sleep', subject: '人間', items: ['睡眠'], verb: '生きられる' },
  { law: 'fire_burn', subject: '火', items: ['燃えるもの'], verb: '燃える' },
  { law: 'farm_land', subject: '作物', items: ['土', '水'], verb: '育つ' },
];

export function runPolarity(): PolarityCase[] {
  const out: PolarityCase[] = [];
  for (const p of gameData.phrases) {
    if (p.generic) continue;
    const base = `p:${p.id}`;
    const neg = negate(p.example);
    if (neg) {
      const got = readAdd(neg);
      out.push({ source: base, kind: 'neg', text: neg, got: got ?? [], verdict: judge(base, got) });
    }
    if (ARRIVAL.test(p.name)) {
      const subject = features(p.example).subject;
      if (subject) {
        for (const tail of AVOID) {
          const text = `${subject}${tail}。`;
          const got = readAdd(text);
          out.push({ source: base, kind: 'avoid', text, got: got ?? [], verdict: judge(base, got) });
        }
      }
    }
  }
  for (const law of gameData.laws) {
    for (const o of law.options) {
      if (o.kind === 'original' || o.kind === 'delete' || !o.text) continue;
      const neg = negate(o.text);
      if (!neg) continue;
      const base = `r:${law.id}.${o.id}`;
      const got = readLaw(law.id, neg);
      out.push({ source: base, kind: 'neg', text: neg, got: got ?? [], verdict: judge(base, got) });
    }
  }
  for (const n of NEEDS) {
    for (const item of n.items) {
      const text = `${n.subject}は${item}が少なくても${n.verb}。`;
      const got = readLaw(n.law, text);
      // 少なくても、は「その物が少しでよい」。ほかの物が「なし」になる読み取りや、その物が要らなくなる読み取りは逆向き
      const bad = (got ?? []).some((k) => {
        const m = /^r:(\w+)\.(.+)$/u.exec(k);
        const label = (m && gameData.optionOf.get(m[1]!)?.get(m[2]!)?.label) ?? '';
        return /なし|なくても|いらな|必要なく/u.test(label);
      });
      out.push({ source: `r:${n.law}`, kind: 'little', text, got: got ?? [], verdict: got === null ? 'noise' : bad ? 'reversed' : 'same' });
    }
  }
  return out;
}

/**
 * あいまいな言い換え（どちらにも読める）：逆向きに数えない。
 * 頻度つきの文の打ち消し（「週に一度食事を必要としない」は、週に一度も要らないとも、週に一度でよいとも読める）と、
 * 「ただし〜は除かない」のような、機械的に作った不自然な文
 */
export const AMBIGUOUS = new Set(['人間は週に一度食事を必要としない。', '人間は数日に一度食事を必要としない。', '生き物は暑さで弱る。ただし人間は除かない。']);

function main(): void {
  const cases = runPolarity().map((c) => (AMBIGUOUS.has(c.text) && c.verdict === 'reversed' ? { ...c, verdict: 'unrelated' as const } : c));
  const count = (v: Verdict) => cases.filter((c) => c.verdict === v).length;
  console.log(`言い換え ${cases.length}文：同じ向き（逆でない） ${count('same')}・逆向き ${count('reversed')}・無関係 ${count('unrelated')}・意味なし ${count('noise')}`);
  for (const kind of ['neg', 'avoid', 'little'] as const) {
    const list = cases.filter((c) => c.kind === kind);
    console.log(`  ${kind.padEnd(6)} ${list.length}文  逆向き ${list.filter((c) => c.verdict === 'reversed').length}`);
  }
  console.log('\n== 逆向き');
  for (const c of cases.filter((x) => x.verdict === 'reversed')) console.log(`  ${c.source}  「${c.text}」→ ${c.got.join('・')}`);
  console.log('\n== 無関係');
  for (const c of cases.filter((x) => x.verdict === 'unrelated')) console.log(`  ${c.source}  「${c.text}」→ ${c.got.join('・') || '（何も運ばない）'}`);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/polarity.ts')) main();
