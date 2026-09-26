import type { Law, MatchRule, Phrase } from '../data/schema';

/**
 * 書いた文章から、世界が意味を読み取る。
 * 形態素解析はせず、言葉の手がかり（否定・量・頻度・「ただし」・条件・「〜なしで」・「〜だけ」・「〜に強い」）を見る。
 * 英語や言い換え（ウイルス→病原体、CO2→二酸化炭素 など）は、読む前に日本語の言葉へそろえる。
 * 同じ文章からは、いつも同じ読み取りになる。
 */

// ---------------------------------------------------------------- 語彙（src/data/lexicon.json から受け取る）

export interface Lexicon {
  /** まとめて扱う言葉。規則の中では「@人」のように書く */
  groups: Record<string, string[]>;
  /** 言い換え：左の言葉にそろえてから読む */
  synonyms: Record<string, string[]>;
  /** 英語（小文字）→ 日本語 */
  english: Record<string, string>;
  /** どの話にも出てくる言葉（新しいものを持ち込んだかを調べるときに数えない） */
  common?: string[];
  /**
   * 日常の言葉の種類（パン→食べ物、猫→動物、先生→人）。その種類について書かれた行の話として読むが、
   * 種類そのものより狭い（「猫は存在しない」で「動物」の行は消えない、「人間は砂糖を必要としない」で「食事」の行は消えない）
   */
  kinds?: Record<string, string[]>;
  /**
   * 辞書にない言葉の種類を、語尾から推し量る（「クーロン力」→力、「肺炎」→病気、「野良猫」→動物）。
   * 辞書の種類の言葉（2文字以上）も、そのまま語尾として使う
   */
  suffixes?: Record<string, string>;
  /** すぐ後ろの「が」が送りがなになる1文字の漢字（泳がない・防がない・逃がす）。助詞のゆれをそろえるときに変えない */
  gaVerbs?: string[];
  /** 言い切りの強さの言葉 */
  strength?: { strong: string[]; mild: string[] };
  /** 書き方の読み分けの語尾（制度・条件つき） */
  modes?: { rule: string[]; conditional: string[] };
}

let LEX: Lexicon = { groups: {}, synonyms: {}, english: {} };
let SYN: [string, string][] = [];
let ENG: [RegExp, string][] = [];
/** 世界が知っている言葉（読み取れない文の「知らない言葉」を見つけるため） */
let KNOWN = new Set<string>();
let COMMON = new Set<string>();
/** 法則ごとの、その行が知っている言葉 */
let VOCAB = new WeakMap<Law, Set<string>>();
/** 法則ごとの、その行の種類に入る日常の言葉（その行の話だが、狭い） */
let RELATED = new WeakMap<Law, Set<string>>();
/** 法則ごとの、主語として数える言葉 */
let SUBJECTS = new WeakMap<Law, Set<string>>();
/** 日常の言葉 → 種類 */
let KIND = new Map<string, string>();
/** ものの名前（言葉の境目を見るため：「石油」は「石」ではない、「日光」は「光」の一つ） */
let NOUNSET = new Set<string>();
/** 語尾 → 種類（長い語尾から当てる） */
let SUFFIX: [string, string][] = [];
/** 種類 → 辞書の言葉（ひらがなの言葉を探すため） */
let KIND_WORDS = new Map<string, string[]>();
/** すぐ後ろの「が」が送りがなになる漢字 */
let GA_VERBS = new Set<string>();

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 語彙を設定する（内容を読み込むときに一度だけ呼ぶ） */
export function setLexicon(lex: Lexicon, vocabulary: Iterable<string>, nouns: Iterable<string> = []): void {
  LEX = lex;
  GA_VERBS = new Set(lex.gaVerbs ?? []);
  SYN = Object.entries(lex.synonyms)
    .flatMap(([to, froms]) => froms.map((from) => [from.normalize('NFKC').toLowerCase(), to] as [string, string]))
    .sort((a, b) => b[0].length - a[0].length);
  ENG = Object.entries(lex.english)
    .sort((a, b) => b[0].length - a[0].length)
    .map(([en, ja]) => [new RegExp(`\\b${escapeRe(en)}\\b`, 'g'), ja]);
  CANON = new Map();
  KNOWN = new Set();
  for (const w of vocabulary) for (const t of tokens(canonical(w))) KNOWN.add(t);
  COMMON = new Set((lex.common ?? []).flatMap((w) => tokens(canonical(w))));
  KIND = new Map();
  // 辞書の言葉は、まるごとと中心（後ろ）の言葉だけを種類に入れる（「量子コンピューター」は機械だが、「量子」は機械ではない）。
  // ひらがなの入った言葉（「天の川」「天ぷら」）は、まるごとだけ（「川」は天体ではなく、「天」は食べ物ではない）。
  // 1文字の中心は、その言葉のかけらなので入れない（「ネアンデルタール人」の「人」は動物ではない）
  const dictTokens = new Set<string>();
  for (const [kind, words] of Object.entries(lex.kinds ?? {})) {
    for (const w of words) {
      const c = canonical(w);
      const ts = tokens(c);
      for (const t of ts) dictTokens.add(t);
      const last = ts[ts.length - 1] ?? '';
      const head = /\p{sc=Hiragana}/u.test(c) || (ts.length > 1 && Array.from(last).length < 2) ? '' : last;
      for (const t of [c, head]) if (t && !KIND.has(t)) KIND.set(t, canonical(kind));
    }
  }
  for (const t of [...KIND.keys(), ...dictTokens]) KNOWN.add(t);
  KIND_WORDS = new Map();
  for (const [kind, words] of Object.entries(lex.kinds ?? {})) KIND_WORDS.set(canonical(kind), words.map((w) => canonical(w)));
  // 語尾の表と、2文字以上の辞書の言葉（「子猫」「三毛猫」の「猫」は1文字なので、語尾の表に書く）
  const suf = new Map<string, string>();
  for (const [s, kind] of Object.entries(lex.suffixes ?? {})) suf.set(canonical(s), canonical(kind));
  for (const [t, kind] of KIND) if (Array.from(t).length >= 2 && !suf.has(t)) suf.set(t, kind);
  SUFFIX = [...suf.entries()].sort((a, b) => b[0].length - a[0].length);
  NOUNSET = new Set([...KIND.keys(), ...dictTokens]);
  for (const w of nouns) for (const t of tokens(canonical(w))) NOUNSET.add(t);
  VOCAB = new WeakMap();
  RELATED = new WeakMap();
  SUBJECTS = new WeakMap();
}

// ---------------------------------------------------------------- 文章をそろえる

/** 見た目のまま比べる形：全角・半角をそろえ、空白を消し、文末の句点・「！」「？」を落とす */
export function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[。．.!！?？]+$/u, '')
    .replace(/[、，,]/g, '、');
}

/** 読むための形の覚え（同じ文章は何度もそろえない） */
let CANON = new Map<string, string>();

/** 読むための形：英語と言い換えを日本語の言葉にそろえてから、normalize する */
export function canonical(raw: string): string {
  const hit = CANON.get(raw);
  if (hit !== undefined) return hit;
  const out = canonicalize(raw);
  if (CANON.size > 20000) CANON.clear();
  CANON.set(raw, out);
  return out;
}

function canonicalize(raw: string): string {
  let t = raw.normalize('NFKC').toLowerCase();
  // without X → Xなしで（語順を日本語に合わせる）
  t = t.replace(/\bwithout\s+([a-z]+)/g, '$1 なしで ');
  for (const [re, ja] of ENG) t = t.replace(re, ja);
  t = normalize(t);
  for (const [from, to] of SYN) if (t.includes(from)) t = t.split(from).join(to);
  // 「水が少なくても育つ」は、水なしではなく少しの水（「〜なくても」の打ち消しと読まない）
  t = t.replace(/少なくても/gu, '少しでも');
  return evenParticles(t);
}

/**
 * 助詞のゆれをそろえる：名詞のすぐ後ろの「が」を「は」にする（「病気が消える」と「病気は消える」を同じに読む）。
 * 言葉の中の「が」（上がる・広がる・逃がす）と、1文字の漢字の送りがなの「が」（泳がない・防がない）は変えない。
 * 言葉の途中で切れた規則の言葉（「広が」「干上が」）の終わりの「が」も変えない。読み取りの規則の言葉も、読み込むときに同じようにそろえる
 */
