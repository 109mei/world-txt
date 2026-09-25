import { describe, expect, it } from 'vitest';
import { createGame, originalText, planWrite } from '../src/core';
import { gameData } from '../src/data';
import { insertAt, keyWords, negate, withoutPeriod } from '../src/ui/wording';

describe('入力の補助', () => {
  it('「〜ない」は文の終わりの述語を打ち消す', () => {
    expect(negate('人間は毎日食事を必要とする。')).toBe('人間は毎日食事を必要としない。');
    expect(negate('生き物はいつか死ぬ。')).toBe('生き物はいつか死なない。');
    expect(negate('植物は水と光と二酸化炭素で育つ。')).toBe('植物は水と光と二酸化炭素で育たない。');
    // 「。」は書いてあれば残し、なければ付けない（書き込むときに世界が付ける）
    expect(negate('人間は空を飛べる')).toBe('人間は空を飛べない');
    expect(negate('人は家に帰る。')).toBe('人は家に帰らない。');
    expect(negate('人は夢を見る。')).toBe('人は夢を見ない。');
    expect(negate('石油には限りがある。')).toBe('石油には限りがない。');
    expect(negate('争いは戦争になりうる。')).toBe('争いは戦争になりえない。');
    expect(negate('猫はかわいい。')).toBe('猫はかわいくない。');
    expect(negate('世界は平和')).toBe('世界は平和ではない');
    // すでに打ち消している文と空の文は、打ち消せない
    expect(negate('人間は死なない。')).toBeNull();
    expect(negate('')).toBeNull();
  });

  it('どの行の元の文も「〜ない」で打ち消せ、世界はそれを意味のある文として読む', () => {
    for (const law of gameData.laws) {
      const text = originalText(law);
      const n = negate(text);
      if (/ない。$/u.test(text)) {
        expect(n, law.id).toBeNull();
        continue;
      }
      expect(n, law.id).not.toBeNull();
      const p = planWrite(createGame(gameData, 'food', 1), gameData, { kind: 'law', id: law.id }, n!);
      expect(p.result.understood, `${law.id}「${n}」`).toBe(true);
    }
  });

  it('その行の言葉は、ものを指す言葉だけを拾う（動きの言葉のかけらは拾わない）', () => {
    expect(keyWords('人間は毎日食事を必要とする。')).toEqual(['人間', '毎日', '食事', '必要']);
    expect(keyWords('人間は毎晩眠る。')).toEqual(['人間']);
    expect(keyWords('免疫は一度戦った病原体を覚える。')).toEqual(['免疫', '病原体']);
  });

  it('書き換えるときは、文の終わりの「。」を外して開く', () => {
    expect(withoutPeriod('人間は毎日食事を必要とする。')).toBe('人間は毎日食事を必要とする');
    expect(withoutPeriod('人間は空を飛べる')).toBe('人間は空を飛べる');
    expect(withoutPeriod('')).toBe('');
  });

  it('言葉はカーソルの位置（選んだところ）に差し込む', () => {
    expect(insertAt('人間は食べる。', 3, 3, '少し')).toEqual({ text: '人間は少し食べる。', cursor: 5 });
    expect(insertAt('人間は毎日食べる。', 3, 5, 'たまに')).toEqual({ text: '人間はたまに食べる。', cursor: 6 });
    expect(insertAt('', 9, 9, 'だけ')).toEqual({ text: 'だけ', cursor: 2 });
  });
});
