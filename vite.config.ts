import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * 読み込めるものを絞る決まり（Content Security Policy）。
 * スクリプト・書体・通信は、どれもこのサイトのものだけ（書体は @fontsource で npm から入れ、ビルドに入れる）。
 * Trusted Types：文字列を HTML やスクリプトとして差し込む書き方（innerHTML・eval など）を、ブラウザの側でも禁じる（決まりを作る口もなし）。
 * GitHub Pages では応答の見出しを設定できないので、index.html の meta に書く（frame-ancestors は meta では効かない）
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "require-trusted-types-for 'script'",
  "trusted-types 'none'",
  'upgrade-insecure-requests',
].join('; ');

/** 公開用のビルドにだけ CSP を入れる（開発中の Vite は、その場でスクリプトを差し込むため） */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'world-txt-content-security-policy',
    apply: 'build',
    transformIndexHtml(html) {
      const meta = `<meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`;
      if (!html.includes('<meta charset="UTF-8" />')) throw new Error('index.html に <meta charset="UTF-8" /> がない');
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${meta}`);
    },
  };
}

/**
 * 書体（@fontsource）の CSS から、今のブラウザが使わない woff の指定を外す（woff2 だけをビルドに入れる）。
 * 和文の書体は字の範囲ごとに約120のファイルに分かれていて、画面に出る字の分だけを読み込む
 */
function woff2Only(): Plugin {
  return {
    name: 'world-txt-woff2-only',
    enforce: 'pre',
    transform(code, id) {
      if (!/[\\/]@fontsource[\\/][^?]*\.css(\?|$)/.test(id)) return null;
      return code.replace(/,\s*url\([^)]*\.woff\)\s*format\('woff'\)/g, '');
    },
  };
}

/** 版の番号（「このゲームについて」に出す） */
const version = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;

export default defineConfig({
  base: '/world-txt/',
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [react(), contentSecurityPolicy(), woff2Only()],
  // 内容のデータ（法則・出来事・副作用の文章）を1つにまとめているので、既定の 500kB を少し超える
  build: {
    chunkSizeWarningLimit: 700,
    // 書体の小さなかけらも、ページに埋め込まず（data: の URL にせず）ファイルのまま置く（CSP の font-src 'self' のため）
    assetsInlineLimit: (file: string) => (/\.woff2?$/.test(file) ? false : undefined),
  },
  server: { port: 5174 },
  preview: { port: 4174 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
  },
});
