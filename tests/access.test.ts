import { describe, expect, it } from 'vitest';
import { accessFor, addLine, advance, createGame, crisisConcepts, isSealed, rankOf, rewriteLaw, rewriteLine, upgradeState, type GameState } from '../src/core';
import { gameData } from '../src/data';
import { STAGE_IDS } from '../src/data/schema';
import { penOf } from '../src/store/pen';
import { buildView } from '../src/store/view';

const ranks = gameData.access.ranks;
const last = ranks.length - 1;
/** その位（救った世界の数）で始めた世界 */
const world = (stage: (typeof STAGE_IDS)[number], clears: number, seed = 1): GameState => {
  const g = createGame(gameData, stage, seed, accessFor(gameData, stage, clears));
  g.edits.left = 50;
  g.sim.capacityMax += 3000;
  return g;
};

describe('筆の位（救った世界の数で、書き換えられる範囲が広がる）', () => {
  it('位は救った世界の数で上がり、範囲は広がるだけ。最後の位は、すべて自由', () => {
    expect(rankOf(gameData, 0)).toBe(0);
    expect(rankOf(gameData, 1)).toBe(1);
    expect(rankOf(gameData, 99)).toBe(last);
    let prev = accessFor(gameData, 'endless', 0);
    for (let clears = 1; clears <= ranks[last]!.clears; clears += 1) {
      const a = accessFor(gameData, 'endless', clears);
      expect(prev.concepts.every((c) => a.concepts.includes(c))).toBe(true);
      if (prev.margin !== null) expect(a.margin === null || a.margin >= prev.margin).toBe(true);
      if (prev.depth !== null) expect(a.depth === null || a.depth >= prev.depth).toBe(true);
      prev = a;
    }
    const free = accessFor(gameData, 'endless', ranks[last]!.clears);
    expect(free.concepts.length).toBe(gameData.concepts.length);
    expect(free.margin).toBeNull();
    expect(free.depth).toBeNull();
  });

  it('シミュレーターやテストの世界（範囲を渡さない）は、すべて自由', () => {
    const g = createGame(gameData, 'food', 1);
    expect(g.access).toBeNull();
    expect(isSealed(g, gameData, 'sun_shine')).toBe(false);
  });

  it('封じられた行は、書き換えも削除もできない（書換の力も使わない）。その世界の危機に関わる行は、はじめから開いている', () => {
    const g = world('food', 0);
    const left = g.edits.left;
    // 食料危機：食事・農業・植物・水の行は開いている
    for (const id of ['human_food', 'farm_land', 'plant_grow', 'water_rain', 'food_rot']) expect(isSealed(g, gameData, id), id).toBe(false);
    // 太陽・原子・戦争の行は、まだ封じられている
    for (const id of ['sun_shine', 'fission', 'war']) expect(isSealed(g, gameData, id), id).toBe(true);
    const r = rewriteLaw(g, gameData, 'sun_shine', '太陽は少し弱く地球を照らす。');
    expect(r.block).toBe('sealed');
    expect(r.sealed?.law).toBe('sun_shine');
    expect(r.sealed?.rank).toBeGreaterThan(0);
    expect(rewriteLaw(g, gameData, 'war', '').block).toBe('sealed');
    expect(g.edits.left).toBe(left);
    expect(g.texts.war).toBe(gameData.lawById.get('war')!.options.find((o) => o.kind === 'original')!.text);
    // 開いている行は書き換えられる
    expect(rewriteLaw(g, gameData, 'human_food', '人間は数日に一度食事を必要とする。').block).toBeNull();
  });

  it('書き足した文が封じられた行の話なら、その行の書き換えとして読んでも止める', () => {
    const g = world('food', 0);
    const r = addLine(g, gameData, '争いは話し合いになりうる。');
    expect(r.block).toBe('sealed');
    expect(g.extras).toHaveLength(0);
  });

  it('書き足せる行の数（余白）には限りがあり、書き足した行を消せば、また書ける', () => {
    const g = world('food', 0);
    const margin = g.access!.margin!;
    const lines = ['人間は空を飛べる。', '人間は光合成できる。', '人間は肉を食べない。', '人は歌うと元気になる。'];
    for (const t of lines.slice(0, margin)) expect(addLine(g, gameData, t).block, t).toBeNull();
    expect(g.extras).toHaveLength(margin);
    expect(addLine(g, gameData, lines[margin]!).block).toBe('margin');
    // 書き足した行の書き換えは、余白を使わない
    expect(rewriteLine(g, gameData, g.extras[0]!.id, '人間は空を少しだけ飛べる。').block).toBeNull();
    expect(rewriteLine(g, gameData, g.extras[0]!.id, '').block).toBeNull();
    expect(addLine(g, gameData, lines[margin]!).block).toBeNull();
  });

  it('いまの筆には重すぎる概念（無理の大きいもの）は書けない。位が上がれば書ける', () => {
    const low = world('food', 0);
    const r = addLine(low, gameData, '時間が止まる。');
    expect(r.block).toBe('heavy');
    expect(r.heavy?.name).toBeTruthy();
    expect(r.heavy!.rank).toBeGreaterThan(0);
    // 行の書き換えに運ぶ概念も同じ（開いた行でも、重すぎる概念は書けない）
    expect(rewriteLaw(low, gameData, 'human_food', '人間は食事を必要とせず、時間が止まる。').block).toBe('heavy');
    const high = world('food', ranks[r.heavy!.rank]!.clears);
    expect(addLine(high, gameData, '時間が止まる。').block).toBeNull();
    // 世界そのものを消すような概念は、最後の位で初めて書ける
    expect(addLine(world('food', ranks[last - 1]!.clears), gameData, '宇宙は消える。').block).toBe('heavy');
    expect(addLine(world('food', ranks[last]!.clears), gameData, '宇宙は消える。').block).toBeNull();
  });

  it('行の新しい読み取り（消したときの意味も）も、書き足す概念と同じ重さの尺度で止める', () => {
    const low = world('food', 0);
    // 食事の行を消す＝「食事が要らない」世界（無理の大きさ 28）は、はじめの筆では重すぎる
    const del = rewriteLaw(low, gameData, 'human_food', '');
    expect(del.block).toBe('heavy');
    expect(del.heavy?.name).toBe(gameData.optionOf.get('human_food')!.get('delete')!.label);
    expect(low.texts.human_food).not.toBe('');
    // 軽い読み取り（数日に一度）は書ける
    expect(rewriteLaw(low, gameData, 'human_food', '人間は数日に一度食事を必要とする。').block).toBeNull();
    // 位が上がれば書ける
    const high = world('food', ranks[del.heavy!.rank]!.clears);
    expect(rewriteLaw(high, gameData, 'human_food', '').block).toBeNull();
  });

  it('無限の世界では、知らされた危機を防ぐ行の封が、そのあいだだけ解ける', () => {
    const g = world('endless', 1);
    expect(isSealed(g, gameData, 'war')).toBe(true);
    g.crisis = { id: 'world_war', at: g.year + 3, strength: 1 };
    expect(crisisConcepts(gameData, 'world_war')).toContain('war');
    expect(isSealed(g, gameData, 'war')).toBe(false);
    expect(buildView(g, gameData).pen?.crisisOpen).toBe(true);
    expect(rewriteLaw(g, gameData, 'war', '争いは話し合いになりうる。').block).toBeNull();
    g.crisis = null;
    expect(isSealed(g, gameData, 'war')).toBe(true);
  });

  it('どのステージも、はじめて遊べる位で、作戦に使う行と危機に関わる行が開いている', () => {
    // はじめて遊べる位：食料・感染症・気候は0、戦争・資源・無限は1、くり返す十年は2、極小世界は3
    for (const st of gameData.stages) {
      const g = world(st.id, st.unlock ?? 0);
      for (const c of gameData.access.stages[st.id]) expect(g.access!.concepts, `${st.id} ${c}`).toContain(c);
    }
  });

  it('どのステージの作戦も、はじめて遊べる位（作戦に書いた位）で、封じられた行・余白・重さに止められない', async () => {
    const { STRATEGIES } = await import('../scripts/strategies');
    const stopped: string[] = [];
    for (const st of gameData.stages) {
      for (const strat of STRATEGIES[st.id] ?? []) {
        const g = createGame(gameData, st.id, 1000, accessFor(gameData, st.id, strat.clears ?? st.unlock ?? 0));
        let steps = 0;
        while (g.status === 'playing' && g.year < st.goalYears && steps++ < 600) {
          for (const e of strat.edits) {
            if (e.year !== g.year || (e.pass !== undefined && e.pass !== (g.loop?.count ?? 0))) continue;
            const res = e.law ? rewriteLaw(g, gameData, e.law, e.text) : addLine(g, gameData, e.text);
            if (res.block === 'sealed' || res.block === 'margin' || res.block === 'heavy') stopped.push(`${st.id}/${strat.name}: ${res.block} ${e.law ?? e.text}`);
          }
          advance(g, gameData, 1);
        }
      }
    }
    expect(stopped).toEqual([]);
  });

  it('画面：封じられた行には、開く位を添える。筆の位の写しは、次の位で広がるものを言う', () => {
    const g = world('food', 0);
    const v = buildView(g, gameData);
    expect(v.laws.find((l) => l.id === 'sun_shine')?.sealed).toBeGreaterThan(0);
    expect(v.laws.find((l) => l.id === 'human_food')?.sealed).toBeNull();
    expect(v.pen?.name).toBe(ranks[0]!.name);
    const pen = penOf(gameData, 0);
    expect(pen.next?.left).toBe(ranks[1]!.clears);
    expect(pen.next?.gains.length).toBeGreaterThan(0);
    expect(penOf(gameData, ranks[last]!.clears).free).toBe(true);
  });

  it('古いセーブ（範囲のない世界）は、すべて自由なまま遊べる。同じ位・同じ種なら同じ世界', () => {
    const g = world('plague', 2);
    const old = JSON.parse(JSON.stringify(g)) as Record<string, unknown>;
    delete old.access;
    old.schema = 7;
    const up = upgradeState(old as unknown as GameState, gameData);
    expect(up.access).toBeNull();
    const a = world('climate', 1, 9);
    const b = world('climate', 1, 9);
    advance(a, gameData, 3);
    advance(b, gameData, 3);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
