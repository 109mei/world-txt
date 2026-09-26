import { describe, expect, it } from 'vitest';
import { addLine, advance, computeChannels, createGame, modeCue, modeFactor, planWrite, rewriteLaw } from '../src/core';
import { gameData } from '../src/data';

/**
 * 書き方の読み分け（P10・分析の5章）：同じ願いでも、語尾で「性質・制度・条件つき」に読み分ける。
 * 性質は考え方が広がった分だけ効き（S字。P15）、国家の行がなくても効く。制度は翌年から効くが、国家の行が消えている年は効かず、
 * 信頼が低いと形だけ守られ、闇市と働く意欲の低下が育つ。条件つきは、足りない年・揺らいだ年だけ小さく効く
 */

const RULE = [
  '人は食べ物を分けなければならない。',
  '人は食べ物を分け合わねばならない。',
  '人は食べ物を分けなくてはならない。',
  '人は食べ物を分けないといけない。',
  '人は食べ物を分けなくてはいけない。',
  '国が食べ物を配る。',
  '政府が食べ物を配る。',
  '政府が食料を配給する。',
  '国は人に食べ物を分けさせる。',
  '人は食べ物を分け合うと決める。',
  '法律で食べ物を分け合う。',
  '決まりで食べ物を分け合う。',
  '人は食べ物を分け合う義務がある。',
  '国は野生動物の売り買いを禁止する。',
  '人は化石燃料を燃やしてはならず、法で禁じる。',
  '人は他人にやさしくしなければならない。',
  '人は他人の物を奪ってはならないと決まっている。',
  '人は争ってはならないと法で決める。',
  '人は手を洗わなければならない。',
  '人は電気を節約しなければならない。',
  '人は食べ物を分け合うべきだ。',
];
const CONDITIONAL = [
  '人は余った食べ物を分かち合う。',
  '人は余ったら食べ物を分ける。',
  '人は食べ物が余れば分け合う。',
  '人は飢えたときだけ食べ物を分かち合う。',
  '人は困ったら食べ物を分け合う。',
  '人は困ったとき食べ物を分かち合う。',
  '人は足りなくなったら食べ物を分け合う。',
  '人は足りないときは食べ物を分け合う。',
  '人は凶作のときは食べ物を分け合う。',
  '人は凶作の年なら食べ物を分け合う。',
  '干ばつの場合は、人は食べ物を分け合う。',
  '飢饉の場合に、人は食べ物を分け合う。',
  '人は病のときだけ家から出ない。',
  '人は争いのときは話し合う。',
  '人は電気が足りないときに節約する。',
  '人は必要なら食べ物を分け合う。',
  '人は困ったときに助け合う。',
  '人は余る食べ物を分け合う。',
  '人は飢えたとき、食べ物を分け合う。',
  '人は余った電気を分け合う。',
  '人は食べ物が足りないときは分け合う。',
];
const NATURE = [
  '人は食べ物を分かち合う。',
  '人は食べ物を分け合う。',
  '人は助け合う。',
  '人は他人の物を欲しがらない。',
  '人は嘘をつけない。',
  '人は他人にやさしくする。',
  '人は争いを好まない。',
  '人は人を傷つけない。',
  '人は電気を節約して暮らす。',
  '人は食べ物を捨てない。',
  '人は毎日手を洗う。',
  '人は誰も憎まない。',
  '人は怒らない。',
  '人は嫉妬しない。',
  '人はいつも笑っている。',
  '人は家から出ない。',
  '人は互いの心を読める。',
  '人は支え合う。',
  '人は殴らない。',
  '人は許し合う。',
  '人は思いやる。',
];

describe('書き方の読み分け（語尾の表）', () => {
  it.each(RULE)('制度：%s', (t) => expect(modeCue(t)).toBe('rule'));
  it.each(CONDITIONAL)('条件つき：%s', (t) => expect(modeCue(t)).toBe('conditional'));
  it.each(NATURE)('性質（手がかりなし）：%s', (t) => expect(modeCue(t)).toBeNull());

  it('「〜ねばならない」の「なら」を条件と読まない', () => {
    expect(modeCue('人は食べ物を分け合わねばならない。')).toBe('rule');
    expect(modeCue('人は食べ物を分けなければならない。')).toBe('rule');
  });
});

