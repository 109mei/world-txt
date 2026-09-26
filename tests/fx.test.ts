import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { blotMotes, bloomMotes, COUNTS, emberMotes, inkCount, inkMotes, MOTE_MAX, sparkMotes, streakLanes, type Mote } from '../src/ui/fx/pattern';

const fxDir = fileURLToPath(new URL('../src/ui/fx/', import.meta.url));
const A = '人間は空を飛べる。';
const B = '雨は倍降る。';

function sane(list: readonly Mote[]): void {
  for (const m of list) {
    for (const v of [m.x, m.y, m.vx, m.vy, m.size, m.delay, m.life, m.tone, m.sway]) expect(Number.isFinite(v)).toBe(true);
    expect(m.size).toBeGreaterThan(0);
    expect(m.life).toBeGreaterThan(0);
    expect(m.delay).toBeGreaterThanOrEqual(0);
    expect(m.tone).toBeGreaterThanOrEqual(0);
    expect(m.tone).toBeLessThan(1);
  }
}

describe('PixiJS の演出の散り方（P19。乱数を使わない）', () => {
  it('同じ文は、いつ誰が書いても同じ散り方になる', () => {
    expect(inkMotes(A)).toEqual(inkMotes(A));
    expect(blotMotes(A)).toEqual(blotMotes(A));
    expect(bloomMotes(A)).toEqual(bloomMotes(A));
    expect(sparkMotes(A)).toEqual(sparkMotes(A));
    expect(emberMotes('food:7:clear', true)).toEqual(emberMotes('food:7:clear', true));
    expect(streakLanes('pass:0:1')).toEqual(streakLanes('pass:0:1'));
  });

  it('違う文は、違う散り方になる', () => {
    expect(inkMotes(A)).not.toEqual(inkMotes(B));
    expect(blotMotes(A)).not.toEqual(blotMotes(B));
    expect(bloomMotes(A)).not.toEqual(bloomMotes(B));
    expect(sparkMotes(A)).not.toEqual(sparkMotes(B));
    expect(emberMotes('food:7:clear', true)).not.toEqual(emberMotes('food:8:clear', true));
    expect(streakLanes('pass:0:1')).not.toEqual(streakLanes('pass:1:2'));
  });

  it('粒の数は上限の中（長い文ほど多いが、上限で止まる）', () => {
    const [lo, hi] = COUNTS.ink;
    expect(inkCount('あ')).toBe(lo);
    expect(inkCount('あ'.repeat(200))).toBe(hi);
    expect(inkMotes('あ'.repeat(200))).toHaveLength(hi);
    // いちばん多い演出を2つ重ねても、上限の中
    expect(COUNTS.ember + hi).toBeLessThanOrEqual(MOTE_MAX);
    expect(sparkMotes(A, 14)).toHaveLength(14);
  });

  it('値は有限で、決まった範囲にある', () => {
    for (const list of [inkMotes(A), blotMotes(A), bloomMotes(A), sparkMotes(A), emberMotes('x', true), emberMotes('x', false)]) sane(list);
    // 救えた世界の粒は昇り、崩れた世界の灰は降る
    expect(emberMotes('x', true).every((m) => m.vy < 0)).toBe(true);
    expect(emberMotes('x', false).every((m) => m.vy > 0)).toBe(true);
    // 光の筋は、年の数字の周り（0.2〜0.62）をあけて流す
    expect(streakLanes('x').every((l) => l.y < 0.2 || l.y >= 0.62)).toBe(true);
  });

  it('演出の部品は Math.random・Date.now を使わない（散り方は文字から決まる式だけ）', () => {
    for (const f of readdirSync(fxDir).filter((x) => /\.tsx?$/.test(x))) {
      const src = readFileSync(join(fxDir, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      expect(/Math\.random/.test(src), `${f} が Math.random を使っている`).toBe(false);
      expect(/Date\.now/.test(src), `${f} が Date.now を使っている`).toBe(false);
    }
  });

  it('PixiJS を読み込むのは演出の描き手（stage.ts）だけ。窓口は後から読み込む（動的 import）', () => {
    const files = readdirSync(fxDir).filter((x) => /\.tsx?$/.test(x));
    for (const f of files) {
      const src = readFileSync(join(fxDir, f), 'utf8');
      expect(/from\s+['"]pixi\.js/.test(src) || /import\s+['"]pixi\.js/.test(src), f).toBe(f === 'stage.ts');
    }
    const index = readFileSync(join(fxDir, 'index.ts'), 'utf8');
    expect(index).toContain("import('./stage')");
    expect(/from\s+['"]\.\/stage['"]/.test(index)).toBe(false);
    // eval を使わずに動かす（公開用の CSP は script-src 'self' のまま）
    expect(readFileSync(join(fxDir, 'stage.ts'), 'utf8')).toContain("import 'pixi.js/unsafe-eval';");
  });
});
