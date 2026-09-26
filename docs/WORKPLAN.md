# 作業計画（WORKPLAN）

2026-09-26 作成（P0）。docs/IMPROVE.md の8章「進め方」の11段階と、docs/PROMPTS.md の P1〜P23 を対応させ、段階ごとに触るファイルと通すコマンドをまとめた。今の数字は docs/BASELINE.md（commit 62c2aa5 で測った）。

- 貼る順番は PROMPTS.md の「順番の目安」に従う。IMPROVE.md の段階の番号とは、順番が一部入れ替わる（2章）
- どの段階でも CLAUDE.md（設計・安全・見た目の決まり）を守る
- 計画書どうしの食い違いと、まだ決まっていないことは4章。その段階に入る前に決める

## 1. 11段階とプロンプトの対応

| 段階 | 中身（IMPROVE 8章） | プロンプト | 確かめ（IMPROVE 8章） |
| --- | --- | --- | --- |
| 1 公平さの土台 | 5章の1〜8、遊んでいる間の乱数をなくす | P1・P2・P3・P7 段階1・P17 | 回帰テスト・呼び名のテスト・fuzz の怪しい読み取り0・core に乱数の呼び出し0 |
| （測る道具） | 組み合わせの総当たり・操作を絞ったボット | P4・P5 | 段階2〜5の目標を測る物差し（IMPROVE 8章の段階には入っていない） |
| 2 削除を変える | 空白・消し跡・支えている行 | P7 段階2 | 消すだけ 0% |
| 3 3つの役割 | 言い切りと反動の比例・上書きの傷・書き足しが要る壁 | P7 段階3 | 書き換えだけ5%以下・2種類だけ15%以下（段階5のあとに測り直す） |
| 4 考える仕組み | 原因の型・世界の適応・必ず来る反動・危機の重ね・書換の力 | P7 段階4 | 決まった手順15%以下・見立てるボットが最善60〜70% |
| 5 テーマの軸 | 全ステージで容量が縮む・手放す行を足す | P7 段階5 | どのステージでも最善の作戦が容量を使い切る |
| 6 読み分け | 性質・制度・条件つき | P10 | 3つの読まれ方それぞれに勝ち筋がある。国家を消した世界では制度の文が効かない |
| 7 人々の心 | 慣れ・損の重さ・信頼・先行きの不安・考え方の広がり | P15 | 1年での悪化が10年かけた悪化より大きく揺れる。書く順番で結果が変わる |
| 8 社会の学問と兆し | 遅れと行きすぎ・戻りの遅さ・感染の波・限りを超えた崩れ・戦争を条件で起こす | P12・P16 | どの崩れにも前の年までに兆しが出ている。乱数で始まる出来事0 |
| 9 画面と演出 | 画面の言葉・情景・現実では・演出・見やすさ・明るい画面 | P13・P14・P11・P19・P8・P20・P21 | 常用漢字の外の字0・名前なしの絵で施設を8/10言い当てる（人の試し遊び）・何もない間に動くもの0・絵文字と字の記号0・明るい画面でも4.5:1以上 |
| 10 開いていく順番 | 1回に1つずつ開く・実績とやりこみ | P18・P22 | 新しく覚えることは1つ・紹介前の決まりが主な敗因になる割合0%・作り手の解が印の手数以内で通る |
| 11 仕上げ | 5章の9・あそびかたの書き直し・SPEC の目安の更新・セーブと棋譜 | P23・P9（5章の9の一部と、あそびかたの書き直しはプロンプトなし。4章） | screens に崩れなし・棋譜から作り直した世界が一致・古い版のセーブが読める |
| いつでも | 不具合 | P6 | 再現手順を回帰テストにする |

## 2. 貼る順番

PROMPTS.md の「順番の目安」どおり。右の列は、その前に済んでいる必要があるもの。

