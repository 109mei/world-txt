import { createGame } from '../core';
import { gameData } from '../data';
import { SCENE_MOTIFS, SPECIMEN_MODES, SPECIMEN_SHAPES, type SceneMotif } from '../data/schema';
import { sceneView, type SceneView } from '../store/scene';
import { WorldScene } from './WorldScene';

/**
 * 開発用：情景の要素を一つずつ描いて並べる（?gallery=1。開発中だけ。公開用のビルドには入らない）。
 * 描き分けの崩れを、目で確かめるため
 */
export function SceneGallery() {
  const base = sceneView(createGame(gameData, 'food', 7), gameData);
  const one = (id: SceneMotif): SceneView => ({ ...base, motifs: { [id]: 1 }, inked: [id], fresh: [] });
  const params = new URLSearchParams(window.location.search);
  const start = Number(params.get('from') ?? 0);
  // focus=people：人々の立つ広場だけを大きく見る
  const focus = params.get('focus');
  const viewBox = focus === 'people' ? '100 120 200 90' : focus === 'land' ? '0 120 150 100' : focus === 'sky' ? '30 78 330 60' : undefined;
  const per = focus === 'sky' ? 8 : focus ? 4 : 12;
  const tiles: { key: string; label: string; v: SceneView }[] = [
    ...SCENE_MOTIFS.map((id) => ({ key: id, label: id, v: one(id) })),
    ...SPECIMEN_SHAPES.flatMap((shape) =>
      SPECIMEN_MODES.map((mode) => ({
        key: `${shape}-${mode}`,
        label: `${shape} / ${mode}`,
        v: { ...base, specimens: [{ key: `p:${shape}${mode}`, shape, mode, label: shape, fresh: false }] },
      })),
    ),
    { key: 'steles', label: 'steles', v: { ...base, steles: (['energy', 'science', 'temperature', 'dna'] as const).map((icon, i) => ({ key: `s${i}`, icon, fresh: false })) } },
  ];
  // mix=1：書き換え・副作用・状態をでたらめに重ねた世界を並べる（組み合わせの崩れや、埋もれるものを目で確かめる）
  if (params.get('mix')) {
    const worlds = Array.from({ length: per }, (_, k) => mixWorld(start + k + 1));
    return (
      <div className="gallery">
        {worlds.map((w) => (
          <div key={w.seed} className="gallery-tile">
            <WorldScene scene={w.v} compact testId={`gallery-mix-${w.seed}`} viewBox={viewBox} />
            <div className="gallery-label">
              {w.seed}: {w.label}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={focus ? 'gallery gallery-focus' : 'gallery'} data-focus={focus ?? undefined}>
      {tiles.slice(start, start + per).map((t) => (
        <div key={t.key} className="gallery-tile" data-motif={t.key}>
          <WorldScene scene={t.v} compact testId={`gallery-${t.key}`} viewBox={viewBox} />
          <div className="gallery-label">{t.label}</div>
        </div>
      ))}
    </div>
  );
}

/** 同じ番号なら同じ並びになる乱数 */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** 書き換え（言い回し・法則の読み取り）と副作用をでたらめに重ねた世界 */
function mixWorld(seed: number): { seed: number; v: SceneView; label: string } {
  const r = rng(seed * 7919);
  const g = createGame(gameData, 'food', seed);
  const keys = [...gameData.phrases.map((p) => `p:${p.id}`), ...gameData.laws.flatMap((l) => l.options.filter((o) => o.scene).map((o) => `o:${l.id}.${o.id}`))];
  g.inEffect = Array.from({ length: 2 + Math.floor(r() * 6) }, () => keys[Math.floor(r() * keys.length)]!);
  const twists = Object.keys(gameData.scene.twists);
  for (let i = Math.floor(r() * 3); i > 0; i -= 1) g.twists[twists[Math.floor(r() * twists.length)]!] = 0.3 + r() * 0.7;
  for (const id of Object.keys(g.scores) as (keyof typeof g.scores)[]) g.scores[id] = 20 + Math.floor(r() * 70);
  const label = g.inEffect
    .map((k) => (k.startsWith('p:') ? (gameData.phraseById.get(k.slice(2))?.name ?? k) : (gameData.optionOf.get(k.slice(2).split('.')[0]!)?.get(k.split('.')[1]!)?.label ?? k)))
    .join(' / ');
  return { seed, v: sceneView(g, gameData), label };
}
