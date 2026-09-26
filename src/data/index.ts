import { z } from 'zod';
import { validateCondition } from '../core/conditions';
import { hashText } from '../core/hash';
import { canonical, evenParticles, originalText } from '../core/interpret';
import { setLexicon } from '../core/interpret';
import type { GameData, NamedMeaning } from '../core/types';
import anomaliesRaw from './anomalies.json';
import balanceRaw from './balance.json';
import combosRaw from './combos.json';
import conceptsRaw from './concepts.json';
import crisesRaw from './crises.json';
import endingsRaw from './endings.json';
import accessRaw from './access.json';
import achievementsRaw from './achievements.json';
import eventsRaw from './events.json';
import indicatorsRaw from './indicators.json';
import lawsRaw from './laws.json';
import lexiconRaw from './lexicon.json';
import phrasesRaw from './phrases.json';
import sceneRaw from './scene.json';
import stagesRaw from './stages.json';
import tagsRaw from './tags.json';
import twistsRaw from './twists.json';
import sourcesRaw from './sources.json';
import unlocksRaw from './unlocks.json';
import {
  AccessSchema,
  AnomalySchema,
  BalanceSchema,
  ComboSchema,
  AchievementSchema,
  ConceptSchema,
  CrisisSchema,
  EndingSchema,
  EventSchema,
  IndicatorsSchema,
  LawSchema,
  LexiconSchema,
  PhraseSchema,
  SceneDataSchema,
  SourcesSchema,
  UnlocksSchema,
  StageSchema,
  TagSchema,
  TwistSchema,
  type LawOption,
  type SceneSpec,
  type MatchRule,
  type StageId,
} from './schema';

export interface RawData {
  balance: unknown;
  concepts: unknown;
  laws: unknown;
  phrases: unknown;
  twists: unknown;
  events: unknown;
  anomalies: unknown;
  combos: unknown;
  tags: unknown;
  stages: unknown;
  indicators: unknown;
  lexicon: unknown;
  crises: unknown;
  endings: unknown;
  achievements: unknown;
  scene: unknown;
  access: unknown;
  sources: unknown;
  unlocks: unknown;
}

export const RAW_DATA: RawData = {
  balance: balanceRaw,
  concepts: conceptsRaw,
  laws: lawsRaw,
  phrases: phrasesRaw,
  twists: twistsRaw,
  events: eventsRaw,
  anomalies: anomaliesRaw,
  combos: combosRaw,
  tags: tagsRaw,
  stages: stagesRaw,
  indicators: indicatorsRaw,
  lexicon: lexiconRaw,
  crises: crisesRaw,
  endings: endingsRaw,
  achievements: achievementsRaw,
  scene: sceneRaw,
  access: accessRaw,
  sources: sourcesRaw,
  unlocks: unlocksRaw,
};

export class DataError extends Error {}

function uniqueIds(what: string, items: { id: string }[]): void {
  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(it.id)) throw new DataError(`${what} の id が重なっている: ${it.id}`);
    seen.add(it.id);
  }
}

