import { describe, expect, it } from 'vitest';
import { advance, createGame, introFor, introOf, knownRules, openHints, reviewOf, stageOpen, type Journey } from '../src/core';
import { gameData } from '../src/data';
import type { StageId } from '../src/data/schema';
import { migrate } from '../src/save';
import { playReader } from '../scripts/bots';
import { FIRST_JOURNEY } from '../scripts/sim';

/**
 * 開いていく順番（P18・分析の13章）：救った世界・遊び終えた世界・初めて起きたことだけで開き、運では開かない。
 * 1回のプレイで新しく覚える考えは1つ。紹介する前の決まりは弱く動く
 */

const EMPTY: Journey = { cleared: [], played: [], discovered: [] };
const openStages = (j: Journey) => gameData.stages.filter((s) => stageOpen(gameData, j, s.id)).map((s) => s.id);

describe('開いていく順番', () => {
  it('はじめは序章だけ。序章のあとに食料危機、食料危機を遊び終えると感染症と気候危機（勝ち負けは問わない）', () => {
    expect(openStages(EMPTY)).toEqual(['prologue']);
    expect(openStages({ ...EMPTY, played: ['prologue'] })).toEqual(['prologue', 'food']);
    expect(openStages({ ...EMPTY, played: ['prologue', 'food'] })).toEqual(['prologue', 'food', 'plague', 'climate']);
  });

  it('救った世界の数で、世界大戦・資源枯渇・無限の世界（1）、くり返す十年（2）、極小世界（3）が開く', () => {
    const played = ['prologue', 'food'];
    expect(openStages({ ...EMPTY, played, cleared: ['food'] })).toEqual(['prologue', 'food', 'plague', 'climate', 'war', 'energy', 'endless']);
    expect(openStages({ ...EMPTY, played, cleared: ['food', 'plague'] })).toContain('loop');
    expect(openStages({ ...EMPTY, played, cleared: ['food', 'plague'] })).not.toContain('tiny');
    expect(openStages({ ...EMPTY, played, cleared: ['food', 'plague', 'climate'] })).toContain('tiny');
  });

  it('開いたものは閉じない：記録が増えるほど、開いた世界と、わかった決まりは増えるだけ', () => {
    const steps: Journey[] = [
      EMPTY,
      { ...EMPTY, played: ['prologue'] },
      { ...EMPTY, played: ['prologue', 'food'], discovered: ['h:hoard'] },
      { cleared: ['food'], played: ['prologue', 'food'], discovered: ['h:hoard'] },
      { cleared: ['food', 'war'], played: ['prologue', 'food', 'war'], discovered: ['h:hoard', 'h:mode'] },
      { cleared: ['food', 'war', 'plague', 'climate', 'energy'], played: ['prologue', 'food', 'war', 'plague', 'climate', 'energy'], discovered: ['h:hoard', 'h:mode'] },
    ];
    for (let i = 1; i < steps.length; i++) {
      const before = new Set(openStages(steps[i - 1]!));
      const after = new Set(openStages(steps[i]!));
      for (const s of before) expect(after.has(s), `${s} が閉じた`).toBe(true);
      const known = new Set(knownRules(gameData, steps[i]!).map((r) => r.id));
      for (const r of knownRules(gameData, steps[i - 1]!)) expect(known.has(r.id), `${r.id} を忘れた`).toBe(true);
    }
  });

  it('開く条件に乱数を使わない：同じ記録なら、何度確かめても同じ結果', () => {
    const j: Journey = { cleared: ['food'], played: ['prologue', 'food'], discovered: ['h:hoard', 'h:spread'] };
    const a = JSON.stringify([openStages(j), knownRules(gameData, j).map((r) => r.id), introFor(gameData, j)]);
    for (let i = 0; i < 5; i++) expect(JSON.stringify([openStages(j), knownRules(gameData, j).map((r) => r.id), introFor(gameData, j)])).toBe(a);
  });

  it('1回のプレイで新しく覚える考えは1つ：ステージごとの段は1つで、紹介する考えも1つ', () => {
    for (const st of gameData.stages) {
      const steps = gameData.unlocks.steps.filter((s) => s.stage === st.id);
      expect(steps.length, st.id).toBe(1);
      // 考えは1つ（「A：B」の形で、区切りの「・」で2つの考えを並べない）
      expect(steps[0]!.idea.split('：')[0]!.includes('・'), st.id).toBe(false);
    }
  });

  it('はじめて遊ぶ世界では、その世界の段の決まりだけが本来の強さへ上がり、ほかのまだの決まりは弱いまま', () => {
    // その世界がちょうど開いた記録（手前の世界は遊び終えた）
    const first: Record<Exclude<StageId, 'endless'>, Journey> = {
      prologue: EMPTY,
      food: { ...EMPTY, played: ['prologue'] },
      plague: { ...EMPTY, played: ['prologue', 'food'] },
      climate: { ...EMPTY, played: ['prologue', 'food'] },
      war: { cleared: ['food'], played: ['prologue', 'food'], discovered: [] },
      energy: { cleared: ['food'], played: ['prologue', 'food'], discovered: [] },
      loop: { cleared: ['food', 'plague'], played: ['prologue', 'food', 'plague'], discovered: [] },
      tiny: { cleared: ['food', 'plague', 'climate'], played: ['prologue', 'food', 'plague', 'climate'], discovered: [] },
    };
    const before = gameData.balance.intro.before;
    for (const [stage, j] of Object.entries(first) as [StageId, Journey][]) {
      const intro = introFor(gameData, j);
      const g = createGame(gameData, stage, 1001, null, { intro });
      const mine = new Set(gameData.unlocks.steps.find((s) => s.stage === stage)!.rules);
      for (const id of mine) expect(introOf(g, id), `${stage} ${id}`).toBe(before);
      for (let y = 0; y < 6 && g.status === 'playing'; y++) advance(g, gameData, 1);
      // 紹介した年から、1年に ramp ずつ本来の強さへ（序章は3年で終わるので、途中まで）
      const expected = Math.min(1, before + g.year * gameData.balance.intro.ramp);
      for (const r of gameData.unlocks.rules) {
        const met = r.found.some((f) => g.found.includes(f));
        if (mine.has(r.id)) expect(introOf(g, r.id), `${stage} ${r.id} は紹介した年から上がる`).toBeCloseTo(expected, 5);
        else if (!met && intro[r.id] !== undefined) expect(introOf(g, r.id), `${stage} ${r.id} はまだ弱い`).toBe(before);
      }
    }
  });

  it('紹介前の決まりは、負けの主な原因（敗因の振り返りのいちばん上）にならない（はじめて遊ぶ世界で）', () => {
    const blamed: string[] = [];
    for (const [stage, j] of Object.entries(FIRST_JOURNEY) as [StageId, Journey][]) {
      const intro = introFor(gameData, j);
      for (let i = 0; i < 6; i++) {
        const { g } = playReader(gameData, stage, 1000 + i, { intro });
        const ref = reviewOf(g, gameData)?.top?.ref;
        const rule = ref ? gameData.unlocks.rules.find((r) => r.found.includes(ref)) : undefined;
        if (rule && (intro[rule.id] ?? 1) < 1) blamed.push(`${stage} ${1000 + i} ${rule.id}`);
      }
    }
    expect(blamed).toEqual([]);
  });

  it('すべて開いたら（5つ救ったら）、すべての決まりが本来の強さで動く', () => {
    const j: Journey = { cleared: ['food', 'plague', 'climate', 'war', 'energy'], played: ['prologue', 'food', 'plague', 'climate', 'war', 'energy'], discovered: [] };
    expect(introFor(gameData, j)).toEqual({});
  });

  it('同じ世界で3回負けるごとに、兆しの読み方が1つ開く（開いたものは閉じない）', () => {
    const j = (n: number): Journey => ({ ...EMPTY, losses: { food: n } });
    expect(openHints(gameData, j(2), 'food')).toEqual([]);
    expect(openHints(gameData, j(3), 'food')).toHaveLength(1);
    expect(openHints(gameData, j(5), 'food')).toHaveLength(1);
    expect(openHints(gameData, j(6), 'food')).toHaveLength(2);
    expect(openHints(gameData, j(30), 'food')).toHaveLength(gameData.stageById.get('food')!.hints.length);
  });

  it('版5のセーブを読むと、記録の残っている世界と序章を遊び終えたことにする（これまでの世界が開いたまま）', () => {
    const old = {
      saveVersion: 5,
      savedAt: 1,
      settings: { bgm: true, volume: 0.6, analysis: false, se: true, motion: true },
      progress: { cleared: ['food'], best: { food: { years: 30, title: 't', cleared: true }, plague: { years: 12, title: 't', cleared: false } }, worlds: 3, discovered: [], endless: [], ranking: [], achievements: [], abandoned: 0 },
      current: null,
    };
    const save = migrate(old);
    expect(new Set(save.progress.played)).toEqual(new Set(['prologue', 'food', 'plague']));
    expect(save.progress.losses).toEqual({});
    expect(save.settings.theme).toBe('auto');
    const j: Journey = { cleared: save.progress.cleared, played: save.progress.played, discovered: save.progress.discovered };
    for (const s of ['food', 'plague', 'climate', 'war', 'energy', 'endless'] as StageId[]) expect(stageOpen(gameData, j, s), s).toBe(true);
  });
});
