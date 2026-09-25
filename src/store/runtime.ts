import {
  advance,
  createGame,
  lawTotals,
  refresh,
  syncPhraseFlags,
  upgradeState,
  worldSummary,
  write,
  type EditResult,
  type WriteTarget,
  type GameData,
  type GameState,
  type StepReport,
} from '../core';
import type { StageId } from '../data/schema';
import {
  DEFAULT_SETTINGS,
  EMPTY_PROGRESS,
  exportText,
  importText,
  SAVE_VERSION,
  type Progress,
  type SaveData,
  type SaveStore,
  type Settings,
} from '../save';
import { newAchievements } from './achievements';
import { insertRun } from './ranking';

/** 無限の世界の記録を残す数 */
const ENDLESS_RUNS = 30;

/** 日付から種を作る（同じ日付なら同じ種） */
export function dailySeed(date: string): number {
  let h = 2166136261;
  for (const ch of `WORLD.txt:${date}`) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % 2147483647 || 1;
}

/** 書き換える場所：既存の法則の行・書き足した行・新しい行 */
export type EditTarget = WriteTarget;

export interface RuntimeOptions {
  data: GameData;
  store: SaveStore;
  now: () => number;
  newSeed: () => number;
}

/**
 * ルール本体（core）と保存の窓口をつなぐ。ゲームの状態の持ち主は core で、
 * ここは命令を渡して結果を保存するだけ。画面の写しは store/view.ts が作る。
 */
export class GameRuntime {
  state: GameState | null = null;
  settings: Settings = { ...DEFAULT_SETTINGS };
  progress: Progress = structuredClone(EMPTY_PROGRESS);
  /** 読み込みに失敗したときの理由（壊れたセーブなど） */
  loadError: string | null = null;
  /** 直前の命令で、観測記録に初めて入ったもの（実績は「ach:」） */
  fresh: string[] = [];
  /** 別の画面で同じセーブが書き換えられたので、もう保存しない */
  private frozen = false;

  constructor(private readonly opts: RuntimeOptions) {}

  get data(): GameData {
    return this.opts.data;
  }

  async boot(): Promise<void> {
    try {
      const save = await this.opts.store.load();
      if (save) {
        this.apply(save);
        if (save.droppedCurrent) this.loadError = '遊んでいた世界が壊れていたので、その世界だけを手放した（記録は残っている）';
      }
    } catch (e) {
      this.loadError = `${(e as Error).message}。壊れたセーブは消さずに別に残してある`;
    }
  }

  private apply(save: SaveData): void {
    this.settings = save.settings;
    this.progress = save.progress;
    this.state = save.current;
    // 計算した量は内容の版が変わっても合うよう、読み込み直後に測り直す
    if (this.state) {
      const g = upgradeState(this.state, this.data);
      this.forgetUnknown(g);
      if (!g.derived?.factors) {
        refresh(g, this.data);
      } else {
        // 世界の様子は、最後に時間を進めたときの値のまま（読み込んだだけで書き換えの結果が見えないように）。重さだけ測り直す
        const t = lawTotals(this.data, g);
        g.derived = { ...g.derived, capacityUsed: t.cost, capacityRatio: t.cost / Math.max(1, g.sim.capacityMax), incoherence: t.incoherence };
      }
      this.absorb(g);
    }
    this.fresh = [];
  }

  /** 内容の版が変わって消えた法則・言い回しを、セーブから取り除く（読み込んだ世界が壊れないように） */
  private forgetUnknown(g: GameState): void {
    for (const law of this.data.laws) {
      if (!this.data.optionOf.get(law.id)?.has(g.laws[law.id] ?? '')) {
        g.laws[law.id] = law.initial;
        g.understood[law.id] = true;
      }
      if (g.texts[law.id] === undefined) g.texts[law.id] = law.options.find((o) => o.id === law.initial)?.text ?? '';
    }
    for (const id of Object.keys(g.laws)) if (!this.data.lawById.has(id)) delete g.laws[id];
    for (const [id, c] of Object.entries(g.carried)) {
      c.phrases = c.phrases.filter((p) => this.data.phraseById.has(p));
      if (c.law && !this.data.optionOf.get(c.law.id)?.has(c.law.option)) c.law = null;
      if (!this.data.lawById.has(id) && !g.extras.some((x) => x.id === id)) delete g.carried[id];
    }
    syncPhraseFlags(g, this.data);
    for (const id of Object.keys(g.twists)) if (!this.data.twistById.has(id)) delete g.twists[id];
  }

  /** この世界で見つけたものを観測記録に移す。初めてのものを fresh に残す */
  private absorb(g: GameState): void {
    const known = new Set(this.progress.discovered);
    this.fresh = [];
    for (const id of g.found) {
      if (known.has(id)) continue;
      known.add(id);
      this.progress.discovered.push(id);
      this.fresh.push(id);
    }
  }