| 順 | プロンプト | 段階 | 前に済ませるもの |
| --- | --- | --- | --- |
| 0 | P0 | — | — |
| 1 | P1 → P2 → P3 | 1 | — |
| 2 | P7 段階1・P17 | 1 | P1〜P3 |
| 3 | P4 → P5 | 測る道具 | P17（種30個を世界番号30個に読み替えてから測る） |
| 4 | P7 段階2 → 段階3 → 段階4 → 段階5 | 2〜5 | P4・P5 |
| 5 | P10 | 6 | 段階1・P17 |
| 6 | P15 → P12 → P16 | 7・8 | P15 は P10 のあと |
| 7 | P13 → P14 → P11 | 9（前半） | — |
| 8 | P18 | 10（前半） | 学問の仕組みがそろっている（P12・P15・P16） |
| 9 | P19 → P8 → P20 → P21 | 9（後半） | P20 は P19・P8 のあと、P21 は P20 のあと |
| 10 | P22 → P23 | 10（後半）・11 | P22 は P18・P21 のあと、P23 は P22 のあと |
| 11 | P9 | 11 | すべて |

IMPROVE 8章の番号との違い：段階9の後半（P19・P8・P20・P21）が段階10の前半（P18）のあとに来る。P4・P5 はどの段階にも入っていない（測る道具）。

## 3. 段階ごとに触るファイルと通すコマンド

＋は新しく作るファイル。行番号は commit 62c2aa5 のもの。

### 通すコマンド（CLAUDE.md の決まり）

| いつ | コマンド |
| --- | --- |
| 毎回 | `npm test`・`npm run e2e` |
| 画面を変えたら | `npm run screens`（撮った画像を自分で見る） |
| 数値・ルールを変えたら | `npm run sim -- <ステージ> all 30`（food・plague・climate・war・energy・tiny・loop）・`npm run sim -- endless all 30`・`npm run ranks` |
| 読み取りを変えたら | `npm run fuzz`（例外・数値の破綻・怪しい読み取りを0に保つ） |
| 結末に関わるとき | `npm run worlds` |
| 入れる物やビルドの形を変えたら | `npm run build` |

下の表の「全部」は、`npm test`・`npm run e2e`・`npm run screens`・`npm run sim`（7ステージと endless）・`npm run ranks`・`npm run fuzz`。

### 段階1 公平さの土台

| プロンプト | 触るファイル | 通すコマンド |
| --- | --- | --- |
| P1 読み取りの穴 | ＋scripts/corpus.ts、src/data/lexicon.json・phrases.json・laws.json（match）、tests/interpret.test.ts | `npm test`・`npm run fuzz`・`npm run sim` |
| P2 逆の読み取り | ＋scripts/polarity.ts、src/data/phrases.json・laws.json、tests/wild.test.ts | `npm test`・`npm run fuzz` |
| P3 呼び名 | ＋tests/names.test.ts、src/data/phrases.json・laws.json（match） | `npm test`・`npm run fuzz` |
| P7 段階1 | src/core/write.ts（write・commit）、src/core/interpret.ts（normalize・noiseOf・unknownWords）、src/core/game.ts（大きく崩れた年の cause）、src/ui/sheets/EditSheet.tsx（世界に届かない言葉・世界の読みの帯）、src/store/runtime.ts・game.ts（同じ世界でもう一度）、src/ui/screens（静かな年は約0.4秒で、結果を出さずに戻る）、形を変えたら upgradeState（src/core/game.ts）・src/save/migrations.ts・src/save/schema.ts、docs/SPEC.md | 全部 |
| P17 乱数をなくす | src/core/rng.ts（core から呼べなくする）、src/core/game.ts（546・602・620・624・660・724行）、src/core/model.ts（457行の戦争の始まり）、src/core/types.ts（起きる力などの新しい状態）、src/data/events.json（chance が1未満の19件と chanceChannel）・crises.json・anomalies.json、src/ui/se.ts（35行の Math.random）、src/store/runtime.ts（dailySeed・世界番号）、scripts/sim.ts・bots.ts・endless.ts・worlds.ts・ranks.ts・fuzz.ts（種 → 世界番号）、tests/determinism.test.ts・core-purity.test.ts、upgradeState・migrations・save/schema.ts、docs/SPEC.md 3.5、CLAUDE.md 設計の決まり2 | 全部＋`npm run worlds` |

