/**
 * 効果音。音の素材は使わず、その場で合成する（ペンの音・ページをめくる音・発見の鈴・重大な出来事の低い音）。
 * ブラウザは操作の前に音を鳴らせないので、最初に鳴らすのは必ずタップの中から。
 */
let ctx: AudioContext | null = null;
let enabled = true;
let volume = 0.6;

export function syncSe(on: boolean, vol: number): void {
  enabled = on;
  volume = vol;
}

function audio(): AudioContext | null {
  if (!enabled || volume <= 0) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** ノイズの呼ばれた回数（同じ音が続けて鳴っても、少しずつ違う揺らぎにする） */
let noiseCount = 0;

/**
 * 白いノイズ（ペン・紙の音のもと）。さいころは振らない：音の長さと鳴った回数から決まる式（xorshift）で作る。
 * 同じ長さの音も、鳴るたびに揺らぎの始まりがずれる
 */
function noise(ac: AudioContext, seconds: number): AudioBufferSourceNode {
  const len = Math.max(1, Math.floor(ac.sampleRate * seconds));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  noiseCount = (noiseCount + 1) % 64;
  let x = (Math.imul(len, 2654435761) ^ Math.imul(noiseCount + 1, 40503)) >>> 0 || 1;
  for (let i = 0; i < len; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    data[i] = (x >>> 0) / 2147483648 - 1;
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  return src;
}

function gainEnvelope(ac: AudioContext, peak: number, attack: number, release: number): GainNode {
  const g = ac.createGain();
  const t = ac.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * volume), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  return g;
}

/** 書き換えた：紙の上をペンが走る音 */
export function seWrite(): void {
  const ac = audio();
  if (!ac) return;
  const src = noise(ac, 0.22);
  const band = ac.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.setValueAtTime(2600, ac.currentTime);
  band.frequency.linearRampToValueAtTime(4200, ac.currentTime + 0.18);
  band.Q.value = 1.4;
  const g = gainEnvelope(ac, 0.16, 0.02, 0.2);
  src.connect(band).connect(g).connect(ac.destination);
  src.start();
}

/** 時が流れる：ページをめくる音 */
export function seTurn(): void {
  const ac = audio();
  if (!ac) return;
  const src = noise(ac, 0.5);
  const band = ac.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.setValueAtTime(700, ac.currentTime);
  band.frequency.exponentialRampToValueAtTime(3200, ac.currentTime + 0.32);
  band.Q.value = 0.8;
  const g = gainEnvelope(ac, 0.2, 0.08, 0.38);
  src.connect(band).connect(g).connect(ac.destination);
  src.start();
}

function tone(ac: AudioContext, freq: number, peak: number, attack: number, release: number, type: OscillatorType = 'sine', delay = 0): void {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = ac.createGain();
  const t = ac.currentTime + delay;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * volume), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + attack + release + 0.05);
}

/** 書いた一文が世界に効き始めた：ペン先が紙をかすめ、インクがにじむ音 */
export function seInk(): void {
  const ac = audio();
  if (!ac) return;
  const src = noise(ac, 0.34);
  const band = ac.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.setValueAtTime(1800, ac.currentTime);
  band.frequency.exponentialRampToValueAtTime(5200, ac.currentTime + 0.3);
  band.Q.value = 2.2;
  const g = gainEnvelope(ac, 0.11, 0.04, 0.3);
  src.connect(band).connect(g).connect(ac.destination);
  src.start();
  tone(ac, 880, 0.035, 0.02, 0.7, 'sine', 0.12);
}

/** 観測記録に新しいものが加わった：小さな鈴 */
export function seChime(): void {
  const ac = audio();
  if (!ac) return;
  tone(ac, 1318.5, 0.07, 0.01, 1.1);
  tone(ac, 1975.5, 0.04, 0.01, 0.9, 'sine', 0.09);
}

/** 重大な出来事：遠くで鳴る低い音 */
export function seWarn(): void {
  const ac = audio();
  if (!ac) return;
  tone(ac, 98, 0.16, 0.12, 1.6, 'triangle');
  tone(ac, 146.8, 0.06, 0.2, 1.3, 'sine', 0.05);
}

/** 計算：歯車の刻む音と、紙のこすれる音（計算の演出のあいだ） */
export function seCompute(): void {
  const ac = audio();
  if (!ac) return;
  // 歯車：短い高い刻みを4つ
  for (let i = 0; i < 4; i++) tone(ac, 2400 - i * 120, 0.03, 0.002, 0.05, 'square', i * 0.14);
  // 紙：ページをめくるより短く柔らかい音
  const src = noise(ac, 0.6);
  const band = ac.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.setValueAtTime(1200, ac.currentTime);
  band.frequency.linearRampToValueAtTime(2400, ac.currentTime + 0.55);
  band.Q.value = 0.9;
  const g = gainEnvelope(ac, 0.06, 0.12, 0.45);
  src.connect(band).connect(g).connect(ac.destination);
  src.start();
}

/** 因果の線が伸びた：弦をはじく音（n 番目ほど少し高い） */
export function seString(n: number): void {
  const ac = audio();
  if (!ac) return;
  const base = 330 * 2 ** ((Math.min(n, 6) * 2) / 12);
  tone(ac, base, 0.05, 0.004, 0.9, 'triangle');
  tone(ac, base * 2, 0.018, 0.004, 0.5, 'sine');
}

/** 想定外の変化に届いた：不協和の一音（短2度） */
export function seDissonant(): void {
  const ac = audio();
  if (!ac) return;
  tone(ac, 415.3, 0.05, 0.01, 0.8, 'sawtooth');
  tone(ac, 440, 0.045, 0.01, 0.8, 'sawtooth');
}
