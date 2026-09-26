import { describe, expect, it } from 'vitest';
import { addLine, advance, createGame, rewriteLaw } from '../src/core';
import { gameData } from '../src/data';
import {
  DEFAULT_SETTINGS,
  deserialize,
  EMPTY_PROGRESS,
  exportText,
  importText,
  LocalStorageSaveStore,
  MAX_SAVE_CHARS,
  MemorySaveStore,
  migrate,
  OldSaveError,
  SAVE_KEY,
  SAVE_VERSION,
  SaveFormatError,
  SaveWriteError,
  serialize,
  type KeyValueStorage,
  type SaveData,
  type SaveStore,
} from '../src/save';
import { ENDLESS_POLICIES } from '../scripts/endless';
import { GameRuntime, LOAD_DROPPED, LOAD_RESET, SAVE_FAILED, SAVE_VOLATILE } from '../src/store/runtime';
import type { StageId } from '../src/data/schema';
import { UPDATES } from '../src/data/updates';
import { insertRun, rankTitle, RANKING_SIZE, type RankRun } from '../src/store/ranking';

function sample(): SaveData {
  const g = createGame(gameData, 'climate', 99);
  rewriteLaw(g, gameData, 'co2_heat', '二酸化炭素は熱を少し弱く閉じ込める。');
  addLine(g, gameData, '人間は肉を食べない。');
  advance(g, gameData, 3);
  return { saveVersion: SAVE_VERSION, savedAt: 1, settings: { ...DEFAULT_SETTINGS }, progress: structuredClone(EMPTY_PROGRESS), current: g };
}

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

