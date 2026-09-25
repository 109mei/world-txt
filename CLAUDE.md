# WORLD.txt（世界再定義）開発の決まり

世界を定義している文章を自由に消す・書き換える・書き足すことで人類文明を存続させる、スマホ縦画面のブラウザゲーム。仕様は docs/SPEC.md、元の企画は docs/PLAN.md。

## 構成

| 役割 | 使うもの |
|---|---|
| 土台 | Vite |
| 言語 | TypeScript（strict） |
| ルール本体 | src/core の Pure TypeScript。DOM・React・Zustand・localStorage・Math.random・Date.now を使わない |
| 数値と内容 | src/data の JSON＋Zod（型は Zod のスキーマから作る） |
| 画面の部品 | React＋HTML/CSS（src/ui） |
| 橋渡し | Zustand（src/store）。画面に見せる写しだけを持つ |
| セーブ | src/save の SaveStore（localStorage。版番号つき） |
| テスト | Vitest（tests/）、Playwright（e2e/、390×844） |
| 公開 | GitHub Actions → GitHub Pages（https://109mei.github.io/world-txt/。Vite の base は '/world-txt/'） |

入れていないもの：PixiJS（世界は文字とアイコンで表すため）、vite-plugin-pwa、Dexie、Web Worker。

## 設計の決まり（必ず守る）

1. ゲームの状態の持ち主は src/core だけ。書き換えは命令（rewriteLaw・addLine・rewriteLine・advance）を core に渡して行う
2. 乱数は種つきの疑似乱数を core の状態に持たせ、同じ種・同じ書き換えなら同じ結果にする
3. プレイヤーには選択肢も予測も見せない。書き換えは自由な文章で行い、結果は時間を進めて初めてわかる
4. 文章の意味は src/core/interpret.ts が語彙の手がかりから読み取る。読み取りの規則は laws.json の match・subject・topic と phrases.json に置き、コードに言葉を増やさない（言葉の種類・語尾・英語は lexicon.json）。書き足した文章が既存の行と同じものについての文なら、その行の書き換えとして読む。種類ごとの読み取り（generic）は、ほかに何も読めなかったときだけ当てる。意味が伝わらない文では、世界は何も変わらない
5. 因果は現実の仕組みに沿わせる。想定外の変化（副作用・出来事）には、現実の根拠を「なぜ？」（why）として一文で添える。数字は「約」をつけ、確かなものだけを使う。どの行から来たか（cause）は core が付ける
6. 見つけたもの（読み取り・副作用・出来事・結末など）は core が GameState.found に残し、runtime が観測記録（progress.discovered）へ移す。新しい内容を足したら、観測記録にも自動で並ぶ
7. 数値をコードに直接書かない。balance.json などのデータに置く
8. セーブには版番号を入れ、古い版から新しい版へ変換する関数（src/save/migrations.ts）を用意する。GameState に項目を足したら、古い形を補う処理（core の upgradeState）も足す

## 見た目の決まり

- 黒と銀のモノクロ（写本・ゴシック調）。色は状態の良し悪しと「書き換えたインク」にだけ使う
- 書体は Cormorant Garamond（欧文・数字）としっぽり明朝（和文）
- 状態は状態語と ⇈ ↗ → ↘ ⇊ で伝え、ゲーム的な数値（74/100 など）は出さない
- 押せる物は44px以上

## フォルダ

- src/core：ルール本体（状態・進行・命令・読み取り・乱数）
- src/data：JSON と Zod のスキーマ
- src/store：Zustand と写し（view）、観測記録の写し（records）、無限の世界の記録簿（ranking）
- src/ui：React の部品と CSS、タイトルの絵、BGM、共有画像（shareImage）、入力の補助（wording）
- src/save：SaveStore
- tests：Vitest（決定性・セーブと記録簿・読み取り・無茶な書き換え（wild）・総当たり（fuzz）・ルール・無限の世界（endless）・くり返す十年（loop）・結末（endings）・実績（achievements）・入力の補助（wording）・手触りの目安）
- e2e：Playwright
- scripts：シミュレーター（npm run sim）と作戦・ボット（無限の世界のボットは endless.ts）、結末の筋書き（worlds.ts）、読み取りの総当たり（fuzz.ts）
- docs：SPEC.md、PLAN.md（企画書）、screens/（スクリーンショット）

## コマンド

- npm run dev：開発用サーバー（http://localhost:5174/world-txt/）
- npm test：Vitest
- npm run e2e：Playwright
- npm run screens：主な画面のスクリーンショットを docs/screens/ に保存
- npm run build：公開用のビルド
- npm run sim -- food all 30：作戦ごとのクリア率（ステージは food / plague / climate / war / energy / tiny / loop）
- npm run sim -- endless all 30：無限の世界で、ボットごとに文明が何年続いたか（何もしない・でたらめ・最初だけ備える・危機の知らせを読んで防ぐ）
- npm run worlds：宇宙・重力・宇宙人・不死などの書き換えの筋書きを遊んで、どの結末になるかを数える（npm run worlds -- gravity 1 で年表）
- npm run fuzz：いろいろな単語をいろいろな位置に入れた約2万文の読み取りの総当たり（例外・数値の破綻・怪しい読み取りを数える。読み取りを変えたら 0 を保つ）
- npm run sim -- food few_days_only 1：年表を見る

## 作業の進め方

- 変更したら npm test と npm run e2e を通してから報告する
- 画面を変えたら npm run screens で撮り直し、崩れがないか自分で確かめる
- 数値を変えたら npm run sim で測り、SPEC 5章の目安から外れていないか確かめる。外れたら SPEC の実測値も直す
- UI の文言と報告は日本語で書く
