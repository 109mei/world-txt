import { create } from 'zustand';
import { signsOf, type EditBlock, type EditResult, type Need, type NoiseInfo } from '../core';
import type { IndicatorId, StageId } from '../data/schema';
import { DEFAULT_SETTINGS, EMPTY_PROGRESS, type Progress, type Settings } from '../save';
import type { EditTarget, GameRuntime } from './runtime';
import { buildView, type GameView, type SceneView } from './view';

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
  | { kind: 'pillar'; id: string }
  | { kind: 'life' }
  | { kind: 'menu' }
  | { kind: 'meta'; which: 'capacity' | 'coherence' | 'civ' };

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
  /** 保存についての知らせ（保存できなかった・保存できない画面） */
  saveWarning: string | null;
  /** いま書いたばかりの行（定義の一覧で、インクがにじむように光らせる） */
  justWrote: string | null;
  /** 時間を進める前の世界の情景（結果の画面で、去年の絵から今年の絵へ塗り替えて見せる） */
  sceneFrom: SceneView | null;
  /** 直前に終わった世界で筆の位が上がったなら、その新しい位（結果の画面で知らせる） */
  rankUp: number | null;
  /** 起きかけていることのカードを押して、情景の中で光らせている場所（情景の名前の id） */
  sceneFocus: string | null;
}

export const useGame = create<UiState>(() => ({
  screen: 'title',
  tab: 'world',
  sheet: null,
  briefing: null,
  view: null,
  settings: { ...DEFAULT_SETTINGS },
  progress: structuredClone(EMPTY_PROGRESS),
  hasGame: false,
  lawFilter: { concept: null, query: '' },
  toast: null,
  fresh: [],
  recordsFrom: 'title',
  passing: null,
  loadError: null,
  elsewhere: false,
  saveWarning: null,
  justWrote: null,
  sceneFrom: null,
  rankUp: null,
  sceneFocus: null,
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
    progress: {
      ...p,
      cleared: [...p.cleared],
      best: { ...p.best },
      discovered: [...p.discovered],
      achievements: [...p.achievements],
    },
    hasGame: !!g && g.status === 'playing',
    loadError: runtime.loadError,
    saveWarning: runtime.saveWarning,
    rankUp: runtime.rankUp,
  });
}

