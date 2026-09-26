import { describe, expect, it } from 'vitest';
import { addLine, advance, checkAll, createGame, GENERIC_ENDINGS, stepYear } from '../src/core';
import { gameData } from '../src/data';
import { playReader } from '../scripts/bots';
import { SCENARIOS, playScenario } from '../scripts/worlds';

/**
 * 特別な結末。宇宙・地球・重力・太陽・人類が消える、宇宙人が来る、星々へ移り住む、楽園、
 * 人が死ななくなる（終わらない老い・死ねない星・閉じた永遠）、そして滅び方の名前（核の冬・凍りついた星 など）。
 */

const scenario = (name: string) => SCENARIOS.find((s) => s.name === name)!;

describe('いろいろな世界への変化と、その結末', () => {
  for (const sc of SCENARIOS.filter((s) => s.expect)) {
    it(`${sc.name}：「${sc.edits.map((e) => e.text || `（${e.law} を消す）`).join('」「')}」→ ${sc.expect!.join(' / ')}`, () => {
      const seen = [11, 12, 13].map((seed) => `${playScenario(gameData, sc, seed).ending}`);
      // 移り住む力が足りない年もあるので、3つの種の過半で起きればよい
      const hits = seen.filter((e) => sc.expect!.includes(e)).length;
      expect(hits, seen.join(' ')).toBeGreaterThanOrEqual(2);
    });
  }

  it('宇宙・地球・人類が消えたら、次の年に世界は終わる。重力は2年、太陽は3年かかる', () => {
    const years = (name: string) => playScenario(gameData, scenario(name), 5).year;
    expect(years('universe')).toBe(1);
    expect(years('earth')).toBe(1);
    expect(years('no_humans')).toBe(1);
    expect(years('gravity')).toBe(2);
    expect(years('sunless')).toBe(3);
  });

  it('時間のかかる結末は、始まった年に「あと何年」を知らせる（どの一文から来たかも）', () => {
    const g = createGame(gameData, 'food', 3);
    g.sim.capacityMax += 20 * 6;
    addLine(g, gameData, '重力は存在しない。');
    const news = stepYear(g, gameData);
    expect(g.status).toBe('playing');
    expect(news.some((n) => n.text.includes('あと1年') && n.cause?.text === '重力は存在しない。')).toBe(true);
    stepYear(g, gameData);
    expect(g.ending).toBe('gravity_void');
  });

  it('特別な結末は観測記録に残る', () => {
    const g = playScenario(gameData, scenario('aliens_peace'), 7);
    expect(g.ending).toBe('star_friends');
    expect(g.status).toBe('cleared');
    expect(g.found).toContain('x:star_friends');
  });

  it('無限の世界では、クリアの結末（星々の友）に到達しても世界は続く', () => {
    const g = playScenario(gameData, scenario('aliens_endless'), 7);
    expect(g.found).toContain('x:star_friends');
    expect(g.fired['ending:star_friends']).toBeDefined();
    expect(g.ending === 'star_friends').toBe(false);
    expect(g.year).toBeGreaterThan(10);
  });

  it('クリアの結末で終わった世界は、クリアとして記録される（星々の友）', () => {
    const g = createGame(gameData, 'plague', 7);
    g.sim.capacityMax += 40 * 6;
    g.edits.left = 5;
    // 病の広がらない、食べ物の足りる、争いのない世界に宇宙人が来る（病で人が減らない世界は、食べ物が足りなくなると緊張が高まる）
    addLine(g, gameData, '病原体は人に感染しない。');
    addLine(g, gameData, '人間は数日に一度食事を必要とする。');
    addLine(g, gameData, '争いは話し合いになりうる。');
    addLine(g, gameData, '宇宙人が地球に来る。');
    while (g.status === 'playing') advance(g, gameData, 5);
    expect(g.status).toBe('cleared');
    expect(['star_friends', 'utopia', 'clear']).toContain(g.ending);
  });

  it('ふつうの滅び方にも、そのときの世界に合った名前がつく（温室効果を打ち消すと凍りついた星）', () => {
    const g = playScenario(gameData, scenario('no_greenhouse'), 21);
    expect(g.status).toBe('failed');
    expect(g.failReason).not.toBeNull();
    expect(g.ending).toBe('frozen');
    expect(g.found).toContain('x:frozen');
  });

  it('よく作り込んだ世界は「楽園」にたどり着くことがある（見立てて書いた極小世界）', () => {
    const endings = Array.from({ length: 30 }, (_, i) => playReader(gameData, 'tiny', 1000 + i).g.ending);
    expect(endings).toContain('utopia');
  });

  it('何もしない世界が、特別な結末でクリアすることはない', () => {
    for (const stage of ['food', 'plague', 'climate', 'war', 'energy', 'tiny'] as const) {
      for (const seed of [1, 2]) {
        const g = createGame(gameData, stage, seed);
        advance(g, gameData, 60);
        const e = g.ending ? gameData.endingById.get(g.ending) : undefined;
        expect(e?.kind === 'clear' && e.type === 'trigger', `${stage} ${g.ending}`).toBe(false);
      }
    }
  });

  it('死なない世界では、飢饉の知らせに「餓死者」は出ず、死ねない人々の飢えになる', () => {
    const g = createGame(gameData, 'food', 1);
    g.sim.capacityMax += 20 * 6;
    addLine(g, gameData, '人は死なない。');
    const texts: string[] = [];
    while (g.status === 'playing' && g.year < 30) texts.push(...advance(g, gameData, 1).news.map((n) => n.text));
    expect(texts.some((t) => t.includes('餓死者'))).toBe(false);
    expect(texts.some((t) => t.includes('死ねない人々の飢え'))).toBe(true);
  });

  it('「死なない」だけなら老いは続き、介護の手が足りなくなっていく。不老不死なら起きない', () => {
    const grow = (text: string) => {
      const g = createGame(gameData, 'tiny', 2);
      g.sim.capacityMax += 20 * 6;
      addLine(g, gameData, text);
      while (g.status === 'playing' && g.year < 12) advance(g, gameData, 1);
      return g.twists.endless_aging ?? 0;
    };
    expect(grow('人は死なない。')).toBeGreaterThan(0.2);
    expect(grow('人は不老不死である。')).toBe(0);
  });

  it('不老不死は「不老不死文明」になる（「老いない」「死なない」の2行に分けて書いても同じ）', () => {
    const a = createGame(gameData, 'tiny', 1);
    a.sim.capacityMax += 20 * 6;
    addLine(a, gameData, '人は不老不死である。');
    advance(a, gameData, 1);
    expect(a.combos).toContain('immortals');
    const b = createGame(gameData, 'tiny', 1);
    b.sim.capacityMax += 20 * 6;
    b.edits.left = 5;
    addLine(b, gameData, '人は老いない。');
    addLine(b, gameData, '人は死なない。');
    advance(b, gameData, 1);
    expect(b.combos).toContain('immortals');
  });

  it('「誰も死なない」のように言い回しで書いた不死でも、不死の世界のタグと知らせになる', () => {
    const g = createGame(gameData, 'tiny', 3);
    g.sim.capacityMax += 20 * 6;
    addLine(g, gameData, '誰も死なない。');
    while (g.status === 'playing' && g.year < 6) advance(g, gameData, 1);
    expect(g.found).toContain('p:immortal');
    expect(g.found).toContain('g:immortal');
    expect(g.found).toContain('e:chain_immortal_crowd');
  });

  it('死なない人類は「恐竜と同じ道」をたどらない（隕石の滅び方は、死ぬ人類だけ）', () => {
    const e = gameData.endingById.get('meteor_end')!;
    const g = createGame(gameData, 'endless', 1);
    g.sim.capacityMax += 20 * 6;
    g.flags.meteor_hit = true;
    expect(checkAll(g, e.when)).toBe(true);
    addLine(g, gameData, '人は死なない。');
    expect(checkAll(g, e.when)).toBe(false);
  });

  it('結末の中身：どれも現実の根拠を持ち、滅び方の名前は失敗にだけつく', () => {
    for (const e of gameData.endings) {
      expect(e.why.length, e.id).toBeGreaterThan(10);
      if (e.type === 'flavor') expect(e.kind, e.id).toBe('fail');
      expect(GENERIC_ENDINGS.includes(e.id), e.id).toBe(false);
    }
  });
});
