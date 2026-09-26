/**
 * 作戦（決まった年に決まった文を書く手順）を、ルール本体と同じコードで最後まで遊ぶ。
 * 書換の力が足りない年に書く手は、力が戻った年に書く（人が遊ぶときと同じ）。
 * 封じられた行・余白・重さに止められた手は blocks に残す（筆の位の確かめに使う）。
 * sim・ranks・総当たり（combos）・操作を絞ったボット・見立てるボット・テストが、みなこの関数で遊ぶ
 */
import { accessFor, adaptFactor, addLine, advance, createGame, rewriteLaw, type EditResult, type GameData, type GameState, type WriteAccess } from '../src/core';
import type { StageId } from '../src/data/schema';

export interface Edit {
  /** 書く年（力が足りなければ、戻った年に書く） */
  year: number;
  /** 書き換える行（なければ書き足す）。text が空なら、その行を消す */
  law?: string;
  text: string;
  /** くり返す世界で、この回数だけ巻き戻ったあとの周でだけ書く（書かなければ、はじめて来た周で書く） */
  pass?: number;
  /** adapt：この行の効きが落ちたと知らせが来てから書き直す（year より前には書かない） */
  when?: 'adapt';
}

export interface RunOptions {
  /** 筆の位。書かなければ、そのステージをはじめて遊べる位（clears で救った世界の数を変えられる）。null なら制限なし */
  access?: WriteAccess | null;
  clears?: number;
  /** 原因の型を決めて遊ぶ（書かなければ、世界番号で決まる型） */
  cause?: string | null;
  /** 世界の決まりの強さ（開いていく順番。書かなければ、すべて本来の強さ） */
  intro?: Record<string, number>;
  /** 書いた手ごと・進めた年ごとに呼ぶ（年表を出すときなど） */
  onEdit?: (e: Edit, res: EditResult, g: GameState) => void;
  onYear?: (g: GameState) => void;
}

export interface Pending {
  e: Edit;
  done: boolean;
}

/** 止められて書けなかった手（筆の位のせいで書けないもの） */
export const HARD_BLOCKS = new Set(['sealed', 'margin', 'heavy']);

/** 行の効きが落ちたと知らせが来たか（知らせの出る線まで効きが落ちた） */
export function adaptNoticed(g: GameState, data: GameData, lawId: string): boolean {
  return adaptFactor(g, data, lawId) <= data.balance.adapt.noticeAt;
}

/** 今年書く手を、書換の力のあるかぎり書く。書けた手・止められた手（力が足りない以外）は済みにする */
export function writeDue(g: GameState, data: GameData, todo: Pending[], blocks: string[], onEdit?: RunOptions['onEdit']): void {
  const pass = g.loop?.count ?? 0;
  for (const p of todo) {
    if (p.done || p.e.year > g.year) continue;
    if (p.e.pass !== undefined && p.e.pass !== pass) continue;
    if (p.e.when === 'adapt' && (!p.e.law || !adaptNoticed(g, data, p.e.law))) continue;
    if (g.edits.left <= 0) break;
    const res = p.e.law ? rewriteLaw(g, data, p.e.law, p.e.text) : addLine(g, data, p.e.text);
    onEdit?.(p.e, res, g);
    // 力が足りない・容量に入らない手は、次の年にもう一度書く
    if (res.block === 'no-edits' || res.block === 'capacity') continue;
    p.done = true;
    if (res.block && HARD_BLOCKS.has(res.block)) blocks.push(`${res.block}: ${p.e.law ?? p.e.text}`);
  }
  // 周が変わったら、前の周の手は書けないまま終わる
  for (const p of todo) if (!p.done && p.e.pass !== undefined && p.e.pass < pass) p.done = true;
}

/** 世界を作る（筆の位と原因の型を選んで） */
export function startWorld(data: GameData, stage: StageId, seed: number, opts: RunOptions = {}): GameState {
  const st = data.stageById.get(stage)!;
  const access = opts.access !== undefined ? opts.access : accessFor(data, stage, opts.clears ?? st.unlock ?? 0);
  return createGame(data, stage, seed, access, { ...(opts.cause !== undefined ? { cause: opts.cause } : {}), ...(opts.intro ? { intro: opts.intro } : {}) });
}

/** 作戦を最後まで遊ぶ（ゴールの年・失敗・特別な結末まで。くり返す世界は、進めた回数にも上限を置く） */
export function runEdits(data: GameData, stage: StageId, edits: readonly Edit[], seed: number, opts: RunOptions = {}): { g: GameState; blocks: string[] } {
  const st = data.stageById.get(stage)!;
  const g = startWorld(data, stage, seed, opts);
  const todo: Pending[] = edits.map((e) => ({ e, done: false }));
  const blocks: string[] = [];
  let steps = 0;
  while (g.status === 'playing' && g.year < st.goalYears && steps++ < 600) {
    writeDue(g, data, todo, blocks, opts.onEdit);
    advance(g, data, 1);
    opts.onYear?.(g);
  }
  return { g, blocks };
}