export function evenParticles(t: string): string {
  return t.replace(/([\p{sc=Han}々]+|[\p{sc=Katakana}ー]+|[a-z0-9]+)が(?=[^るりっられろさしすせそ])/gu, (m, run: string) => (GA_VERBS.has(run) ? m : `${run}は`));
}

/** 漢字の並び・2文字以上のカタカナ・英字の並び（言葉らしいもの） */
const TOKEN_G = /[\p{sc=Han}々]+|[\p{sc=Katakana}ー]{2,}|[a-z]{2,}/gu;

function tokens(t: string): string[] {
  return t.match(TOKEN_G) ?? [];
}

// 言葉のすぐ後ろが助詞なら、その言葉は名詞として使われている
const NOUNISH = /^(?:[がをにはのでともへや、。]|から|まで|より|$)/u;

/**
 * 言葉の種類：辞書の種類（パン→食べ物）、なければ語尾から推し量る（「クーロン力」→力、「肺炎」→病気、「野良猫」→動物）。
 * わからなければ null
 */
export function kindOf(word: string): string | null {
  const t = canonical(word);
  const k = KIND.get(t);
  if (k) return k;
  for (const [s, kind] of SUFFIX) if (t.length > s.length && t.endsWith(s)) return kind;
  return null;
}

/** 漢字・カタカナ・英数字の続くひとかたまりの言葉（「監視カメラ」「生成人工知能」「ロボット犬」） */
const COMPOUND_G = /[\p{sc=Han}々\p{sc=Katakana}ーa-z0-9]+/gu;

/**
 * ひとかたまりの言葉の種類。まるごと（語尾から推し量るのも含む）、なければ後ろの言葉から。
 * 一つの言葉は一つの種類にだけ読む（「ロボット犬」は犬の一つ。機械と動物の両方には読まない）
 */
function compoundKind(run: string): string | null {
  const whole = kindOf(run);
  if (whole) return whole;
  const ts = tokens(run);
  for (let i = ts.length - 1; i >= 0; i -= 1) {
    const k = kindOf(ts[i]!);
    if (k) return k;
  }
  return null;
}

/** 文章に、その種類の言葉が出てくるか（「@@動物」：猫・野良猫・ねこ など） */
function kindIn(text: string, kind: string): boolean {
  const k = canonical(kind);
  // 辞書にある一つの言葉（「天の川」）は、その種類だけ（「川」の場所とは読まない）
  const whole = KIND.get(text);
  if (whole) return whole === k;
  for (const run of text.match(COMPOUND_G) ?? []) if (compoundKind(run) === k) return true;
  // ひらがなの入った言葉（ねこ・いぬ・お好み焼き）は、辞書の言葉のまま探す
  for (const w of KIND_WORDS.get(k) ?? []) if (/\p{sc=Hiragana}/u.test(w) && text.includes(w)) return true;
  return false;
}

/** 知っている言葉だけでできているか（長い言葉から当てはめる） */
function knownRun(run: string): string[] {
  const unknown: string[] = [];
  let i = 0;
  let buf = '';
  while (i < run.length) {
    let len = Math.min(8, run.length - i);
    for (; len > 0; len--) if (KNOWN.has(run.slice(i, i + len))) break;
    if (len > 0) {
      if (buf) unknown.push(buf);
      buf = '';
      i += len;
    } else {
      buf += run[i];
      i += 1;
    }
  }
  if (buf) unknown.push(buf);
  return unknown;
}

/** 文章の中の、世界が知らない言葉（比べる元の文にある言葉は除く）。短い言葉は丸ごと返す（「学校」の「校」だけを返さない） */
export function unknownWords(text: string, besides = ''): string[] {
  const own = new Set(tokens(besides));
  // 語尾から種類のわかるひとかたまり（「顔認証カメラ」）は、知らない部分があっても知っている言葉として扱う
  const typed = new Set<string>();
  for (const run of text.match(COMPOUND_G) ?? []) if (kindOf(run)) for (const t of tokens(run)) typed.add(t);
  const out: string[] = [];
  for (const run of tokens(text)) {
    if (own.has(run) || KNOWN.has(run) || typed.has(run) || kindOf(run)) continue;
    const parts = knownRun(run).filter((u) => !own.has(u));
    const found = parts.length > 0 && Array.from(run).length <= 3 ? [run] : parts;
    for (const u of found) if (!out.includes(u)) out.push(u);
  }
  return out;
}

type CharClass = 'han' | 'kata' | 'latin';

function charClass(ch: string | undefined): CharClass | null {
  if (!ch) return null;
  if (/[\p{sc=Han}々]/u.test(ch)) return 'han';
  if (/[\p{sc=Katakana}ー]/u.test(ch)) return 'kata';
  if (/[a-z0-9]/.test(ch)) return 'latin';
  return null;
}

/** 言葉がひとつの文字の種類（漢字だけ・カタカナだけ・英字だけ）でできていれば、その種類 */
function wordClass(w: string): CharClass | null {
  const c = charClass(w[0]);
  if (!c) return null;
  for (const ch of w) if (charClass(ch) !== c) return null;
  return c;
}

/** その法則の行が知っている言葉（元の文・読み取りの形・規則・主語・話題。「人」のようなまとまりは、その中身も） */
function lawVocab(law: Law): Set<string> {
  const cached = VOCAB.get(law);
  if (cached) return cached;
  const v = new Set<string>();
  const add = (w: string) => {
    if (w.startsWith('@@')) return;
    const group = w.startsWith('@') ? LEX.groups[w.slice(1)] : LEX.groups[w];
    if (group) for (const m of group) for (const t of tokens(canonical(m))) v.add(t);
    if (!w.startsWith('@')) for (const t of tokens(canonical(w))) v.add(t);
  };
  for (const w of [...law.subject, ...law.topic]) add(w);
  for (const o of law.options) {
    if (o.text) add(o.text);
    for (const r of o.match ?? []) for (const w of [...(r.any ?? []), ...(r.all ?? []), ...(r.none ?? []), ...(r.without ?? []), ...(r.only ?? []), ...(r.except ?? []), ...(r.rest ?? [])]) add(w);
  }
  VOCAB.set(law, v);
  return v;
}

/** その行の種類に入る日常の言葉（その行が「食べ物」「動物」「人」などを知っていれば、その種類の言葉） */
function relatedOf(law: Law): Set<string> {
  const cached = RELATED.get(law);
  if (cached) return cached;
  // その行の文・主語・話題に種類の名前（「食べ物」「動物」「人」など）が出てくれば、その種類の言葉はこの行の話
  const raw = [originalText(law), ...law.subject, ...law.topic, ...law.exists, ...law.options.map((o) => o.text ?? '')].map((w) => canonical(w)).join(' ');
  const r = new Set<string>();
  for (const [t, kind] of KIND) if (raw.includes(kind)) r.add(t);
  RELATED.set(law, r);
  return r;
}

/**
 * 言葉 w が text に「その言葉として」出てくるか。
 * 別のものを指す言葉の一部（「人工知能」「宇宙人」の「人」、「冬眠」の「眠」、「魔法」の「法」）は数えない。
 * その行が知っている言葉（「人間」「睡眠」）と、世界が知らない言葉（「死亡」）の一部なら数える
 */
function wordIn(text: string, w: string, own: ReadonlySet<string>): boolean {
  const cls = wordClass(w);
  if (!cls) return text.includes(w);
  for (let i = text.indexOf(w); i >= 0; i = text.indexOf(w, i + 1)) {
    let s = i;
    let e = i + w.length;
    while (s > 0 && charClass(text[s - 1]) === cls) s -= 1;
    while (e < text.length && charClass(text[e]) === cls) e += 1;
    const run = text.slice(s, e);
    if (run === w || own.has(run) || !KNOWN.has(run)) return true;
  }
  return false;
}

