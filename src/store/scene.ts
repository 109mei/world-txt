import { eachLine, indicatorLevel, kindOf, phraseName, type GameData, type GameState } from '../core';
import { clamp } from '../core/math';
import type { IconKey, IndicatorId, SceneMotif, SceneSpec, SpecimenMode, SpecimenShape, Tone } from '../data/schema';

/**
 * 世界の情景を描くための写し。
 * 状態（人類・食料など）は点数から 0〜1 で、書き換え・副作用・危機・結末・その年の出来事は、描く要素（motifs）とその強さで持つ。
 * 書き換えは、時間を進めて世界に効き始めてから描く（書いただけでは結果を見せない）
 */
export interface SceneView {
  /** 世界ごとに少しずつ違う景色にするための種 */
  seed: number;
  year: number;
  /**
   * どの遊びの絵か：何回目の遊び（run）と、くり返す世界の何周目か（lap）。同じ世界番号と年でも、やり直し・分かれ道・
   * くり返しの次の周では、塗り替えと現れ方をもう一度見せる（画面の写しを作るときに入れる）
   */
  run?: number;
  lap?: number;
  // ---- 状態から（0〜1）
  people: number;
  /** はじめの人口に対する今の人口（0〜2） */
  pop: number;
  civ: number;
  food: number;
  eco: number;
  water: number;
  energy: number;
  industry: number;
  health: number;
  /** 気温の偏り：-1 寒い 〜 0 ふだん 〜 1 暑い */
  heat: number;
  /** 戦争の激しさ（0 で平和） */
  war: number;
  peace: number;
  society: number;
  mind: number;
  science: number;
  logistics: number;
  prices: number;
  money: boolean;
  coherence: number;
  /** 再生可能エネルギーの割合 */
  renew: number;
  /** 化石燃料で動いている度合い */
  fossil: number;
  /** 作物の病気の広がり（0〜1） */
  blight: number;
  /** 空白の行（消した行）ごとの、世界が埋めるまでの進み（0 消した年 〜 1 埋まる年） */
  voids: number[];
  // ---- 書き換え・副作用・危機・結末・出来事から
  motifs: Partial<Record<SceneMotif, number>>;
  /** インクの色で描く要素（プレイヤーの書き換えから来たもの） */
  inked: SceneMotif[];
  /** この年に新しく描かれた要素（インクがにじむように現れる） */
  fresh: SceneMotif[];
  /** 現れ方・消え方の動きを見せ終えた（画面が付ける。絵の形は変えず、動きだけを止める） */
  entered?: boolean;
  /** 言葉そのものを小さな絵と名前で描く（「猫がいなくなる」など） */
  specimens: {
    key: string;
    shape: SpecimenShape;
    mode: SpecimenMode;
    label: string;
    fresh: boolean;
  }[];
  /** 絵にしにくい決まりを刻んだ石碑 */
  steles: { key: string; icon: IconKey; fresh: boolean }[];
  /** 最後に書いた一文（インクで出す） */
  ink: string | null;
  ended: 'cleared' | 'failed' | null;
  /** 情景の名前：施設の名前と、気がかりな状態の言葉（良い・ふつうなら言葉は出さない） */
  labels: { id: string; name: string; word: string | null; tone: Tone; x: number; y: number }[];
}

type Motifs = Partial<Record<SceneMotif, number>>;

/** いちばん新しく書いた一文（書き換えた行・書き足した行。消したものは除く） */
function lastWritten(g: GameState): string | null {
  for (let i = g.history.length - 1; i >= 0; i -= 1) {
    const h = g.history[i]!;
    if (h.kind !== 'edit' || h.text.endsWith('を削除')) continue;
    const m = /「([^「」]+)」[^「」]*$/u.exec(h.text);
    if (m) return m[1]!;
  }
  return null;
}

/** 意味の鍵（o:法則.読み取り / p:言い回し）の、情景での描き方と印 */
function specOf(data: GameData, key: string): { spec: SceneSpec; icon: IconKey; phrase: string | null } | null {
  if (key.startsWith('p:')) {
    const p = data.phraseById.get(key.slice(2));
    return p ? { spec: p.scene, icon: p.icon, phrase: p.id } : null;
  }
  const m = /^o:([^.]+)\.(.+)$/u.exec(key);
  if (!m) return null;
  const law = data.lawById.get(m[1]!);
  const opt = data.optionOf.get(m[1]!)?.get(m[2]!);
  if (!law || !opt?.scene) return null;
  return {
    spec: opt.scene,
    icon: data.conceptById.get(law.concept)?.icon ?? 'edit',
    phrase: null,
  };
}

