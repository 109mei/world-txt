import { canReplay, kifuOf, replayKifu, type GameData, type GameState, type Move } from '../core';
import { buildView, populationText, type SceneView } from './view';

/**
 * 再生（P23）：終わった世界の棋譜を作り直し、1年ずつの姿を残す。乱数を使わないので、棋譜から同じ世界がいつでも作り直せる
 */
export interface ReplayFrame {
  year: number;
  /** くり返す世界の周（0から） */
  pass: number;
  scene: SceneView;
  /** その年に書いた手 */
  moves: Move[];
  /** その年に起きた大きな出来事（注意と重大） */
  events: string[];
  population: string;
}

/** 1年ずつの姿（規則の版が違う棋譜は、今の規則では再生できないので null） */
export function replayFrames(data: GameData, g: GameState): ReplayFrame[] | null {
  const k = kifuOf(g, data);
  if (!canReplay(k, data)) return null;
  const frames: ReplayFrame[] = [];
  replayKifu(data, k, undefined, (s) => {
    const pass = s.loop?.count ?? 0;
    frames.push({
      year: s.year,
      pass,
      scene: structuredClone(buildView(s, data).scene),
      moves: k.moves.filter((m) => m.pass === pass && m.year === s.year),
      events: s.history
        .filter((h) => h.year === s.year && h.kind !== 'edit' && h.kind !== 'start' && h.severity !== 'info')
        .map((h) => h.text)
        .slice(-3),
      population: populationText(s.sim.pop),
    });
  });
  return frames;
}
