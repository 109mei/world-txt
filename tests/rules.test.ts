import { describe, expect, it } from 'vitest';
import { addLine, advance, checkCondition, computeChannels, costAfter, createGame, lawTotals, NOISE_INCOHERENCE, parseCondition, rewriteLaw, rewriteLine, stepYear, validateCondition } from '../src/core';
import { gameData } from '../src/data';

describe('書き換えのルール', () => {
  it('書き換えると書換の力を1つ使い、文章と読み取りが変わる', () => {
    const g = createGame(gameData, 'food', 1);
    const left = g.edits.left;
    const res = rewriteLaw(g, gameData, 'human_food', '人間は数日に一度食事を必要とする');
    expect(res.block).toBeNull();
    expect(res.reading).toBe('食事の回数が減る');
    expect(g.edits.left).toBe(left - 1);
    expect(g.texts.human_food).toBe('人間は数日に一度食事を必要とする。');
    expect(g.laws.human_food).toBe('few_days');
  });

  it('同じ文章への書き換えはできない（力を使わない）', () => {
    const g = createGame(gameData, 'food', 1);
    expect(rewriteLaw(g, gameData, 'human_food', '人間は毎日食事を必要とする。').block).toBe('same');
    expect(g.edits.used).toBe(0);
  });

  it('書換の力がなくなると、書き換えられない', () => {
    const g = createGame(gameData, 'food', 1);
    g.edits.left = 0;
    expect(rewriteLaw(g, gameData, 'crime', '').block).toBe('no-edits');
  });

  it('消すと世界容量が軽くなり、重くなる書き換えは上限を超えられない', () => {
    const g = createGame(gameData, 'food', 1);
    const before = lawTotals(gameData, g).cost;
    rewriteLaw(g, gameData, 'war', '');
    expect(lawTotals(gameData, g).cost).toBeLessThan(before);
    g.sim.capacityMax = lawTotals(gameData, g).cost;
    const res = addLine(g, gameData, '永久電池は燃料なしで電気を生む。');
    expect(res.block).toBe('capacity');
    expect(res.shortage).toBeGreaterThan(0);
  });

  it('意味が伝わらない文章は、世界を何も変えない（行の意味は元のまま。使うのは文字数と書換の力だけ）', () => {
    const g = createGame(gameData, 'food', 1);
    const before = lawTotals(gameData, g);
    const res = rewriteLaw(g, gameData, 'human_food', '猫は魚が好きだ。');
    expect(res.understood).toBe(false);
    expect(g.laws.human_food).toBe('original');
    expect(NOISE_INCOHERENCE).toBe(0);
    expect(lawTotals(gameData, g).incoherence).toBe(before.incoherence);
    const add = addLine(g, gameData, 'ポポポ。');
    expect(add.understood).toBe(false);
    expect(lawTotals(gameData, g).incoherence).toBe(before.incoherence);
  });

  it('意味が伝わらない文を書いた世界は、書かなかった世界と同じように進む（係数も出来事も同じ）', () => {
    const plain = createGame(gameData, 'food', 4);
    const noisy = createGame(gameData, 'food', 4);
    addLine(noisy, gameData, 'ポポポ。');
    rewriteLaw(noisy, gameData, 'human_food', '猫は魚が好きだ。');
    expect(computeChannels(noisy, gameData)).toEqual(computeChannels(plain, gameData));
    for (let i = 0; i < 6; i += 1) {
      const a = advance(plain, gameData, 1).news.map((n) => n.text);
      const b = advance(noisy, gameData, 1).news.map((n) => n.text);
      expect(b).toEqual(a);
    }
    expect(noisy.sim.pop).toBe(plain.sim.pop);
    expect(noisy.sim.co2).toBe(plain.sim.co2);
  });

  it('書き足した一文は世界に効き、消すと効かなくなる', () => {
    const g = createGame(gameData, 'food', 1);
    const res = addLine(g, gameData, '地震は起きない。');
    expect(res.reading).toBe('大地が揺れない');
    expect(g.flags.no_quake).toBe(true);
    const id = g.extras[0]!.id;
    rewriteLine(g, gameData, id, '');
    expect(g.extras).toHaveLength(0);
    expect(g.flags.no_quake).toBeUndefined();
  });

  it('時間を進めると書換の力が戻る（上限まで）', () => {
    const g = createGame(gameData, 'food', 1);
    const st = gameData.stageById.get('food')!;
    rewriteLaw(g, gameData, 'crime', '');
    const left = g.edits.left;
    // 重大な出来事で途中で止まることがあるので、1年ずつ進める
    while (g.year < st.edits.every && g.status === 'playing') advance(g, gameData, 1);
    expect(g.edits.left).toBe(Math.min(st.edits.max, left + 1));
  });
});

