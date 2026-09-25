/**
 * いろいろな単語を、いろいろな位置に入れて書き換え・書き足しを試す（読み取りの総当たり）。
 *   npm run fuzz            （集計と、怪しい読み取りの例）
 *   npm run fuzz -- all     （怪しい読み取りをすべて出す）
 * 見るもの：
 *   - 例外を投げない、時間を進めても数値が壊れない（NaN・無限大にならない）
 *   - その行と関係のない言葉を入れた文が、その行の特定の読み取りや削除にならない
 *   - 書き足した文が、主語の違う行の書き換えとして読まれない
 */
import { advance, canonical, createGame, originalText, planWrite, write, type GameData, type GameState, type WriteTarget } from '../src/core';
import { gameData } from '../src/data';

/** 入れてみる名詞（世界の言葉・日常の言葉・知らない言葉・英語・記号） */
export const NOUNS = [
  // 世界の言葉
  '人間', '植物', '水', '光', '二酸化炭素', '病原体', '石油', '電気', '太陽', '雨', '海', '季節', '火', '風', '国家', 'お金',
  '戦争', '兵器', '機械', '動物', '雲', '酸素', '食べ物', '土', '免疫', '薬', '月', '重力', '宇宙', '地球', '魔法', '宇宙人',
  // 日常の言葉
  '学校', '猫', '犬', '魚', '鳥', '車', '本', '音楽', '愛', '夢', '歌', '家', '服', '雪', '氷', '山', '川', '森', '空', '星',
  '時間', '言葉', '心', '涙', '砂糖', 'パン', '米', '肉', '野菜', '果物', 'チョコレート', 'スマホ', 'インターネット', 'ゲーム',
  '数学', '芸術', '宗教', '政府', '会社', '税金', '選挙', '法律', '病院', '医者', '先生', '子ども', '老人', '王', '恐竜',
  'ドラゴン', '妖精', '幽霊', '天使', '悪魔', '勇者', '忍者', '侍', 'ロボット', '人工知能', 'ゾンビ', '神',
  // 英語・記号・崩れた言葉
  'love', 'cats', 'money', '🍕', '###', '12345', 'ポポポ', 'ああああ',
];

/** 入れてみる述語（肯定と否定） */
export const VERBS: [string, string][] = [
  ['必要とする', '必要としない'], ['食べる', '食べない'], ['飲む', '飲まない'], ['作る', '作らない'], ['壊す', '壊さない'],
  ['愛する', '愛さない'], ['嫌う', '嫌わない'], ['忘れる', '忘れない'], ['覚える', '覚えない'], ['生む', '生まない'],
  ['増やす', '増やさない'], ['減らす', '減らさない'], ['守る', '守らない'], ['奪う', '奪わない'], ['歌う', '歌わない'],
  ['眠る', '眠らない'], ['光る', '光らない'], ['燃える', '燃えない'], ['凍る', '凍らない'], ['溶ける', '溶けない'],
  ['飛ぶ', '飛ばない'], ['泳ぐ', '泳がない'], ['消える', '消えない'], ['増える', '増えない'], ['減る', '減らない'],
  ['変わる', '変わらない'], ['止まる', '止まらない'], ['話す', '話さない'], ['笑う', '笑わない'], ['やめる', 'やめない'],
];

/** 差し込む副詞 */
export const ADVERBS = ['少し', 'とても', '全く', '決して', '二度と', '永遠に', 'たまに', 'いつも', '毎年', '半分だけ', '十倍', 'ほとんど', 'もっと', 'ずっと', '急に', 'ゆっくり', '必ず', '絶対に', 'すべて', '誰も'];

export type Outcome = { kind: 'reading' | 'same' | 'delete' | 'replaced' | 'phrase' | 'redirect' | 'stacked' | 'redundant' | 'noise' | 'block'; detail: string };

/** 書いた結果を、種類と中身に分ける */
export function outcomeOf(g: GameState, data: GameData, target: WriteTarget, text: string): Outcome {
  const p = planWrite(g, data, target, text);
  const r = p.result;
  if (r.block === 'redundant') return { kind: 'redundant', detail: r.reading ?? '' };
  if (r.block) return { kind: 'block', detail: r.block };
  if (r.redirect) return { kind: 'redirect', detail: `${r.redirect}.${p.written.laws[r.redirect]}` };
  if (!r.understood) return { kind: 'noise', detail: r.noise?.kind ?? '?' };
  if (target.kind === 'law') {
    const law = data.lawById.get(target.id)!;
    const opt = p.written.laws[target.id]!;
    const c = p.written.carried[target.id];
    const extra = [...(c?.phrases ?? []), ...(c?.law ? [`${c.law.id}.${c.law.option}`] : [])].join('+');
    if (r.replaced) return { kind: 'replaced', detail: extra };
    if (opt === law.initial) return { kind: extra ? 'phrase' : 'same', detail: extra };
    const kind = law.options.find((o) => o.id === opt)?.kind === 'delete' ? 'delete' : 'reading';
    return { kind, detail: `${opt}${extra ? `+${extra}` : ''}` };
  }
  if (r.stacked) return { kind: 'stacked', detail: r.stacked };
  const id = `x${g.nextExtra}`;
  return { kind: 'phrase', detail: (p.written.carried[id]?.phrases ?? []).join('+') };
}

