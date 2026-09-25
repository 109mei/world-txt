import type { Balance, ImpulseKey } from '../data/schema';
import { clamp, curve } from './math';
import { nextRandom } from './rng';
import type { Channels, Derived, GameState, SimState } from './types';

export interface YearOutcome {
  warStarted: boolean;
  warEnded: boolean;
}

/** 心がふだんからどれだけ離れているか（-1.5〜1。0 でふだんどおり、何にも効かない） */
export function mindShift(s: SimState, b: Balance): number {
  return clamp((s.mind - b.mind.base) / b.mind.span, -1.5, 1);
}

/** 物価の上がり方（10倍ごとに 1。はじめの物価のままなら 0。お金のない世界では 0） */
export function priceLevel(s: SimState, ch: Channels): number {
  return Math.log10(Math.max(1, s.prices)) * clamp(ch.money, 0, 1);
}

/** 状態から、今年の食料・水・エネルギーなどの釣り合いを計算する（状態は変えない） */
export function measure(s: SimState, ch: Channels, b: Balance, startPop: number, capacityUsed: number, incoherence: number): Derived {
  const popF = s.pop / b.popRef;
  const heatOver = Math.max(0, s.temp - b.climate.comfort);
  const coldOver = Math.max(0, b.climate.coldRef - s.temp);
  const mindF = mindShift(s, b);
  const priceF = priceLevel(s, ch);
  // 物価が暴れると、お金で回っていた物の流れが滞る
  const flow = ch.distribution / (1 + b.prices.distribution * priceF);

  // 水
  const waterHeat = Math.max(0.3, 1 - b.water.heatLoss * heatOver);
  const waterSupply = b.water.supply * ch.waterSupply * waterHeat * (b.water.ecoBase + ((1 - b.water.ecoBase) * s.eco) / 100);
  const waterDemand = b.water.human * popF * ch.waterDemand + b.water.agri * s.agri * ch.agriWater + b.water.industry * s.industry;
  const waterRatio = waterSupply / Math.max(0.02, waterDemand);

  // エネルギー
  const oilF = clamp(s.oilReserve / b.energy.reserveComfort, 0, 1);
  const fossil = s.energyCap * (1 - s.renewShare) * ch.fossilOutput * oilF;
  const renew = s.energyCap * s.renewShare * Math.sqrt(ch.sun) * ch.renewPower;
  const energySupply = (fossil + renew) * ch.energySupply + ch.cleanEnergy * b.energy.cleanUnit;
  const energyDemand =
    b.energy.demand * Math.pow(popF, 0.7) * (0.5 + 0.5 * s.industry) * ch.energyDemand * (1 + b.energy.climateLoad * (heatOver + coldOver));
  const energyRatio = energySupply / Math.max(0.02, energyDemand);

  // 食料
  const heatF = clamp(
    1 - b.food.heatCoef * Math.pow(heatOver, b.food.heatExp) * ch.heatLife - b.food.coldCoef * Math.pow(coldOver, b.food.coldExp),
    0.15,
    1,
  );
  const waterF = Math.min(b.food.waterCap, b.food.waterBase + (1 - b.food.waterBase) * Math.min(1.2, waterRatio));
  const ecoF = Math.min(1.04, b.food.ecoBase + ((1 - b.food.ecoBase) * s.eco) / b.food.ecoRef);
  const energyF = b.food.energyBase + (1 - b.food.energyBase) * Math.min(1, energyRatio);
  const sciF = 1 + b.food.sciCoef * (s.science - 1) * clamp(s.agri, 0.3, 1);
  // CO2 が多いほど光合成は少し進む（施肥効果）。少なすぎると作物は育たない
  const co2F = curve(b.food.co2Curve, s.co2);
  const sunF = Math.pow(ch.sun, b.food.sunExp);
  const blightF = 1 - s.blight;
  const yieldV = Math.max(0.02, ch.yield * heatF * waterF * ecoF * energyF * sciF * co2F * sunF * blightF);
  const logisticsF = b.food.distBase + (1 - b.food.distBase) * Math.min(1, s.infra / b.infra.ref);
  const distribution = logisticsF * flow;
  const production = s.agri * yieldV * distribution;
  const photo = clamp(ch.photosynth * ch.sun * ch.sun, 0, 0.9);
  const foodDemand = Math.max(0.001, popF * ch.foodDemand * (1 - photo));
  // 足りない年は、蓄えを取り崩して補う
  const draw = Math.min(s.foodStock * foodDemand, Math.max(0, foodDemand - production));
  const foodRatio = (production + draw) / foodDemand;

  // 医療と病気
  const medRaw =
    (b.medicine.base + b.medicine.sci * (s.science - 1)) *
    ch.medicine *
    (b.medicine.indBase + (1 - b.medicine.indBase) * Math.min(1.1, s.industry)) *
    (0.7 + 0.3 * Math.min(1, s.infra / b.infra.ref));
  const overload = Math.max(0, s.pathogen - b.medicine.overload) / b.medicine.overloadScale;
  const medicine = clamp(medRaw / (1 + overload), 0, 1.5);
  const diseaseDeaths = (s.pathogen / 100) * s.strainV * ch.virulence * (1 - b.disease.medMort * Math.min(1, medicine));

  // 人口
  const famine = b.pop.famine * Math.pow(Math.max(0, b.pop.famineRef - foodRatio), b.pop.famineExp);
  const thirst = b.pop.thirst * Math.max(0, b.pop.thirstRef - waterRatio);
  const heat = b.pop.heat * Math.pow(Math.max(0, s.temp - b.pop.heatRef), 1.5) * ch.heatHuman;
  const cold = b.pop.cold * Math.max(0, b.pop.coldRef - s.temp);
  const warD = b.pop.war * s.war;
  const excess = (famine + thirst + heat + cold + warD + diseaseDeaths) * ch.mortality;
  const natural = b.pop.natural * ch.aging * ch.mortality;
  const birthRate =
    b.pop.birth *
    ch.fertility *
    (b.pop.birthFoodBase + (1 - b.pop.birthFoodBase) * Math.min(1, foodRatio)) *
    (0.75 + 0.25 * clamp(s.stability / 60, 0, 1.2)) *
    Math.pow(b.popRef / Math.max(1, s.pop), b.pop.crowdExp) *
    (1 + b.mind.fertility * mindF);

  // 科学
  const research =
    b.science.rate *
    Math.pow(popF, 0.3) *
    (0.5 + 0.5 * clamp(s.stability / 60, 0, 1.2)) *
    (0.5 + 0.5 * Math.min(1.3, s.industry)) *
    (0.7 + (0.3 * s.happiness) / 55) *
    ch.science *
    (1 - b.science.warPenalty * s.war) *
    (1 + b.mind.science * mindF);

  const d: Derived = {
    foodRatio,
    waterRatio,
    energyRatio,
    research,
    medicine,
    birthRate,
    deathRate: natural + excess,
    excessDeaths: excess,
    famineDeaths: famine * ch.mortality,
    diseaseDeaths: diseaseDeaths * ch.mortality,
    heatDeaths: heat * ch.mortality,
    capacityUsed,
    capacityRatio: capacityUsed / Math.max(1, s.capacityMax),
    incoherence,
    civ: 0,
    distribution: flow,
    money: ch.money,
    factors: {
      food: {
        water: waterF,
        heat: heatF,
        eco: ecoF,
        energy: energyF,
        blight: blightF,
        land: s.agri / Math.max(0.01, b.food.land),
        demand: popF * ch.foodDemand * (1 - photo),
        logistics: distribution,
        sun: sunF * co2F,
        stock: s.foodStock,
        production: production / foodDemand,
      },
      water: { supply: waterSupply, demand: waterDemand, heat: waterHeat },
      energy: { fuel: oilF * ch.fossilOutput, demand: energyDemand, war: 1 - b.energy.warDamage * s.war },
    },
  };
  d.civ = civilization(s, d, b, startPop);
  return d;
}

