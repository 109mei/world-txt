# 画面設計の試作（24画面）

スマホ（390×844）の画面の見本です。暗い画面12枚と、明るい画面12枚があります。

- **HTML** はブラウザで開くと、ボタンやタブを押して画面どうしを行き来できます。
- **PNG** は2倍の解像度の画像です。
- 文字は Google Fonts（Cormorant Garamond としっぽり明朝）を読み込みます。ゲーム本体では、今の読み込みの決まり（CSP）に従ってください。
- 動きは「何か起きたときだけ」の決まりで作っています。HTML を開くと、その画面で起きる1回ぶんの動きだけが再生されます。PNG は動き終わった形です。

| 番号 | 画面 | 暗い画面 | 明るい画面 | 分析の章（docs/ANALYSIS.md） |
| --- | --- | --- | --- | --- |
| 1 | 世界（メイン） | Main.html・Main.png | MainLight.html・MainLight.png | 12章 |
| 2 | 法則（WORLD.txt） | Text.html・Text.png | TextLight.html・TextLight.png | 2・12章 |
| 3 | 書く（世界の読み） | Write.html・Write.png | WriteLight.html・WriteLight.png | 5・12章 |
| 4 | 計算（時間を進める） | Compute.html・Compute.png | ComputeLight.html・ComputeLight.png | 11・12章 |
| 5 | 因果の連鎖と結果 | Chain.html・Chain.png | ChainLight.html・ChainLight.png | 11・12章 |
| 6 | ノート（因果の地図） | Notebook.html・Notebook.png | NotebookLight.html・NotebookLight.png | 6・12章 |
| 7 | 結末 | Ending.html・Ending.png | EndingLight.html・EndingLight.png | 6・11・17章 |
| 8 | 敗因の振り返り | Defeat.html・Defeat.png | DefeatLight.html・DefeatLight.png | 3・12・18章 |
| 9 | 柱の中身（命と人々の心） | Mind.html・Mind.png | MindLight.html・MindLight.png | 7・12章 |
| 10 | 世界を選ぶ（開いていく順番） | Stages.html・Stages.png | StagesLight.html・StagesLight.png | 13・17章 |
| 11 | 記録と実績（ノート） | Records.html・Records.png | RecordsLight.html・RecordsLight.png | 17章 |
| 12 | メニュー（セーブと設定） | Menu.html・Menu.png | MenuLight.html・MenuLight.png | 12・18章 |

## 見本として守ること

- 見やすさの決まりは docs/ANALYSIS.md の12章「見やすさの点検」にあります。一目で追うのは寿命と4つの柱、動くのは何か起きたときだけ、絵文字や字の記号は使わず線のアイコンに言葉を添える、図は同じ物差しの上の位置で比べる、の4つです。
- 明るい画面の色は、同じ12章の「明るい画面」の表にあります。色の役割は暗い画面と同じです。
- 実績とやりこみ（3つの印・図鑑・番号で開く）は17章、セーブ（メニュー・棋譜）は18章です。
- 数字や文は見本用の例です（世界番号 #0007・食料危機・12年目）。本当の値はゲームの計算から出してください。
