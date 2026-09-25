import { create } from 'zustand';
import type { EditBlock, EditResult, NoiseInfo } from '../core';
import type { IndicatorId, StageId } from '../data/schema';
import type { Progress, Settings } from '../save';
import type { EditTarget, GameRuntime } from './runtime';
import { buildView, type GameView } from './view';

/**
 * 画面の状態（どの画面・どのシートを開いているか）と、core から作った写し。
 * ゲームの状態そのものは runtime の中の core が持つ。ここを書き換えても世界は変わらない。
 */

export type Screen = 'title' | 'stages' | 'briefing' | 'game' | 'result' | 'records';
export type Tab = 'world' | 'laws' | 'history';
export type Sheet =
  | { kind: 'edit'; target: EditTarget }
  | { kind: 'report' }
  | { kind: 'indicator'; id: IndicatorId }
  | { kind: 'menu' }
  | { kind: 'meta'; which: 'capacity' | 'coherence' };

interface UiState {
  screen: Screen;
  tab: Tab;
  sheet: Sheet | null;
  briefing: StageId | null;
  view: GameView | null;
  settings: Settings;
  progress: Progress;
  hasGame: boolean;
  lawFilter: { concept: string | null; query: string };
  toast: string | null;
  /** 直前に時間を進めたときの、観測記録への新しい発見 */
  fresh: string[];
  /** 観測記録から戻る先 */
  recordsFrom: Screen;
  /** 時間が流れている演出の最中（YEAR from → to） */
  passing: { from: number; to: number } | null;
  /** セーブを読み込めなかったときの知らせ */
  loadError: string | null;
  /** 別の画面（タブ）で同じ世界が開かれた */
  elsewhere: boolean;
}

export const useGame = create<UiState>(() => ({
  screen: 'title',
  tab: 'world',
  sheet: null,
  briefing: null,
  view: null,
  settings: { bgm: true, volume: 0.6, analysis: false, se: true },
  progress: { cleared: [], best: {}, worlds: 0, discovered: [], endless: [], ranking: [], achievements: [], abandoned: 0 },
  hasGame: false,
  lawFilter: { concept: null, query: '' },
  toast: null,
  fresh: [],
  recordsFrom: 'title',
  passing: null,
  loadError: null,
  elsewhere: false,
}));

let runtime: GameRuntime | null = null;

export function setRuntime(rt: GameRuntime): void {
  runtime = rt;
  refreshView();
}

export function getRuntime(): GameRuntime {
  if (!runtime) throw new Error('runtime がまだない');
  return runtime;
}

/** core の状態から写しを作り直す */
export function refreshView(): void {
  if (!runtime) return;
  const g = runtime.state;
  const p = runtime.progress;
  useGame.setState({
    view: g ? buildView(g, runtime.data) : null,
    settings: runtime.settings,
    // runtime は進み具合をその場で書き換えるので、画面には新しい写しを渡す（開いたままの画面も変わりを知れる）
    progress: { ...p, cleared: [...p.cleared], best: { ...p.best }, discovered: [...p.discovered], achievements: [...p.achievements] },
    hasGame: !!g && g.status === 'playing',
    loadError: runtime.loadError,
  });
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function showToast(text: string): void {
  useGame.setState({ toast: text });
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => useGame.setState({ toast: null }), 3200);
}

// ---------------------------------------------------------------- 画面の移動

export function goTitle(): void {
  useGame.setState({ screen: 'title', sheet: null });
  refreshView();
}

export function goStages(): void {
  useGame.setState({ screen: 'stages', sheet: null });
}

/** そのステージを遊ぶには、あといくつの世界を救う必要があるか（0 なら遊べる） */
export function stageLock(stageId: StageId): number {
  const rt = getRuntime();
  const st = rt.data.stageById.get(stageId);
  if (!st) return 0;
  return Math.max(0, st.unlock - rt.progress.cleared.length);
}

export function openBriefing(stageId: StageId): void {
  const lock = stageLock(stageId);
  if (lock > 0) {
    showToast(`あと${lock}つの世界を救うと、この世界が開く`);
    return;
  }
  useGame.setState({ screen: 'briefing', briefing: stageId });
}

