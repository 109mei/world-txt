type Json = Record<string, any>;

/**
 * 版 n のセーブを 版 n+1 に変換する関数。
 * セーブは版7（2026年9月27日）から始め直した。それより前の版のセーブは読まずに消す（src/save/format.ts の FIRST_SAVE_VERSION）。
 * セーブの形を変えたら SAVE_VERSION を上げ、ここに版7からの変換を足す
 */
export const MIGRATIONS: Record<number, (old: Json) => Json> = {};
