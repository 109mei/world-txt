import { describe, expect, it } from 'vitest';
import { features, interpretAsLaw, interpretLaw, interpretLine, kindOf, matchPhrases, phraseName, textCost } from '../src/core';
import { gameData } from '../src/data';

function reading(lawId: string, text: string): string {
  const law = gameData.lawById.get(lawId)!;
  const r = interpretLaw(law, text);
  return r.understood ? r.optionId : '（読み取れない）';
}

describe('文章の読み取り', () => {
  it('否定を読む（「少ない」「〜しなければならない」は否定ではない）', () => {
    expect(features('人間は老いない。').neg).toBe(true);
    expect(features('人間は少ない水で生きる。').neg).toBe(false);
    expect(features('人間は食事をしなければならない。').neg).toBe(false);
    expect(features('生き物はいつか死ぬ。').neg).toBe(false);
  });

  it('頻度を読む（毎日＝1）', () => {
    expect(features('毎日').freq).toBe(1);
    expect(features('数日に一度').freq).toBeCloseTo(1 / 3);
    expect(features('二日に一度').freq).toBeCloseTo(0.5);
    expect(features('週に一度').freq).toBeCloseTo(1 / 7);
    expect(features('一日に三回').freq).toBe(3);
  });

  it('言い方が違っても、同じ意味に読み取る', () => {
    expect(reading('human_food', '人間は数日に一度食事を必要とする。')).toBe('few_days');
    expect(reading('human_food', '人間は二日に一度だけ食事をとる。')).toBe('few_days');
    expect(reading('human_food', '人間はほとんど食事を必要としない。')).toBe('weekly');
    expect(reading('human_food', '人間は食事を必要としない。')).toBe('delete');
    expect(reading('human_food', '人間は一日に何度も食事を必要とする。')).toBe('more');
  });

  it('例外（ただし〜／〜を除く）を読む', () => {
    expect(reading('death', '生き物はいつか死ぬ。ただし人間は死なない。')).toBe('not_human');
    expect(reading('death', '人間を除く生き物はいつか死ぬ。')).toBe('not_human');
    expect(reading('fire_burn', '火は燃えるものを燃やす。ただし木は燃えない。')).toBe('no_wood');
  });

  it('言葉を消しただけの書き換えも読む', () => {
    expect(reading('plant_grow', '植物は光と二酸化炭素で育つ。')).toBe('light_only');
    expect(reading('plant_grow', '植物は水と二酸化炭素で育つ。')).toBe('dark');
  });

  it('元の文に否定があるときは、否定が外れたことを読む', () => {
    expect(reading('energy_conserve', 'エネルギーは形を変えると、総量が増える。')).toBe('delete');
    expect(reading('energy_conserve', 'エネルギーは形を変えても、総量は変わらない。')).toBe('original');
  });

  it('手がかりのない言い換えは元の意味、意味の違う文は読み取れない', () => {
    expect(reading('human_food', '人間は毎日食事を楽しむ。')).toBe('original');
    expect(reading('human_food', '猫は魚が好きだ。')).toBe('（読み取れない）');
  });

  it('書き足した一文を読む', () => {
    expect(interpretLine(gameData.phrases, '人間は空を飛べる。')?.id).toBe('flight');
    expect(interpretLine(gameData.phrases, '人は互いの心を読める。')?.id).toBe('telepathy');
    expect(interpretLine(gameData.phrases, '地震は起きない。')?.id).toBe('no_quake');
    expect(interpretLine(gameData.phrases, '世界はうつくしい。')).toBeNull();
  });

  it('世界容量は文字数で数える（句読点は数えない）。長い文章ほど、条件や例外を足すほど多くの字を使う', () => {
    expect(textCost('')).toBe(0);
    expect(textCost('人間は子を産む。')).toBe(7);
    expect(textCost('人間は毎日食事を必要とする。')).toBe(13);
    expect(textCost('人間は、子を産む！')).toBe(7);
    expect(textCost('人間は望んだときだけ子を産む。')).toBeGreaterThan(textCost('人間は子を産む。'));
    expect(textCost('生き物はいつか死ぬ。ただし人間は死なない。')).toBeGreaterThan(textCost('生き物はいつか死ぬ。'));
  });
});