/** 文明の点数（0〜100）。産業・物流・科学・社会・人類の重みつき平均 */
export function civilization(s: SimState, d: Derived, b: Balance, startPop: number): number {
  const w = b.civ.weights;
  const sc = b.scores;
  const industry = curve(sc.industry, s.industry);
  const logistics = curve(sc.logistics, (s.infra / b.infra.ref) * Math.min(1.2, d.distribution));
  const science = curve(sc.scienceLevel, s.science);
  const society = curve(sc.society, s.stability);
  const humanity = humanityScore(s, d, b, startPop);
  const total = w.industry + w.logistics + w.science + w.society + w.humanity;
  return (w.industry * industry + w.logistics * logistics + w.science * science + w.society * society + w.humanity * humanity) / total;
}

export function humanityScore(s: SimState, d: Derived, b: Balance, startPop: number): number {
  const h = b.scores.humanity;
  return clamp(
    h.base - h.excess * d.excessDeaths - h.loss * Math.max(0, 1 - s.pop / startPop) + (h.happy * (s.happiness - 55)) / 45,
    0,
    100,
  );
}

// ---------------------------------------------------------------- ゆっくり動く量の向かう先

/** 産業の向かう先 */
function industryTarget(s: SimState, d: Derived, ch: Channels, b: Balance, popF: number, mindF: number, priceF: number): number {
  return (
    (Math.pow(popF, 0.6) *
      Math.pow(clamp(d.energyRatio, 0.2, 1.15), 0.8) *
      (0.4 + 0.6 * Math.min(1, s.infra / b.infra.ref)) *
      (0.55 + 0.45 * clamp(s.stability / 60, 0, 1.2)) *
      (1 + b.industry.sci * (s.science - 1)) *
      ch.industry *
      (1 - b.industry.war * s.war) *
      (1 - (b.industry.sick * s.pathogen) / 100) *
      (1 - b.industry.unemp * Math.max(0, s.unemployment - b.unemployment.base)) *
      (1 + b.mind.industry * mindF)) /
    (1 + b.prices.industry * priceF)
  );
}

