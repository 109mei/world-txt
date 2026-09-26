import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { chromium } from '@playwright/test';

/**
 * BGM（public/audio/bgm.mp3）の拍と盛り上がりを調べる（PV の切り替えを拍に合わせるため）。
 * 音の立ち上がり（onset）の強さを 10ミリ秒ごとに出し、自己相関でテンポ（1分あたりの拍）と拍の位置を求める。
 * 結果は pv/beats.json（tempo・拍の秒・1秒ごとの大きさ）
 */
const server = createServer((req, res) => {
  if (req.url === '/bgm.mp3') {
    res.writeHead(200, { 'content-type': 'audio/mpeg', 'content-length': statSync('public/audio/bgm.mp3').size });
    res.end(readFileSync('public/audio/bgm.mp3'));
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><title>拍</title>');
});
await new Promise<void>((r) => server.listen(4314, r));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:4314/');
await page.evaluate('window.__name = (f) => f');
const out = await page.evaluate(async () => {
  const rate = 22050;
  const ctx = new OfflineAudioContext(1, rate * 200, rate);
  const buf = await ctx.decodeAudioData(await (await fetch('/bgm.mp3')).arrayBuffer());
  const L = buf.getChannelData(0);
  const R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
  const hop = Math.round(rate * 0.01);
  const n = Math.floor(L.length / hop);
  const energy = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = i * hop; j < (i + 1) * hop; j++) {
      const x = (L[j]! + R[j]!) / 2;
      s += x * x;
    }
    energy[i] = Math.sqrt(s / hop);
  }
  // 立ち上がり：大きさの対数の増え分（正の所だけ）
  const flux = new Float32Array(n);
  for (let i = 1; i < n; i++) flux[i] = Math.max(0, Math.log(1e-4 + energy[i]!) - Math.log(1e-4 + energy[i - 1]!));
  // 自己相関でテンポ（50〜160 BPM）
  let best = 0;
  let bestLag = 0;
  const scores: [number, number][] = [];
  for (let lag = Math.round(6000 / 160); lag <= Math.round(6000 / 50); lag++) {
    let s = 0;
    for (let i = lag; i < n; i++) s += flux[i]! * flux[i - lag]!;
    scores.push([6000 / lag, s]);
    if (s > best) {
      best = s;
      bestLag = lag;
    }
  }
  // 拍の位置：その間隔で並べたときに立ち上がりの合計がいちばん大きいずれ
  let bestPhase = 0;
  let bestSum = -1;
  for (let p = 0; p < bestLag; p++) {
    let s = 0;
    for (let i = p; i < n; i += bestLag) s += flux[i]!;
    if (s > bestSum) {
      bestSum = s;
      bestPhase = p;
    }
  }
  const beats: number[] = [];
  for (let i = bestPhase; i < Math.min(n, 12000); i += bestLag) beats.push(Math.round(i) / 100);
  const perSec: number[] = [];
  for (let s = 0; s < Math.min(120, n / 100); s++) {
    let m = 0;
    for (let i = s * 100; i < (s + 1) * 100; i++) m = Math.max(m, energy[i]!);
    perSec.push(Math.round(m * 1000) / 1000);
  }
  // 強い立ち上がりの時刻（上位）
  const peaks: [number, number][] = [];
  for (let i = 2; i < Math.min(n, 12000) - 2; i++) if (flux[i]! > flux[i - 1]! && flux[i]! >= flux[i + 1]! && flux[i]! > 0.35) peaks.push([i / 100, Math.round(flux[i]! * 100) / 100]);
  peaks.sort((a, b) => b[1] - a[1]);
  const top = scores
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([b, s]) => `${b.toFixed(1)}BPM:${s.toFixed(1)}`);
  return { duration: buf.duration, tempo: 6000 / bestLag, top, beats, perSec, peaks: peaks.slice(0, 40).sort((a, b) => a[0] - b[0]) };
});
writeFileSync('pv/beats.json', JSON.stringify(out));
console.log(`長さ ${out.duration.toFixed(1)}秒  テンポ ${out.tempo.toFixed(1)} BPM  候補 ${out.top.join(' ')}`);
console.log('1秒ごとの大きさ', out.perSec.map((v, i) => `${i}:${v}`).join(' '));
console.log('強い立ち上がり', out.peaks.map(([t, v]) => `${t}s(${v})`).join(' '));
await browser.close();
server.close();
