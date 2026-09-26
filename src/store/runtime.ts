import {
  accessFor,
  advance,
  allOpen,
  canReplay,
  createGame,
  replayKifu,
  introFor,
  kifuOf,
  marksOf,
  MARKS,
  stageNeeds,
  type Mark,
  type Journey,
  type Need,
  rankOf,
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
import { DEFAULT_SETTINGS, EMPTY_PROGRESS, exportText, importText, SAVE_VERSION, type Progress, type SaveData, type SaveStore, type Settings } from '../save';
import { newAchievements } from './achievements';
import { insertRun } from './ranking';

/** 無限の世界の記録を残す数 */
const ENDLESS_RUNS = 30;

/** 世界番号の数（#0001〜#9999） */
export const WORLD_NUMBERS = 9999;

/** 日付から今日の世界の世界番号を作る（同じ日付なら同じ番号） */
export function dailySeed(date: string): number {
  let h = 2166136261;
  for (const ch of `WORLD.txt:${date}`) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h % WORLD_NUMBERS) + 1;
}

/** 書き換える場所：既存の法則の行・書き足した行・新しい行 */
export type EditTarget = WriteTarget;

export interface RuntimeOptions {
  data: GameData;
  store: SaveStore;
  now: () => number;
  newSeed: () => number;
  /** 保存についての知らせが変わったとき（保存できなかった・保存できない画面。直れば null） */
  onSaveStatus?: (warning: string | null) => void;
}

