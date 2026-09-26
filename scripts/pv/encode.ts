import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { buildMp4, type AudioSample, type VideoSample } from './mp4';

/**
 * record.ts が録ったコマ（pv/frames）と BGM（public/audio/bgm.mp3）から、PV の MP4 を作る。
 * 映像：コマに仕上げ（色の整え・周辺を暗く・フィルムの粒子）と、合図（cue）の閃光・揺れ・残像（速く振るカメラ）を重ねる。
 * 音：BGM に、合図の効果音（場面が移る音・ドン・盛り上がる音・低い braam・打つ音・鐘）をその場で合成して重ね、
 *     ドンの所では BGM を少し下げる。どの効果音も Web Audio で作る（ダウンロードした素材は使わない）。
 * Chrome の WebCodecs で H.264（1080×1920・30コマ）と AAC に変換し、scripts/pv/mp4.ts で組み立てる。
 * 使い方：npx tsx scripts/pv/encode.ts（出力は pv/laplace-garden-pv.mp4）
 */
const FRAMES = 'pv/frames';
const OUT = join('pv', process.env.PV_OUT ?? 'laplace-garden-pv.mp4');
const FPS = 30;
const W = 1080;
const H = 1920;
type Cue = { t: number; kind: string; dur?: number; amp?: number; n?: number; step?: number };
const idx = JSON.parse(readFileSync(join(FRAMES, 'index.json'), 'utf8')) as { start: number; end: number; fadeIn: number; fadeOutAt: number; frames: { t: number; f: string }[]; cues: Cue[] };
const total = idx.end - idx.start;
const N = Math.round(total * FPS);
const cues = idx.cues ?? [];

/** そのコマの仕上げ：揺れ（dx・dy・拡大）・閃光（白の濃さ）・残像（横のぶれの幅） */
function fxAt(t: number, i: number): { dx: number; dy: number; z: number; flash: number; whip: number } {
  let dx = 0;
  let dy = 0;
  let z = 1;
  let flash = 0;
  let whip = 0;
  // 決まった乱れ（同じコマなら同じ揺れ）
  const rnd = (k: number) => {
    let x = Math.imul(i * 374761393 + k * 668265263, 1274126177) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 1103515245) >>> 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296 - 0.5;
  };
  for (const c of cues) {
    const d = t - c.t;
    if (c.kind === 'shake' && d >= 0 && d < (c.dur ?? 0.25)) {
      const k = 1 - d / (c.dur ?? 0.25);
      dx += (c.amp ?? 12) * k * rnd(1) * 2;
      dy += (c.amp ?? 12) * k * rnd(2) * 2;
      z = Math.max(z, 1 + 0.03 * k);
    }
    if (c.kind === 'flash' && d >= 0 && d < 0.32) flash = Math.max(flash, (c.amp ?? 0.8) * (1 - d / 0.32));
    if (c.kind === 'whip' && d >= 0 && d < (c.dur ?? 0.35)) whip = Math.max(whip, Math.sin((Math.PI * d) / (c.dur ?? 0.35)) * 70);
  }
  return { dx, dy, z, flash, whip };
}

