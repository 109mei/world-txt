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
  migrate,
  SAVE_VERSION,
  SaveFormatError,
  serialize,
  type SaveData,
} from '../src/save';
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
});
