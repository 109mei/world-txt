import type { Balance, Phrase } from '../data/schema';
import { writtenYear } from './channels';
import { clamp } from './math';
import type { Channels, Derived, GameData, GameState, SimState } from './types';

/**
 * 世界の人々の心と、社会の学問で知られた振る舞い（分析の7章。乱数は使わない。係数は balance.people）。
 * - 暮らしの水準：食べ物・水・エネルギーの足り具合の対数で測る（足りない世界での少しの増加ほど大きく効く）
 * - 慣れと損の重さ：幸福と安定は「今の暮らし − 慣れた基準」でも動き、基準より下がった分は上がった分より重く効く。
 *   基準は毎年少しずつ今に近づく（ゆっくり悪くなる世界では、声が上がらない）
 * - 信頼：上がるのは年に少し、下がるのは一度に大きく。制度として書いた文の効き目に掛かる
 * - 先行きの不安：足りない知らせと物価の上がる速さで上がり、蔵と信頼で下がる。線を超え、信頼が低いと買いだめが起き、物の流れが細る
 * - 用心：感染が広がると人は接触を減らし、落ち着くと緩める（流行が波になる）
 * - 期待とのずれ（J字）：良くなり続けたあとの急な下落は、緊張を大きく上げる
 * - 限りを超えた年数：生態系や水をすり減らした年が続くと、ふだんなら耐えられる出来事で大きく崩れる
 * - 戻りの遅さ：文明が終わりの線に近づくと、揺れからの戻りが遅くなる（臨界減速）
 * - 考え方の広がり：性質として書いた文は、広がった割合の分だけ効く（S字。信頼が低いと止まる。制度と重ねると締め出される）
 */

/** 暮らしの水準（食べ物・水・エネルギーが足りて、仕事があれば 0。足りないほど下がる。対数） */
export function livingLevel(s: SimState, d: Derived, b: Balance): number {
  const L = b.people.living;
  const ln = (x: number) => Math.log(clamp(x, L.min, L.max));
  return L.food * ln(d.foodRatio) + L.water * ln(d.waterRatio) + L.energy * ln(d.energyRatio) - L.unemp * Math.max(0, s.unemployment - b.unemployment.base);
}

/** 慣れた基準との差（下がった分は、損の重さを掛ける） */
export function livingGain(s: SimState, d: Derived, b: Balance): number {
  const gain = livingLevel(s, d, b) - s.ref;
  return gain < 0 ? gain * b.people.ref.loss : gain;
}

/** いちばん足りないもの（食べ物・水・エネルギー）の足りなさ（0 なら足りている） */
export function shortage(d: Derived): number {
  return Math.max(0, 1 - Math.min(d.foodRatio, d.waterRatio, d.energyRatio));
}

/** 買いだめが起きているか（先行きの不安が線を超え、信頼が低い） */
export function hoarding(s: SimState, b: Balance): boolean {
  const a = b.people.anxiety;
  return s.anxiety >= a.hoardAt && s.trust < a.hoardTrust;
}

/** 制度の効き目にかかる、信頼の重み（信頼が低いと、決まりは形だけ守られる） */
export function trustFactor(s: SimState, b: Balance): number {
  const t = b.people.trust;
  return t.ruleMin + (1 - t.ruleMin) * clamp(s.trust / t.ruleRef, 0, 1);
}

/** 戻りの速さ（文明が終わりの線に近いほど遅い。1 でふだんどおり） */
export function recovery(civ: number, failCiv: number, b: Balance): number {
  const w = b.people.slowing;
  return clamp((civ - failCiv) / w.civSpan, w.floor, 1);
}

/** 限りを超えた年数が、出来事の打撃を強める倍率 */
export function overshootScale(s: SimState, b: Balance): number {
  const o = b.people.overshoot;
  return 1 + o.amp * Math.min(o.max, s.overshoot);
}