describe('セーブ', () => {
  it('保存して読み込んでも中身が変わらない（書き換えた文章と書き足した行も）', async () => {
    const data = sample();
    const store = new LocalStorageSaveStore(new MapStorage());
    await store.save(data);
    const back = await store.load();
    expect(back).toEqual(data);
    expect(back!.current!.texts.co2_heat).toBe('二酸化炭素は熱を少し弱く閉じ込める。');
    expect(back!.current!.carried[back!.current!.extras[0]!.id]!.phrases).toEqual(['vegetarian']);
  });

  it('読み込んだ世界をそのまま進めても、保存しなかった世界と同じ結果になる', () => {
    const a = sample();
    const b = deserialize(serialize(a));
    advance(a.current!, gameData, 10);
    advance(b.current!, gameData, 10);
    expect(b.current).toEqual(a.current);
  });

  it('文字の大きさと効果音の音量がない古い設定も読め、既定の値（中・既定の音量）で補う', () => {
    const data = sample() as unknown as { settings: Record<string, unknown> };
    delete data.settings.textSize;
    delete data.settings.seVolume;
    const back = deserialize(JSON.stringify(data));
    expect(back.settings.textSize).toBe('medium');
    expect(back.settings.seVolume).toBe(DEFAULT_SETTINGS.seVolume);
  });

  it('設定に読めない値（知らない選び方・範囲の外・null）があっても、その項目だけ既定の値にして、記録は読む', () => {
    const data = sample() as unknown as { settings: Record<string, unknown>; progress: { worlds: number } };
    data.progress.worlds = 5;
    Object.assign(data.settings, { textSize: 'xl', seVolume: 1.2, volume: null, theme: 'sepia', bgm: 'はい' });
    const back = deserialize(JSON.stringify(data));
    expect(back.progress.worlds).toBe(5);
    expect(back.settings.textSize).toBe('medium');
    expect(back.settings.seVolume).toBe(DEFAULT_SETTINGS.seVolume);
    expect(back.settings.volume).toBe(DEFAULT_SETTINGS.volume);
    expect(back.settings.theme).toBe('auto');
    expect(back.settings.bgm).toBe(true);
    // 設定そのものが読めなくても、既定の設定で読む
    const bare = sample() as unknown as { settings: unknown };
    bare.settings = null;
    expect(deserialize(JSON.stringify(bare)).settings).toEqual(DEFAULT_SETTINGS);
  });

  it('2回目に壊れたセーブも残し（はじめに壊れたものは残したまま）、すべて消すと控えも消える', async () => {
    const storage = new MapStorage();
    const store = new LocalStorageSaveStore(storage);
    storage.setItem(SAVE_KEY, '{こわれた1');
    await expect(store.load()).rejects.toThrow(SaveFormatError);
    storage.setItem(SAVE_KEY, '{こわれた2');
    await expect(store.load()).rejects.toThrow(SaveFormatError);
    expect(storage.getItem(`${SAVE_KEY}.broken`)).toBe('{こわれた1');
    expect(storage.getItem(`${SAVE_KEY}.broken2`)).toBe('{こわれた2');
    await store.save(sample());
    await store.save(sample());
    await store.clear();
    for (const k of [SAVE_KEY, `${SAVE_KEY}.prev`, `${SAVE_KEY}.broken`, `${SAVE_KEY}.broken2`]) expect(storage.getItem(k), k).toBeNull();
  });

  it('すべての記録を消すと、進み具合・観測記録・実績・遊んでいる世界と控えが消え、設定は残る', async () => {
    const storage = new MapStorage();
    const store = new LocalStorageSaveStore(storage as unknown as KeyValueStorage);
    const rt = new GameRuntime({ data: gameData, store, now: () => 1, newSeed: () => 1 });
    await rt.boot();
    rt.settings = { ...rt.settings, theme: 'dark', textSize: 'large', seVolume: 0.3 };
    rt.start('food');
    rt.progress.cleared.push('food');
    rt.progress.discovered.push('e:famine');
    rt.progress.achievements.push('first_line');
    await rt.save();
    await rt.save();
    await rt.resetRecords();
    expect(rt.state).toBeNull();
    // 見た更新のお知らせだけは、記録を消しても残す（同じお知らせを、もう一度出さない）
    expect(rt.progress).toEqual({ ...EMPTY_PROGRESS, seenUpdate: UPDATES[0]!.id });
    expect(rt.settings.theme).toBe('dark');
    expect(rt.settings.textSize).toBe('large');
    // 読み直しても、記録は空で、設定は残っている
    const again = new GameRuntime({ data: gameData, store, now: () => 2, newSeed: () => 1 });
    await again.boot();
    expect(again.state).toBeNull();
    expect(again.progress.cleared).toEqual([]);
    expect(again.progress.discovered).toEqual([]);
    expect(again.settings.seVolume).toBe(0.3);
  });

  it('無限の世界の途中（危機の知らせのあと）でも、保存して読み込めば同じ結果になる', () => {
    const g = createGame(gameData, 'endless', 5);
    // 重大な出来事の年には時間が止まるので、危機が知らされるまで1年ずつ進める
    while (!g.crisis && g.status === 'playing') advance(g, gameData, 1);
    expect(g.crisis).not.toBeNull();
    const data: SaveData = { saveVersion: SAVE_VERSION, savedAt: 1, settings: { ...DEFAULT_SETTINGS }, progress: structuredClone(EMPTY_PROGRESS), current: g };
    const back = deserialize(serialize(data));
    advance(g, gameData, 8);
    advance(back.current!, gameData, 8);
    expect(back.current).toEqual(g);
  });

  it('遊んでいた世界だけが壊れていたら、その世界だけを手放し、設定と記録は残す', async () => {
    const data = sample();
    data.progress.worlds = 7;
    const broken = JSON.parse(serialize(data));
    broken.current.sim = 'こわれた';
    const storage = new MapStorage();
    storage.setItem('world-txt/save', JSON.stringify(broken));
    const store = new LocalStorageSaveStore(storage);
    const back = await store.load();
    expect(back!.current).toBeNull();
    expect(back!.droppedCurrent).toBe(true);
    expect(back!.progress.worlds).toBe(7);
    // 元の形は別に残り、保存し直しても「手放した」という印は入らない
    expect(storage.getItem('world-txt/save.broken')).toBe(JSON.stringify(broken));
    await store.save(back!);
    expect(JSON.parse(storage.getItem('world-txt/save')!).droppedCurrent).toBeUndefined();
  });

  it('読めないセーブは、上書きされる前に別の場所へ残す', async () => {
    const storage = new MapStorage();
    storage.setItem('world-txt/save', '{こわれている');
    const store = new LocalStorageSaveStore(storage);
    await expect(store.load()).rejects.toThrow(SaveFormatError);
    expect(storage.getItem('world-txt/save.broken')).toBe('{こわれている');
  });

  it('セーブの形でない文字は、読み込まない', () => {
    expect(() => importText('こんにちは')).toThrow(SaveFormatError);
    expect(() => importText('WTXT1.!!!')).toThrow(SaveFormatError);
  });

  it('新しすぎる版と壊れたセーブは読まない', () => {
    expect(() => migrate({ ...sample(), saveVersion: SAVE_VERSION + 1 })).toThrow(SaveFormatError);
    expect(() => deserialize('{')).toThrow(SaveFormatError);
    expect(() => migrate({ saveVersion: SAVE_VERSION, settings: {} })).toThrow(SaveFormatError);
  });

  it('書き出したテキストを読み込むと元に戻る', () => {
    const data = sample();
    const text = exportText(data);
    expect(text.startsWith('WTXT1.')).toBe(true);
    expect(importText(text)).toEqual(data);
    expect(importText(`  ${text}\n`)).toEqual(data);
  });
});

