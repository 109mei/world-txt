import type { Tag } from '../data/schema';
import { checkAll } from './conditions';
import type { GameData, GameState } from './types';

/** 今の世界に付いているタグ（大事な順） */
export function activeTags(g: GameState, data: GameData): Tag[] {
  return data.tags.filter((t) => checkAll(g, t.when)).sort((a, b) => b.priority - a.priority);
}

export interface WorldSummary {
  /** WORLD #0234 の番号 */
  number: string;
  /** 世界の名前（例「眠らない国家なき文明」） */
  title: string;
  tags: Tag[];
  /** 削除して、この世界に存在しないもの */
  missing: string[];
  /** 書き換えた法則と書き足した行の数 */
  edited: number;
  years: number;
  cleared: boolean;
}

export function worldSummary(g: GameState, data: GameData): WorldSummary {
  const tags = activeTags(g, data);
  const words = tags.filter((t) => t.title).slice(0, 2).map((t) => t.title!);
  const noun = g.status === 'failed' ? '世界' : '文明';
  const title = words.length > 0 ? `${words.join('')}${noun}` : `ありふれた${noun}`;
  const missing: string[] = [];
  let edited = 0;
  for (const law of data.laws) {
    const cur = g.laws[law.id];
    if (cur !== law.initial) edited += 1;
    const opt = data.optionOf.get(law.id)?.get(cur ?? '');
    if (opt?.kind === 'delete' && law.noun) missing.push(law.noun);
  }
  return {
    number: String(g.seed % 10000).padStart(4, '0'),
    title,
    tags,
    missing,
    // 書き足した行も、世界の定義を書き換えたものとして数える
    edited: edited + g.extras.length,
    years: g.year,
    cleared: g.status === 'cleared',
  };
}
