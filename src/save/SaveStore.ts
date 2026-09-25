import { deserialize, MAX_SAVE_CHARS, serialize, type SaveData } from './format';

/**
 * 保存の窓口。ゲームからはこれだけを使う。
 * 今は localStorage。あとで IndexedDB（Dexie）に差し替えられるよう、読み書きは Promise にしてある。
 */
export interface SaveStore {
  /** 画面を閉じても残る入れ物か（プライベートブラウズなどで保存できないときは false） */
  readonly persistent: boolean;
  load(): Promise<SaveData | null>;
  save(data: SaveData): Promise<void>;
  clear(): Promise<void>;
}

/** localStorage と同じ形の入れ物（テストでは Map で代わりをする） */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = 'world-txt/save';

/** 保存できなかった（端末の保存領域に空きがない など） */
export class SaveWriteError extends Error {}

/**
 * localStorage に保存する。
 * - 最新のセーブのほかに、ひとつ前のセーブを控え（.prev）に残す。最新が壊れていたら、控えから読む
 * - 読めなかったセーブは消さずに .broken へ残す（次の保存で上書きされないように）
 * - 空きが足りないときは、控えの分を空けてから、もう一度保存する
 */
export class LocalStorageSaveStore implements SaveStore {
  readonly persistent = true;
  /** 最後に読めた・書けたセーブ（次の保存で、控えにする） */
  private lastGood: string | null = null;

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly key: string = SAVE_KEY,
  ) {}

  private get backupKey(): string {
    return `${this.key}.prev`;
  }

  private get brokenKey(): string {
    return `${this.key}.broken`;
  }

  async load(): Promise<SaveData | null> {
    const text = this.storage.getItem(this.key);
    if (text === null) return this.fromBackup();
    let data: SaveData;
    try {
      data = deserialize(text);
    } catch (e) {
      // 最新のセーブが読めない：消さずに残し、ひとつ前のセーブがあればそれを使う
      this.keepBroken(text);
      const backup = this.fromBackup();
      if (backup) return backup;
      throw e;
    }
    if (data.droppedCurrent) {
      // 遊んでいた世界だけが壊れていた：元の形は残し、ひとつ前のセーブに無事な世界があればそれを使う
      this.keepBroken(text);
      const backup = this.fromBackup();
      if (backup && !backup.droppedCurrent && backup.current) return backup;
      // 壊れた世界の入ったセーブは、控えにしない
      return data;
    }
    this.lastGood = text;
    return data;
  }

  /** ひとつ前のセーブ（控え）を読む。なければ・読めなければ null */
  private fromBackup(): SaveData | null {
    const text = this.storage.getItem(this.backupKey);
    if (text === null) return null;
    try {
      const data = deserialize(text);
      this.lastGood = text;
      return { ...data, restored: true };
    } catch {
      return null;
    }
  }

  /** 読めなかったセーブを別の鍵に残す（すでに残してあれば、そのまま） */
  private keepBroken(text: string): void {
    try {
      if (this.storage.getItem(this.brokenKey) === null) this.storage.setItem(this.brokenKey, text);
    } catch {
      // 残せなくても遊びは続ける
    }
  }

  async save(data: SaveData): Promise<void> {
    const text = serialize(data);
    if (text.length > MAX_SAVE_CHARS) throw new SaveWriteError('セーブが大きすぎる');
    this.write(text);
    // ひとつ前のセーブを控えに残す（最新が壊れていたときに戻れるように）。残せなければ、控えは持たない
    const prev = this.lastGood;
    this.lastGood = text;
    if (prev === null || prev === text) return;
    try {
      this.storage.setItem(this.backupKey, prev);
    } catch {
      this.remove(this.backupKey);
    }
  }

  /** 最新のセーブを書く。空きが足りなければ、控え・壊れたセーブの順に空けてから、もう一度 */
  private write(text: string): void {
    try {
      this.storage.setItem(this.key, text);
      return;
    } catch {
      // 下で空けてから、もう一度
    }
    for (const k of [this.backupKey, this.brokenKey]) {
      this.remove(k);
      try {
        this.storage.setItem(this.key, text);
        return;
      } catch {
        // まだ足りない
      }
    }
    throw new SaveWriteError('端末の保存領域に空きがない');
  }

  private remove(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch {
      // 消せなくても続ける
    }
  }

  async clear(): Promise<void> {
    this.storage.removeItem(this.key);
    this.remove(this.backupKey);
    this.lastGood = null;
  }
}

/** 保存できない環境（プライベートモードなど）では、保存しない入れ物を使う */
export class MemorySaveStore implements SaveStore {
  readonly persistent = false;
  private text: string | null = null;

  async load(): Promise<SaveData | null> {
    return this.text === null ? null : deserialize(this.text);
  }

  async save(data: SaveData): Promise<void> {
    this.text = serialize(data);
  }

  async clear(): Promise<void> {
    this.text = null;
  }
}
