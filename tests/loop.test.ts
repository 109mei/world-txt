import { describe, expect, it } from 'vitest';
import { addLine, advance, createGame, rewriteLaw, type GameState } from '../src/core';
import { gameData } from '../src/data';

const stage = gameData.stages.find((s) => s.id === 'loop')!;
const cfg = stage.loop!;

/** 1年ずつ進め（大きな出来事で途中で止まらないように）、その年の知らせの文を集める */
function years(g: GameState, n: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < n; i += 1) out.push(advance(g, gameData, 1).news.map((x) => x.text));
  return out;
}

describe('くり返す十年', () => {
  it('何も書かなければ、10年目の終わりに0年目へ巻き戻る（世界の頁が擦り切れて世界容量が減る）', () => {
    const g = createGame(gameData, 'loop', 1);
    const cap = g.sim.capacityMax;
    years(g, cfg.years);
    expect(g.status).toBe('playing');
    expect(g.year).toBe(0);
    expect(g.loop!.count).toBe(1);
    expect(g.loop!.done).toBe(false);
    expect(g.sim.capacityMax).toBe(cap - cfg.wear);
    expect(g.history.some((h) => h.text.startsWith('10年目の終わり'))).toBe(true);
  });

  it('巻き戻ると世界の様子と起きる力が0年目に戻り、同じ書き方なら同じ出来事がくり返す', () => {
    const g = createGame(gameData, 'loop', 7);
    const sim0 = structuredClone(g.sim);
    const charge0 = structuredClone(g.charge);
    const first = years(g, cfg.years);
    expect(g.sim).toEqual({ ...sim0, capacityMax: sim0.capacityMax - cfg.wear });
    expect(g.charge).toEqual(charge0);
    const second = years(g, cfg.years);
    // 巻き戻りの知らせ（何回目か）を除けば、2周目は1周目と同じ
    const strip = (ys: string[][]) => ys.map((ns) => ns.filter((t) => !t.includes('巻き戻り')));
    expect(strip(second)).toEqual(strip(first));
  });

  it('書いた文章は、巻き戻っても残る', () => {
    const g = createGame(gameData, 'loop', 3);
    addLine(g, gameData, '人間は肉を食べない。');
    rewriteLaw(g, gameData, 'seasons', '地球には四季がめぐる。');
    const texts = structuredClone(g.texts);
    years(g, cfg.years);
    expect(g.loop!.count).toBe(1);
    expect(g.texts).toEqual(texts);
    expect(g.extras.map((x) => x.text)).toEqual(['人間は肉を食べない。']);
  });

  it('破局の原因を断てば、くり返しがほどけて11年目へ進む（消すだけでは空白を世界が埋めるので、打ち消して書く）', () => {
    const g = createGame(gameData, 'loop', 1);
    rewriteLaw(g, gameData, 'zoonosis', '病原体は動物から人間にうつらない。');
    years(g, cfg.years);
    expect(g.year).toBe(cfg.years);
    expect(g.loop!.done).toBe(true);
    expect(g.flags.loop_broken).toBe(true);
    advance(g, gameData, 1);
    expect(g.year).toBe(cfg.years + 1);
    expect(g.loop!.count).toBe(0);
  });

  it('くり返しの中で文明が崩れた年は、その年に巻き戻る（その世界は終わらない）', () => {
    const g = createGame(gameData, 'loop', 1);
    rewriteLaw(g, gameData, 'human_water', '人間は水を飲めない。');
    years(g, 3);
    expect(g.status).toBe('playing');
    expect(g.loop!.count).toBeGreaterThanOrEqual(1);
    expect(g.history.some((h) => h.text.startsWith('文明が崩れたその年'))).toBe(true);
  });
});
