import { createRoot } from 'react-dom/client';
import { gameData } from './data';
import type { StageId } from './data/schema';
import { LocalStorageSaveStore, MemorySaveStore, SAVE_KEY, type SaveStore } from './save';
import { advanceYears, getRuntime, goStages, markElsewhere, refreshView, setRuntime, startStage, useGame, writeWorld } from './store/game';
import { GameRuntime } from './store/runtime';
import { App } from './ui/App';
import { onVisibility } from './ui/audio';
import { syncSe } from './ui/se';
import { guardLongPress } from './ui/touch';
import './ui/styles.css';

const params = new URLSearchParams(window.location.search);
const seedParam = params.get('seed');
const debug = params.get('debug') === '1';

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]! >>> 0;
}

/** ?seed=数字 で乱数の種を固定する（テスト・再現用） */
const fixedSeed = seedParam !== null && Number.isFinite(Number(seedParam)) ? Math.floor(Number(seedParam)) : null;

function saveStore(): SaveStore {
  try {
    const probe = '__wtxt_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return new LocalStorageSaveStore(window.localStorage);
  } catch {
    return new MemorySaveStore();
  }
}

async function start(): Promise<void> {
  const runtime = new GameRuntime({
    data: gameData,
    store: saveStore(),
    now: () => Date.now(),
    newSeed: () => fixedSeed ?? randomSeed(),
  });
  await runtime.boot();
  setRuntime(runtime);
  refreshView();
  // 効果音は設定に合わせて鳴らす・止める
  syncSe(runtime.settings.se, runtime.settings.volume);
  useGame.subscribe((s) => syncSe(s.settings.se, s.settings.volume));

  document.addEventListener('visibilitychange', () => onVisibility(document.visibilityState === 'hidden'));
  // 長押し・右クリックのメニューと、文字の選択を出さない（入力欄は除く）
  guardLongPress(document);
  // 世界は1つだけ：別の画面（タブ）で同じセーブが書き換えられたら、この画面は保存をやめる
  window.addEventListener('storage', (e) => {
    if (e.key === SAVE_KEY) markElsewhere();
  });

  createRoot(document.getElementById('root')!).render(<App />);

  if (debug) {
    // テストとスクリーンショット用の窓口（?debug=1 のときだけ）
    Object.assign(window, {
      __wtxt: {
        state: () => JSON.parse(JSON.stringify(getRuntime().state)),
        start: (stage: StageId, daily = false) => startStage(stage, daily),
        // 鍵のかかった世界を開く（世界を1つ救ったことにする）
        unlock: () => {
          const rt = getRuntime();
          if (!rt.progress.cleared.includes('food')) rt.progress.cleared.push('food');
          refreshView();
        },
        advance: (years: number) => advanceYears(years, true),
        rewrite: (lawId: string, text: string) => writeWorld({ kind: 'law', id: lawId }, text),
        add: (text: string) => writeWorld({ kind: 'new' }, text),
        goStages: () => goStages(),
        ui: () => {
          const s = useGame.getState();
          return { screen: s.screen, tab: s.tab, sheet: s.sheet };
        },
      },
    });
  }
}

void start();