describe('始め直したセーブ（版7から）', () => {
  it('始め直す前の版（版6まで・版のないもの）のセーブは読まない（書き出したテキストも）', () => {
    const now = JSON.parse(serialize(sample()));
    for (const v of [undefined, 0, 1, 5, 6]) expect(() => migrate({ ...now, saveVersion: v })).toThrow(OldSaveError);
    expect(() => importText(JSON.stringify({ ...now, saveVersion: 6 }))).toThrow('始め直す前の版');
    expect(() => importText(exportText({ ...sample(), saveVersion: 6 }))).toThrow(OldSaveError);
    expect(migrate(now).saveVersion).toBe(SAVE_VERSION);
  });

  it('セーブの形でない JSON（{} など）は読み込まない（今の記録を上書きしない）', () => {
    for (const s of ['{}', '{"hello":"world"}', '{"saveVersion":7}', '{"saveVersion":7,"__proto__":{"x":1}}', '[]']) expect(() => importText(s), s).toThrow(SaveFormatError);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });

  it('端末に残っていた始め直す前のセーブは、控えも壊れたときの控えも消して、はじめから始める（タイトルで知らせる）', async () => {
    const storage = new MapStorage();
    const old = JSON.stringify({ ...JSON.parse(serialize(sample())), saveVersion: 6 });
    for (const k of [SAVE_KEY, `${SAVE_KEY}.prev`, `${SAVE_KEY}.broken`, `${SAVE_KEY}.broken2`]) storage.setItem(k, old);
    const rt = new GameRuntime({ data: gameData, store: new LocalStorageSaveStore(storage), now: () => 1, newSeed: () => 1 });
    await rt.boot();
    expect(rt.loadError).toBe(LOAD_RESET);
    expect(rt.state).toBeNull();
    expect(rt.progress).toEqual(EMPTY_PROGRESS);
    for (const k of [SAVE_KEY, `${SAVE_KEY}.prev`, `${SAVE_KEY}.broken`, `${SAVE_KEY}.broken2`]) expect(storage.getItem(k)).toBeNull();
    // 最新がなく、控えだけが始め直す前の版なら、その控えを消す
    const only = new MapStorage();
    only.setItem(`${SAVE_KEY}.prev`, old);
    expect(await new LocalStorageSaveStore(only).load()).toBeNull();
    expect(only.getItem(`${SAVE_KEY}.prev`)).toBeNull();
  });

  it('どのステージの世界も、遊んだあと保存して読み込むと中身が変わらない（形の確かめで手放さない）', () => {
    const stages: StageId[] = ['prologue', 'food', 'plague', 'climate', 'war', 'energy', 'tiny', 'loop', 'endless'];
    for (const stage of stages) {
      const g = createGame(gameData, stage, 11);
      addLine(g, gameData, '人間は空を飛べる。');
      advance(g, gameData, stage === 'loop' ? 25 : 12);
      const back = deserialize(serialize({ saveVersion: SAVE_VERSION, savedAt: 1, settings: { ...DEFAULT_SETTINGS }, progress: structuredClone(EMPTY_PROGRESS), current: g }));
      expect(back.droppedCurrent, stage).toBeFalsy();
      expect(back.current, stage).toEqual(JSON.parse(JSON.stringify(g)));
    }
  });

  it('壊れた去年の結果の写しは捨てて、世界はそのまま遊べる', () => {
    const raw = JSON.parse(serialize(sample()));
    raw.current.report = { from: 0, to: 1, news: [null] };
    const back = deserialize(JSON.stringify(raw));
    expect(back.droppedCurrent).toBeFalsy();
    expect(back.current!.report).toBeNull();
    expect(() => advance(back.current!, gameData, 2)).not.toThrow();
  });

  it('くり返しの控え・曲線・書き足した行の名前・効き目の数が壊れたセーブは、その世界だけを手放す', () => {
    const g = createGame(gameData, 'loop', 7);
    advance(g, gameData, 2);
    expect(g.loop).not.toBeNull();
    const text = serialize({ saveVersion: SAVE_VERSION, savedAt: 1, settings: { ...DEFAULT_SETTINGS }, progress: structuredClone(EMPTY_PROGRESS), current: g });
    const broken = (f: (c: Record<string, any>) => void) => {
      const r = JSON.parse(text);
      f(r.current);
      return deserialize(JSON.stringify(r));
    };
    expect(deserialize(text).droppedCurrent).toBeFalsy();
    expect(broken((c) => delete c.loop.snapshot.effects).droppedCurrent).toBe(true);
    expect(broken((c) => delete c.loop.snapshot.sim.trust).droppedCurrent).toBe(true);
    expect(broken((c) => delete c.trace.laps).droppedCurrent).toBe(true);
    // 書き足した行の id は x と番号だけ（hasOwnProperty などは、行の意味を引くときにオブジェクトの仕組みと取り違える）
    expect(broken((c) => (c.extras = [{ id: 'hasOwnProperty', text: '人は歌う。', year: 0 }])).droppedCurrent).toBe(true);
    expect(broken((c) => (c.effects = Array.from({ length: 600 }, () => ({ source: 'e:x', mods: {}, remaining: 1 })))).droppedCurrent).toBe(true);
  });

  it('形は正しいのに世界を組み立てられないセーブは、元のセーブを別に残し、その世界だけを手放す（記録は残る）', async () => {
    const good = sample();
    good.progress.worlds = 42;
    const broken = { ...good, current: { ...good.current!, extras: null } } as unknown as SaveData;
    let kept = 0;
    const store: SaveStore = {
      persistent: true,
      load: async () => broken,
      save: async () => {},
      clear: async () => {},
      keepAside: () => {
        kept += 1;
      },
    };
    const rt = new GameRuntime({ data: gameData, store, now: () => 1, newSeed: () => 1 });
    await rt.boot();
    expect(kept).toBe(1);
    expect(rt.state).toBeNull();
    expect(rt.progress.worlds).toBe(42);
    expect(rt.loadError).toBe(LOAD_DROPPED);
  });

  it('画面に出せなかった世界は、元のセーブを別に残してから手放す（まっ白な画面にしない）', async () => {
    const storage = new MapStorage();
    const rt = new GameRuntime({ data: gameData, store: new LocalStorageSaveStore(storage), now: () => 1, newSeed: () => 1 });
    await rt.boot();
    rt.start('food');
    await rt.save();
    const before = storage.getItem(SAVE_KEY);
    rt.dropBrokenWorld();
    expect(rt.state).toBeNull();
    expect(rt.loadError).toBe(LOAD_DROPPED);
    expect(storage.getItem(`${SAVE_KEY}.broken`)).toBe(before);
  });
});

