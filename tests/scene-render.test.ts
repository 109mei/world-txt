import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/core';
import { gameData } from '../src/data';
import { SCENE_MOTIFS, type SceneMotif } from '../src/data/schema';
import { sceneView, type SceneView } from '../src/store/scene';
import { WorldScene } from '../src/ui/WorldScene';

/** 情景を実際に描いて（サーバーで HTML にして）確かめる */
const render = (v: SceneView, from: SceneView | null = null) =>
  // 絵の外の印（描いている要素の一覧）は比べない
  renderToStaticMarkup(createElement(WorldScene, { scene: v, from, compact: true })).replace(/ data-motifs="[^"]*"/, '');

/** 同じ種なら同じ並びになる、テスト用の乱数 */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('世界の情景を、いろいろな組み合わせで描く', () => {
  const base = sceneView(createGame(gameData, 'food', 3), gameData);

  it('どの要素も、一つだけ書けば絵が変わる（強くても弱くても）', () => {
    const plain = render(base);
    const missing: string[] = [];
    for (const level of [1, 0.35]) {
      for (const id of SCENE_MOTIFS) {
        const v: SceneView = { ...base, motifs: { ...base.motifs, [id]: level }, inked: [], fresh: [] };
        const html = render(v);
        expect(html, `${id}@${level}`).not.toMatch(/NaN|undefined|Infinity/);
        if (html === plain) missing.push(`${id}@${level}`);
      }
    }
    expect(missing).toEqual([]);
  });

  /** 書き換え・副作用・危機を、でたらめに重ねた世界（同じ種なら同じ世界） */
  function randomWorld(seed: number) {
    const r = rng(seed);
    const stages = ['food', 'plague', 'climate', 'war', 'energy', 'tiny', 'loop', 'endless'] as const;
    const g = createGame(gameData, stages[Math.floor(r() * stages.length)]!, seed);
    const from = sceneView(g, gameData);
    const keys = [...gameData.phrases.map((p) => `p:${p.id}`), ...gameData.laws.flatMap((l) => l.options.filter((o) => o.scene).map((o) => `o:${l.id}.${o.id}`))];
    const n = 1 + Math.floor(r() * 9);
    g.inEffect = Array.from({ length: n }, () => keys[Math.floor(r() * keys.length)]!);
    const twists = Object.keys(gameData.scene.twists);
    for (let i = Math.floor(r() * 4); i > 0; i -= 1) g.twists[twists[Math.floor(r() * twists.length)]!] = 0.15 + r() * 0.85;
    for (const id of Object.keys(g.scores) as (keyof typeof g.scores)[]) g.scores[id] = Math.floor(r() * 100);
    g.sim.temp += (r() - 0.5) * 6;
    g.year += 1;
    g.report = { from: g.year - 1, to: g.year, news: [], changes: [], became: g.inEffect.filter(() => r() < 0.5) } as unknown as typeof g.report;
    return { g, v: sceneView(g, gameData), from };
  }

  it('でたらめに重ねた600の世界でも、絵は壊れず、両立しないものを同時に描かない', () => {
    let most = 0;
    for (let seed = 1; seed <= 600; seed += 1) {
      const { v, from } = randomWorld(seed);
      const html = render(v, from);
      expect(html, `seed ${seed}`).not.toMatch(/NaN|undefined|Infinity/);
      // 反対どうしは一つだけ
      for (const group of gameData.scene.exclusive) expect(group.filter((k) => v.motifs[k] !== undefined).length, `seed ${seed} ${group.join('/')}`).toBeLessThan(2);
      // 大きな欠けがあれば、それを前提にする絵は描かない
      for (const [hider, hidden] of Object.entries(gameData.scene.hides)) {
        if ((v.motifs[hider as SceneMotif] ?? 0) < gameData.scene.hideAt) continue;
        for (const k of hidden) expect(v.motifs[k], `seed ${seed} ${hider} → ${k}`).toBeUndefined();
      }
      most = Math.max(most, (html.match(/</g) ?? []).length);
    }
    // どれだけ重ねても、描く物の数には限りがある（重くならない）
    expect(most).toBeLessThan(6000);
  });

  it('いくつ重ねても、書き換えから来たものはどれも絵に表れる（ほかのものに埋もれない）', () => {
    const hidden: string[] = [];
    for (let seed = 1; seed <= 160; seed += 1) {
      const { v } = randomWorld(seed);
      const still = { ...v, fresh: [], specimens: v.specimens.map((s) => ({ ...s, fresh: false })), steles: v.steles.map((s) => ({ ...s, fresh: false })) };
      const html = render(still);
      for (const k of v.inked) {
        const motifs = { ...still.motifs };
        delete motifs[k];
        if (render({ ...still, motifs, inked: still.inked.filter((x) => x !== k) }) === html) hidden.push(`${seed}:${k}`);
      }
    }
    expect(hidden).toEqual([]);
  });

  it('書いたとおりの絵になる：反対のことを書けば後に書いたほうを、大きな欠けはそれを前提にする絵を消す', () => {
    const g = createGame(gameData, 'climate', 1);
    // 森がない → 森が茂る（後に書いたほう）
    g.inEffect = ['p:no_forest', 'o:plant_grow.fast'];
    let v = sceneView(g, gameData);
    expect(v.motifs.forest).toBeGreaterThan(0);
    expect(v.motifs.noForest).toBeUndefined();
    g.inEffect = ['o:plant_grow.fast', 'p:no_forest'];
    v = sceneView(g, gameData);
    expect(v.motifs.noForest).toBeGreaterThan(0);
    expect(v.motifs.forest).toBeUndefined();
    // 動物がいない → 恐竜がよみがえる
    g.inEffect = ['o:animal_exist.delete', 'p:dinosaurs'];
    v = sceneView(g, gameData);
    expect(v.motifs.dinosaurs).toBeGreaterThan(0);
    // 人がいない世界では、空を飛ぶ人を描かない。海がない世界では、潜る人を描かない
    g.inEffect = ['p:flight', 'p:no_humans'];
    expect(sceneView(g, gameData).motifs.flyers).toBeUndefined();
    g.inEffect = ['p:underwater', 'p:no_sea'];
    v = sceneView(g, gameData);
    expect(v.motifs.divers).toBeUndefined();
    expect(v.motifs.noSea).toBeGreaterThan(0);
  });

  it('時間を進めた年は、去年の絵から塗り替え、なくなったものは消えていく姿を描く', () => {
    const g = createGame(gameData, 'climate', 1);
    const from = sceneView(g, gameData);
    g.inEffect = ['p:no_moon', 'p:no_sea', 'p:flight'];
    g.year += 1;
    g.report = { from: 0, to: 1, news: [], changes: [], became: ['p:no_moon', 'p:no_sea', 'p:flight'] } as unknown as typeof g.report;
    const v = sceneView(g, gameData);
    const html = render(v, from);
    expect(html).toContain('scene-from');
    expect(html).toContain('data-ghost="noMoon"');
    expect(html).toContain('data-ghost="noSea"');
    expect(html).toContain('data-enter="lift"');
    // 去年の絵がなければ（はじめて開いた年など）、塗り替えずに今年の絵だけを描く
    expect(render(v)).not.toContain('scene-from');
  });
});
