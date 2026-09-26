/**
 * 世界番号から決まる値（遊んでいる間の乱数の代わり）。
 * この世界はさいころを振らない（ラプラスの決まり）：同じ世界番号と同じ名前なら、いつ・誰が計算しても同じ値になる。
 * 世界番号は世界の初期条件（はじめの数値の少しの違い・出来事の起きる力のため具合・危機の順番）を作るためだけに使う。
 */

/** 世界番号と名前から、[0, 1) の値を1つ決める（FNV-1a で混ぜ、murmur3 の仕上げで散らす） */
export function hash01(seed: number, key: string): number {
  let h = (2166136261 ^ (seed >>> 0)) >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** [-1, 1) の値（はじめの数値を少しずらすため） */
export function hashSigned(seed: number, key: string): number {
  return hash01(seed, key) * 2 - 1;
}

/**
 * 出来事の起きる力の、はじめのため具合（1 に届くと起きる）。1 + ln(1 − u) と置くと、年に p ずつためたときに
 * はじめて起きる年が、起きやすさ p の出来事を毎年くじで決めたときと同じ散らばり方（平均 1/p 年）になる。
 * 一様に置くと、まれな出来事（年 3.5% など）でも 1/p 年のうちにかならず起きてしまう
 */
export function startCharge(seed: number, key: string): number {
  return 1 + Math.log(1 - hash01(seed, key));
}

/** 文字列そのものから [0, 1) の値を決める（書いた文から、演出の散り方を決めるときなど） */
export function hashText(text: string, key = ''): number {
  let h = 2166136261;
  for (const ch of `${key}\u0000${text}`) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return hash01(h, key);
}
