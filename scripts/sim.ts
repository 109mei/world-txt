/**
 * ルール本体と同じコードで世界を回して、年ごとの様子を表にする。
 *   npm run sim -- food baseline        （ステージ・作戦）
 *   npm run sim -- food all 20          （全作戦を種20個ずつ回して、成否を集計）
 */
import { introFor, reviewOf, type GameData, type GameState, type Journey } from '../src/core';
import { gameData } from '../src/data';
import type { StageId } from '../src/data/schema';
import { playRandom, playReader } from './bots';
import { ENDLESS_CAP, ENDLESS_POLICIES, spread } from './endless';
import { runEdits } from './run';
import { STRATEGIES, type Strategy } from './strategies';

function row(g: GameState): string {
  const s = g.sim;
  const d = g.derived;
  const f = (v: number, n = 2) => v.toFixed(n).padStart(6);
  return [
    String(g.year).padStart(3),
    f(s.pop, 1),
    f(d.foodRatio),
    f(d.waterRatio),
    f(d.energyRatio),
    f(s.agri),
    f(s.eco, 0),
    f(s.temp),
    f(s.co2, 0),
    f(s.pathogen, 1),
    f(s.stability, 0),
    f(s.tension, 0),
    f(s.war, 1),
    f(s.industry),
    f(s.science),
    f(s.unemployment),
    f(d.civ, 0),
    f(s.coherence, 0),
    f(d.capacityRatio),
  ].join(' ');
}

const HEADER = 'yr    pop   food  water energy   agri    eco   temp    co2   path   stab   tens    war    ind    sci  unemp    civ    coh    cap';

/**
 * 作戦を最後まで遊ぶ。そのステージをはじめて遊べる筆の位で（作戦に clears があれば、その位で）。
 * 書換の力が足りない年の手は、力が戻った年に書く。cause を渡すと、その原因の型の世界で遊ぶ
 */
export function play(data: GameData, stage: StageId, strat: Strategy, seed: number, log = false, cause?: string | null): GameState {
  if (log) console.log(HEADER);
  const { g, blocks } = runEdits(data, stage, strat.edits, seed, {
    clears: strat.clears,
    cause,
    onEdit: (e, res) => {
      if (log) console.log(`  ✎ ${e.law ?? '＋'}「${e.text}」→ ${res.block ? `不可: ${res.block}` : res.reading ?? (res.understood ? '受け入れた' : '読み取れない')}`);
    },
    onYear: (w) => {
      if (!log) return;
      console.log(row(w));
      for (const n of w.report?.news ?? []) if (n.severity !== 'info' || n.surprise) console.log(`      ${n.severity === 'critical' ? '!!' : n.surprise ? '??' : ' -'} [${n.category}] ${n.text}`);
    },
  });
  // 筆の位で書けない手のある作戦は、作戦の書き間違い
  if (blocks.length > 0 && !log) throw new Error(`作戦 ${strat.name}: ${blocks.join(' / ')}`);
  return g;
}

/** その世界がちょうど開いた記録（手前の世界は遊び終えた。はじめて遊ぶ世界） */
export const FIRST_JOURNEY: Record<Exclude<StageId, 'endless'>, Journey> = {
  prologue: { cleared: [], played: [], discovered: [] },
  food: { cleared: [], played: ['prologue'], discovered: [] },
  plague: { cleared: [], played: ['prologue', 'food'], discovered: [] },
  climate: { cleared: [], played: ['prologue', 'food'], discovered: [] },
  war: { cleared: ['food'], played: ['prologue', 'food'], discovered: [] },
  energy: { cleared: ['food'], played: ['prologue', 'food'], discovered: [] },
  loop: { cleared: ['food', 'plague'], played: ['prologue', 'food', 'plague'], discovered: [] },
  tiny: { cleared: ['food', 'plague', 'climate'], played: ['prologue', 'food', 'plague', 'climate'], discovered: [] },
};

/**
 * 紹介前の決まりが、負けの主な原因になった割合（開いていく順番の確かめ。目標0%）。はじめて遊ぶ世界（紹介前の決まりは弱く動く）で、
 * 見立てるボットが負けた世界を2つの測り方で数える。
 * top：敗因の振り返りのいちばん上（崩れの直前の原因）が、紹介前の決まりの出来事（買いだめ・限りを超えた暮らしなど）だった。
 * blamed：紹介前の決まりを1つずつ止めて遊び直し、救えた（その決まりがなければ負けなかった。より厳しい測り方）
 */
export function introBlame(seeds: number): { stage: StageId; worlds: number; fails: number; top: number; blamed: number; who: Record<string, number> }[] {
  const out = [];
  for (const [stage, j] of Object.entries(FIRST_JOURNEY) as [StageId, Journey][]) {
    const intro = introFor(gameData, j);
    const weak = Object.keys(intro).filter((id) => (intro[id] ?? 1) < 1);
    let fails = 0;
    let top = 0;
    let blamed = 0;
    const who: Record<string, number> = {};
    for (let i = 0; i < seeds; i++) {
      const { g } = playReader(gameData, stage, 1000 + i, { intro });
      if (g.status !== 'failed') continue;
      fails += 1;
      const ref = reviewOf(g, gameData)?.top?.ref ?? null;
      const rule = ref ? gameData.unlocks.rules.find((r) => r.found.includes(ref)) : undefined;
      if (rule && weak.includes(rule.id)) top += 1;
      for (const id of weak) {
        const { g: h } = playReader(gameData, stage, 1000 + i, { intro: { ...intro, [id]: 0 } });
        if (h.status === 'cleared') {
          blamed += 1;
          who[id] = (who[id] ?? 0) + 1;
          break;
        }
      }
    }
    out.push({ stage, worlds: seeds, fails, top, blamed, who });
  }
  return out;
}