/** 言葉がその行の言葉か、その行の種類の言葉か、ありふれた言葉か、世界の知らない言葉か（＝ほかのものを指す、世界の知っている言葉ではない） */
function ownish(t: string, own: ReadonlySet<string>, related: ReadonlySet<string> = new Set()): boolean {
  if (own.has(t) || related.has(t) || COMMON.has(t) || !KNOWN.has(t)) return true;
  for (const o of own) if (o.includes(t)) return true;
  return false;
}

/** 主語がその行のものか（「人工知能は死なない」の主語は「生き物はいつか死ぬ」の行のものではない） */
function subjectFits(law: Law, subject: string): boolean {
  const own = lawVocab(law);
  const ts = tokens(subject);
  if (ts.length === 0) return true;
  return ts.some((t) => ownish(t, own, relatedOf(law)));
}

/**
 * 主語がその行の主語そのものより狭いか（「猫」は「動物」より、「老人」は「人」より狭い）。
 * 狭い主語で打ち消しても、その行の法則は消えない
 */
function narrowSubject(law: Law, subject: string): boolean {
  const head = subjectHead(subject);
  const ts = tokens(head);
  // ひらがなの言葉（「ねこ」「いぬ」）も、辞書にあれば狭い
  if (ts.length === 0) return KIND.has(head);
  const subjects = new Set(subjectWords(law));
  if (subjects.has(head) || ts.some((t) => subjects.has(t))) return false;
  const groups = law.subject.filter((w) => LEX.groups[w]);
  return ts.some((t) => KIND.has(t) || (groups.some((gk) => gk === '獣') && (LEX.groups['獣'] ?? []).includes(t)));
}

/**
 * 述語の、その行の知らない動きの言葉（「人間は食事を愛さない」の「愛」、「人間は眠らない」を「老いる」の行に書いたときの「眠」）。
 * 漢字のすぐ後ろが送りがな（助詞ではないひらがな）のものを、動きの言葉とみる
 */
function novelVerbs(law: Law, f: TextFeatures): string[] {
  const own = lawVocab(law);
  const out: string[] = [];
  for (const m of (f.rest || f.text).matchAll(/([\p{sc=Han}々]+)(?=[ぁ-ゖ])/gu)) {
    const t = m[1]!;
    const after = (f.rest || f.text).slice(m.index + t.length);
    if (NOUNISH.test(after) || /^[かやもへ]/u.test(after)) continue;
    // その行の言葉の一部か、その行の言葉を含む言葉（「死亡しない」の「死亡」は「死」の話）は、その行の動き
    if (COMMON.has(t) || [...own].some((o) => o.includes(t) || t.includes(o))) continue;
    out.push(t);
  }
  return out;
}

/** 元の文にもその行にもない、新しいものを指す言葉（「雨はお菓子になる」のお菓子、「人は魔法を使える」の魔法） */
function novelWords(law: Law, f: TextFeatures, strict = false): string[] {
  const own = lawVocab(law);
  // その行の種類の言葉（パン・砂糖は食べ物）は、言い換えでは新しいものではないが、打ち消すときは狭い（strict）
  const related = strict ? new Set<string>() : relatedOf(law);
  const covered = (t: string) => {
    if (COMMON.has(t) || related.has(t)) return true;
    for (const o of own) if (o.includes(t)) return true;
    // その行の言葉をつないだだけの言葉も、新しいものではない
    let i = 0;
    while (i < t.length) {
      let len = t.length - i;
      for (; len > 0; len--) if (own.has(t.slice(i, i + len)) || COMMON.has(t.slice(i, i + len))) break;
      if (len === 0) return false;
      i += len;
    }
    return true;
  };
  const out: string[] = [];
  for (const m of f.text.matchAll(TOKEN_G)) {
    const t = m[0];
    if (covered(t)) continue;
    // 1文字の言葉は、名詞として使ったもの（世界の知らない「魚を」「熊は」、知っていても「肉を」のような目当ての物）だけ数える。
    // 「楽しむ」の「楽」のような動きの言葉や、「夜に眠る」の「夜」のような時・場所は数えない
    const after = f.text.slice(m.index + t.length);
    if (Array.from(t).length < 2 && !(KNOWN.has(t) ? /^[をが]/u.test(after) : NOUNISH.test(after))) continue;
    out.push(t);
  }
  return out;
}

// ---------------------------------------------------------------- 手がかり

export interface TextFeatures {
  /** 読むための形（英語と言い換えをそろえたもの） */
  text: string;
  empty: boolean;
  /** 本文（「ただし」より前）が否定になっているか（「〜なしで」「〜しか〜ない」の「ない」は数えない） */
  neg: boolean;
  less: boolean;
  more: boolean;
  /** 「〜に強い」「〜に負けない」 */
  resist: boolean;
  /** 「〜に弱い」 */
  vulnerable: boolean;
  /** 頻度（毎日＝1）。書かれていなければ null */
  freq: number | null;
  /** 「ただし〜」「〜を除く」「〜以外」の部分 */
  except: string;
  cond: boolean;
  /** 「Xなしで」「Xがなくても」「Xを必要としない」「Xを使わずに」の X */
  without: string[];
  /** 「Xだけ」「Xのみ」「Xしか〜ない」の X */
  only: string[];
  /** 問いの形（〜か？） */
  question: boolean;
  /** 「〜は」「〜が」の主語（書いていなければ null） */
  subject: string | null;
  /** 主語の「は」「が」より後ろ（述語。主語を書いていなければ空） */
  rest: string;
  /** 「終わらない」「尽きない」「滅びない」：なくなることを打ち消した文（否定ではなく、そのものが続くという意味） */
  persist: boolean;
  /** 「海では育たない」：場所や場合を限った否定（そのほかでは元のまま） */
  scoped: boolean;
  /** 言葉があるかを見るための形：「Xなしで」「Xを必要としない」「Xは絶滅しない」の X を除いたもの */
  bare: string;
}

// 否定に見えて否定ではない言い回し（先に取り除く）
const NOT_NEG = /(少ない|少なく|危ない|もったいない|なければならない|なくてはならない|ねばならない|ないといけない|なくてはいけない|かもしれない|に違いない|ほかならない|たまらない|間違いない|だけではない)/gu;
// 「あまり〜ない」「ほとんど〜ない」は否定ではなく「少ない」
const WEAK_NEG = /(ほとんど|あまり|さほど|それほど|めったに|なかなか)/u;
const NEG = /(ない|無い|なし|無し|不要|いらない|要らない|せず|ずに|ず、|ず$|なくなる|失う|消え|存在しない|ません|なかった|消滅|滅亡|絶滅|滅び|滅ぶ)/u;

const LESS_WORDS = [
  '少し', '少量', '少な', 'わずか', '僅か', '半分', '弱く', '弱い', '弱め', '弱ま', 'ゆっくり', '遅く', '遅い', 'まれに', 'まれな', 'まれだ', '稀', 'たまに', '時々', 'ときどき',
  '小さく', '薄く', '控えめ', 'ほとんど', 'あまり', 'ちょっと', '軽く', '減', '短い', '短く', '低く', '下が', '落ち',
];
const MORE_WORDS = [
  '多く', '多い', 'たくさん', '沢山', '大量', '倍', '強く', '強い', '強め', '強ま', '速く', '早く', '速い', '激しく', '激しい', '大きく', '濃く', '増', '何度も',
  'ひどく', '高く', '上が', '長く', 'いっぱい', '大いに', '十分に',
];
// 向きを持たない強調（「もっと少ない」は少ない、「とても強く」は強い。強調だけなら強める）。
// 「ずっと」は「ずっと春だ」のように続くことを言うことが多いので、強調に数えない
const INTENSIFIERS = ['もっと', 'とても', '非常に', 'さらに', 'すごく', 'かなり', '極めて', 'めちゃくちゃ', 'めっちゃ', '超', 'ものすごく', '一段と', '急に', '急速に', '一気に', 'どんどん'];
// 比べる強調（もっと・さらに）ではない、強い強調。「暑さにとても強い」は、暑さで弱らないという意味
const STRONG = ['とても', '非常に', 'すごく', 'かなり', '極めて', 'めちゃくちゃ', 'めっちゃ', '超', 'ものすごく'];
// なくなることの打ち消し（「戦争は終わらない」「石油は尽きない」「動物は絶滅しない」）
const PERSIST_G = /(終わら|おわら|滅び|滅ば|なくなら|無くなら|消え|尽き|絶え|途絶え|止まら|止ま|やま|絶滅し|絶滅せ|滅亡し|滅亡せ|消滅し|消滅せ|崩壊し|崩壊せ|枯れ)(?:ない|ず|ぬ|ません|なかった)/gu;
// 場所や場合を限った否定（「海では育たない」）。「〜ではない」は含めない
const SCOPED = /[^、。はがをにでものと]{1,8}(?:の中|の内|の外|の上|の下)?では(?!な|あり)/u;
// 「ほどよく」「心地よく」は多さではない
const MORE_RE = /(?<!ほど|ちょうど|心地|気持ち|都合|程|行儀|仲)よく/u;
const HARD_RE = /(にくい|にくく|づらい|づらく)/u;
const EASY_RE = /(やすい|やすく)/u;

