import { describe, expect, it } from 'vitest';
import { createGame, planWrite } from '../src/core';
import { features, interpretLaw } from '../src/core/interpret';
import { gameData } from '../src/data';
import type { Law } from '../src/data/schema';

/**
 * 程度の言葉（無限に・少々・けっこう など）と、打ち消しに見えて打ち消しではない言葉（果てしない・きたない など）。
 * 「雨となって無限に降る」を「雨が降らなくなる」と読んだ不具合から（2026年9月27日）
 */

const law = (id: string): Law => gameData.lawById.get(id)!;

/** 読み取りの向き：増える・減る・消す・元のまま（ほかは読み取りの id） */
function dir(l: Law, text: string): string {
  const r = interpretLaw(l, text);
  if (!r.understood) return 'noise';
  if (r.optionId === l.initial) return 'same';
  const o = l.options.find((x) => x.id === r.optionId)!;
  if (o.kind === 'delete') return 'delete';
  const rules = JSON.stringify(o.match ?? []);
  if (rules.includes('"more":true')) return 'more';
  if (rules.includes('"less":true')) return 'less';
  return o.id;
}

describe('程度の言葉', () => {
  it('「雨となって無限に降る」は、雨が増える（「無」を打ち消しと読まない）', () => {
    expect(dir(law('water_rain'), '水は空へのぼり、雨となって無限に降る。')).toBe('more');
    expect(dir(law('water_rain'), '雨は無限に降る。')).toBe('more');
  });

  it('多さと強めの言葉は増える、少なさの言葉は減る（ひらがなでも漢字でも）', () => {
    for (const w of ['無限に', '限りなく', '果てしなく', 'たっぷり', 'かなり', 'けっこう', '結構', 'だいぶ', 'ずいぶん', '相当', 'とても'])
      expect(dir(law('water_rain'), `雨は${w}降る。`), w).toBe('more');
    for (const w of ['少し', 'ちょっと', '少々', 'やや', '若干', '多少']) expect(dir(law('water_rain'), `雨は${w}降る。`), w).toBe('less');
    // 向きのある言葉が勝つ（「けっこう少ない」は少ない、「やや多い」は多い）
    expect(dir(law('water_rain'), '雨はけっこう少なく降る。')).toBe('less');
    expect(dir(law('water_rain'), '雨はやや多く降る。')).toBe('more');
  });

  it('程度の言葉は世界が知っている言葉（少々・若干・相当の入った文も世界に届く）', () => {
    const g = createGame(gameData, 'food', 7);
    g.access = null;
    for (const w of ['少々', '若干', '結構', '相当', '無限に']) expect(planWrite(g, gameData, { kind: 'law', id: 'water_rain' }, `雨は${w}降る。`).result.understood, w).toBe(true);
  });

  it('「限りなく」を「〜に限り（〜のときだけ）」と取り違えない', () => {
    expect(dir(law('human_birth'), '人間は子を限りなく産む。')).toBe('more');
    expect(dir(law('life_heat'), '生き物は暑さで限りなく弱る。')).toBe('more');
  });
});

describe('打ち消しに見えて打ち消しではない言葉', () => {
  it('「ない」を含む多さの言葉やありふれた形容は、打ち消しと読まない（本当の打ち消しは打ち消し）', () => {
    for (const w of [
      '果てしない',
      '数えきれない',
      '計り知れない',
      '途方もない',
      '絶え間ない',
      '限りない',
      '終わりのない',
      'この上ない',
      'きたない',
      'はかない',
      'せつない',
      'つまらない',
      '仕方ない',
      '情けない',
      'とんでもない',
      '何気ない',
    ]) {
      expect(features(`人間は${w}。`).neg, w).toBe(false);
      expect(features(`雨は${w}降る。`).neg, w).toBe(false);
    }
    expect(features('雨は降らない。').neg).toBe(true);
    expect(features('人間は果てしない宇宙を旅しない。').neg).toBe(true);
  });

  it('「数えきれないほど子を産む」は子が増える（打ち消して「産まない」と読まない）', () => {
    expect(dir(law('human_birth'), '人間は数えきれないほど子を産む。')).toBe('more');
  });

  it('「ただし人間は除かない」「ただし人間も含む」は例外にしない（「ただし人間は除く」は例外）', () => {
    const heat = law('life_heat');
    expect(dir(heat, '生き物は暑さで弱る。ただし人間は除かない。')).toBe('same');
    expect(dir(heat, '生き物は暑さで弱る。ただし人間も含む。')).toBe('same');
    expect(dir(heat, '生き物は暑さで弱る。ただし人間は除く。')).toBe('not_human');
  });

  it('「見えないところで破る」「破らない」「見えないところでも守る」を読み分ける', () => {
    const crime = law('crime');
    expect(dir(crime, '人は見えないところで決まりを破る。')).toBe('hidden');
    expect(dir(crime, '人は見えない所で決まりを破る。')).toBe('hidden');
    expect(dir(crime, '人はこっそり決まりを破る。')).toBe('hidden');
    expect(dir(crime, '人は見えないところで決まりを破らない。')).toBe('delete');
    expect(dir(crime, '人は見えないところでも決まりを守る。')).toBe('delete');
    expect(dir(crime, '人はこっそり決まりを守る。')).toBe('delete');
  });
});