function unemploymentTarget(s: SimState, ch: Channels, b: Balance, priceF: number): number {
  return b.unemployment.base + ch.unemployment + b.unemployment.industry * Math.max(0, 1 - s.industry) + b.prices.unemp * priceF;
}

function wildfireOf(s: SimState, d: Derived, ch: Channels, b: Balance, heatOver: number): number {
  return b.climate.fireBase * ch.wildfire * (1 + 1.5 * heatOver) * (s.eco / 60) * (d.waterRatio < 0.9 ? 1.3 : 1);
}

function ecoTarget(s: SimState, ch: Channels, b: Balance, fossil: number, heatOver: number, coldOver: number, wildfire: number): number {
  return (
    b.eco.base +
    ch.eco -
    b.eco.landCoef * Math.max(0, s.agri - b.eco.landFree) -
    b.eco.pollution * fossil * ch.fossilCO2 -
    b.eco.heat * (heatOver * ch.heatLife + coldOver) -
    b.eco.war * s.war -
    b.eco.fire * wildfire
  );
}

function stabilityTarget(s: SimState, d: Derived, ch: Channels, b: Balance, mindF: number, priceF: number): number {
  const bs = b.society;
  const foodStress = Math.max(0, bs.foodRef - d.foodRatio);
  const waterStress = Math.max(0, bs.waterRef - d.waterRatio);
  const energyStress = Math.max(0, bs.energyRef - d.energyRatio);
  const unempStress = Math.max(0, s.unemployment - bs.unempRef);
  const fear = Math.max(0, b.coherence.fearRef - s.coherence);
  return (
    bs.base +
    ch.stability -
    bs.food * foodStress -
    bs.water * waterStress -
    bs.energy * energyStress -
    bs.unemp * unempStress -
    bs.sick * s.pathogen -
    bs.war * s.war -
    bs.fear * fear +
    bs.happy * (s.happiness - 55) -
    bs.deaths * d.excessDeaths +
    b.mind.stability * mindF -
    b.prices.stability * priceF
  );
}

function happinessTarget(s: SimState, d: Derived, ch: Channels, b: Balance, heatOver: number, mindF: number, priceF: number): number {
  const bh = b.happiness;
  const unempStress = Math.max(0, s.unemployment - b.society.unempRef);
  return (
    bh.base +
    ch.happiness +
    bh.food * (clamp(d.foodRatio, 0, 1.2) - 1) -
    bh.sick * s.pathogen -
    bh.war * s.war -
    bh.unemp * unempStress -
    bh.deaths * d.excessDeaths +
    (bh.eco * (s.eco - 55)) / 45 -
    bh.heat * heatOver +
    b.mind.happy * mindF -
    b.prices.happiness * priceF
  );
}

function tensionTarget(s: SimState, d: Derived, ch: Channels, b: Balance, heatOver: number): number {
  const bs = b.society;
  const bt = b.tension;
  const foodStress = Math.max(0, bs.foodRef - d.foodRatio);
  const waterStress = Math.max(0, bs.waterRef - d.waterRatio);
  const energyStress = Math.max(0, bs.energyRef - d.energyRatio);
  return (
    bt.base +
    ch.tension +
    bt.food * foodStress +
    bt.water * waterStress +
    bt.energy * energyStress +
    bt.instability * Math.max(0, 60 - s.stability) +
    bt.climate * heatOver
  );
}