/** その言い回しを運んでいる行の文章（「{X}がいなくなる」の X を埋めるため） */
function carrierText(g: GameState, data: GameData, phraseId: string): string {
  for (const { ref, carried } of eachLine(g, data)) {
    if (!carried.phrases.includes(phraseId)) continue;
    return ref.kind === 'law' ? (g.texts[ref.id] ?? '') : (g.extras.find((x) => x.id === ref.id)?.text ?? '');
  }
  return '';
}

/**
 * 両立しない描き方を片づける（どんな組み合わせでも、書いたとおりの矛盾のない絵にする）。
 * 反対どうし（森が茂る・森がない）は、書き換えから来たもの → 後に書いたもの → 強いもの の順に一つだけ残し、
 * 「海がない」「人がいない」のような大きな欠けは、それを前提にする絵（潜る人・空を飛ぶ人）を描かない
 */
function resolve(data: GameData, motifs: Motifs, inked: Set<SceneMotif>, order: Motifs): void {
  const rank = (k: SceneMotif) => [inked.has(k) ? 1 : 0, order[k] ?? 0, motifs[k] ?? 0];
  const better = (a: SceneMotif, b: SceneMotif) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < ra.length; i += 1) if (ra[i] !== rb[i]) return ra[i]! > rb[i]! ? a : b;
    return a;
  };
  for (const group of data.scene.exclusive) {
    const present = group.filter((k) => motifs[k] !== undefined);
    if (present.length < 2) continue;
    const keep = present.reduce(better);
    for (const k of present) if (k !== keep) delete motifs[k];
  }
  for (const [hider, hidden] of Object.entries(data.scene.hides) as [SceneMotif, SceneMotif[]][]) {
    if ((motifs[hider] ?? 0) < data.scene.hideAt) continue;
    for (const k of hidden) delete motifs[k];
  }
}

