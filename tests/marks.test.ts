import { describe, expect, it } from 'vitest';
import { advance, createGame, marksOf, replayKifu, kifuOf, reviewOf, wallsOf, type GameState } from '../src/core';
import { gameData } from '../src/data';
import type { StageId } from '../src/data/schema';
import { EMPTY_PROGRESS, migrate, type Progress } from '../src/save';
import { newAchievements } from '../src/store/achievements';
import { buildCodex } from '../src/store/codex';
import { shareText } from '../src/store/share';
import { playReader } from '../scripts/bots';

/**
 * 世界ごとの3つの印・敗因の振り返り・共有文・図鑑と実績（P22）と、分かれ道からやり直す・改稿者の試練（P22・P23）
 */

const progressOf = (patch: Partial<Progress>): Progress => ({ ...structuredClone(EMPTY_PROGRESS), ...patch });

describe('3つの印', () => {
  it('救った世界には「救った」、負けた世界には付かない。序章と無限の世界には印を付けない', () => {
    const { g } = playReader(gameData, 'plague', 1001, { cause: 'air', plan: 'air' });
    expect(g.status).toBe('cleared');
    expect(marksOf(g, gameData)).toContain('saved');
    const lost = createGame(gameData, 'food', 1000, null);
    for (let y = 0; y < 60 && lost.status === 'playing'; y++) advance(lost, gameData, 1);
    expect(lost.status).toBe('failed');
    expect(marksOf(lost, gameData)).not.toContain('saved');
    const pro = playReader(gameData, 'prologue', 1000).g;
    expect(pro.status).toBe('cleared');
    expect(marksOf(pro, gameData)).toEqual([]);
  });

  it('早く見抜いた：兆し（分かれ道）が出る前に原因に効く手を打つと付き、打たなければ付かない', () => {
    // 型の手（ため池）を2年目に書く：壁の兆しは3年目より前には出ない
    const { g } = playReader(gameData, 'food', 1001, { cause: 'water', plan: 'water' });
    expect(g.countered).not.toBeNull();
    expect(g.branch === null || g.countered! < g.branch.year).toBe(true);
    expect(marksOf(g, gameData)).toContain('early');
    // 何も書かない世界：原因に効く手はなく、分かれ道の年だけが残る
    const idle = createGame(gameData, 'food', 1001, null, { cause: 'water' });
    for (let y = 0; y < 30 && idle.status === 'playing'; y++) advance(idle, gameData, 1);
    expect(idle.countered).toBeNull();
    expect(idle.branch).not.toBeNull();
    expect(marksOf(idle, gameData)).not.toContain('early');
  });

  it('原因の壁は、その型の出来事（仕組みの条件のあるもの）', () => {
    const g = createGame(gameData, 'food', 1001, null, { cause: 'reach' });
    const ids = wallsOf(gameData, g).map((e) => e.id);
    expect(ids).toContain('f_hoard');
    expect(ids).not.toContain('f_dry_year');
  });

  it('分かれ道からやり直した世界には、少ない手で・早く見抜いたは付かない', () => {
    const { g } = playReader(gameData, 'food', 1001, { cause: 'water', plan: 'water' });
    const again = replayKifu(gameData, kifuOf(g, gameData));
    again.branched = true;
    const m = marksOf(again, gameData);
    expect(m).not.toContain('few');
    expect(m).not.toContain('early');
  });
});

describe('敗因の振り返り', () => {
  it('負けた世界は、崩れから原因の出来事・分かれ道・書いた一文へ、新しい順にさかのぼる', () => {
    const g = createGame(gameData, 'food', 1000, null, { cause: 'water' });
    for (let y = 0; y < 60 && g.status === 'playing'; y++) advance(g, gameData, 1);
    const r = reviewOf(g, gameData)!;
    expect(r).not.toBeNull();
    expect(r.collapse.year).toBe(g.year);
    expect(r.items.length).toBeGreaterThan(0);
    for (let i = 1; i < r.items.length; i++) expect(r.items[i]!.year).toBeLessThanOrEqual(r.items[i - 1]!.year);
    expect(r.branch?.year).toBe(g.branch?.year);
    // 救った世界には振り返りはない
    expect(reviewOf(playReader(gameData, 'plague', 1001, { cause: 'air', plan: 'air' }).g, gameData)).toBeNull();
  });
});

