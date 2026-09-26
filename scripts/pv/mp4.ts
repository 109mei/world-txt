/**
 * 小さな MP4 の組み立て：H.264 の映像1本と AAC の音1本を、索引（moov）を先頭に置いた普通の MP4 にする（faststart）。
 * 映像は1コマずつ、音は AAC の1枠（1024サンプル）ずつを1つのかたまりとして、時刻順に並べる
 */

export interface VideoSample {
  data: Buffer;
  /** 表示の時刻（マイクロ秒） */
  ts: number;
  key: boolean;
}
export interface AudioSample {
  data: Buffer;
  ts: number;
}
export interface Mp4Input {
  width: number;
  height: number;
  /** 1コマの長さ（映像の時間の目盛りでいくつか）と、時間の目盛り */
  fps: number;
  /** AVCDecoderConfigurationRecord（VideoEncoder の decoderConfig.description） */
  avcC: Buffer;
  video: VideoSample[];
  sampleRate: number;
  channels: number;
  /** AudioSpecificConfig（AudioEncoder の decoderConfig.description） */
  asc: Buffer;
  audio: AudioSample[];
}

const u8 = (n: number) => Buffer.from([n & 0xff]);
const u16 = (n: number) => {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n);
  return b;
};
const u24 = (n: number) => Buffer.from([(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]);
const u32 = (n: number) => {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0);
  return b;
};
const str = (s: string) => Buffer.from(s, 'latin1');
const box = (type: string, ...parts: Buffer[]) => {
  const body = Buffer.concat(parts);
  return Buffer.concat([u32(body.length + 8), str(type), body]);
};
const full = (type: string, version: number, flags: number, ...parts: Buffer[]) => box(type, u8(version), u24(flags), ...parts);
const MATRIX = Buffer.concat([u32(0x00010000), u32(0), u32(0), u32(0), u32(0x00010000), u32(0), u32(0), u32(0), u32(0x40000000)]);

/** 記述子（esds の中）の長さ：4バイトの形で書く */
function desc(tag: number, body: Buffer): Buffer {
  const n = body.length;
  return Buffer.concat([u8(tag), Buffer.from([0x80 | ((n >> 21) & 0x7f), 0x80 | ((n >> 14) & 0x7f), 0x80 | ((n >> 7) & 0x7f), n & 0x7f]), body]);
}

function stbl(sampleEntry: Buffer, sizes: number[], offsets: number[], deltas: [number, number][], syncs: number[] | null): Buffer {
  const stts = full('stts', 0, 0, u32(deltas.length), ...deltas.flatMap(([c, d]) => [u32(c), u32(d)]));
  const stsc = full('stsc', 0, 0, u32(1), u32(1), u32(1), u32(1));
  const stsz = full('stsz', 0, 0, u32(0), u32(sizes.length), ...sizes.map(u32));
  const stco = full('stco', 0, 0, u32(offsets.length), ...offsets.map(u32));
  const parts = [full('stsd', 0, 0, u32(1), sampleEntry), stts];
  if (syncs) parts.push(full('stss', 0, 0, u32(syncs.length), ...syncs.map(u32)));
  parts.push(stsc, stsz, stco);
  return box('stbl', ...parts);
}

/** 同じ長さが続く所をまとめる（stts） */
function runs(durations: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const d of durations) {
    const last = out[out.length - 1];
    if (last && last[1] === d) last[0]++;
    else out.push([1, d]);
  }
  return out;
}

