import { useEffect, useMemo, useRef, useState } from 'react';
import type { SceneMotif } from '../data/schema';
import type { SceneView } from '../store/scene';
import { Clouds, Disaster, SkyTraffic, Weather } from './scene/Air';
import { City, Parallel } from './scene/City';
import { H, m, W } from './scene/common';
import { Fields, Hills, Mountains, River, Specimens, Steles } from './scene/Land';
import { Overlay } from './scene/Overlay';
import { People } from './scene/People';
import { Sea } from './scene/Sea';
import { Celestial, SkyBack } from './scene/Sky';

/**
 * 世界の情景：写本の挿し絵のような、いまの世界の姿。
 * 状態（町の灯り・塔・畑・森・川・煙・霧・気候・戦火）と、書き換えた法則・書き足した概念のすべて（空を飛ぶ人・二つの太陽・
 * 消えた海・巨大な像・ロボット・言葉そのもの……）を描く。
 * 時間を進めた年は、去年の絵をインクの縁が塗り替えていき、新しく描かれたものはそのものらしく現れ（太陽はふくらみ、
 * 宇宙人の船は降り、塔は伸びる）、なくなったものはそのものらしく消える（月は欠け、海は引き、人は薄れる）。
 * 状態は状態語と矢印で伝えているので、絵は飾り（読み上げない）
 */

/** 新しく描かれたものを、見せ終えた世界と年（同じ年に何度も見せない） */
const shown = new Set<string>();
/** 去年の絵からの塗り替えを見せ終えた世界と年 */
const transited = new Set<string>();

/** 塗り替えと、そのあとの現れ方が終わるまで */
const TRANSIT_MS = 2400;
const SHOWN_MS = 4500;

/** 去年の絵になくて、今年の絵にあるもの（書き換え・出来事・危機・状態のどれから来たものでも） */
function withAppeared(scene: SceneView, from: SceneView): SceneView {
  const before = new Set(Object.keys(from.motifs));
  const appeared = (Object.keys(scene.motifs) as SceneMotif[]).filter((k) => !before.has(k));
  const oldSpecimens = new Set(from.specimens.map((s) => s.key));
  const oldSteles = new Set(from.steles.map((s) => s.key));
  return {
    ...scene,
    fresh: [...new Set([...scene.fresh, ...appeared])],
    specimens: scene.specimens.map((s) => ({ ...s, fresh: s.fresh || !oldSpecimens.has(s.key) })),
    steles: scene.steles.map((s) => ({ ...s, fresh: s.fresh || !oldSteles.has(s.key) })),
  };
}

function settled(scene: SceneView): SceneView {
  return {
    ...scene,
    fresh: [],
    specimens: scene.specimens.map((s) => ({ ...s, fresh: false })),
    steles: scene.steles.map((s) => ({ ...s, fresh: false })),
  };
}

