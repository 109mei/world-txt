/**
 * BGM（The Unfolded Manuscript）。ブラウザは操作の前に音を鳴らせないので、
 * 最初のタップで鳴らし始める。音量はゆっくり上げる。
 * iPhone では audio.volume を変えられないので、WebAudio の音量つまみ（GainNode）を通して鳴らす。
 */
let audio: HTMLAudioElement | null = null;
let fadeTimer: number | null = null;
let wanted = false;
let volume = 0.6;
let ac: AudioContext | null = null;
let gain: GainNode | null = null;
let triedGain = false;

function element(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(`${import.meta.env.BASE_URL}audio/bgm.mp3`);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
  }
  return audio;
}

/** 音量つまみにつなぐ（一度だけ試す。つなげなければ audio.volume で音量を変える） */
function gainNode(el: HTMLAudioElement): GainNode | null {
  if (gain || triedGain) return gain;
  triedGain = true;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    const src = ac.createMediaElementSource(el);
    gain = ac.createGain();
    gain.gain.value = el.volume;
    src.connect(gain).connect(ac.destination);
    el.volume = 1;
    return gain;
  } catch {
    ac = null;
    gain = null;
    return null;
  }
}

function fadeTo(target: number, ms = 1600): void {
  const el = element();
  if (fadeTimer !== null) {
    window.clearInterval(fadeTimer);
    window.clearTimeout(fadeTimer);
    fadeTimer = null;
  }
  const g = gainNode(el);
  if (g && ac) {
    if (ac.state === 'suspended') void ac.resume();
    const now = ac.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(target, now + ms / 1000);
    if (target === 0) {
      fadeTimer = window.setTimeout(() => {
        fadeTimer = null;
        el.pause();
      }, ms);
    }
    return;
  }
  const start = el.volume;
  const t0 = performance.now();
  fadeTimer = window.setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    el.volume = Math.max(0, Math.min(1, start + (target - start) * k));
    if (k >= 1) {
      window.clearInterval(fadeTimer!);
      fadeTimer = null;
      if (target === 0) el.pause();
    }
  }, 50);
}

/** 設定に合わせて鳴らす・止める（ユーザーの操作の中で呼ぶ） */
export function syncBgm(enabled: boolean, vol: number): void {
  wanted = enabled;
  volume = vol;
  const el = element();
  if (enabled) {
    const p = el.play();
    if (p) p.catch(() => undefined);
    fadeTo(volume);
  } else if (!el.paused) {
    fadeTo(0, 600);
  }
}

/** 画面が隠れたら止め、戻ったら続きから鳴らす */
export function onVisibility(hidden: boolean): void {
  if (!audio || !wanted) return;
  if (hidden) audio.pause();
  else {
    if (ac && ac.state === 'suspended') void ac.resume();
    audio.play().catch(() => undefined);
  }
}

export function bgmPlaying(): boolean {
  return !!audio && !audio.paused;
}
