import { describe, expect, it } from 'vitest';
import { advance } from '../src/core';
import { gameData } from '../src/data';
import type { StageId } from '../src/data/schema';
import { causeTable, guessCause, playRandom, playReader, READ_YEAR } from '../scripts/bots';
import { startWorld } from '../scripts/run';
import { play } from '../scripts/sim';
import { STRATEGIES } from '../scripts/strategies';

/**
 * 手触りの目安（docs/SPEC.md 5章）。世界番号 1000〜1029 で遊んで確かめる（`npm run sim -- <stage> all 30` と同じ）。
 * どの作戦も、そのステージをはじめて遊べる筆の位で書く。書換の力が足りない年の手は、力が戻った年に書く。
 * - 何もしない世界・でたらめな書き換えでは勝てない（対照群）
 * - 一手だけの作戦（意味を変える手が1つ）は勝ちきれない
 * - 原因の型は、はじめの2年の兆し（ニュース）で見分けられる
 * - 兆しから型を見立て、型に合った手を書けば解ける（見立てるボット。scripts/bots.ts）
 * - 型を外した手では勝てない（型と作戦の表の、型の合わない欄）
 * - 企画書の「そうなるの！？」が起きる（食事を減らす → 作物の病気と職の喪失、温室効果を打ち消す → 氷期、
 *   戦争を消す → 制裁とテロの冷たい戦争、石油の限りを消す → 産油国の崩壊）
 * - 極小世界は、短く言い換えるだけでも、消すだけでも越えられない
 * 操作を絞ったボット（書き換えだけ・2種類だけ など）と決まった手順の最善は、探索が重いので `npx tsx scripts/bots.ts` で測る（SPEC 5章）
 */

const SEEDS = Array.from({ length: 30 }, (_, i) => 1000 + i);
const STAGES: StageId[] = ['food', 'plague', 'climate', 'war', 'energy', 'tiny', 'loop'];
const WITH_CAUSES = STAGES.filter((s) => gameData.stageById.get(s)!.causes.length > 0);
const strategy = (stage: StageId, name: string) => STRATEGIES[stage].find((s) => s.name === name)!;

/** 同じ作戦を何度も測らないよう、クリア率を覚えておく */
const rates = new Map<string, number>();
function clearRate(stage: StageId, name: string): number {
  const key = `${stage}/${name}`;
  const known = rates.get(key);
  if (known !== undefined) return known;
  let n = 0;
  for (const seed of SEEDS) if (play(gameData, stage, strategy(stage, name), seed).status === 'cleared') n += 1;
  const rate = n / SEEDS.length;
  rates.set(key, rate);
  return rate;
}

const readers = new Map<StageId, number>();
function readerRate(stage: StageId): number {
  const known = readers.get(stage);
  if (known !== undefined) return known;
  let n = 0;
  for (const seed of SEEDS) if (playReader(gameData, stage, seed).g.status === 'cleared') n += 1;
  readers.set(stage, n / SEEDS.length);
  return n / SEEDS.length;
}

describe('手触りの目安', () => {
  for (const stage of STAGES) {
    it(`${stage}：何もしないと滅びる（クリア 0%）`, () => {
      expect(clearRate(stage, 'baseline')).toBe(0);
    });

    it(`${stage}：でたらめな書き換えでは勝てない（クリア 0%）`, () => {
      let n = 0;
      for (const seed of SEEDS) if (playRandom(gameData, stage, seed).status === 'cleared') n += 1;
      expect(n).toBe(0);
    });

    it(`${stage}：一手だけの作戦は、どれも勝ちきれない（クリア率 20% 以下）`, () => {
      for (const s of STRATEGIES[stage].filter((x) => x.role === 'one')) expect(clearRate(stage, s.name), s.name).toBeLessThanOrEqual(0.2);
    });

    it(`${stage}：兆しから型を見立てて手を書けば解ける（見立てるボット 50% 以上）`, () => {
      expect(readerRate(stage)).toBeGreaterThanOrEqual(0.5);
    });
  }

  it('原因の型は、はじめの2年の兆しで見分けられる（どの世界でも、兆しから型を当てられる）', () => {
    for (const stage of WITH_CAUSES) {
      for (const seed of SEEDS) {
        const g = startWorld(gameData, stage, seed);
        // 重大な出来事の年は、まとめて進めても止まるので、1年ずつ進める
        while (g.year < READ_YEAR && g.status === 'playing') advance(g, gameData, 1);
        expect(guessCause(g, gameData), `${stage} ${seed}`).toBe(g.cause);
        // 型ごとの兆しは2つ以上
        const signs = g.history.filter((h) => h.year <= READ_YEAR && gameData.events.some((e) => e.text === h.text && e.when.includes(`cause:${g.cause}`)));
        expect(signs.length, `${stage} ${seed}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('型を外した手では勝てない（型と作戦の表で、型の合わない欄の平均 20% 以下、型の合う欄の平均 45% 以上）', () => {
    for (const stage of WITH_CAUSES) {
      const t = causeTable(stage, 10);
      const hit: number[] = [];
      const miss: number[] = [];
      t.rows.forEach((row, i) => row.rates.forEach((r, j) => (i === j ? hit : miss).push(r)));
      const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      expect(mean(miss), `${stage} 型を外した手`).toBeLessThanOrEqual(0.2);
      expect(mean(hit), `${stage} 型に合った手`).toBeGreaterThanOrEqual(0.45);
    }
  });

  it('食料危機：食事を減らすと、あとで作物の病気と職の喪失が「想定外の変化」として来る', () => {
    let hit = 0;
    for (const seed of SEEDS) {
      const g = play(gameData, 'food', strategy('food', 'few_days_only'), seed);
      const texts = g.history.map((h) => h.text).join('\n');
      if (texts.includes('職を失う') && texts.includes('作物病原体')) hit += 1;
    }
    expect(hit / SEEDS.length).toBeGreaterThanOrEqual(0.6);
  });

  it('気候危機：温室効果を打ち消すと涼しくなるが、やがて氷期が来て滅びる', () => {
    for (const seed of SEEDS.slice(0, 8)) {
      const g = play(gameData, 'climate', strategy('climate', 'greenhouse_delete'), seed);
      expect(g.status).toBe('failed');
      expect(g.history.some((h) => h.text.includes('氷河') || h.text.includes('冷え始めた'))).toBe(true);
    }
  });

  it('世界大戦：戦争を消すだけでは、制裁とテロの冷たい戦争で文明が腐っていく', () => {
    expect(clearRate('war', 'no_war_only')).toBeLessThanOrEqual(0.2);
    const g = play(gameData, 'war', strategy('war', 'no_war_only'), SEEDS[0]!);
    expect(g.history.some((h) => h.text.includes('経済制裁'))).toBe(true);
  });

  it('資源枯渇：石油の限りを打ち消すと、値崩れで産油国が傾く', () => {
    let hit = 0;
    for (const seed of SEEDS.slice(0, 10)) {
      const g = play(gameData, 'energy', strategy('energy', 'infinite_oil'), seed);
      if (g.history.some((h) => h.text.includes('石油で成り立っていた'))) hit += 1;
    }
    expect(hit).toBeGreaterThanOrEqual(8);
  });

  it('極小世界：短く言い換えるだけでも、消すだけでも越えられない', () => {
    expect(clearRate('tiny', 'compress_only')).toBe(0);
    expect(clearRate('tiny', 'cut_only')).toBe(0);
  });
});
