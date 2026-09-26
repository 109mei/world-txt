# ラプラスの庭（WORLD.txt）開発の決まり

世界を定義している文章を自由に消す・書き換える・書き足すことで人類文明を存続させる、スマホ縦画面のブラウザゲーム。遊んでいる間は乱数を使わず、同じ世界番号・同じ書き方なら同じ世界になる（ラプラスの決まり）。仕様は docs/SPEC.md、元の企画は docs/PLAN.md、分析と改善の計画は docs/ANALYSIS.md・docs/IMPROVE.md・docs/PROMPTS.md（直す前の数字は docs/BASELINE.md、段階ごとの作業計画は docs/WORKPLAN.md）、画面設計の見本は docs/design/、画面の言葉は docs/TERMS.md、現実の数字の出典は docs/SOURCES.md。

## 構成

| 役割 | 使うもの |
|---|---|
| 土台 | Vite |
| 言語 | TypeScript（strict） |
| ルール本体 | src/core の Pure TypeScript。DOM・React・Zustand・localStorage・Math.random・Date.now を使わない |
| 数値と内容 | src/data の JSON＋Zod（型は Zod のスキーマから作る） |
| 画面の部品 | React＋HTML/CSS/SVG（src/ui） |
| 演出 | PixiJS（src/ui/fx。書いた・1年進めた・効き始めた・想定外の変化・結末のときだけ、画面の上の透明な描き場に粒と光を描く。後から読み込む。WebGL が使えない端末・動きを減らす設定では出さず、SVG と CSS の演出だけにする） |
| 橋渡し | Zustand（src/store）。画面に見せる写しだけを持つ |
| セーブ | src/save の SaveStore（localStorage。版番号つき） |
| テスト | Vitest（tests/）、Playwright（e2e/、390×844） |
| 公開 | GitHub Actions → GitHub Pages（https://109mei.github.io/world-txt/。Vite の base は '/world-txt/'） |

入れていないもの：vite-plugin-pwa、Dexie、Web Worker。

## 設計の決まり（必ず守る）

1. ゲームの状態の持ち主は src/core だけ。書き換えは命令（rewriteLaw・addLine・rewriteLine・advance）を core に渡して行う
2. 遊んでいる間は乱数を使わない。世界の初期条件と出来事の起きる時期は、世界番号から決まる式（src/core/hash.ts の hash01・startCharge）と状態の変化だけで決める。同じ世界番号・同じ棋譜（書いた手の並び）なら、誰が作り直しても同じ世界になる（tests/kifu.test.ts と npm run fuzz が確かめる）。開く条件・印・実績にも乱数を使わない
3. プレイヤーには選択肢も、書き換えの結果の予測も見せない。書き換えは自由な文章で行い、結果は時間を進めて初めてわかる。起きかけていること（兆し）と世界の寿命は、今の世界の動きをのばしただけで、書き換えの結果の予測ではない
4. 文章の意味は src/core/interpret.ts が語彙の手がかりから読み取る。読み取りの規則は laws.json の match・subject・topic と phrases.json に置き、コードに言葉を増やさない（言葉の種類・語尾・英語・読み分けの語尾は lexicon.json）。書き足した文章が既存の行と同じものについての文なら、その行の書き換えとして読む。種類ごとの読み取り（generic）は、ほかに何も読めなかったときだけ当てる。意味が伝わらない文では、世界は何も変わらない
5. 因果は現実の仕組みに沿わせる。想定外の変化（副作用・出来事）には、現実の根拠を「なぜ？」（why）として一文で添える。数字は「約」をつけ、確かなものだけを使い、出典を src/data/sources.json と docs/SOURCES.md に残す。どの行から来たか（cause）は core が付ける（敗因の振り返りと因果の連鎖は、この cause だけでつなぐ）
6. 見つけたもの（読み取り・副作用・出来事・結末・初めて起きたこと h:・使った読まれ方 m: など）は core が GameState.found に残し、runtime が観測記録（progress.discovered）へ移す。新しい内容を足したら、観測記録にも自動で並ぶ
7. 数値をコードに直接書かない。balance.json などのデータに置く
8. セーブには版番号を入れ、古い版から新しい版へ変換する関数（src/save/migrations.ts）を用意する。GameState に項目を足したら、古い形を補う処理（core の upgradeState）と、src/save/schema.ts の上限つきの形も足す
9. 概念（phrases.json）や法則の読み取り（laws.json の options）を足したら、効き始めた年の知らせ（onset）と情景での描き方（scene）も書く。書いた一文は、時間を進めた最初の年に「世界が書き換わった」と知らせ、情景にそのとおりに描く（書いただけでは見せない）。描く要素（SCENE_MOTIFS）を足したら、src/ui/scene に絵を描き、現れ方（common.tsx の ENTER）を選ぶ。両立しない描き方は scene.json の exclusive・hides に足す（データの検査と tests/scene.test.ts・scene-render.test.ts が確かめる）
10. 書き換えられる範囲（筆の位）は core の access.ts と access.json が決め、core の書き換え命令が確かめる（ロックされた行・書き足せる行の数・書ける概念の重さ）。概念（concepts.json）を足したら access.json のどれかの分野に、ステージを足したら access.json の stages に、その世界の危機に関わる概念を足す（npm run ranks と tests/access.test.ts で、どのステージの作戦もはじめて遊べる位で止まらないことを確かめる）
11. 開いていく順番（src/data/unlocks.json・src/core/unlocks.ts）：学問の仕組み（世界の決まり）25は、どれもちょうど1つの段で紹介する。紹介する前は弱く（balance.intro.before）動かし、紹介した年から本来の強さへ上げる。1回のプレイで新しく覚える考えは1つ。開いたものは閉じない（tests/unlocks.test.ts）
12. ステージを足したら、原因の型（causes）と、型ごとの兆し・壁の出来事（events.json の cause: と !phrase:）、作り手の解の手数（causes[].par）、兆しの読み方（hints）、改稿者の試練（trial）も書く。作り手の解は scripts/strategies.ts の READERS に置き、npx tsx scripts/par.ts で、どの世界番号で通るかを確かめる