  snapshot(): SaveData {
    return {
      saveVersion: SAVE_VERSION,
      savedAt: this.opts.now(),
      settings: this.settings,
      progress: this.progress,
      current: this.state,
    };
  }

  async save(): Promise<void> {
    if (this.frozen) return;
    try {
      await this.opts.store.save(this.snapshot());
    } catch {
      // 保存できなくても遊びは続ける
    }
  }

  /** 世界を始める。daily なら今日の世界（日付から決まる種。同じ日なら誰でも同じ世界） */
  start(stageId: StageId, daily = false): GameState {
    // 世界は1つだけ。遊んでいる世界があれば、それを放棄して新しい世界を開く
    if (this.playing) this.progress.abandoned += 1;
    const date = daily ? this.today() : null;
    this.state = createGame(this.data, stageId, date ? dailySeed(date) : this.opts.newSeed());
    this.state.daily = date;
    this.progress.worlds += 1;
    this.fresh = [];
    this.unlock(this.state);
    void this.save();
    return this.state;
  }

  /** WORLD.txt を書き換える（既存の行・書き足した行・新しい行） */
  write(target: EditTarget, text: string): EditResult {
    const g = this.state;
    if (!g) return { block: 'ended', understood: false, reading: null, shortage: 0, redirect: null, sameAs: null, replaced: false, stacked: null, noise: null };
    const res = write(g, this.data, target, text);
    this.fresh = [];
    if (!res.block) {
      this.absorb(g);
      this.unlock(g);
      void this.save();
    }
    return res;
  }

  advance(years: number): StepReport | null {
    const g = this.state;
    if (!g || g.status !== 'playing') return null;
    const report = advance(g, this.data, years);
    this.absorb(g);
    if (g.status !== 'playing') this.record(g);
    this.unlock(g);
    void this.save();
    return report;
  }

  /** 新しく得た実績を記録する（観測記録と同じく、初めてのものは fresh に「ach:」で残す） */
  private unlock(g: GameState | null): void {
    for (const id of newAchievements(this.data, g, this.progress)) {
      this.progress.achievements.push(id);
      this.fresh.push(`ach:${id}`);
    }
  }

  /** いま遊んでいる世界（終わっていない世界） */
  get playing(): GameState | null {
    return this.state && this.state.status === 'playing' ? this.state : null;
  }

  /** 今日の日付（YYYY-MM-DD、端末の時刻で） */
  today(): string {
    const d = new Date(this.opts.now());
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** 終わった世界を記録に残す */
  private record(g: GameState): void {
    const sum = worldSummary(g, this.data);
    if (this.data.stageById.get(g.stageId)?.endless) {
      // 無限の世界：何年続いたかを新しい順に残し、記録簿（ランキング）には長く続いた順に上位だけを残す
      const at = this.opts.now();
      this.progress.endless = [{ years: g.year, daily: g.daily, at, title: sum.title }, ...this.progress.endless].slice(0, ENDLESS_RUNS);
      this.progress.ranking = insertRun(this.progress.ranking ?? [], {
        years: g.year,
        daily: g.daily,
        at,
        title: sum.title,
        ending: g.ending,
        edits: g.stats.edits,
        averted: g.crises.averted,
      }).list;
    }
    if (g.status === 'cleared' && !this.progress.cleared.includes(g.stageId)) this.progress.cleared.push(g.stageId);
    const prev = this.progress.best[g.stageId];
    const cleared = g.status === 'cleared';
    // クリアした記録を優先し、同じ結果なら長く続いた世界を残す
    const better = !prev || (cleared && !prev.cleared) || (cleared === prev.cleared && g.year > prev.years);
    const next = better || !prev ? { years: g.year, title: sum.title, cleared } : { ...prev };
    // 少ない書き換えで救えた記録は、別に残す
    const fewest = cleared ? Math.min(prev?.fewest ?? Number.POSITIVE_INFINITY, g.stats.edits) : prev?.fewest;
    if (fewest !== undefined && Number.isFinite(fewest)) next.fewest = fewest;
    this.progress.best[g.stageId] = next;
  }

  abandon(): void {
    if (this.playing) this.progress.abandoned += 1;
    this.state = null;
    this.fresh = [];
    this.unlock(null);
    void this.save();
  }

  /** 別の画面（タブ）で同じセーブが書き換えられた：この画面からは保存しない（2つの世界が混ざらないように） */
  freeze(): void {
    this.frozen = true;
  }

  setSettings(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch };
    void this.save();
  }

  exportSave(): string {
    return exportText(this.snapshot());
  }

  async importSave(text: string): Promise<void> {
    const save = importText(text);
    this.apply(save);
    this.loadError = null;
    await this.save();
  }

  async reset(): Promise<void> {
    this.state = null;
    this.settings = { ...DEFAULT_SETTINGS };
    this.progress = structuredClone(EMPTY_PROGRESS);
    await this.opts.store.clear();
  }
}