export function sceneView(g: GameState, data: GameData): SceneView {
  const b = data.balance;
  const score = (id: IndicatorId) => clamp((g.scores[id] ?? 50) / 100, 0, 1);
  const off = 1 - score('climate');
  const warmer = g.sim.temp >= data.stageById.get(g.stageId)!.start.temp;

  const motifs: Motifs = {};
  const inked = new Set<SceneMotif>();
  const fresh = new Set<SceneMotif>();
  // 書き換えから来た要素の、書いた順（後に書いたほど大きい。両立しない描き方で、後に書いたほうを残すため）
  const order: Motifs = {};
  let seq = 0;
  const add = (m: Motifs, scale: number, ink: boolean, isFresh = false) => {
    seq += 1;
    for (const [k, v] of Object.entries(m) as [SceneMotif, number][]) {
      const val = clamp(v * scale, 0, 1);
      if (val < 0.02) continue;
      motifs[k] = Math.max(motifs[k] ?? 0, val);
      if (ink) {
        inked.add(k);
        order[k] = seq;
      }
      if (isFresh) fresh.add(k);
    }
  };

  // 今年から効き始めた意味（結果の画面を開いている年だけ）
  const report = g.report && g.report.to === g.year ? g.report : null;
  const became = new Set(report?.became ?? []);

  // 書き換え：去年1年のあいだ世界に効いていた意味（書いたばかりの行は、まだ描かない）
  const specimens: SceneView['specimens'] = [];
  const steles: SceneView['steles'] = [];
  for (const key of g.inEffect) {
    const s = specOf(data, key);
    if (!s) continue;
    const isFresh = became.has(key);
    add(s.spec.motifs, 1, true, isFresh);
    if (s.spec.specimen) {
      const text = s.phrase ? carrierText(g, data, s.phrase) : '';
      const word = s.spec.specimen.label ?? (text ? phraseName('{X}', text) : '');
      // 書いた言葉の種類がわかれば、その形で描く（「猫がふしぎな力を持つ」なら獣の形）
      const kind = word ? kindOf(word) : null;
      const shape = (kind && data.scene.kinds[kind]) || s.spec.specimen.shape;
      specimens.push({
        key,
        shape,
        mode: s.spec.specimen.mode,
        label: word || '？',
        fresh: isFresh,
      });
    }
    if (s.spec.stele) steles.push({ key, icon: s.icon, fresh: isFresh });
  }

  // 副作用：育ち具合に合わせて描く（芽のうちは描かない）
  for (const [id, level] of Object.entries(g.twists)) {
    if (level < 0.15) continue;
    add(data.scene.twists[id] ?? {}, level, false);
  }

  // 知らされた危機の兆し：襲う年が近いほど強い
  if (g.crisis && g.status === 'playing') {
    const c = data.crisisById.get(g.crisis.id);
    const left = Math.max(0, g.crisis.at - g.year);
    const near = clamp(1 - left / ((c?.lead ?? 5) + 1), 0.3, 1);
    add(data.scene.crises[g.crisis.id] ?? {}, near, false);
  }

  // その年に起きた重大な出来事と世界異常（その年だけ）
  for (const n of report?.news ?? []) {
    if (n.onset || n.year !== g.year) continue;
    if (n.category === 'ANOMALY') {
      const a = data.anomalies.find((x) => x.text === n.text);
      if (a) add(data.scene.anomalies[a.id] ?? {}, 1, false);
      else add(data.scene.eventIcons[n.icon] ?? {}, 1, false);
    } else if (n.severity !== 'info') add(data.scene.eventIcons[n.icon] ?? {}, 1, false);
  }

  // 世界の結末
  if (g.status !== 'playing' && g.ending) add(data.scene.endings[g.ending] ?? {}, 1, false);

  resolve(data, motifs, inked, order);

  const oilF = clamp(g.sim.oilReserve / b.energy.reserveComfort, 0, 1);
  return {
    seed: g.seed,
    year: g.year,
    people: score('humanity'),
    pop: clamp(g.sim.pop / Math.max(1, g.startPop), 0, 2),
    civ: clamp(g.derived.civ / 100, 0, 1),
    food: score('food'),
    eco: score('eco'),
    water: score('water'),
    energy: score('energy'),
    industry: score('industry'),
    health: score('health'),
    heat: warmer ? off : -off,
    war: clamp(g.sim.war / Math.max(0.01, b.war.intensity), 0, 1),
    peace: score('peace'),
    society: score('society'),
    mind: score('mind'),
    science: score('science'),
    logistics: score('logistics'),
    prices: score('prices'),
    money: (g.derived.money ?? 1) > 0,
    coherence: clamp(g.sim.coherence / 100, 0, 1),
    renew: clamp(g.sim.renewShare, 0, 1),
    fossil: clamp((1 - g.sim.renewShare) * oilF, 0, 1),
    blight: clamp(g.sim.blight, 0, 1),
    voids: Object.keys(g.voids)
      .sort()
      .map((id) => clamp((g.year - g.voids[id]!) / Math.max(1, b.voids.years), 0, 1)),
    motifs,
    inked: [...inked].filter((k) => motifs[k] !== undefined),
    fresh: [...fresh].filter((k) => motifs[k] !== undefined),
    specimens,
    steles,
    ink: lastWritten(g),
    ended: g.status === 'playing' ? null : g.status,
    labels: data.scene.labels.flatMap((l) => {
      // 出すとき：空白の行があるとき／項目の点数が線より低いとき
      if (l.when === 'voids' && Object.keys(g.voids).length === 0) return [];
      if (l.when && l.when !== 'voids' && (g.scores[l.when.item] ?? 50) >= l.when.below) return [];
      const lv = l.item ? indicatorLevel(data.indicators, l.item, g.scores[l.item] ?? 50, g.sim, g.derived) : null;
      let word = lv && lv.tone !== 'good' && lv.tone !== 'ok' ? lv.word : null;
      let tone: Tone = lv?.tone ?? 'ok';
      // 悪い向きの知らせ（作物の病気が広がると「病気」）
      if (l.alert && g.sim[l.alert.sim] > l.alert.above) {
        word = l.alert.word;
        tone = 'bad';
      }
      return [{ id: l.id, name: l.name, word, tone, x: l.x, y: l.y }];
    }),
  };
}
