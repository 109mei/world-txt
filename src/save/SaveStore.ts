import { deserialize, serialize, type SaveData } from './format';

/**
 * 保存の窓口。ゲームからはこれだけを使う。
 * 今は localStorage。あとで IndexedDB（Dexie）に差し替えられるよう、読み書きは Promise にしてある。
 */
export interface SaveStore {
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

export class LocalStorageSaveStore implements SaveStore {
  constructor(
    private readonly storage: KeyValueStorage,
    private readonly key: string = SAVE_KEY,
  ) {}

  async load(): Promise<SaveData | null> {
    const text = this.storage.getItem(this.key);
    if (text === null) return null;
    try {
      const data = deserialize(text);
      // 遊んでいた世界だけを手放したときも、元の形は残しておく
      if (data.droppedCurrent) this.keepBroken(text);
      return data;
    } catch (e) {
      // 読めないセーブは消さずに残す（次の保存で上書きされないように）
      this.keepBroken(text);
      throw e;
    }
  }

  /** 読めなかったセーブを別の鍵に残す（すでに残してあれば、そのまま） */
  private keepBroken(text: string): void {
    try {
      if (this.storage.getItem(`${this.key}.broken`) === null) this.storage.setItem(`${this.key}.broken`, text);
    } catch {
      // 残せなくても遊びは続ける
    }
  }

  async save(data: SaveData): Promise<void> {
    this.storage.setItem(this.key, serialize(data));
  }

  async clear(): Promise<void> {
    this.storage.removeItem(this.key);
  }
}

/** 保存できない環境（プライベートモードなど）では、保存しない入れ物を使う */
export class MemorySaveStore implements SaveStore {
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