describe('書き足しの読み取りと、原因・観測記録', () => {
  it('書き足した文章が既存の行と同じものについての文なら、その行の書き換えになる', () => {
    const g = createGame(gameData, 'food', 1);
    const res = addLine(g, gameData, '人は3日に1回ごはんを食べる');
    expect(res.block).toBeNull();
    expect(res.redirect).toBe('human_food');
    expect(res.reading).toBe('食事の回数が減る');
    expect(g.laws.human_food).toBe('few_days');
    expect(g.texts.human_food).toBe('人は3日に1回ごはんを食べる。');
    expect(g.extras).toHaveLength(0);
  });

  it('同じ意味の定義は重ねて書き足せない（書換の力を使わない）', () => {
    const g = createGame(gameData, 'food', 1);
    expect(addLine(g, gameData, '人間は空を飛べる。').block).toBeNull();
    const used = g.edits.used;
    const again = addLine(g, gameData, '人は空を飛ぶ。');
    expect(again.block).toBe('redundant');
    expect(again.sameAs).toEqual({ kind: 'line', id: g.extras[0]!.id });
    expect(addLine(g, gameData, '人は毎日ごはんを食べる。').block).toBe('redundant');
    expect(g.edits.used).toBe(used);
  });

  it('同じ言い回しの行が重なっていても、効くのは1行分だけ（古いセーブ）', () => {
    const a = createGame(gameData, 'food', 1);
    addLine(a, gameData, '人間は空を飛べる。');
    const b = structuredClone(a);
    b.extras.push({ ...b.extras[0]!, id: 'x99' });
    expect(computeChannels(b, gameData).ch).toEqual(computeChannels(a, gameData).ch);
  });

  it('書き足した行を書き換えて既存の行の話になったら、その行に溶け込む', () => {
    const g = createGame(gameData, 'food', 1);
    addLine(g, gameData, '世界はうつくしい。');
    const id = g.extras[0]!.id;
    const res = rewriteLine(g, gameData, id, '雨がたくさん降る。');
    expect(res.redirect).toBe('water_rain');
    expect(g.extras).toHaveLength(0);
    expect(g.laws.water_rain).toBe('more');
  });

  it('想定外の変化には、原因になった行（書いた文章と年）が付く', () => {
    const g = createGame(gameData, 'food', 3);
    rewriteLaw(g, gameData, 'human_food', '人間は週に一度食事を必要とする。');
    for (let i = 0; i < 12 && g.status === 'playing'; i++) advance(g, gameData, 1);
    const twist = g.history.find((h) => h.kind === 'twist' && h.text.includes('外食産業'));
    expect(twist?.cause).toEqual({ text: '人間は週に一度食事を必要とする。', deleted: false, year: 0 });
    // 消した行は「消した」として元の文を示す
    const h = createGame(gameData, 'war', 3);
    rewriteLaw(h, gameData, 'war', '');
    for (let i = 0; i < 10 && h.status === 'playing'; i++) advance(h, gameData, 1);
    const shadow = h.history.find((x) => x.kind === 'twist' && x.cause);
    expect(shadow?.cause).toEqual({ text: '争いは戦争になりうる。', deleted: true, year: 0 });
  });

  it('観測記録：読み取り・言い回し・出来事・結末を見つけた順に残す', () => {
    const g = createGame(gameData, 'food', 2);
    rewriteLaw(g, gameData, 'human_food', '人間は数日に一度食事を必要とする。');
    addLine(g, gameData, '人間は空を飛べる。');
    const at = (id: string) => g.found.indexOf(id);
    expect(at('r:human_food.few_days')).toBe(0);
    expect(at('p:flight')).toBeGreaterThan(0);
    expect(g.found).toContain('g:flyers');
    while (g.status === 'playing') advance(g, gameData, 5);
    expect(g.found.some((id) => id.startsWith('e:'))).toBe(true);
    expect(g.found).toContain(`end:food.${g.failReason ?? 'clear'}`);
    expect(new Set(g.found).size).toBe(g.found.length);
  });
});