/** 観測記録を開く（閉じると from へ戻る） */
export function openRecords(from: Screen): void {
  useGame.setState({ screen: 'records', recordsFrom: from === 'records' ? 'title' : from, sheet: null });
  refreshView();
}

export function closeRecords(): void {
  useGame.setState({ screen: useGame.getState().recordsFrom });
}

export function startStage(stageId: StageId, daily = false): void {
  const rt = getRuntime();
  rt.start(stageId, daily);
  useGame.setState({ screen: 'game', tab: 'world', sheet: null, lawFilter: { concept: null, query: '' } });
  refreshView();
  // 放棄や、はじめての世界で得た実績を知らせる
  const got = rt.fresh.filter((id) => id.startsWith('ach:'));
  if (got.length > 0) showToast(achievementToast(got));
}

/** 遊んでいる世界（終わっていない世界）の、ステージの名前と年 */
export function playingWorld(): { stageId: StageId; title: string; year: number } | null {
  const g = getRuntime().playing;
  if (!g) return null;
  return { stageId: g.stageId, title: getRuntime().data.stageById.get(g.stageId)?.title ?? '', year: g.year };
}

/** 別の画面で同じ世界が開かれた：この画面は保存をやめ、読み込み直しを促す */
export function markElsewhere(): void {
  getRuntime().freeze();
  useGame.setState({ elsewhere: true, sheet: null });
}

/** 実績を得たときの知らせ */
export function achievementToast(ids: string[]): string {
  const names = ids.map((id) => getRuntime().data.achievements.find((a) => `ach:${a.id}` === id)?.name).filter(Boolean);
  return `🏆 実績「${names.join('」「')}」を得た`;
}

export function continueGame(): void {
  const g = getRuntime().state;
  if (!g) return;
  useGame.setState({ screen: g.status === 'playing' ? 'game' : 'result', tab: 'world', sheet: null });
  refreshView();
}

export function setTab(tab: Tab): void {
  useGame.setState({ tab, sheet: null });
}

export function openSheet(sheet: Sheet): void {
  useGame.setState({ sheet });
}

export function closeSheet(): void {
  useGame.setState({ sheet: null });
}

export function setLawFilter(patch: Partial<UiState['lawFilter']>): void {
  useGame.setState((s) => ({ lawFilter: { ...s.lawFilter, ...patch } }));
}

// ---------------------------------------------------------------- 書き換え

export function openEdit(target: EditTarget): void {
  useGame.setState({ sheet: { kind: 'edit', target } });
}

const BLOCK_TEXT: Record<EditBlock, string> = {
  ended: 'この世界はもう終わっている',
  same: '文章が変わっていない',
  'no-edits': '書き換えの力が残っていない',
  capacity: '世界容量が足りない',
  unknown: 'その行は見つからない',
  empty: '何も書かれていない',
  redundant: 'すでに同じ意味の定義がある',
};

export function blockText(block: EditBlock): string {
  return BLOCK_TEXT[block];
}

/** 行の番号（WORLD.txt の何行目か） */
function lineNo(id: string): string {
  const no = useGame.getState().view?.laws.find((l) => l.id === id)?.no;
  return no != null ? `${String(no).padStart(2, '0')}行目` : '別の行';
}

/** 読み取れなかった理由（書き換え画面と、書いたあとの知らせで使う） */
export function noiseText(noise: NoiseInfo | null): string {
  switch (noise?.kind) {
    case 'symbols':
      return '記号だけの文章は、世界に意味が伝わらない';
    case 'short':
      return '短すぎて、世界に意味が伝わらない';
    case 'question':
      return '問いかけは、世界の定義にならない（言い切る形で書く）';
    case 'foreign':
      return 'この言葉は、世界に意味が伝わらない（日本語か、やさしい英語で書く）';
    case 'unknown-words':
      return `「${noise.words.join('」「')}」は、世界に意味が伝わらない言葉`;
    default:
      return 'この文章は、世界に意味が伝わらない';
  }
}

/** 意味が伝わらない文章は、世界を何も変えない（その行の意味は、書き換える前のまま） */
export const NOISE_EFFECT = '意味のない文なので、世界は何も変わらない';