/** JSON を検査して、索引を付けたゲームの内容にする。おかしな所があれば投げる */
export function buildGameData(raw: RawData): GameData {
  const data: GameData = {
    balance: BalanceSchema.parse(raw.balance),
    concepts: z.array(ConceptSchema).parse(raw.concepts),
    laws: z.array(LawSchema).parse(raw.laws),
    phrases: z.array(PhraseSchema).parse(raw.phrases),
    twists: z.array(TwistSchema).parse(raw.twists),
    events: z.array(EventSchema).parse(raw.events),
    anomalies: z.array(AnomalySchema).parse(raw.anomalies),
    combos: z.array(ComboSchema).parse(raw.combos),
    tags: z.array(TagSchema).parse(raw.tags),
    stages: z.array(StageSchema).parse(raw.stages),
    indicators: IndicatorsSchema.parse(raw.indicators),
    lexicon: LexiconSchema.parse(raw.lexicon),
    crises: z.array(CrisisSchema).parse(raw.crises),
    // 結末は、大きい priority から確かめる（同じなら書いた順）
    endings: z
      .array(EndingSchema)
      .parse(raw.endings)
      .map((e, i) => ({ e, i }))
      .sort((a, b) => b.e.priority - a.e.priority || a.i - b.i)
      .map((x) => x.e),
    achievements: z.array(AchievementSchema).parse(raw.achievements),
    sources: SourcesSchema.parse(raw.sources ?? {}),
    unlocks: UnlocksSchema.parse(raw.unlocks),
    // 規則の版：データの中身が1字でも変われば変わる（棋譜は、同じ版の規則でだけ再生する）
    rulesVersion: Math.floor(hashText(JSON.stringify(raw)) * 2 ** 32).toString(36),
    scene: SceneDataSchema.parse(raw.scene),
    access: AccessSchema.parse(raw.access),
    lawById: new Map(),
    optionOf: new Map(),
    conceptById: new Map(),
    phraseById: new Map(),
    twistById: new Map(),
    comboById: new Map(),
    stageById: new Map(),
    crisisById: new Map(),
    endingById: new Map(),
    nameIndex: new Map(),
  };
  uniqueIds('概念', data.concepts);
  uniqueIds('法則', data.laws);
  uniqueIds('言い回し', data.phrases);
  uniqueIds('副作用', data.twists);
  uniqueIds('出来事', data.events);
  uniqueIds('世界異常', data.anomalies);
  uniqueIds('コンボ', data.combos);
  uniqueIds('タグ', data.tags);
  for (const c of data.concepts) data.conceptById.set(c.id, c);
  for (const p of data.phrases) data.phraseById.set(p.id, p);
  for (const t of data.twists) data.twistById.set(t.id, t);
  for (const c of data.combos) data.comboById.set(c.id, c);
  for (const s of data.stages) data.stageById.set(s.id as StageId, s);
  uniqueIds('危機', data.crises);
  for (const c of data.crises) data.crisisById.set(c.id, c);
  uniqueIds('結末', data.endings);
  for (const e of data.endings) data.endingById.set(e.id, e);
  uniqueIds('実績', data.achievements);
  for (const law of data.laws) {
    data.lawById.set(law.id, law);
    uniqueIds(`法則 ${law.id} の形`, law.options);
    const map = new Map<string, LawOption>();
    for (const o of law.options) map.set(o.id, o);
    data.optionOf.set(law.id, map);
    if (!data.conceptById.has(law.concept)) throw new DataError(`法則 ${law.id} の概念がない: ${law.concept}`);
    const init = map.get(law.initial);
    if (!init) throw new DataError(`法則 ${law.id} の最初の形がない: ${law.initial}`);
    if (init.kind !== 'original' || !init.text) throw new DataError(`法則 ${law.id} の最初の形は、文章のある original`);
    if (!law.options.some((o) => o.kind === 'delete')) throw new DataError(`法則 ${law.id} に削除したときの意味がない`);
    const fill = map.get(law.voidFill);
    if (!fill || fill.kind === 'delete') throw new DataError(`法則 ${law.id} の空白を埋める読み取りがない（または消したときの意味になっている）: ${law.voidFill}`);
  }
  for (const law of data.laws) for (const d of law.supports) if (!data.lawById.has(d) || d === law.id) throw new DataError(`法則 ${law.id} が支える行が知らない行: ${d}`);

  // 読み取りの語彙：規則に出てくる言葉と、lexicon.json の言葉を世界が知っている言葉にする
  const lex = data.lexicon;
  const vocab: string[] = [...lex.common, ...Object.values(lex.groups).flat(), ...Object.keys(lex.synonyms), ...Object.values(lex.synonyms).flat(), ...Object.values(lex.english)];
  const ruleWords = (r: MatchRule) => [...(r.any ?? []), ...(r.all ?? []), ...(r.none ?? []), ...(r.without ?? []), ...(r.only ?? []), ...(r.except ?? []), ...(r.rest ?? [])];
  for (const law of data.laws) {
    vocab.push(...law.subject, ...law.topic);
    for (const o of law.options) {
      if (o.text) vocab.push(o.text);
      for (const r of o.match ?? []) vocab.push(...ruleWords(r));
    }
  }
  for (const p of data.phrases) {
    vocab.push(p.name, p.example);
    for (const r of p.match) vocab.push(...ruleWords(r));
  }
  for (const c of data.concepts) vocab.push(c.name);
  // ものの名前（言葉の境目を見るため）：行の主語と話題・存在の言葉・まとまりと言い換え
  const nouns: string[] = [...Object.values(lex.groups).flat(), ...Object.keys(lex.synonyms), ...Object.values(lex.synonyms).flat()];
  for (const law of data.laws) nouns.push(originalText(law).split(/は|には|が/u)[0] ?? '', ...law.subject, ...law.exists, ...law.topic.filter((w) => w.length >= 2));
  setLexicon(
    lex,
    vocab.filter((w) => !w.startsWith('@')),
    nouns,
  );
  // 読み取りの規則の言葉は、読む文と同じように助詞のゆれをそろえておく（「病気がない」と「病気はない」を同じに探す）
  const even = (ws: string[] | undefined) => ws?.map((w) => (w.startsWith('@') ? w : evenParticles(w)));
  const evenRule = (r: MatchRule): MatchRule => ({
    ...r,
    any: even(r.any),
    all: even(r.all),
    none: even(r.none),
    except: even(r.except),
    without: even(r.without),
    only: even(r.only),
    rest: even(r.rest),
    subject: even(r.subject),
  });
  for (const law of data.laws) for (const o of law.options) if (o.match) o.match = o.match.map(evenRule);
  for (const p of data.phrases) p.match = p.match.map(evenRule);

  const problems: string[] = [];
  const checkGroups = (where: string, rules: readonly MatchRule[]) => {
    for (const r of rules) {
      for (const w of [...ruleWords(r), ...(r.subject ?? [])]) {
        // 「@@動物」は日常の言葉の種類、「@人」は言葉のまとまり
        if (w.startsWith('@@')) {
          if (!lex.kinds?.[w.slice(2)]) problems.push(`${where}: 知らない言葉の種類 ${w}`);
        } else if (w.startsWith('@') && !lex.groups[w.slice(1)]) problems.push(`${where}: 知らない言葉のまとまり ${w}`);
      }
    }
  };
  const check = (where: string, conds: readonly string[]) => {
    for (const c of conds) {
      const err = validateCondition(data, c);
      if (err) problems.push(`${where}: ${err}`);
    }
  };
  for (const law of data.laws) {
    for (const o of law.options) {
      for (const ref of o.twists) {
        if (!data.twistById.has(ref.id)) problems.push(`法則 ${law.id}=${o.id}: 知らない副作用 ${ref.id}`);
        check(`法則 ${law.id}=${o.id} の副作用 ${ref.id}`, ref.when);
      }
    }
  }
  for (const law of data.laws) for (const o of law.options) checkGroups(`法則 ${law.id}=${o.id}`, o.match ?? []);
  for (const p of data.phrases) {
    checkGroups(`言い回し ${p.id}`, p.match);
    for (const c of p.covers) check(`言い回し ${p.id} の covers`, [c]);
    for (const ref of p.twists) {
      if (!data.twistById.has(ref.id)) problems.push(`言い回し ${p.id}: 知らない副作用 ${ref.id}`);
      check(`言い回し ${p.id} の副作用 ${ref.id}`, ref.when);
    }
  }
  for (const ev of data.events) check(`出来事 ${ev.id}`, ev.when);
  for (const c of data.combos) check(`コンボ ${c.id}`, c.when);
  for (const t of data.tags) check(`タグ ${t.id}`, t.when);
  for (const st of data.stages) {
    for (const [lawId, optId] of Object.entries(st.overrides)) {
      if (!data.optionOf.get(lawId)?.has(optId)) problems.push(`ステージ ${st.id}: 知らない形 ${lawId}=${optId}`);
    }
  }
  for (const c of data.crises) {
    for (const group of [...c.avertedBy, ...c.softenedBy]) check(`危機 ${c.id}`, group);
    if (!c.warn.includes('{n}')) problems.push(`危機 ${c.id}: 知らせに {n}（残りの年数）がない`);
  }
  if (data.stages.some((st) => st.endless) && data.crises.length === 0) problems.push('無限の世界に危機がない');
  for (const e of data.endings) {
    check(`結末 ${e.id}`, e.when);
    if (e.warn && !e.warn.includes('{n}') && e.years > 1 && e.warn.includes('あと')) problems.push(`結末 ${e.id}: 知らせの「あと」に {n} がない`);
  }
  for (const a of data.achievements) {
    check(`実績 ${a.id}`, a.world);
    for (const c of a.progress)
      if (!/^(cleared|worlds|discovered|endlessBest|endings|achievements|abandoned|modes|rules|marks3|numbered|trials)\s*(<=|>=|==|<|>)\s*\d+$/.test(c)) problems.push(`実績 ${a.id}: 進み具合の条件が読めない ${c}`);
  }
  for (const law of data.laws)
    for (const w of law.exists) if (!law.subject.includes(w) && !law.topic.includes(w) && !originalText(law).startsWith(w)) problems.push(`法則 ${law.id}: exists の ${w} が主語にも話題にもない`);
  // 情景：絵に描く相手が内容にあるか。書き換え（法則の読み取り・概念）は、どれも情景のどこかを変える
  const sceneOf = (s: SceneSpec | undefined) => !!s && (Object.keys(s.motifs).length > 0 || !!s.specimen || s.stele);
  for (const law of data.laws) {
    for (const o of law.options) {
      if (o.kind === 'original') continue;
      if (!o.onset) problems.push(`法則 ${law.id}=${o.id}: 効き始めた年の知らせ（onset）がない`);
      if (!sceneOf(o.scene)) problems.push(`法則 ${law.id}=${o.id}: 情景での描き方（scene）がない`);
    }
  }
  for (const p of data.phrases) if (!sceneOf(p.scene)) problems.push(`言い回し ${p.id}: 情景での描き方（scene）がない`);
  for (const id of Object.keys(data.scene.twists)) if (!data.twistById.has(id)) problems.push(`情景: 知らない副作用 ${id}`);
  for (const id of Object.keys(data.scene.crises)) if (!data.crisisById.has(id)) problems.push(`情景: 知らない危機 ${id}`);
  for (const id of Object.keys(data.scene.endings)) if (!data.endingById.has(id)) problems.push(`情景: 知らない結末 ${id}`);
  for (const id of Object.keys(data.scene.anomalies)) if (!data.anomalies.some((a) => a.id === id)) problems.push(`情景: 知らない世界異常 ${id}`);
  for (const k of Object.keys(data.scene.kinds)) if (!lex.kinds[k] && !Object.values(lex.suffixes).includes(k)) problems.push(`情景: 知らない言葉の種類 ${k}`);
  if (data.stages.length === 0) problems.push('ステージがない');
  // 筆の位：どの概念の行も、ちょうど一つの分野に入る。位は救った世界の数の順で、広がるだけ（狭まらない）。最後の位は自由
  const acc = data.access;
  const inRealm = new Map<string, string>();
  for (const r of acc.realms) {
    for (const c of r.concepts) {
      if (!data.conceptById.has(c)) problems.push(`筆の位: 分野 ${r.id} の知らない概念 ${c}`);
      if (inRealm.has(c)) problems.push(`筆の位: 概念 ${c} が二つの分野にある（${inRealm.get(c)} と ${r.id}）`);
      inRealm.set(c, r.id);
    }
  }
  for (const c of data.concepts) if (!inRealm.has(c.id)) problems.push(`筆の位: 概念 ${c.id} がどの分野にもない`);
  acc.ranks.forEach((rank, i) => {
    for (const r of rank.realms) if (!acc.realms.some((x) => x.id === r)) problems.push(`筆の位 ${rank.name}: 知らない分野 ${r}`);
    const prev = acc.ranks[i - 1];
    if (!prev) {
      if (rank.clears !== 0) problems.push('筆の位: はじめの位は、救った世界が0のとき');
      return;
    }
    if (rank.clears <= prev.clears) problems.push(`筆の位 ${rank.name}: 救った世界の数が前の位より多くない`);
    if (prev.realms.some((r) => !rank.realms.includes(r))) problems.push(`筆の位 ${rank.name}: 前の位の分野が閉じている`);
    if (prev.margin === null ? rank.margin !== null : rank.margin !== null && rank.margin < prev.margin) problems.push(`筆の位 ${rank.name}: 書き足せる行が減っている`);
    if (prev.depth === null ? rank.depth !== null : rank.depth !== null && rank.depth < prev.depth) problems.push(`筆の位 ${rank.name}: 書ける概念の重さが減っている`);
  });
  const last = acc.ranks[acc.ranks.length - 1]!;
  if (last.margin !== null || last.depth !== null || last.realms.length !== acc.realms.length) problems.push('筆の位: 最後の位は、すべての行・限りのない余白・どんな概念も書ける');
  for (const s of data.stages) {
    const open = acc.stages[s.id as StageId];
    if (!open) problems.push(`筆の位: ステージ ${s.id} で開いている行がない`);
    for (const c of open ?? []) if (!data.conceptById.has(c)) problems.push(`筆の位: ステージ ${s.id} の知らない概念 ${c}`);
  }
  // 名前の索引：画面に出る名前をそのまま書けば、その意味に読む（P3）。同じ名前が別の意味を指すのは、内容の誤り
  const nameKey = (name: string) => canonical(name.replace(/（[^）]*）$/u, ''));
  // 同じ意味の法則の読み取り（covers）をもつ言い回しと、その読み取りが同じ名前なら、法則の読み取りとして読む
  const sameMeaning = (a: NamedMeaning, b: NamedMeaning) =>
    a.kind === 'phrase' && b.kind === 'law' && (data.phraseById.get(a.id)?.covers ?? []).some((c) => new RegExp(`^law:${b.law}=(?:[\w|]*\|)?${b.option}(?:\|[\w|]*)?$`, 'u').test(c));
  const named = (key: string, m: NamedMeaning, where: string) => {
    if (!key) return;
    const prev = data.nameIndex.get(key);
    if (prev && JSON.stringify(prev) !== JSON.stringify(m) && !sameMeaning(prev, m)) problems.push(`名前が重なっている: 「${key}」（${where}）`);
    else data.nameIndex.set(key, m);
  };
  // 同じ意味の法則の読み取りがある言い回し（covers）の名前は、その行の書き換えとして読む（索引に入れない）
  for (const p of data.phrases) if (!p.generic && !p.name.includes('{X') && p.covers.length === 0) named(nameKey(p.name), { kind: 'phrase', id: p.id }, `言い回し ${p.id}`);
  for (const law of data.laws) for (const o of law.options) if (o.kind !== 'original') named(nameKey(o.label), { kind: 'law', law: law.id, option: o.id }, `法則 ${law.id}=${o.id}`);
  if (problems.length > 0) throw new DataError(problems.join('\n'));
  // 開いていく順番：学問の仕組みは、どれもちょうど1つの段で紹介する。発見が指す決まりはあるもの
  const ruleIds = new Set(data.unlocks.rules.map((r) => r.id));
  const introduced = data.unlocks.steps.flatMap((s) => s.rules);
  for (const id of introduced) if (!ruleIds.has(id)) throw new DataError(`開いていく順番の段に、知らない決まり: ${id}`);
  for (const id of ruleIds) if (introduced.filter((x) => x === id).length !== 1) throw new DataError(`決まり ${id} は、ちょうど1つの段で紹介する`);
  for (const d of data.unlocks.discoveries) if (d.rule && !ruleIds.has(d.rule)) throw new DataError(`発見が知らない決まりを指している: ${d.rule}`);
  for (const s of data.unlocks.steps) if (s.stage && !data.stageById.has(s.stage)) throw new DataError(`開いていく順番の段に、知らないステージ: ${s.stage}`);
  // 4つの柱：14の項目は、どれかちょうど1つの柱に入る
  const inPillars = data.indicators.pillars.flatMap((p) => p.items);
  for (const id of Object.keys(data.indicators.items)) if (inPillars.filter((x) => x === id).length !== 1) throw new DataError(`項目 ${id} は、ちょうど1つの柱に入れる`);
  // 改稿者の試練：重なる型はそのステージの型、書き換えの少ない版には決まりがある
  for (const st of data.stages) {
    const t = st.trial;
    if (!t) continue;
    if (t.kind === 'double' && (!t.cause || !st.causes.some((c) => c.id === t.cause))) throw new DataError(`改稿者の試練 ${st.id}：重なる型がステージの型にない（${t.cause}）`);
    if (t.kind === 'few' && !t.edits) throw new DataError(`改稿者の試練 ${st.id}：書き換えの少ない版に、書き換えの決まりがない`);
    if (t.kind === 'late' && t.late < 1) throw new DataError(`改稿者の試練 ${st.id}：兆しの遅れが0年`);
  }
  return data;
}

export const gameData: GameData = buildGameData(RAW_DATA);
