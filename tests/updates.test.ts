import { describe, expect, it } from 'vitest';
import { gameData } from '../src/data';
import { parseUpdates, UPDATES, unseenUpdates } from '../src/data/updates';
import { EMPTY_PROGRESS, LocalStorageSaveStore, MemorySaveStore, SAVE_KEY, SAVE_VERSION, serialize, DEFAULT_SETTINGS } from '../src/save';
import { GameRuntime } from '../src/store/runtime';

/** 更新のお知らせ：プッシュのたびに src/data/updates.json のいちばん上に1つ足す（CLAUDE.md 作業の進め方） */

class MapStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

const u = (id: string, title = '変わったこと') => ({ id, date: id.slice(0, 10), title, items: ['ひとつ変えた'] });

describe('更新のお知らせ', () => {
  it('お知らせは id が重ならず、新しい順で、id がその日付で始まる。題と1行ずつの変わったことは「。」で終えない（1つの文だけの表示）', () => {
    expect(UPDATES.length).toBeGreaterThan(0);
    for (const x of UPDATES) {
      expect(x.id.startsWith(x.date), x.id).toBe(true);
      expect(x.title.endsWith('。'), x.title).toBe(false);
      for (const item of x.items) expect(item.endsWith('。'), item).toBe(false);
    }
    expect(() => parseUpdates([u('2026-09-27b'), u('2026-09-27a')])).not.toThrow();
    expect(() => parseUpdates([u('2026-09-27a'), u('2026-09-27a')])).toThrow('重なっている');
    expect(() => parseUpdates([u('2026-09-27a'), u('2026-09-28a')])).toThrow('新しい順');
    expect(() => parseUpdates([{ ...u('2026-09-27a'), date: '2026-09-28' }])).toThrow('日付で始まって');
    expect(() => parseUpdates([])).toThrow();
  });

  it('まだ見ていないお知らせ：見ていなければいちばん新しい1つ、前に見たものより新しいもの（多くても3つ）、見たあとはなし', () => {
    const list = parseUpdates([u('2026-10-05a'), u('2026-10-03a'), u('2026-10-01b'), u('2026-10-01a'), u('2026-09-27a')]);
    expect(unseenUpdates(list, null).map((x) => x.id)).toEqual(['2026-10-05a']);
    expect(unseenUpdates(list, '2026-10-05a')).toEqual([]);
    expect(unseenUpdates(list, '2026-10-03a').map((x) => x.id)).toEqual(['2026-10-05a']);
    expect(unseenUpdates(list, '2026-09-27a').map((x) => x.id)).toEqual(['2026-10-05a', '2026-10-03a', '2026-10-01b']);
    // 知らない id（消えたお知らせ）なら、いちばん新しい1つ
    expect(unseenUpdates(list, '2026-01-01a').map((x) => x.id)).toEqual(['2026-10-05a']);
  });

  it('はじめて遊ぶ人には出さず、前に遊んだ人には1度だけ出す。見たら出さない。記録を消しても見たまま', async () => {
    const fresh = new GameRuntime({ data: gameData, store: new MemorySaveStore(), now: () => 1, newSeed: () => 1 });
    await fresh.boot();
    expect(fresh.unseenUpdates).toEqual([]);

    // 前に遊んだ人のセーブ（まだお知らせを見ていない）
    const storage = new MapStorage();
    storage.setItem(SAVE_KEY, serialize({ saveVersion: SAVE_VERSION, savedAt: 1, settings: { ...DEFAULT_SETTINGS }, progress: { ...structuredClone(EMPTY_PROGRESS), worlds: 3 }, current: null }));
    const rt = new GameRuntime({ data: gameData, store: new LocalStorageSaveStore(storage), now: () => 1, newSeed: () => 1 });
    await rt.boot();
    expect(rt.unseenUpdates.map((x) => x.id)).toEqual([UPDATES[0]!.id]);
    rt.markUpdatesSeen();
    expect(rt.unseenUpdates).toEqual([]);
    await rt.resetRecords();
    expect(rt.unseenUpdates).toEqual([]);
    // 読み直しても見たまま
    const again = new GameRuntime({ data: gameData, store: new LocalStorageSaveStore(storage), now: () => 2, newSeed: () => 1 });
    await again.boot();
    expect(again.unseenUpdates).toEqual([]);
  });

  it('始め直す前のセーブを消した人（前に遊んだ人）には、いちばん新しいお知らせを出す', async () => {
    const storage = new MapStorage();
    storage.setItem(SAVE_KEY, JSON.stringify({ saveVersion: 6, savedAt: 1, settings: {}, progress: {}, current: null }));
    const rt = new GameRuntime({ data: gameData, store: new LocalStorageSaveStore(storage), now: () => 1, newSeed: () => 1 });
    await rt.boot();
    expect(rt.unseenUpdates.map((x) => x.id)).toEqual([UPDATES[0]!.id]);
  });
});
