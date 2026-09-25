import { rankOf, type GameData } from '../core';
import type { IconKey } from '../data/schema';

/** 筆の位の写し（ステージを選ぶ画面・結果の画面・定義のタブで見せる） */
export interface PenView {
  rank: number;
  /** 位の名前（見習いの筆 など） */
  name: string;
  /** その位で書ける物（暮らしのこと・時間と体のこと など） */
  reach: string;
  /** 書き足せる行の数（null なら容量の許すかぎり） */
  margin: number | null;
  /** 開いている分野 */
  realms: { id: string; name: string; icon: IconKey }[];
  /** 最後の位（すべて自由） */
  free: boolean;
  /** 次の位：名前・あといくつの世界を救えばよいか・広がるもの（最後の位なら null） */
  next: { name: string; left: number; gains: string[] } | null;
}

/** その位で、ひとつ前の位より広がるもの（「『社会』の行が開く」「書き足せる行が3つになる」「時間と体のことまで書ける」） */
export function gainsOf(data: GameData, rank: number): string[] {
  const cur = data.access.ranks[rank];
  const prev = data.access.ranks[rank - 1];
  if (!cur || !prev) return [];
  const out: string[] = [];
  const opened = cur.realms.filter((r) => !prev.realms.includes(r)).map((id) => data.access.realms.find((x) => x.id === id)?.name ?? id);
  if (opened.length > 0) out.push(`「${opened.join('」「')}」の行が開く`);
  if (cur.margin !== prev.margin) out.push(cur.margin === null ? '書き足せる行に限りがなくなる' : `書き足せる行が${cur.margin}つになる`);
  if (cur.depth !== prev.depth) out.push(cur.depth === null ? '世界そのものまで、何でも書ける' : `${cur.reach}まで書ける`);
  return out;
}

/** 救った世界の数から、筆の位の写しを作る */
export function penOf(data: GameData, clears: number): PenView {
  const rank = rankOf(data, clears);
  const def = data.access.ranks[rank]!;
  const next = data.access.ranks[rank + 1];
  return {
    rank,
    name: def.name,
    reach: def.reach,
    margin: def.margin,
    realms: def.realms.map((id) => {
      const r = data.access.realms.find((x) => x.id === id)!;
      return { id, name: r.name, icon: r.icon };
    }),
    free: !next,
    next: next ? { name: next.name, left: Math.max(0, next.clears - clears), gains: gainsOf(data, rank + 1) } : null,
  };
}