describe('書き方の読み分け（読み取りと効き方）', () => {
  const world = () => {
    const g = createGame(gameData, 'food', 1000);
    g.edits.left = 10;
    return g;
  };

  it('人の振る舞いを書いた文には、書く画面に読まれ方が出る（どれも同じ分け合いとして読む）', () => {
    const cases: [string, string][] = [
      ['人は食べ物を分かち合う。', 'nature'],
      ['人は食べ物を分けなければならない。', 'rule'],
      ['国が食べ物を配る。', 'rule'],
      ['人は余った食べ物を分かち合う。', 'conditional'],
      ['人は飢えたときだけ食べ物を分かち合う。', 'conditional'],
    ];
    for (const [t, mode] of cases) {
      const p = planWrite(world(), gameData, { kind: 'new' }, t);
      expect(p.block, t).toBeNull();
      expect(p.result.understood, t).toBe(true);
      expect(p.result.mode, t).toBe(mode);
    }
    // 物や自然の言い回しは読み分けない
    expect(planWrite(world(), gameData, { kind: 'new' }, '村ごとにため池を作る。').result.mode ?? null).toBeNull();
  });

  it('性質は、考え方が広がった分だけ効く（書いた年は一部の人の考えで、年とともにS字で広がる）', () => {
    const g = world();
    addLine(g, gameData, '人は食べ物を分かち合う。');
    const id = g.extras[0]!.id;
    const p = gameData.phraseById.get('share')!;
    const first = modeFactor(g, gameData, id, p);
    expect(first).toBe(gameData.balance.people.spread.seed);
    g.sim.trust = 80;
    advance(g, gameData, 2);
    const mid = modeFactor(g, gameData, id, p);
    g.sim.trust = 80;
    advance(g, gameData, 3);
    expect(mid).toBeGreaterThan(first);
    expect(modeFactor(g, gameData, id, p)).toBeGreaterThan(mid);
  });

  it('制度は翌年から効くが、国家の行を消した世界では効かない。性質は国家がなくても効く', () => {
    const g = world();
    addLine(g, gameData, '人は食べ物を分けなければならない。');
    const id = g.extras[0]!.id;
    const p = gameData.phraseById.get('share')!;
    expect(g.modes[id]).toBe('rule');
    expect(modeFactor(g, gameData, id, p)).toBeGreaterThan(0.5);
    rewriteLaw(g, gameData, 'nation', '');
    expect(modeFactor(g, gameData, id, p)).toBe(0);
    // 同じ分け合いを性質として書いた世界では、国家を消しても効く
    const h = world();
    addLine(h, gameData, '人は食べ物を分かち合う。');
    rewriteLaw(h, gameData, 'nation', '');
    advance(h, gameData, 3);
    expect(modeFactor(h, gameData, h.extras[0]!.id, p)).toBeGreaterThan(0);
  });

  it('制度として書いた分け合いは、効いているあいだ闇市を育てる（性質では育たない）', () => {
    const rule = world();
    addLine(rule, gameData, '人は食べ物を分けなければならない。');
    const nature = world();
    addLine(nature, gameData, '人は食べ物を分かち合う。');
    advance(rule, gameData, 12);
    advance(nature, gameData, 12);
    expect(rule.twists.black_market ?? 0).toBeGreaterThan(0);
    expect(nature.twists.black_market ?? 0).toBe(0);
  });

  it('条件つきは、足りない年・揺らいだ年だけ小さく効き、満ち足りた年は効かない', () => {
    const g = world();
    addLine(g, gameData, '人は余った食べ物を分かち合う。');
    const id = g.extras[0]!.id;
    const p = gameData.phraseById.get('share')!;
    g.derived = { ...g.derived, foodRatio: 0.8, waterRatio: 1.1, energyRatio: 1.1 };
    expect(modeFactor(g, gameData, id, p)).toBe(gameData.balance.modes.conditionalScale);
    g.derived = { ...g.derived, foodRatio: 1.2, waterRatio: 1.2, energyRatio: 1.2 };
    g.sim.stability = 80;
    expect(modeFactor(g, gameData, id, p)).toBe(0);
    // 係数にも表れる（分け合いの分配の伸びがない）
    const base = createGame(gameData, 'food', 1000);
    base.derived = { ...base.derived, foodRatio: 1.2, waterRatio: 1.2, energyRatio: 1.2 };
    base.sim.stability = 80;
    expect(computeChannels(g, gameData).ch.distribution).toBeCloseTo(computeChannels(base, gameData).ch.distribution, 5);
  });

  it('読み分けの手がかりはセーブの形に残る（書き直すと、新しい語尾で読み直す）', () => {
    const g = world();
    addLine(g, gameData, '人は食べ物を分けなければならない。');
    const id = g.extras[0]!.id;
    expect(g.modes[id]).toBe('rule');
    expect(JSON.parse(JSON.stringify(g)).modes[id]).toBe('rule');
  });
});
