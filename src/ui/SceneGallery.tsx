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