describe('無限の世界の記録簿（ランキング）', () => {
  const run = (years: number, at: number, extra: Partial<RankRun> = {}): RankRun => ({ years, daily: null, at, title: '', ending: null, edits: 0, averted: 0, ...extra });

  it('長く続いた順に並べ、同じ年数なら防いだ危機の多い順、書き換えの少ない順、先に記録した順', () => {
    let list: RankRun[] = [];
    for (const r of [run(40, 1), run(90, 2), run(40, 3, { averted: 2 }), run(40, 4, { edits: 3 }), run(40, 5)]) list = insertRun(list, r).list;
    expect(list.map((r) => r.at)).toEqual([2, 3, 1, 5, 4]);
  });

  it('上位だけを残し、何位に入ったか（入らなければ null）を返す', () => {
    let list: RankRun[] = [];
    for (let i = 0; i < RANKING_SIZE; i += 1) list = insertRun(list, run(100 + i, i)).list;
    expect(insertRun(list, run(50, 99)).rank).toBeNull();
    const top = insertRun(list, run(500, 100));
    expect(top.rank).toBe(1);
    expect(top.list).toHaveLength(RANKING_SIZE);
    expect(top.list.some((r) => r.years === 100)).toBe(false);
  });

  it('年数に応じた称号がつく', () => {
    expect(rankTitle(gameData, 0)).toBe(gameData.indicators.ranks[0]![1]);
    const [min, name] = gameData.indicators.ranks[gameData.indicators.ranks.length - 1]!;
    expect(rankTitle(gameData, min + 1)).toBe(name);
  });
});