describe('世界容量の見積もり', () => {
  it('書き足した文章が既存の行の書き換えになるときも、命令のあとと同じ重さを見積もる', () => {
    const g = createGame(gameData, 'tiny', 1);
    const before = lawTotals(gameData, g).cost;
    const est = costAfter(g, gameData, { kind: 'new' }, '人は隔日に食べる。');
    // 「人間は毎日食事を必要とする」（13字）が「人は隔日に食べる」（8字）になる
    expect(est).toBe(before - 5);
    expect(addLine(g, gameData, '人は隔日に食べる。').redirect).toBe('human_food');
    expect(lawTotals(gameData, g).cost).toBe(est);
    // 行の書き換え・削除・言い回しの書き足しも、命令のあとの重さと一致する
    const cases: [Parameters<typeof costAfter>[2], string][] = [
      [{ kind: 'law', id: 'war' }, ''],
      [{ kind: 'law', id: 'sun_shine' }, '太陽は地球を照らす。'],
      [{ kind: 'new' }, '人間は空を飛べる。'],
    ];
    const f = createGame(gameData, 'food', 1);
    for (const [target, text] of cases) {
      const e = costAfter(f, gameData, target, text);
      const res = target.kind === 'law' ? rewriteLaw(f, gameData, target.id, text) : addLine(f, gameData, text);
      expect(res.block, text).toBeNull();
      expect(lawTotals(gameData, f).cost, text).toBe(e);
    }
  });
});

describe('条件の書き方', () => {
  it('「||」はどちらかが成り立てばよく、「since:phrase:」はその言い回しを書いてからの年数', () => {
    const g = createGame(gameData, 'tiny', 1);
    g.sim.capacityMax += 20 * 6;
    const either = 'law:death=not_human|eternal || phrase:immortal';
    expect(checkCondition(g, either)).toBe(false);
    // 主語のない「誰も死なない」は、法則の行ではなく言い回しとして読む
    addLine(g, gameData, '誰も死なない。');
    expect(checkCondition(g, 'law:death=not_human|eternal')).toBe(false);
    expect(checkCondition(g, either)).toBe(true);
    expect(checkCondition(g, 'since:phrase:immortal >= 2')).toBe(false);
    stepYear(g, gameData);
    stepYear(g, gameData);
    expect(checkCondition(g, 'since:phrase:immortal >= 2')).toBe(true);
    expect(checkCondition(g, 'since:death >= 2 || since:phrase:immortal >= 2')).toBe(true);
  });

  it('「||」の両側と「since:phrase:」の言い回しも、知っているものか確かめる', () => {
    expect(validateCondition(gameData, 'law:death=not_human || phrase:immortal')).toBeNull();
    expect(validateCondition(gameData, 'law:death=not_human || phrase:nothing')).toMatch(/知らない言い回し/);
    expect(validateCondition(gameData, 'law:death=forever || phrase:immortal')).toMatch(/知らない形/);
    expect(validateCondition(gameData, 'since:phrase:nothing >= 1')).toMatch(/知らない言い回し/);
    expect(() => parseCondition('law:death=not_human || ')).toThrow();
  });
});
