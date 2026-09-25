/**
 * ルール本体と同じコードで世界を回して、年ごとの様子を表にする。
 *   npm run sim -- food baseline        （ステージ・作戦）
 *   npm run sim -- food all 20          （全作戦を種20個ずつ回して、成否を集計）
 */
import { addLine, advance, createGame, rewriteLaw, type GameData, type GameState } from '../src/core';
import { gameData } from '../src/data';
import type { StageId } from '../src/data/schema';
import { playRandom } from './bots';
import { ENDLESS_CAP, ENDLESS_POLICIES, spread } from './endless';
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

export function play(data: GameData, stage: StageId, strat: Strategy, seed: number, log = false): GameState {
  const g = createGame(data, stage, seed);
  if (log) {
    console.log(HEADER);
    console.log(row(g));
  }
  const goal = data.stageById.get(stage)!.goalYears;
  // くり返す世界では暦が戻るので、書き手の年数（進めた回数）にも上限を置く
  let steps = 0;
  while (g.status === 'playing' && g.year < goal && steps++ < 600) {
    for (const e of strat.edits) {
      if (e.year === g.year && (e.pass === undefined || e.pass === (g.loop?.count ?? 0))) {
        const res = e.law ? rewriteLaw(g, data, e.law, e.text) : addLine(g, data, e.text);
        if (log) console.log(`  ✎ ${e.law ?? '＋'}「${e.text}」→ ${res.block ? `不可: ${res.block}` : res.reading ?? (res.understood ? '受け入れた' : '読み取れない')}`);
        // 世界異常（存在消失）で先に消えていた行は、そのまま進める
        if (res.block && res.block !== 'same' && !log) throw new Error(`作戦 ${strat.name}: ${e.law ?? '追加'} が不可（${res.block}）`);
      }
    }
    const rep = advance(g, data, 1);
    if (log) {
      console.log(row(g));
      for (const n of rep.news) if (n.severity !== 'info' || n.surprise) console.log(`      ${n.severity === 'critical' ? '!!' : n.surprise ? '??' : ' -'} [${n.category}] ${n.text}`);
    }
  }
  return g;
}

function main(): void {
  const [stage = 'food', name = 'baseline', seedsArg = '1'] = process.argv.slice(2);
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
