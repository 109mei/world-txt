import type { CSSProperties, ReactNode } from 'react';
import type { SceneMotif } from '../../data/schema';
import type { SceneView } from '../../store/scene';

/** 情景の大きさと、地面の高さ */
export const W = 390;
export const H = 220;
/** 遠い山と海の水平線 */
export const HORIZON = 150;
/** 町の塔の根元 */
export const GROUND = 172;
/** 人々の立つ広場 */
export const PLAZA = 194;
/** 車の走る道 */
export const ROAD = 207;
/** 海の始まる岸（ここより右が海） */
export const SHORE = 284;

export const SILVER = 'rgba(216,219,226,0.62)';
export const SILVER_DIM = 'rgba(216,219,226,0.32)';
export const SILVER_FAINT = 'rgba(216,219,226,0.16)';
export const PAPER = '#eceae4';
export const DARK = '#101116';
export const INK = 'var(--ink)';
export const BAD = 'var(--bad)';
export const WARN = 'var(--warn)';
export const GOOD = 'var(--good)';

/** 世界ごとに決まる、0〜1 の数（同じ世界なら同じ景色） */
export function rnd(seed: number, i: number): number {
  let t = (seed * 2654435761 + i * 40503 + 0x9e3779b9) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** 描く要素の強さ（なければ 0） */
export function m(v: SceneView, id: SceneMotif): number {
  return v.motifs[id] ?? 0;
}

/** 書き換えから来た要素はインク、それ以外は銀 */
export function strokeOf(v: SceneView, id: SceneMotif, base = SILVER): string {
  return v.inked.includes(id) ? INK : base;
}

/** この年に新しく描かれた要素は、インクがにじむように現れる */
export function Motif({ v, id, children, style, className }: { v: SceneView; id: SceneMotif; children: ReactNode; style?: CSSProperties; className?: string }) {
  const cls = [v.fresh.includes(id) ? 'sc-appear' : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <g className={cls || undefined} data-motif={id} style={style}>
      {children}
    </g>
  );
}

/** アニメーションの長さ（時間の流れが速い世界では短く） */
export function dur(seconds: number): CSSProperties {
  return {
    animationDuration: `calc(${seconds}s * var(--sc-speed, 1))`,
  } as CSSProperties;
}

export function delay(seconds: number): CSSProperties {
  return { animationDelay: `${-seconds}s` };
}
