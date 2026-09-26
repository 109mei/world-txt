import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../store/game';
import { FX_HOST_ID } from './host';
import { disposeFx, fxInk, preloadFx } from './index';

/** 世界の画面を開いてから、描き場を用意しはじめるまで（ミリ秒。開いた直後の描画と重ねない） */
const WARM_MS = 700;

/** 要素が画面の中に見えているか */
function onScreen(r: DOMRect): boolean {
  return r.bottom > 0 && r.top < window.innerHeight && r.width > 0 && r.height > 0;
}

/**
 * PixiJS の演出の描き場（画面全体に重ねる透明な層。押せない・読み上げない）。
 * 世界の画面を開いたら PixiJS を読み込んでおき、演出を出さない画面へ移ったとき・画面が隠れたとき・動きを止めたときは片づける。
 * 書いた瞬間のインクもここで出す（書いた行が描き直されてから、その行の場所に）
 */
export function FxLayer() {
  const screen = useGame((s) => s.screen);
  const motion = useGame((s) => s.settings.motion);
  const justWrote = useGame((s) => s.justWrote);

  useEffect(() => {
    if (!motion) {
      disposeFx();
      return;
    }
    if (screen === 'game') {
      const t = setTimeout(preloadFx, WARM_MS);
      return () => clearTimeout(t);
    }
    if (screen !== 'result') disposeFx();
    return undefined;
  }, [screen, motion]);

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) disposeFx();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);

  useEffect(() => {
    if (!justWrote) return;
    const id = requestAnimationFrame(() => {
      const text = useGame.getState().view?.laws.find((l) => l.id === justWrote)?.text ?? '';
      if (text === '') return;
      // 書いた行が見えていればその行に、見えていなければ情景の下の一文（書いた一文）に
      for (const sel of [`[data-testid="law-${CSS.escape(justWrote)}"]`, '[data-testid="scene-ink"]']) {
        const el = document.querySelector<HTMLElement>(sel);
        const r = el?.getBoundingClientRect();
        if (r && onScreen(r)) {
          fxInk(text, r);
          return;
        }
      }
    });
    return () => cancelAnimationFrame(id);
  }, [justWrote]);

  return createPortal(<div id={FX_HOST_ID} className="fx-layer" data-testid="fx-layer" aria-hidden="true" />, document.body);
}