/** 書き換えの結果を、世界の声として短く伝える（onLaw：既存の行を書き換えた） */
export function editMessage(res: EditResult, text: string, fresh: boolean, onLaw = false): string {
  const star = fresh ? '　★新発見' : '';
  if (res.block) {
    if (res.block === 'capacity') return `世界容量が ${res.shortage} 足りない。先に何かを消す`;
    if (res.block === 'redundant' && res.sameAs) return `${lineNo(res.sameAs.id)}に、すでに同じ意味の定義がある`;
    if (res.block === 'redundant' && res.reading) return `「${res.reading}」は、すでに世界の定義にある`;
    return BLOCK_TEXT[res.block];
  }
  if (res.redirect) return `世界は、これを${lineNo(res.redirect)}の書き換えとして「${res.reading ?? '元の意味'}」と読み取った${star}`;
  if (text.trim() === '') return '世界から消した';
  if (res.stacked) return `${lineNo(res.stacked)}に重ねて「${res.reading}」と読み取った。同じものに二つの定義があり、世界が少し揺らぐ${star}`;
  if (res.replaced) return `元の定義は消え、世界は「${res.reading}」と読み取った${star}`;
  if (res.understood) return res.reading ? `世界は「${res.reading}」と読み取った${star}` : '世界は書き換えを受け入れた（意味は変わらない）';
  return `${noiseText(res.noise)}。${NOISE_EFFECT}${onLaw ? '（この行の意味は、書き換える前のまま）' : ''}`;
}

/** 書いた文章で世界を書き換える。結果は時間を進めるまでわからない */
export function writeWorld(target: EditTarget, text: string): boolean {
  const rt = getRuntime();
  const res = rt.write(target, text);
  if (res.block) {
    showToast(editMessage(res, text, false));
    return false;
  }
  const fresh = rt.fresh.some((id) => id.startsWith('r:') || id.startsWith('p:'));
  useGame.setState({ sheet: null });
  refreshView();
  const got = rt.fresh.filter((id) => id.startsWith('ach:'));
  const msg = editMessage(res, text, fresh, target.kind === 'law');
  showToast(got.length > 0 ? `${msg}　${achievementToast(got)}` : msg);
  return true;
}

// ---------------------------------------------------------------- 時間

/** 動きを減らす設定の端末では、時間の流れる演出を省く */
function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

let passTimer: ReturnType<typeof setTimeout> | null = null;

/** 時間の流れる演出の長さ（ミリ秒）。進めた年数が多いほど少し長い */
export function passDuration(years: number): number {
  return Math.min(1100, 380 + 150 * years);
}

/** years 年進める。instant なら演出なしで結果を開く（テスト・デバッグ用） */
export function advanceYears(years: number, instant = false): void {
  if (useGame.getState().passing) return;
  const rt = getRuntime();
  const report = rt.advance(years);
  if (!report) return;
  refreshView();
  const done = () => {
    passTimer = null;
    useGame.setState({ passing: null, sheet: { kind: 'report' }, fresh: [...rt.fresh] });
  };
  const span = report.to - report.from;
  if (instant || span <= 0 || reducedMotion()) {
    done();
    return;
  }
  // YEAR が数え上がるのを見せてから、結果を開く
  useGame.setState({ passing: { from: report.from, to: report.to }, sheet: null });
  if (passTimer) clearTimeout(passTimer);
  passTimer = setTimeout(done, passDuration(span));
}

export function showResult(): void {
  useGame.setState({ screen: 'result', sheet: null });
  refreshView();
}

/** 終わった世界の歴史を読み返す */
export function readHistory(): void {
  useGame.setState({ screen: 'game', tab: 'history', sheet: null });
  refreshView();
}

export function retryStage(): void {
  const rt = getRuntime();
  const g = rt.state;
  if (g) startStage(g.stageId, g.daily !== null && g.daily === rt.today());
}

// ---------------------------------------------------------------- 設定・セーブ

export function updateSettings(patch: Partial<Settings>): void {
  getRuntime().setSettings(patch);
  refreshView();
}

export function abandonGame(): void {
  getRuntime().abandon();
  refreshView();
  goStages();
}