const INT = '(?:とても|すごく|非常に|かなり|少し|もっと|さらに)?';
const RESIST_G = new RegExp(`(?:に|には|にも)${INT}(?:強い|強く|負けない|負けず|負けな|耐え|耐性)`, 'gu');
const VULN_G = new RegExp(`(?:に|には)${INT}(?:弱い|弱く|もろい|もろく)`, 'gu');

// 「ほとんど」「少しも」のような言葉は、助詞と同じ文字（と・も）を含むので先に受け取る
const X = '((?:ほとんど|ちっとも|少しも|もう)?[^、。はがをにでものと]{1,8})';
// 「Xなしでは〜ない」「Xがなくては〜ない」は、X が必要という意味（二重否定）
// 「〜しなければならない」「〜なくてはいけない」は義務（しなければならない）で、「Xなしでは」ではない
const NEEDS_G = new RegExp(`${X}(?:が|を)?(?:なしでは|無しでは|なしには|無しには|がなくては|なくては|がなければ|なければ)(?!なら|いけ|だめ|ダメ)`, 'gu');
// 並べた名詞（漢字・カタカナ）
const NOUN = '[\\p{sc=Han}\\p{sc=Katakana}ー々]{1,8}';
const WITHOUT_G = [
  // 「食事も睡眠も必要としない」「水と光なしで」：並べたものは、どれもない
  new RegExp(`(${NOUN})[とやも](${NOUN})(?:を|は|が|も)?(?:なしで|無しで|なくても|必要とせず|必要としない|必要とはしない|必要ない|いらない|要らない|不要)`, 'gu'),
  new RegExp(`${X}(?:が|を|は)?(?:なしでも|無しでも|なしで|無しで|なしに|無しに|抜きで|ぬきで)`, 'gu'),
  new RegExp(`${X}(?:が|を|は)?(?:なくても|無くても|なくていい|なくてよい|なくて平気|なくて大丈夫|ずに済)`, 'gu'),
  new RegExp(`${X}(?:を|は|が)?(?:必要とせず|必要としない|必要とはしない|必要とすることはない|必要ない|必要がない|必要はない|いらない|要らない|不要)`, 'gu'),
  new RegExp(`${X}(?:を)?(?:使わずに|使わないで|使わずとも|用いずに)`, 'gu'),
  new RegExp(`${X}(?:しなくても|せずとも|せずに|しないで)`, 'gu'),
  new RegExp(`${X}(?:ずとも|ずに)`, 'gu'),
];
const ONLY_G = new RegExp(`${X}(?:に|で|を|が|は|と|へ)?(?:だけ|のみ|ばかり)`, 'gu');
/** 多さの言葉（「たくさんの水を必要としない」の「たくさん」） */
const MUCH = /^(?:たくさん|沢山|多く|大量|何度も|いっぱい|大勢)/u;
const NEED_NOT = '(?:を|は|が)?(?:必要としない|必要とせず|必要ない|いらない|要らない)';
/** 「たくさんの水を必要としない」「何度も食事を必要としない」：なしではなく、少なくてよい */
const MUCH_NEED = new RegExp(`(?:たくさんの|沢山の|多くの|大量の|いっぱいの|何度も)([^、。はがをにでものと]{1,8}?)${NEED_NOT}`, 'gu');
/** 「少しの水も必要としない」「わずかな食事を必要としない」：少しも要らない（なし） */
const LITTLE_NEED = new RegExp(`(?:少しの|わずかな|僅かな)([^、。はがをにでものと]{1,8}?)(?:も)?${NEED_NOT}`, 'gu');
const SHIKA_G = new RegExp(`${X}(?:に|で|を|が|は|と|へ|から)?しか`, 'gu');

function clean(x: string): string {
  return x.replace(/^[、はがをにでもの]+|[、はがをにでもの]+$/gu, '');
}

/**
 * 主語の前に付いた、動きの言葉で終わる説明（「病気で死ぬ人」「水をめぐる争い」）を外し、中心の名詞にする。
 * 形容詞の説明（「若い人」）と「の」でつないだ主語（「人間の仕事」）はそのまま
 */
function stripRelative(s: string): string {
  if (KIND.has(s)) return s;
  const m = /^.*[るたうくすつぬむぶぐ](?=[\p{sc=Han}\p{sc=Katakana}])/u.exec(s);
  return m ? s.slice(m[0].length) : s;
}

/**
 * 主語の形：後ろの助詞（「人間には」の「に」）だけを落とす。ひらがなの言葉（「がん」「もも」「かに」）は削らない
 */
function cleanSubject(x: string): string {
  return x.replace(/^、+/u, '').replace(/(?<=[\p{sc=Han}\p{sc=Katakana}ー々A-Za-z0-9])[、はがをにでもの]+$/u, '');
}

// 「ほとんど食事を必要としない」の「ほとんど」は、ないものではなく量の言葉
const ADVERB = /^(ほとんど|あまり|さほど|それほど|めったに|なかなか|まったく|全く|少しも|少し|ちっとも|もう)/u;

function adverbOf(x: string): string {
  return ADVERB.exec(x)?.[0] ?? '';
}

const DIGITS: Record<string, number> = { 〇: 0, 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 数: 3, 何: 3, 幾: 3 };
const UNITS: Record<string, number> = { 十: 10, 百: 100, 千: 1000, 万: 10000 };

/** 算用数字・漢数字（二十五・三百六十五 など）を数にする */
export function kanjiNumber(s: string | undefined): number {
  if (!s) return 1;
  if (/^\d+$/.test(s)) return Number(s);
  let total = 0;
  let section = 0;
  let cur = -1;
  for (const ch of s) {
    if (ch in DIGITS) cur = DIGITS[ch]!;
    else if (ch in UNITS) {
      const u = UNITS[ch]!;
      if (u === 10000) {
        total += (section + Math.max(0, cur)) * u;
        section = 0;
      } else section += (cur < 0 ? 1 : cur) * u;
      cur = -1;
    }
  }
  const n = total + section + Math.max(0, cur);
  return n > 0 ? n : 1;
}

const N = '(\\d+|[〇零一二三四五六七八九十百千万数何幾]+)';

