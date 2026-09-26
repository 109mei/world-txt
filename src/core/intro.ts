import type { Balance } from '../data/schema';
import type { GameData, GameState } from './types';

/**
 * 学問の仕組み（世界の決まり）の強さ（開いていく順番。P18・分析の13章）。
 * 学問の仕組みは最初から全部動いているが、紹介する前は弱く（balance.intro.before）動かし、負けの主な原因にしない。
 * 紹介した年から、数年かけて本来の強さに上げる。乱数は使わず、紹介の状態と年数だけで決まる。
 * 強さを書いていない決まりは、本来の強さ（シミュレーターとテストは、すべて本来の強さで測る）
 */
export function introOf(g: Pick<GameState, 'intro'>, id: string): number {
  const v = g.intro?.[id];
  return v === undefined ? 1 : Math.max(0, Math.min(1, v));
}

const cache = new WeakMap<Balance, Map<string, Balance>>();

/** 世界の決まりの強さを掛けた係数（強さを書いていなければ、balance そのもの） */
export function balanceFor(g: Pick<GameState, 'intro'>, data: GameData): Balance {
  const b = data.balance;
  const intro = g.intro ?? {};
  const keys = Object.keys(intro).filter((k) => introOf(g, k) < 1);
  if (keys.length === 0) return b;
  const sig = keys
    .sort()
    .map((k) => `${k}:${introOf(g, k).toFixed(2)}`)
    .join(',');
  let m = cache.get(b);
  if (!m) {
    m = new Map();
    cache.set(b, m);
  }
  const hit = m.get(sig);
  if (hit) return hit;
  const f = (id: string) => introOf(g, id);
  const p = b.people;
  const out: Balance = {
    ...b,
    people: {
      ...p,
      ref: { ...p.ref, happy: p.ref.happy * f('habituation'), stability: p.ref.stability * f('habituation'), loss: 1 + (p.ref.loss - 1) * f('lossAversion') },
      peak: { ...p.peak, tension: p.peak.tension * f('jcurve') },
      trust: { ...p.trust, ruleMin: 1 - (1 - p.trust.ruleMin) * f('trust') },
      anxiety: { ...p.anxiety, hoardHit: p.anxiety.hoardHit * f('hoarding') },
      caution: { ...p.caution, effect: p.caution.effect * f('caution') },
      overshoot: { ...p.overshoot, amp: p.overshoot.amp * f('overshoot') },
      slowing: { ...p.slowing, floor: 1 - (1 - p.slowing.floor) * f('slowing') },
      scarcity: { science: p.scarcity.science * f('scarcity') },
      demography: { science: p.demography.science * f('demography'), medicine: p.demography.medicine * f('demography') },
      spread: {
        ...p.spread,
        crowdOut: 1 - (1 - p.spread.crowdOut) * f('crowding'),
        crowdCap: 1 - (1 - p.spread.crowdCap) * f('crowding'),
        freeRide: p.spread.freeRide * f('freeRide'),
      },
    },
    tension: { ...b.tension, prices: b.tension.prices * f('jcurve') },
    modes: { ...b.modes, ruleTwists: b.modes.ruleTwists.map((r) => ({ ...r, rate: r.rate * f('fatigue') })) },
  };
  m.set(sig, out);
  return out;
}

/**
 * この世界で紹介する決まりか：この世界のステージの段で紹介する決まり、開く条件の「初めて起きたこと」がこの世界で起きた段の決まり、
 * その決まりの「初めて起きたこと」がこの世界で起きた決まり
 */
function meetsHere(g: GameState, data: GameData, id: string): boolean {
  const rule = data.unlocks.rules.find((r) => r.id === id);
  if (!rule) return false;
  if (rule.found.some((f) => g.found.includes(f))) return true;
  const step = data.unlocks.steps.find((s) => s.rules.includes(id));
  if (!step) return false;
  if (step.stage !== undefined) return step.stage === g.stageId;
  return step.when.found !== undefined && g.found.includes(step.when.found);
}

/**
 * 1年分、この世界で紹介する決まり・出会った決まりを本来の強さへ近づける（紹介した年から、数年かけて本来の強さになる）。
 * まだ紹介していない決まりは、紹介する前の強さのまま
 */
export function rampIntro(g: GameState, data: GameData): void {
  const step = data.balance.intro.ramp;
  for (const id of Object.keys(g.intro)) {
    if (introOf(g, id) >= 1) continue;
    if (!meetsHere(g, data, id)) continue;
    // 小数の誤差がたまらないよう、千分の一で丸める
    g.intro[id] = Math.min(1, Math.round((introOf(g, id) + step) * 1000) / 1000);
  }
}