function mindTarget(ch: Channels, b: Balance, priceF: number): number {
  return b.mind.base + ch.mind - b.prices.mind * priceF;
}

function coherenceTarget(d: Derived, ch: Channels, b: Balance): number {
  const overload = Math.max(0, d.capacityRatio - b.capacity.strainFrom) * b.capacity.strainCoef;
  return clamp(100 - d.incoherence - overload + ch.coherence, 0, 100);
}

/** 気温の落ち着く先（CO2・温室効果・太陽・直接の押し上げ） */
function temperatureTarget(s: SimState, ch: Channels, b: Balance): number {
  return (
    b.climate.sensitivity * Math.log2(s.co2 / b.climate.preCO2) * ch.greenhouse +
    b.climate.natural * (ch.greenhouse - 1) +
    b.climate.sunCoef * (ch.sun - 1) +
    ch.tempEq
  );
}

/**
 * 今の状態と係数での、ゆっくり動く量の向かう先。
 * 書き換えの前と後で比べ、その差（書き換えの勢い）を次の1年ですぐに世界へ届ける
 */
export function targetsOf(s: SimState, d: Derived, ch: Channels, b: Balance): Record<ImpulseKey, number> {
  const popF = s.pop / b.popRef;
  const heatOver = Math.max(0, s.temp - b.climate.comfort);
  const coldOver = Math.max(0, b.climate.coldRef - s.temp);
  const mindF = mindShift(s, b);
  const priceF = priceLevel(s, ch);
  const oilF = clamp(s.oilReserve / b.energy.reserveComfort, 0, 1);
  const fossil = s.energyCap * (1 - s.renewShare) * ch.fossilOutput * oilF;
  return {
    industry: Math.max(0.05, industryTarget(s, d, ch, b, popF, mindF, priceF)),
    unemployment: unemploymentTarget(s, ch, b, priceF),
    eco: clamp(ecoTarget(s, ch, b, fossil, heatOver, coldOver, wildfireOf(s, d, ch, b, heatOver)), 0, 100),
    stability: clamp(stabilityTarget(s, d, ch, b, mindF, priceF), 0, 100),
    happiness: clamp(happinessTarget(s, d, ch, b, heatOver, mindF, priceF), 0, 100),
    tension: clamp(tensionTarget(s, d, ch, b, heatOver), 0, 100),
    mind: clamp(mindTarget(ch, b, priceF), 0, 100),
    coherence: coherenceTarget(d, ch, b),
    temp: temperatureTarget(s, ch, b),
  };
}

/**
 * 1年進める。g.sim を書き換え、g.derived を今年の値にする。
 * forecast のときは乱数を使わない（戦争は始まらない）。
 */
