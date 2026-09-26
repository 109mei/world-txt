import { useEffect, useMemo, useRef } from 'react';
import type { Chain } from '../store/chain';
import { useGame } from '../store/game';
import { fxShock, fxTrail } from './fx';
import type { TrailFrame } from './fx/host';
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

/** 線（SVG の道）の上の点を、道の座標で等間隔に取る */
function pathPoints(p: SVGPathElement): DOMPoint[] | null {
  if (typeof p.getTotalLength !== 'function') return null;
  const len = p.getTotalLength();
  const out: DOMPoint[] = [];
  for (let k = 0; k <= TRAIL_POINTS; k++) {
    const q = p.getPointAtLength((len * k) / TRAIL_POINTS);
    out.push(new DOMPoint(q.x, q.y));
  }
  return out;
}

/** 要素が見えている上下の範囲（画面と、シートの本文の見えている所の重なり）。見えていなければ null */
function clipOf(el: Element): { top: number; bottom: number } | null {
  const body = el.closest('.sheet-body')?.getBoundingClientRect();
  const top = Math.max(0, body?.top ?? 0);
  const bottom = Math.min(window.innerHeight, body?.bottom ?? window.innerHeight);
  const r = el.getBoundingClientRect();
  if (bottom <= top || r.bottom < top || r.top > bottom) return null;
  return { top, bottom };
}

/** 光の粒がたどる道を、いまの画面の座標で返す（シートがせり上がる途中・読み進めたあとも、線に合わせる） */
function trailFrame(p: SVGPathElement, local: readonly DOMPoint[]): TrailFrame | null {
  const m = p.getScreenCTM();
  const clip = clipOf(p);
  if (!m || !clip) return null;
  return {
    points: local.map((q) => {
      const s = q.matrixTransform(m);
      return { x: s.x, y: s.y };
    }),
    ...clip,
  };
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
  // 結果のシートは描き直されるたびに連鎖を作り直すので、中身が同じなら演出をやり直さない（線・音・光の粒が二度走らない）
  const same = useMemo(() => JSON.stringify(chain), [chain]);
  useEffect(() => {
    const el = root.current;
    if (!el || !motion || reducedMotion() || typeof el.animate !== 'function') return;
    const list: Animation[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];
    el.querySelectorAll<SVGPathElement>('.chain-path').forEach((p, i) => {
      list.push(p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: LINE_MS, delay: i * LINE_MS, easing: 'ease-out', fill: 'both' }));
      const surprise = p.dataset.kind === 'surprise';
      // PixiJS の演出：伸びていく線の先を、光の粒がたどる
      const local = pathPoints(p);
      if (local) fxTrail(() => trailFrame(p, local), i * LINE_MS, LINE_MS, surprise);
      timers.push(setTimeout(() => (surprise ? seDissonant() : seString(i + 1)), i * LINE_MS + LINE_MS * 0.8));
    });
    el.querySelectorAll<HTMLElement>('.chain-node').forEach((node, i) => {
      list.push(node.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: Math.max(0, i * LINE_MS - 60), easing: 'ease-out', fill: 'both' }));
    });
    el.querySelectorAll<SVGCircleElement>('.chain-shock').forEach((c) => {
      const at = Number(c.dataset.at ?? 0);
      list.push(c.animate([{ opacity: 0.9, transform: 'scale(0.2)' }, { opacity: 0, transform: 'scale(1.6)' }], { duration: 420, delay: at * LINE_MS + LINE_MS, easing: 'ease-out', fill: 'both' }));
      // 想定外の変化に着いた所で、小さな衝撃の輪と色ずれ（シートの本文の外に隠れていれば出さない）
      timers.push(
        setTimeout(() => {
          const r = c.getBoundingClientRect();
          const clip = clipOf(c);
          const y = r.top + r.height / 2;
          if (clip && y >= clip.top && y <= clip.bottom) fxShock(`chain:${chain.root.text}:${at}`, r, true);
        }, at * LINE_MS + LINE_MS),
      );
    });
    anims.current = list;
    return () => {
      timers.forEach(clearTimeout);
      list.forEach((a) => a.cancel());
    };
  }, [same, motion]);
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
