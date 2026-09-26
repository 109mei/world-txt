import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * 明るい画面と暗い画面（P21・分析の12章）：すべての文字の色と、すべての地の組み合わせで、明るさの比が4.5:1以上
 */

const css = readFileSync('src/ui/styles.css', 'utf8');

/** 「:root, .theme-night {」（暗い画面と、タイトルの夜の絵）と「:root[data-theme='light'] {」の中の、色の変数（#rrggbb） */
function tokens(head: string): Record<string, string> {
  const at = css.indexOf(head);
  const body = css.slice(at, css.indexOf('\n}', at));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/gu)) out[m[1]!] = m[2]!.toLowerCase();
  return out;
}

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

export function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

const TEXT = ['text', 'text-soft', 'dim', 'faint', 'silver', 'ink', 'unknown', 'good', 'ok', 'warn', 'bad', 'critical'];
const GROUND = ['bg', 'card', 'card-warm'];

describe('文字の見やすさ（明るさの比）', () => {
  for (const [name, head] of [
    ['暗い画面', '.theme-night {'],
    ['明るい画面', ":root[data-theme='light'] {"],
  ] as const) {
    it(`${name}：すべての文字の色とすべての地の組み合わせで 4.5:1 以上`, () => {
      const t = tokens(head);
      const low: string[] = [];
      for (const fg of TEXT) {
        for (const bg of GROUND) {
          expect(t[fg], `${name} --${fg}`).toBeDefined();
          expect(t[bg], `${name} --${bg}`).toBeDefined();
          const r = ratio(t[fg]!, t[bg]!);
          if (r < 4.5) low.push(`--${fg} × --${bg} = ${r.toFixed(2)}`);
        }
      }
      expect(low).toEqual([]);
    });
  }

  it('明るい画面の値は、端末の設定（自動）の明るい画面にも同じものが入っている', () => {
    const light = tokens(":root[data-theme='light'] {");
    const at = css.indexOf("@media (prefers-color-scheme: light)");
    const auto = tokens(css.slice(at).startsWith('@media') ? "@media (prefers-color-scheme: light)" : '');
    for (const [k, v] of Object.entries(light)) expect(auto[k], k).toBe(v);
  });
});