let focusTimer: ReturnType<typeof setTimeout> | null = null;
/** 起きかけていることのカードを押したら、情景の同じ場所を光らせる（3回、約4.5秒） */
export function focusScene(icon: string): void {
  const label = getRuntime().data.scene.labels.find((l) => (l.icons as string[]).includes(icon));
  if (!label) return;
  useGame.setState({ sceneFocus: null });
  if (focusTimer) clearTimeout(focusTimer);
  // 同じ場所を続けて押しても光り直すよう、いったん外してから付ける
  setTimeout(() => useGame.setState({ sceneFocus: label.id }), 0);
  focusTimer = setTimeout(() => useGame.setState({ sceneFocus: null }), 4500);
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

/**
 * 開く条件を言葉にする（「あと1つの世界を救うと開く」「『食料危機』を遊び終えると開く」「買いだめが起きたあとに開く」）。
 * 条件がなければ null
 */
export function needsText(needs: Need[]): string | null {
  if (needs.length === 0) return null;
  const data = getRuntime().data;
  const clears = needs.find((n) => n.kind === 'clears');
  const played = needs.find((n) => n.kind === 'played');
  const found = needs.find((n) => n.kind === 'found');
  const title = played?.kind === 'played' ? (data.stageById.get(played.stage)?.title ?? '') : '';
  const parts: string[] = [];
  if (clears?.kind === 'clears') parts.push(`あと${clears.left}つの世界を救`);
  if (played) parts.push(`「${title}」を遊び終え`);
  if (found?.kind === 'found') {
    const event = data.unlocks.discoveries.find((d) => d.found === found.id)?.event ?? '世界で何かが起き';
    const head = parts.map((p) => (p.endsWith('救') ? `${p}い` : p)).join('、');
    return `${head ? `${head}、` : ''}${event}あとに開く`;
  }
  const last = parts.length - 1;
  return `${parts.map((p, i) => (p.endsWith('救') ? `${p}${i === last ? 'う' : 'い'}` : `${p}${i === last ? 'る' : ''}`)).join('、')}と開く`;
}

/** 開く条件の短い言葉（世界の一覧の右端に出す：「あと1回クリア」「食料危機のあと」） */
export function needsShort(needs: Need[]): string | null {
  const n = needs[0];
  if (!n) return null;
  if (n.kind === 'clears') return `あと${n.left}回クリア`;
  if (n.kind === 'played') return `${getRuntime().data.stageById.get(n.stage)?.title ?? ''}のあと`;
  return `${getRuntime().data.unlocks.discoveries.find((d) => d.found === n.id)?.name ?? '発見'}で開く`;
}

/** そのステージが開くまでに足りないもの（開いていれば空） */
export function stageNeedsOf(stageId: StageId): Need[] {
  return getRuntime().stageNeeds(stageId);
}

export function openBriefing(stageId: StageId): void {
  const lock = needsText(stageNeedsOf(stageId));
  if (lock) {
    showToast(`まだこの世界は開いていない。${lock}`);
    return;
  }
  useGame.setState({ screen: 'briefing', briefing: stageId });
}

/** 観測記録を開く（閉じると from へ戻る） */
export function openRecords(from: Screen): void {
  useGame.setState({
    screen: 'records',
    recordsFrom: from === 'records' ? 'title' : from,
    sheet: null,
  });
  refreshView();
}

export function closeRecords(): void {
  useGame.setState({ screen: useGame.getState().recordsFrom });
}

export function startStage(stageId: StageId, daily = false, seed: number | null = null, numbered = false, trial = false): void {
  const rt = getRuntime();
  rt.start(stageId, daily, seed, { numbered, trial });
  useGame.setState({
    screen: 'game',
    tab: 'world',
    sheet: null,
    lawFilter: { concept: null, query: '' },
    sceneFrom: null,
  });
  refreshView();
  // 放棄や、はじめての世界で得た実績を知らせる
  const got = rt.fresh.filter((id) => id.startsWith('ach:'));
  if (got.length > 0) showToast(achievementToast(got));
}

/** 遊んでいる世界（終わっていない世界）の、ステージの名前と年 */
export function playingWorld(): {
  stageId: StageId;
  title: string;
  year: number;
} | null {
  const g = getRuntime().playing;
  if (!g) return null;
  return {
    stageId: g.stageId,
    title: getRuntime().data.stageById.get(g.stageId)?.title ?? '',
    year: g.year,
  };
}

/** 別の画面で同じ世界が開かれた：この画面は保存をやめ、読み込み直しを促す */
export function markElsewhere(): void {
  getRuntime().freeze();
  useGame.setState({ elsewhere: true, sheet: null });
}

/** 実績を得たときの知らせ：名前と、何がうまかったかの1行（いくつも得たときは名前だけ並べる） */
export function achievementToast(ids: string[]): string {
  const got = ids.map((id) => getRuntime().data.achievements.find((a) => `ach:${a.id}` === id)).filter((a) => a !== undefined);
  if (got.length === 1) return `実績「${got[0]!.name}」　${got[0]!.text}`;
  return `実績「${got.map((a) => a.name).join('」「')}」を得た`;
}

export function continueGame(): void {
  const g = getRuntime().state;
  if (!g) return;
  useGame.setState({
    screen: g.status === 'playing' ? 'game' : 'result',
    tab: 'world',
    sheet: null,
  });
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
  'no-edits': '書き換えの残りがない',
  capacity: '使える文字数が足りない',
  unknown: 'その行は見つからない',
  empty: '何も書かれていない',
  redundant: 'すでに同じ意味の行がある',
  sealed: 'その行はまだロックされている',
  margin: '書き足せる余白が残っていない',
  heavy: 'その言葉はいまの筆には重すぎて書けない',
  noise: '世界に届かない言葉',
  trimmed: 'この行はすでに1度短く言い換えている（同じ意味のまま短くできるのは1度まで）',
};

/** その筆の位になるまでの道のり（「あと2つの世界を救い『書記の筆』になると」） */
export function rankHint(rank: number): string {
  const rt = getRuntime();
  const r = rt.data.access.ranks[rank];
  if (!r) return '';
  const left = Math.max(0, r.clears - rt.progress.cleared.length);
  return left > 0 ? `あと${left}つの世界を救い「${r.name}」になると` : `「${r.name}」になると`;
}

/** ロックされた行の下に添える、開く条件（短く。筆の位の名前は、押したときの知らせで出す） */
export function sealNote(rank: number): string {
  const rt = getRuntime();
  const r = rt.data.access.ranks[rank];
  if (!r) return '';
  const left = Math.max(0, r.clears - rt.progress.cleared.length);
  return left > 0 ? `あと${left}つの世界を救うと書き換えられる` : `「${r.name}」で書き換えられる`;
}

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
      return '記号だけの文章は世界に意味が伝わらない';
    case 'short':
      return '短すぎて世界に意味が伝わらない';
    case 'question':
      return '問いかけは世界の法則にならない（言い切る形で書く）';
    case 'foreign':
      return 'この言葉は世界に意味が伝わらない（日本語かやさしい英語で書く）';
    case 'unknown-words':
      return `「${noise.words.join('」「')}」は世界に意味が伝わらない言葉`;
    default:
      return 'この文章は世界に意味が伝わらない';
  }
}