/** 「数日に一度」「週に一度」「一日に三回」「毎週」などから頻度（毎日＝1）を読む */
export function frequency(t: string): number | null {
  if (/(一生に(一|1)?(度|回))/u.test(t)) return 0.0001;
  if (/(毎時|一時間ごと|1時間ごと|一時間おき|1時間おき)/u.test(t)) return 24;
  let m = new RegExp(`${N}時間(ごと|おき|に(一|1)?(度|回))`, 'u').exec(t);
  if (m) return 24 / kanjiNumber(m[1]);
  if (/(毎日|毎晩|毎朝|毎夜|一日一回|1日1回)/u.test(t)) return 1;
  if (/隔週/u.test(t)) return 1 / 14;
  if (/毎週/u.test(t)) return 1 / 7;
  if (/毎月/u.test(t)) return 1 / 30;
  if (/毎年/u.test(t)) return 1 / 365;
  m = new RegExp(`(一日|1日)に${N}(度|回)`, 'u').exec(t);
  if (m) return kanjiNumber(m[2]);
  if (/(一日おき|1日おき|隔日)/u.test(t)) return 0.5;
  m = new RegExp(`${N}日おき`, 'u').exec(t);
  if (m) return 1 / (kanjiNumber(m[1]) + 1);
  m = new RegExp(`${N}日(に(一|1)?(度|回)|ごと)`, 'u').exec(t);
  if (m) return 1 / kanjiNumber(m[1]);
  m = new RegExp(`週に${N}?(度|回)`, 'u').exec(t);
  if (m) return (m[1] ? kanjiNumber(m[1]) : 1) / 7;
  m = new RegExp(`${N}週間?(に(一|1)?(度|回)|ごと)`, 'u').exec(t);
  if (m) return 1 / (7 * kanjiNumber(m[1]));
  m = new RegExp(`${N}?(か月|ヶ月|カ月|ケ月|月)(に(一|1)?(度|回)|ごと)`, 'u').exec(t);
  if (m) return 1 / (30 * (m[1] ? kanjiNumber(m[1]) : 1));
  m = new RegExp(`${N}?年(に(一|1)?(度|回)|ごと)`, 'u').exec(t);
  if (m) return 1 / (365 * (m[1] ? kanjiNumber(m[1]) : 1));
  if (/(時々|ときどき|たまに)/u.test(t)) return 0.4;
  if (/(まれに|稀に|めったに)/u.test(t)) return 0.15;
  return null;
}

// 「だけ」「のみ」は強調なので条件に数えない（「〜のときだけ」は「とき」で条件になる）
const COND = /(とき|時に|時は|なら(?!ない|ず|ぬ)|場合|を超え|超えると|以上|以下|未満|の日|限り(?![がはのあ])|夜は|昼は)/u;

const EMPTY: TextFeatures = {
  text: '',
  empty: true,
  neg: false,
  less: false,
  more: false,
  resist: false,
  vulnerable: false,
  freq: null,
  except: '',
  cond: false,
  without: [],
  only: [],
  question: false,
  subject: null,
  rest: '',
  persist: false,
  scoped: false,
  bare: '',
};

/** 言葉があるかを見るための形（「Xなしで」「Xなしでは」「Xを必要としない」「Xは絶滅しない」の部分を除く） */
function bareOf(text: string): string {
  let t = text.replace(NEEDS_G, '、');
  for (const re of WITHOUT_G) t = t.replace(re, (_m, x: string) => `${adverbOf(x)}、`);
  return t.replace(PERSIST_G, '、');
}

export function features(raw: string): TextFeatures {
  const trimmed = raw.trim();
  const question = /[?？]$/u.test(trimmed) || /(ですか|ますか|のか|だろうか|でしょうか)[。.]?$/u.test(trimmed);
  const text = canonical(raw);
  if (text.length === 0) return { ...EMPTY };
  // 「ただし〜」より後は例外。「〜を除く」「〜以外」の前の言葉も例外に入れる
  const split = /(ただし|但し|ただ、)/u.exec(text);
  const main = split ? text.slice(0, split.index) : text;
  let except = split ? text.slice(split.index + split[0].length) : '';
  const exc = /([^、。]{1,8}?)(を除く|を除いて|以外)/u.exec(main);
  if (exc) except += exc[1];

  // 否定や量を読む前に、意味の決まった言い回しを取り出していく
  let work = main;
  const resist = RESIST_G.test(work);
  RESIST_G.lastIndex = 0;
  work = work.replace(RESIST_G, '、');
  const vulnerable = VULN_G.test(work);
  VULN_G.lastIndex = 0;
  work = work.replace(VULN_G, '、');
  let cancel = 0;
  work = work.replace(NEEDS_G, () => {
    cancel += 1;
    return '、';
  });
  const without: string[] = [];
  // 「たくさんの水を必要としない」「何度も食事を必要としない」は、なしではなく少なくてよい（量の言葉のついた打ち消し）
  let lessNeed = false;
  work = work.replace(MUCH_NEED, (_m, x: string) => {
    lessNeed = true;
    return `${x}、`;
  });
  work = work.replace(LITTLE_NEED, (_m, x: string) => {
    const w = clean(x);
    if (w) without.push(w);
    return '、';
  });
  for (const re of WITHOUT_G) {
    work = work.replace(re, (_m, x: string, y: unknown) => {
      const adv = adverbOf(x);
      for (const z of [x.slice(adv.length), typeof y === 'string' ? y : '']) {
        const w = clean(z);
        if (!w) continue;
        if (MUCH.test(w)) lessNeed = true;
        else without.push(w);
      }
      return `${adv}、`;
    });
  }
  const only: string[] = [];
  work = work.replace(ONLY_G, (_m, x: string) => {
    const w = clean(x);
    if (w) only.push(w);
    return `${x}、`;
  });
  work = work.replace(SHIKA_G, (_m, x: string) => {
    const w = clean(x);
    if (w) only.push(w);
    cancel += 1;
    return `${x}、`;
  });
  // 「しか〜ない」「なしでは〜ない」の「ない」は、否定として数えない
  for (let i = 0; i < cancel; i++) work = work.replace(/(ない|ません|ず)(?!.*(ない|ません|ず))/u, '');
  // 「終わらない」「尽きない」は、なくなることの打ち消し（そのものは続く）。否定として数えない
  const persist = PERSIST_G.test(work);
  PERSIST_G.lastIndex = 0;
  work = work.replace(PERSIST_G, '、');

  const plain = work.replace(NOT_NEG, '');
  const weak = WEAK_NEG.test(plain);
  const neg = !weak && NEG.test(plain);
  const lessWord = LESS_WORDS.some((w) => work.includes(w)) || weak || HARD_RE.test(work);
  const moreWord = MORE_WORDS.some((w) => work.includes(w)) || MORE_RE.test(work) || EASY_RE.test(work);
  const intense = INTENSIFIERS.some((w) => main.includes(w));
  // 「〜に強い」を「とても」で強めたら、強さ（more）として読む。「もっと強い」は比べているだけ
  const strong = STRONG.some((w) => main.includes(w));
  const subj = /^([^、。]{1,12}?)(?:は|が)/u.exec(main);
  return {
    text,
    empty: false,
    neg,
    more: !lessNeed && (moreWord || (intense && !lessWord && (!resist || strong))),
    less: lessNeed || (lessWord && !moreWord),
    resist,
    vulnerable,
    freq: lessNeed ? null : frequency(main),
    except,
    cond: COND.test(main.replace(/(ときどき)/gu, '')),
    without,
    only,
    question,
    subject: subj ? stripRelative(cleanSubject(subj[1]!)) || null : null,
    rest: subj ? main.slice(subj[0].length) : '',
    persist,
    scoped: neg && SCOPED.test(work),
    bare: bareOf(text),
  };
}

// ---------------------------------------------------------------- 規則との照合

/**
 * まとまりの言葉（「人は」「人間」）が、別の言葉の後ろ半分としてではなく出てくるか。
 * 「宇宙人は」「巨人は」の「人は」は数えない（世界の知らない「日本人は」は数える）
 */
function memberIn(text: string, m: string): boolean {
  const cls = charClass(m[0]);
  if (!cls) return text.includes(m);
  for (let i = text.indexOf(m); i >= 0; i = text.indexOf(m, i + 1)) {
    let s = i;
    while (s > 0 && charClass(text[s - 1]) === cls) s -= 1;
    if (s === i) return true;
    let e = i;
    while (e < text.length && charClass(text[e]) === cls) e += 1;
    if (!KNOWN.has(text.slice(s, e))) return true;
  }
  return false;
}

function hasWord(text: string, w: string): boolean {
  if (w.startsWith('@@')) return kindIn(text, w.slice(2));
  if (w.startsWith('@')) return (LEX.groups[w.slice(1)] ?? []).some((x) => memberIn(text, x));
  return text.includes(w);
}

// 打ち消しの形そのもの（「尽きない」「なくても」）を探す言葉は、元の文で探す
const LITERAL = /(ない|なく|なし|無し|ず|不要|いら|必要)/u;

/**
 * 規則の言葉が文にあるか。「光なしで育つ」の「光」、「絶滅しない」の「絶滅」のように、
 * ないと言っているものは「ある」に数えない（打ち消しの形そのものを探す言葉は、元の文で探す）
 */
