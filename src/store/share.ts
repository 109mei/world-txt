import { marksOf, worldSummary, type GameData, type GameState } from '../core';

/**
 * 共有文（P22）：中身がわからない形。世界番号・ステージ・年数・手の数・印だけで、書いた文は入れない。
 * 同じ世界番号なら誰でも同じ世界になるので、友だちは番号で同じ世界に挑める
 */
export function shareText(g: GameState, data: GameData, title: string): string {
  const stage = data.stageById.get(g.stageId)!;
  const sum = worldSummary(g, data);
  const moves = g.moves.length;
  const head = `${title} #${sum.number}`;
  const daily = g.daily ? `（${g.daily} の世界）` : '';
  if (stage.endless) return [`${head} ${stage.title}${daily}`, `${g.year}年続いた　手の数${moves}`, `#${title}`].join('\n');
  const marks = stage.marks ? `　印 ${marksOf(g, data).length}/3` : '';
  const result = g.status === 'cleared' ? 'クリア' : '崩壊';
  return [`${head} ${stage.title}${daily}`, `${result}　${g.year}年　手の数${moves}${marks}`, `#${title}`].join('\n');
}
