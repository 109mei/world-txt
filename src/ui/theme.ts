import type { Settings } from '../save';

/** 画面の明るさを反映する（自動なら data-theme を外し、CSS の prefers-color-scheme に任せる） */
export function applyTheme(theme: Settings['theme']): void {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  // ブラウザの枠の色は、いまの地の色（styles.css の --bg）に合わせる
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
}

/** 自動のとき、端末の明るさの設定が変わったら、枠の色も合わせる */
export function watchTheme(get: () => Settings['theme']): () => void {
  try {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const on = () => applyTheme(get());
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  } catch {
    return () => {};
  }
}
