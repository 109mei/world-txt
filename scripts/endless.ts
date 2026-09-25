/**
 * 無限の世界のボット（ルール本体と同じコードで遊ぶ）。何年続いたかを測る。
 *   nothing  ：何もしない（対照群）
 *   random   ：でたらめに書き換える（対照群）
 *   steady   ：最初に食料と争いに備えるだけで、危機の知らせは読まない
 *   reactive ：危機の知らせを読んで、その危機を防ぐ文を書く。危機が去って世界が揺らいでいれば、書いた文を戻す
 */
import { addLine, advance, createGame, originalText, rewriteLaw, rewriteLine, type GameData, type GameState } from '../src/core';
import { playRandom } from './bots';

/** これより長く続いた世界は、そこで打ち切る（測るため） */
export const ENDLESS_CAP = 400;

type Edit = { law?: string; text: string };

/** 最初に書く文（食料と争いへの備え） */
const OPENING: Edit[] = [
  { law: 'human_food', text: '人間は数日に一度食事を必要とする。' },
  { law: 'war', text: '争いは話し合いになりうる。' },
];

/** 危機ごとの、防ぐための文（知らせの文から考えられるもの） */
export const COUNTERS: Record<string, Edit> = {
  meteor: { text: '隕石は地球に落ちない。' },
  pandemic: { law: 'pathogen_infect', text: '病原体は人に感染しない。' },
  supervolcano: { text: '災害は起きない。' },
  solar_storm: { law: 'electric', text: '電気は導線なしで伝わる。' },
  megadrought: { law: 'water_rain', text: '雨はたくさん降る。' },
  cold_age: { law: 'sun_shine', text: '太陽は少し明るくなる。' },
  blight: { law: 'pathogen_infect', text: '病原体は何にも感染しない。' },
  world_war: { law: 'war', text: '争いは話し合いになりうる。' },
  depression: { law: 'money', text: '' },
  megaquake: { text: '地震は起きない。' },
};

/** 書いた文を戻す（法則の行は元の文に、書き足した行は消す） */
type Shield = { law: string } | { line: string };

function apply(g: GameState, data: GameData, e: Edit): Shield | 'fail' | 'done' {
  if (e.law) {
    const res = rewriteLaw(g, data, e.law, e.text);
    if (res.block === 'same') return 'done';
    return res.block ? 'fail' : { law: e.law };
  }
  const res = addLine(g, data, e.text);
  if (res.block === 'redundant') return 'done';
  if (res.block) return 'fail';
  return res.redirect ? { law: res.redirect } : { line: g.extras[g.extras.length - 1]!.id };
}

function undo(g: GameState, data: GameData, s: Shield): boolean {
  if ('law' in s) return !rewriteLaw(g, data, s.law, originalText(data.lawById.get(s.law)!)).block;
  return !rewriteLine(g, data, s.line, '').block;
}

function run(data: GameData, seed: number, opening: boolean, react: boolean): GameState {
  const g = createGame(data, 'endless', seed);
  const todo: Edit[] = opening ? [...OPENING] : [];
  const shields: Shield[] = [];
  let answered = -1;
  let waiting = false;
  while (g.status === 'playing' && g.year < ENDLESS_CAP) {
    if (react) {
      // 危機の知らせが来たら、その危機を防ぐ文を先に書く
      if (g.crisis && g.crisis.at !== answered) {
        const c = COUNTERS[g.crisis.id];
        if (c) todo.unshift(c);
        answered = g.crisis.at;
        waiting = true;
      }
      // 危機が去り、世界が揺らいでいれば、いちばん古い防ぎの文を戻す
      if (!g.crisis && waiting) {
        waiting = false;
        if (g.sim.coherence < 60 && shields.length > 0 && g.edits.left > 0 && undo(g, data, shields[0]!)) shields.shift();
      }
    }
    while (todo.length > 0 && g.edits.left > 0) {
      const r = apply(g, data, todo[0]!);
      if (r === 'fail') break;
      if (r !== 'done' && react && todo.length > 0 && !OPENING.includes(todo[0]!)) shields.push(r);
      todo.shift();
    }
    advance(g, data, 1);
  }
  return g;
}

export const ENDLESS_POLICIES: { name: string; play: (data: GameData, seed: number) => GameState }[] = [
  { name: 'nothing', play: (data, seed) => run(data, seed, false, false) },
  { name: 'random', play: (data, seed) => playRandom(data, 'endless', seed) },
  { name: 'steady', play: (data, seed) => run(data, seed, true, false) },
  { name: 'reactive', play: (data, seed) => run(data, seed, true, true) },
];

/** 何年続いたかの、中央値・平均・最短・最長 */
export function spread(years: number[]): { median: number; mean: number; min: number; max: number } {
  const s = [...years].sort((a, b) => a - b);
  return {
    median: s[Math.floor(s.length / 2)] ?? 0,
    mean: s.reduce((a, b) => a + b, 0) / Math.max(1, s.length),
    min: s[0] ?? 0,
    max: s[s.length - 1] ?? 0,
  };
}
