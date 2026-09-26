import { DataError } from './index';
import { UpdatesSchema, type Update } from './schema';
import updatesRaw from './updates.json';

/**
 * 更新のお知らせ（新しい順）。プッシュのたびに、いちばん上に1つ足す（CLAUDE.md 作業の進め方）。
 * id が重ならず、日付が新しい順で、id がその日付で始まることを確かめる
 */
export function parseUpdates(raw: unknown): Update[] {
  const list = UpdatesSchema.parse(raw);
  const seen = new Set<string>();
  list.forEach((u, i) => {
    if (seen.has(u.id)) throw new DataError(`更新のお知らせの id が重なっている: ${u.id}`);
    seen.add(u.id);
    if (!u.id.startsWith(u.date)) throw new DataError(`更新のお知らせの id が日付で始まっていない: ${u.id}`);
    const next = list[i + 1];
    if (next && next.id > u.id) throw new DataError(`更新のお知らせは新しい順に並べる: ${u.id} のあとに ${next.id}`);
  });
  return list;
}

export const UPDATES: readonly Update[] = parseUpdates(updatesRaw);

/** まだ見ていない更新のお知らせ（seen は最後に見たお知らせの id。知らない id・まだ見ていなければ、いちばん新しい1つ）。多くても3つ */
export function unseenUpdates(updates: readonly Update[], seen: string | null): Update[] {
  if (updates.length === 0 || seen === updates[0]!.id) return [];
  const at = seen === null ? -1 : updates.findIndex((u) => u.id === seen);
  return updates.slice(0, at < 0 ? 1 : Math.min(at, 3));
}