## 安全の決まり

- 読み込めるものを絞る決まり（CSP）は vite.config.ts にあり、公開用のビルドだけに入る。外から読み込むもの（書体・画像・通信の先）を増やしたら、CSP も直す。e2e の CSP のテストで、決まりに触れていないことを確かめる
- eval・new Function・innerHTML を使わない（Zod は jitless で動かす。PixiJS は 'pixi.js/unsafe-eval' を読み込み、使う部品だけで動かす（skipExtensionImports）。画像を読み込まず、worker も使わない）
- テスト用の窓口（?debug=1）は、開発中とテスト用のビルド（--mode e2e）だけ。公開用のビルドに入れない
- 読み込むセーブ（書き出したテキスト・ファイルも）は疑う：大きさ・長さ・数の上限と Zod の形で確かめ、__proto__ などの鍵は取り除く。セーブの項目を足したら、src/save/schema.ts にも上限つきで足す
- 保存できなかったときは黙らずに知らせる（runtime の saveWarning）

## 見た目の決まり

- 暗い画面は黒と銀、明るい画面は紙と墨（写本・ゴシック調）。最初は端末の設定に合わせ、メニューの「画面の明るさ」で選べる
- 色は src/ui/styles.css の役割の名前の変数だけで書く（コードに色の値を直接書かない。情景は --sc-*、共有画像は夜の色の変数を読む。例外はタイトルの夜の絵 TitleArt だけで、明るい画面でも theme-night の中で夜の絵として描く）。色の役割：青＝書いたもの、金＝注意と兆し、珊瑚＝悪化、赤＝終わりの線、翡翠＝良い、灰＝まだ開いていないもの（鍵）、薄紫＝まだ知らないもの。すべての文字と地の組み合わせで明るさの比 4.5:1 以上（tests/contrast.test.ts）
- 書体は Cormorant Garamond（欧文・数字）としっぽり明朝（和文）
- 状態は状態の言葉と、向きの線のアイコン3つ（良くなっている・変わらない・悪くなっている）で伝え、ゲーム的な数値（74/100 など）は出さない。数字で出すのは、年・回数・人数・字数・進み具合だけ
- 画面の文字に記号（✓ ○ ∞ ✎ ⇈ ↗ ↘ ⇊ ■ ◆ ★ など）と絵文字を使わない。アイコンは lucide（線の太さ1.5）で、言葉か読み上げ用の名前を必ず添える。→ は「前 → 後」の変化にだけ使ってよい
- 絵（世界の情景とタイトルの絵）は途中で止まらず、ゆっくり動き続ける（雲・人・船・煙・星など。周期は要素ごとにずらす）。画面の外に出た情景と、動きを減らす設定・「動きを減らす」ON では止める。点滅は1秒に3回より少なく
- 画面の部品（文字・カード・数字）が動くのは何か起きたとき（書いた・1年進めた・兆しが出た・崩れた・結末）だけ。新しく出たものを光らせるのは3回（5秒以内）まで。PixiJS の演出（src/ui/fx）も何か起きたときだけ出し、終われば ticker を止め、演出を出さない画面へ移ったら片づける。粒の散り方は書いた文・世界番号の文字から決まる式（fx/pattern.ts）で、Math.random を使わない。色は styles.css の変数から読む
- 句読点は、ないと読みにくい所にだけ使う。1つの文だけの表示（見出し・知らせ・ニュース・ボタン・トースト・柱の理由など）には「。」を付けない。2つ以上の文が続く説明は、文の区切りと終わりに「。」を使う。「、」は、ないと読み違える所・長い文の区切り・並べる所だけ。WORLD.txt の行（世界の文章）と書く文の例は「。」で終える（データは tests/terms.test.ts が確かめる）
- 押せる物は44px以上