describe('共有文', () => {
  it('世界番号・ステージ・年数・手の数・印だけで、書いた文は入れない', () => {
    const { g } = playReader(gameData, 'food', 1001, { cause: 'water', plan: 'water' });
    const t = shareText(g, gameData, 'ラプラスの庭');
    expect(t).toContain('ラプラスの庭 #');
    expect(t).toContain('食料危機');
    expect(t).toContain(`手の数${g.moves.length}`);
    expect(t).toMatch(/印 \d\/3/u);
    for (const m of g.moves) if (m.text) expect(t).not.toContain(m.text.replace(/。$/u, ''));
  });
});

describe('図鑑と実績', () => {
  it('実績は4種類に分かれ、隠しのおまけ（負けや放棄で取れるもの）は数に入れない', () => {
    const kinds = new Set(gameData.achievements.map((a) => a.kind));
    expect(kinds).toEqual(new Set(['discovery', 'skill', 'story', 'play']));
    for (const id of ['quick_end', 'abandon']) {
      const a = gameData.achievements.find((x) => x.id === id)!;
      expect(a.hidden && a.bonus, id).toBe(true);
    }
    const c = buildCodex(gameData, progressOf({ achievements: ['quick_end', 'abandon', 'first_world'] }));
    const total = c.kinds.reduce((n, k) => n + k.found, 0);
    expect(total).toBe(1);
    expect(c.rules.total).toBe(25);
  });

  it('神の筆は無限の世界の実績（30年の世界では届かない）', () => {
    const a = gameData.achievements.find((x) => x.id === 'many_edits')!;
    expect(a.world).toContain('stage:endless');
  });

  it('3つの印をそろえると「三つの印」、番号で開くと「番号の世界」', () => {
    const p = progressOf({ best: { food: { years: 30, title: 't', cleared: true, marks: ['saved', 'few', 'early'] } }, discovered: ['h:number'] });
    const got = newAchievements(gameData, null, p);
    expect(got).toContain('three_marks');
    expect(got).toContain('numbered');
  });
});

describe('改稿者の試練', () => {
  const STAGES: StageId[] = ['food', 'plague', 'climate', 'war', 'energy', 'tiny', 'loop'];
  it('7つの世界に試練がある（原因の型が2つ重なる・兆しが遅れる・書き換えが少ない）', () => {
    for (const s of STAGES) expect(gameData.stageById.get(s)!.trial, s).toBeDefined();
    const kinds = new Set(STAGES.map((s) => gameData.stageById.get(s)!.trial!.kind));
    expect(kinds).toEqual(new Set(['double', 'late', 'few']));
  });

  it('原因の型が2つ重なる：2つ目の型の兆しと壁も出る', () => {
    const g = createGame(gameData, 'food', 1001, null, { cause: 'water', trial: true });
    expect(g.trial?.cause2).toBe('blight');
    const ids = wallsOf(gameData, g).map((e) => e.id);
    expect(ids).toContain('f_dry_year');
    expect(ids).toContain('f_blight_wave');
    for (let y = 0; y < 2; y++) advance(g, gameData, 1);
    const texts = g.history.map((h) => h.text);
    expect(texts.some((t) => t.includes('斑点'))).toBe(true);
  });

  it('兆しが遅れて出る：型の兆しは、ふつうの世界より1年遅い', () => {
    const plain = createGame(gameData, 'plague', 1001, null, { cause: 'air' });
    const hard = createGame(gameData, 'plague', 1001, null, { cause: 'air', trial: true });
    advance(plain, gameData, 1);
    advance(hard, gameData, 1);
    const sign = (g: GameState) => g.history.some((h) => h.ref === 'e:p_air_1');
    expect(sign(plain)).toBe(true);
    expect(sign(hard)).toBe(false);
    advance(hard, gameData, 1);
    expect(sign(hard)).toBe(true);
  });

  it('書き換えが少ない：試練の書き換えの力の決まりで始まる', () => {
    const g = createGame(gameData, 'climate', 1001, null, { trial: true });
    expect(g.edits.left).toBe(gameData.stageById.get('climate')!.trial!.edits!.start);
  });

  it('棋譜は試練の世界も作り直せる', () => {
    const g = createGame(gameData, 'food', 1003, null, { cause: 'reach', trial: true });
    for (let y = 0; y < 8 && g.status === 'playing'; y++) advance(g, gameData, 1);
    const again = replayKifu(gameData, kifuOf(g, gameData));
    expect(again.trial).toEqual(g.trial);
    expect(again.sim).toEqual(g.sim);
  });
});

