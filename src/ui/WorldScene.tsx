import { Pencil } from 'lucide-react';
import { updateSettings, useGame } from '../store/game';
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SceneMotif } from '../data/schema';
import type { SceneView } from '../store/scene';
import { Clouds, Disaster, SkyTraffic, Weather } from './scene/Air';
import { City, Parallel } from './scene/City';
import { H, m, W } from './scene/common';
import { Fields, Hills, Mountains, Reservoir, River, Specimens, Steles, VoidLots } from './scene/Land';
import { Overlay } from './scene/Overlay';
import { Farmer, People, WaterQueue } from './scene/People';
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

/** 飛び出す絵本の立ち上がりを見せ終えた世界（世界番号） */
const popped = new Set<number>();

/** 塗り替えと、そのあとの現れ方が終わるまで */
const TRANSIT_MS = 2400;
const SHOWN_MS = 4500;
/** 切り絵が立ち上がり終えるまで（CSS の scene-pop と同じ長さ） */
const POP_MS = 1200;

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

/** 現れ方を見せ終えた絵：新しく描かれたものの一覧は残し（人々の並びなど、絵の形を変えない）、動きだけを止める */
function settled(scene: SceneView): SceneView {
  return {
    ...scene,
    entered: true,
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
  const names = useGame((s) => s.settings.names);
  const focus = useGame((s) => s.sceneFocus);
  // 去年の絵から塗り替えるのは、その年を最初に見たときだけ
  const transitKey = useMemo(
    () => (from && from.seed === scene.seed && from.year !== scene.year && !transited.has(key) && !shown.has(key) ? key : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, from?.seed, from?.year],
  );
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const transit = transitKey !== null && doneKey !== transitKey;

  // 飛び出す絵本：その世界を開いて最初に情景を見たときだけ、切り絵が奥から順に立ち上がる（1年進めた塗り替えの年は出さない）
  const layered = !compact && !viewBox;
  const [pop, setPop] = useState(() => layered && transitKey === null && !popped.has(scene.seed));
  useEffect(() => {
    if (!pop) return;
    popped.add(scene.seed);
    const t = setTimeout(() => setPop(false), POP_MS);
    return () => clearTimeout(t);
  }, [pop, scene.seed]);
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
    <figure ref={ref} className={cls} data-testid={testId} data-motifs={Object.keys(v.motifs).join(' ')} data-transit={transit ? 'on' : undefined}>
      <div className="scene-frame">
      {/* 年ごとに描き直す（1年進めたときだけ、飾りが1回動く）。世界のタブの情景は、層に分けた飛び出す絵本 */}
      {layered ? <LayeredSvg key={key} v={v} pop={pop} /> : <SceneSvg key={key} v={v} viewBox={viewBox} />}
      {/* 情景の名前（施設の名前と、気がかりな状態の言葉）。切り替えられる */}
      {!compact && names && !viewBox && (
        <div className="scene-labels" aria-hidden="true">
          {v.labels.map((l) => (
            <span
              key={l.id}
              className={['scene-label', `tone-${l.tone}`, focus === l.id ? 'scene-label-focus' : ''].filter(Boolean).join(' ')}
              style={{ left: `${(l.x / W) * 100}%`, top: `${(l.y / H) * 100}%` }}
              data-testid={`label-${l.id}`}
            >
              {l.name}
              {l.word && <b>{l.word}</b>}
            </span>
          ))}
        </div>
      )}
      {!compact && !viewBox && (
        <button
          className="scene-names"
          role="switch"
          aria-checked={names}
          onClick={() => updateSettings({ names: !names })}
          data-testid="scene-names"
          aria-label="情景に名前を出す"
        >
          <span className="scene-names-knob" /> 名前
        </button>
      )}
      </div>
      {transit && from && (
        <>
          {/* 去年の絵：窓ごと右へ動かし、絵は逆へ動かして止めたまま、見える所を左から狭める */}
          <div className="scene-from-window">
            <SceneSvg v={settled(from)} viewBox={viewBox} className="scene-from" />
          </div>
          <div className="scene-wash" />
        </>
      )}
      {!compact && (
        <figcaption className="scene-ink" data-testid="scene-ink">
          {v.ink ? (
            <>
              <Pencil size={13} strokeWidth={1.5} className="scene-ink-mark" aria-label="書いた一文" /> <span className="ink">{v.ink}</span>
            </>
          ) : (
            <span className="dim">世界はまだ書き換えられていない</span>
          )}
        </figcaption>
      )}
    </figure>
  );
}