export function WorldScene({
  scene,
  from = null,
  compact = false,
  testId = 'scene',
  viewBox,
}: {
  scene: SceneView;
  /** 去年の絵（あれば、去年の絵から塗り替えて見せる） */
  from?: SceneView | null;
  compact?: boolean;
  testId?: string;
  viewBox?: string;
}) {
  const key = `${scene.seed}:${scene.year}`;
  // 去年の絵から塗り替えるのは、その年を最初に見たときだけ
  const transitKey = useMemo(
    () => (from && from.seed === scene.seed && from.year !== scene.year && !transited.has(key) && !shown.has(key) ? key : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, from?.seed, from?.year],
  );
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const transit = transitKey !== null && doneKey !== transitKey;
  useEffect(() => {
    if (!transitKey) return;
    const t = setTimeout(() => {
      transited.add(transitKey);
      setDoneKey(transitKey);
    }, TRANSIT_MS);
    return () => clearTimeout(t);
  }, [transitKey]);

  // その年の新しい要素は、最初に見たときだけ動かす（タブを切り替えるたびに繰り返さない）
  const v = useMemo<SceneView>(() => {
    if (transitKey && from) return withAppeared(scene, from);
    return shown.has(key) ? settled(scene) : scene;
  }, [scene, key, transitKey, from]);
  useEffect(() => {
    // 絵を描き終えてから「見せた」と覚える（同じ画面の描き直しでは、動きを止めない）
    const t = setTimeout(() => shown.add(key), SHOWN_MS);
    return () => clearTimeout(t);
  }, [key]);

  // 画面の外に出た情景は、動きを止める（電池を使わない）
  const ref = useRef<HTMLElement>(null);
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setIdle(!e!.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const cls = [
    'scene',
    idle ? 'scene-idle' : '',
    compact ? 'scene-compact' : '',
    transitKey ? 'scene-transit' : '',
    v.ended === 'failed' ? 'scene-failed' : '',
    m(v, 'frozen') > 0.5 ? 'scene-frozen' : '',
    m(v, 'reverse') > 0.5 ? 'scene-reverse' : '',
    m(v, 'fast') > 0.3 || m(v, 'loop') > 0.5 ? 'scene-fast' : '',
    m(v, 'quake') > 0.3 ? 'scene-quake' : '',
    m(v, 'glitch') > 0.5 || v.coherence < 0.3 ? 'scene-glitch' : '',
    v.mind < 0.3 ? 'scene-gloom' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <figure ref={ref} className={cls} data-testid={testId} data-motifs={Object.keys(v.motifs).join(' ')} data-transit={transit ? 'on' : undefined} aria-hidden="true">
      <SceneSvg v={v} viewBox={viewBox} />
      {transit && from && (
        <>
          <SceneSvg v={settled(from)} viewBox={viewBox} className="scene-from" />
          <div className="scene-wash" />
        </>
      )}
      {!compact && (
        <figcaption className="scene-ink" data-testid="scene-ink">
          {v.ink ? (
            <>
              <span className="scene-ink-mark">✎</span> <span className="ink">{v.ink}</span>
            </>
          ) : (
            <span className="dim">世界は、まだ書き換えられていない。</span>
          )}
        </figcaption>
      )}
    </figure>
  );
}

/** 情景の絵そのもの（空・天体・山・雲・空の往来・言葉の絵・丘・海・並行世界・町・畑・川・地割れ・人々・石碑・天気・災い・重ね絵） */
function SceneSvg({ v, viewBox, className }: { v: SceneView; viewBox?: string; className?: string }) {
  return (
    <svg className={className} viewBox={viewBox ?? `0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="presentation">
      <defs>
        <linearGradient id="sc-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9ced8" stopOpacity="0.35" />
          <stop offset="1" stopColor="#c9ced8" stopOpacity="0.05" />
        </linearGradient>
        <radialGradient id="sc-vignette" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.6" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.55" />
        </radialGradient>
        <filter id="sc-soft" x="-50%" y="-100%" width="200%" height="300%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <g className="scene-world">
        <SkyBack v={v} />
        <Celestial v={v} />
        <Mountains v={v} />
        <Clouds v={v} />
        <SkyTraffic v={v} />
        <Specimens v={v} />
        <Hills v={v} />
        <Sea v={v} />
        <Parallel v={v} />
        <City v={v} />
        <Fields v={v} />
        <River v={v} />
        {m(v, 'quake') > 0 && (
          <g data-motif="quake" className={v.fresh.includes('quake') ? 'sc-fresh sc-in-sweep' : undefined}>
            <path
              d="M40 176 l8 6 l-4 6 l10 5 l-2 6 M200 178 l-6 8 l8 4 l-5 8 M300 176 l6 7 l-8 5"
              fill="none"
              stroke={v.inked.includes('quake') ? 'var(--ink)' : 'rgba(242,163,147,0.7)'}
              strokeWidth={1}
            />
          </g>
        )}
        <People v={v} />
        <Steles v={v} />
        <Weather v={v} />
        <Disaster v={v} />
      </g>
      <Overlay v={v} />
    </svg>
  );
}
