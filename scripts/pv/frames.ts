import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { chromium } from '@playwright/test';

/**
 * 録った PV から、指定した秒のコマを PNG にして取り出す（確かめるため）。
 * npx tsx scripts/pv/frames.ts 出力先 秒,秒,...（動画は pv/laplace-garden-pv.mp4）
 */
const VIDEO = process.env.PV_OUT ? `pv/${process.env.PV_OUT}` : 'pv/laplace-garden-pv.mp4';
const OUT = process.argv[2]!;
const TIMES = process.argv[3]!.split(',').map(Number);
mkdirSync(OUT, { recursive: true });
const server = createServer((req, res) => {
  if (req.url?.startsWith('/v.mp4')) {
    const size = statSync(VIDEO).size;
    const range = req.headers.range;
    if (range) {
      const [s, e] = range.replace('bytes=', '').split('-');
      const start = Number(s);
      const end = e ? Number(e) : size - 1;
      res.writeHead(206, { 'content-type': 'video/mp4', 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1 });
      res.end(readFileSync(VIDEO).subarray(start, end + 1));
    } else {
      res.writeHead(200, { 'content-type': 'video/mp4', 'accept-ranges': 'bytes', 'content-length': size });
      res.end(readFileSync(VIDEO));
    }
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><body style="margin:0;background:#000"><video id="v" src="/v.mp4" muted style="display:block;width:1080px;height:1920px"></video></body>');
});
await new Promise<void>((r) => server.listen(4311, r));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto('http://localhost:4311/');
const info = await page.evaluate(
  () =>
    new Promise<{ d: number; w: number; h: number }>((r) => {
      // 名前つきの関数を置かない（tsx が __name を差し込み、ページの中で動かなくなる）
      const v = document.getElementById('v') as HTMLVideoElement;
      if (v.readyState >= 1) r({ d: v.duration, w: v.videoWidth, h: v.videoHeight });
      else v.addEventListener('loadedmetadata', () => r({ d: v.duration, w: v.videoWidth, h: v.videoHeight }), { once: true });
    }),
);
console.log('長さ', info.d.toFixed(2), '秒', `${info.w}×${info.h}`);
for (const t of TIMES) {
  await page.evaluate(
    (s) =>
      new Promise<void>((r) => {
        const v = document.getElementById('v') as HTMLVideoElement;
        v.addEventListener('seeked', () => r(), { once: true });
        v.currentTime = s;
      }),
    t,
  );
  await page.waitForTimeout(150);
  await page.locator('#v').screenshot({ path: `${OUT}/f${String(Math.round(t * 10)).padStart(4, '0')}.png` });
}
await browser.close();
server.close();