function main(): void {
  const [stage = 'food', name = 'baseline', seedsArg = '1'] = process.argv.slice(2);
  if (stage === 'intro') {
    // npm run sim -- intro 20：はじめて遊ぶ世界で、紹介前の決まりが負けの主な原因になった割合（INTRO_BEFORE で紹介前の強さを試せる）
    if (process.env.INTRO_BEFORE) gameData.balance.intro.before = Number(process.env.INTRO_BEFORE);
    const seeds = Number(name === 'baseline' ? 20 : name);
    let fails = 0;
    let top = 0;
    let blamed = 0;
    for (const r of introBlame(seeds)) {
      fails += r.fails;
      top += r.top;
      blamed += r.blamed;
      console.log(`${r.stage.padEnd(9)} 負け ${String(r.fails).padStart(2)}/${r.worlds}  振り返りのいちばん上 ${r.top}  止めると救えた ${r.blamed}  ${JSON.stringify(r.who)}`);
    }
    const pct = (n: number) => (fails ? ((n / fails) * 100).toFixed(1) : '0.0');
    console.log(`合計：負け ${fails}、振り返りのいちばん上が紹介前の決まり ${top}（${pct(top)}%）、止めると救えた ${blamed}（${pct(blamed)}%）`);
    return;
  }
  const strategies = STRATEGIES[stage as StageId] ?? [];
  if (stage === 'endless') {
    // 無限の世界：ボットごとに、文明が何年続いたか
    const seeds = Number(seedsArg);
    for (const pol of ENDLESS_POLICIES.filter((x) => name === 'all' || x.name === name)) {
      const years: number[] = [];
      const reasons: Record<string, number> = {};
      const crises = { averted: 0, softened: 0, struck: 0 };
      for (let i = 0; i < seeds; i++) {
        const g = pol.play(gameData, 1000 + i);
        years.push(g.year);
        const why = g.status === 'playing' ? `${ENDLESS_CAP}年で打ち切り` : (g.failReason ?? g.ending ?? '?');
        reasons[why] = (reasons[why] ?? 0) + 1;
        crises.averted += g.crises.averted;
        crises.softened += g.crises.softened;
        crises.struck += g.crises.struck;
      }
      const s = spread(years);
      console.log(
        `${pol.name.padEnd(10)} 中央値 ${String(s.median).padStart(3)}年  平均 ${s.mean.toFixed(1).padStart(5)}年  最短 ${s.min} 最長 ${s.max}  危機 防いだ${crises.averted} 弱めた${crises.softened} 受けた${crises.struck}  ${JSON.stringify(reasons)}`,
      );
    }
    return;
  }
  if (name === 'all') {
    const seeds = Number(seedsArg);
    for (const strat of strategies) {
      let clear = 0;
      const years: number[] = [];
      const reasons: Record<string, number> = {};
      for (let i = 0; i < seeds; i++) {
        const g = play(gameData, stage as StageId, strat, 1000 + i);
        if (g.status === 'cleared') clear += 1;
        else {
          years.push(g.year);
          reasons[g.failReason ?? g.ending ?? '?'] = (reasons[g.failReason ?? g.ending ?? '?'] ?? 0) + 1;
        }
      }
      const avgFail = years.length ? (years.reduce((a, b) => a + b, 0) / years.length).toFixed(1) : '-';
      console.log(`${strat.name.padEnd(24)} クリア ${clear}/${seeds}  失敗の平均年 ${avgFail}  ${JSON.stringify(reasons)}`);
    }
    for (const [label, bot] of [['(bot) random', playRandom]] as const) {
      let clear = 0;
      const reasons: Record<string, number> = {};
      const n = seeds;
      for (let i = 0; i < n; i++) {
        const g = bot(gameData, stage as StageId, 1000 + i);
        if (g.status === 'cleared') clear += 1;
        else reasons[g.failReason ?? g.ending ?? '?'] = (reasons[g.failReason ?? g.ending ?? '?'] ?? 0) + 1;
      }
      console.log(`${label.padEnd(24)} クリア ${clear}/${n}  ${JSON.stringify(reasons)}`);
    }
    return;
  }
  const strat = strategies.find((s) => s.name === name);
  if (!strat) {
    console.log(`作戦がない: ${name}（${strategies.map((s) => s.name).join(', ')}）`);
    return;
  }
  const g = play(gameData, stage as StageId, strat, Number(seedsArg), true);
  console.log(`結果: ${g.status} ${g.failReason ?? ''} year=${g.year}`);
}

if (process.argv[1]?.endsWith('sim.ts')) main();