// 暗号化されていない localhost で WebCodecs を使うため、小さなページを置く
const server = createServer((req, res) => {
  if (req.url === '/bgm.mp3') {
    res.writeHead(200, { 'content-type': 'audio/mpeg', 'content-length': statSync('public/audio/bgm.mp3').size });
    res.end(readFileSync('public/audio/bgm.mp3'));
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><title>PV の変換</title>');
});
await new Promise<void>((r) => server.listen(4312, r));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:4312/');
// tsx は関数に名前をつける補助（__name）を差し込むので、ページの側にも置く
await page.evaluate('window.__name = (f) => f');

const video: (VideoSample & { seq: number })[] = [];
const audio: (AudioSample & { seq: number })[] = [];
let avcC: Buffer | null = null;
let asc: Buffer | null = null;
let failed: string | null = null;
await page.exposeFunction('vOut', (seq: number, b64: string, ts: number, key: boolean, desc: string | null) => {
  video.push({ seq, data: Buffer.from(b64, 'base64'), ts, key });
  if (desc) avcC = Buffer.from(desc, 'base64');
});
await page.exposeFunction('aOut', (seq: number, b64: string, ts: number, desc: string | null) => {
  audio.push({ seq, data: Buffer.from(b64, 'base64'), ts });
  if (desc) asc = Buffer.from(desc, 'base64');
});
await page.exposeFunction('fail', (m: string) => {
  failed = m;
});

// ページの中：コマに仕上げを重ねて H.264 に変換する道具
await page.evaluate(
  ([w, h, fps]) => {
    const b64 = (u: Uint8Array) => {
      let s = '';
      for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
      return btoa(s);
    };
    const bytes = (d: AllowSharedBufferSource) =>
      d instanceof ArrayBuffer ? new Uint8Array(d) : new Uint8Array((d as ArrayBufferView).buffer, (d as ArrayBufferView).byteOffset, (d as ArrayBufferView).byteLength);
    let vSeq = 0;
    const enc = new VideoEncoder({
      output: (chunk, meta) => {
        const u = new Uint8Array(chunk.byteLength);
        chunk.copyTo(u);
        const d = meta?.decoderConfig?.description;
        void (window as unknown as { vOut: (...a: unknown[]) => Promise<void> }).vOut(vSeq++, b64(u), chunk.timestamp, chunk.type === 'key', d ? b64(bytes(d)) : null);
      },
      error: (e) => void (window as unknown as { fail: (m: string) => void }).fail(String(e)),
    });
    enc.configure({ codec: 'avc1.640032', width: w, height: h, bitrate: 9_000_000, framerate: fps, avc: { format: 'avc' }, latencyMode: 'quality' });
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d')!;
    // フィルムの粒子（決まった乱れの灰色）
    const grain = new OffscreenCanvas(256, 256);
    const gx = grain.getContext('2d')!;
    const img = gx.createImageData(256, 256);
    let seed = 12345;
    for (let i = 0; i < img.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const v = 96 + (seed >>> 24) * 0.25;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    gx.putImageData(img, 0, 0);
    const pattern = ctx.createPattern(grain, 'repeat')!;
    // 周辺を暗く
    const vignette = ctx.createRadialGradient(w / 2, h * 0.48, h * 0.28, w / 2, h * 0.5, h * 0.72);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
    let last: ImageBitmap | null = null;
    let n = 0;
    (window as unknown as { pvEnc: unknown }).pvEnc = {
      frames: async (list: [string | null, number, boolean, { dx: number; dy: number; z: number; flash: number; whip: number }][]) => {
        for (const [data, ts, key, fx] of list) {
          if (data) {
            last?.close();
            const bin = atob(data);
            const u = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
            last = await createImageBitmap(new Blob([u], { type: 'image/jpeg' }));
          }
          ctx.save();
          ctx.fillStyle = '#050506';
          ctx.fillRect(0, 0, w, h);
          // 色の整え：少しだけ締めて、彩度を落とす
          ctx.filter = 'contrast(1.07) saturate(0.93) brightness(1.02)';
          ctx.translate(w / 2 + fx.dx, h / 2 + fx.dy);
          ctx.scale(fx.z, fx.z);
          ctx.translate(-w / 2, -h / 2);
          if (fx.whip > 1) {
            // 速く振るカメラの残像：横にずらして重ねる
            const k = 9;
            for (let j = 0; j < k; j++) {
              ctx.globalAlpha = 1 / k;
              ctx.drawImage(last!, ((j / (k - 1)) * 2 - 1) * fx.whip, 0);
            }
            ctx.globalAlpha = 1;
          } else ctx.drawImage(last!, 0, 0);
          ctx.restore();
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, w, h);
          ctx.save();
          ctx.globalCompositeOperation = 'overlay';
          ctx.globalAlpha = 0.06;
          ctx.translate(((n * 37) % 256) - 128, ((n * 91) % 256) - 128);
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, w + 256, h + 256);
          ctx.restore();
          if (fx.flash > 0.01) {
            ctx.fillStyle = `rgba(255,255,255,${fx.flash})`;
            ctx.fillRect(0, 0, w, h);
          }
          n++;
          const vf = new VideoFrame(canvas, { timestamp: ts, duration: Math.round(1e6 / fps) });
          enc.encode(vf, { keyFrame: key });
          vf.close();
          while (enc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 3));
        }
      },
      flush: () => enc.flush(),
    };
  },
  [W, H, FPS] as const,
);

// 出すコマごとに、その時刻までに届いたいちばん新しいコマを使う（届かなかった間は前のコマを続ける）
const frames = idx.frames.filter((f) => existsSync(join(FRAMES, f.f)));
let j = 0;
let prev = -1;
const batch: [string | null, number, boolean, ReturnType<typeof fxAt>][] = [];
for (let i = 0; i < N; i++) {
  const t = idx.start + i / FPS;
  while (j + 1 < frames.length && frames[j + 1]!.t <= t) j++;
  const data = j !== prev ? readFileSync(join(FRAMES, frames[j]!.f)).toString('base64') : null;
  prev = j;
  batch.push([data, Math.round((i * 1e6) / FPS), i % (FPS * 2) === 0, fxAt(i / FPS, i)]);
  if (batch.length >= 12 || i === N - 1) {
    await page.evaluate((b) => (window as unknown as { pvEnc: { frames: (l: unknown) => Promise<void> } }).pvEnc.frames(b), batch.splice(0));
    if (failed) throw new Error(failed);
  }
  if (i % (FPS * 10) === 0) console.log(`映像 ${Math.round(i / FPS)}秒 / ${Math.round(total)}秒`);
}
await page.evaluate(() => (window as unknown as { pvEnc: { flush: () => Promise<void> } }).pvEnc.flush());

