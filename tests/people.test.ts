import { describe, expect, it } from 'vitest';
import { addLine, advance, createGame, hoarding, livingLevel, overshootScale, recovery, rewriteLine, signsOf } from '../src/core';
import { peopleTerms } from '../src/core/people';
import { gameData } from '../src/data';
import type { StageId } from '../src/data/schema';

/**
 * 世界の人々の心と、社会の学問で知られた振る舞い（P15・P16・P12。分析の7章）。どれも乱数を使わない。
 */
describe('人々の心', () => {
  /** 同じ量の水の減り方を、1年で起こすか、10年かけて起こすか。何も起きない世界からいちばん離れた量を返す */
  function fall(sudden: boolean): { stability: number; happiness: number } {
    const base = createGame(gameData, 'endless', 1000);
    const g = createGame(gameData, 'endless', 1000);
    let stab = 0;
    let happy = 0;
    for (let y = 0; y < 10; y++) {
      if (sudden && y === 0) g.effects.push({ source: 'test', mods: { waterSupply: 0.9 }, remaining: 99 });
      if (!sudden) g.effects.push({ source: 'test', mods: { waterSupply: Math.pow(0.9, 1 / 10) }, remaining: 99 });
      advance(base, gameData, 1);
      advance(g, gameData, 1);
      stab = Math.max(stab, base.sim.stability - g.sim.stability);
      happy = Math.max(happy, base.sim.happiness - g.sim.happiness);
    }
    return { stability: stab, happiness: happy };
  }

  it('慣れと損の重さ：同じ量の悪化でも、1年で起きると、10年かけて起きるより安定と幸福が大きく揺れる', () => {
    const sudden = fall(true);
    const slow = fall(false);
    expect(sudden.stability).toBeGreaterThan(slow.stability);
    expect(sudden.happiness).toBeGreaterThan(slow.happiness);
  });

  it('損は得より重い：基準から同じだけ下がると、同じだけ上がるより大きく動く', () => {
    const g = createGame(gameData, 'endless', 1000);
    const d = g.derived;
    const L = livingLevel(g.sim, d, gameData.balance);
    const up = peopleTerms({ ...g.sim, ref: L - 0.1, peak: L - 0.1 }, d, gameData.balance);
    const down = peopleTerms({ ...g.sim, ref: L + 0.1, peak: L }, d, gameData.balance);
    expect(-down.happiness).toBeGreaterThan(up.happiness);
    expect(-down.stability).toBeGreaterThan(up.stability);
  });

  it('期待とのずれ（J字）：良くなったあとに落ちた世界は、同じ暮らしでも緊張が高い', () => {
    const g = createGame(gameData, 'endless', 1000);
    const d = g.derived;
    const L = livingLevel(g.sim, d, gameData.balance);
    const steady = peopleTerms({ ...g.sim, ref: L, peak: L }, d, gameData.balance);
    const fallen = peopleTerms({ ...g.sim, ref: L, peak: L + 0.2 }, d, gameData.balance);
    expect(fallen.tension).toBeGreaterThan(steady.tension);
  });

  it('信頼の高い世界では、先行きが不安でも買いだめが起きにくい', () => {
    const g = createGame(gameData, 'endless', 1000);
    g.sim.anxiety = 90;
    g.sim.trust = 90;
    expect(hoarding(g.sim, gameData.balance)).toBe(false);
    g.sim.trust = 10;
    expect(hoarding(g.sim, gameData.balance)).toBe(true);
  });

  it('信頼は、築くのは遅く、壊れるのは速い', () => {
    const g = createGame(gameData, 'endless', 1000);
    g.sim.trust = 50;
    // 足りて安定した年
    g.sim.stability = 70;
    const before = g.sim.trust;
    advance(g, gameData, 1);
    const rise = g.sim.trust - before;
    // 大きく足りない年
    const h = createGame(gameData, 'endless', 1000);
    h.sim.trust = 50;
    h.effects.push({ source: 'test', mods: { foodDemand: 1.6, waterSupply: 0.6 }, remaining: 3 });
    advance(h, gameData, 1);
    const drop = 50 - h.sim.trust;
    expect(drop).toBeGreaterThan(Math.abs(rise) * 3);
  });

  it('考え方の広がり：性質を先に書いて広げてから制度を添えた世界と、制度を先に書いた世界では、広がりが違う（締め出し）', () => {
    const run = (natureFirst: boolean) => {
      const g = createGame(gameData, 'endless', 1000, null);
      g.edits.left = 20;
      const nature = '人は食べ物を分かち合う。';
      const rule = '政府が食料を配給する。';
      addLine(g, gameData, natureFirst ? nature : rule);
      g.sim.trust = 80;
      advance(g, gameData, 7);
      addLine(g, gameData, natureFirst ? rule : nature);
      g.sim.trust = 80;
      advance(g, gameData, 7);
      const line = g.extras.find((x) => x.text === nature)!;
      return g.spread[line.id] ?? 0;
    };
    const a = run(true);
    const b = run(false);
    expect(a).not.toBeCloseTo(b, 2);
    expect(a).toBeGreaterThan(b);
  });

  it('締め出された考えは、制度を消しても戻らない', () => {
    const g = createGame(gameData, 'endless', 1000, null);
    g.edits.left = 20;
    addLine(g, gameData, '政府が食料を配給する。');
    addLine(g, gameData, '人は食べ物を分かち合う。');
    advance(g, gameData, 2);
    expect(g.crowded.share).toBe(true);
    rewriteLine(g, gameData, g.extras[0]!.id, '');
    advance(g, gameData, 5);
    expect(g.crowded.share).toBe(true);
    const line = g.extras.find((x) => x.text.includes('分かち合う'))!;
    expect(g.spread[line.id] ?? 0).toBeLessThanOrEqual(gameData.balance.people.spread.crowdCap);
  });

  it('用心：流行が広がると人は用心し、落ち着くと緩む', () => {
    const g = createGame(gameData, 'plague', 1000);
    g.sim.pathogen = 60;
    advance(g, gameData, 1);
    const high = g.sim.caution;
    g.sim.pathogen = 0.5;
    advance(g, gameData, 4);
    expect(high).toBeGreaterThan(0);
    expect(g.sim.caution).toBeLessThan(high);
  });

  it('限りを超えた年が続くと、同じ出来事の打撃が大きくなる', () => {
    const g = createGame(gameData, 'endless', 1000);
    g.sim.overshoot = 0;
    const calm = overshootScale(g.sim, gameData.balance);
    g.sim.overshoot = 8;
    expect(overshootScale(g.sim, gameData.balance)).toBeGreaterThan(calm);
  });

  it('戻りの遅さ：文明が終わりの線に近いほど、揺れからの戻りが遅い', () => {
    const b = gameData.balance;
    expect(recovery(70, b.people.slowing.line, b)).toBe(1);
    expect(recovery(30, b.people.slowing.line, b)).toBeLessThan(1);
  });
});

describe('崩れる前に兆しが出る（見えない転換点で負けない）', () => {
  const STAGES: StageId[] = ['food', 'plague', 'climate', 'war', 'energy', 'endless'];
  it.each(STAGES)('%s：何もしない世界が崩れる前の年までに、起きかけていることが出ている', (stage) => {
    for (const seed of [1000, 1001, 1002, 1003, 1004]) {
      const g = createGame(gameData, stage, seed);
      let seen = false;
      let n = 0;
      while (g.status === 'playing' && n++ < 300) {
        if (signsOf(g, gameData).length > 0) seen = true;
        advance(g, gameData, 1);
      }
      if (g.status === 'failed') expect(seen, `${stage} ${seed} ${g.year}`).toBe(true);
    }
  });
});