/** 保存できなかったときの知らせ */
export const SAVE_FAILED = '保存できなかった（端末の保存領域に空きがないなど）。メニューの「記録（セーブ）」の「ファイルに保存」で控えをとっておく';
/** 画面を閉じると消える入れ物しか使えないときの知らせ */
export const SAVE_VOLATILE = 'この画面では保存できない（プライベートブラウズなど）。画面を閉じると遊んだ記録は消える';

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
  /** 直前に終わった世界で筆の位が上がったなら、その新しい位（結果の画面で知らせる） */
  rankUp: number | null = null;
  /** 直前に終わった世界で付いた印（結果の画面で知らせる） */
  lastMarks: Mark[] = [];
  /** 別の画面で同じセーブが書き換えられたので、もう保存しない */
  private frozen = false;
  /** 保存についての知らせ（保存できなかった・保存できない画面） */
  saveWarning: string | null = null;
  /** 最後に保存できた時刻（まだなら null） */
  savedAt: number | null = null;

  constructor(private readonly opts: RuntimeOptions) {}

  get data(): GameData {
    return this.opts.data;
  }

  async boot(): Promise<void> {
    if (!this.opts.store.persistent) this.setSaveWarning(SAVE_VOLATILE);
    try {
      const save = await this.opts.store.load();
      if (save) {
        this.apply(save);
        if (save.restored) this.loadError = '最新のセーブが壊れていたのでひとつ前のセーブから読み込んだ（壊れたセーブは消さずに別に残してある）';
        else if (save.droppedCurrent) this.loadError = '遊んでいた世界が壊れていたのでその世界だけを手放した（記録は残っている）';
      }
    } catch (e) {
      this.loadError = `${(e as Error).message}。壊れたセーブは消さずに別に残してある`;
    }
  }

  private setSaveWarning(warning: string | null): void {
    if (this.saveWarning === warning) return;
    this.saveWarning = warning;
    this.opts.onSaveStatus?.(warning);
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
      this.savedAt = this.opts.now();
      // 保存できた（保存できない画面の知らせは、そのまま）
      if (this.opts.store.persistent) this.setSaveWarning(null);
    } catch {
      // 保存できなくても遊びは続ける。ただし、知らせる（黙って記録を失わないように）
      this.setSaveWarning(SAVE_FAILED);
    }
  }

  /** 開いていく順番を決める記録（救った世界・遊び終えた世界・観測記録・負けた数） */
  get journey(): Journey {
    const p = this.progress;
    return { cleared: p.cleared, played: p.played, discovered: p.discovered, losses: p.losses };
  }

  /** すべて開いた状態で遊んでいる（すべてを一度開き、設定で選んだとき） */
  get everythingOpen(): boolean {
    return this.settings.allOpen && allOpen(this.data, this.journey);
  }

  /** 改稿者の試練が開いているか（そのステージの3つの印をそろえた） */
  trialOpen(stageId: StageId): boolean {
    const st = this.data.stageById.get(stageId);
    return !!st?.trial && (this.everythingOpen || (this.progress.best[stageId]?.marks?.length ?? 0) >= 3);
  }

  /** そのステージが開くまでに足りないもの（開いていれば空） */
  stageNeeds(stageId: StageId): Need[] {
    return this.everythingOpen ? [] : stageNeeds(this.data, this.journey, stageId);
  }

  /**
   * 世界を始める。daily なら今日の世界（日付から決まる世界番号。同じ日なら誰でも同じ世界）。
   * seed を渡すと、その世界番号の世界（同じ世界でもう一度・番号で開く）
   */
  start(stageId: StageId, daily = false, seed: number | null = null, opts: { numbered?: boolean; trial?: boolean } = {}): GameState {
    // 世界は1つだけ。遊んでいる世界があれば、それを放棄して新しい世界を開く
    if (this.playing) this.progress.abandoned += 1;
    const date = daily ? this.today() : null;
    // 同じ世界でもう一度：小さな違いが育つのを見られる（開いていく順番の発見）
    const prev = this.state;
    const retry = seed !== null && prev !== null && prev.stageId === stageId && prev.seed === seed;
    // 書き換えられる範囲は、いまの筆の位（救った世界の数）とステージで決まる
    // はじめての本番の世界（序章のほかに、まだどの世界も遊び終えていない）は、そのステージの決まった原因の型から始める
    const firstWorld = !this.progress.played.some((s) => s !== 'prologue');
    const first = firstWorld && seed === null && !date ? (this.data.stageById.get(stageId)?.firstCause ?? undefined) : undefined;
    // 世界の決まりの強さ：わかった決まりは本来の強さ、まだの決まりは弱く動かす（開いていく順番）
    const intro = this.everythingOpen ? {} : introFor(this.data, this.journey);
    this.state = createGame(this.data, stageId, seed ?? (date ? dailySeed(date) : this.opts.newSeed()), accessFor(this.data, stageId, this.progress.cleared.length), {
      ...(first ? { cause: first } : {}),
      intro,
      trial: !!opts.trial && !!this.data.stageById.get(stageId)?.trial,
    });
    this.rankUp = null;
    this.lastMarks = [];
    this.state.daily = date;
    this.progress.worlds += 1;
    this.fresh = [];
    if (retry) this.note('h:retry');
    // 世界番号を入れて開いた（友だちの世界番号で遊ぶ）
    if (opts.numbered) this.note('h:number');
    this.unlock(this.state);
    void this.save();
    return this.state;
  }

  /**
   * 分かれ道からやり直す：終わった世界の棋譜を、分かれ道の年（その年の手は書かない）まで作り直し、そこから遊ぶ。
   * やり直した世界には、印の「少ない手で」「早く見抜いた」は付かず、いちばん良かった棋譜にも残さない
   */
  branchFrom(): GameState | null {
    const g = this.state;
    if (!g || g.status === 'playing' || !g.branch) return null;
    const k = kifuOf(g, this.data);
    if (!canReplay(k, this.data)) return null;
    const next = replayKifu(this.data, k, { year: g.branch.year, loops: g.branch.pass });
    next.branched = true;
    next.daily = g.daily;
    this.state = next;
    this.rankUp = null;
    this.lastMarks = [];
    this.progress.worlds += 1;
    this.fresh = [];
    this.absorb(next);
    void this.save();
    return next;
  }

  /** 記録の側で初めて起きたこと（初めての負け・3回目の負け・同じ世界でもう一度）を観測記録に残す */
  private note(id: string): void {
    if (this.progress.discovered.includes(id)) return;
    this.progress.discovered.push(id);
    this.fresh.push(id);
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
    // 開いていく順番：遊び終えた世界（勝ち負けは問わない）と、負けた数（3回負けるごとに兆しの読み方が開く）
    if (!this.progress.played.includes(g.stageId)) this.progress.played.push(g.stageId);
    if (g.status === 'failed') {
      const losses = (this.progress.losses[g.stageId] ?? 0) + 1;
      this.progress.losses[g.stageId] = losses;
      this.note('h:lose');
      if (losses % this.data.balance.intro.hintEvery === 0 && losses / this.data.balance.intro.hintEvery <= (this.data.stageById.get(g.stageId)?.hints.length ?? 0)) this.note('h:lose3');
    }
    // 改稿者の試練：救えば試練の記録だけを残す（ステージの記録・印・棋譜は、ふつうの世界のもの）
    if (g.trial) {
      if (g.status === 'cleared' && !this.progress.trials.includes(g.stageId)) this.progress.trials.push(g.stageId);
      return;
    }
    this.keepKifu(g);
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
    if (g.status === 'cleared' && !this.progress.cleared.includes(g.stageId)) {
      // 救った世界が増えて筆の位が上がったら、結果の画面で知らせる
      const before = rankOf(this.data, this.progress.cleared.length);
      this.progress.cleared.push(g.stageId);
      const after = rankOf(this.data, this.progress.cleared.length);
      if (after > before) this.rankUp = after;
    }
    const prev = this.progress.best[g.stageId];
    const cleared = g.status === 'cleared';
    // クリアした記録を優先し、同じ結果なら長く続いた世界を残す
    const better = !prev || (cleared && !prev.cleared) || (cleared === prev.cleared && g.year > prev.years);
    const next = better || !prev ? { years: g.year, title: sum.title, cleared } : { ...prev };
    // 少ない書き換えで救えた記録は、別に残す
    const fewest = cleared ? Math.min(prev?.fewest ?? Number.POSITIVE_INFINITY, g.stats.edits) : prev?.fewest;
    if (fewest !== undefined && Number.isFinite(fewest)) next.fewest = fewest;
    // 3つの印：これまでに付いた印は残す（開いたものは閉じない）
    const marks = new Set([...(prev?.marks ?? []), ...marksOf(g, this.data)]);
    if (marks.size > 0) next.marks = MARKS.filter((m) => marks.has(m));
    this.lastMarks = marksOf(g, this.data);
    this.progress.best[g.stageId] = next;
  }

  /**
   * ステージごとに、いちばん良かった棋譜を残す：救った世界の中で手の少ないもの。救っていなければ長く続いたもの。
   * 分かれ道からやり直した世界は残さない（はじめから通した手ではないので）
   */
  private keepKifu(g: GameState): void {
    if (g.branched) return;
    const k = kifuOf(g, this.data);
    const prev = this.progress.kifu[g.stageId];
    const better =
      !prev ||
      prev.rules !== k.rules ||
      (k.result === 'cleared' && prev.result !== 'cleared') ||
      (k.result === 'cleared' && prev.result === 'cleared' && k.moves.length < prev.moves.length) ||
      (k.result !== 'cleared' && prev.result !== 'cleared' && (k.loops > prev.loops || (k.loops === prev.loops && k.year > prev.year)));
    if (better) this.progress.kifu[g.stageId] = k;
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

  /** 書き出した（ファイルに保存・共有・コピー）。最後に書き出した日を残す */
  markExported(): void {
    this.progress.exportedAt = this.opts.now();
    void this.save();
  }

  /** ホーム画面に追加の案内を出すか（最初のクリアのあとに1度だけ。出したら、もう出さない） */
  get homePrompt(): boolean {
    return this.progress.cleared.length > 0 && !this.progress.prompted.home;
  }

  /** ホーム画面に追加の案内を出した（閉じた） */
  dismissHome(): void {
    this.progress.prompted = { ...this.progress.prompted, home: true };
    void this.save();
  }

  /** 書き出しのおすすめを出すか（新しい筆の位になったあとに1度だけ） */
  exportPrompt(rank: number): boolean {
    return rank > this.progress.prompted.exportRank;
  }

  /** 書き出しのおすすめを出した */
  dismissExport(rank: number): void {
    this.progress.prompted = { ...this.progress.prompted, exportRank: Math.max(this.progress.prompted.exportRank, rank) };
    void this.save();
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
