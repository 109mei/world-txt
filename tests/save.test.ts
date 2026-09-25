import { describe, expect, it } from 'vitest';
import { addLine, advance, createGame, rewriteLaw, upgradeState } from '../src/core';
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
import { GameRuntime, SAVE_FAILED, SAVE_VOLATILE } from '../src/store/runtime';
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

  it('古い版（版 0：設定と進み具合がない）のセーブも読める', () => {
    const old = { current: null };
    const up = migrate(old);
    expect(up.saveVersion).toBe(SAVE_VERSION);
    expect(up.settings).toEqual(DEFAULT_SETTINGS);
    expect(up.progress.worlds).toBe(0);
  });

  it('版 1（観測記録がない）のセーブも読め、遊んでいた世界で見つけたものが観測記録に入る', () => {
    const now = sample();
    const found = [...now.current!.found];
    expect(found.length).toBeGreaterThan(0);
    // 版 1 の形：progress.discovered も current.found もない
    const old = JSON.parse(JSON.stringify(now));
    old.saveVersion = 1;
    delete old.progress.discovered;
    const keep = old.current.found;
    delete old.current.found;
    const up = migrate(old);
    expect(up.saveVersion).toBe(SAVE_VERSION);
    expect(up.progress.discovered).toEqual([]);
    expect(up.current!.found).toEqual([]);
    // 観測記録を持っていた版 1 の世界なら、その分は記録に入る
    old.current.found = keep;
    expect(migrate(old).progress.discovered).toEqual(found);
  });

  it('版 2（無限の世界の記録と危機の項目がない）のセーブも読め、足りない項目が補われる', () => {
    const now = sample();
    const old = JSON.parse(JSON.stringify(now));
    old.saveVersion = 2;
    delete old.progress.endless;
    delete old.current.crisis;
    delete old.current.nextCrisis;
    delete old.current.crises;
    delete old.current.daily;
    old.current.schema = 3;
    const up = migrate(old);
    expect(up.saveVersion).toBe(SAVE_VERSION);
    expect(up.progress.endless).toEqual([]);
    expect(up.current!.crisis).toBeNull();
    expect(up.current!.nextCrisis).toBe(-1);
    expect(up.current!.crises).toEqual({ averted: 0, softened: 0, struck: 0 });
    expect(up.current!.daily).toBeNull();
    // 読み込んだ世界は、そのまま進められる
    expect(() => advance(up.current!, gameData, 2)).not.toThrow();
  });

  it('無限の世界の途中（危機の知らせのあと）でも、保存して読み込めば同じ結果になる', () => {
    const g = createGame(gameData, 'endless', 5);
    advance(g, gameData, gameData.balance.crisis.firstAt);
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

  it('版 4（記録簿がない）のセーブも読め、無限の世界の記録から記録簿が作られる', () => {
    const old = JSON.parse(serialize(sample()));
    old.saveVersion = 4;
    delete old.progress.ranking;
    old.progress.endless = Array.from({ length: 12 }, (_, i) => ({ years: (i * 37) % 100, daily: null, at: i, title: `世界${i}` }));
    const up = migrate(old);
    expect(up.saveVersion).toBe(SAVE_VERSION);
    expect(up.progress.ranking).toHaveLength(RANKING_SIZE);
    const ys = up.progress.ranking.map((r) => r.years);
    expect(ys).toEqual([...ys].sort((a, b) => b - a));
    expect(ys[0]).toBe(Math.max(...old.progress.endless.map((r: { years: number }) => r.years)));
  });
});

describe('古い形の世界', () => {
  it('世界容量を「重さ」で数えていた世界（版5まで）は、文字数に直して読み込む', () => {
    const g = createGame(gameData, 'food', 1);
    const chars = g.sim.capacityMax;
    const { legacyChars, legacyShift } = gameData.balance.capacity;
    const old = structuredClone(g);
    old.schema = 5;
    old.sim.capacityMax = (chars + legacyShift) / legacyChars;
    expect(upgradeState(old, gameData).sim.capacityMax).toBeCloseTo(chars, 6);
    // 今の形の世界は、そのまま
    expect(upgradeState(structuredClone(g), gameData).sim.capacityMax).toBe(chars);
  });

  it('心・物価・くり返す世界の項目がない世界も、ふだんの値で補って進められる', () => {
    const g = createGame(gameData, 'food', 1);
    const old = JSON.parse(JSON.stringify(g));
    delete old.sim.mind;
    delete old.sim.prices;
    delete old.loop;
    const up = upgradeState(old, gameData);
    expect(up.sim.mind).toBe(gameData.balance.mind.base);
    expect(up.sim.prices).toBe(1);
    expect(up.loop).toBeNull();
    expect(() => advance(up, gameData, 2)).not.toThrow();
  });

  it('去年効いていた意味と書き換えの勢いがない世界（版6まで）は、今の意味で補う（読み込んだだけで「効き始めた」と知らせない）', () => {
    const g = createGame(gameData, 'food', 1);
    addLine(g, gameData, '人間は空を飛べる。');
    advance(g, gameData, 1);
    const old = JSON.parse(JSON.stringify(g));
    delete old.inEffect;
    delete old.impulse;
    old.schema = 6;
    const up = upgradeState(old, gameData);
    expect(up.inEffect).toEqual(['p:flight']);
    expect(up.impulse).toEqual({});
    const rep = advance(up, gameData, 1);
    expect(rep.news.filter((n) => n.onset)).toEqual([]);
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
    expect(g.year).toBeGreaterThan(100);
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
