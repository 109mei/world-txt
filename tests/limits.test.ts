import { describe, expect, it } from 'vitest';
import { advance, createGame } from '../src/core';
import { gameData } from '../src/data';
import { buildView, type LimitView } from '../src/store/view';

const limit = (g: ReturnType<typeof createGame>, id: LimitView['id']) => buildView(g, gameData).limits.find((l) => l.id === id)!;
const words = gameData.indicators.limits.words.map((w) => w[1]);

describe('世界の終わりまで（終わりの線まで、あとどれぐらいか）', () => {
  it('人口・文明・世界整合性・世界容量の4つを、線つきの帯と言葉で見せる', () => {
    const g = createGame(gameData, 'food', 1);
    const v = buildView(g, gameData);
    expect(v.limits.map((l) => l.id)).toEqual(['pop', 'civ', 'coherence', 'capacity']);
    for (const l of v.limits) {
      expect(l.pos).toBeGreaterThanOrEqual(0);
      expect(l.pos).toBeLessThanOrEqual(1);
      expect(l.line).toBe(gameData.indicators.limits.line);
      expect(words).toContain(l.word);
      // はじめは、まだ線の上にいる
      expect(l.pos).toBeGreaterThan(l.line);
      expect(l.countdown).toBeNull();
      // 点数（74/100 など）は見せない
      expect(l.note).not.toMatch(/\d+\s*\/\s*100/);
    }
    expect(limit(g, 'pop').word).toBe('遠い');
    expect(limit(g, 'pop').note).toContain(`${gameData.stageById.get('food')!.fail.pop}億人`);
    expect(limit(g, 'capacity').note).toContain('字');
  });

  it('線に近づくほど言葉が変わり、帯の位置が線に寄る', () => {
    const g = createGame(gameData, 'food', 1);
    const fail = gameData.stageById.get('food')!.fail.pop;
    const at = (pop: number) => {
      g.sim.pop = pop;
      return limit(g, 'pop');
    };
    const far = at(g.startPop);
    const mid = at(fail + (g.startPop - fail) * 0.4);
    const near = at(fail + (g.startPop - fail) * 0.2);
    const edge = at(fail + (g.startPop - fail) * 0.05);
    expect([far.word, mid.word, near.word, edge.word]).toEqual(['遠い', 'まだある', '近い', '目前']);
    expect(far.pos).toBeGreaterThan(mid.pos);
    expect(mid.pos).toBeGreaterThan(near.pos);
    expect(near.pos).toBeGreaterThan(edge.pos);
    expect(edge.pos).toBeGreaterThan(edge.line);
    const over = at(fail - 1);
    expect(over.word).toBe('越えた');
    expect(over.pos).toBeLessThan(over.line);
  });

  it('文明が線を割った・世界容量を超えたときは、終わるまでの年を数える', () => {
    const g = createGame(gameData, 'tiny', 1);
    const b = gameData.balance;
    // 極小世界ははじめから世界容量をはみ出している
    const cap = limit(g, 'capacity');
    expect(cap.word).toBe('越えた');
    expect(cap.countdown).toBe(b.capacity.graceYears);
    g.counters.capOver = 1;
    expect(limit(g, 'capacity').countdown).toBe(b.capacity.graceYears - 1);
    g.counters.civLow = 1;
    const civ = limit(g, 'civ');
    expect(civ.countdown).toBe(b.civ.graceYears - 1);
    expect(civ.word).toBe('越えた');
    expect(civ.eta).toBeNull();
  });

  it('線へ向かっているときだけ「このままなら約N年」を見せる（遠ざかっている・遠すぎるなら見せない）', () => {
    const g = createGame(gameData, 'food', 1);
    const fail = gameData.stageById.get('food')!.fail.civ;
    g.prevMeta.civ = fail + 12;
    g.derived.civ = fail + 10;
    expect(limit(g, 'civ').eta).toBe(5);
    g.prevMeta.civ = fail + 8;
    expect(limit(g, 'civ').eta).toBeNull();
    g.prevMeta.civ = fail + 10.1;
    expect(limit(g, 'civ').eta).toBeNull();
  });

  it('線まで遠くても、このままなら数年で届くほど速く近づいていれば、言葉は急ぎを表す', () => {
    const g = createGame(gameData, 'food', 1);
    const fail = gameData.stageById.get('food')!.fail.pop;
    g.sim.pop = fail + 18;
    g.trace.pop = [fail + 19, fail + 18];
    expect(limit(g, 'pop').word).toBe('遠い');
    // 1年で18億人減った：このままなら約1年で線に届く
    g.trace.pop = [fail + 36, fail + 18];
    const l = limit(g, 'pop');
    expect(l.eta).toBe(1);
    expect(l.word).toBe('目前');
    // 帯の位置は、今の本当の近さのまま
    expect(l.pos).toBeGreaterThan(0.8);
    g.trace.pop = [fail + 24.5, fail + 18];
    expect(limit(g, 'pop').word).toBe('近い');
  });

  it('遊んでいる間、帯と言葉はいつも範囲の中にある', () => {
    for (const stage of ['food', 'plague', 'climate', 'war', 'energy', 'tiny', 'loop', 'endless'] as const) {
      const g = createGame(gameData, stage, 7);
      for (let y = 0; y < 30 && g.status === 'playing'; y += 1) {
        advance(g, gameData, 1);
        for (const l of buildView(g, gameData).limits) {
          expect(Number.isFinite(l.pos)).toBe(true);
          expect(l.pos).toBeGreaterThanOrEqual(0);
          expect(l.pos).toBeLessThanOrEqual(1);
          expect(words).toContain(l.word);
          if (l.eta !== null) expect(l.eta).toBeGreaterThan(0);
        }
      }
    }
  });

  it('項目のタイルにも、今の水準と「ここより下は悪い」目盛りを添える', () => {
    const g = createGame(gameData, 'climate', 1);
    for (const it of buildView(g, gameData).indicators) {
      expect(it.pos).toBeGreaterThanOrEqual(0);
      expect(it.pos).toBeLessThanOrEqual(1);
      expect(it.danger).toBeGreaterThan(0);
      expect(it.danger).toBeLessThan(1);
    }
  });
});
