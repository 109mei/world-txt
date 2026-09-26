import { describe, expect, it } from 'vitest';
import { advance, computeChannels, createGame, lawTotals, rewriteLaw, strengthOf } from '../src/core';
import { gameData } from '../src/data';

/** 段階3：3つの操作の役割（言い切りの強さと反動の比例・上書きの傷・短く言い換えは1行1度） */

describe('言い切りの強さ', () => {
  it('「すべて」「決して」と打ち消しの言い切りは強く、「やや」「ゆるやかに」は控えめ、手がかりがなければふつう', () => {
    expect(strengthOf('人間は決して争わない。')).toBe('strong');
    expect(strengthOf('人間は食事を必要としない。')).toBe('strong');
    expect(strengthOf('人間はややゆっくり老いていく。')).toBe('mild');
    expect(strengthOf('人間は数日に一度食事を必要とする。')).toBe('plain');
    // 範囲を絞った書き方（ただし〜）は、読み取り（例外）そのものに表れるので、強さには数えない
    expect(strengthOf('病原体は生き物に感染する。ただし人間には感染しない。')).toBe('plain');
  });

  it('強く言い切った文は効き目も大きく、控えめな文は小さい', () => {
    const effect = (text: string) => {
      const g = createGame(gameData, 'food', 1);
      rewriteLaw(g, gameData, 'plant_grow', text);
      // 植物の行は、効き始めまでに遅れがある（効き始めた年で比べる）
      g.year += gameData.balance.delays.concepts.plant ?? 0;
      return computeChannels(g, gameData).ch.yield;
    };
    const base = computeChannels(createGame(gameData, 'food', 1), gameData).ch.yield;
    const plain = effect('植物は速く育つ。');
    const mild = effect('植物はやや速く育つ。');
    expect(plain).toBeGreaterThan(base);
    expect(mild - base).toBeLessThan(plain - base);
  });

  it('反動（副作用）は、強く言い切った文ほど速く育つ', () => {
    const grow = (text: string) => {
      const g = createGame(gameData, 'food', 1);
      rewriteLaw(g, gameData, 'human_food', text);
      advance(g, gameData, 6);
      return g.twists.food_culture_loss ?? 0;
    };
    expect(grow('人間はすべて数日に一度食事を必要とする。')).toBeGreaterThan(grow('人間は数日に一度食事を必要とする。'));
  });
});

describe('上書きの傷', () => {
  it('同じ行を2度目から書き直すたびに、世界整合性が下がる', () => {
    const g = createGame(gameData, 'food', 1);
    g.edits.left = 5;
    rewriteLaw(g, gameData, 'human_food', '人間は数日に一度食事を必要とする。');
    const once = lawTotals(gameData, g).incoherence;
    rewriteLaw(g, gameData, 'human_food', '人間は毎日食事を必要とする。');
    rewriteLaw(g, gameData, 'human_food', '人間は数日に一度食事を必要とする。');
    expect(g.rewrites.human_food).toBe(3);
    expect(lawTotals(gameData, g).incoherence).toBe(once + 2 * gameData.balance.overwrite.incoherence);
  });
});

describe('短く言い換えて空けるのは、1行につき1度まで', () => {
  it('同じ意味のまま短く言い換えると空くが、同じ行でもう一度は短くできない', () => {
    const g = createGame(gameData, 'tiny', 1);
    g.edits.left = 5;
    expect(rewriteLaw(g, gameData, 'sun_shine', '太陽は同じ強さで地球を照らす。').block).toBeNull();
    expect(g.trims.sun_shine).toBe(true);
    expect(rewriteLaw(g, gameData, 'sun_shine', '太陽は地球を照らす。').block).toBe('trimmed');
    // 別の意味に書き換えるのはかまわない
    expect(rewriteLaw(g, gameData, 'sun_shine', '太陽は弱く照らす。').block).toBeNull();
  });
});
