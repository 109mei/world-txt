import { describe, expect, it } from 'vitest';
import { advance, createGame, write } from '../src/core';
import { gameData } from '../src/data';
import { broken, cases, outcomeOf, suspicious, type Case, type Outcome } from '../scripts/fuzz';

/**
 * いろいろな単語を、いろいろな位置に入れた書き換え・書き足し（npm run fuzz の約2万文から、決まった間隔で抜き出す）。
 * どれも例外を投げず、時間を進めても数値が壊れず、関係のない言葉で行の意味が変わらない
 */

const ALL = cases(gameData);
const SAMPLE = ALL.filter((_, i) => i % 9 === 0);

function fresh() {
  const g = createGame(gameData, 'food', 1);
  g.sim.capacityMax += 40 * 6;
  return g;
}

describe('単語の総当たり', () => {
  it(`抜き出した ${SAMPLE.length} 文（全 ${ALL.length} 文から）は、どれも例外を投げない`, () => {
    for (const c of SAMPLE) expect(() => outcomeOf(fresh(), gameData, c.target, c.text), c.text).not.toThrow();
  });

  it('関係のない言葉で、行の特定の読み取りや削除にならない（怪しい読み取りが 0）', () => {
    const base = (x: Outcome) => `${x.kind}:${x.detail.split('+')[0]}`;
    const bad: string[] = [];
    for (const c of SAMPLE) {
      const o = outcomeOf(fresh(), gameData, c.target, c.text);
      const same = (x: Case) => !!x.without && base(outcomeOf(fresh(), gameData, x.target, x.without)) === base(o);
      const why = suspicious(gameData, c, o, same);
      if (why) bad.push(`${why}：「${c.text}」→ ${o.kind} ${o.detail}`);
    }
    expect(bad).toEqual([]);
  });

  it('書き込んで時間を進めても、数値が壊れない（NaN・無限大にならない）', () => {
    for (const c of SAMPLE.filter((_, i) => i % 6 === 0)) {
      const g = fresh();
      write(g, gameData, c.target, c.text);
      advance(g, gameData, 5);
      expect(broken(g), c.text).toBeNull();
    }
  });
});