## フォルダ

- src/core：ルール本体（状態・進行・命令・読み取り・世界番号の式 hash・人々の心 people・世界の決まりの強さ intro・開いていく順番 unlocks・兆し signs・3つの印と原因の壁 marks・敗因の振り返り review・棋譜 kifu）
- src/data：JSON と Zod のスキーマ（情景を動かすもの・情景の名前は scene.json、開いていく順番と世界の決まりは unlocks.json、出典は sources.json）
- src/store：Zustand と写し（view。世界の寿命 life・4つの柱 pillars・起きかけていること signs・世界の終わりまで limits を含む）、世界の情景の写し（scene）、筆の位（pen）、観測記録（records）、世界の辞書（dictionary）と因果の地図（causal）、図鑑と実績（codex）、開いていく順番の写し（journey）、因果の連鎖（chain）、再生（replay）、共有文（share）、無限の世界の記録簿（ranking）
- src/ui：React の部品と CSS、タイトルの絵、世界の情景（WorldScene と scene/ の層。開発用の一覧は ?gallery=1）、計算の演出（Passing）、因果の連鎖（Chain）、音楽（audio）と効果音（se）、PixiJS の演出（fx。散り方の式は pattern、描き手は stage）、画面の明るさ（theme）、共有画像（shareImage）、入力の補助（wording）、あそびかた（Tutorial）、序章の手引き（Coach）、筆の位（PenPanel）、画面の言葉（terms）、画面を描けなかったときの受け止め役（ErrorBoundary）、共通の部品（parts・icons・Curve・touch）、シート（書く・結果・柱の中身と世界の寿命・メニュー など）
- src/save：SaveStore・セーブの形・版の変換
- tests：Vitest（決定性・棋譜・セーブ・読み取り・無茶な書き換え・総当たり・ルール・無限の世界・くり返す十年・結末・実績・印と試練（marks）・開いていく順番（unlocks）・人々の心・読み分け・情景・序章の手引き（prologue）・世界の終わりまで・筆の位・明るさの比・画面の言葉・手触りの目安・ルール本体の純粋さ（core-purity）・内容のデータ（data）・画面の呼び名（names）・言い切りの強さ（roles）・消した行（voids）・入力の補助（wording）・ノートの辞書と地図と前回の線（notes）・演出の散り方（fx））
- e2e：Playwright（app.spec.ts・screens.spec.ts・演出中のコマ数 perf.spec.ts）
- scripts：シミュレーター（npm run sim）と作戦・ボット（strategies.ts・bots.ts・run.ts。無限の世界のボットは endless.ts）、結末の筋書き（worlds.ts）、読み取りの総当たり（fuzz.ts）、筆の位で遊べるかの確かめ（ranks.ts）、作り手の解（par.ts・designer.ts）、組み合わせの総当たり（combos.ts）、読み取りの穴（corpus.ts）と逆の読み取り（polarity.ts）、紹介用の PV（pv/：撮影 record.ts・舞台 stage.html・書き出し encode.ts と mp4.ts・コマの取り出し frames.ts・BGM の小節 beats.ts）
- docs：SPEC.md、PLAN.md（企画書）、ANALYSIS.md、IMPROVE.md、PROMPTS.md、BASELINE.md（直す前の数字）、WORKPLAN.md（作業計画）、TERMS.md、SOURCES.md、design/（画面設計の見本）、screens/（スクリーンショット）
- scripts/out：git に入れない作業の出力と、使い捨ての確かめ（型の確認には入るので、使い終えたら消す）