### 測る道具

| プロンプト | 触るファイル | 通すコマンド |
| --- | --- | --- |
| P4 組み合わせの総当たり | ＋scripts/combos.ts、＋scripts/out/combos-<stage>.csv（.gitignore に足すかは4章） | `npx tsx scripts/combos.ts`（npm の命令はまだない。数時間かかる見込み） |
| P5 操作を絞ったボット | scripts/bots.ts（今は playRandom だけ）、tests/feel.test.ts（it.todo で目安）、docs/SPEC.md 5章 | `npm test`・`npm run sim` |

### 段階2 削除を変える（P7 段階2）

| 触るファイル | 通すコマンド |
| --- | --- |
| src/core/types.ts（空白の行と、空白になった年）、src/core/write.ts・game.ts（空白・世界が埋める・消し跡・支え）、src/data/laws.json（voidFill・supports と、その why・onset・scene）、src/data/balance.json（埋まるまでの年数・消し跡の割合）、src/data/schema.ts、src/store/view.ts と定義のタブ（「空白　あと◯年で世界が埋める」）、src/data/scene.json・src/ui/scene（空白の描き方）、upgradeState・migrations・save/schema.ts、docs/SPEC.md | 全部＋`npm run worlds`、P5 の「消すだけ」ボット |

### 段階3 3つの役割（P7 段階3）

| 触るファイル | 通すコマンド |
| --- | --- |
| src/data/lexicon.json・phrases.json（言い切り・絞る言葉。言葉はデータに置く）、src/core/interpret.ts（読み取りの形だけ）、src/data/laws.json（incoherence・twists の rate）、src/data/balance.json（強さと反動の比例・上書きの傷）、src/core/write.ts・game.ts（上書きの傷・短く言い換えは1行に1度）、src/data/stages.json・events.json（書き足しが要る壁）、scripts/strategies.ts（3種類を使う作戦）、tests/feel.test.ts | 全部＋P4・P5 |

### 段階4 考える仕組み（P7 段階4）

| 触るファイル | 通すコマンド |
| --- | --- |
| src/data/stages.json（原因の型、edits の start・every）、src/core/game.ts・model.ts（型ごとの初期条件・世界の適応・必ず来る反動・危機の重ね）、src/data/events.json・twists.json・balance.json、src/store/view.ts と世界の画面（最初の3年で見分けられる兆しを2つ以上）、scripts/bots.ts（決まった手順のボット・見立てるボット）、scripts/strategies.ts（型ごとの作戦）、tests/feel.test.ts | 全部＋P4・P5 |

### 段階5 テーマの軸（P7 段階5）

| 触るファイル | 通すコマンド |
| --- | --- |
| src/data/stages.json（capacityDecay を全ステージに。今あるのは climate・tiny・loop・endless だけ）、src/data/laws.json（芸術・宗教・家族・遊びの行を足す。季節 seasons・睡眠 human_sleep は今ある行）、src/data/concepts.json・access.json（新しい概念をどれかの分野に。CLAUDE.md 決まり10）・phrases.json・scene.json・src/ui/scene（onset と scene。決まり9）、scripts/strategies.ts、tests/access.test.ts・feel.test.ts | 全部＋P4・P5（段階3の目標も測り直す） |

### 段階6 読み分け（P10）

| 触るファイル | 通すコマンド |
| --- | --- |
| src/data/phrases.json（mode）・schema.ts、src/data/lexicon.json（制度・条件つきの語尾。CLAUDE.md 決まり4でコードに言葉を増やさない）、src/core/interpret.ts（語尾から mode を決める形。NOT_NEG・NEEDS_G と矛盾させない）、src/data/balance.json（mode ごとの効き）、src/core/model.ts・game.ts、src/ui/sheets/EditSheet.tsx（読まれ方の札）・定義のタブ・結末、tests/interpret.test.ts（語尾の表）・wild.test.ts | 全部 |

### 段階7 人々の心（P15）

