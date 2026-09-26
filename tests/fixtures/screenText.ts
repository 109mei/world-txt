import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 画面に出る文字を集める（常用漢字の外の字を検べるため）。
 * - src/ui・src/store の .ts/.tsx のうち、コメントを除いた文字列と JSX の文字
 * - src/data の JSON のうち、画面に出る文（読み取りの規則・言葉の辞書・条件は除く）
 * 戻り値は [どこ, 文字列] の並び
 */
const SKIP_KEYS = new Set([
  'match',
  'subject',
  'topic',
  'exists',
  'when',
  'covers',
  'keeps',
  'breakWhen',
  'groups',
  'synonyms',
  'english',
  'common',
  'kinds',
  'suffixes',
  'gaVerbs',
  'strength',
  'modes',
  'blame',
  'progress',
  'world',
  'id',
  'icon',
  'category',
  'severity',
  'noun',
]);

function walk(dir: string, out: string[]): void {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
}

/** コメントを取り除く（文字列の中の // は残す、おおまかな字句解析） */
function stripComments(src: string): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;
  while (i < src.length) {
    const c = src[i]!;
    const n = src[i + 1];
    if (quote) {
      out += c;
      if (c === '\\') {
        out += n ?? '';
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && n === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    // JSX のコメント {/* */} も上で消える
    if (c === "'" || c === '"' || c === '`') quote = c;
    out += c;
    i += 1;
  }
  return out;
}

function jsonTexts(v: unknown, where: string, out: [string, string][], key = ''): void {
  if (SKIP_KEYS.has(key)) return;
  if (typeof v === 'string') out.push([where, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => jsonTexts(x, `${where}[${i}]`, out, key));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) jsonTexts(x, `${where}.${k}`, out, k);
}

export function screenTexts(root: string): [string, string][] {
  const out: [string, string][] = [];
  const code: string[] = [];
  walk(join(root, 'src/ui'), code);
  walk(join(root, 'src/store'), code);
  for (const f of code) {
    // 入力の補助（wording.ts）の動詞の一覧は、書いた人の言葉を言い換えるためのもので、画面には書いた人の言葉として出る
    if (!/\.tsx?$/.test(f) || /wording\.ts$/.test(f)) continue;
    out.push([f, stripComments(readFileSync(f, 'utf-8'))]);
  }
  // ゲームの中の知らせ（core が書く文。読み取りの規則の言葉は除く）
  for (const f of ['game.ts', 'signs.ts', 'write.ts']) out.push([join(root, 'src/core', f), stripComments(readFileSync(join(root, 'src/core', f), 'utf-8'))]);
  const data: string[] = [];
  walk(join(root, 'src/data'), data);
  for (const f of data) {
    if (!f.endsWith('.json') || f.endsWith('lexicon.json')) continue;
    jsonTexts(JSON.parse(readFileSync(f, 'utf-8')), f, out);
  }
  return out;
}
