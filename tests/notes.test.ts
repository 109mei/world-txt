import { describe, expect, it } from 'vitest';
import { advance, createGame, dictionaryWords } from '../src/core';
import { gameData } from '../src/data';
import { DEFAULT_SETTINGS, deserialize, EMPTY_PROGRESS, MemorySaveStore, serialize, SAVE_VERSION, type SaveData } from '../src/save';
import { buildCausalMap } from '../src/store/causal';
import { buildDictionary, RULE_WORDS } from '../src/store/dictionary';
import { GameRuntime } from '../src/store/runtime';
import { lapLines } from '../src/store/view';

/**
 * 発見で開くノートの画面と線：世界の辞書（知らない言葉を書いた）・因果の地図（因果の線が想定外の所に届いた）・
 * 前回と今回の線（同じ世界でもう一度・くり返す十年の前の周）
 */
const runtime = async (): Promise<GameRuntime> => {
  const rt = new GameRuntime({ data: gameData, store: new MemorySaveStore(), now: () => 1, newSeed: () => 3 });
  await rt.boot();
  return rt;
};

describe('世界の辞書', () => {
  it('書いた文の言葉を、世界に通じた言葉と、まだ知らない言葉に分ける（数字だけ・種類のわからない1文字は集めない）', () => {
    expect(dictionaryWords('ポポポはピピピを食べる。')).toEqual({ known: [], unknown: ['ポポポ', 'ピピピ'] });
    const w = dictionaryWords('人間は3日にパンを食べる。');
    expect(w.known).toContain('人間');
    expect(w.known).toContain('パン');
    expect(w.known).not.toContain('3');
    expect(w.unknown).toEqual([]);
  });

  it('世界に届かなかった文でも言葉を集め、はじめて知らない言葉を書いたことはすぐ記録に移る（世界の辞書が開く）', async () => {
    const rt = await runtime();
    rt.start('food');
    const res = rt.write({ kind: 'new' }, 'ポポポはピピピを食べる。');
    expect(res.block).toBe('noise');
    expect(rt.progress.words.unknown).toEqual(['ポポポ', 'ピピピ']);
    expect(rt.progress.discovered).toContain('h:unknown');
    // 書き換えの残りは減らない
    expect(rt.state!.edits.used).toBe(0);
  });

  it('通じた言葉は種類ごと（種類のわからない言葉は世界の決まりの言葉）、まだ知らない言葉は新しい順に並べる', () => {
    const d = buildDictionary(gameData, { known: ['人間', 'パン', '米'], unknown: ['ポポポ', 'ピピピ'] });
    expect(d.known.find((g) => g.kind === '食べ物')?.words).toEqual(['パン', '米']);
    expect(d.known.find((g) => g.kind === RULE_WORDS)?.words).toEqual(['人間']);
    expect(d.known[0]!.kind).toBe(RULE_WORDS);
    expect(d.unknown).toEqual(['ピピピ', 'ポポポ']);
    expect(d.knownCount).toBe(3);
    // 内容の版が変わって世界が知るようになった言葉は、通じた側へ移す
    const later = buildDictionary(gameData, { known: [], unknown: ['パン'] });
    expect(later.unknown).toEqual([]);
    expect(later.knownCount).toBe(1);
  });

  it('同じ言葉は2度数えず、書いた新しい順に後ろへ回す', async () => {
    const rt = await runtime();
    rt.start('food');
    for (let i = 0; i < 3; i++) rt.write({ kind: 'new' }, 'ポポポはピピピを食べる。');
    rt.write({ kind: 'new' }, 'ポポポはペペペを食べる。');
    expect(rt.progress.words.unknown).toEqual(['ピピピ', 'ポポポ', 'ペペペ']);
  });
});

