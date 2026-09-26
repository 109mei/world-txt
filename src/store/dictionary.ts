import { kindOf, wordMarks, type GameData } from '../core';

/**
 * 世界の辞書の写し：書いた文の中の言葉を、世界に通じた言葉（種類ごと）と、世界がまだ知らない言葉に分けて見せる。
 * 集めるのは runtime（書くたびに progress.words へ）。ここでは、内容の版が変わって世界が知るようになった言葉を通じた側へ移す
 */
export interface DictionaryView {
  /** 世界に通じた言葉（種類ごと。種類のわからない言葉は「世界の決まりの言葉」） */
  known: { kind: string; words: string[] }[];
  /** 世界がまだ知らない言葉（新しく書いた順） */
  unknown: string[];
  /** 通じた言葉の数 */
  knownCount: number;
}

/** 種類のわからない、世界に通じた言葉（法則の行や言い回しの言葉）のまとめの名前 */
export const RULE_WORDS = '世界の決まりの言葉';

/** その言葉を、いまの世界が知っているか（「世界の読み」の点線が付かない） */
function knownNow(word: string): boolean {
  return wordMarks(word).every((m) => m.known !== false);
}

export function buildDictionary(data: GameData, words: { known: readonly string[]; unknown: readonly string[] }): DictionaryView {
  const unknown = words.unknown.filter((w) => !knownNow(w));
  const known = [...new Set([...words.known, ...words.unknown.filter(knownNow)])];
  const groups = new Map<string, string[]>();
  for (const w of known) {
    const kind = kindOf(w) ?? RULE_WORDS;
    groups.set(kind, [...(groups.get(kind) ?? []), w]);
  }
  // 並び：世界の決まりの言葉が先、あとは辞書の種類の順
  const order = [RULE_WORDS, ...Object.keys(data.lexicon.kinds)];
  const rank = (k: string) => {
    const i = order.indexOf(k);
    return i < 0 ? order.length : i;
  };
  return {
    known: [...groups].sort((a, b) => rank(a[0]) - rank(b[0])).map(([kind, ws]) => ({ kind, words: ws })),
    unknown: [...unknown].reverse(),
    knownCount: known.length,
  };
}
