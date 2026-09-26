import { expect, test } from '@playwright/test';
import { debug, startFood } from './helpers';

test.describe('390×844 のスマホ縦画面', () => {
  test('タイトルから世界を開くと、世界の寿命・4つの柱（中に14の項目）・使える文字数が見える', async ({ page }) => {
    await startFood(page);
    await expect(page.getByTestId('year')).toHaveAttribute('data-value', '0');
    // 一目で追うのは、世界の寿命と4つの柱（14の項目は柱の中身に入っている）
    await expect(page.getByTestId('life')).toContainText('世界の寿命');
    await expect(page.getByTestId('pillars').locator('.pillar')).toHaveCount(4);
    await page.getByTestId('pillar-food').click();
    await expect(page.getByTestId('pillar-sheet').locator('.pillar-item')).toHaveCount(3);
    await page.getByTestId('sheet-close').click();
    // 世界の寿命を押すと、4つの終わりの線（使える文字数を含む）
    await page.getByTestId('life').click();
    await expect(page.getByTestId('capacity')).toContainText('字');
    await expect(page.getByTestId('capacity')).toBeVisible();
    await page.getByTestId('sheet-close').click();
    await expect(page.getByTestId('headline')).toContainText('人類文明はいま');
    // 世界の情景（挿し絵）と、まだ何も書いていないことの添え書き
    await expect(page.getByTestId('scene')).toBeVisible();
    await expect(page.getByTestId('scene-ink')).toContainText('まだ書き換えられていない');
    // 横にはみ出さない
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('WORLD.txt の文章を、選択肢なしで自由に書き換えられる', async ({ page }) => {
    await startFood(page);
    await page.getByTestId('tab-laws').click();
    await page.getByTestId('law-human_food').click();
    await expect(page.getByTestId('edit-sheet')).toBeVisible();
    await page.getByTestId('editor').fill('人間は二日に一度だけ食事をとる。');
    await page.getByTestId('write').click();
    await expect(page.getByTestId('toast')).toContainText('食事の回数が減る');
    await expect(page.getByTestId('law-human_food')).toHaveAttribute('data-state', 'changed');
    await expect(page.getByTestId('law-human_food')).toContainText('人間は二日に一度だけ食事をとる。');
    // 書換の力ははじめ2回。1回書いたので、残りは1回
    await expect(page.getByTestId('edits')).toHaveAttribute('data-value', '1');
  });

  test('行を消すと、その法則は世界から消える', async ({ page }) => {
    await startFood(page, true);
    await page.getByTestId('tab-laws').click();
    await page.getByTestId('law-war').click();
    await page.getByTestId('clear').click();
    await page.getByTestId('write').click();
    await expect(page.getByTestId('toast')).toContainText('世界から消した');
    await expect(page.getByTestId('law-war')).toHaveAttribute('data-state', 'deleted');
  });

  test('新しい一文を書き足せる（意味のない文は世界に届かず、書換の力も使わない）', async ({ page }) => {
    await startFood(page, true);
    await page.getByTestId('tab-laws').click();
    await page.getByTestId('add-line').click();
    await page.getByTestId('editor').fill('人間は空を飛べる');
    await page.getByTestId('write').click();
    await expect(page.getByTestId('toast')).toContainText('人間が空を飛ぶ');
    await expect(page.getByTestId('law-x1')).toContainText('人間は空を飛べる。');
    // 世界のタブの挿し絵に、最後に書いた一文がインクで添えられる
    await page.getByTestId('tab-world').click();
    await expect(page.getByTestId('scene-ink')).toContainText('人間は空を飛べる。');
    await page.getByTestId('tab-laws').click();

    await page.getByTestId('add-line').click();
    // 世界の読み：知っている言葉は実線、知らない言葉は点線
    await page.getByTestId('editor').fill('人は鼎を持つ');
    await expect(page.getByTestId('world-reading').locator('[data-known="false"]').first()).toBeVisible();
    await page.getByTestId('editor').fill('世界はうつくしい。');
    await expect(page.getByTestId('noise-note')).toContainText('世界に届かない言葉');
    await expect(page.getByTestId('write')).toBeDisabled();
    await expect(page.getByTestId('world-reading').locator('[data-known="true"]').first()).toContainText('世界');
  });

  test('入力の補助：「〜ない」で打ち消し、言葉をカーソルの位置に差し込める', async ({ page }) => {
    await startFood(page);
    await page.getByTestId('tab-laws').click();
    await page.getByTestId('law-human_food').click();
    const editor = page.getByTestId('editor');
    // 文の終わりの「。」は外して開く（書き込むときに世界が付ける）
    await expect(editor).toHaveValue('人間は毎日食事を必要とする');
    await page.getByTestId('assist-negate').click();
    await expect(editor).toHaveValue('人間は毎日食事を必要としない');
    // 「人間は」の後ろにカーソルを置いて「少し」を差し込む
    await editor.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(3, 3));
    await page.getByTestId('assist').getByRole('button', { name: '少し', exact: true }).click();
    await expect(editor).toHaveValue('人間は少し毎日食事を必要としない');
    // 押せる物は44px以上
    const box = await page.getByTestId('assist-negate').boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test('時間は1回で1年進み、結果の画面からそのまま次の1年へ進める', async ({ page }) => {
    await startFood(page);
    // 時間を進めるボタンは1つだけ（1年）
    await expect(page.getByTestId('advance')).toContainText('1年');
    await expect(page.getByTestId('advance-5')).toHaveCount(0);
    await page.getByTestId('advance').click();
    await expect(page.getByTestId('report-sheet')).toContainText('1年経過');
    await page.getByTestId('report-next').click();
    await expect(page.getByTestId('report-sheet')).toContainText('YEAR 1 → 2');
    await page.getByTestId('report-ok').click();
    await expect(page.getByTestId('year')).toHaveAttribute('data-value', '2');
    await page.getByTestId('tab-history').click();
    await expect(page.getByTestId('history-tab')).toContainText('MISSION');
  });

  test('書いた一文は、時間を進めた年に世界の姿になる（情景に描かれ、「世界が書き換わった」と知らせる）', async ({ page }) => {
    // 「空を飛ぶ」は重い言葉なので、すべて自由な筆で書く
    await startFood(page, true);
    await page.getByTestId('tab-laws').click();
    await page.getByTestId('add-line').click();
    await page.getByTestId('editor').fill('人間は空を飛べる');
    await page.getByTestId('write').click();
    // 定義の一覧には、世界がどう読み取ったかが添えられる
    await expect(page.getByTestId('law-x1')).toContainText('人間が空を飛ぶ');
    // 書いただけでは、情景は変わらない（結果は時間を進めて初めてわかる）
    await page.getByTestId('tab-world').click();
    await expect(page.getByTestId('scene')).not.toHaveAttribute('data-motifs', /flyers/);
    await page.getByTestId('advance').click();
    const sheet = page.getByTestId('report-sheet');
    await expect(sheet.getByTestId('onset')).toContainText('空を飛び始めた');
    await expect(sheet.getByTestId('onset')).toContainText('人間は空を飛べる。');
    await expect(sheet.getByTestId('report-scene')).toHaveAttribute('data-motifs', /flyers/);
    // 結果の画面のボタンは、読み進めなくても見えている
    await expect(page.getByTestId('report-next')).toBeInViewport();
    await page.getByTestId('report-ok').click();
    await expect(page.getByTestId('scene')).toHaveAttribute('data-motifs', /flyers/);
  });

  test('時間を逆にしたり止めたりした年も、その年に現れたものは現れたまま残る（現れ方の動きは逆にも止めもしない）', async ({ page }) => {
    // 情景のその要素の見え方（外側の層までの不透明度を掛け合わせる）。settle なら、現れ方の動きを取り消した絵（落ち着いた絵）の見え方
    const shown = (id: string, settle = false) =>
      page
        .getByTestId('scene')
        .locator(`[data-motif="${id}"]`)
        .first()
        .evaluate((el, s) => {
          if (s) for (const a of el.getAnimations({ subtree: true })) if ((a as CSSAnimation).animationName.startsWith('sc-in-')) a.cancel();
          let o = 1;
          for (let n: Element | null = el.querySelector('rect, path, line, circle, ellipse'); n && n.tagName !== 'svg'; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
          return o;
        }, settle);
    await startFood(page, true);
    await debug(page, 'boost()');
    for (const [line, cls] of [
      ['時間は逆に流れる。', /scene-reverse/],
      ['時間が止まる。', /scene-frozen/],
    ] as const) {
      await debug(page, `add('${line}')`);
      await debug(page, "add('恐竜がよみがえる。')");
      await debug(page, 'advance(1)');
      await expect(page.getByTestId('scene')).toHaveClass(cls);
      await expect(page.getByTestId('scene')).toHaveAttribute('data-motifs', /dinosaurs/);
      // 現れる動き（約2.4秒）が終わっても、時計も恐竜も、落ち着いた絵と同じ見え方で残っている
      await page.waitForTimeout(3000);
      for (const id of ['clock', 'dinosaurs']) {
        const after = await shown(id);
        const still = await shown(id, true);
        expect(still).toBeGreaterThan(0.3);
        expect(after).toBeCloseTo(still, 2);
      }
      // 次の世界で、もう一方の書き方を試す
      await startFood(page, true);
      await debug(page, 'boost()');
    }
  });

  test('再読み込みしても、書き換えた世界の続きから遊べる', async ({ page }) => {
    await startFood(page, true);
    await page.getByTestId('tab-laws').click();
    await page.getByTestId('law-crime').click();
    await page.getByTestId('editor').fill('');
    await page.getByTestId('write').click();
    await page.getByTestId('advance').click();
    await page.getByTestId('report-ok').click();
    await page.reload();
    await page.getByTestId('continue').click();
    await expect(page.getByTestId('year')).toHaveAttribute('data-value', '1');
    await page.getByTestId('tab-laws').click();
    await expect(page.getByTestId('law-crime')).toHaveAttribute('data-state', 'deleted');
  });

  test('書き足した文が既存の行の話なら、その行の書き換えとして読まれる', async ({ page }) => {
    await startFood(page);
    await page.getByTestId('tab-laws').click();
    await page.getByTestId('add-line').click();
    await page.getByTestId('editor').fill('雨がたくさん降る。');
    await page.getByTestId('write').click();
    await expect(page.getByTestId('toast')).toContainText('行目の書き換えとして');
    await expect(page.getByTestId('law-water_rain')).toHaveAttribute('data-state', 'changed');
    await expect(page.getByTestId('law-water_rain')).toContainText('雨がたくさん降る。');
    await page.getByTestId('law-water_rain').click();
    await expect(page.getByTestId('reading')).toContainText('雨が増える');
  });

  test('想定外の変化には、原因になった一文が付く', async ({ page }) => {
    // 「週に一度」は重い言葉なので、すべて自由な筆で書く
    await startFood(page, true);
    await page.getByTestId('tab-laws').click();
    await page.getByTestId('law-human_food').click();
    await page.getByTestId('editor').fill('人間は週に一度食事を必要とする。');
    await page.getByTestId('write').click();
    // 原因の付いた想定外の変化が出るまで進める（世界が先に終わったら、結末の画面から歩みを開く）
    for (let i = 0; i < 15; i++) {
      const st = await debug<{
        status: string;
        history: { kind: string; cause?: unknown }[];
      }>(page, 'state()');
      if (st.status !== 'playing' || st.history.some((h) => h.kind !== 'edit' && h.cause)) break;
      await page.getByTestId('advance').click();
      await page.getByTestId('report-ok').click();
    }
    if (await page.getByTestId('result').isVisible()) await page.getByTestId('read-history').click();
    await page.getByTestId('tab-history').click();
    await expect(page.getByTestId('history-tab').getByTestId('cause').first()).toContainText('人間は週に一度食事を必要とする。');
  });

  test('観測記録：見つけたものが残り、まだ見ぬものは「？」で数だけ見える', async ({ page }) => {
    await startFood(page);
    await page.getByTestId('tab-laws').click();
    await page.getByTestId('law-human_food').click();
    await page.getByTestId('editor').fill('人間は数日に一度食事を必要とする。');
    await page.getByTestId('write').click();
    await expect(page.getByTestId('toast')).toContainText('新発見');
    await page.getByTestId('menu').click();
    await page.getByTestId('menu-records').click();
    await expect(page.getByTestId('records')).toBeVisible();
    await expect(page.getByTestId('records')).toContainText('食事の回数が減る');
    await expect(page.locator('.rec-q').first()).toBeVisible();
    await page.getByTestId('records-back').click();
    await expect(page.getByTestId('game')).toBeVisible();
  });

  test('まだ開いていない世界には鍵がかかっている', async ({ page }) => {
    await page.goto('./?seed=7&debug=1');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByTestId('start').click();
    // はじめは序章だけが開いている。食料危機は序章を遊び終えると、世界大戦は世界を1つ救うと開く
    await expect(page.getByTestId('stage-prologue')).toHaveAttribute('data-locked', 'false');
    await expect(page.getByTestId('stage-food')).toHaveAttribute('data-locked', 'true');
    await expect(page.getByTestId('stage-war')).toHaveAttribute('data-locked', 'true');
    await page.getByTestId('stage-food').click();
    await expect(page.getByTestId('toast')).toContainText('序章');
    await page.getByTestId('stage-war').click();
    await expect(page.getByTestId('toast')).toContainText('世界を救うと');
    await expect(page.getByTestId('stages')).toBeVisible();
    // わかった世界の決まりと現実のカードの数、まだ出会っていない決まりの手がかりが見える
    await expect(page.getByTestId('known-rules')).toContainText('0');
    await expect(page.getByTestId('journey-next')).toContainText('まだ出会っていない決まり');
  });

  test('無限の世界：危機の知らせが届き、文明が滅ぶまで何年続いたかを競う', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('./?seed=7&debug=1');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByTestId('start').click();
    await expect(page.getByTestId('stage-endless')).toHaveAttribute('data-locked', 'true');
    await debug(page, 'unlock()');
    await expect(page.getByTestId('stage-endless')).toHaveAttribute('data-locked', 'false');
    await page.getByTestId('stage-endless').click();
    await expect(page.getByTestId('briefing')).toContainText('文明が滅ぶまで');
    await expect(page.getByTestId('open-daily')).toContainText('今日の世界');
    await page.getByTestId('open-world').click();
    await expect(page.getByTestId('year').getByLabel('終わりなし')).toBeVisible();
    await expect(page.getByTestId('endless-left').getByLabel('終わりなし')).toBeVisible();

    // 最初の危機の知らせが届くまで進める（重大な知らせで時間は止まるので、届くまでくり返す）
    for (let i = 0; i < 10; i++) {
      await debug(page, 'advance(30)');
      await page.getByTestId('report-ok').click();
      const st = await debug<{ crisis: unknown }>(page, 'state()');
      if (st.crisis) break;
    }
    await expect(page.getByTestId('crisis')).toBeVisible();
    await expect(page.getByTestId('crisis')).toContainText('あと');
    await expect(page.getByTestId('endless-left')).toContainText('危機まで');

    // 滅ぶまで進めると、何年続いたかが残る
    for (let i = 0; i < 200; i++) {
      const st = await debug<{ status: string }>(page, 'state()');
      if (st.status !== 'playing') break;
      await debug(page, 'advance(10)');
    }
    // 世界が終わっていれば、結果の「世界の記録を見る」で結末へ
    await page.getByTestId('report-ok').click();
    await expect(page.getByTestId('result')).toBeVisible();
    await expect(page.getByTestId('wc-years')).toContainText('続いた');
    await expect(page.getByTestId('endless-record')).toContainText('最長');
    await page.getByTestId('to-stages').click();
    await expect(page.getByTestId('stage-endless')).toContainText('最長');
  });

  test('長押し・右クリックで、コピーや保存のメニューが出ず、文字も選ばれない（入力欄は除く）', async ({ page }) => {
    await startFood(page);
    // 文字の上で長押し（右クリック）しても、メニューは出ない
    const blocked = await page.getByTestId('headline').evaluate((el) => {
      const ev = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(ev);
      return ev.defaultPrevented;
    });
    expect(blocked).toBe(true);
    // 文字を続けてたたいても、選ばれない
    await page.getByTestId('headline').dblclick();
    expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');
    // 書き換えの編集欄は、これまでどおり選んで貼り付けられる
    await page.getByTestId('tab-laws').click();
    await page.getByTestId('law-human_food').click();
    const editor = page.getByTestId('editor');
    const allowed = await editor.evaluate((el) => {
      const ev = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(ev);
      return !ev.defaultPrevented;
    });
    expect(allowed).toBe(true);
    await editor.selectText();
    expect(await editor.evaluate((el) => (el as HTMLTextAreaElement).selectionEnd - (el as HTMLTextAreaElement).selectionStart)).toBeGreaterThan(0);
  });

  test('開ける世界は1つだけ：別の世界を開くときは、前の世界を放棄してよいかを確かめる', async ({ page }) => {
    await startFood(page);
    // 感染症は、食料危機を遊び終えると開く
    await debug(page, 'played("food")');
    await debug(page, 'goStages()');
    await expect(page.getByTestId('ongoing')).toContainText('食料危機');
    await expect(page.getByTestId('stage-food')).toHaveAttribute('data-ongoing', 'true');
    await page.getByTestId('stage-plague').click();
    await expect(page.getByTestId('abandon-note')).toContainText('食料危機');
    // 1度目は確かめるだけ
    await page.getByTestId('open-world').click();
    await expect(page.getByTestId('open-world')).toContainText('放棄して開く');
    await expect(page.getByTestId('briefing')).toBeVisible();
    // 2度目で、前の世界を放棄して開く
    await page.getByTestId('open-world').click();
    await expect(page.getByTestId('game')).toBeVisible();
    const st = await debug<{ stageId: string }>(page, 'state()');
    expect(st.stageId).toBe('plague');
    await expect(page.getByTestId('toast')).toContainText('実績');
  });

  test('宇宙を消すと、特別な結末「無」で世界が終わる', async ({ page }) => {
    await startFood(page, true);
    await page.getByTestId('tab-laws').click();
    await page.getByTestId('add-line').click();
    await page.getByTestId('editor').fill('宇宙は消滅する。');
    await page.getByTestId('write').click();
    await expect(page.getByTestId('toast')).toContainText('宇宙が消える');
    await page.getByTestId('advance').click();
    await expect(page.getByTestId('end-banner')).toContainText('無');
    await page.getByTestId('report-ok').click();
    await expect(page.getByTestId('result')).toBeVisible();
    await expect(page.getByTestId('ending')).toContainText('無');
    await expect(page.getByTestId('ending')).toContainText('なぜ？');
  });

  test('読み込めるものを絞る決まり（CSP）が入っていて、遊んでもそれに触れない', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (m) => {
      if (/Content Security Policy|Refused to (load|apply|execute|connect)/i.test(m.text())) violations.push(m.text());
    });
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => {
        const w = window as unknown as { __csp?: string[] };
        w.__csp = [...(w.__csp ?? []), `${e.violatedDirective} ${e.blockedURI}`];
      });
    });
    await startFood(page, true);
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', /script-src 'self'/);
    await page.getByTestId('tab-laws').click();
    await page.getByTestId('add-line').click();
    await page.getByTestId('editor').fill('人間は空を飛べる。');
    await page.getByTestId('write').click();
    await page.getByTestId('advance').click();
    await expect(page.getByTestId('report-sheet')).toBeVisible();
    await page.getByTestId('report-ok').click();
    // 書体（Google Fonts）も読み込めている
    expect(await page.evaluate(() => document.fonts.check('16px "Shippori Mincho"'))).toBe(true);
    // 世界の終わりまで進め、共有用の画像（その場で描いて保存する）も作る
    for (let i = 0; i < 20; i += 1) {
      const st = await debug<{ status: string }>(page, 'state()');
      if (st.status !== 'playing') break;
      await debug(page, 'advance(5)');
    }
    await page.getByTestId('report-ok').click();
    await expect(page.getByTestId('result')).toBeVisible();
    await Promise.all([page.waitForEvent('download'), page.getByTestId('save-image').click()]);
    const caught = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);
    expect([...violations, ...caught]).toEqual([]);
  });

  test('保存できない画面（プライベートブラウズなど）では、そう知らせる', async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('保存できない', 'QuotaExceededError');
      };
    });
    await page.goto('./?seed=7');
    await expect(page.getByTestId('save-warning')).toContainText('この画面では保存できない');
    // 知らせは閉じられる
    await page.getByTestId('save-warning').getByRole('button').click();
    await expect(page.getByTestId('save-warning')).toHaveCount(0);
  });

  test('途中で保存できなくなったら（空きがない）、そう知らせる', async ({ page }) => {
    await page.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === 'world-txt/save') throw new DOMException('いっぱい', 'QuotaExceededError');
        set.call(this, key, value);
      };
    });
    await page.goto('./?seed=7');
    await expect(page.getByTestId('title')).toBeVisible();
    await expect(page.getByTestId('save-warning')).toHaveCount(0);
    await page.getByTestId('start').click();
    // はじめて開ける世界は序章
    await page.getByTestId('stage-prologue').click();
    await page.getByTestId('open-world').click();
    await expect(page.getByTestId('save-warning')).toContainText('保存できなかった');
  });

  test('ホーム画面に追加したときのアイコンと名前がある（iPhone と Android）', async ({ page, request }) => {
    await page.goto('./');
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'ラプラスの庭');
    const here = page.url();
    const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    const icon = await request.get(new URL(apple!, here).href);
    expect(icon.ok()).toBe(true);
    expect(icon.headers()['content-type']).toContain('image/png');
    const manifestUrl = new URL((await page.locator('link[rel="manifest"]').getAttribute('href'))!, here).href;
    const manifest = (await (await request.get(manifestUrl)).json()) as {
      short_name: string;
      display: string;
      icons: { src: string; purpose?: string }[];
    };
    expect(manifest.short_name).toBe('ラプラスの庭');
    // ホーム画面から開いてもブラウザで開く（iPhone でセーブが Safari と分かれないように）
    expect(manifest.display).toBe('browser');
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
    for (const i of manifest.icons) expect((await request.get(new URL(i.src, manifestUrl).href)).ok(), i.src).toBe(true);
  });

  test('タイトルの「あそびかた」で、ゲームの流れを5枚で短く見られる', async ({ page }) => {
    await page.goto('./?seed=7&debug=1');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByTestId('open-tutorial').click();
    const tour = page.getByTestId('tutorial');
    await expect(tour).toContainText('1 / 5');
    await expect(tour).toContainText('世界は文章でできている');
    for (const title of ['兆しを読む', '書き換える', '時間を進める', '世界を救う']) {
      await page.getByTestId('tutorial-next').click();
      await expect(tour).toContainText(title);
    }
    await expect(tour).toContainText('筆の位');
    // 押せる物は44px以上
    const box = await page.getByTestId('tutorial-done').boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await page.getByTestId('tutorial-done').click();
    await expect(page.getByTestId('stages')).toBeVisible();
    await expect(page.getByTestId('pen-panel')).toContainText('見習いの筆');
    await expect(page.getByTestId('pen-next')).toContainText('あと1つの世界を救うと');
  });

  test('はじめの筆では、封じられた行は書き換えられず、書き足せる行にも限りがある', async ({ page }) => {
    await startFood(page);
    await page.getByTestId('tab-laws').click();
    await expect(page.getByTestId('pen')).toContainText('見習いの筆');
    // 太陽の行は封じられている：タップすると、どの位で開くかを知らせ、書き換える画面は開かない
    await expect(page.getByTestId('law-sun_shine')).toHaveAttribute('data-sealed', 'yes');
    await page.getByTestId('law-sun_shine').click();
    await expect(page.getByTestId('toast')).toContainText('ロックされて');
    await expect(page.getByTestId('edit-sheet')).toHaveCount(0);
    // 食料危機に関わる行は開いている
    await expect(page.getByTestId('law-human_food')).not.toHaveAttribute('data-sealed', 'yes');
    // 重い言葉（空を飛ぶ）は、いまの筆では書けない（書換の力は減らない）
    await page.getByTestId('add-line').click();
    await page.getByTestId('editor').fill('人間は空を飛べる');
    await page.getByTestId('write').click();
    await expect(page.getByTestId('toast')).toContainText('重すぎて');
    // 書き足せる行は1つまで
    await page.getByTestId('editor').fill('ため池を作る');
    await page.getByTestId('write').click();
    await expect(page.getByTestId('toast')).toContainText('水をためておく');
    await expect(page.getByTestId('add-line')).toHaveAttribute('data-full', 'yes');
    await page.getByTestId('add-line').click();
    await expect(page.getByTestId('toast')).toContainText('書き足せるのは1行まで');
  });

  test('世界の寿命：いちばん近い線まで、あと約何年か。押すと、人口・文明・世界整合性・世界容量の終わりの線を見せる', async ({ page }) => {
    await startFood(page);
    await expect(page.getByTestId('life')).toContainText('いちばん近い線');
    await page.getByTestId('life').click();
    const limits = page.getByTestId('limits');
    await expect(limits).toContainText('世界の終わりまで');
    await expect(limits.locator('.limit')).toHaveCount(4);
    await expect(page.getByTestId('limit-pop')).toContainText('億人を割ると');
    await page.getByTestId('limit-civ').click();
    await expect(page.getByTestId('meta-sheet')).toContainText('文明');
    await expect(page.getByTestId('meta-limit')).toBeVisible();
  });

  test('設定：文字の大きさ・情景の名前・音楽と効果音の音量・このゲームについて・すべての記録を消す', async ({ page }) => {
    await startFood(page);
    await page.getByTestId('menu').click();
    // 文字の大きさ：大にすると画面がまとめて大きくなり、横にはみ出さない
    await page.getByTestId('text-large').click();
    await expect(page.locator('.app')).toHaveClass(/text-large/);
    expect(await page.locator('.app').evaluate((e) => getComputedStyle(e).zoom)).toBe('1.12');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await page.getByTestId('text-medium').click();
    await expect(page.locator('.app')).toHaveClass(/text-medium/);
    // 情景の名前
    await expect(page.getByTestId('menu-names')).toContainText('ON');
    await page.getByTestId('menu-names').click();
    await expect(page.getByTestId('menu-names')).toContainText('OFF');
    // 音楽の音量と効果音の音量は別々
    await expect(page.getByTestId('menu-volume')).toBeVisible();
    await page.getByTestId('menu-se-volume').evaluate((el) => {
      const input = el as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '0.2');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.getByTestId('menu-se-volume')).toHaveValue('0.2');
    await expect(page.getByTestId('menu-volume')).not.toHaveValue('0.2');
    // このゲームについて：版・書体とアイコンのライセンス・音楽と絵の作り方
    await page.getByTestId('menu-about').click();
    const about = page.getByTestId('about');
    await expect(about).toContainText('SIL Open Font License');
    await expect(about).toContainText('ISC License');
    await expect(about).toContainText('Gemini');
    await expect(about).toContainText('gpt-image');
    // すべての記録を消す：2度押しで確かめ、タイトルへ戻る（はじめから）
    await page.getByTestId('menu-reset').click();
    await expect(page.getByTestId('reset-note')).toContainText('元に戻せない');
    await page.getByTestId('menu-reset').click();
    await expect(page.getByTestId('title')).toBeVisible();
    await expect(page.getByTestId('continue')).toHaveCount(0);
    await expect(page.getByTestId('start')).toContainText('はじめる');
  });

  test('序章の手引き：押す順に示し、押す所を枠で示す。手本どおりに書くと次の年に世界が変わり、結びの一文が出る', async ({ page }) => {
    await page.goto('./?seed=7&debug=1');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByTestId('start').click();
    await page.getByTestId('stage-prologue').click();
    await page.getByTestId('open-world').click();
    const coach = page.getByTestId('coach');
    // 1年目：書き換える。まず「法則」のタブを示す
    await expect(coach).toContainText('手引き 1 / 3');
    await expect(coach).toContainText('書き換える');
    await expect(page.getByTestId('tab-laws')).toHaveClass(/coach-target/);
    await page.getByTestId('tab-laws').click();
    // 次は手本の行を示す
    await expect(coach.locator('[data-state="done"]')).toHaveCount(1);
    await expect(page.getByTestId('law-animal_pollen')).toHaveClass(/coach-target/);
    await page.getByTestId('law-animal_pollen').click();
    // 書く画面にも、いまの手順を添える
    await expect(page.getByTestId('coach-note')).toContainText('虫や鳥がたくさんの花粉を運ぶ');
    await page.getByTestId('editor').fill('虫や鳥がたくさんの花粉を運ぶ');
    await expect(page.getByTestId('write')).toHaveClass(/coach-target/);
    await page.getByTestId('write').click();
    // 書いたら「1年進める」を示す
    await expect(page.getByTestId('advance')).toHaveClass(/coach-target/);
    await page.getByTestId('advance').click();
    const sheet = page.getByTestId('report-sheet');
    await expect(sheet.getByTestId('onset')).toContainText('花粉を運ぶ');
    await expect(sheet.getByTestId('coach-after')).toContainText('書き換えた一文');
    await page.getByTestId('report-ok').click();
    // 2年目：書き足す。法則のいちばん下の「行を書き足す」を示す
    await expect(coach).toContainText('手引き 2 / 3');
    await expect(coach).toContainText('書き足す');
    await expect(page.getByTestId('add-line')).toHaveClass(/coach-target/);
  });
});
