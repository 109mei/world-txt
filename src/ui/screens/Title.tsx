import { BookOpen, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { gameData } from '../../data';
import { metaRecord } from '../../store/achievements';
import { continueGame, goStages, openRecords, updateSettings, useGame } from '../../store/game';
import { syncBgm } from '../audio';
import { Icon } from '../icons';
import { TERMS } from '../terms';
import { TitleArt } from '../TitleArt';
import { Tutorial } from '../Tutorial';

/** 飛び出す絵本の立ち上がりを見せたか（遊んでいる間に1回だけ。タイトルへ戻るたびには繰り返さない） */
let titlePopped = false;

export function Title() {
  const hasGame = useGame((s) => s.hasGame);
  const loadError = useGame((s) => s.loadError);
  const settings = useGame((s) => s.settings);
  const worlds = useGame((s) => s.progress.worlds);
  const found = useGame((s) => s.progress.discovered.filter((id) => !metaRecord(id)).length);
  const trophies = useGame((s) => s.progress.achievements.filter((id) => !gameData.achievements.find((a) => a.id === id)?.bonus).length);
  // あそびかた（5枚で、ゲームの流れを短く見せる）
  const [tour, setTour] = useState(false);
  // 開いたときだけ、絵の切り絵が奥から順に立ち上がり、そのあとに文字とボタンが現れる
  const [pop] = useState(() => !titlePopped);
  useEffect(() => {
    titlePopped = true;
  }, []);

  const start = (fn: () => void) => () => {
    syncBgm(settings.bgm, settings.volume);
    fn();
  };

  return (
    <>
      {/* タイトルは夜の絵：明るい画面でも、夜の色（theme-night）で描く */}
      <div className={pop ? 'title-screen theme-night title-opening' : 'title-screen theme-night'} data-testid="title">
        <TitleArt pop={pop} />
        <div className="title-overlay">
          <h1 className="title-name" data-testid="title-name">
            {TERMS.title}
          </h1>
          <p className="logo" aria-label={TERMS.logo}>
            <span className="logo-world">WORLD</span>
            <span className="logo-ext">.txt</span>
            <span className="caret" aria-hidden="true" />
          </p>
          {/* 一文ずつ行を分ける（句読点は使わない） */}
          <p className="tagline">
            {TERMS.tagline.map((line) => (
              <span key={line} className="tagline-line">
                {line}
              </span>
            ))}
          </p>
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
          <button className={worlds > 0 ? 'records-link' : 'btn tut-open'} onClick={() => setTour(true)} data-testid="open-tutorial">
            <BookOpen size={15} strokeWidth={1.5} /> あそびかた
          </button>
          {found > 0 && (
            <button className="records-link" onClick={start(() => openRecords('title'))} data-testid="title-records">
              <Icon name="record" size={14} /> ノート <b>{found}</b>
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
            aria-label={settings.bgm ? '音楽を止める' : '音楽を流す'}
            data-testid="bgm-toggle"
          >
            {settings.bgm ? <Volume2 size={16} strokeWidth={1.5} /> : <VolumeX size={16} strokeWidth={1.5} />}
            <span>音楽 {settings.bgm ? 'ON' : 'OFF'}</span>
          </button>
        </div>
        <p className="title-foot">{TERMS.subtitle}</p>
      </div>
      {tour && (
        <Tutorial
          onClose={() => setTour(false)}
          onDone={() => {
            setTour(false);
            start(goStages)();
          }}
        />
      )}
    </>
  );
}
