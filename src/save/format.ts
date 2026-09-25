import type { GameState } from '../core/types';
import { MIGRATIONS } from './migrations';
import { SaveDataSchema, type Progress, type Settings } from './schema';

/** セーブの版番号。形を変えたら上げて、MIGRATIONS に古い版からの変換を足す */
export const SAVE_VERSION = 5;

export interface SaveData {
  saveVersion: number;
  /** 最後に保存した時刻（ミリ秒） */
  savedAt: number;
  settings: Settings;
  progress: Progress;
  /** 遊んでいる途中の世界（なければ null） */
  current: GameState | null;
  /** 読み込んだとき、遊んでいた世界が壊れていたので手放した（保存はしない） */
  droppedCurrent?: boolean;
}

export class SaveFormatError extends Error {}

/** 古い版のセーブを今の版へ変換する */
export function migrate(raw: unknown): SaveData {
  if (typeof raw !== 'object' || raw === null) throw new SaveFormatError('セーブの形ではない');
  let data = raw as Record<string, unknown>;
  let version = typeof data.saveVersion === 'number' ? data.saveVersion : 0;
  if (version > SAVE_VERSION) throw new SaveFormatError(`新しすぎる版のセーブ（${version}）`);
  while (version < SAVE_VERSION) {
    const up = MIGRATIONS[version];
    if (!up) throw new SaveFormatError(`版 ${version} のセーブは変換できない`);
    try {
      data = up(structuredClone(data));
    } catch {
      throw new SaveFormatError(`版 ${version} のセーブを変換できなかった`);
    }
    version += 1;
    data.saveVersion = version;
  }
  const parsed = SaveDataSchema.safeParse(data);
  if (parsed.success) return parsed.data as SaveData;
  // 遊んでいた世界だけが壊れているなら、設定と記録は残して、その世界だけを手放す
  const rest = SaveDataSchema.safeParse({ ...data, current: null });
  if (rest.success && data.current != null) {
    const out = rest.data as SaveData;
    return { ...out, droppedCurrent: true };
  }
  throw new SaveFormatError('セーブが壊れている');
}

export function serialize(data: SaveData): string {
  const { droppedCurrent: _dropped, ...rest } = data;
  return JSON.stringify(rest);
}

export function deserialize(text: string): SaveData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SaveFormatError('セーブを読めない');
  }
  return migrate(raw);
}

/** 書き出し用の文字列の頭につける印 */
const EXPORT_PREFIX = 'WTXT1.';

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(bin);
}

function fromBase64(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** セーブをテキストとして書き出す（別の端末へ引き継ぐため） */
export function exportText(data: SaveData): string {
  return EXPORT_PREFIX + toBase64(serialize(data));
}

/** 書き出したテキスト（または JSON そのまま）を読み込む */
export function importText(text: string): SaveData {
  const trimmed = text.trim().replace(/\s+/g, '');
  if (trimmed.startsWith(EXPORT_PREFIX)) {
    let json: string;
    try {
      json = fromBase64(trimmed.slice(EXPORT_PREFIX.length));
    } catch {
      throw new SaveFormatError('書き出したテキストではない');
    }
    return deserialize(json);
  }
  // JSON そのままの形も受け取るが、セーブの形（設定と記録）があるものだけ
  const raw = text.trim();
  if (!raw.startsWith('{')) throw new SaveFormatError('書き出したテキストではない');
  return deserialize(raw);
}
