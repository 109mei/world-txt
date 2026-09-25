/**
 * バランス調整用のボット（ルール本体と同じコードで遊ぶ）。
 * random：状況を見ずに、書換の力が戻るたびにでたらめに文章を書き換える・消す・書き足す（対照群）
 */
import { addLine, advance, createGame, rewriteLaw, type GameData, type GameState } from '../src/core';
import type { StageId } from '../src/data/schema';

/** 種つきの乱数（ボット専用。ゲームの乱数とは別） */
function botRng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function playRandom(data: GameData, stage: StageId, seed: number): GameState {
  const g = createGame(data, stage, seed);
  const rnd = botRng(seed * 7 + 3);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]!;
  // 無限の世界は、長く続いてもどこかで打ち切る
  while (g.status === 'playing' && g.year < 400) {
    let tries = 0;
    while (g.edits.left > 0 && tries++ < 20) {
      const r = rnd();
      if (r < 0.45) {
        // 法則を、その法則の例文のどれかに書き換える
        const law = pick(data.laws);
        const texts = law.options.map((o) => (o.kind === 'delete' ? '' : (o.text ?? ''))).filter((t) => t !== g.texts[law.id]);
        rewriteLaw(g, data, law.id, pick(texts));
      } else if (r < 0.75) {
        rewriteLaw(g, data, pick(data.laws).id, '');
      } else {
        addLine(g, data, pick(data.phrases).example);
      }
    }
    advance(g, data, 1);
  }
  return g;
}