function present(f: TextFeatures, w: string): boolean {
  const text = LITERAL.test(w) ? f.text : f.bare;
  if (!w.startsWith('@') && Array.from(w).length === 1 && charClass(w) === 'han') return charIn(text, w);
  return hasWord(text, w);
}

/**
 * 1文字の漢字の言葉が、その言葉として出てくるか。ものの名前の一部なら、その名前の中心（後ろ）のときだけ
 * （「日光」は光の一つ、「老人」は人の一つ。「石油」の「石」、「砂糖」の「砂」は数えない）
 */
function charIn(text: string, w: string): boolean {
  for (let i = text.indexOf(w); i >= 0; i = text.indexOf(w, i + 1)) {
    let s = i;
    let e = i + w.length;
    while (s > 0 && charClass(text[s - 1]) === 'han') s -= 1;
    while (e < text.length && charClass(text[e]) === 'han') e += 1;
    const run = text.slice(s, e);
    if (run === w || !NOUNSET.has(run) || run.endsWith(w)) return true;
  }
  return false;
}

function listHit(list: readonly string[], w: string): boolean {
  return list.some((x) => x.includes(w) || w.includes(x));
}

/**
 * 規則に合うか。flip を書いていない規則は、defaultFlip に従う
 * （書き換え・言い回しの規則は「否定していない文」だけに当てはめる。否定の文に使う規則は flip: true と書く）
 */
/** 主語の中心（「人間の仕事」なら「仕事」） */
function subjectHead(subject: string): string {
  // 辞書にある一つの言葉（「天の川」「絵の具」）は切らない
  if (KIND.has(subject)) return subject;
  // 「この」「その」の「の」では切らない（名詞のあとの「の」だけ）
  return subject.split(/(?<=[\p{sc=Han}\p{sc=Katakana}ー々])の/u).pop() ?? subject;
}

/**
 * 主語がその言葉か。漢字・カタカナだけの言葉は、主語の中に言葉として出てくるときだけ（「宇宙人」の主語は「宇宙」ではない）。
 * 「@人」のようなまとまりは、その中身のどれか
 */
function subjectIs(head: string, w: string): boolean {
  if (w.startsWith('@@')) return kindIn(head, w.slice(2));
  if (w.startsWith('@')) return tokens(head).includes(w.slice(1)) || (LEX.groups[w.slice(1)] ?? []).some((m) => memberIn(head, m));
  if (wordClass(w)) return tokens(head).includes(w);
  return head.includes(w);
}

function ruleMatches(f: TextFeatures, orig: TextFeatures, r: MatchRule, defaultFlip?: boolean): boolean {
  if (r.subject && !(f.subject && r.subject.some((w) => subjectIs(subjectHead(f.subject!), w)))) return false;
  // 述語がまるごとその言葉（「猫はない」）。続けて読点で文をつないだもの（「猫はない、犬は増える」）も
  if (r.rest && !r.rest.some((w) => f.rest === w || f.rest.startsWith(`${w}、`))) return false;
  if (r.any && !r.any.some((w) => present(f, w))) return false;
  if (r.all && !r.all.every((w) => present(f, w))) return false;
  if (r.none && r.none.some((w) => present(f, w))) return false;
  const flip = r.flip ?? defaultFlip;
  if (flip !== undefined && flip !== (f.neg !== orig.neg)) return false;
  if (r.less !== undefined && r.less !== f.less) return false;
  if (r.more !== undefined && r.more !== f.more) return false;
  if (r.resist !== undefined && r.resist !== f.resist) return false;
  if (r.vulnerable !== undefined && r.vulnerable !== f.vulnerable) return false;
  if (r.except && !(f.except.length > 0 && r.except.some((w) => hasWord(f.except, w)))) return false;
  if (r.without && !r.without.some((w) => listHit(f.without, w))) return false;
  if (r.only && !r.only.some((w) => listHit(f.only, w))) return false;
  if (r.cond !== undefined && r.cond !== f.cond) return false;
  if (r.freqMax !== undefined && !(f.freq !== null && f.freq <= r.freqMax)) return false;
  if (r.freqMin !== undefined && !(f.freq !== null && f.freq >= r.freqMin)) return false;
  return true;
}

export function matches(f: TextFeatures, orig: TextFeatures, rules: readonly MatchRule[], defaultFlip?: boolean): boolean {
  return rules.some((r) => ruleMatches(f, orig, r, defaultFlip));
}

// ---------------------------------------------------------------- 既存の行の読み取り

export interface LawReading {
  /** 読み取った意味（法則の形の id） */
  optionId: string;
  /** 世界が意味を読み取れたか */
  understood: boolean;
}

export function originalText(law: Law): string {
  return law.options.find((o) => o.id === law.initial)!.text ?? '';
}

/** 主語として数える言葉（主語の言葉と、そのまとまり・種類の中身） */
function subjectVocab(law: Law): Set<string> {
  const cached = SUBJECTS.get(law);
  if (cached) return cached;
  const v = new Set<string>();
  for (const w of subjectWords(law)) for (const t of tokens(w)) v.add(t);
  for (const w of law.subject) {
    for (const m of LEX.groups[w] ?? []) for (const t of tokens(canonical(m))) v.add(t);
    for (const [t, kind] of KIND) if (kind === canonical(w)) v.add(t);
  }
  SUBJECTS.set(law, v);
  return v;
}

/** 行の主語（元の文の「〜は」から助詞を落としたもの（「石油には」→「石油」）と、その言い換え） */
export function subjectWords(law: Law): string[] {
  const head = canonical(originalText(law)).split('は')[0] ?? '';
  const subject = head.replace(/[にでのもがへと]+$/u, '');
  return [subject, ...law.subject.map((w) => canonical(w))].filter((w) => w.length > 0);
}

function topicWords(law: Law): string[] {
  return law.topic.map((w) => canonical(w)).filter((w) => w.length > 0);
}

/**
 * 文章がこの行と同じものについて書かれているか。主語（言い換えを含む）と話題の言葉の両方があれば、重なりの大きさを返す。
 * 主語を書いた文は、主語の部分で主語を見る。話題の言葉は、主語の部分を除いたところで数える
 */
// 主語のすぐ後ろが、増える・減る・強まる・弱まる・変わることを言う言葉（「雨は増える」「風は強まる」）
const CHANGE = /^(?:は|が|も)?(?:もっと|とても|少し|さらに|急に|どんどん|ますます|だんだん)?(?:増え|増す|増し|減る|減っ|減ら|多く|多い|少な|強ま|強く|弱ま|弱く|激しく|穏やか|変わ|速く|遅く|半分|[一二三四五六七八九十数何\d]*倍)/u;

// 主語のすぐ後ろが、あるかないかを言う言葉（「〜は存在しない」「〜が消える」「〜はもういない」）
const EXISTENTIAL = /^(?:は|が|も)?(?:もう|すでに|どこにも|この世に|世界に|世界から|完全に|永遠に)?(?:存在し|存在せ|存在する|ない|無い|なくな|無くな|消え|消滅|いない|いなくな|滅び|滅ぶ|絶滅)/u;

