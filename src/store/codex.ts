import { knownRules, realCards, type GameData } from '../core';
import { ACHIEVEMENT_KINDS, type Achievement } from '../data/schema';
import type { Progress } from '../save';
import { journeyOf } from './journey';

/**
 * 図鑑（P22・分析の17章）：世界の決まり・現実のカード・特別な結末・世界の名前を、種類ごとの数と棒で。
 * 実績は発見・腕前・物語・遊び方の4種類ごとに数え、隠しのおまけ（負けや放棄で取れるもの）は数に入れない
 */

export type AchievementKind = (typeof ACHIEVEMENT_KINDS)[number];

export const KIND_NAME: Record<AchievementKind, string> = { discovery: '発見', skill: '腕前', story: '物語', play: '遊び方' };
export const KIND_DESC: Record<AchievementKind, string> = {
  discovery: '見つけた・見立てた・読み分けた',
  skill: '少ない手で・早く見抜いて・消さずに',
  story: '特別な結末を見た（隠し）',
  play: '今日の世界・無限の世界・番号で挑む',
};

export interface Count {
  found: number;
  total: number;
}

export interface Codex {
  rules: Count;
  cards: Count;
  endings: Count;
  names: Count;
  kinds: { kind: AchievementKind; name: string; desc: string; found: number; total: number }[];
  /** 新しく取った実績（新しい順に2つまで。おまけは除く） */
  recent: Achievement[];
  /** まだの隠し実績の数と、種類ごとの手がかり（1つ） */
  hidden: { kind: AchievementKind; name: string; left: number; hint: string | null }[];
}

export function buildCodex(data: GameData, p: Progress): Codex {
  const j = journeyOf(p);
  const has = new Set(p.discovered);
  const got = new Set(p.achievements);
  const counted = data.achievements.filter((a) => !a.bonus);
  const cards = realCards(data, j);
  const kinds = ACHIEVEMENT_KINDS.map((kind) => {
    const list = counted.filter((a) => a.kind === kind);
    return { kind, name: KIND_NAME[kind], desc: KIND_DESC[kind], found: list.filter((a) => got.has(a.id)).length, total: list.length };
  });
  const recent = [...p.achievements]
    .reverse()
    .map((id) => data.achievements.find((a) => a.id === id))
    .filter((a): a is Achievement => !!a && !a.bonus)
    .slice(0, 2);
  const hidden = ACHIEVEMENT_KINDS.map((kind) => {
    const left = counted.filter((a) => a.kind === kind && a.hidden && !got.has(a.id));
    return { kind, name: KIND_NAME[kind], left: left.length, hint: left.find((a) => a.hint)?.hint ?? null };
  }).filter((h) => h.left > 0);
  return {
    rules: { found: knownRules(data, j).length, total: data.unlocks.rules.length },
    cards: { found: cards.found, total: cards.total },
    endings: { found: data.endings.filter((e) => has.has(`x:${e.id}`)).length, total: data.endings.length },
    names: { found: data.tags.filter((t) => has.has(`g:${t.id}`)).length, total: data.tags.length },
    kinds,
    recent,
    hidden,
  };
}
