import { INDICATOR_IDS, type Balance, type IndicatorDef, type IndicatorId, type Indicators, type Tone } from '../data/schema';
import { clamp, curve } from './math';
import { humanityScore } from './model';
import type { Derived, SimState, Trend } from './types';

/** 各項目の点数（0〜100、高いほど良い）。状態語と変化の向きはこの点数から決める */
export function computeScores(s: SimState, d: Derived, b: Balance, startPop: number): Record<IndicatorId, number> {
  const sc = b.scores;
  const h = sc.health;
  const out = {} as Record<IndicatorId, number>;
  for (const id of INDICATOR_IDS) {
    switch (id) {
      case 'humanity':
        out[id] = humanityScore(s, d, b, startPop);
        break;
      case 'food':
        out[id] = curve(sc.food, d.foodRatio);
        break;
      case 'water':
        out[id] = curve(sc.water, d.waterRatio);
        break;
      case 'energy':
        out[id] = curve(sc.energy, d.energyRatio);
        break;
      case 'eco':
        out[id] = curve(sc.eco, s.eco);
        break;
      case 'health':
        out[id] = clamp(h.base - h.prevalence * s.pathogen - h.deaths * d.diseaseDeaths + h.medicine * (d.medicine - 0.5), 0, 100);
        break;
      case 'climate':
        out[id] = curve(sc.climate, s.temp);
        break;
      case 'society':
        out[id] = curve(sc.society, s.stability);
        break;
      case 'peace':
        out[id] = s.war > 0 ? Math.min(6, curve(sc.peace, 100 - s.tension)) : curve(sc.peace, 100 - s.tension);
        break;
      case 'science':
        out[id] = curve(sc.science, d.research);
        break;
      case 'logistics':
        out[id] = curve(sc.logistics, (s.infra / b.infra.ref) * Math.min(1.2, d.distribution));
        break;
      case 'industry':
        out[id] = curve(sc.industry, s.industry);
        break;
      case 'mind':
        // 心そのもの（概念と物価で動く）に、暮らしの幸福の良し悪しを合わせて見せる
        out[id] = curve(sc.mind, s.mind + b.mind.view * (s.happiness - b.mind.viewRef));
        break;
      case 'prices': {
        // お金の刷りすぎによる物価（10倍ごとに1）に、食料とエネルギーの不足による値上がりを合わせて見せる
        const money = Math.min(1, Math.max(0, d.money ?? 1));
        const shortage = Math.max(0, 1 - d.foodRatio) + b.prices.viewEnergy * Math.max(0, 1 - d.energyRatio);
        out[id] = curve(sc.prices, money * (Math.log10(Math.max(1, s.prices)) + b.prices.viewShortage * shortage));
        break;
      }
    }
  }
  return out;
}

export interface Level {
  word: string;
  tone: Tone;
}

export function levelOf(def: IndicatorDef, score: number): Level {
  for (const [min, word, tone] of def.levels) if (score >= min) return { word, tone };
  const last = def.levels[def.levels.length - 1]!;
  return { word: last[1], tone: last[2] };
}

/** 項目の状態語。気候は暑い側・寒い側で言葉が変わり、世界情勢は戦争中なら「戦争」、物価はお金のない世界なら「お金なし」 */
export function indicatorLevel(ind: Indicators, id: IndicatorId, score: number, s: SimState, d?: Derived): Level {
  const def = ind.items[id];
  const base = levelOf(def, score);
  if (id === 'climate') {
    for (const [minTemp, word] of ind.climateWords) if (s.temp >= minTemp) return { word, tone: base.tone };
    return { word: ind.climateWords[ind.climateWords.length - 1]![1], tone: base.tone };
  }
  if (id === 'peace' && s.war > 0) return { word: '戦争', tone: 'critical' };
  if (id === 'prices' && d && (d.money ?? 1) <= 0) return { word: 'お金なし', tone: 'ok' };
  return base;
}

export function trendOf(delta: number, fast: number, slow: number): Trend {
  if (delta >= fast) return 'up2';
  if (delta >= slow) return 'up';
  if (delta <= -fast) return 'down2';
  if (delta <= -slow) return 'down';
  return 'flat';
}

export function civLevel(ind: Indicators, civ: number): { word: string; sentence: string; tone: Tone } {
  for (const [min, word, sentence, tone] of ind.civilization) if (civ >= min) return { word, sentence, tone };
  const last = ind.civilization[ind.civilization.length - 1]!;
  return { word: last[1], sentence: last[2], tone: last[3] };
}

/** 世界容量の状態語（消費の割合、低いほど余裕） */
export function capacityLevel(ind: Indicators, ratio: number): Level {
  for (const [max, word, tone] of ind.capacity) if (ratio <= max) return { word, tone };
  const last = ind.capacity[ind.capacity.length - 1]!;
  return { word: last[1], tone: last[2] };
}

export function coherenceLevel(ind: Indicators, value: number): Level {
  for (const [min, word, tone] of ind.coherence) if (value >= min) return { word, tone };
  const last = ind.coherence[ind.coherence.length - 1]!;
  return { word: last[1], tone: last[2] };
}