export function aboutLaw(law: Law, text: string): number {
  const f = features(text);
  if (f.empty) return 0;
  if (law.exists.length > 0 && f.subject) {
    const head = subjectHead(f.subject);
    const after = f.text.slice(f.text.indexOf(f.subject) + f.subject.length);
    if (law.exists.some((w) => subjectIs(head, canonical(w))) && EXISTENTIAL.test(after)) return 100 + head.length;
  }
  const own = lawVocab(law);
  const subjects = subjectWords(law);
  const subjectOwn = subjectVocab(law);
  // 「人」は「人間」「人類」「みんな」なども主語に数える
  const groupHit = (t: string) => law.subject.some((w) => (LEX.groups[w] ?? []).some((m) => t.includes(m)));
  const inSubject = f.subject ? subjects.filter((w) => wordIn(f.subject!, w, subjectOwn)) : [];
  let s = 0;
  let rest = f.text;
  if (inSubject.length > 0 || (f.subject && groupHit(f.subject))) {
    s = Math.max(1, ...inSubject.map((w) => w.length));
    // 話題の言葉は、主語の言葉より後ろで数える（「生き物」の中の「生き」は数えず、「人間の寿命」の「寿命」は数える）
    const start = f.text.indexOf(f.subject!);
    const word = inSubject.sort((a, b) => b.length - a.length)[0];
    const at = word ? f.subject!.indexOf(word) : -1;
    rest = at >= 0 ? f.text.slice(start + at + word!.length) : f.text.slice(start + f.subject!.length);
  } else {
    for (const w of subjects) if (w.length > s && wordIn(f.text, w, subjectOwn)) s = w.length;
    // 主語の位置にない言葉は、弱く数える（「食事が人間に必要だ」など語順の違う文）
    if (f.subject) s /= 2;
  }
  if (s === 0) return 0;
  let topic = 0;
  for (const w of topicWords(law)) if (wordIn(rest, w, own)) topic += w.length;
  // 主語そのものが話題の言葉でもある行（「犯罪はない」「戦争は終わらない」など）。述語に別の言葉があるなら、その言葉の話
  if (topic === 0 && f.subject && (tokens(bareOf(rest)).filter((t) => !COMMON.has(t)).length === 0 || CHANGE.test(rest))) for (const w of topicWords(law)) if (wordIn(f.subject, w, own)) topic += w.length;
  return topic === 0 ? 0 : s + topic;
}

/** a が b から文字を消しただけの文か（言葉を消す書き換え） */
function isDeletionOf(a: string, b: string): boolean {
  if (a.length >= b.length) return false;
  let j = 0;
  for (const ch of b) if (j < a.length && a[j] === ch) j += 1;
  return j === a.length;
}

/**
 * 手がかりのない、同じものについての言い換えか（元の意味のまま受け取る）。
 * 「総量は変わらない」のような打ち消しの行を「消えない」と言い換えるのも、同じ向き
 */
function paraphrase(law: Law, f: TextFeatures, orig: TextFeatures, scope = ''): boolean {
  const samePolarity = f.neg === orig.neg || (f.persist && !f.neg && orig.neg);
  if (!samePolarity || f.less || f.more || f.resist || f.cond || f.except !== '' || f.without.length > 0 || f.only.length > 0) return false;
  // 回数の言葉（毎年・たまに）は、回数で読み分ける行（食事・睡眠など）でだけ意味を持つ
  const byFreq = law.options.some((o) => (o.match ?? []).some((r) => r.freqMin !== undefined || r.freqMax !== undefined));
  if (byFreq && f.freq !== null && f.freq !== orig.freq) return false;
  const own = lawVocab(law);
  // 主語を書いていない文は、その行の主語のまま
  if (f.subject !== null && !subjectWords(law).some((w) => wordIn(f.text, w, own)) && !subjectFits(law, f.subject)) return false;
  if (!topicWords(law).some((w) => wordIn(f.text, w, own))) return false;
  // 元の文にもその行にもない、新しいものを持ち込んだ文は言い換えではない（「雨はお菓子になる」）
  // 「海では」のように場所を限った言葉は、新しいものに数えない
  if (novelWords(law, scope ? { ...f, text: f.text.replace(scope, '、') } : f).length > 0) return false;
  return true;
}

/**
 * 既存の法則を書き換えた文章を読み取る。
 * 順に：空なら削除 → 元の文 → 主語が別のものなら読まない → 場所を限った否定は元のまま →
 * 削除以外の読み取り → 言葉を消しただけで話題の言葉がなくなった文は削除 → 削除の規則 → 言い換え
 */
export function interpretLaw(law: Law, text: string): LawReading {
  const f = features(text);
  const origText = originalText(law);
  const orig = features(origText);
  const del = law.options.find((o) => o.kind === 'delete');
  if (f.empty) return { optionId: del?.id ?? law.initial, understood: true };
  if (f.text === orig.text) return { optionId: law.initial, understood: true };
  // 画面に出る読み取りの名前をそのまま書いた文は、その読み取り（「食事の回数が減る」）
  const byLabel = law.options.find((o) => o.kind !== 'original' && canonical(o.label.replace(/（[^）]*）$/u, '')) === f.text);
  if (byLabel) return { optionId: byLabel.id, understood: true };
  // 別のものを主語にした文（「生き物はいつか死ぬ」→「人工知能は死なない」）は、この行の意味としては読まない
  if (f.subject && !subjectFits(law, f.subject)) return { optionId: law.initial, understood: false };
  // 「作物は海では育たない」：限った場所の話で、そのほかでは元のまま（限った場所の言葉は、新しいものに数えない）
  if (f.scoped) {
    const scope = SCOPED.exec(f.text)?.[0] ?? '';
    // 限った場所そのものが読み取りの手がかりの文（「食べ物は蔵の中では腐らない」の「蔵」）は、その読み取り
    for (const o of law.options) {
      if (o.kind === 'delete' || !o.match) continue;
      const rules = o.match.filter((r) => (r.any ?? []).some((w) => scope.includes(w)));
      if (rules.length > 0 && matches(f, orig, rules, false)) return { optionId: o.id, understood: true };
    }
    return { optionId: law.initial, understood: paraphrase(law, { ...f, neg: orig.neg }, orig, scope) };
  }
  // その行の知らない動きを打ち消した文（「人は死を望まない」の「望まない」）では、
  // 打ち消しだけを手がかりにする規則（「人は〜ない」）を当てない（「人は死なない」と読まないように）
  const otherVerb = novelVerbs(law, f).length > 0;
  const onlyNegation = (r: MatchRule) => r.flip === true && !r.any && !r.rest && (r.all ?? []).every((w) => w.startsWith('@'));
  for (const o of law.options) {
    if (o.kind === 'delete' || !o.match) continue;
    const rules = otherVerb ? o.match.filter((r) => !onlyNegation(r)) : o.match;
    if (rules.length > 0 && matches(f, orig, rules, false)) return { optionId: o.id, understood: true };
  }
  if (del && isDeletionOf(normalize(text), normalize(origText))) {
    // 言葉を消しただけの文：話題の言葉がなくなった（「人間は毎日を必要とする」）か、
    // 述語を消して「〜を」「〜に」で途切れた（「火は燃えるものを」）なら、その法則を消したことになる
    if (!topicWords(law).some((w) => f.text.includes(w)) || /(?:[をにがはへとでの]|から|より)$/u.test(normalize(text))) {
      return { optionId: del.id, understood: true };
    }
  }
  if (del?.match) {
    // 新しいものを打ち消した文（「人間は魚を食べない」）は、その行を打ち消したことにはならない。
    // 「食事も睡眠も必要としない」のように並べた言葉は、その行の言葉と一緒に打ち消している
    const topics = topicWords(law);
    const together = (t: string) => /[もとや]/u.test(f.text[f.text.indexOf(t) + t.length] ?? '') && topics.some((w) => new RegExp(`${escapeRe(w)}[もとや]`, 'u').test(f.text));
    const novel = novelWords(law, f, true).filter((t) => !together(t)).length > 0 || novelVerbs(law, f).length > 0;
    const narrow = !!f.subject && narrowSubject(law, f.subject);
    const rules = novel || narrow ? del.match.filter((r) => !(r.flip && !r.any && !r.all)) : del.match;
    if (matches(f, orig, rules)) return { optionId: del.id, understood: true };
  }
  if (paraphrase(law, f, orig)) return { optionId: law.initial, understood: true };
  return { optionId: law.initial, understood: false };
}

/** 書き足した文章が既存の行の書き換えとして読めるとき、その行と読み取り */
export interface AddedAsLaw {
  law: Law;
  optionId: string;
}

/**
 * 書き足した文章を、既存の行の書き換えとして読めるか試す。
 * 同じものについて書かれた行（主語と話題の言葉が多く重なる順）から、意味を読み取れた最初の行を返す
 */
