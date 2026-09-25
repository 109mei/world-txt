import { describe, expect, it } from 'vitest';
import { gameData } from '../src/data';
import type { StageId } from '../src/data/schema';
import { playRandom } from '../scripts/bots';
import { play } from '../scripts/sim';
import { STRATEGIES } from '../scripts/strategies';

/**
 * 手触りの目安（docs/SPEC.md 5章）。ボットで遊んで確かめる（種は `npm run sim -- <stage> all 30` と同じ30個）。
 * - 何もしない世界は、どのステージでも滅びる
 * - でたらめに書き換えても勝てない（対照群）
 * - 一手だけの作戦（意味を変える書き換えが1つ）は、どれも勝ちきれない（クリア率 40% 以下）
 * - 考えた作戦（最初の危機への手と、その副作用・あとから来る危機への手を組み合わせる）なら、どのステージも解ける（55% 以上）
 * - 企画書の「そうなるの！？」が起きる（食事を減らす → 作物の病気で再び食料危機、温室効果を消す → 氷期、
 *   戦争を消す → 制裁とテロの冷たい戦争、石油の限りを消す → 産油国の崩壊）
 * - 極小世界は、短く言い換えるだけでも、消すだけでも越えられない
 */

const SEEDS = Array.from({ length: 30 }, (_, i) => 1000 + i);
const STAGES: StageId[] = ['food', 'plague', 'climate', 'war', 'energy', 'tiny', 'loop'];
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

    it(`${stage}：一手だけの作戦は、どれも勝ちきれない（クリア率 40% 以下）`, () => {
      for (const s of STRATEGIES[stage].filter((x) => x.role === 'one')) expect(clearRate(stage, s.name), s.name).toBeLessThanOrEqual(0.4);
    });

    it(`${stage}：考えた作戦なら解ける（クリア率 55% 以上の作戦がある）`, () => {
      const plans = STRATEGIES[stage].filter((s) => s.role === 'plan');
      expect(plans.length).toBeGreaterThanOrEqual(1);
      expect(plans.some((s) => clearRate(stage, s.name) >= 0.55)).toBe(true);
    });
  }

  it('食料危機：食事を減らすと、あとで作物の病気と職の喪失が「想定外の変化」として来る', () => {
    let hit = 0;
    for (const seed of SEEDS) {
      const g = play(gameData, 'food', strategy('food', 'few_days_only'), seed);
      const texts = g.history.map((h) => h.text).join('\n');
      if (texts.includes('職を失う') && texts.includes('作物病原体')) hit += 1;
    }
    expect(hit / SEEDS.length).toBeGreaterThanOrEqual(0.8);
  });

  it('気候危機：温室効果を消すと涼しくなるが、やがて氷期が来て滅びる', () => {
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

  it('資源枯渇：石油の限りを消すと、値崩れで産油国が傾く', () => {
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
