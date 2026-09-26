import { advance, createGame } from './game';
import { rewriteLaw, rewriteLine, addLine } from './write';
import type { GameData, GameState, Move, WriteAccess } from './types';
import type { StageId } from '../data/schema';

/**
 * 棋譜：世界番号・ステージ・原因の型・筆の位・決まりの強さ・規則の版と、手の並び（何年目・どの行・消す／書き換える／書き足す・書いた文・読まれ方）。
 * 遊んでいる間は乱数を使わないので、同じ棋譜なら、誰が作り直しても同じ世界になる（ラプラスの決まり）
 */
export interface Kifu {
  /** 規則の版（データの中身から決まる。違う版の棋譜は、今の規則では再生できない） */
  rules: string;
  stage: StageId;
  seed: number;
  cause: string | null;
  access: WriteAccess | null;
  intro: Record<string, number>;
  moves: Move[];
  /** 最後に見た年と、くり返す世界で巻き戻った回数（ここまで進める） */
  year: number;
  loops: number;
  /** どう終わったか（遊んでいる途中なら null） */
  result: 'cleared' | 'failed' | null;
  /** 改稿者の試練の世界か */
  trial: boolean;
}

/** 世界から棋譜を作る */
export function kifuOf(g: GameState, data: GameData): Kifu {
  return {
    rules: data.rulesVersion,
    stage: g.stageId,
    seed: g.seed,
    cause: g.cause,
    access: g.access,
    intro: { ...g.introStart },
    moves: g.moves.map((m) => ({ ...m })),
    year: g.year,
    loops: g.loop?.count ?? 0,
    result: g.status === 'playing' ? null : g.status,
    trial: g.trial !== null,
  };
}

/** この棋譜を、今の規則で再生できるか */
export function canReplay(k: Kifu, data: GameData): boolean {
  return k.rules === data.rulesVersion && data.stageById.has(k.stage);
}

/**
 * 棋譜から世界を作り直す。until を渡すと、その年（と周）まで（分かれ道からやり直すとき。その年の手は書かない）。
 * 書いた年に同じ手を同じ順に書き、1年ずつ進める。onYear は、はじめと、1年進めるたびに呼ぶ（再生で1年ずつ見せるとき）
 */
export function replayKifu(data: GameData, k: Kifu, until?: { year: number; loops: number }, onYear?: (g: GameState) => void): GameState {
  const g = createGame(data, k.stage, k.seed, k.access, { cause: k.cause, intro: k.intro, trial: k.trial });
  const stop = until ?? { year: k.year, loops: k.loops };
  let i = 0;
  let steps = 0;
  onYear?.(g);
  while (steps++ < 2000) {
    const pass = g.loop?.count ?? 0;
    // その年（その周）に書いた手を、書いた順に書く（手は書いた順に並んでいる）
    while (i < k.moves.length && k.moves[i]!.pass === pass && k.moves[i]!.year === g.year) {
      if (until && (pass > until.loops || (pass === until.loops && g.year >= until.year))) break;
      replayMove(g, data, k.moves[i]!);
      i += 1;
    }
    if ((pass === stop.loops && g.year >= stop.year) || pass > stop.loops || g.status !== 'playing') break;
    advance(g, data, 1);
    onYear?.(g);
  }
  return g;
}

function replayMove(g: GameState, data: GameData, m: Move): void {
  // 書き直しの年の力は、遊んだときと同じだけ残っている（同じ世界なので）
  if (m.target === 'new') addLine(g, data, m.text);
  else if (m.target.startsWith('law:')) rewriteLaw(g, data, m.target.slice(4), m.text);
  else if (m.target.startsWith('line:')) rewriteLine(g, data, m.target.slice(5), m.text);
}