/** 情景の共通の定義（水・かすみ・周辺の暗がり・ぼかし・世界異常のゆがみ）。層に分けたときは、いちばん奥の層にだけ置く（同じページの中の絵から参照できる） */
function SceneDefs({ v }: { v: SceneView }) {
  return (
    <defs>
      <linearGradient id="sc-water" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--sc-water)" stopOpacity="0.35" />
        <stop offset="1" stopColor="var(--sc-water)" stopOpacity="0.05" />
      </linearGradient>
      {/* 空気遠近法のかすみ（遠い山のふもとを空の色に寄せる） */}
      <linearGradient id="sc-haze" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--sc-sky-bottom)" stopOpacity="0" />
        <stop offset="1" stopColor="var(--sc-sky-bottom)" stopOpacity="0.5" />
      </linearGradient>
      <radialGradient id="sc-vignette" cx="0.5" cy="0.5" r="0.75">
        <stop offset="0.6" stopColor="var(--sc-shade)" stopOpacity="0" />
        <stop offset="1" stopColor="var(--sc-shade)" stopOpacity="0.55" />
      </radialGradient>
      <filter id="sc-soft" x="-50%" y="-100%" width="200%" height="300%">
        <feGaussianBlur stdDeviation="12" />
      </filter>
      {/* 世界異常：ゆがみ（feDisplacementMap）と色のずれ（赤と青を左右にずらす）。種は世界番号から */}
      <filter id="sc-distort" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.08" numOctaves={1} seed={v.seed % 97} result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale={6} xChannelSelector="R" yChannelSelector="G" result="warp" />
        <feColorMatrix in="warp" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red" />
        <feOffset in="red" dx={1.6} result="redShift" />
        <feColorMatrix in="warp" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="cyan" />
        <feOffset in="cyan" dx={-1.6} result="cyanShift" />
        <feBlend in="redShift" in2="cyanShift" mode="screen" />
      </filter>
    </defs>
  );
}

/** 地割れ */
function Quake({ v }: { v: SceneView }) {
  if (m(v, 'quake') <= 0) return null;
  return (
    <g data-motif="quake" className={v.fresh.includes('quake') && !v.entered ? 'sc-fresh sc-in-sweep' : undefined}>
      <path
        d="M40 176 l8 6 l-4 6 l10 5 l-2 6 M200 178 l-6 8 l8 4 l-5 8 M300 176 l6 7 l-8 5"
        fill="none"
        stroke={v.inked.includes('quake') ? 'var(--ink)' : 'rgb(var(--bad-rgb) / 0.7)'}
        strokeWidth={1}
      />
    </g>
  );
}

/**
 * 情景を奥から手前へ5つの層に分けた描く順（層をつなげると、1枚の絵の描く順と同じ）：
 * 空（空・天体）→ 遠景（山・雲・空の往来・言葉の絵）→ 中景（丘・海・並行世界・町）→
 * 近景（畑・消した行の空き地・川・貯水池・地割れ・人々・石碑）→ 覆い（天気・災い。重ね絵はその上）
 */
type LayerId = 'sky' | 'far' | 'mid' | 'near' | 'cover';
const LAYERS: { id: LayerId; draw: (v: SceneView) => ReactNode }[] = [
  {
    id: 'sky',
    draw: (v) => (
      <>
        <SkyBack v={v} />
        <Celestial v={v} />
      </>
    ),
  },
  {
    id: 'far',
    draw: (v) => (
      <>
        <Mountains v={v} />
        <Clouds v={v} />
        <SkyTraffic v={v} />
        <Specimens v={v} />
      </>
    ),
  },
  {
    id: 'mid',
    draw: (v) => (
      <>
        <Hills v={v} />
        <Sea v={v} />
        <Parallel v={v} />
        <City v={v} />
      </>
    ),
  },
  {
    id: 'near',
    draw: (v) => (
      <>
        <Fields v={v} />
        <VoidLots v={v} />
        <River v={v} />
        <Reservoir v={v} />
        <Quake v={v} />
        <People v={v} />
        <Farmer v={v} />
        <WaterQueue v={v} />
        <Steles v={v} />
      </>
    ),
  },
  {
    id: 'cover',
    draw: (v) => (
      <>
        <Weather v={v} />
        <Disaster v={v} />
      </>
    ),
  },
];

/** 情景の絵そのものを1枚で（結果の画面・ノート・去年の絵・一覧）。空・天体・山・雲・空の往来・言葉の絵・丘・海・並行世界・町・畑・川・地割れ・人々・石碑・天気・災い・重ね絵 */
function SceneSvg({ v, viewBox, className }: { v: SceneView; viewBox?: string; className?: string }) {
  return (
    <svg className={className} viewBox={viewBox ?? `0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="presentation" aria-hidden="true">
      <SceneDefs v={v} />
      <g className="scene-world">
        {LAYERS.map((l) => (
          <Fragment key={l.id}>{l.draw(v)}</Fragment>
        ))}
      </g>
      <Overlay v={v} />
    </svg>
  );
}

/**
 * 飛び出す絵本（世界のタブの情景）：同じ視野の層を奥から重ね、手前の層ほど奥へ切り絵の影を落とす。
 * 止まっているときは1枚の絵とぴったり重なる。pop のときだけ、切り絵が奥から順に立ち上がる（1回、約1秒）
 */
function LayeredSvg({ v, pop }: { v: SceneView; pop: boolean }) {
  return (
    <div className={pop ? 'scene-stage scene-pop' : 'scene-stage'} data-testid="scene-stage">
      {LAYERS.map((l, i) => (
        <div key={l.id} className={`scene-layer scene-layer-${l.id}`}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="presentation" aria-hidden="true">
            {i === 0 && <SceneDefs v={v} />}
            <g className="scene-world">{l.draw(v)}</g>
            {l.id === 'cover' && <Overlay v={v} />}
          </svg>
        </div>
      ))}
    </div>
  );
}