/** 行の元の文を、言葉のかたまり（名詞・述語）に分ける */
export function slotsOf(text: string): { nouns: { at: number; word: string }[]; predicate: { at: number; word: string } | null } {
  const t = text.replace(/。$/u, '');
  const nouns: { at: number; word: string }[] = [];
  const re = /([\p{sc=Han}\p{sc=Katakana}ー々]+)(?=は|が|を|に|で|と|の|へ|から|より|や|も)/gu;
  for (const m of t.matchAll(re)) nouns.push({ at: m.index, word: m[1]! });
  const pm = /([\p{sc=Han}々]+[ぁ-ん]*)$/u.exec(t);
  return { nouns, predicate: pm ? { at: pm.index, word: pm[1]! } : null };
}

export interface Case {
  target: WriteTarget;
  text: string;
  /** 名詞の差し替えなら、その名詞を消しただけの文（同じ読み取りなら、差し替えた名詞のせいではない） */
  without?: string;
  /** 何を入れたか（怪しいかどうかを判断するため） */
  what: 'noun' | 'verb' | 'adverb' | 'add';
  word: string;
  negated: boolean;
}

/** 試す文をすべて作る */
export function cases(data: GameData): Case[] {
  const out: Case[] = [];
  for (const law of data.laws) {
    const orig = originalText(law).replace(/。$/u, '');
    const { nouns, predicate } = slotsOf(orig);
    for (const n of nouns) {
      for (const w of NOUNS) {
        if (w === n.word) continue;
        const after = orig.slice(n.at + n.word.length);
        const without = `${orig.slice(0, n.at)}${after.replace(/^(?:と|や|を|に|で|の|へ|から|より|が|は|も)/u, '')}。`;
        out.push({ target: { kind: 'law', id: law.id }, text: `${orig.slice(0, n.at)}${w}${after}。`, what: 'noun', word: w, negated: false, without });
      }
    }
    if (predicate) {
      for (const [pos, neg] of VERBS) {
        for (const [v, negated] of [[pos, false], [neg, true]] as const) {
          out.push({ target: { kind: 'law', id: law.id }, text: `${orig.slice(0, predicate.at)}${v}。`, what: 'verb', word: v, negated });
        }
      }
      for (const a of ADVERBS) out.push({ target: { kind: 'law', id: law.id }, text: `${orig.slice(0, predicate.at)}${a}${orig.slice(predicate.at)}。`, what: 'adverb', word: a, negated: false });
    }
  }
  for (const n of NOUNS) {
    for (const [pos, neg] of VERBS) {
      out.push({ target: { kind: 'new' }, text: `${n}は${pos}。`, what: 'add', word: n, negated: false });
      out.push({ target: { kind: 'new' }, text: `${n}は${neg}。`, what: 'add', word: n, negated: true });
    }
    for (const tail of ['存在しない', 'どこにでもある', '無限にある', '空を飛ぶ', '世界を支配する']) out.push({ target: { kind: 'new' }, text: `${n}は${tail}。`, what: 'add', word: n, negated: tail.includes('ない') });
  }
  return out;
}

/** 数値が壊れていないか（NaN・無限大） */
export function broken(g: GameState): string | null {
  for (const [k, v] of Object.entries(g.sim)) if (typeof v === 'number' && !Number.isFinite(v)) return `sim.${k}=${v}`;
  for (const [k, v] of Object.entries(g.derived)) if (typeof v === 'number' && !Number.isFinite(v)) return `derived.${k}=${v}`;
  for (const [k, v] of Object.entries(g.scores)) if (!Number.isFinite(v)) return `scores.${k}=${v}`;
  return null;
}

