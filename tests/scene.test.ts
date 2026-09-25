import { describe, expect, it } from 'vitest';
import { addLine, advance, createGame, rewriteLaw } from '../src/core';
import { gameData } from '../src/data';
import { sceneView } from '../src/store/scene';
import { buildView } from '../src/store/view';

/** 情景が描いているもの（要素・言葉の絵・石碑） */
function drawn(s: ReturnType<typeof sceneView>): string[] {
  return [...Object.keys(s.motifs), ...s.specimens.map((x) => `specimen:${x.key}`), ...s.steles.map((x) => `stele:${x.key}`)];
}

describe('世界の情景（世界のタブの絵）', () => {
  it('最後に書いた一文をインクで添える（消した行は添えない）', () => {
    const g = createGame(gameData, 'food', 1);
    expect(buildView(g, gameData).scene.ink).toBeNull();
    rewriteLaw(g, gameData, 'human_food', '人間は数日に一度食事を必要とする');
    addLine(g, gameData, '人間は空を飛べる');
    expect(buildView(g, gameData).scene.ink).toBe('人間は空を飛べる。');
    rewriteLaw(g, gameData, 'crime', '');
    expect(buildView(g, gameData).scene.ink).toBe('人間は空を飛べる。');
  });

  it('書き換えは、時間を進めて世界に効き始めてから描く（書いただけでは見せない）', () => {
    const g = createGame(gameData, 'climate', 1);
    g.sim.capacityMax += 120;
    addLine(g, gameData, '空には太陽が二つある。');
    addLine(g, gameData, '人間は空を飛べる。');
    const before = sceneView(g, gameData);
    expect(before.motifs.twoSuns).toBeUndefined();
    expect(before.motifs.flyers).toBeUndefined();
    const rep = advance(g, gameData, 1);
    const after = sceneView(g, gameData);
    expect(after.motifs.twoSuns).toBe(1);
    expect(after.motifs.flyers).toBe(1);
    // 書き換えから来たものはインクで描き、この年に効き始めたものはにじむように現れる
    expect(after.inked).toEqual(expect.arrayContaining(['twoSuns', 'flyers']));
    expect(after.fresh).toEqual(expect.arrayContaining(['twoSuns', 'flyers']));
    // 世界がそのとおりに変わったことを、その年の知らせでも伝える（どの一文から来たかも）
    const onset = rep.news.filter((n) => n.onset);
    expect(onset.map((n) => n.text)).toEqual(expect.arrayContaining([expect.stringContaining('二つ目の太陽'), expect.stringContaining('空を飛び始めた')]));
    expect(onset.find((n) => n.text.includes('空を飛び'))?.cause?.text).toBe('人間は空を飛べる。');
    // 次の年には、もうにじませない
    advance(g, gameData, 1);
    expect(sceneView(g, gameData).fresh).toEqual([]);
    expect(sceneView(g, gameData).motifs.flyers).toBe(1);
  });

  it('書き足した概念は、どれも情景のどこかを変える（描き方どおりの要素を描く）', () => {
    const base = createGame(gameData, 'food', 1);
    const plain = new Set(drawn(sceneView(base, gameData)));
    for (const p of gameData.phrases) {
      const g = createGame(gameData, 'food', 1);
      g.inEffect = [`p:${p.id}`];
      const s = sceneView(g, gameData);
      const added = drawn(s).filter((x) => !plain.has(x));
      expect(added.length, p.id).toBeGreaterThan(0);
      for (const id of Object.keys(p.scene.motifs)) expect(s.motifs[id as keyof typeof s.motifs], `${p.id} ${id}`).toBeGreaterThan(0);
      if (p.scene.specimen) expect(s.specimens.length, p.id).toBe(1);
      if (p.scene.stele) expect(s.steles.map((x) => x.icon), p.id).toEqual([p.icon]);
    }
  });

  it('法則の書き換え（元の文でない読み取り）は、どれも情景のどこかを変える', () => {
    const base = createGame(gameData, 'food', 1);
    const plain = new Set(drawn(sceneView(base, gameData)));
    for (const law of gameData.laws) {
      for (const o of law.options) {
        if (o.kind === 'original') continue;
        const g = createGame(gameData, 'food', 1);
        g.inEffect = [`o:${law.id}.${o.id}`];
        const added = drawn(sceneView(g, gameData)).filter((x) => !plain.has(x));
        expect(added.length, `${law.id}.${o.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('「{X}がいなくなる」のような文は、書いた言葉を、その種類の形と名前で描く', () => {
    const cases: [string, string, string, string][] = [
      ['パンダは存在しない。', 'パンダ', 'animal', 'gone'],
      ['猫が増える。', '猫', 'animal', 'more'],
      ['チョコレートは存在しない。', 'チョコレート', 'food', 'gone'],
      ['パンが世界を支配する。', 'パン', 'food', 'rule'],
    ];
    for (const [text, label, shape, mode] of cases) {
      const g = createGame(gameData, 'food', 1);
      addLine(g, gameData, text);
      advance(g, gameData, 1);
      const s = sceneView(g, gameData);
      expect(s.specimens, text).toEqual([expect.objectContaining({ label, shape, mode })]);
    }
  });

  it('副作用・知らされた危機・世界の結末も、情景に表れる', () => {
    const g = createGame(gameData, 'food', 1);
    g.twists = { sky_traffic: 0.8, hyperinflation: 0.1 };
    const s = sceneView(g, gameData);
    expect(s.motifs.flyers).toBeGreaterThan(0);
    // 芽のうちの副作用は描かない
    expect(s.motifs.paperMoney).toBeUndefined();
    const e = createGame(gameData, 'endless', 2);
    e.crisis = { id: 'meteor', at: e.year + 1, strength: 1 };
    expect(sceneView(e, gameData).motifs.meteors).toBeGreaterThan(0);
    const end = createGame(gameData, 'food', 1);
    end.status = 'failed';
    end.ending = 'frozen';
    expect(sceneView(end, gameData).motifs.snow).toBe(1);
  });

  it('戦争・文明の崩れ・世界の終わりが、絵に表れる（どれも 0〜1）', () => {
    const g = createGame(gameData, 'war', 3);
    for (let i = 0; i < 60 && g.status === 'playing'; i += 1) advance(g, gameData, 1);
    const scene = buildView(g, gameData).scene;
    expect(scene.ended).toBe('failed');
    for (const v of [scene.people, scene.civ, scene.food, scene.eco, scene.water, scene.energy, scene.industry, scene.health, scene.war, scene.peace, scene.society, scene.mind, scene.coherence, scene.renew, scene.fossil]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    for (const v of Object.values(scene.motifs)) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(scene.heat).toBeGreaterThanOrEqual(-1);
    expect(scene.heat).toBeLessThanOrEqual(1);
  });
});

describe('情景の絵', () => {
  it('描く要素（SCENE_MOTIFS）は、どれも src/ui/scene に絵がある', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const { SCENE_MOTIFS } = await import('../src/data/schema');
    const dir = 'src/ui/scene';
    const code = [readFileSync('src/ui/WorldScene.tsx', 'utf8'), ...readdirSync(dir).map((f) => readFileSync(`${dir}/${f}`, 'utf8'))].join('\n');
    const missing = SCENE_MOTIFS.filter((id) => !new RegExp(`['"]${id}['"]`).test(code));
    expect(missing).toEqual([]);
  });
});
