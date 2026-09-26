import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JOYO, JOYO_SET } from './fixtures/joyo';
import { screenTexts } from './fixtures/screenText';

/**
 * 画面の言葉（P13・docs/TERMS.md）：常用漢字表（2010年）の外の字は、用語表で許した字だけ。
 * 画面の部品の文字・ゲームの知らせ・データの文（読み取りの規則と言葉の辞書は除く）を検べる
 */
describe('画面の言葉', () => {
  it('常用漢字表の外の字は、用語表で許した字だけ', () => {
    const terms = readFileSync('docs/TERMS.md', 'utf-8');
    const section = terms.slice(terms.indexOf('## 常用漢字の外の字'));
    const allowed = new Set([...section.matchAll(/^\| (\S) \|/gmu)].map((m) => m[1]!));
    const bad = new Map<string, string>();
    for (const [where, text] of screenTexts('.')) {
      for (const c of Array.from(text)) {
        if (!/\p{sc=Han}/u.test(c) || c === '々' || JOYO_SET.has(c) || allowed.has(c)) continue;
        if (!bad.has(c)) bad.set(c, where.split('\\').join('/'));
      }
    }
    expect([...bad].map(([c, w]) => `${c}（${w}）`)).toEqual([]);
  });

  it('用語表の「使わない言葉」を画面に出さない（ほかの意味と取り違えにくい言葉）', () => {
    // 三体問題・臨界減速は、ノートの「現実では」（現実のカード）でだけ教えるので、ここでは数えない
    const words = ['定義', '兆候', '空き地', '書換の力', '手入れの回数', '世界容量', '庭の広さ', '手帖', '観測記録', '石の蓋', '種をまく', '接ぎ木', 'フラグ', 'モード', '適応'];
    const bad: string[] = [];
    for (const [where, text] of screenTexts('.')) {
      for (const w of words) if (text.includes(w)) bad.push(`${w}（${where.split('\\').join('/')}）`);
    }
    expect(bad).toEqual([]);
  });

  it('画面の文字に記号と絵文字を使わない（アイコンは SVG で描き、言葉を添える。→ は「前 → 後」にだけ使ってよい）', () => {
    const symbols = /[✓✔○◯●◎∞✎✏⇈⇊↑↓↗↘↙↖■□◆◇★☆▲△▼▽├└┃━╍┄╸※♪♥☀☁☂⚡⚠]|\p{Extended_Pictographic}/u;
    const bad: string[] = [];
    for (const [where, text] of screenTexts('.')) {
      const m = text.match(symbols);
      if (m) bad.push(`${m[0]}（${where.split('\\').join('/')}）`);
    }
    expect(bad).toEqual([]);
  });

  it('1つの文だけの表示の文には「。」を付けない（説明の文と、WORLD.txt の行・書く文の例は「。」で終える）', () => {
    // 世界の文章：法則の行（laws の text）と、書き足す文の例（phrases の example）と、序章の手引きの手本（stages の example）
    const world = new Set(['laws.json:text', 'phrases.json:example', 'stages.json:example']);
    const bad: string[] = [];
    const walk = (v: unknown, file: string, key: string): void => {
      if (typeof v === 'string') {
        const t = v.trim();
        if (t.endsWith('。') && t.split('。').length === 2 && !world.has(`${file}:${key}`)) bad.push(`${file}:${key} ${t}`);
      } else if (Array.isArray(v)) v.forEach((x) => walk(x, file, key));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, file, k);
    };
    for (const f of readdirSync('src/data')) if (f.endsWith('.json')) walk(JSON.parse(readFileSync(join('src/data', f), 'utf-8')), f, '');
    expect(bad).toEqual([]);
  });

  it('常用漢字の一覧は2136字（2010年の常用漢字表）', () => {
    expect(new Set(Array.from(JOYO)).size).toBe(2136);
  });
});
