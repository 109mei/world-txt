import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 安全の決まり（CLAUDE.md）：文字列を HTML やスクリプトとして差し込む書き方を使わない。
 * 公開用の CSP（vite.config.ts）と Trusted Types はブラウザの側でも止めるが、コードにも入れない
 */

const root = fileURLToPath(new URL('../', import.meta.url));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

/** コメントを除いたソース（説明の中の言葉は数えない） */
function code(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const FORBIDDEN: [RegExp, string][] = [
  [/\.innerHTML\b/, 'innerHTML'],
  [/\.outerHTML\b/, 'outerHTML'],
  [/insertAdjacentHTML/, 'insertAdjacentHTML'],
  [/dangerouslySetInnerHTML/, 'dangerouslySetInnerHTML'],
  [/document\.write/, 'document.write'],
  [/(^|[^.\w])eval\s*\(/, 'eval'],
  [/new\s+Function\s*\(/, 'new Function'],
  [/set(Timeout|Interval)\(\s*['"`]/, '文字列を渡す setTimeout・setInterval'],
  [/javascript:/, 'javascript: の URL'],
  [/createContextualFragment|DOMParser/, '文字列から DOM を作る'],
];

describe('安全の決まり', () => {
  const src = files(join(root, 'src'));

  it('src に、文字列を HTML やスクリプトとして差し込む書き方がない', () => {
    expect(src.length).toBeGreaterThan(50);
    for (const f of src) {
      const text = code(f);
      for (const [re, what] of FORBIDDEN) expect(re.test(text), `${f.slice(root.length)} が ${what} を使っている`).toBe(false);
    }
  });

  it('別の窓で開くリンクは、開いた先から元の画面に触れさせない（rel="noopener noreferrer"）', () => {
    for (const f of src) {
      for (const m of code(f).matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) expect(m[0], f.slice(root.length)).toMatch(/rel="noopener noreferrer"/);
    }
  });

  it('公開用の CSP：スクリプトはこのサイトのものだけ（インラインと eval なし）、Trusted Types、worker・iframe・object・フォームの送り先なし', () => {
    const config = readFileSync(join(root, 'vite.config.ts'), 'utf8');
    const csp = /CONTENT_SECURITY_POLICY = \[([\s\S]*?)\]\.join/.exec(config)?.[1] ?? '';
    for (const d of [
      `"script-src 'self'"`,
      `"object-src 'none'"`,
      `"worker-src 'none'"`,
      `"frame-src 'none'"`,
      `"base-uri 'self'"`,
      `"form-action 'none'"`,
      `"require-trusted-types-for 'script'"`,
      `"trusted-types 'none'"`,
      `"connect-src 'self'"`,
    ])
      expect(csp, d).toContain(d);
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|\*/);
  });

  it('よそのサイトへ、このページの住所を伝えない（referrer）', () => {
    expect(readFileSync(join(root, 'index.html'), 'utf8')).toContain('<meta name="referrer" content="no-referrer" />');
  });

  it('GitHub Actions：外の手順はコミットの番号で留め、依存のスクリプトを走らせず、権限は役目ごとに最小', () => {
    const wf = readFileSync(join(root, '.github/workflows/deploy.yml'), 'utf8');
    for (const m of wf.matchAll(/uses:\s*([^\s#]+)/g)) expect(m[1], m[1]).toMatch(/@[0-9a-f]{40}$/);
    expect(wf).toContain('npm ci --ignore-scripts');
    expect(wf).toContain('npm audit --omit=dev');
    expect(wf).toMatch(/^permissions:\n {2}contents: read\n/m);
    expect(wf).toContain('persist-credentials: false');
  });
});