describe('言い換えと、書き足した文章の読み取り', () => {
  it('「限りがある」は条件ではない（世界容量は文字だけを数える）', () => {
    expect(features('石油には限りがある。').cond).toBe(false);
    expect(features('生きている限り、人は学ぶ。').cond).toBe(true);
    expect(textCost('石油には限りがある。')).toBe(9);
  });

  it('同じものについて短く言い換えれば、元の意味のまま軽くなる', () => {
    expect(reading('human_food', '人は毎日食べる。')).toBe('original');
    expect(reading('sun_shine', '太陽は地球を照らす。')).toBe('original');
    expect(reading('oil_finite', '石油は有限。')).toBe('original');
    expect(textCost('人は毎日食べる。')).toBeLessThan(textCost('人間は毎日食事を必要とする。'));
  });

  it('主語だけ残して話題の違う文にすると、読み取れない', () => {
    expect(reading('human_food', '人間は毎日歌う。')).toBe('（読み取れない）');
    expect(reading('human_water', '人間は空を見上げる。')).toBe('（読み取れない）');
  });

  it('書き足した文章は、同じものについての行の書き換えとして読む', () => {
    const as = (text: string) => {
      const r = interpretAsLaw(gameData.laws, text);
      return r ? `${r.law.id}.${r.optionId}` : null;
    };
    expect(as('人は3日に1回ごはんを食べる。')).toBe('human_food.few_days');
    expect(as('雨がたくさん降る。')).toBe('water_rain.more');
    expect(as('石油は無限にある。')).toBe('oil_finite.delete');
    expect(as('人は長生きする。')).toBe('human_aging.slow');
    expect(as('作物はどんな土地でも育つ。')).toBe('farm_land.anywhere');
    expect(as('世界はうつくしい。')).toBeNull();
  });

  it('新しい概念の言い回しを読む', () => {
    const line = (text: string) => interpretLine(gameData.phrases, text)?.id ?? null;
    expect(line('空に太陽が二つある。')).toBe('two_suns');
    expect(line('核融合発電が実用化された。')).toBe('fusion');
    expect(line('人間の体が小さくなる。')).toBe('tiny_humans');
    expect(line('お金が空から降ってくる。')).toBe('money_rain');
    expect(line('人は動物と話せる。')).toBe('animal_talk');
    expect(line('地球の気温はいつも一定だ。')).toBe('thermostat');
    expect(line('人間は月に一度しか食事をしない。')).toBeNull();
  });
});

describe('言葉の種類と、種類ごとの読み取り', () => {
  it('辞書にない言葉も、語尾から種類を推し量る（一つの言葉は一つの種類）', () => {
    expect(kindOf('野良猫')).toBe('動物');
    expect(kindOf('顔認証カメラ')).toBe('機械');
    expect(kindOf('大規模言語モデル')).toBe('機械');
    expect(kindOf('肺炎')).toBe('病名');
    // 「量子コンピューター」は機械だが、「量子」は機械ではない
    expect(kindOf('量子')).not.toBe('機械');
    expect(kindOf('ポポポ')).toBeNull();
  });

  it('種類ごとの読み取りは、ほかに何も読めなかったときだけ当てる（重ねて読まない）', () => {
    const all = (text: string) => [...matchPhrases(gameData.phrases, text, false), ...matchPhrases(gameData.phrases, text, true)].map((p) => p.id);
    expect(all('服は存在しない。')).toEqual(['no_clothes']);
    expect(all('人工知能が世界を支配する。')).toEqual(['ai_rule']);
    expect(matchPhrases(gameData.phrases, '猫は存在しない。', true, true).map((p) => p.id)).toEqual(['gen_gone_animal']);
  });

  it('読み取りの名前は、書いた人の言葉で主語を埋める', () => {
    const gone = gameData.phraseById.get('gen_gone_machine')!.name;
    expect(phraseName(gone, 'SNSは存在しない。')).toBe('SNSがなくなる');
    expect(phraseName(gone, 'ChatGPTは存在しない。')).toBe('ChatGPTがなくなる');
    expect(phraseName(gone)).toBe('ある機械がなくなる');
    expect(phraseName(gameData.phraseById.get('gen_gone_disease')!.name, 'がんは存在しない。')).toBe('がんがなくなる');
  });
});
