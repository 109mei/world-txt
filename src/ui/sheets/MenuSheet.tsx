import { useState } from 'react';
import { abandonGame, closeSheet, getRuntime, goTitle, openRecords, refreshView, showToast, updateSettings, useGame } from '../../store/game';
import { syncBgm } from '../audio';
import { Sheet } from '../parts';

export function MenuSheet() {
  const settings = useGame((s) => s.settings);
  const [exported, setExported] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [text, setText] = useState('');
  // 取り返しのつかない操作は、2度押して確かめる
  const [sure, setSure] = useState<'import' | 'abandon' | null>(null);
  const ended = useGame((s) => s.view?.status !== 'playing');

  const toggleBgm = () => {
    const bgm = !settings.bgm;
    updateSettings({ bgm });
    syncBgm(bgm, settings.volume);
  };

  return (
    <Sheet title="メニュー" onClose={closeSheet} testId="menu-sheet">
      <div className="menu-list">
        <button className="menu-item" onClick={toggleBgm} data-testid="menu-bgm">
          BGM <b>{settings.bgm ? 'ON' : 'OFF'}</b>
        </button>
        <label className="menu-item slider">
          音量
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(e) => {
              const volume = Number(e.target.value);
              updateSettings({ volume });
              syncBgm(settings.bgm, volume);
            }}
          />
        </label>
        <button className="menu-item" onClick={() => updateSettings({ se: !settings.se })} data-testid="menu-se">
          効果音 <b>{settings.se ? 'ON' : 'OFF'}</b>
        </button>
        <button className="menu-item" onClick={() => updateSettings({ analysis: !settings.analysis })} data-testid="menu-analysis">
          詳細分析モード <b>{settings.analysis ? 'ON' : 'OFF'}</b>
        </button>
        <button
          className="menu-item"
          onClick={() => {
            setExported(getRuntime().exportSave());
            setImporting(false);
          }}
        >
          セーブを書き出す
        </button>
        <button
          className="menu-item"
          onClick={() => {
            setImporting(true);
            setExported(null);
          }}
        >
          セーブを読み込む
        </button>
        {exported && (
          <div className="io-box">
            <textarea readOnly value={exported} rows={4} onFocus={(e) => e.currentTarget.select()} />
            <button
              className="btn"
              onClick={() => {
                void navigator.clipboard?.writeText(exported).then(
                  () => showToast('コピーした'),
                  () => showToast('コピーできなかった'),
                );
              }}
            >
              コピー
            </button>
          </div>
        )}
        {importing && (
          <div className="io-box">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setSure(null);
              }}
              rows={4}
              placeholder="書き出したテキストを貼り付ける"
              data-testid="import-text"
            />
            {sure === 'import' && <p className="block">今の記録と遊んでいる世界は、読み込んだセーブで上書きされる。</p>}
            <button
              className={sure === 'import' ? 'btn danger' : 'btn'}
              disabled={text.trim() === ''}
              onClick={async () => {
                if (sure !== 'import') {
                  setSure('import');
                  return;
                }
                try {
                  await getRuntime().importSave(text);
                  refreshView();
                  showToast('読み込んだ');
                  goTitle();
                } catch (e) {
                  showToast((e as Error).message);
                  setSure(null);
                }
              }}
              data-testid="import"
            >
              {sure === 'import' ? '上書きして読み込む' : '読み込む'}
            </button>
          </div>
        )}
        <button className="menu-item" onClick={() => openRecords('game')} data-testid="menu-records">
          観測記録
        </button>
        <button className="menu-item" onClick={goTitle}>
          タイトルへ
        </button>
        {!ended && (
          <button
            className={sure === 'abandon' ? 'menu-item danger armed' : 'menu-item danger'}
            onClick={() => {
              if (sure !== 'abandon') {
                setSure('abandon');
                return;
              }
              abandonGame();
            }}
            data-testid="menu-abandon"
          >
            {sure === 'abandon' ? 'もう一度押すと、この世界を手放す' : 'この世界をあきらめる'}
          </button>
        )}
      </div>
    </Sheet>
  );
}
