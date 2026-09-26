import { describe, expect, it } from 'vitest';
import { addLine, advance, createGame, rewriteLaw, stepYear, type GameState } from '../src/core';
import { gameData } from '../src/data';
import { dailySeed } from '../src/store/runtime';
import { ENDLESS_POLICIES, spread } from '../scripts/endless';

/**
 * 無限の世界：目標の年はなく、文明が滅ぶまで続く。危機の知らせが届き、数年後に世界を襲う。
 * 襲う年の世界の定義しだいで、防げる・弱まる・そのまま襲う。
 */

/** 危機を1つ、いま知らせたことにする（テスト用） */
function announce(g: GameState, id: string, inYears = 1): void {
  g.crisis = { id, at: g.year + inYears, strength: 1 };
}

describe('無限の世界', () => {
  const stage = gameData.stageById.get('endless')!;

  it('目標の年がなく、クリアしない。1つの世界を救うと開く', () => {
    expect(stage.endless).toBe(true);
    expect(stage.unlock).toBe(1);
    const g = createGame(gameData, 'endless', 3);
    g.year = stage.goalYears + 5;
    stepYear(g, gameData);
    expect(g.status).not.toBe('cleared');
  });

  it('世界番号で決まる年に、最初の危機の知らせが届く（重大な知らせなので、時間はそこで止まる）', () => {
    const g = createGame(gameData, 'endless', 11);
    const first = g.nextCrisis;
    const k = gameData.balance.crisis;
    expect(first).toBeGreaterThanOrEqual(k.firstAt);
    expect(first).toBeLessThanOrEqual(k.firstAt + k.jitter);
    expect(createGame(gameData, 'endless', 11).nextCrisis).toBe(first);
    const rep = advance(g, gameData, first + 3);
    expect(g.crisis).not.toBeNull();
    expect(rep.to).toBe(first);
    const c = gameData.crisisById.get(g.crisis!.id)!;
    expect(rep.news.some((n) => n.text === c.warn.replace('{n}', String(c.lead)) && n.severity === 'critical')).toBe(true);
    expect(g.crisis!.at).toBe(first + c.lead);
  });

  it('知らせのあとは、襲う年まで毎年「あと何年」を知らせる', () => {
    const g = createGame(gameData, 'endless', 11);
    announce(g, 'meteor', 3);
    const news = stepYear(g, gameData);
    expect(news.some((n) => n.text.includes('あと2年で衝突する'))).toBe(true);
  });

  it('襲う年までに世界の定義を書き換えていれば、危機は起きない（どの行が防いだかも残る）', () => {
    const g = createGame(gameData, 'endless', 21);
    addLine(g, gameData, '隕石は地球に落ちない。');
    announce(g, 'meteor');
    const pop = g.sim.pop;
    const news = stepYear(g, gameData);
    const c = gameData.crisisById.get('meteor')!;
    const saved = news.find((n) => n.text === c.averted);
    expect(saved).toBeTruthy();
    expect(saved!.cause?.text).toBe('隕石は地球に落ちない。');
    expect(g.crises.averted).toBe(1);
    expect(g.found).toContain('k:meteor.averted');
    expect(g.crisis).toBeNull();
    expect(g.sim.pop).toBeGreaterThan(pop * 0.97);
  });

  it('何も書き換えていなければ、危機は世界を襲う', () => {
    const g = createGame(gameData, 'endless', 21);
    announce(g, 'meteor');
    const pop = g.sim.pop;
    const news = stepYear(g, gameData);
    const c = gameData.crisisById.get('meteor')!;
    expect(news.some((n) => n.text === c.strike && n.why === c.why)).toBe(true);
    expect(g.crises.struck).toBe(1);
    expect(g.found).toContain('k:meteor');
    expect(g.sim.pop).toBeLessThan(pop * 0.95);
  });

  it('弱める定義があれば、危機は半分ほどの強さで襲う', () => {
    const hit = (soft: boolean) => {
      const g = createGame(gameData, 'endless', 21);
      if (soft) rewriteLaw(g, gameData, 'weapons', '兵器は人を傷つけない。');
      announce(g, 'world_war');
      stepYear(g, gameData);
      return g;
    };
    const soft = hit(true);
    const full = hit(false);
    expect(soft.crises.softened).toBe(1);
    expect(soft.found).toContain('k:world_war.softened');
    expect(full.crises.struck).toBe(1);
    expect(soft.sim.war).toBeLessThan(full.sim.war);
  });

  it('危機は年とともに強くなり、間隔は短くなる', () => {
    const k = gameData.balance.crisis;
    expect(Math.min(k.maxStrength, 1 + k.growth * 100)).toBeGreaterThan(Math.min(k.maxStrength, 1 + k.growth * 10));
    expect(Math.max(k.gapMin, k.gapStart - k.gapShrink * 100)).toBeLessThan(Math.max(k.gapMin, k.gapStart - k.gapShrink * 10));
  });

  it('同じ種・同じ書き換えなら、同じ危機が同じ年に来る', () => {
    const run = (seed: number) => {
      const g = createGame(gameData, 'endless', seed);
      rewriteLaw(g, gameData, 'war', '争いは話し合いになりうる。');
      const seen: string[] = [];
      for (let i = 0; i < 60 && g.status === 'playing'; i++) {
        advance(g, gameData, 1);
        if (g.crisis && !seen.includes(`${g.crisis.id}@${g.crisis.at}`)) seen.push(`${g.crisis.id}@${g.crisis.at}`);
      }
      return { seen, g };
    };
    // 危機が2度以上来る世界番号を探して、同じ世界番号でもう一度遊ぶ
    let seed = 77;
    let a = run(seed);
    while (a.seen.length < 2 && seed < 200) a = run(++seed);
    const b = run(seed);
    expect(a.seen.length).toBeGreaterThan(1);
    expect(b.seen).toEqual(a.seen);
    expect(b.g).toEqual(a.g);
  });

  it('今日の世界：同じ日付なら同じ種、日付が違えば違う種', () => {
    expect(dailySeed('2026-09-25')).toBe(dailySeed('2026-09-25'));
    expect(dailySeed('2026-09-25')).not.toBe(dailySeed('2026-09-26'));
    expect(dailySeed('2026-09-25')).toBeGreaterThan(0);
  });

  it('危機の知らせは現実の根拠（なぜ？）を持ち、どの危機にも防ぐ手と弱める手がある', () => {
    for (const c of gameData.crises) {
      expect(c.why.length, c.id).toBeGreaterThan(10);
      expect(c.avertedBy.length, c.id).toBeGreaterThan(0);
      expect(c.softenedBy.length, c.id).toBeGreaterThan(0);
      expect(c.warn, c.id).toContain('{n}');
    }
  });
});

describe('無限の世界の手触り（docs/SPEC.md 5章）', () => {
  // 種は `npm run sim -- endless all 30` と同じ30個
  const seeds = Array.from({ length: 30 }, (_, i) => 1000 + i);
  const cache = new Map<string, ReturnType<typeof spread>>();
  const years = (name: string) => {
    if (!cache.has(name)) cache.set(name, spread(seeds.map((s) => ENDLESS_POLICIES.find((p) => p.name === name)!.play(gameData, s).year)));
    return cache.get(name)!;
  };

  it('何もしないと、数十年で滅びる（中央値 20〜40年）。でたらめに書き換えると、何もしないより早く滅びる', () => {
    const nothing = years('nothing');
    expect(nothing.median).toBeGreaterThanOrEqual(20);
    expect(nothing.median).toBeLessThanOrEqual(40);
    expect(years('random').median).toBeLessThan(nothing.median);
  });

  it('危機の知らせを読んで防ぐと、何もしない世界の2倍以上続く', () => {
    const nothing = years('nothing');
    const reactive = years('reactive');
    expect(reactive.median).toBeGreaterThanOrEqual(nothing.median * 2);
  });
});
