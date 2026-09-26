import type { IndicatorId } from '../data/schema';
import type { CauseRef, FailReason, GameData, GameState, HistoryEntry } from './types';

/**
 * 敗因の振り返り（分析の3・12章）：崩れた柱から、世界史に残った原因をさかのぼる。
 * つながりは core が出来事に付けた原因（どの行から来たか・打撃を強めた世界の変化）だけで作り、新しく推測しない。
 * 後知恵にならないよう、分かれ道にはその年に見えていた兆しだけを出す
 */

export interface ReviewItem {
  year: number;
  /** 崩れ・世界の出来事・想定外の変化・分かれ道・書いた一文 */
  kind: 'collapse' | 'event' | 'surprise' | 'branch' | 'wrote';
  text: string;
  why: string | null;
  /** 打撃を強めた世界の変化（つながって） */
  via: string | null;
  /** どこから来た記録か（出来事 e:・副作用 t:・人々の変わり目 h: など） */
  ref: string | null;
  /** 世界が埋めた行（プレイヤーが書いた文ではない） */
  world?: boolean;
}

export interface Review {
  /** 崩れた年・どの線を割ったか・いちばん低い柱 */
  collapse: { year: number; reason: FailReason | null; pillar: IndicatorId | null };
  /** 上から下へ、新しい順にさかのぼる（崩れ → 原因の出来事 → 分かれ道 → 書いた一文） */
  items: ReviewItem[];
  /** 分かれ道の年（原因の壁の兆しが最初に出た年）。出ていなければ null */
  branch: { year: number; sign: string } | null;
  /** 敗因のいちばん上（崩れの直前の原因。なければ null） */
  top: ReviewItem | null;
}

/** 振り返りに並べる出来事の数（崩れと分かれ道と書いた一文のほか） */
const CAUSES = 3;

const causeKey = (c: CauseRef) => `${c.year ?? ''}:${c.text}`;

function fromHistory(h: HistoryEntry): ReviewItem {
  return {
    year: h.year,
    kind: h.kind === 'twist' || h.kind === 'anomaly' ? 'surprise' : 'event',
    text: h.text,
    why: h.why,
    via: h.cause?.via ?? null,
    ref: h.ref ?? null,
  };
}

/** 終わった世界（負けた世界）の振り返り。まだ遊んでいる世界・救った世界は null */
export function reviewOf(g: GameState, data: GameData): Review | null {
  if (g.status !== 'failed') return null;
  const stage = data.stageById.get(g.stageId);
  const pillar = stage ? ([...stage.focus].sort((a, b) => (g.scores[a] ?? 50) - (g.scores[b] ?? 50))[0] ?? null) : null;
  // 崩れる前の、注意と重大の出来事（新しい順）。同じ文は1度だけ
  const seen = new Set<string>();
  const causes: HistoryEntry[] = [];
  for (let i = g.history.length - 1; i >= 0 && causes.length < CAUSES; i--) {
    const h = g.history[i]!;
    if (h.kind === 'end' || h.kind === 'edit' || h.kind === 'start' || h.kind === 'combo') continue;
    if (h.severity === 'info' || seen.has(h.text)) continue;
    seen.add(h.text);
    causes.push(h);
  }
  const items: ReviewItem[] = causes.map(fromHistory);
  // 分かれ道：その年に見えていた兆し
  const wall = g.branch ? data.events.find((e) => e.id === g.branch!.id) : undefined;
  const branch = g.branch && wall ? { year: g.branch.year, sign: wall.sign ?? wall.text } : null;
  if (branch) items.push({ year: branch.year, kind: 'branch', text: branch.sign, why: null, via: null, ref: `e:${wall!.id}` });
  // 書いた一文：原因の出来事に付いていた行（出来事が付けた原因だけ）
  const wrote = new Map<string, CauseRef>();
  for (const h of causes) if (h.cause && !wrote.has(causeKey(h.cause))) wrote.set(causeKey(h.cause), h.cause);
  for (const c of wrote.values()) items.push({ year: c.year ?? 0, kind: 'wrote', text: c.text, why: null, via: null, ref: null, world: c.world });
  // 新しい順に並べる（同じ年は、出来事 → 分かれ道 → 書いた一文）
  const order = { collapse: 0, event: 1, surprise: 1, branch: 2, wrote: 3 } as const;
  items.sort((a, b) => b.year - a.year || order[a.kind] - order[b.kind]);
  const top = causes[0] ? fromHistory(causes[0]) : null;
  return { collapse: { year: g.year, reason: g.failReason, pillar }, items, branch, top };
}