export function interpretAsLaw(laws: readonly Law[], text: string, except: string | null = null): AddedAsLaw | null {
  const f = features(text);
  if (f.empty) return null;
  const ranked = laws
    .map((law, i) => ({ law, i, score: law.id === except ? 0 : aboutLaw(law, text) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i);
  for (const { law } of ranked) {
    const r = interpretLaw(law, text);
    if (r.understood) return { law, optionId: r.optionId };
  }
  return null;
}

// ---------------------------------------------------------------- 書き足した一文の言い回し

const NEUTRAL: TextFeatures = { ...EMPTY, empty: false };

/**
 * 文章に当てはまる言い回しを、書いてある順にすべて返す（1文に複数の概念を書ける）。
 * fallback：言い回し集の「あとで読む」側（願い・世界そのものへの命令など）を読むか。
 * generic：種類ごとの読み取り（ほかに何も読めなかったときだけ当てる側）を読むか
 */
export function matchPhrases(phrases: readonly Phrase[], text: string, fallback: boolean, generic = false): Phrase[] {
  const f = features(text);
  if (f.empty) return [];
  return phrases.filter((p) => p.fallback === fallback && p.generic === generic && matches(f, NEUTRAL, p.match, false));
}

/**
 * 言い回しの名前。「{X:ある動物}」は、書いた文の主語（「猫」）で埋める。文がなければ「:」の後ろ（ある動物）
 */
export function phraseName(name: string, text?: string): string {
  if (!name.includes('{X')) return name;
  const head = text ? subjectShown(text) : '';
  return name.replace(/\{X(?::([^}]*))?\}/gu, (_m, fallback: string | undefined) => head || fallback || '何か');
}

/** 名前に出す主語。読み取りの主語と同じものを指すなら、書いた人の言葉のまま（「ChatGPT」「SNS」） */
function subjectShown(text: string): string {
  const subject = features(text).subject;
  if (!subject) return '';
  const head = subjectHead(subject);
  const raw = /^([^、。]{1,12}?)(?:は|が)/u.exec(normalize(text));
  if (raw) {
    const own = subjectHead(cleanSubject(raw[1]!));
    if (own && canonical(own) === head) return own;
  }
  return head;
}

/** 互換：最初に当てはまる言い回し（あとで読む側、種類ごとの読み取りの順に） */
export function interpretLine(phrases: readonly Phrase[], text: string): Phrase | null {
  return (
    matchPhrases(phrases, text, false)[0] ??
    matchPhrases(phrases, text, true)[0] ??
    matchPhrases(phrases, text, true, true)[0] ??
    null
  );
}

// ---------------------------------------------------------------- 読み取れない文

export type NoiseKind = 'symbols' | 'short' | 'question' | 'foreign' | 'unknown-words' | 'unclear';

/** 世界が読み取れなかった文の種類（何が足りなかったかを伝えるため） */
export function noiseOf(raw: string): { kind: NoiseKind; words: string[] } {
  const t = normalize(raw);
  const letters = Array.from(t.replace(/[^\p{L}\p{N}]/gu, ''));
  if (!/\p{L}/u.test(t)) return { kind: 'symbols', words: [] };
  if (letters.length <= 2) return { kind: 'short', words: [] };
  if (features(raw).question) return { kind: 'question', words: [] };
  const c = canonical(raw);
  const latin = (c.match(/[a-z]/g) ?? []).length;
  if (latin > Array.from(c).length * 0.5) return { kind: 'foreign', words: [] };
  const words = unknownWords(c).filter((w) => !/^[a-z]+$/.test(w));
  if (words.length > 0) return { kind: 'unknown-words', words: words.slice(0, 2) };
  return { kind: 'unclear', words: [] };
}

// ---------------------------------------------------------------- 言い切りの強さ

/**
 * 書いた文の言い切りの強さ。「すべて」「決して」と、打ち消して言い切った文（「〜ない」「〜を必要としない」）は強い（効きも反動も大きい）。
 * 「やや」「ゆるやかに」「ときどき」でやわらげた文は控えめ（効きも反動も小さい）。手がかりがなければふつう。
 * 「ただし〜」「〜のとき」「少しの〜」のように範囲や量を絞った書き方は、読み取り（例外・条件つき・少ない）そのものに表れるので、強さには数えない
 */
/**
 * 書き方の読み分けの手がかり（語尾）：制度（〜なければならない・〜させる・〜を配る・法律で）か、条件つき（〜とき・〜なら・余った）か。
 * どちらもなければ null（言い回しの既定の読まれ方になる）。条件と決まりの両方があれば、条件つき（決まりも、その条件のときだけ）
 */
export function modeCue(raw: string): 'rule' | 'conditional' | null {
  const t = normalize(raw);
  if (t === '') return null;
  const m = LEX.modes ?? { rule: [], conditional: [] };
  // 「〜ねばならない」の「なら」は条件ではない
  const c = t.replace(/なら(?:ない|ず|ぬ|なかった|なく)/gu, '');
  if (m.conditional.some((w) => c.includes(w))) return 'conditional';
  if (m.rule.some((w) => t.includes(w))) return 'rule';
  return null;
}

export function strengthOf(text: string): 'strong' | 'plain' | 'mild' {
  const f = features(text);
  if (f.empty) return 'plain';
  const words = LEX.strength ?? { strong: [], mild: [] };
  const t = f.text;
  if (words.mild.some((w) => t.includes(w))) return 'mild';
  const scoped = f.except !== '' || f.cond || f.scoped;
  if (words.strong.some((w) => t.includes(w)) || (!scoped && (f.neg || f.without.length > 0))) return 'strong';
  return 'plain';
}

// ---------------------------------------------------------------- 世界の読み（書いている最中の言葉の印）

/** 書いている文の、ひとかたまりの言葉と、世界がその言葉を知っているか（ひらがな・記号は null） */
export interface WordMark {
  text: string;
  known: boolean | null;
}

const RUN_G = /[\p{sc=Han}々]+|[\p{sc=Katakana}ー]+|[A-Za-z0-9Ａ-Ｚａ-ｚ０-９]+/gu;

/**
 * 書いている文を言葉に分け、世界が知っている言葉か、知らない言葉かの印を付ける（結果の予測ではなく、言葉が通じるかだけ）。
 * 漢字・カタカナ・英数字のかたまりを言葉とみる
 */
export function wordMarks(raw: string): WordMark[] {
  const out: WordMark[] = [];
  let last = 0;
  for (const m of raw.matchAll(RUN_G)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: raw.slice(last, i), known: null });
    const run = m[0];
    const c = canonical(run);
    const latin = /^[a-z0-9]+$/.test(c);
    const known = latin ? /^\d+$/.test(c) || c !== run.normalize('NFKC').toLowerCase() || KNOWN.has(c) : unknownWords(c).length === 0;
    out.push({ text: run, known });
    last = i + run.length;
  }
  if (last < raw.length) out.push({ text: raw.slice(last), known: null });
  return out;
}

/**
 * 世界の辞書に集める言葉：書いた文の言葉のかたまり（「世界の読み」で実線か点線が付くもの）を、
 * 世界に通じた言葉と、世界がまだ知らない言葉に分ける（書いた人の書いたままの形で。幅だけそろえる）。
 * 数字だけの言葉と、種類のわからない1文字の言葉は集めない
 */
export function dictionaryWords(raw: string): { known: string[]; unknown: string[] } {
  const known: string[] = [];
  const unknown: string[] = [];
  for (const m of wordMarks(raw)) {
    if (m.known === null) continue;
    const w = m.text.normalize('NFKC');
    if (/^[0-9]+$/.test(w)) continue;
    if (m.known) {
      if (Array.from(w).length < 2 && !kindOf(w)) continue;
      if (!known.includes(w)) known.push(w);
    } else if (!unknown.includes(w)) unknown.push(w);
  }
  return { known, unknown };
}

// ---------------------------------------------------------------- 重さ

/** 文章の文字数（世界容量で数える量）。句読点・かっこ・空白は数えない。文字は見た目の数で数える（絵文字も1文字） */
export function textCost(text: string): number {
  const shown = normalize(text);
  if (shown.length === 0) return 0;
  return Array.from(shown.replace(/[、。,.!?！？「」『』（）()・]/gu, '')).length;
}

/** 行の重さ：文章の文字数に、行が運ぶ新しい概念の重さ（文字数に換算した量）を足す */
export function lineCost(phraseById: ReadonlyMap<string, Phrase>, text: string, phraseIds: readonly string[]): number {
  let w = textCost(text);
  for (const id of phraseIds) w += phraseById.get(id)?.weight ?? 0;
  return w;
}
