import { useEffect, useMemo, useRef, useState } from 'react';
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
 * 消えた海・巨大な像・ロボット・言葉そのもの……）を描き、その年に効き始めたものはインクがにじむように現れる。
 * 状態は状態語と矢印で伝えているので、絵は飾り（読み上げない）
 */

/** 新しく描かれたものを、にじませて見せ終えた世界と年（同じ年に何度も見せない） */
const shown = new Set<string>();

export function WorldScene({ scene, compact = false, testId = 'scene', viewBox }: { scene: SceneView; compact?: boolean; testId?: string; viewBox?: string }) {
  const key = `${scene.seed}:${scene.year}`;
  // その年の新しい要素は、最初に見たときだけにじませる（タブを切り替えるたびに繰り返さない）
  const v = useMemo<SceneView>(() => {
    if (!shown.has(key)) return scene;
    return {
      ...scene,
      fresh: [],
      specimens: scene.specimens.map((s) => ({ ...s, fresh: false })),
      steles: scene.steles.map((s) => ({ ...s, fresh: false })),
    };
  }, [scene, key]);
  useEffect(() => {
    // 絵を描き終えてから「見せた」と覚える（同じ画面の描き直しでは、にじみを止めない）
    const t = setTimeout(() => shown.add(key), 2400);
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
    <figure ref={ref} className={cls} data-testid={testId} data-motifs={Object.keys(v.motifs).join(' ')} aria-hidden="true">
      <svg viewBox={viewBox ?? `0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="presentation">
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
            <path
              data-motif="quake"
              className={v.fresh.includes('quake') ? 'sc-appear' : undefined}
              d="M40 176 l8 6 l-4 6 l10 5 l-2 6 M200 178 l-6 8 l8 4 l-5 8 M300 176 l6 7 l-8 5"
              fill="none"
              stroke={v.inked.includes('quake') ? 'var(--ink)' : 'rgba(242,163,147,0.7)'}
              strokeWidth={1}
            />
          )}
          <People v={v} />
          <Steles v={v} />
          <Weather v={v} />
          <Disaster v={v} />
        </g>
        <Overlay v={v} />
      </svg>
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