/** 意味が伝わらない文章は、世界を何も変えない（その行の意味は、書き換える前のまま） */
export const NOISE_EFFECT = '意味のない文なので世界は何も変わらない';

/** 書き換えの結果を、世界の声として短く伝える（onLaw：既存の行を書き換えた） */
export function editMessage(res: EditResult, text: string, fresh: boolean, onLaw = false): string {
  const star = fresh ? '　新発見' : '';
  if (res.block) {
    if (res.block === 'capacity') return `使える文字数が ${res.shortage} 足りない。先に何かを消す`;
    if (res.block === 'sealed' && res.sealed) return sealedText(res.sealed.law, res.sealed.rank);
    if (res.block === 'heavy' && res.heavy) return `「${res.heavy.name}」はいまの筆には重すぎて書けない。${rankHint(res.heavy.rank)}書ける`;
    if (res.block === 'margin') return marginText();
    if (res.block === 'noise') return `${noiseText(res.noise)}。書き換えの残りは減っていない`;
    if (res.block === 'redundant' && res.sameAs) return `${lineNo(res.sameAs.id)}にすでに同じ意味の行がある`;
    if (res.block === 'redundant' && res.reading) return `「${res.reading}」はすでに世界の法則にある`;
    return BLOCK_TEXT[res.block];
  }
  if (res.redirect) return `世界はこれを${lineNo(res.redirect)}の書き換えとして「${res.reading ?? '元の意味'}」と読み取った${star}`;
  if (text.trim() === '') return '世界から消した';
  if (res.stacked) return `${lineNo(res.stacked)}に重ねて「${res.reading}」と読み取った。同じものに二つの法則があって世界が少し揺らぐ${star}`;
  if (res.replaced) return `元の意味は消え、世界は「${res.reading}」と読み取った${star}`;
  if (res.understood) return res.reading ? `世界は「${res.reading}」と読み取った${star}` : '世界は書き換えを受け入れた（意味は変わらない）';
  return `${noiseText(res.noise)}。${NOISE_EFFECT}${onLaw ? '（この行の意味は書き換える前のまま）' : ''}`;
}

/** 封じられた行の知らせ（書き換えようとしたとき・行をタップしたとき） */
export function sealedText(lawId: string, rank: number): string {
  return `${lineNo(lawId)}はまだロックされていて書き換えられない。${rankHint(rank)}開く`;
}

/** 書き足せる余白がないときの知らせ */
export function marginText(): string {
  const rt = getRuntime();
  const margin = rt.state?.access?.margin ?? 0;
  const next = rt.data.access.ranks.findIndex((r) => r.margin === null || r.margin > margin);
  return `いまの筆で書き足せるのは${margin}行まで。書き足した行を消せば書ける${next >= 0 ? `（${rankHint(next)}もっと書き足せる）` : ''}`;
}

let justTimer: ReturnType<typeof setTimeout> | null = null;

