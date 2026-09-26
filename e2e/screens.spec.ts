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

  // はじめは序章だけが開いている（開いていく順番）
  await page.getByTestId('start').click();
  await page.screenshot({ path: shot('02_stages_first') });
  await page.getByTestId('stage-prologue').click();
  await page.getByTestId('open-world').click();
  await expect(page.getByTestId('game')).toBeVisible();
  await quiet(page);
  await page.screenshot({ path: shot('02a_prologue') });
  await page.getByTestId('tab-laws').click();
  await page.screenshot({ path: shot('02b_prologue_laws') });
  // 序章の手引き：書く画面にも、いまの手順を添える
  await page.getByTestId('law-animal_pollen').click();
  await page.getByTestId('editor').fill('虫や鳥がたくさんの花粉を運ぶ');
  await page.screenshot({ path: shot('02c_prologue_edit') });
  await page.getByTestId('sheet-close').click();
  // 序章を遊び終えたことにして、食料危機へ（遊んでいる序章は放棄する）
  await debug(page, 'played("prologue")');
  await debug(page, 'goStages()');
  await page.screenshot({ path: shot('02_stages') });
  await page.getByTestId('stage-food').click();
  await page.screenshot({ path: shot('03_briefing') });
  await page.getByTestId('open-world').click();
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
  await page.getByTestId('editor').fill('村ごとにため池を作る。');
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
  // 何も起きなかった年は結果の画面を出さずに世界へ戻るので、4年まとめて進めてから結果の画面を撮る
  await page.getByTestId('report-ok').click();
  await debug(page, 'advance(4)');
  await expect(page.getByTestId('report-sheet')).toContainText('YEAR 1 → 5');
  await page.screenshot({ path: shot('07_report') });
  await page.getByTestId('report-ok').click();
  await page.getByTestId('tab-world').click();
  await page.screenshot({ path: shot('08_world_later') });

  await page.getByTestId('pillar-food').click();
  await page.screenshot({ path: shot('09_pillar') });
  await page.getByTestId('ind-food').click();
  await page.screenshot({ path: shot('09b_indicator') });
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

  // 再生（棋譜から1年ずつ見返す）
  await page.getByTestId('open-replay').click();
  await expect(page.getByTestId('replay')).toBeVisible();
  for (let i = 0; i < 6; i++) await page.getByTestId('replay-next').click();
  await page.getByTestId('replay').scrollIntoViewIfNeeded();
  await page.screenshot({ path: shot('11c_replay') });

  // 観測記録（図鑑と実績の4種類）
  await page.getByTestId('result-records').click();
  await expect(page.getByTestId('records')).toBeVisible();
  await page.screenshot({ path: shot('12_records') });
  await page.getByTestId('records-rules').click();
  // どの一覧の文も、アイコンの細い列に押し込まれず、横いっぱいに並ぶ（1字ずつ縦に並ぶ崩れを防ぐ）
  for (const body of await page.locator('[data-testid="rules-notes"] .rec-body').all()) {
    expect((await body.boundingBox())?.width ?? 0).toBeGreaterThan(200);
  }
  await page.screenshot({ path: shot('12b_records_rules'), fullPage: true });
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
  // 意味の伝わらない文は書けない（書換の力も使わない）ことを、書く前に知らせる
  await expect(page.getByTestId('noise-note')).toBeVisible();
  await page.screenshot({ path: shot('23_noise') });
  await page.getByTestId('sheet-close').click();

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

  // メニュー（記録（セーブ）・画面・音）
  await page.getByTestId('menu').click();
  await expect(page.getByTestId('menu-sheet')).toBeVisible();
  await page.screenshot({ path: shot('27_menu') });
  await page.getByTestId('sheet-close').click();

  // 無限の世界の記録簿（この端末のランキング）
  await debug(page, 'goStages()');
  await page.getByTestId('stage-endless').click();
  await expect(page.getByTestId('ranking')).toBeVisible();
  await page.getByTestId('ranking').scrollIntoViewIfNeeded();
  await page.screenshot({ path: shot('24_ranking') });
});

test('明るい画面', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('./?seed=20260924&debug=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await ready(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot('L01_title') });
  await debug(page, 'played("prologue")');
  await page.getByTestId('start').click();
  await page.screenshot({ path: shot('L02_stages') });
  await page.getByTestId('stage-food').click();
  await page.getByTestId('open-world').click();
  await expect(page.getByTestId('game')).toBeVisible();
  await quiet(page);
  await page.screenshot({ path: shot('L04_world') });
  await page.getByTestId('tab-laws').click();
  await page.getByTestId('law-human_food').click();
  await page.getByTestId('editor').fill('人間は数日に一度食事を必要とする。');
  await page.screenshot({ path: shot('L05_edit') });
  await page.getByTestId('write').click();
  await quiet(page);
  await page.screenshot({ path: shot('L06_laws') });
  await page.getByTestId('advance').click();
  await expect(page.getByTestId('report-sheet')).toBeVisible();
  await page.waitForTimeout(2200);
  await page.screenshot({ path: shot('L07_report') });
  await page.getByTestId('report-ok').click();
  await page.getByTestId('menu').click();
  await page.screenshot({ path: shot('L27_menu') });
  await page.getByTestId('sheet-close').click();
  for (let i = 0; i < 20; i++) {
    const st = await debug<{ status: string }>(page, 'state()');
    if (st.status !== 'playing') break;
    await debug(page, 'advance(5)');
  }
  await page.getByTestId('report-ok').click();
  await expect(page.getByTestId('result')).toBeVisible();
  await quiet(page);
  await page.screenshot({ path: shot('L11_result'), fullPage: true });
  await page.getByTestId('result-records').click();
  await page.screenshot({ path: shot('L12_records') });
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
  await page.getByTestId('stage-prologue').click();
  await page.getByTestId('open-world').click();
  await expect(page.getByTestId('save-warning')).toBeVisible();
  await quiet(page);
  await page.screenshot({ path: shot('25_save_warning') });
});
