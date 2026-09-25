import { describe, expect, it } from 'vitest';
import { addLine, advance, createGame, rewriteLaw, type GameState } from '../src/core';
import { gameData } from '../src/data';
import type { StageId } from '../src/data/schema';

/** 決まった手順で遊ぶ（途中で書き換え・書き足しを混ぜる） */
function run(stage: StageId, seed: number): GameState {
  const g = createGame(gameData, stage, seed);
  rewriteLaw(g, gameData, 'human_food', '人間は数日に一度食事を必要とする。');
  addLine(g, gameData, '人間は空を飛べる。');
  while (g.status === 'playing') {
    advance(g, gameData, 5);
    if (g.year === 10) rewriteLaw(g, gameData, 'war', '');
  }
  return g;
}

describe('決定性', () => {
  it('同じ種・同じ書き換えなら、最後まで同じ世界になる', () => {
    for (const stage of ['food', 'plague', 'climate', 'war', 'energy', 'tiny', 'endless'] as StageId[]) {
      const a = run(stage, 12345);
      const b = run(stage, 12345);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });

  it('種が違えば、出来事の起き方が変わる', () => {
    const texts = new Set<string>();
    for (let seed = 1; seed <= 6; seed++) {
      const g = run('food', seed);
      texts.add(g.history.map((h) => `${h.year}:${h.text}`).join('|'));
    }
    expect(texts.size).toBeGreaterThan(1);
  });
});