export function buildMp4(inp: Mp4Input): Buffer {
  const vScale = inp.fps * 1000;
  const vDelta = 1000;
  const aScale = inp.sampleRate;
  const aDelta = 1024;
  // mdat の中身：映像と音を時刻順に交互に並べる
  type Item = { kind: 'v' | 'a'; i: number; ts: number; data: Buffer };
  const items: Item[] = [...inp.video.map((s, i) => ({ kind: 'v' as const, i, ts: s.ts, data: s.data })), ...inp.audio.map((s, i) => ({ kind: 'a' as const, i, ts: s.ts, data: s.data }))];
  items.sort((a, b) => a.ts - b.ts || (a.kind === 'v' ? -1 : 1));
  const vDur = inp.video.length * vDelta;
  const aDur = inp.audio.length * aDelta;
  const movieDur = Math.max(Math.round((vDur / vScale) * 1000), Math.round((aDur / aScale) * 1000));

  const build = (mdatStart: number): Buffer => {
    const vOff: number[] = new Array(inp.video.length);
    const aOff: number[] = new Array(inp.audio.length);
    let pos = mdatStart + 8;
    for (const it of items) {
      (it.kind === 'v' ? vOff : aOff)[it.i] = pos;
      pos += it.data.length;
    }
    const avc1 = box(
      'avc1',
      Buffer.alloc(6),
      u16(1),
      Buffer.alloc(16),
      u16(inp.width),
      u16(inp.height),
      u32(0x00480000),
      u32(0x00480000),
      u32(0),
      u16(1),
      Buffer.alloc(32),
      u16(0x0018),
      u16(0xffff),
      box('avcC', inp.avcC),
    );
    const vTrak = box(
      'trak',
      full('tkhd', 0, 3, u32(0), u32(0), u32(1), u32(0), u32(movieDur), u32(0), u32(0), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(inp.width << 16), u32(inp.height << 16)),
      box(
        'mdia',
        full('mdhd', 0, 0, u32(0), u32(0), u32(vScale), u32(vDur), u16(0x55c4), u16(0)),
        full('hdlr', 0, 0, u32(0), str('vide'), u32(0), u32(0), u32(0), str('VideoHandler\0')),
        box(
          'minf',
          full('vmhd', 0, 1, u16(0), u16(0), u16(0), u16(0)),
          box('dinf', full('dref', 0, 0, u32(1), full('url ', 0, 1))),
          stbl(
            avc1,
            inp.video.map((s) => s.data.length),
            vOff,
            runs(inp.video.map(() => vDelta)),
            inp.video.flatMap((s, i) => (s.key ? [i + 1] : [])),
          ),
        ),
      ),
    );
    const esds = full(
      'esds',
      0,
      0,
      desc(0x03, Buffer.concat([u16(2), u8(0), desc(0x04, Buffer.concat([u8(0x40), u8(0x15), u24(0), u32(192000), u32(192000), desc(0x05, inp.asc)])), desc(0x06, u8(0x02))])),
    );
    const mp4a = box('mp4a', Buffer.alloc(6), u16(1), Buffer.alloc(8), u16(inp.channels), u16(16), u16(0), u16(0), u32(inp.sampleRate << 16), esds);
    const aTrak = box(
      'trak',
      full('tkhd', 0, 3, u32(0), u32(0), u32(2), u32(0), u32(movieDur), u32(0), u32(0), u16(0), u16(1), u16(0x0100), u16(0), MATRIX, u32(0), u32(0)),
      box(
        'mdia',
        full('mdhd', 0, 0, u32(0), u32(0), u32(aScale), u32(aDur), u16(0x55c4), u16(0)),
        full('hdlr', 0, 0, u32(0), str('soun'), u32(0), u32(0), u32(0), str('SoundHandler\0')),
        box(
          'minf',
          full('smhd', 0, 0, u16(0), u16(0)),
          box('dinf', full('dref', 0, 0, u32(1), full('url ', 0, 1))),
          stbl(
            mp4a,
            inp.audio.map((s) => s.data.length),
            aOff,
            runs(inp.audio.map(() => aDelta)),
            null,
          ),
        ),
      ),
    );
    const mvhd = full('mvhd', 0, 0, u32(0), u32(0), u32(1000), u32(movieDur), u32(0x00010000), u16(0x0100), u16(0), u32(0), u32(0), MATRIX, Buffer.alloc(24), u32(3));
    return box('moov', mvhd, vTrak, aTrak);
  };

  const ftyp = box('ftyp', str('isom'), u32(0x200), str('isom'), str('iso2'), str('avc1'), str('mp41'));
  // moov の大きさは、mdat の場所（=moov の大きさ）で変わらない（stco は32ビット）ので、1度仮に作って大きさを決める
  const moovSize = build(0).length;
  const moov = build(ftyp.length + moovSize);
  const payload = Buffer.concat(items.map((it) => it.data));
  const mdat = Buffer.concat([u32(payload.length + 8), str('mdat'), payload]);
  return Buffer.concat([ftyp, moov, mdat]);
}
