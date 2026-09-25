import { describe, expect, it } from 'vitest';
import { addLine, advance, createGame, rewriteLaw } from '../src/core';
import { gameData } from '../src/data';
import { EMPTY_PROGRESS, MemorySaveStore, migrate, SAVE_VERSION, type Progress } from '../src/save';
import { newAchievements, progressValue } from '../src/store/achievements';
import { GameRuntime } from '../src/store/runtime';
import { playScenario, SCENARIOS } from '../scripts/worlds';

/** 実績：遊んでいる世界・世界の終わり方・これまでの進み具合から得る */

const fresh = (): Progress => structuredClone(EMPTY_PROGRESS);

function runtime(): GameRuntime {
  let seed = 100;
  return new GameRuntime({ data: gameData, store: new MemorySaveStore(), now: () => Date.UTC(2026, 8, 25, 3), newSeed: () => seed++ });
}

describe('実績', () => {
  it('はじめて書き換えると「最初の一文」、書き足すと「書き足す者」', () => {
    const g = createGame(gameData, 'food', 1);
    expect(newAchievements(gameData, g, fresh())).not.toContain('first_edit');
    rewriteLaw(g, gameData, 'human_food', '人間は数日に一度食事を必要とする。');
    expect(newAchievements(gameData, g, fresh())).toContain('first_edit');
    addLine(g, gameData, '人間は空を飛べる。');
    expect(newAchievements(gameData, g, fresh())).toContain('first_add');
  });

  it('1つの文に3つの概念を書くと「欲張りな一文」', () => {
    const g = createGame(gameData, 'food', 1);
    g.sim.capacityMax += 30 * 6;
    addLine(g, gameData, '人間は空を飛び、光合成でき、機械の体になる。');
    expect(newAchievements(gameData, g, fresh())).toContain('greedy_line');
  });

  it('老いも死もない人類を書くと「不老不死」、言い回しで書いた不死でも10年続けば「死のない世界」', () => {
    const g = createGame(gameData, 'tiny', 1);
    g.sim.capacityMax += 20 * 6;
    addLine(g, gameData, '人は不老不死である。');
    advance(g, gameData, 1);
    expect(newAchievements(gameData, g, fresh())).toContain('eternal');
    const h = createGame(gameData, 'tiny', 1);
    h.sim.capacityMax += 20 * 6;
    addLine(h, gameData, '誰も死なない。');
    while (h.status === 'playing' && h.year < 10) advance(h, gameData, 1);
    expect(h.status).toBe('playing');
    expect(newAchievements(gameData, h, fresh())).toContain('deathless');
  });

  it('世界の終わり方で得る実績は、終わってから（「重力を消した者」）', () => {
    const sc = SCENARIOS.find((s) => s.name === 'gravity')!;
    const g = playScenario(gameData, sc, 1);
    expect(g.ending).toBe('gravity_void');
    const got = newAchievements(gameData, g, fresh());
    expect(got).toContain('gravity');
    expect(got).not.toContain('universe');
  });

  it('1回だけの書き換えで救うと「一文で救う」', () => {
    const g = createGame(gameData, 'food', 1);
    rewriteLaw(g, gameData, 'human_food', '人間は数日に一度食事を必要とする。');
    advance(g, gameData, 40);
    while (g.status === 'playing') advance(g, gameData, 5);
    expect(g.status).toBe('cleared');
    const got = newAchievements(gameData, g, fresh());
    expect(got).toContain('minimalist');
    expect(got).toContain('food_clear');
  });

  it('進み具合の実績（救った世界の数は無限の世界を数えない）', () => {
    const p = fresh();
    p.cleared = ['food', 'plague', 'climate', 'war', 'energy', 'endless'];
    expect(progressValue(gameData, p, 'cleared')).toBe(5);
    expect(newAchievements(gameData, null, p)).toContain('three_clear');
    expect(newAchievements(gameData, null, p)).not.toContain('all_clear');
    p.cleared.push('tiny');
    expect(newAchievements(gameData, null, p)).not.toContain('all_clear');
    // くり返す十年も救うと、無限の世界のほかのすべての世界を救ったことになる
    p.cleared.push('loop');
    expect(newAchievements(gameData, null, p)).toContain('all_clear');
    p.endless = [{ years: 120, daily: null, at: 0, title: '' }];
    expect(newAchievements(gameData, null, p)).toEqual(expect.arrayContaining(['endless_50', 'endless_100']));
  });

  it('一度得た実績は、もう一度は得ない', () => {
    const p = fresh();
    p.worlds = 1;
    expect(newAchievements(gameData, null, p)).toContain('first_world');
    p.achievements.push('first_world');
    expect(newAchievements(gameData, null, p)).not.toContain('first_world');
  });

  it('実績の条件は、どれも読める', () => {
    for (const a of gameData.achievements) expect(a.world.length + a.progress.length + (a.end ? 1 : 0), a.id).toBeGreaterThan(0);
  });
});

describe('世界は1つだけ', () => {
  it('遊んでいる世界があるときに別の世界を開くと、前の世界は放棄され、その数が残る', () => {
    const rt = runtime();
    rt.start('food');
    expect(rt.progress.achievements).toContain('first_world');
    const first = rt.state!;
    rt.start('plague');
    expect(rt.state).not.toBe(first);
    expect(rt.state!.stageId).toBe('plague');
    expect(rt.progress.abandoned).toBe(1);
    expect(rt.progress.achievements).toContain('abandon');
    expect(rt.fresh).toContain('ach:abandon');
  });

  it('終わった世界からは、放棄にならずに次の世界を開ける', () => {
    const rt = runtime();
    rt.start('food');
    while (rt.state!.status === 'playing') rt.advance(5);
    rt.start('food');
    expect(rt.progress.abandoned).toBe(0);
  });

  it('別の画面で同じセーブが書き換えられたら、この画面からは保存しない', async () => {
    const store = new MemorySaveStore();
    const rt = new GameRuntime({ data: gameData, store, now: () => 0, newSeed: () => 1 });
    rt.start('food');
    const before = await store.load();
    rt.freeze();
    rt.advance(3);
    await rt.save();
    const after = await store.load();
    expect(after!.current!.year).toBe(before!.current!.year);
  });
});

describe('セーブ（版4）', () => {
  it('版3のセーブ（実績と放棄の数がない）も読める', () => {
    const old = { saveVersion: 3, savedAt: 0, settings: { bgm: true, volume: 0.6, analysis: false, se: true }, progress: { cleared: [], best: {}, worlds: 2, discovered: [], endless: [] }, current: null };
    const up = migrate(old);
    expect(up.saveVersion).toBe(SAVE_VERSION);
    expect(up.progress.achievements).toEqual([]);
    expect(up.progress.abandoned).toBe(0);
    expect(up.progress.worlds).toBe(2);
  });
});
