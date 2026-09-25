import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useGame } from '../store/game';
import { Passing } from './Passing';
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
import { ReportSheet } from './sheets/ReportSheet';

export function App() {
  const screen = useGame((s) => s.screen);
  const sheet = useGame((s) => s.sheet);
  const toast = useGame((s) => s.toast);
  const elsewhere = useGame((s) => s.elsewhere);
  const saveWarning = useGame((s) => s.saveWarning);
  // 閉じた知らせ（同じ知らせは、この画面ではもう出さない。別の知らせが来たら出す）
  const [hiddenWarning, setHiddenWarning] = useState<string | null>(null);
  // 画面を移ったら、新しい画面を先頭から見せる（前の画面のスクロール位置を持ち越さない）
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);
  return (
    <div className={`app screen-${screen}`}>
      {screen === 'title' && <Title />}
      {screen === 'stages' && <Stages />}
      {screen === 'briefing' && <Briefing />}
      {screen === 'game' && <Game />}
      {screen === 'result' && <Result />}
      {screen === 'records' && <Records />}

      {sheet?.kind === 'edit' && <EditSheet key={JSON.stringify(sheet.target)} target={sheet.target} />}
      {sheet?.kind === 'report' && <ReportSheet />}
      {sheet?.kind === 'indicator' && <IndicatorSheet id={sheet.id} />}
      {sheet?.kind === 'menu' && <MenuSheet />}
      {sheet?.kind === 'meta' && <MetaSheet which={sheet.which} />}

      <Passing />
      {elsewhere && (
        <div className="elsewhere" role="alertdialog" aria-modal="true" data-testid="elsewhere">
          <div className="elsewhere-box">
            <p>別の画面で、この世界が開かれた。</p>
            <p className="dim small">世界は1つだけ。2つの画面で書き換えると、世界が混ざってしまう。</p>
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
            <X size={18} strokeWidth={1.6} />
          </button>
        </div>
      )}

      {toast && (
        <div className="toast" role="status" data-testid="toast">
          {toast}
        </div>
      )}
    </div>
  );
}
