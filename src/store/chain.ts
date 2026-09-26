import type { CauseRef, NewsItem, StepReport } from '../core';
import type { IconKey } from '../data/schema';

/**
 * 因果の連鎖（P8・画面設計の「5 因果の連鎖」）：書いた一文から、その年に効いた変化へ光の線を順に伸ばす。
 * つなぐのは、core が知らせに付けた原因（どの行から来たか・打撃を強めた世界の変化）だけで、画面の側で新しく推測しない
 */

export interface ChainStep {
  n: number;
  /** 直接（書いた一文が効き始めた）・つながって（世界の変化を通って）・想定外（副作用・異常） */
  kind: 'direct' | 'via' | 'surprise';
  icon: IconKey;
  text: string;
  /** つながってきた世界の変化（「農業の縮小」） */
  via: string | null;
}

export interface Chain {
  /** 書いた一文（世界が埋めた行なら world） */
  root: { text: string; year: number | null; deleted: boolean; world: boolean };
  steps: ChainStep[];
}

/** 線を伸ばす変化の数（最大） */
export const CHAIN_MAX = 6;

const keyOf = (c: CauseRef) => `${c.year ?? ''}:${c.text}`;

/** その年の知らせから、いちばん多くの変化につながった一文の連鎖を作る（つながった変化がなければ null） */
export function chainOf(report: StepReport | null): Chain | null {
  if (!report) return null;
  const withCause = report.news.filter((n): n is NewsItem & { cause: CauseRef } => !!n.cause);
  if (withCause.length === 0) return null;
  // いちばん多くの変化につながった一文（同じなら、先に知らせた一文）
  const count = new Map<string, number>();
  for (const n of withCause) count.set(keyOf(n.cause), (count.get(keyOf(n.cause)) ?? 0) + 1);
  const best = [...count.entries()].sort((a, b) => b[1] - a[1])[0]![0];
  const mine = withCause.filter((n) => keyOf(n.cause) === best);
  const cause = mine[0]!.cause;
  // 直接 → つながって → 想定外 の順に並べる（同じ種類の中は、知らせた順）
  const kindOf = (n: NewsItem & { cause: CauseRef }): ChainStep['kind'] => (n.surprise && !n.onset ? 'surprise' : n.cause.via ? 'via' : 'direct');
  const order = { direct: 0, via: 1, surprise: 2 } as const;
  const seen = new Set<string>();
  const steps = mine
    .filter((n) => (seen.has(n.text) ? false : (seen.add(n.text), true)))
    .map((n) => ({ kind: kindOf(n), icon: n.icon, text: n.text, via: n.cause.via ?? null }))
    .sort((a, b) => order[a.kind] - order[b.kind])
    .slice(0, CHAIN_MAX)
    .map((s, i) => ({ ...s, n: i + 1 }));
  return { root: { text: cause.text, year: cause.year, deleted: cause.deleted, world: !!cause.world }, steps };
}
