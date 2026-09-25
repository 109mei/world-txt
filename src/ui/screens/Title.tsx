import { Volume2, VolumeX } from 'lucide-react';
import { continueGame, goStages, openRecords, updateSettings, useGame } from '../../store/game';
import { syncBgm } from '../audio';
import { Icon } from '../icons';
import { TitleArt } from '../TitleArt';

export function Title() {
  const hasGame = useGame((s) => s.hasGame);
  const loadError = useGame((s) => s.loadError);
  const settings = useGame((s) => s.settings);
  const worlds = useGame((s) => s.progress.worlds);
  const found = useGame((s) => s.progress.discovered.length);
  const trophies = useGame((s) => s.progress.achievements.length);

  const start = (fn: () => void) => () => {
    syncBgm(settings.bgm, settings.volume);
    fn();
  };

  return (
    <div className="title-screen" data-testid="title">
      <TitleArt />
      <div className="title-overlay">
        <h1 className="logo" aria-label="WORLD.txt">
          <span className="logo-world">WORLD</span>
          <span className="logo-ext">.txt</span>
          <span className="caret" aria-hidden="true" />
        </h1>
        <p className="tagline">世界を書き換えて、人類を救え。</p>
      </div>
      <div className="title-actions">
        {loadError && (
          <p className="load-error" role="alert" data-testid="load-error">
            {loadError}
          </p>
        )}
        {hasGame && (
          <button className="btn btn-primary" onClick={start(continueGame)} data-testid="continue">
            つづきから
          </button>
        )}
        <button className={hasGame ? 'btn' : 'btn btn-primary'} onClick={start(goStages)} data-testid="start">
          {worlds > 0 ? '世界を選ぶ' : 'はじめる'}
        </button>
        {found > 0 && (
          <button className="records-link" onClick={start(() => openRecords('title'))} data-testid="title-records">
            <Icon name="record" size={14} /> 観測記録 <b>{found}</b>
            {trophies > 0 && (
              <>
                <span className="dim">・</span>
                <Icon name="trophy" size={14} /> 実績 <b>{trophies}</b>
              </>
            )}
          </button>
        )}
        <button
          className="bgm-toggle"
          onClick={() => {
            const bgm = !settings.bgm;
            updateSettings({ bgm });
            syncBgm(bgm, settings.volume);
          }}
          aria-label={settings.bgm ? 'BGMを止める' : 'BGMを流す'}
          data-testid="bgm-toggle"
        >
          {settings.bgm ? <Volume2 size={16} strokeWidth={1.6} /> : <VolumeX size={16} strokeWidth={1.6} />}
          <span>BGM {settings.bgm ? 'ON' : 'OFF'}</span>
        </button>
      </div>
      <p className="title-foot">世界は、文章でできている。</p>
    </div>
  );
}
