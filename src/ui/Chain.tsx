import { useEffect, useRef } from 'react';
import type { Chain } from '../store/chain';
import { useGame } from '../store/game';
import { fxShock, fxTrail } from './fx';
import { Icon } from './icons';
import { seDissonant, seString } from './se';

const KIND_LABEL = { direct: '直接', via: 'つながって', surprise: '想定外' } as const;
/** 1本の線が伸びる長さ（ミリ秒） */
const LINE_MS = 300;
/** 光の粒がたどる線の点の数 */
const TRAIL_POINTS = 16;

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

/** 線（SVG の道）の上の点を、画面の座標で等間隔に取る（見えていなければ null） */
function screenPoints(p: SVGPathElement): { x: number; y: number }[] | null {
  const m = p.getScreenCTM();
  const r = p.getBoundingClientRect();
  if (!m || r.bottom < 0 || r.top > window.innerHeight || typeof p.getTotalLength !== 'function') return null;
  const len = p.getTotalLength();
  const out: { x: number; y: number }[] = [];
  for (let k = 0; k <= TRAIL_POINTS; k++) {
    const q = p.getPointAtLength((len * k) / TRAIL_POINTS);
    const s = new DOMPoint(q.x, q.y).matrixTransform(m);
    out.push({ x: s.x, y: s.y });
  }
  return out;
}

/**
 * 因果の連鎖：書いた一文から、その年に効いた変化へ光の線を順に伸ばす（1本約0.3秒、最大6本）。
 * 想定外の変化は線が折れて跳び、着いた所で小さな衝撃波。線の順番は Web Animations API で組み、押すとすべて描き終える。
 * 動きを減らす設定・情景を動かす OFF では、線と文字をそのまま出す
 */
export function ChainView({ chain }: { chain: Chain }) {
  const motion = useGame((s) => s.settings.motion);
  const root = useRef<HTMLDivElement>(null);
  const anims = useRef<Animation[]>([]);
  useEffect(() => {
    const el = root.current;
    if (!el || !motion || reducedMotion() || typeof el.animate !== 'function') return;
    const list: Animation[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    el.querySelectorAll<SVGPathElement>('.chain-path').forEach((p, i) => {
      list.push(p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: LINE_MS, delay: i * LINE_MS, easing: 'ease-out', fill: 'both' }));
      const surprise = p.dataset.kind === 'surprise';
      // PixiJS の演出：伸びていく線の先を、光の粒がたどる
      const pts = screenPoints(p);
      if (pts) fxTrail(pts, i * LINE_MS, LINE_MS, surprise);
      timers.push(setTimeout(() => (surprise ? seDissonant() : seString(i + 1)), i * LINE_MS + LINE_MS * 0.8));
    });
    el.querySelectorAll<HTMLElement>('.chain-node').forEach((node, i) => {
      list.push(node.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: Math.max(0, i * LINE_MS - 60), easing: 'ease-out', fill: 'both' }));
    });
    el.querySelectorAll<SVGCircleElement>('.chain-shock').forEach((c) => {
      const at = Number(c.dataset.at ?? 0);
      list.push(c.animate([{ opacity: 0.9, transform: 'scale(0.2)' }, { opacity: 0, transform: 'scale(1.6)' }], { duration: 420, delay: at * LINE_MS + LINE_MS, easing: 'ease-out', fill: 'both' }));
      // 想定外の変化に着いた所で、小さな衝撃の輪と色ずれ
      timers.push(setTimeout(() => fxShock(`chain:${chain.root.text}:${at}`, c.getBoundingClientRect(), true), at * LINE_MS + LINE_MS));
    });
    anims.current = list;
    return () => {
      timers.forEach(clearTimeout);
      list.forEach((a) => a.cancel());
    };
  }, [chain, motion]);
  /** 押すと、線をすべて描き終える */
  const finish = () => anims.current.forEach((a) => a.finish());
  return (
    <section className="chain" data-testid="chain" ref={root} onClick={finish} aria-label="因果の連鎖">
      <div className="section-title">因果の連鎖</div>
      <div className={`chain-node chain-root${chain.root.world ? ' chain-world' : ''}`}>
        <span className="chain-meta">
          {chain.root.world ? '世界が埋めた行' : chain.root.deleted ? '消した一文' : '書いた一文'}
          {chain.root.year !== null && <span className="chain-year">YEAR {chain.root.year}</span>}
        </span>
        <span className="chain-text">{chain.root.text}</span>
      </div>
      {chain.steps.map((s, i) => {
        // 線は、前の箱の側から次の箱の側へ（右・左と交互に並べる）
        const right = i % 2 === 0;
        const d =
          s.kind === 'surprise'
            ? right
              ? 'M 40 0 L 120 12 L 104 20 L 190 32'
              : 'M 250 0 L 170 12 L 186 20 L 100 32'
            : right
              ? 'M 40 0 C 60 24, 140 18, 190 32'
              : 'M 250 0 C 230 24, 150 18, 100 32';
        return (
          <div key={s.n} className={right ? 'chain-step chain-right' : 'chain-step chain-left'}>
            <svg className="chain-line" viewBox="0 0 290 34" preserveAspectRatio="none" aria-hidden="true">
              <path d={d} pathLength={1} className={`chain-path chain-path-${s.kind}`} data-kind={s.kind} />
              {s.kind === 'surprise' && <circle cx={right ? 190 : 100} cy={32} r={9} className="chain-shock" data-at={i} />}
            </svg>
            <div className={`chain-node chain-${s.kind}`} data-testid={`chain-${s.kind}`}>
              <span className="chain-meta">
                <b className="chain-n">{s.n}</b> {KIND_LABEL[s.kind]}
                {s.via && `：${s.via}`}
              </span>
              <span className="chain-text">
                <Icon name={s.icon} size={14} /> {s.text}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