describe('因果の地図', () => {
  const law = gameData.laws.find((l) => l.options.some((o) => (o.twists?.length ?? 0) >= 2))!;
  const opt = law.options.find((o) => (o.twists?.length ?? 0) >= 2)!;

  it('見つけた読み取りから、起こしうる想定外の変化へ線を引く（見つけたものは名前、まだのものは「？」）', () => {
    const first = opt.twists![0]!.id;
    const map = buildCausalMap(gameData, [`r:${law.id}.${opt.id}`, `t:${first}`]);
    expect(map.nodes).toHaveLength(1);
    const node = map.nodes[0]!;
    expect(node.name).toBe(opt.label);
    const twists = node.effects.filter((e) => e.kind === 'twist');
    expect(twists).toHaveLength(opt.twists!.length);
    expect(twists[0]!.name).toBe(gameData.twistById.get(first)!.name);
    expect(twists.slice(1).every((e) => e.name === null)).toBe(true);
    expect(map.found).toBe(1);
    expect(map.total).toBe(node.effects.length);
  });

  it('まだ見つけていない書き方は地図に出さない。組み合わせは、その書き方が条件に入っていれば線を引く', () => {
    expect(buildCausalMap(gameData, [`t:${opt.twists![0]!.id}`]).nodes).toEqual([]);
    const combo = gameData.combos.find((c) => c.when.some((w) => w.startsWith('phrase:')))!;
    const phraseId = combo.when
      .find((w) => w.startsWith('phrase:'))!
      .slice(7)
      .split('||')[0]!
      .trim();
    const map = buildCausalMap(gameData, [`p:${phraseId}`, `c:${combo.id}`]);
    const node = map.nodes.find((n) => n.id === `p:${phraseId}`);
    expect(node?.effects.some((e) => e.id === `c:${combo.id}` && e.name === combo.name)).toBe(true);
  });
});

describe('前回と今回の線', () => {
  it('くり返す十年：巻き戻った位置を覚え、前の周と今の周の人口の線を、くり返しの始まりの年から出す', () => {
    const g = createGame(gameData, 'loop', 7);
    for (let i = 0; i < 40 && g.trace.laps.length === 0 && g.status === 'playing'; i++) advance(g, gameData, 1);
    expect(g.trace.laps.length).toBeGreaterThanOrEqual(1);
    const at = g.trace.laps[0]!;
    // 巻き戻った直後：前の周は始まりから巻き戻る年まで、今の周は始まりの年だけ
    let lines = lapLines(g)!;
    expect(lines.prev).toEqual(g.trace.pop.slice(0, at));
    expect(lines.now).toEqual([g.trace.pop[0]]);
    advance(g, gameData, 1);
    lines = lapLines(g)!;
    expect(lines.now).toEqual([g.trace.pop[0], g.trace.pop[at]]);
  });

  it('くり返しのない世界と、まだ巻き戻っていない世界には出さない', () => {
    expect(lapLines(createGame(gameData, 'food', 7))).toBeNull();
    expect(lapLines(createGame(gameData, 'loop', 7))).toBeNull();
  });

  it('同じ世界でもう一度：ひとつ前の遊びの人口の線を、ステージと世界番号の鍵で覚える', async () => {
    const rt = await runtime();
    rt.start('food', false, 3);
    for (let i = 0; i < 3; i++) rt.advance(1);
    const before = [...rt.state!.trace.pop];
    rt.start('food', false, 3);
    expect(rt.progress.prevRun).toEqual({ key: 'food:3', pop: before });
    // 別の世界を始めれば、その世界の線に置き換わる
    rt.advance(1);
    rt.start('food', false, 5);
    expect(rt.progress.prevRun?.key).toBe('food:3');
    expect(rt.progress.prevRun?.pop).toHaveLength(2);
  });

  it('辞書の言葉と前回の線はセーブに残り、読めない形なら空にして読む', () => {
    const data: SaveData = {
      saveVersion: SAVE_VERSION,
      savedAt: 1,
      settings: { ...DEFAULT_SETTINGS },
      progress: { ...structuredClone(EMPTY_PROGRESS), words: { known: ['人間'], unknown: ['ポポポ'] }, prevRun: { key: 'food:3', pop: [80, 79.5] } },
      current: null,
    };
    const back = deserialize(serialize(data));
    expect(back.progress.words).toEqual({ known: ['人間'], unknown: ['ポポポ'] });
    expect(back.progress.prevRun).toEqual({ key: 'food:3', pop: [80, 79.5] });
    const broken = JSON.parse(serialize(data));
    broken.progress.words = 'こわれた';
    broken.progress.prevRun = { key: 3 };
    const again = deserialize(JSON.stringify(broken));
    expect(again.progress.words).toEqual({ known: [], unknown: [] });
    expect(again.progress.prevRun).toBeNull();
  });
});
