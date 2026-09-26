import { Copy, Download, Share2, Smartphone, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { gameData } from '../../data';
import { abandonGame, closeSheet, getRuntime, goTitle, openRecords, refreshView, resetRecords, showToast, updateSettings, useGame } from '../../store/game';
import { buildJourney } from '../../store/journey';
import { syncBgm } from '../audio';
import { Sheet } from '../parts';
import { seChime } from '../se';
import { Tutorial } from '../Tutorial';

/** 書き出すファイルの名前（日付入り） */
function saveFileName(now: number): string {
  const d = new Date(now);
  const p = (n: number) => String(n).padStart(2, '0');
  return `laplace-garden-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.txt`;
}

/** 経った時間を短く（たった今・5分前・3時間前・12日前） */
export function agoText(at: number | null, now: number): string {
  if (at === null) return 'まだ';
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return 'たった今';
  if (s < 3600) return `${Math.floor(s / 60)}分前`;
  if (s < 86400) return `${Math.floor(s / 3600)}時間前`;
  return `${Math.floor(s / 86400)}日前`;
}

/** ホーム画面から開いているか（そのときは、ホーム画面に追加の案内を出さない） */
export function standalone(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

/** ホーム画面に追加の案内（最初のクリアのあとに1度だけ。閉じたら、もう出さない） */
export function HomePrompt({ onClose }: { onClose: () => void }) {
  const [how, setHow] = useState(false);
  return (
    <section className="home-prompt" data-testid="home-prompt">
      <b className="home-prompt-title">
        <Smartphone size={17} strokeWidth={1.5} aria-hidden="true" /> ホーム画面に追加すると記録が消えにくい
      </b>
      <p>iPhone の Safari は7日間開かなかったサイトの記録を消すことがある。ホーム画面から開けばそのぶんの日数は数えられない。</p>
      {how && (
        <p className="dim small" data-testid="home-how">
          iPhone：下の共有ボタンから「ホーム画面に追加」。Android：右上のメニューから「ホーム画面に追加」。
        </p>
      )}
      <div className="row2">
        <button className="btn" onClick={() => setHow(true)} disabled={how}>
          追加のしかた
        </button>
        <button className="btn" onClick={onClose} data-testid="home-close">
          閉じる
        </button>
      </div>
    </section>
  );
}

/** このゲームについて：版・作り手・音楽と絵の作り方・書体とアイコンのライセンス・出典・ソースコード */
function About() {
  return (
    <dl className="about" data-testid="about">
      <dt>版</dt>
      <dd>{__APP_VERSION__}</dd>
      <dt>作り手</dt>
      <dd>109mei</dd>
      <dt>音楽</dt>
      <dd>「The Unfolded Manuscript」。Google の Gemini の音楽生成で作った曲。</dd>
      <dt>絵</dt>
      <dd>共有の画像とホーム画面のアイコンは、ChatGPT の画像生成（gpt-image）で作った絵。タイトルの絵はその絵を手本にコード（SVG）で描き、世界の情景もコードで描いている。</dd>
      <dt>書体</dt>
      <dd>しっぽり明朝・Cormorant Garamond（SIL Open Font License 1.1）</dd>
      <dt>アイコン</dt>
      <dd>Lucide（ISC License）</dd>
      <dt>現実の数字</dt>
      <dd>法則の「現実では」の数字と出典は、ノートの「出典」で見られる</dd>
      <dt>ソースコード</dt>
      <dd>
        <a href="https://github.com/109mei/world-txt" target="_blank" rel="noopener noreferrer">
          github.com/109mei/world-txt
        </a>
      </dd>
    </dl>
  );
}

export function MenuSheet() {
  const settings = useGame((s) => s.settings);
  const progress = useGame((s) => s.progress);
  const [importing, setImporting] = useState(false);
  const [text, setText] = useState('');
  const [tour, setTour] = useState(false);
  // 取り返しのつかない操作は、2度押して確かめる
  const [sure, setSure] = useState<'import' | 'abandon' | 'reset' | null>(null);
  const [about, setAbout] = useState(false);
  const [home, setHome] = useState(() => getRuntime().homePrompt && !standalone());
  const ended = useGame((s) => s.view?.status !== 'playing');
  const file = useRef<HTMLInputElement>(null);
  const rt = getRuntime();
  const now = Date.now();
  // すべてを一度開いたら、「すべて開いた状態で始める」を選べる（初めての人には出さない）
  const everything = useMemo(() => buildJourney(gameData, progress).allOpen, [progress]);
  const SPEED = { auto: '自動', slow: 'ゆっくり', fast: 'はやい' } as const;
  const nextSpeed = { auto: 'slow', slow: 'fast', fast: 'auto' } as const;

  const toggleBgm = () => {
    const bgm = !settings.bgm;
    updateSettings({ bgm });
    syncBgm(bgm, settings.volume);
  };

  const exported = () => {
    rt.markExported();
    refreshView();
  };

  /** ファイルに保存（.txt）。ブラウザの保存の仕組みで、端末に残す */
  const saveFile = () => {
    try {
      const blob = new Blob([rt.exportSave()], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = saveFileName(now);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      exported();
      showToast('記録をファイルに保存した');
    } catch {
      showToast('ファイルに保存できなかった');
    }
  };

  /** 共有（ファイルを送れる端末だけ） */
  const shareFile = async () => {
    try {
      const f = new File([rt.exportSave()], saveFileName(now), { type: 'text/plain' });
      if (!navigator.canShare?.({ files: [f] })) {
        showToast('この端末ではファイルを共有できない（ファイルに保存かコピーを使う）');
        return;
      }
      await navigator.share({ files: [f] });
      exported();
    } catch (e) {
      if ((e as Error).name !== 'AbortError') showToast('共有できなかった');
    }
  };

  const copy = () => {
    void navigator.clipboard?.writeText(rt.exportSave()).then(
      () => {
        exported();
        showToast('記録をコピーした');
      },
      () => showToast('コピーできなかった'),
    );
  };

  const load = async (t: string) => {
    try {
      await rt.importSave(t);
      refreshView();
      showToast('読み込んだ');
      goTitle();
    } catch (e) {
      showToast((e as Error).message);
      setSure(null);
    }
  };

  return (
    <Sheet title="メニュー" onClose={closeSheet} testId="menu-sheet">
      <div className="menu-list">
        {home && (
          <HomePrompt
            onClose={() => {
              rt.dismissHome();
              setHome(false);
            }}
          />
        )}

        <div className="menu-section">記録（セーブ）</div>
        <div className="menu-row">
          <span>自動で保存している</span>
          <span className="menu-good small">最後の保存　{agoText(rt.savedAt, now)}</span>
        </div>
        <div className="menu-row" data-testid="exported-at">
          <span>
            最後に書き出した日
            <span className="dim small menu-sub">別の端末へ移すときや消えたときのために</span>
          </span>
          <b className="menu-ago">{agoText(progress.exportedAt, now)}</b>
        </div>
        <div className="menu-io">
          <button className="btn" onClick={saveFile} data-testid="export-file">
            <Download size={16} strokeWidth={1.5} /> ファイルに保存
          </button>
          <button className="btn" onClick={() => void shareFile()} data-testid="export-share">
            <Share2 size={16} strokeWidth={1.5} /> 共有
          </button>
          <button className="btn" onClick={copy} data-testid="export-copy">
            <Copy size={16} strokeWidth={1.5} /> コピー
          </button>
        </div>
        <button className="btn wide" onClick={() => setImporting((v) => !v)} data-testid="open-import">
          <Upload size={16} strokeWidth={1.5} /> 書き出したものを読み込む
        </button>
        {importing && (
          <div className="io-box">
            <input
              ref={file}
              type="file"
              accept=".txt,text/plain,application/json"
              className="visually-hidden"
              data-testid="import-file"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 4_000_000) {
                  showToast('セーブが大きすぎる');
                  return;
                }
                setText(await f.text());
                setSure(null);
              }}
            />
            <button className="btn" onClick={() => file.current?.click()}>
              ファイルを選ぶ
            </button>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setSure(null);
              }}
              rows={4}
              placeholder="書き出したテキストを貼り付ける（またはファイルを選ぶ）"
              data-testid="import-text"
            />
            {sure === 'import' && <p className="block">今の記録と遊んでいる世界は読み込んだセーブで上書きされる</p>}
            <button
              className={sure === 'import' ? 'btn danger' : 'btn'}
              disabled={text.trim() === ''}
              onClick={() => {
                if (sure !== 'import') {
                  setSure('import');
                  return;
                }
                void load(text);
              }}
              data-testid="import"
            >
              {sure === 'import' ? '上書きして読み込む' : '読み込む'}
            </button>
          </div>
        )}

        <div className="menu-section">画面</div>
        <div className="menu-row">
          <span>
            画面の明るさ
            <span className="dim small menu-sub">最初は端末の設定に合わせる</span>
          </span>
          <span className="seg" role="radiogroup" aria-label="画面の明るさ">
            {(
              [
                ['auto', '自動'],
                ['light', '明るい'],
                ['dark', '暗い'],
              ] as const
            ).map(([v, label]) => (
              <button key={v} role="radio" aria-checked={settings.theme === v} className={settings.theme === v ? 'seg-on' : ''} onClick={() => updateSettings({ theme: v })} data-testid={`theme-${v}`}>
                {label}
              </button>
            ))}
          </span>
        </div>
        <div className="menu-row">
          <span>
            文字の大きさ
            <span className="dim small menu-sub">字とボタンをまとめて大きくする</span>
          </span>
          <span className="seg" role="radiogroup" aria-label="文字の大きさ">
            {(
              [
                ['small', '小'],
                ['medium', '中'],
                ['large', '大'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                role="radio"
                aria-checked={settings.textSize === v}
                className={settings.textSize === v ? 'seg-on' : ''}
                onClick={() => updateSettings({ textSize: v })}
                data-testid={`text-${v}`}
              >
                {label}
              </button>
            ))}
          </span>
        </div>
        <button className="menu-item" onClick={() => updateSettings({ motion: !settings.motion })} data-testid="menu-motion">
          <span>
            動きを減らす
            <span className="dim small menu-sub">端末の「視差効果を減らす」にも合わせる</span>
          </span>
          <b>{settings.motion ? 'OFF' : 'ON'}</b>
        </button>
        <button className="menu-item" onClick={() => updateSettings({ speed: nextSpeed[settings.speed] })} data-testid="menu-speed">
          計算の演出 <b>{SPEED[settings.speed]}</b>
        </button>
        <button className="menu-item" onClick={() => updateSettings({ names: !settings.names })} data-testid="menu-names">
          情景の名前 <b>{settings.names ? 'ON' : 'OFF'}</b>
        </button>
        <button className="menu-item" onClick={() => updateSettings({ analysis: !settings.analysis })} data-testid="menu-analysis">
          詳細分析 <b>{settings.analysis ? 'ON' : 'OFF'}</b>
        </button>
        {everything && (
          <button className="menu-item" onClick={() => updateSettings({ allOpen: !settings.allOpen })} data-testid="menu-all-open">
            すべて開いた状態で始める <b>{settings.allOpen ? 'ON' : 'OFF'}</b>
          </button>
        )}

        <div className="menu-section">音</div>
        <button className="menu-item" onClick={toggleBgm} data-testid="menu-bgm">
          音楽 <b>{settings.bgm ? 'ON' : 'OFF'}</b>
        </button>
        <button className="menu-item" onClick={() => updateSettings({ se: !settings.se })} data-testid="menu-se">
          効果音 <b>{settings.se ? 'ON' : 'OFF'}</b>
        </button>
        <label className="menu-item slider">
          音楽の音量
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
            data-testid="menu-volume"
          />
        </label>
        <label className="menu-item slider">
          効果音の音量
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.seVolume}
            onChange={(e) => updateSettings({ seVolume: Number(e.target.value) })}
            // 動かし終えたら、その大きさで1度鳴らす
            onPointerUp={() => seChime()}
            onKeyUp={() => seChime()}
            data-testid="menu-se-volume"
          />
        </label>

        <div className="row2 menu-foot">
          <button className="btn" onClick={() => openRecords('game')} data-testid="menu-records">
            記録と実績
          </button>
          <button className="btn" onClick={() => setTour(true)} data-testid="menu-tutorial">
            遊び方をもう一度見る
          </button>
        </div>
        <button className="menu-item" onClick={() => setAbout((v) => !v)} aria-expanded={about} data-testid="menu-about">
          このゲームについて <b>{about ? '閉じる' : '開く'}</b>
        </button>
        {about && <About />}
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
            {sure === 'abandon' ? 'もう一度押すとこの世界を手放す' : 'この世界をあきらめる'}
          </button>
        )}
        {/* 取り返しのつかない操作は、いちばん下に置く */}
        {sure === 'reset' && (
          <p className="block" data-testid="reset-note">
            記録・実績・遊んでいる世界がすべて消える。元に戻せない（先に「ファイルに保存」しておけば、読み込んで戻せる）。
          </p>
        )}
        <button
          className={sure === 'reset' ? 'menu-item danger armed' : 'menu-item danger'}
          onClick={() => {
            if (sure !== 'reset') {
              setSure('reset');
              return;
            }
            void resetRecords();
          }}
          data-testid="menu-reset"
        >
          {sure === 'reset' ? 'もう一度押すとすべての記録を消す' : 'すべての記録を消してはじめから'}
        </button>
      </div>
      {tour && <Tutorial onClose={() => setTour(false)} />}
    </Sheet>
  );
}