describe('セーブ（版6）', () => {
  it('版5のセーブに、版6の記録（棋譜・印・書き出した日・案内・画面の明るさ）を補う', () => {
    const save = migrate({
      saveVersion: 5,
      savedAt: 1,
      settings: { bgm: true, volume: 0.6, analysis: false, se: true, motion: true },
      progress: { cleared: [], best: {}, worlds: 0, discovered: [], endless: [], ranking: [], achievements: [], abandoned: 0 },
      current: null,
    });
    expect(save.saveVersion).toBe(6);
    expect(save.progress.kifu).toEqual({});
    expect(save.progress.trials).toEqual([]);
    expect(save.progress.exportedAt).toBeNull();
    expect(save.progress.prompted).toEqual({ home: false, exportRank: -1 });
    expect(save.settings).toMatchObject({ theme: 'auto', speed: 'auto', allOpen: false });
  });
});

describe('遊ぶ流れ（runtime）', () => {
  it('序章を遊び終えると食料危機が開き、負けを数え、いちばん良かった棋譜を残す。書き出して読み戻しても同じ', async () => {
    const { MemorySaveStore, importText } = await import('../src/save');
    const { GameRuntime } = await import('../src/store/runtime');
    const store = new MemorySaveStore();
    let seed = 1000;
    const rt = new GameRuntime({ data: gameData, store, now: () => 1_700_000_000_000, newSeed: () => seed++ });
    await rt.boot();
    expect(rt.stageNeeds('food').length).toBeGreaterThan(0);
    rt.start('prologue');
    rt.write({ kind: 'law', id: 'plant_grow' }, '植物は少しの水で育つ。');
    for (let i = 0; i < 5 && rt.state!.status === 'playing'; i++) rt.advance(1);
    expect(rt.state!.status).toBe('cleared');
    expect(rt.progress.played).toContain('prologue');
    expect(rt.stageNeeds('food')).toEqual([]);
    // 食料危機：何も書かずに負ける（はじめての本番は、決まった原因の型から始まる）
    rt.start('food');
    expect(rt.state!.cause).toBe(gameData.stageById.get('food')!.firstCause);
    for (let i = 0; i < 80 && rt.state!.status === 'playing'; i++) rt.advance(1);
    expect(rt.state!.status).toBe('failed');
    expect(rt.progress.losses.food).toBe(1);
    expect(rt.progress.discovered).toContain('h:lose');
    expect(rt.progress.kifu.food?.result).toBe('failed');
    // 分かれ道からやり直す：分かれ道の年の世界になり、やり直した印が付く
    const branchYear = rt.state!.branch!.year;
    const b = rt.branchFrom()!;
    expect(b.year).toBe(branchYear);
    expect(b.branched).toBe(true);
    // 書き出して読み戻す
    const text = rt.exportSave();
    const back = importText(text);
    expect(back.progress.kifu).toEqual(JSON.parse(JSON.stringify(rt.progress.kifu)));
    expect(back.progress.played).toEqual(rt.progress.played);
  });
});