/** 入れられる文字数に上限のある入れ物（端末の保存領域の空きが少ないとき） */
class QuotaStorage implements KeyValueStorage {
  private m = new Map<string, string>();
  constructor(public limit: number) {}
  private used(except: string): number {
    let n = 0;
    for (const [k, v] of this.m) if (k !== except) n += k.length + v.length;
    return n;
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.used(k) + k.length + v.length > this.limit) throw new DOMException('いっぱい', 'QuotaExceededError');
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

describe('長く遊んでも壊れないセーブ', () => {
  it('ひとつ前のセーブを控えに残し、最新のセーブが壊れていたら控えから読む', async () => {
    const storage = new MapStorage();
    const store = new LocalStorageSaveStore(storage);
    const a = sample();
    const b = sample();
    b.progress.worlds = 5;
    await store.save(a);
    await store.save(b);
    expect(storage.getItem(`${SAVE_KEY}.prev`)).toBe(serialize(a));
    // 最新のセーブが壊れた
    storage.setItem(SAVE_KEY, '{こわれた');
    const back = await new LocalStorageSaveStore(storage).load();
    expect(back!.restored).toBe(true);
    expect(back!.progress.worlds).toBe(a.progress.worlds);
    expect(back!.current).toEqual(a.current);
    // 壊れたセーブは消さずに残る
    expect(storage.getItem(`${SAVE_KEY}.broken`)).toBe('{こわれた');
  });

  it('遊んでいた世界だけが壊れていたら、ひとつ前のセーブの無事な世界を使う', async () => {
    const storage = new MapStorage();
    const store = new LocalStorageSaveStore(storage);
    await store.save(sample());
    const b = sample();
    b.progress.worlds = 3;
    await store.save(b);
    const broken = JSON.parse(serialize(b));
    broken.current.sim = 'こわれた';
    storage.setItem(SAVE_KEY, JSON.stringify(broken));
    const back = await new LocalStorageSaveStore(storage).load();
    expect(back!.restored).toBe(true);
    expect(back!.current).not.toBeNull();
  });

  it('空きが足りないときは、控えを空けてから保存し直す。それでも足りなければ、保存できなかったと伝える', async () => {
    const one = serialize(sample()).length;
    // 最新のセーブと、壊れたセーブの控えで、いっぱいに近い
    const storage = new QuotaStorage(Math.floor(one * 2.5));
    storage.setItem(`${SAVE_KEY}.broken`, 'x'.repeat(Math.floor(one * 0.9)));
    const store = new LocalStorageSaveStore(storage);
    await store.save(sample());
    const b = sample();
    b.progress.worlds = 2;
    await store.save(b);
    // 最新のセーブは書けている（空きを作るため、控えを持たないこともある）
    expect(JSON.parse(storage.getItem(SAVE_KEY)!).progress.worlds).toBe(2);
    // それでも足りないほど小さい入れ物
    storage.limit = 10;
    await expect(store.save(sample())).rejects.toThrow(SaveWriteError);
  });

  it('保存できなかったら画面に知らせ、次に保存できたら知らせを消す。保存できない画面なら、はじめに知らせる', async () => {
    let fail = true;
    const seen: (string | null)[] = [];
    const store: SaveStore = {
      persistent: true,
      load: async () => null,
      save: async () => {
        if (fail) throw new SaveWriteError('いっぱい');
      },
      clear: async () => undefined,
    };
    const rt = new GameRuntime({ data: gameData, store, now: () => 1, newSeed: () => 1, onSaveStatus: (w) => seen.push(w) });
    await rt.boot();
    rt.start('food');
    await rt.save();
    expect(rt.saveWarning).toBe(SAVE_FAILED);
    fail = false;
    await rt.save();
    expect(rt.saveWarning).toBeNull();
    expect(seen).toEqual([SAVE_FAILED, null]);

    const volatile = new GameRuntime({ data: gameData, store: new MemorySaveStore(), now: () => 1, newSeed: () => 1 });
    await volatile.boot();
    expect(volatile.saveWarning).toBe(SAVE_VOLATILE);
  });

  it('よそで作られた大きすぎるセーブや、仕組みに触れる鍵（__proto__）を含むセーブを読んでも、害がない', () => {
    expect(() => importText(`WTXT1.${'A'.repeat(MAX_SAVE_CHARS * 2 + 10)}`)).toThrow(SaveFormatError);
    expect(() => deserialize(`{"x":"${'a'.repeat(MAX_SAVE_CHARS)}"}`)).toThrow(SaveFormatError);
    const text = serialize(sample()).replace('"progress":{', '"progress":{"__proto__":{"polluted":true},');
    const back = deserialize(text);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(back.progress)).toBe(Object.prototype);
    expect((back.progress as unknown as Record<string, unknown>).polluted).toBeUndefined();
    // 画面が固まるほど長い文の入った世界は、その世界だけを手放す
    const long = JSON.parse(serialize(sample()));
    long.current.texts.human_food = 'あ'.repeat(10_000);
    expect(migrate(long).droppedCurrent).toBe(true);
  });

  it('長く続いた無限の世界でも、何百もの世界を遊んでも、セーブは小さいまま（端末の保存領域の約5MBよりずっと小さい）', async () => {
    const reactive = ENDLESS_POLICIES.find((p) => p.name === 'reactive')!;
    const g = reactive.play(gameData, 3);
    expect(g.year).toBeGreaterThan(60);
    const one = serialize({ saveVersion: SAVE_VERSION, savedAt: 1, settings: { ...DEFAULT_SETTINGS }, progress: structuredClone(EMPTY_PROGRESS), current: g });
    expect(one.length).toBeLessThan(150_000);
    expect(deserialize(one).current).toEqual(JSON.parse(JSON.stringify(g)));

    const store = new MemorySaveStore();
    let seed = 1;
    const rt = new GameRuntime({ data: gameData, store, now: () => 1_700_000_000_000 + seed * 1000, newSeed: () => seed++ });
    await rt.boot();
    const stages = gameData.stages.map((s) => s.id);
    for (let w = 0; w < 120; w += 1) {
      rt.start(stages[w % stages.length]!);
      for (let i = 0; rt.state && rt.state.status === 'playing' && rt.state.year < 200; i += 1) {
        if (i % 9 === 0) rt.write({ kind: 'new' }, ['人は他人の幸せを求める。', 'ポポポ。', '隕石は地球に落ちない。'][w % 3]!);
        rt.advance(1);
      }
    }
    const text = serialize(rt.snapshot());
    expect(text.length).toBeLessThan(200_000);
    expect(deserialize(text).progress).toEqual(rt.progress);
  });
});
