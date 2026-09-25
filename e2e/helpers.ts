import { expect, type Page } from '@playwright/test';

/** フォントの読み込みを待つ */
export async function ready(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    return true;
  });
}

/**
 * タイトルから食料危機のステージを始める。
 * free：すべての世界を救ったことにして、筆の位を最後（すべて自由）にしてから始める（書き換えの仕組みそのものを確かめるとき）
 */
export async function startFood(page: Page, free = false): Promise<void> {
  await page.goto('./?seed=7&debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('title')).toBeVisible();
  if (free) await debug(page, 'clears(7)');
  await page.getByTestId('start').click();
  await page.getByTestId('stage-food').click();
  await page.getByTestId('open-world').click();
  await expect(page.getByTestId('game')).toBeVisible();
  await ready(page);
}

/** ?debug=1 のときだけある窓口を呼ぶ */
export async function debug<T>(page: Page, call: string): Promise<T> {
  return page.evaluate(`(() => window.__wtxt.${call})()`) as Promise<T>;
}