## コマンド

- npm run dev：開発用サーバー（http://localhost:5174/world-txt/）
- npm test：Vitest
- npm run typecheck：型の確かめ（npm run build の最初にも走る）
- npm run e2e：Playwright
- npm run screens：主な画面のスクリーンショットを docs/screens/ に保存（暗い画面と、L で始まる明るい画面）
- npx playwright test --config playwright.perf.config.ts：演出中の1秒あたりのコマ数（CPU を4倍遅くして）
- npm run build：公開用のビルド（npm run preview で公開用のビルドを手元で開く）
- npm run sim -- food all 30：作戦ごとのクリア率（ステージは prologue / food / plague / climate / war / energy / tiny / loop）
- npm run sim -- endless all 30：無限の世界で、ボットごとに文明が何年続いたか（何もしない・でたらめ・最初だけ備える・危機の知らせを読んで防ぐ）
- npm run sim -- intro 30：はじめて遊ぶ世界で、紹介前の決まりが負けの主な原因になった割合（敗因の振り返りのいちばん上）
- npx tsx scripts/bots.ts read all 30：見立てるボットのクリア率と、型と作戦の表
- npx tsx scripts/bots.ts all 30：操作を絞った作戦（書き換えだけ・書き足しだけ・2種類だけ など）と決まった手順の最善（SPEC 5章）
- npx tsx scripts/corpus.ts・npx tsx scripts/polarity.ts：初めての人が書きそうな文の通じる割合と、逆の意味に読まれる文
- npx tsx scripts/par.ts all 30：型ごとの作り手の解が、どの世界番号で通るか（手数）
- npm run worlds：宇宙・重力・宇宙人・不死などの書き換えの筋書きを遊んで、どの結末になるかを数える（npm run worlds -- gravity 1 で年表）
- npm run fuzz：いろいろな単語をいろいろな位置に入れた約2万文の読み取りの総当たりと、棋譜から作り直した世界の一致（例外・数値の破綻・怪しい読み取り・棋譜のずれを数える。0 を保つ）
- npm run sim -- food few_days_only 1：年表を見る
- npm run ranks：どのステージも、はじめて遊べる筆の位で作戦が止まらず、クリアできる作戦があるか（npm run ranks -- 30 で種30個）
- npx tsx scripts/pv/record.ts → npx tsx scripts/pv/encode.ts：紹介用の PV（暗い画面・縦1080×1920・約97秒）を pv/laplace-garden-pv.mp4 に作る（先に npm run dev を動かす。録るのはページが描いたコマだけで、画面全体は録らない。出力の pv/ は git に入れない）

## 作業の進め方

- 変更したら npm test と npm run e2e を通してから報告する
- 画面を変えたら npm run screens で撮り直し、崩れがないか自分で確かめる（docs/design/ の見本と見比べる）
- 数値を変えたら npm run sim と見立てるボットで測り、SPEC 5章の目安から外れていないか確かめる。外れたら SPEC の実測値も直す
- UI の文言と報告は日本語で書く
