import { expect, test } from '@playwright/test';
import { debug, ready } from './helpers';

/** 主な画面のスクリーンショットを docs/screens/ に保存する（npm run screens） */
const shot = (name: string) => `docs/screens/${name}.png`;

/** 通知が消えるのを待つ */
async function quiet(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByTestId('toast')).toHaveCount(0, { timeout: 6000 });
}

test('主な画面', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('./?seed=20260924&debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await ready(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot('01_title') });
  // あそびかた（5枚で、ゲームの流れを短く）
  await page.getByTestId('open-tutorial').click();
  await page.screenshot({ path: shot('01b_tutorial') });
  for (let i = 0; i < 4; i++) await page.getByTestId('tutorial-next').click();
  await page.screenshot({ path: shot('01c_tutorial_pen') });
  await page.getByTestId('tutorial-close').click();

  await page.getByTestId('start').click();
  await page.screenshot({ path: shot('02_stages') });
  await page.getByTestId('stage-food').click();
  await page.screenshot({ path: shot('03_briefing') });
  await page.getByTestId('open-world').click();
  await expect(page.getByTestId('game')).toBeVisible();
  await quiet(page);
  await page.screenshot({ path: shot('04_world') });

  await page.getByTestId('tab-laws').click();
  await page.getByTestId('law-human_food').click();
  await page.getByTestId('editor').fill('人間は数日に一度食事を必要とする。');
  await page.screenshot({ path: shot('05_edit') });
  await page.getByTestId('write').click();
  await page.getByTestId('add-line').click();
  await page.getByTestId('editor').fill('人間は空を飛べる。');
  await page.getByTestId('write').click();
  await quiet(page);
  await page.screenshot({ path: shot('06_laws') });
  // 封じられた行（筆の位が上がると開く）
  await page.getByTestId('law-sun_shine').scrollIntoViewIfNeeded();
  await page.getByTestId('law-sun_shine').click();
  await page.screenshot({ path: shot('06b_laws_sealed') });
  await quiet(page);

  // 1回で1年。最初の年：書いた一文が世界の姿になる（情景と「世界が書き換わった」）
  await page.getByTestId('advance').click();
  await expect(page.getByTestId('onset')).toBeVisible();
  await page.waitForTimeout(2200);
  await page.screenshot({ path: shot('07a_report_onset') });
  // 結果の画面から、そのまま次の1年へ（5年ぶん進める）
  for (let i = 0; i < 4; i++) {
    await expect(page.getByTestId('report-sheet')).toBeVisible();
    await page.getByTestId('report-next').click();
  }
  await expect(page.getByTestId('report-sheet')).toContainText('YEAR 4 → 5');
  await page.screenshot({ path: shot('07_report') });
  await page.getByTestId('report-ok').click();
  await page.getByTestId('tab-world').click();
  await page.screenshot({ path: shot('08_world_later') });

  await page.getByTestId('ind-food').click();
  await page.screenshot({ path: shot('09_indicator') });
  await page.getByTestId('sheet-close').click();
  await page.getByTestId('tab-history').click();
  await page.screenshot({ path: shot('10_history') });

  // 最後まで進めて、リザルトを見る
  for (let i = 0; i < 20; i++) {
    const st = await debug<{ status: string }>(page, 'state()');
    if (st.status !== 'playing') break;
    await debug(page, 'advance(5)');
  }
  await page.getByTestId('report-ok').click();
  await expect(page.getByTestId('result')).toBeVisible();
  await quiet(page);
  await page.screenshot({ path: shot('11_result') });
  await page.screenshot({ path: shot('11b_result_full'), fullPage: true });

  // 共有用の画像（1200×630）
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('save-image').click()]);
  await download.saveAs(shot('15_share_card'));
  await quiet(page);

  // 観測記録
  await page.getByTestId('result-records').click();
  await expect(page.getByTestId('records')).toBeVisible();
  await page.screenshot({ path: shot('12_records') });
  await page.getByTestId('records-twists').click();
  await page.screenshot({ path: shot('13_records_twists') });

  // 新しいステージ（鍵は ?debug=1 の窓口で開ける）
  await debug(page, "start('war')");
  await expect(page.getByTestId('game')).toBeVisible();
  await quiet(page);
  await page.screenshot({ path: shot('14_war') });

  // 無限の世界：説明・危機の知らせ・結末
  await debug(page, 'unlock()');
  await debug(page, 'goStages()');
  await page.getByTestId('stage-endless').scrollIntoViewIfNeeded();
  await page.screenshot({ path: shot('16_stages_endless') });
  await page.getByTestId('stage-endless').click();
  await page.screenshot({ path: shot('17_endless_briefing'), fullPage: true });
  // 遊んでいる世界（世界大戦）は放棄して開く（2度押し）
  await page.getByTestId('open-world').click();
  await page.getByTestId('open-world').click();
  // 危機の知らせが届くまで進める（ほかの重大な出来事でも時間は止まる）
  for (let i = 0; i < 10; i++) {
    await debug(page, 'advance(30)');
    await page.getByTestId('report-ok').click();
    const st = await debug<{ crisis: unknown }>(page, 'state()');
    if (st.crisis) break;
  }
  await page.getByTestId('tab-world').click();
  await quiet(page);
  await page.screenshot({ path: shot('18_endless_crisis') });
  for (let i = 0; i < 200; i++) {
    const st = await debug<{ status: string }>(page, 'state()');
    if (st.status !== 'playing') break;
    await debug(page, 'advance(10)');
  }
  await page.getByTestId('report-ok').click();
  await expect(page.getByTestId('result')).toBeVisible();
  await quiet(page);
  await page.screenshot({ path: shot('19_endless_result') });

  // 特別な結末（病を人から断ち、食事を減らし、星々へ移り住む → 星々への旅立ち）と、筆の位が上がった知らせ、実績
  await debug(page, "start('plague')");
  await debug(page, 'boost()');
  await debug(page, "rewrite('pathogen_infect', '病原体は生き物に感染する。ただし人間には感染しない。')");
  await debug(page, "rewrite('human_food', '人間は数日に一度食事を必要とする。')");
  await debug(page, "add('人類は他の星に住める。')");
  for (let i = 0; i < 20; i++) {
    const st = await debug<{ status: string }>(page, 'state()');
    if (st.status !== 'playing') break;
    await debug(page, 'advance(5)');
  }
  await page.getByTestId('report-ok').click();
  await expect(page.getByTestId('result')).toBeVisible();
  await quiet(page);
  await page.screenshot({ path: shot('20_ending'), fullPage: true });
  await page.getByTestId('result-records').click();
  await page.getByTestId('records-achievements').click();
  await page.screenshot({ path: shot('21_achievements'), fullPage: true });

  // くり返す十年：巻き戻りまでの年数と、くり返しの決まり
  await debug(page, "start('loop')");
  await expect(page.getByTestId('game')).toBeVisible();
  await debug(page, 'advance(3)');
  await page.getByTestId('report-ok').click();
  await page.getByTestId('tab-world').click();
  await quiet(page);
  await page.screenshot({ path: shot('22_loop') });

  // 意味のない文：入力の補助と、世界が何も変わらないことの知らせ
  await page.getByTestId('tab-laws').click();
  await page.getByTestId('add-line').click();
  await page.getByTestId('editor').fill('ポポポ。');
  await expect(page.getByTestId('assist')).toBeVisible();
  await page.getByTestId('write').click();
  await expect(page.getByTestId('toast')).toContainText('世界は何も変わらない');
  await page.screenshot({ path: shot('23_noise') });
  await quiet(page);

  // たくさん書き換えた世界の情景（空を飛ぶ人・二つの太陽・ロボット・宇宙人・恐竜・猫・巨大な像・虹）
  await debug(page, "start('food')");
  await debug(page, 'boost()');
  for (const t of [
    '人間は空を飛べる。',
    '空には太陽が二つある。',
    'ロボットが人の代わりに働く。',
    '宇宙人が現れる。',
    '恐竜がよみがえる。',
    '猫が増える。',
    '独裁者が世界を治める。',
    '災害は起きない。',
  ])
    await debug(page, `add('${t}')`);
  await debug(page, 'advance(1)');
  await page.getByTestId('report-ok').click();
  await page.getByTestId('tab-world').click();
  await quiet(page);
  await page.waitForTimeout(2600);
  await page.screenshot({ path: shot('26_scene_rich') });

  // 無限の世界の記録簿（この端末のランキング）
  await debug(page, 'goStages()');
  await page.getByTestId('stage-endless').click();
  await expect(page.getByTestId('ranking')).toBeVisible();
  await page.getByTestId('ranking').scrollIntoViewIfNeeded();
  await page.screenshot({ path: shot('24_ranking') });
});

test('保存についての知らせ', async ({ page }) => {
  // 途中で保存できなくなった（端末の保存領域に空きがない）ときの知らせ
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'world-txt/save') throw new DOMException('いっぱい', 'QuotaExceededError');
      set.call(this, key, value);
    };
  });
  await page.goto('./?seed=20260924&debug=1');
  await ready(page);
  await page.getByTestId('start').click();
  await page.getByTestId('stage-food').click();
  await page.getByTestId('open-world').click();
  await expect(page.getByTestId('save-warning')).toBeVisible();
  await quiet(page);
  await page.screenshot({ path: shot('25_save_warning') });
});
