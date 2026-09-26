import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useGame } from '../store/game';
import { Passing } from './Passing';
import { applyTheme, watchTheme } from './theme';
import { Briefing } from './screens/Briefing';
import { Game } from './screens/Game';
import { Records } from './screens/Records';
import { Result } from './screens/Result';
import { Stages } from './screens/Stages';
import { Title } from './screens/Title';
import { EditSheet } from './sheets/EditSheet';
import { IndicatorSheet } from './sheets/IndicatorSheet';
import { MenuSheet } from './sheets/MenuSheet';
import { MetaSheet } from './sheets/MetaSheet';
import { LifeSheet, PillarSheet } from './sheets/PillarSheet';
import { ReportSheet } from './sheets/ReportSheet';

export function App() {
  const screen = useGame((s) => s.screen);
  const sheet = useGame((s) => s.sheet);
  const toast = useGame((s) => s.toast);
  const elsewhere = useGame((s) => s.elsewhere);
  const saveWarning = useGame((s) => s.saveWarning);
  // 情景を動かさない設定（電池を節約したい・動きが気になる人のため）
  const motion = useGame((s) => s.settings.motion);
  // 計算の演出の間（覆いの下の絵の動きを止めて、演出を滑らかに動かす）
  const passing = useGame((s) => s.passing !== null);
  // 文字の大きさ（小・中・大）
  const textSize = useGame((s) => s.settings.textSize);
  // 画面の明るさ（自動・明るい・暗い）
  const theme = useGame((s) => s.settings.theme);
  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => watchTheme(() => useGame.getState().settings.theme), []);
  // 閉じた知らせ（同じ知らせは、この画面ではもう出さない。別の知らせが来たら出す）
  const [hiddenWarning, setHiddenWarning] = useState<string | null>(null);
  // 保存が直って知らせが消えたら、閉じた記憶も消す（そのあとまた保存できなくなったら、もう一度知らせる）
  if (saveWarning === null && hiddenWarning !== null) setHiddenWarning(null);
  // 画面を移ったら、新しい画面を先頭から見せる（前の画面のスクロール位置を持ち越さない）
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);
  return (
    <div className={`app screen-${screen} text-${textSize}${motion ? '' : ' motion-off'}${passing ? ' is-passing' : ''}`}>
      {screen === 'title' && <Title />}
      {screen === 'stages' && <Stages />}
      {screen === 'briefing' && <Briefing />}
      {screen === 'game' && <Game />}
      {screen === 'result' && <Result />}
      {screen === 'records' && <Records />}

      {sheet?.kind === 'edit' && <EditSheet key={JSON.stringify(sheet.target)} target={sheet.target} />}
      {sheet?.kind === 'report' && <ReportSheet />}
      {sheet?.kind === 'indicator' && <IndicatorSheet id={sheet.id} />}
      {sheet?.kind === 'pillar' && <PillarSheet id={sheet.id} />}
      {sheet?.kind === 'life' && <LifeSheet />}
      {sheet?.kind === 'menu' && <MenuSheet />}
      {sheet?.kind === 'meta' && <MetaSheet which={sheet.which} />}

      <Passing />
      {elsewhere && (
        <div className="elsewhere" role="alertdialog" aria-modal="true" data-testid="elsewhere">
          <div className="elsewhere-box">
            <p>別の画面でこの世界が開かれた</p>
            <p className="dim small">世界は1つだけ。2つの画面で書き換えると世界が混ざってしまう。</p>
            <button className="btn btn-primary wide" onClick={() => window.location.reload()} data-testid="elsewhere-reload">
              この画面で読み込み直す
            </button>
          </div>
        </div>
      )}

      {saveWarning && saveWarning !== hiddenWarning && (
        <div className="save-warning" role="alert" data-testid="save-warning">
          <span>{saveWarning}</span>
          <button className="icon-btn" onClick={() => setHiddenWarning(saveWarning)} aria-label="知らせを閉じる">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {toast && (
        // 世界を見ているときは、情景と見出しを覆わないよう下に出す（シートの上では、これまでどおり上に）
        <div className={screen === 'game' && !sheet ? 'toast toast-low' : 'toast'} role="status" data-testid="toast">
          {toast}
        </div>
      )}
    </div>
  );
}
