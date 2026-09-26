import { allOpen, knownRules, nextStep, openHints, realCards, stageNeeds, stageRules, stepNeeds, stepOpen, type GameData, type Journey, type Need } from '../core';
import type { Stage, StageId, WorldRule } from '../data/schema';
import type { Progress } from '../save';

/**
 * 開いていく順番の写し（世界を選ぶ画面とノートで使う）。
 * わかった世界の決まりと現実のカードの数、世界ごとの開く条件とその世界で出会う決まり、まだ出会っていない決まりの手がかり
 */

export interface StageEntry {
  stage: Stage;
  /** 開くまでに足りないもの（開いていれば空） */
  needs: Need[];
  /** その世界で出会う決まり */
  rules: WorldRule[];
  /** その世界で出会う考え（「兆しを読んで見立てる」） */
  idea: string | null;
  /** その世界で出会う決まりの短い言い方（「先行きの不安と買いだめ・乏しさ」） */
  meet: string | null;
  /** 開いたが、まだ遊んでいない世界（「開いた」と添える） */
  fresh: boolean;
  /** 開いた兆しの読み方（3回負けるごとに1つ） */
  hints: string[];
}

export interface JourneyView {
  known: WorldRule[];
  rulesTotal: number;
  cards: { found: number; total: number };
  stages: StageEntry[];
  /** まだ出会っていない決まりの数と、次の手がかり（どうすると開くか） */
  unknown: number;
  next: { idea: string; needs: Need[]; stage: StageId | null } | null;
  /** すべて開いた（「すべて開いた状態で始める」を選べる） */
  allOpen: boolean;
}

export function journeyOf(progress: Progress): Journey {
  return { cleared: progress.cleared, played: progress.played, discovered: progress.discovered, losses: progress.losses };
}

/**
 * 読まれ方の札（性質・制度・条件つき）を見せるか：「書き方と人の心」の段が開いたら（すべて開いた状態でも）。
 * その段は、社会の文が初めて制度か条件つきとして読まれたときに開く（書いたその文の札は、開く前でも見せる）
 */
export function modesOpen(data: GameData, progress: Progress, everything = false): boolean {
  if (everything) return true;
  const step = data.unlocks.steps.find((s) => s.id === 'modes');
  return !!step && stepOpen(step, journeyOf(progress));
}

export function buildJourney(data: GameData, progress: Progress, everythingOpen = false): JourneyView {
  const j = journeyOf(progress);
  const known = knownRules(data, j);
  const cards = realCards(data, j);
  const stages = [...data.stages]
    .sort((a, b) => a.order - b.order)
    .map((stage): StageEntry => {
      const needs = everythingOpen ? [] : stageNeeds(data, j, stage.id);
      const step = data.unlocks.steps.find((s) => s.stage === stage.id);
      return {
        stage,
        needs,
        rules: stageRules(data, stage.id),
        idea: step ? (step.idea.split('：')[0] ?? step.idea) : null,
        meet: step?.meet ?? null,
        fresh: needs.length === 0 && !!step && Object.keys(step.when).length > 0 && !progress.played.includes(stage.id) && !progress.best[stage.id],
        hints: openHints(data, j, stage.id),
      };
    });
  const step = nextStep(data, j);
  return {
    known,
    rulesTotal: data.unlocks.rules.length,
    cards: { found: cards.found, total: cards.total },
    stages,
    unknown: data.unlocks.rules.length - known.length,
    next: step ? { idea: step.idea.split('：')[0] ?? step.idea, needs: stepNeeds(step, j), stage: step.stage ?? null } : null,
    allOpen: allOpen(data, j),
  };
}