/** 1年分、人々の心と社会の貯めを動かす（simulateYear の最後に呼ぶ。今年の derived を使う） */
export function updatePeople(s: SimState, d: Derived, ch: Channels, b: Balance, blackMarket: number): void {
  const p = b.people;
  const L = livingLevel(s, d, b);
  const short = shortage(d);
  // 慣れ：基準は今に近づく。期待：良かったころの水準を、少しずつ忘れる
  s.ref += (L - s.ref) * p.ref.rate;
  s.peak = Math.max(L, s.peak - p.peak.decay);
  // 信頼：安定して足りている年に少しずつ上がり、足りない年・闇市・世界の揺らぎ・戦争で一度に大きく下がる
  const up = s.stability >= p.trust.upStability && short <= 0.02 ? p.trust.up : 0;
  const down =
    p.trust.down.shortage * Math.max(0, short - 0.05) +
    p.trust.down.blackMarket * blackMarket +
    p.trust.down.coherence * Math.max(0, 70 - s.coherence) / 10 +
    p.trust.down.war * s.war;
  s.trust = clamp(s.trust + up - down, 0, 100);
  // 先行きの不安：足りない知らせと物価の上がる速さで上がり、蔵と信頼で下がる
  const a = p.anxiety;
  const priceSpeed = Math.max(0, ch.inflation) * clamp(ch.money, 0, 1);
  const target = a.base + a.shortage * short + a.prices * priceSpeed * 10 - a.stock * Math.min(1, s.foodStock) - (a.trust * (s.trust - 50)) / 50;
  s.anxiety = clamp(s.anxiety + (clamp(target, 0, 100) - s.anxiety) * a.rate, 0, 100);
  // 用心：流行が広がると上がり、落ち着くと緩む
  const c = p.caution;
  s.caution = clamp(s.caution + c.gain * (s.pathogen / 100) * (1 - s.caution) - c.relax * s.caution, 0, 1);
  // 限りを超えた年数：生態系がすり減り、水をくみすぎた年が続く
  const o = p.overshoot;
  if (s.eco < o.eco || d.waterRatio < o.water) s.overshoot = Math.min(o.max * 2, s.overshoot + 1);
  else s.overshoot = Math.max(0, s.overshoot - 1);
}

/** 人々の心が、幸福・安定・緊張の向かう先に足す量（慣れと損の重さ・期待とのずれ） */
export function peopleTerms(s: SimState, d: Derived, b: Balance): { happiness: number; stability: number; tension: number } {
  const gain = livingGain(s, d, b);
  const fall = Math.max(0, s.peak - livingLevel(s, d, b));
  return { happiness: b.people.ref.happy * gain, stability: b.people.ref.stability * gain, tension: b.people.peak.tension * fall };
}

// ---------------------------------------------------------------- 考え方の広がり（性質として書いた文）

/** 性質として書いた行の、広がった割合（書いていなければ 1） */
export function spreadOf(g: Pick<GameState, 'spread'>, lineId: string): number {
  return g.spread?.[lineId] ?? 1;
}

/**
 * 1年分、性質として書いた行の考え方を広げる。S字で増え、25% 前後を超えると一気に広がる。信頼が低いと止まる。
 * 同じ振る舞い（同じものを動かす言い回し）を制度でも書いた世界では締め出され、広がりが下がる（制度を消しても戻らない）。
 * 性質だけの分け合いは、止める仕組み（制度）がないと、広がりきったあと年とともに薄れる（ただ乗り）
 */
export function spreadYear(g: GameState, data: GameData, natureLines: { lineId: string; phrase: Phrase }[], ruledChannels: Set<string>, b: Balance = data.balance): void {
  const sp = b.people.spread;
  const trustF = clamp((g.sim.trust - sp.trustStop) / (sp.trustFull - sp.trustStop), 0, 1);
  const live = new Set<string>();
  for (const { lineId, phrase } of natureLines) {
    live.add(lineId);
    const at = writtenYear(g, lineId);
    if (at === null) continue;
    let s = g.spread[lineId] ?? sp.seed;
    // 同じものを動かす制度があると、自分からの気持ちが締め出される
    const ruled = Object.keys(phrase.mods).some((k) => ruledChannels.has(k));
    if (ruled) g.crowded[phrase.id] = true;
    const crowded = g.crowded[phrase.id] === true;
    const rate = sp.rate * (s >= sp.tipping ? sp.boost : 1) * trustF * (crowded ? sp.crowdOut : 1);
    s += rate * s * (1 - s);
    // 止める仕組み（制度）がないと、広がりきったあと、ただ乗りで少しずつ薄れる
    if (!ruled && s > sp.freeRideFrom) s -= sp.freeRide * s;
    g.spread[lineId] = clamp(s, 0, crowded ? sp.crowdCap : 1);
  }
  // 消した行・書き直した行の広がりは忘れる
  for (const id of Object.keys(g.spread)) if (!live.has(id)) delete g.spread[id];
}