/** その行と関係のない言葉か（その行の文・規則・主語・話題のどこにもない） */
function unrelated(data: GameData, lawId: string, word: string): boolean {
  const law = data.lawById.get(lawId)!;
  const words = [originalText(law), ...law.subject, ...law.topic, ...law.options.flatMap((o) => [o.text ?? '', ...(o.match ?? []).flatMap((r) => [...(r.any ?? []), ...(r.all ?? []), ...(r.without ?? []), ...(r.only ?? [])])])].join(' ');
  return !words.includes(word);
}

/** 怪しい読み取りか（理由） */
export function suspicious(data: GameData, c: Case, o: Outcome, same?: (c: Case) => boolean): string | null {
  if (c.target.kind === 'law') {
    const lawId = c.target.id;
    if (c.what === 'noun' && (o.kind === 'delete' || o.kind === 'reading') && unrelated(data, lawId, c.word) && !(same && same(c))) {
      if (o.kind === 'delete') return '関係のない言葉で、その行が消えた';
      if (o.kind === 'reading') return '関係のない言葉で、その行の特定の読み取りになった';
    }
    // 「回復しにくくなる」のように、削除が弱まりを表す行もある
    const delLabel = data.lawById.get(lawId)!.options.find((x) => x.kind === 'delete')?.label ?? '';
    if (c.what === 'adverb' && o.kind === 'delete' && !['全く', '決して', '二度と', '誰も'].includes(c.word) && !delLabel.includes('にく')) return '副詞を足しただけで、その行が消えた';
    return null;
  }
  if (o.kind === 'redirect') {
    const lawId = o.detail.split('.')[0]!;
    const law = data.lawById.get(lawId)!;
    const subj = [originalText(law).split('は')[0] ?? '', ...law.subject, ...law.exists].map((w) => canonical(w)).join(' ');
    const word = canonical(c.word);
    if (!subj.includes(word) && !law.topic.some((t) => t.includes(word) || word.includes(t))) return `主語「${c.word}」の文が、別の行（${lawId}）の書き換えになった`;
  }
  return null;
}

function main(): void {
  const showAll = process.argv[2] === 'all';
  const list = cases(gameData);
  const byKind: Record<string, number> = {};
  const flagged: { c: Case; o: Outcome; why: string }[] = [];
  const errors: string[] = [];
  let simulated = 0;
  list.forEach((c, i) => {
    const g = createGame(gameData, 'food', 1);
    g.sim.capacityMax += 40 * 6;
    let o: Outcome;
    try {
      o = outcomeOf(g, gameData, c.target, c.text);
    } catch (e) {
      errors.push(`例外: 「${c.text}」 ${(e as Error).message}`);
      return;
    }
    byKind[o.kind] = (byKind[o.kind] ?? 0) + 1;
    // 読み取りの本体（「+」より前）が、その名詞を消しただけの文と同じなら、差し替えた名詞のせいではない（名詞が運ぶ概念は足される）
    const base = (x: Outcome) => `${x.kind}:${x.detail.split('+')[0]}`;
    const same = (x: Case) => !!x.without && base(outcomeOf(createGame(gameData, 'food', 1), gameData, x.target, x.without)) === base(o);
    const why = suspicious(gameData, c, o, same);
    if (why) flagged.push({ c, o, why });
    // 20件に1件は、書き込んで5年進める（数値が壊れないか）
    if (i % 20 === 0 && o.kind !== 'block' && o.kind !== 'redundant') {
      try {
        write(g, gameData, c.target, c.text);
        advance(g, gameData, 5);
        const b = broken(g);
        if (b) errors.push(`数値が壊れた: 「${c.text}」 ${b}`);
        simulated += 1;
      } catch (e) {
        errors.push(`進めて例外: 「${c.text}」 ${(e as Error).message}`);
      }
    }
  });
  console.log(`試した文 ${list.length}（時間を進めた ${simulated}）`);
  console.log(`結果の種類 ${JSON.stringify(byKind)}`);
  console.log(`例外・数値の破綻 ${errors.length}`);
  for (const e of errors.slice(0, 20)) console.log(`  ${e}`);
  const groups = new Map<string, { c: Case; o: Outcome }[]>();
  for (const f of flagged) groups.set(f.why, [...(groups.get(f.why) ?? []), f]);
  console.log(`怪しい読み取り ${flagged.length}`);
  for (const [why, fs] of groups) {
    console.log(`■ ${why}（${fs.length}）`);
    for (const f of showAll ? fs : fs.slice(0, 25)) {
      const t = f.c.target.kind === 'law' ? f.c.target.id : '＋';
      console.log(`  ${t.padEnd(16)} 「${f.c.text}」→ ${f.o.kind} ${f.o.detail}`);
    }
  }
}

if (process.argv[1]?.endsWith('fuzz.ts')) main();