export function simulateYear(g: GameState, ch: Channels, b: Balance, forecast: boolean): YearOutcome {
  const s = g.sim;
  const d = g.derived;
  const out: YearOutcome = { warStarted: false, warEnded: false };
  const popF = s.pop / b.popRef;
  const heatOver = Math.max(0, s.temp - b.climate.comfort);
  const coldOver = Math.max(0, b.climate.coldRef - s.temp);
  const mindF = mindShift(s, b);
  const priceF = priceLevel(s, ch);

  // ---- 農業の規模：足りなければ広げ（土地の限りまで）、余れば畳む
  const agriMax = b.food.land * ch.agriMax;
  const agriBefore = s.agri;
  // 農家は蓄えではなく、その年の収穫の過不足（値段）を見て動く
  const harvest = d.factors.food.production;
  const needed = (s.agri * b.food.targetRatio) / Math.max(0.05, harvest);
  if (needed > s.agri) {
    const room = Math.max(0, agriMax - s.agri);
    const pace = s.agri * b.food.expandRate * (0.4 + 0.6 * clamp(s.stability / 60, 0, 1));
    s.agri += Math.min(needed - s.agri, pace, room);
  } else if (harvest > b.food.shrinkAbove) {
    s.agri -= Math.min(s.agri - needed, s.agri * b.food.shrinkRate);
  }
  if (s.agri > agriMax) s.agri += (agriMax - s.agri) * 0.3;
  s.agri -= s.agri * b.food.warDamage * s.war;
  s.agri = Math.max(b.food.agriMin, s.agri);
  const agriShrink = Math.max(0, agriBefore - s.agri) / agriBefore;
  const agriGrowth = Math.max(0, s.agri - agriBefore);
  s.blight *= b.food.blightDecay;

  // ---- 食料の蓄え（1年の必要量に対する割合）：余った年に貯め、足りない年に取り崩す。蓄えは少しずつ腐る
  const produced = d.factors.food.production;
  const stockCap = b.food.stockCap * ch.foodStorage;
  if (produced >= 1) s.foodStock = Math.min(stockCap, s.foodStock + (produced - 1) * b.food.stockFill);
  else s.foodStock = Math.max(0, s.foodStock - (1 - produced));
  s.foodStock *= 1 - b.food.stockRot / Math.max(1, ch.foodStorage);

  // ---- エネルギー：発電の規模を需要に合わせ、再生可能エネルギーへ少しずつ移る
  const oilF = clamp(s.oilReserve / b.energy.reserveComfort, 0, 1);
  const conv = ((1 - s.renewShare) * ch.fossilOutput * oilF + s.renewShare * Math.sqrt(ch.sun) * ch.renewPower) * ch.energySupply;
  const energyDemand = d.factors.energy.demand;
  const neededCap = Math.max(0, energyDemand * b.energy.targetRatio - ch.cleanEnergy * b.energy.cleanUnit) / Math.max(0.05, conv);
  if (neededCap > s.energyCap) {
    const pace = s.energyCap * b.energy.expand * Math.min(1, s.industry) * Math.min(1, s.infra / b.infra.ref);
    s.energyCap += Math.min(neededCap - s.energyCap, pace);
  } else {
    s.energyCap -= Math.min(s.energyCap - neededCap, s.energyCap * b.energy.shrink);
  }
  s.energyCap = Math.max(0.05, s.energyCap * (1 - b.energy.warDamage * s.war));
  const fossil = s.energyCap * (1 - s.renewShare) * ch.fossilOutput * oilF;
  const pressure = 1 + b.energy.climatePush * heatOver;
  s.renewShare = clamp(
    s.renewShare +
      b.energy.transition * ch.renewGrowth * (0.5 + 0.5 * Math.min(2, s.science)) * pressure * (1 - s.renewShare) * clamp(s.stability / 60, 0.3, 1.1),
    0,
    0.97,
  );
  s.oilReserve = Math.max(0, s.oilReserve - (fossil / Math.max(0.3, ch.fossilOutput)) * ch.fossilDepletion);

  // ---- 病気：うつりやすさ（R）で流行が広がり、かかった人に免疫がつく
  const density = b.disease.densityBase + (1 - b.disease.densityBase) * popF;
  const R =
    b.disease.r0 * s.strainR * ch.transmission * (1 - s.immunity) * (1 - b.disease.medR * Math.min(1, d.medicine)) * density;
  s.pathogen = clamp(s.pathogen * Math.pow(R, b.disease.speed) + b.disease.background * ch.transmission, b.disease.min, b.disease.max);
  s.immunity = clamp(
    s.immunity + b.disease.immGain * (s.pathogen / 100) * (1 - s.immunity) - b.disease.immDecay * ch.immunityDecay * s.immunity,
    0,
    0.98,
  );
  s.immunity = Math.max(s.immunity, clamp(ch.immunityFloor, 0, 0.95));
  // 流行した病原体は、年とともにふだんの病気に戻っていく
  s.strainR += (1 - s.strainR) * b.disease.strainRelax * ch.strainRelax;
  s.strainV += (0.06 - s.strainV) * b.disease.strainRelax * ch.strainRelax;

  // ---- 人口
  s.pop = Math.max(0, s.pop * (1 + d.birthRate - d.deathRate));

  // ---- 産業・失業・物流・科学
  const indTarget = industryTarget(s, d, ch, b, popF, mindF, priceF);
  s.industry += (Math.max(0.05, indTarget) - s.industry) * b.industry.rate;

  const unempTarget = unemploymentTarget(s, ch, b, priceF);
  s.unemployment = clamp(s.unemployment + agriShrink * b.food.laborShare + (unempTarget - s.unemployment) * b.unemployment.rate, 0, 0.6);

  const infraTarget = Math.min(1, b.infra.base + b.infra.ind * Math.min(1.2, s.industry) * Math.sqrt(clamp(s.stability / 60, 0.05, 1.2)));
  s.infra = clamp(s.infra + (infraTarget - s.infra) * b.infra.rate - ch.infraDamage - b.infra.war * s.war, 0.02, 1);

  s.science = Math.max(0.05, s.science * (1 + d.research));

  // ---- 気候：CO2 が増えると、気温が遅れて上がる
  const wildfire = wildfireOf(s, d, ch, b, heatOver);
  const emissions =
    (fossil * ch.fossilCO2 * b.climate.fossilEm +
      b.climate.indEm * s.industry +
      b.climate.agriEm * s.agri +
      b.climate.landEm * agriGrowth +
      b.climate.fireEm * wildfire) *
    ch.emissions;
  const sinkF = Math.max(0, (s.co2 - b.climate.preCO2) / (b.climate.refCO2 - b.climate.preCO2));
  const sinks = sinkF * ((b.climate.plantSink * ch.plantSink * s.eco) / 60 + b.climate.oceanSink * ch.oceanSink) + ch.humanSink * popF;
  s.co2 = Math.max(180, s.co2 + emissions - sinks - ch.co2Removal);
  const tempEq = temperatureTarget(s, ch, b);
  s.temp += (tempEq - s.temp) * b.climate.lag * clamp(ch.tempHold, 0, 3);

  // ---- 生態系
  const ecoT = ecoTarget(s, ch, b, fossil, heatOver, coldOver, wildfire);
  s.eco = clamp(s.eco + (clamp(ecoT, 0, 100) - s.eco) * clamp(b.eco.rate * ch.ecoRecovery, 0, 0.8), 0, 100);

  // ---- 社会：安定・幸福・国際緊張
  const stabT = stabilityTarget(s, d, ch, b, mindF, priceF);
  s.stability += (clamp(stabT, 0, 100) - s.stability) * b.society.rate;

  const happyT = happinessTarget(s, d, ch, b, heatOver, mindF, priceF);
  s.happiness += (clamp(happyT, 0, 100) - s.happiness) * b.happiness.rate;

  const tensionT = tensionTarget(s, d, ch, b, heatOver);
  s.tension += (clamp(tensionT, 0, 100) - s.tension) * b.tension.rate;

  // ---- 心：概念（係数 mind）と物価で動き、ふだんの高さへゆっくり戻る
  const mindT = mindTarget(ch, b, priceF);
  s.mind = clamp(s.mind + (clamp(mindT, 0, 100) - s.mind) * b.mind.rate, 0, 100);

  // ---- 物価：お金が刷られるほど上がり、刷られなくなれば戻る。お金のない世界では物価そのものが意味を失う
  const inflation = ch.inflation * clamp(ch.money, 0, 1);
  if (inflation > 0) s.prices = Math.min(b.prices.max, s.prices * (1 + inflation));
  else s.prices += (1 - s.prices) * (ch.money < 0.5 ? 1 : b.prices.relax);

  // ---- 戦争：緊張が高いと始まりうる。疲弊して緊張が下がると終わる
  if (s.war > 0) {
    // 戦争の激しさは兵器の破壊力で決まる（戦争中に兵器の定義を書き換えると、次の年から変わる）
    s.war = b.war.intensity * clamp(ch.warHarm, 0.05, 2);
    // 長引くほど疲弊して、戦争を続けられなくなる
    g.counters.warYears += 1;
    s.tension = Math.max(0, s.tension - b.war.exhaust * (1 + b.war.exhaustGrowth * g.counters.warYears));
    if (s.tension < b.war.endBelow || ch.war <= 0) {
      s.war = 0;
      out.warEnded = true;
      g.counters.warCooldown = b.war.cooldown;
      g.counters.warYears = 0;
    }
  } else if (!forecast && ch.war > 0 && g.counters.warCooldown <= 0 && s.tension > b.war.threshold) {
    const p = clamp(((s.tension - b.war.threshold) / b.war.scale) * ch.war, 0, 0.9);
    if (nextRandom(g) < p) {
      s.war = b.war.intensity * clamp(ch.warHarm, 0.05, 2);
      out.warStarted = true;
    }
  }
  if (g.counters.warCooldown > 0) g.counters.warCooldown -= 1;
  g.counters.peaceYears = s.war > 0 ? 0 : g.counters.peaceYears + 1;

  // ---- 世界整合性：無理な法則が多いほど、世界容量が苦しいほど下がる
  const cohTarget = coherenceTarget(d, ch, b);
  s.coherence += (cohTarget - s.coherence) * b.coherence.rate;

  return out;
}