// 音：BGM（はじめに入り、終わりに消え、ドンの所で少し下がる）と、合図の効果音をその場で合成して重ね、AAC にする
await page.evaluate(
  async ([len, fadeIn, fadeOutAt, cueList]) => {
    const b64 = (u: Uint8Array) => {
      let s = '';
      for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
      return btoa(s);
    };
    const rate = 48000;
    const ctx = new OfflineAudioContext(2, Math.ceil(len * rate), rate);
    const master = ctx.createDynamicsCompressor();
    master.threshold.value = -10;
    master.ratio.value = 4;
    master.connect(ctx.destination);
    // BGM
    const decoded = await ctx.decodeAudioData(await (await fetch('/bgm.mp3')).arrayBuffer());
    const bgm = ctx.createBufferSource();
    bgm.buffer = decoded;
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0, 0);
    bg.gain.linearRampToValueAtTime(0.85, fadeIn);
    const duck = ctx.createGain();
    for (const c of cueList) {
      if (c.kind !== 'impact' && c.kind !== 'braam') continue;
      duck.gain.setValueAtTime(1, Math.max(0, c.t - 0.02));
      duck.gain.linearRampToValueAtTime(0.55, c.t + 0.03);
      duck.gain.linearRampToValueAtTime(1, c.t + (c.kind === 'braam' ? 1.6 : 0.8));
    }
    bg.gain.setValueAtTime(0.85, fadeOutAt);
    bg.gain.linearRampToValueAtTime(0, len);
    bgm.connect(bg).connect(duck).connect(master);
    bgm.start(0);
    // 白い雑音（効果音の材料）
    const noise = ctx.createBuffer(1, rate * 2, rate);
    const nd = noise.getChannelData(0);
    let s = 7;
    for (let i = 0; i < nd.length; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      nd[i] = (s / 4294967296) * 2 - 1;
    }
    const noiseSrc = (t: number, d: number) => {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.start(t, 0, d);
      return src;
    };
    const env = (t: number, peak: number, a: number, d: number) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
      return g;
    };
    // 場面が移る音：帯域を上へ流した雑音を、左から右へ
    const whoosh = (t: number, amp = 1) => {
      const src = noiseSrc(t, 0.8);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(350, t);
      bp.frequency.exponentialRampToValueAtTime(2600, t + 0.45);
      const pan = ctx.createStereoPanner();
      pan.pan.setValueAtTime(-0.7, t);
      pan.pan.linearRampToValueAtTime(0.7, t + 0.6);
      src
        .connect(bp)
        .connect(env(t, 0.45 * amp, 0.22, 0.45))
        .connect(pan)
        .connect(master);
    };
    // ドン：低い音が沈み、はじく音と胴の響き
    const impact = (t: number, amp = 1) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(95, t);
      o.frequency.exponentialRampToValueAtTime(36, t + 0.6);
      o.connect(env(t, 0.95 * amp, 0.006, 1.4)).connect(master);
      o.start(t);
      o.stop(t + 1.6);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2200;
      noiseSrc(t, 0.06)
        .connect(hp)
        .connect(env(t, 0.5 * amp, 0.002, 0.06))
        .connect(master);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 320;
      noiseSrc(t, 0.7)
        .connect(lp)
        .connect(env(t, 0.55 * amp, 0.004, 0.6))
        .connect(master);
    };
    // 盛り上がる音：雑音の帯域と音の高さが上がっていき、ドンの手前で切れる
    const riser = (t: number, d: number) => {
      const src = noiseSrc(t, d);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 2;
      bp.frequency.setValueAtTime(200, t);
      bp.frequency.exponentialRampToValueAtTime(6000, t + d);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.4, t + d * 0.97);
      g.gain.linearRampToValueAtTime(0, t + d);
      src.connect(bp).connect(g).connect(master);
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(900, t + d);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.09, t + d * 0.97);
      og.gain.linearRampToValueAtTime(0, t + d);
      o.connect(og).connect(master);
      o.start(t);
      o.stop(t + d);
    };
    // 映画予告の低い音（braam）：少しずらした鋸の波を重ね、こもった所から開く
    const braam = (t: number) => {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(180, t);
      lp.frequency.exponentialRampToValueAtTime(1100, t + 0.35);
      lp.frequency.exponentialRampToValueAtTime(320, t + 2.6);
      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) {
        const x = (i / 1023) * 2 - 1;
        curve[i] = Math.tanh(2.2 * x);
      }
      shaper.curve = curve;
      const g = env(t, 0.55, 0.05, 2.8);
      lp.connect(shaper).connect(g).connect(master);
      for (const f of [55, 55.6, 82.4, 110.3]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.connect(lp);
        o.start(t);
        o.stop(t + 3);
      }
    };
    // 打つ音（1字ずつ）
    const type = (t: number, n: number, step: number) => {
      for (let i = 0; i < n; i++) {
        const tt = t + i * step;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2600 + (i % 3) * 400;
        bp.Q.value = 3;
        noiseSrc(tt, 0.03)
          .connect(bp)
          .connect(env(tt, 0.5, 0.001, 0.035))
          .connect(master);
      }
    };
    // 鐘（読み取った・題名）
    const stinger = (t: number, amp = 1) => {
      [
        [880, 0.28],
        [1320, 0.14],
        [1760, 0.1],
        [2640, 0.05],
      ].forEach(([f, a]) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f!;
        o.connect(env(t, a! * amp, 0.004, 2.2)).connect(master);
        o.start(t);
        o.stop(t + 2.4);
      });
    };
    // 切るときの小さな音
    const tick = (t: number) => {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 3000;
      noiseSrc(t, 0.02)
        .connect(hp)
        .connect(env(t, 0.35, 0.001, 0.02))
        .connect(master);
    };
    for (const c of cueList) {
      if (c.kind === 'whoosh') whoosh(c.t, c.amp);
      else if (c.kind === 'impact') impact(c.t, c.amp);
      else if (c.kind === 'riser') riser(c.t, c.dur ?? 1.6);
      else if (c.kind === 'braam') braam(c.t);
      else if (c.kind === 'type') type(c.t, c.n ?? 8, c.step ?? 0.17);
      else if (c.kind === 'stinger') stinger(c.t, c.amp);
      else if (c.kind === 'tick') tick(c.t);
    }
    const buf = await ctx.startRendering();
    let seq = 0;
    const aenc = new AudioEncoder({
      output: (chunk, meta) => {
        const u = new Uint8Array(chunk.byteLength);
        chunk.copyTo(u);
        const d = meta?.decoderConfig?.description;
        const desc = d ? b64(d instanceof ArrayBuffer ? new Uint8Array(d) : new Uint8Array((d as ArrayBufferView).buffer, (d as ArrayBufferView).byteOffset, (d as ArrayBufferView).byteLength)) : null;
        void (window as unknown as { aOut: (...a: unknown[]) => Promise<void> }).aOut(seq++, b64(u), chunk.timestamp, desc);
      },
      error: (e) => void (window as unknown as { fail: (m: string) => void }).fail(String(e)),
    });
    aenc.configure({ codec: 'mp4a.40.2', sampleRate: rate, numberOfChannels: 2, bitrate: 192000, aac: { format: 'aac' } } as AudioEncoderConfig);
    const L = buf.getChannelData(0);
    const R = buf.getChannelData(1);
    const step = 4800;
    for (let off = 0; off < buf.length; off += step) {
      const n = Math.min(step, buf.length - off);
      const data = new Float32Array(n * 2);
      data.set(L.subarray(off, off + n), 0);
      data.set(R.subarray(off, off + n), n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: rate, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((off / rate) * 1e6), data });
      aenc.encode(ad);
      ad.close();
    }
    await aenc.flush();
  },
  [total, idx.fadeIn, idx.fadeOutAt, cues] as const,
);
await page.waitForTimeout(500);
if (failed) throw new Error(failed);
await browser.close();
server.close();

video.sort((a, b) => a.seq - b.seq);
audio.sort((a, b) => a.seq - b.seq);
// B フレーム（表示の順と並びの順が違うコマ）がないことを確かめる（この組み立ては表示の順＝並びの順だけを扱う）
for (let i = 1; i < video.length; i++) if (video[i]!.ts <= video[i - 1]!.ts) throw new Error(`映像の時刻が前後している（${i}）`);
// AAC-LC・48kHz・2チャンネルの AudioSpecificConfig（エンコーダーが出さなかったとき）
const ascBuf = asc ?? Buffer.from([0x11, 0x90]);
if (!avcC) throw new Error('映像の設定（avcC）が出なかった');
const mp4 = buildMp4({ width: W, height: H, fps: FPS, avcC, video, sampleRate: 48000, channels: 2, asc: ascBuf, audio });
writeFileSync(OUT, mp4);
console.log(`書き出した ${OUT}：${(mp4.length / 1e6).toFixed(1)}MB・映像 ${video.length}コマ・音 ${audio.length}枠・約${total.toFixed(1)}秒・合図 ${cues.length}`);
