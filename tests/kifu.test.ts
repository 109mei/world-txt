import { describe, expect, it } from 'vitest';
import { canReplay, kifuOf, replayKifu } from '../src/core';
import { gameData } from '../src/data';
import type { StageId } from '../src/data/schema';
import { playReader } from '../scripts/bots';

/**
 * 棋譜（P23）：世界番号・ステージ・規則の版と、手の並び。乱数を使わないので、棋譜から作り直した世界は、遊んだ世界と一致する
 */
describe('棋譜', () => {
  const STAGES: StageId[] = ['prologue', 'food', 'plague', 'climate', 'war', 'energy', 'tiny', 'loop'];
  it.each(STAGES)('%s：棋譜から作り直した世界が、遊んだ世界と一致する（世界番号いくつも）', (stage) => {
    for (const seed of [1000, 1003, 1007]) {
      const { g } = playReader(gameData, stage, seed);
      const k = kifuOf(g, gameData);
      expect(k.moves.length, `${stage} ${seed}`).toBeGreaterThan(0);
      const again = replayKifu(gameData, k);
      expect(again.status, `${stage} ${seed}`).toBe(g.status);
      expect(again.year).toBe(g.year);
      expect(again.sim).toEqual(g.sim);
      expect(again.texts).toEqual(g.texts);
      expect(again.moves).toEqual(g.moves);
    }
  });

  it('分かれ道からやり直す：途中の年までの世界を作り直せる', () => {
    const { g } = playReader(gameData, 'food', 1001);
    const k = kifuOf(g, gameData);
    const mid = replayKifu(gameData, k, { year: 5, loops: 0 });
    expect(mid.year).toBe(5);
    expect(mid.status).toBe('playing');
    expect(mid.moves.every((m) => m.year < 5 || (m.year === 5 && false))).toBe(true);
  });

  it('規則の版が違う棋譜は、今の規則では再生しない', () => {
    const { g } = playReader(gameData, 'food', 1002);
    const k = kifuOf(g, gameData);
    expect(canReplay(k, gameData)).toBe(true);
    expect(canReplay({ ...k, rules: 'old' }, gameData)).toBe(false);
  });
});