/** 書いた文章で世界を書き換える。結果は時間を進めるまでわからない */
export function writeWorld(target: EditTarget, text: string): boolean {
  const rt = getRuntime();
  const res = rt.write(target, text);
  if (res.block) {
    showToast(editMessage(res, text, false));
    return false;
  }
  const fresh = rt.fresh.some((id) => id.startsWith('r:') || id.startsWith('p:'));
  // 書いた行：法則の行はその行、書き足した行は最後の行（ほかの行の書き換えとして読んだときは、その行）
  const g = rt.state;
  const wrote = res.redirect ?? (target.kind === 'new' ? (g?.extras[g.extras.length - 1]?.id ?? null) : target.id);
  useGame.setState({ sheet: null, justWrote: wrote });
  if (justTimer) clearTimeout(justTimer);
  justTimer = setTimeout(() => useGame.setState({ justWrote: null }), 2600);
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
/** 時間の流れる演出が終わったら結果を開く（演出を飛ばしたときも同じ） */
let passDone: (() => void) | null = null;

/** 計算の演出の長さ（ミリ秒）：初めの数回（ゆっくり）と、慣れたあと（はやい） */
export const PASS_SLOW = 1200;
export const PASS_FAST = 600;
/** 「自動」で、ゆっくり見せる世界の数（はじめの世界と序章） */
const PASS_LEARNING_WORLDS = 2;

/** 時間の流れる演出の長さ（ミリ秒）。設定の「計算の演出」に従い、自動なら初めの数回は約1.2秒、慣れたら約0.6秒 */
export function passDuration(years: number): number {
  const { settings, progress } = useGame.getState();
  const slow = settings.speed === 'slow' || (settings.speed === 'auto' && progress.worlds <= PASS_LEARNING_WORLDS);
  const base = slow ? PASS_SLOW : PASS_FAST;
  // 進めた年数が多いときだけ、少し長くする（上限は約1.2秒）
  return Math.min(PASS_SLOW, base + 120 * Math.max(0, years - 1));
}

/** 静かな年（何も起きなかった年）の、計算の演出の長さ（ミリ秒） */
export const QUIET_PASS = 400;
/** 計算の演出の覆いが濃くなりきるまで（ミリ秒。styles.css の .passing の fade 0.15s）。それまでは去年の世界を見せておく */
const PASS_COVER_MS = 160;
let coverTimer: ReturnType<typeof setTimeout> | null = null;

/** 時間の流れる演出を飛ばして、すぐに結果を開く（演出の画面をタップしたとき） */
export function skipPassing(): void {
  if (!passDone) return;
  if (passTimer) clearTimeout(passTimer);
  passDone();
}

/** years 年進める。instant なら演出なしで結果を開く（テスト・デバッグ用） */
export function advanceYears(years: number, instant = false): void {
  if (useGame.getState().passing) return;
  const rt = getRuntime();
  const before = useGame.getState().view?.scene ?? null;
  const signsBefore = rt.state ? new Set(signsOf(rt.state, rt.data).map((x) => x.id)) : new Set<string>();
  const report = rt.advance(years);
  if (!report) return;
  // 画面の写しを今年にする。計算の演出では覆いが濃くなりきってから（去年の絵が、計算より先に今年の絵へ替わるのを見せない）
  let shown = false;
  const show = () => {
    if (shown) return;
    shown = true;
    if (coverTimer) clearTimeout(coverTimer);
    coverTimer = null;
    useGame.setState({ sceneFrom: before });
    refreshView();
  };
  // 静かな年（大きな変化も新しい兆しもない1年）は、計算を短くし、結果の画面を出さずに世界へ戻る
  const newSign = rt.state ? signsOf(rt.state, rt.data).some((x) => !signsBefore.has(x.id)) : false;
  const quiet = years === 1 && report.quiet === true && !newSign;
  const done = () => {
    show();
    passTimer = null;
    passDone = null;
    useGame.setState({
      passing: null,
      sheet: quiet ? null : { kind: 'report' },
      fresh: [...rt.fresh],
    });
  };
  const span = report.to - report.from;
  if (instant || span <= 0 || reducedMotion()) {
    done();
    return;
  }
  // YEAR が数え上がるのを見せてから、結果を開く
  useGame.setState({
    passing: { from: report.from, to: report.to },
    sheet: null,
  });
  coverTimer = setTimeout(show, PASS_COVER_MS);
  if (passTimer) clearTimeout(passTimer);
  passDone = done;
  passTimer = setTimeout(done, quiet ? QUIET_PASS : passDuration(span));
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

/** 分かれ道からやり直す（終わった世界の振り返りから。分かれ道の年まで棋譜で作り直し、そこから遊ぶ） */
export function branchWorld(): void {
  const rt = getRuntime();
  const g = rt.branchFrom();
  if (!g) {
    showToast('今の規則ではこの世界を作り直せない（記録は消えていない）');
    return;
  }
  useGame.setState({
    screen: 'game',
    tab: 'world',
    sheet: null,
    sceneFrom: null,
    lawFilter: { concept: null, query: '' },
  });
  refreshView();
  showToast(`YEAR ${g.year}（分かれ道）からやり直す。この世界には「少ない手で」「早く見抜いた」の印は付かない`);
}

/** 同じ世界でもう一度（同じ世界番号。乱数を使わないので、同じ書き方なら同じ世界になる） */
export function retryStage(): void {
  const rt = getRuntime();
  const g = rt.state;
  if (g) startStage(g.stageId, g.daily !== null && g.daily === rt.today(), g.seed);
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
