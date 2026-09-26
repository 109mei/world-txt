import { expect, test } from '@playwright/test';
import { debug, startFood } from './helpers';

/**
 * 演出中の1秒あたりのコマ数（P8・P14）：スマホ相当に処理を4倍遅くして（Chrome の CPU の絞り）、
 * 計算の演出・因果の連鎖・情景の塗り替えのあいだに、何コマ描けたかを数える
 */
async function fps(page: import('@playwright/test').Page, ms: number): Promise<number> {
  return page.evaluate(
    (span) =>
      new Promise<number>((resolve) => {
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames += 1;
          if (performance.now() - start < span) requestAnimationFrame(tick);
          else resolve((frames * 1000) / (performance.now() - start));
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
}

test('演出中のコマ数（CPU 4倍遅く）', async ({ page }) => {
  test.setTimeout(120_000);
  await startFood(page, true);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // 書いてから1年進める：計算の演出（約1.2秒）→ 結果の画面（情景の塗り替え・因果の連鎖）
  await debug(page, "add('人間は空を飛べる。')");
  await page.getByTestId('advance').click();
  const compute = await fps(page, 1000);
  await expect(page.getByTestId('report-sheet')).toBeVisible();
  const report = await fps(page, 1500);
  await page.getByTestId('report-ok').click();
  const world = await fps(page, 1500);
  console.log(`計算の演出 ${compute.toFixed(0)} コマ/秒・結果の画面 ${report.toFixed(0)} コマ/秒・世界の画面 ${world.toFixed(0)} コマ/秒（CPU 4倍遅く）`);
  expect(compute).toBeGreaterThan(20);
});