| 触るファイル | 通すコマンド |
| --- | --- |
| src/core/model.ts（慣れた基準・損の重さ・信頼・先行きの不安・考え方の広がり・締め出し）、src/core/types.ts（新しい状態）、src/data/balance.json（係数の幅）、src/data/indicators.json（状態語）、src/store/view.ts・src/ui/sheets/IndicatorSheet.tsx（柱の中身の人々の心）、upgradeState・migrations・save/schema.ts、tests（1年と10年の悪化・書く順番・買いだめ）、docs/SPEC.md 5章 | 全部 |

### 段階8 社会の学問と兆し（P12・P16）

| 触るファイル | 通すコマンド |
| --- | --- |
| src/core/model.ts（効きの遅れ・柱の重さ・戻りの遅さ・対数の幸福・用心・限りを超えた崩れ・期待とのずれ・なだれ・安全保障のジレンマ・人口転換）、src/data/balance.json・laws.json（行ごとの遅れ。今の delay は副作用 twists にだけある）、src/core/game.ts（兆しの知らせ）、src/store/view.ts と世界・書く画面（「効き始めまで、あと◯年」「戻りが遅い」）、tests/feel.test.ts（崩れる前に兆し）、ノートの「現実では」（出典） | 全部＋`npm run worlds` |

### 段階9 画面と演出

