import { describe, expect, it } from 'vitest';
import { advance, createGame, lawTotals, rewriteLaw, textCost } from '../src/core';
import { gameData } from '../src/data';

/** 段階2：削除を変える（空白・消し跡・支えている行）。消すのは時間稼ぎで、解決は書き換え */
const years = gameData.balance.voids.years;

describe('消した行は空白になる', () => {
  it('消した行は空白になり、決まった年数のうちに誰も書かなければ、世界がいちばん起こりやすい形で埋める', () => {
    const g = createGame(gameData, 'war', 1);
    rewriteLaw(g, gameData, 'war', '');
    expect(g.voids.war).toBe(0);
    expect(g.laws.war).toBe('delete');
    for (let y = 0; y < years; y++) advance(g, gameData, 1);
    // まだ埋まっていない（最後の年に埋める）
    if (g.voids.war !== undefined) advance(g, gameData, 1);
    expect(g.voids.war).toBeUndefined();
    expect(g.laws.war).toBe('shadow');
    expect(g.texts.war).toBe('争いは別の形で続く。');
    expect(g.filled.war).toBeGreaterThan(0);
    // 世界が埋めたことが、なぜ？と、消した一文（原因）つきで知らされる
    const note = g.history.find((h) => h.text.includes('世界が埋めた'));
    expect(note?.why).toBeTruthy();
    expect(note?.cause?.deleted).toBe(true);
  });

  it('多くの行は、元の文に戻る（自然の決まりは、元の姿に戻ろうとする）', () => {
    const g = createGame(gameData, 'climate', 1);
    rewriteLaw(g, gameData, 'co2_heat', '');
    for (let y = 0; y <= years; y++) advance(g, gameData, 1);
    expect(g.laws.co2_heat).toBe('original');
    expect(g.texts.co2_heat).toBe('二酸化炭素は熱を閉じ込める。');
  });

  it('埋まる前に自分の文で書けば、世界は埋めに来ない', () => {
    const g = createGame(gameData, 'war', 1);
    rewriteLaw(g, gameData, 'war', '');
    advance(g, gameData, 2);
    rewriteLaw(g, gameData, 'war', '争いは話し合いで解決する。');
    expect(g.voids.war).toBeUndefined();
    for (let y = 0; y <= years; y++) advance(g, gameData, 1);
    expect(g.laws.war).toBe('dialogue');
    expect(g.filled.war).toBeUndefined();
  });

  it('世界が埋めた行も、書き直せば自分の文になる', () => {
    const g = createGame(gameData, 'war', 1);
    rewriteLaw(g, gameData, 'war', '');
    for (let y = 0; y <= years; y++) advance(g, gameData, 1);
    expect(g.filled.war).toBeDefined();
    g.edits.left = 3;
    rewriteLaw(g, gameData, 'war', '争いは話し合いで解決する。');
    expect(g.filled.war).toBeUndefined();
    expect(g.laws.war).toBe('dialogue');
  });
});

describe('消し跡', () => {
  it('消しても、消した文の字数の半分は世界容量に残る', () => {
    const g = createGame(gameData, 'war', 1);
    const before = lawTotals(gameData, g).cost;
    const len = textCost(g.texts.war!);
    rewriteLaw(g, gameData, 'war', '');
    const after = lawTotals(gameData, g).cost;
    expect(before - after).toBe(len - Math.round(len * gameData.balance.voids.scar));
    expect(g.scars.war).toBe(Math.round(len * gameData.balance.voids.scar));
  });

  it('空白に書くと、消し跡は消えて、書いた文の字数になる', () => {
    const g = createGame(gameData, 'war', 1);
    rewriteLaw(g, gameData, 'war', '');
    rewriteLaw(g, gameData, 'war', '争いはない。');
    expect(g.scars.war).toBeUndefined();
  });
});

describe('支えている行', () => {
  it('支えている行を消すと、頼っている行の数だけ世界が揺らぐ（国家を消すと、お金・戦争・犯罪・学びの行が宙に浮く）', () => {
    const g = createGame(gameData, 'war', 1);
    const before = lawTotals(gameData, g).incoherence;
    rewriteLaw(g, gameData, 'nation', '');
    const opt = gameData.optionOf.get('nation')!.get('delete')!;
    const deps = gameData.lawById.get('nation')!.supports.length;
    expect(lawTotals(gameData, g).incoherence - before).toBe(opt.incoherence + deps * gameData.balance.voids.supportIncoherence);
  });

  it('頼っている行も一緒に消えていれば、その分は揺らがない', () => {
    const g = createGame(gameData, 'war', 1);
    g.edits.left = 5;
    rewriteLaw(g, gameData, 'nation', '');
    const one = lawTotals(gameData, g).incoherence;
    rewriteLaw(g, gameData, 'war', '');
    const war = gameData.optionOf.get('war')!.get('delete')!.incoherence;
    expect(lawTotals(gameData, g).incoherence).toBe(one + war - gameData.balance.voids.supportIncoherence);
  });
});
