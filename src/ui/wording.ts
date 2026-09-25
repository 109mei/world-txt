/**
 * 書き換えの入力を助ける、文章の小さな変形（画面の補助。世界の読み取りとは関係しない）。
 * 選択肢や結果の予測は出さない。打つ手間を減らすだけ。
 */

/** 文の終わりの句点・記号 */
const TAIL = /[。．.!！?？\s]*$/u;

/** すでに打ち消している文の終わり */
const NEGATIVE = /(ない|なく|ず|ません)$/u;

/** 「る」の前が漢字1字でも、一段に活用する動詞（見る→見ない） */
const ICHIDAN_KANJI = new Set(['見', '寝', '着', '似', '煮', '居', '出', '得', '経', '干', '射']);

/** 「る」の前がい段・え段でも、五段に活用する動詞（帰る→帰らない） */
const GODAN_RU = ['帰る', 'かえる', '走る', 'はしる', '入る', 'はいる', '知る', 'しる', '切る', '限る', '減る', '要る', '散る', '茂る', '照る', '蹴る', '滑る', '握る', '喋る', 'しゃべる', '焦る', '覆る', '湿る', '混じる', '交じる', '参る'];

/** い段・え段のかな（一段動詞の「る」の前） */
const IE_ROW = /[いきぎしじちぢにひびぴみりえけげせぜてでねへべぺめれ]$/u;

/** 五段動詞の終わり → 打ち消しの形 */
const GODAN: Record<string, string> = { う: 'わ', く: 'か', ぐ: 'が', す: 'さ', つ: 'た', ぬ: 'な', ぶ: 'ば', む: 'ま', る: 'ら' };

/** 述語を打ち消す（「必要とする」→「必要としない」、「育つ」→「育たない」）。打ち消せない・すでに打ち消していれば null */
function negatePredicate(s: string): string | null {
  if (s === '' || NEGATIVE.test(s)) return null;
  if (s.endsWith('する')) return `${s.slice(0, -2)}しない`;
  if (s.endsWith('できる')) return `${s.slice(0, -3)}できない`;
  if (s.endsWith('来る')) return `${s.slice(0, -2)}来ない`;
  if (s.endsWith('くる')) return `${s.slice(0, -2)}こない`;
  if (s.endsWith('である')) return `${s.slice(0, -3)}ではない`;
  if (s.endsWith('うる')) return `${s.slice(0, -2)}えない`;
  if (s.endsWith('ある')) return `${s.slice(0, -2)}ない`;
  if (s.endsWith('だ')) return `${s.slice(0, -1)}ではない`;
  // 「仲がいい」「頭いい」の「いい」は「よくない」。「かわいい」は「かわいくない」
  if (/(?:^|[がはも\p{sc=Han}])いい$/u.test(s)) return `${s.slice(0, -2)}よくない`;
  if (s.endsWith('い')) return `${s.slice(0, -1)}くない`;
  if (s.endsWith('る')) {
    const stem = s.slice(0, -1);
    const godan = GODAN_RU.some((w) => s.endsWith(w));
    const before = stem.slice(-1);
    const ichidan = !godan && (IE_ROW.test(stem) || (ICHIDAN_KANJI.has(before) && !/\p{sc=Han}/u.test(stem.slice(-2, -1))));
    return ichidan ? `${stem}ない` : `${stem}らない`;
  }
  const last = s.slice(-1);
  if (GODAN[last]) return `${s.slice(0, -1)}${GODAN[last]}ない`;
  // 名詞で終わる文（「世界は平和」）
  if (/[\p{sc=Han}\p{sc=Katakana}ー]$/u.test(s)) return `${s}ではない`;
  return null;
}

/** 文を打ち消す（文の終わりの述語だけを変える）。文の終わりの「。」は、書いてあればそのまま残す。打ち消せなければ null */
export function negate(text: string): string | null {
  const tail = TAIL.exec(text)?.[0] ?? '';
  const body = text.slice(0, text.length - tail.length);
  const out = negatePredicate(body);
  return out === null ? null : out + tail;
}

/** 文の終わりの「。」を外す（「。」は書き込むときに世界が付けるので、書き換えるときは要らない） */
export function withoutPeriod(text: string): string {
  return text.trim().replace(/[。．]+$/u, '');
}

/**
 * 文章の中の、ものを指す言葉（漢字・カタカナの2文字以上の並びで、すぐ後ろが助詞か文の終わりのもの）。
 * 「毎晩眠る」の「毎晩眠」のような、動きの言葉のかけらは入れない。「毎日食事」は「毎日」と「食事」に分ける
 */
export function keyWords(...texts: string[]): string[] {
  const out: string[] = [];
  const push = (w: string) => {
    if (Array.from(w).length >= 2 && !out.includes(w)) out.push(w);
  };
  for (const t of texts) {
    for (const m of t.matchAll(/[\p{sc=Han}々]{2,}|[\p{sc=Katakana}ー]{2,}/gu)) {
      const after = t.slice(m.index + m[0].length);
      if (!/^(?:[をはがにでとのへやも、。．.!！?？]|から|まで|より|$)/u.test(after)) continue;
      const time = /^毎[日晩年週月朝]/u.exec(m[0]);
      if (time && m[0].length > 2) {
        push(time[0]);
        push(m[0].slice(2));
      } else push(m[0]);
    }
  }
  return out;
}

/** 入力欄の選んだところ（なければカーソルの位置）に言葉を差し込み、差し込んだ後ろの位置を返す */
export function insertAt(text: string, start: number, end: number, word: string): { text: string; cursor: number } {
  const a = Math.max(0, Math.min(start, text.length));
  const b = Math.max(a, Math.min(end, text.length));
  return { text: text.slice(0, a) + word + text.slice(b), cursor: a + word.length };
}