| プロンプト | 触るファイル | 通すコマンド |
| --- | --- | --- |
| P13 画面の言葉 | ＋docs/TERMS.md、src/ui の文言を1か所に（src/ui/screens/Game.tsx のタブ「世界・定義・歴史」など）、src/ui/Tutorial.tsx・知らせ・結末の文、＋常用漢字のテスト、e2e/*.spec.ts（画面の文言で探している所） | `npm test`・`npm run e2e`・`npm run screens` |
| P14 情景 | src/ui/scene/*（common.tsx ほか）・src/data/scene.json、tests/scene.test.ts・scene-render.test.ts | `npm test`・`npm run screens`、コマ数 |
| P11 現実では | src/data/laws.json（fact）・events.json・twists.json・endings.json・combos.json・crises.json（why）に source と asOf、src/data/schema.ts、src/store/records.ts（ノートの辞書で出典）、docs/SPEC.md | `npm test`・`npm run e2e` |
| P19 PixiJS | package.json（pixi.js の版を固定）、＋演出の部品（動的 import）、vite.config.ts（CSP は変えない。確かめるだけ）、CLAUDE.md・docs/SPEC.md の「PixiJS は入れない」 | `npm run build`（大きさ）・`npm run e2e`（CSP）・`npm run screens`、コマ数 |
| P8 演出 | src/ui（計算・因果の連鎖。Web Animations API）、src/ui/se.ts（効果音）、src/ui/styles.css | `npm run e2e`・`npm run screens`、コマ数 |
| P20 見やすさ | src/ui/*（「1年進める」1つ・寿命の棒1本・柱・図）、src/ui/styles.css（infinite をなくす）、アイコン（lucide-react がもう入っている。線の太さ1.5にする）、src/data/indicators.json（levels の3つ目が調子）、CLAUDE.md 見た目の決まり（⇈ ↗ → ↘ ⇊） | grep・`npm test`・`npm run e2e`・`npm run screens` |
| P21 明るい画面 | src/ui/styles.css（色の変数を2組）、src/ui/sheets/MenuSheet.tsx（画面の明るさ）、設定の保存（save/schema.ts・migrations）、index.html（color-scheme・theme-color）、src/ui/scene（昼の絵）、playwright.screens.config.ts（colorScheme）、＋明るさの比のテスト、CLAUDE.md・docs/SPEC.md | `npm test`・`npm run e2e`・`npm run screens`（暗い・明るい） |

### 段階10 開いていく順番

| プロンプト | 触るファイル | 通すコマンド |
| --- | --- | --- |
| P18 開いていく順番 | ＋src/data/unlocks.json・schema.ts、src/core（紹介済み・紹介前は強さ3割・初めて起きたこと）、src/data/access.json・stages.json（unlock）、src/store/pen.ts・世界を選ぶ画面・ノート、progress（save/schema.ts・migrations）、tests | 全部 |
| P22 実績とやりこみ | progress.best（3つの印）、src/data/achievements.json（kind）、src/data（作り手の解の手数）、src/data/stages.json（改稿者の試練）、src/store/records.ts・ノートの「記録」、世界を選ぶ画面（番号で開く）・共有文、save/schema.ts・migrations、tests/achievements.test.ts | `npm test`・`npm run sim`・`npm run e2e`・`npm run screens` |

### 段階11 仕上げ

| プロンプト | 触るファイル | 通すコマンド |
| --- | --- | --- |
| P23 セーブと棋譜 | src/save（ホーム画面への追加の案内・ファイルで書き出し・棋譜。MAX_SAVE_CHARS）、＋src/core の棋譜から世界を作り直す関数、src/ui/sheets/MenuSheet.tsx・結末・敗因の振り返り（再生・分かれ道からやり直す）、migrations、tests/save.test.ts、scripts/fuzz.ts（棋譜） | `npm test`・`npm run e2e`・`npm run fuzz` |
| （プロンプトなし） | 5章の9のうち「字数を『7字＋重さ25』のように分けて出す」、あそびかたの書き直し（序章「ひと区画の庭」） | 4章で決める |
| P9 見直し | docs/SPEC.md（1章の件数・5章の目安と実測・9章）、docs/screens | 全部＋`npm run worlds`・`npm run build` |

## 4. 先に決めること

計画書から読み取れない、または計画書どうしで食い違う所。くわしくは P0 の報告。

| いつまでに | 決めること |
| --- | --- |
| P1 まで | 5章の5「結果を願う文を願いとして重く読む」をどのプロンプトで入れるか（P1 は読めるようにするだけ） |
| P7 段階1 まで | 「同じ世界でもう一度」は同じ種か世界番号か（P17 と合わせるなら世界番号）。静かな年の約0.4秒は P7 段階1・P8・P20 の3か所にあるので、どこで作るか |
| P17 まで | 確率の低い出来事（火山0.012・太陽フレア0.015・地震0.03・新しい病原体0.035・干ばつ0.06）を「起きる力をためる」形にしたとき、30〜50年のステージで一度も起きない・毎回同じ年に起きる、をどう避けるか。原因の型はまだないので、世界番号から作るのは段階4か。戦争の始まりは P16 より前なので、P17 ではつなぎの式にするか。世界番号の範囲と書き方（今は32ビットの種、見本は #0007）。CLAUDE.md 決まり2の書き直し |
| P4 まで | scripts/out を .gitignore に足すか。総当たりの規模（今の書き方だと数時間） |
| 段階4 まで | 書換の力を絞るとき（3→2、5年→7年）、極小世界（start 4・every 3・max 6）をどうするか。どの世界番号にも勝ち筋を残すか（作り手の解がどの番号でも通ること と、最善60〜70% の関係） |
| 段階5 まで | 足す行（芸術・宗教・家族・遊び）と、今ある季節・睡眠の扱い。「48行」と書いた文書の直し |
| P12・P15・P16 まで | 紹介前は強さ3割（P18）に備えて、足す仕組みにはじめから強さの係数をデータで持たせるか |
| P13 まで | 題『ラプラスの庭』への変更（index.html・manifest・タイトル画面・共有文）をどのプロンプトで行うか。「歴史」のタブの行き先。「重さ → 効き目」の意味（今の重さは字数に換えた概念の重さ）と、数字で出すか（CLAUDE.md の「ゲーム的な数値は出さない」、分析12章の「効き目+12」） |
| P18 まで | 感染症・気候危機を開く時期（分析3章は「はじめ」、13章は「食料危機を1回遊んだ」、今のコードは「はじめ」）。序章をどのプロンプトで作るか。「新しく開く考えは1つ」の数え方（13章の1行に、学問の仕組みが1〜4個入る） |
| P23 まで | 規則の版の付け方（データを変えるたびに棋譜が再生できなくなる） |

## 5. 基準の数字

docs/BASELINE.md。段階が終わるたびに、同じコマンドで測って比べる。P17 のあとは「種 1000〜1029」を「世界番号30個」に読み替える。
