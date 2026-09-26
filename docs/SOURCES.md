# 出典（現実の数字と「なぜ？」の根拠）

画面に出る現実の数字と、想定外の変化・出来事・結末に添えた「なぜ？」の根拠を、出典と照らし合わせた記録です（2026年9月に確かめた）。
ゲームの中では、ノートの「出典」で法則の「現実では」と出典を見られます（src/data/sources.json）。

- **確認済み**：出典の数字・事実と合っている（一致）。ずれていたものは、出典に合わせて本文を直した（直した）。
- **要確認**：出典が見つからない・確かめきれない。
- **年に1度の見直し**：数字は古くなる（人口・軍事費・発電の割合など）。年に1度、「数字の年」が古いものから出典を開き直し、この表と sources.json を更新する。

確かめた項目 238：一致 205・直した 28・要確認 5

## 直したもの（出典とずれていたので、2026年9月に本文を出典に合わせた）

| 項目 | 前の文 | 直した文 | 理由（出典の値） |
| --- | --- | --- | --- |
| laws/plant_grow/fact | 農業は世界の淡水利用の約7割を使う。陸に降る雨の多くは、植物が葉から出す水蒸気から生まれる。 | 農業は世界の淡水利用の約7割を使う。陸に降る雨の約4割は陸から蒸発した水で、その半分余りは植物が葉から出す水蒸気だ。 | 陸の雨のうち陸からの蒸発がもとになるのは約40%。陸の蒸発散のうち植物の蒸散は約57%。植物由来は陸の雨の約4分の1なので、「多く」は言い過ぎ |
| laws/plant_co2/fact | 陸の植物と土は、人間が出す二酸化炭素の約3割を吸収している。 | 陸の植物と土は人間が出す二酸化炭素の約2〜3割を吸収している | IPCCは31%（2010〜19年）。最新の世界炭素収支2025は21%（2015〜24年）。幅で書けばどちらにも合う |
| laws/ocean_co2/fact | 海は、人間が出す二酸化炭素の約4分の1を吸収している。 | 海は人間が出す二酸化炭素の約4分の1〜3割を吸収している | IPCCは23%（2010〜19年）。最新の世界炭素収支2025は29%（2015〜24年）に引き上げた |
| laws/fire_burn/fact | 世界では約23億人が、薪や炭などを燃やして料理をしている。山火事の多くは人の火の不始末から起きる。 | 世界では約21億人が薪や炭などを燃やして料理をしている。山火事の多くは人の火の不始末から起きる。 | WHOの最新の数字は約21億人（世界の約4分の1）で、約23億人は古い数字。米国の山火事の84%は人が起こした火（放火を含む） |
| laws/electric/fact | 送電の途中で、電気の1割近くが熱として失われている。 | 送電と配電の途中で電気の約7%が電線の熱などで失われている | 世界平均は2023年7.0%、2024年6.5%。8%台だったのは2000年代（2005年8.7%）。盗電の分も含む |
| laws/nation/fact | 世界には約200の国があり、生まれた国の外で暮らす人は約2億8000万人いる。 | 世界には約200の国があり、生まれた国の外で暮らす人は約3億人いる | 国際移民は2024年に3億400万人（約2億8000万人は2020年版の数字）。国連加盟国は193、オブザーバー国を足すと195 |
| laws/war/fact | 世界の軍事費は、世界のGDPの約2%にあたる。 | 世界の軍事費は世界のGDPの約2.5%にあたる | 2025年は2.5%（2009年以来の高さ）。2024年は2.4% |
| laws/weapons/fact | 第二次世界大戦の死者は約6000万〜8000万人とされる。兵器の破壊力は、この100年で桁違いに大きくなった。 | 第二次世界大戦の死者は約6000万人とされ、もっと多いとする推計もある。兵器の破壊力はこの100年で桁違いに大きくなった。 | 博物館の数字は約5500万人と、戦死1500万人＋民間人4500万人＝約6000万人（推計の幅は大きいと注記あり）。8000万人を示す公的な出典は見つからない |
| events/s3_permafrost/why | 永久凍土には、大気中のおよそ2倍の炭素が眠っているといわれる。一度溶け始めると止められない。 | 永久凍土の地域には大気中の2倍近い炭素が眠っている。解けて出た炭素は、数百年は元に戻らない。 | 凍土の地域の土に1460〜1600PgC（大気は約900PgCなので約1.6〜1.8倍）。IPCCは「解けた後に失われた炭素は百年単位で元に戻らない」とし、放出はゆっくり続くとみている。「溶け始めると止められない」とは言っていない |
| events/lockdown/why | 2020年には、世界中で国境と工場が閉じられ、物の流れが止まった。 | 2020年には世界中で国境と工場が閉じられ、物の流れが大きく滞った | 2020年4月には全ての旅行先が渡航を制限した。一方、世界の物品貿易量は2020年に5.3%減、4〜6月期も前年比15.0%減にとどまり、「止まった」は言い過ぎ |
| events/green_revolution/why | 1960年代の「緑の革命」では、新しい品種と肥料で穀物の収量が2〜3倍になった。 | 1960年代に始まった「緑の革命」では、新しい品種と肥料で、穀物の収量がその後40年ほどで2〜3倍になった | 途上国の収量は1960〜2000年に小麦+208%・米+109%・トウモロコシ+157%（2〜3倍）。1960年代の10年間だけでの伸びではない |
| events/s4_arms_spending/why | 世界の軍事費はGDPの約2%。緊張が高まるほど増え、ほかの予算を圧迫する。 | 世界の軍事費はGDPの約2.5%。緊張が高まるほど増え、ほかの予算を圧迫する。 | 2025年は2.5%。後半の文は、SIPRIの「軍事を優先し、ほかの予算を犠牲にしがち」という指摘と合う |
| events/iron_gone_note/why | 人がつくる金属の約9割は、鉄だとされる。 | 人がつくる金属の重さの約95%は鉄と鋼だとされる | USGS は「毎年つくられる金属の重さの約95%が鉄と鋼」。Geoscience Australia も「鉄（鋼）はほかの金属すべてを合わせた約20倍使われる」（約95%にあたる）。差は小さいが、約9割は少なめ |
| events/no_sight_note/why | 世界では約4300万人が、目が見えないとされる（WHO）。 | 世界では約4300万人が目が見えないとされる（2020年の推計） | 数字は論文の値（2020年に4330万人）と合う。ただし WHO のファクトシート（2026年2月）に失明者の数はなく、WHO「世界視覚報告」（2019）は3600万人。「WHO」という出典名が合わない |
| events/black_hole_void_note/why | いちばん近いと知られているブラックホールでも、地球から約1500光年離れている。 | いちばん近いと知られているブラックホールでも地球から約1600光年離れている | Gaia BH1。NOIRLab と CfA の発表はどちらも「約1600光年」。1560光年とする資料もある。差は小さい |
| events/f_market_break/why | 買いだめと輸出の禁止が重なると、市場そのものが動かなくなる（2008年の食料価格の高騰では、30か国以上が輸出を制限した）。運ぶ道や配る仕組みがないと、届かない地域が飢える。 | 買いだめと輸出の禁止が重なると、市場そのものが動かなくなる（2007〜2010年の食料価格の高騰では、30か国以上が輸出を制限した）。運ぶ道や配る仕組みがないと、届かない地域が飢える。 | 「33か国（調べた105か国のうち）」は2007年〜2011年3月の合計。2007〜08年だけだと最大16か国（IFPRI）、FAOの2008年の調査では77か国の約4分の1 |
| events/c_lockin/why | 一度建てた発電所は40年ほど使われる。燃やすことをやめる決まりや代わりの電気がないと、何十年分の排出が先に決まってしまう（炭素のロックイン）。 | 一度建てた発電所は40〜50年ほど使われる。燃やすことをやめる決まりや代わりの電気がないと、何十年分の排出が先に決まってしまう（炭素のロックイン）。 | 石炭火力は、これまで平均46年で廃止されてきた（Cui）。IEAは約50年とする。40年は試算のための仮定の値（Davis & Socolow 2014） |
| events/w_border_war/why | 国境の小さな衝突が、話し合いの場のないまま大きな戦争になった例は多い（1914年のサラエボ事件など）。 | 小さな事件が話し合いの場のないまま大きな戦争になった例は多い（1914年のサラエボ事件から、ちょうど1か月で第一次世界大戦が始まった） | サラエボ事件は皇位継承者の暗殺で、国境での衝突ではない。暗殺のちょうど1か月後にオーストリアがセルビアに宣戦した。英国が出した会議の案は退けられた |
| twists/ocean_collapse/news[1].why | 魚や貝は、人が食べる動物性たんぱく質の約6分の1を占めていた。 | 魚や貝は人が食べる動物性たんぱく質の約15%を占めていた | 世界の動物性たんぱく質の15%（約7分の1）で、たんぱく質全体では6% |
| twists/firewood_loss/news[0].why | 世界では約23億人が、薪や炭などを燃やして料理をしている。 | 世界では約21億人が薪や炭などを燃やして料理をしている | WHOの値は約21億人（世界人口の約4分の1）。灯油や石炭で料理する人も含む |
| twists/square_cube/news[0].why | 体が2倍の大きさになると体重は8倍になるが、骨の太さは4倍にしかならない（二乗三乗の法則）。 | 体が2倍の大きさになると体重は8倍になるが、骨の断面積（体を支える力）は4倍にしかならない（二乗三乗の法則） | 形を保ったまま2倍にすると、骨の太さ（直径）は2倍で、4倍になるのは断面積。体を支える力は断面積で決まる |
| crises/meteor/why | 約6600万年前、直径約10kmの小惑星の衝突で、恐竜を含む生き物の種の約7割が絶滅したとされる。 | 約6600万年前、直径約10〜15kmの小惑星の衝突で、恐竜を含む生き物の種の約4分の3が絶滅したとされる | 絶滅した割合はNHMで75%、Barnoskyで76%なので、「約7割」は低い。直径はNHMでは10〜15km |
| crises/megaquake/why | 2004年のスマトラ島沖地震の津波では、約22万人が亡くなった。 | 2004年のスマトラ島沖地震の津波では、行方不明を含め約23万人が亡くなった | 死者と行方不明で227,899人（NOAAの別ページでは「23万人超」）。「約22万人」は少なすぎる |
| endings/utopia/why | 世界の5歳までに亡くなる子どもの割合は、1900年ごろの約3分の1から、いまは約4%まで下がった。 | 世界の5歳までに亡くなる子どもの割合は、1900年ごろの約4割から、いまは約4%まで下がった | 1900年は40.9%。約3分の1になるのは1920年ごろ（34.4%）。2024年は3.7%（国連IGMEで27人に1人） |
| endings/meteor_end/why | 約6600万年前、直径約10kmの小惑星の衝突で、恐竜を含む生き物の種の約7割が絶滅したとされる。 | 約6600万年前、直径約10〜15kmの小惑星の衝突で、恐竜を含む生き物の種の約4分の3が絶滅したとされる | 絶滅した割合はNHMで75%、Barnoskyで76%なので、「約7割」は低い。直径はNHMでは10〜15km |
| endings/mind_collapse/why | 世界では約2億8000万人がうつ病を抱えているとされる（WHO）。心の不調は、働くことも学ぶことも難しくする。 | 世界では約3億2000万人がうつ病を抱えているとされる（WHO）。心の不調は働くことも学ぶことも難しくする。 | 2026年9月11日の更新で約3億2200万人（成人の5.2%）。「約2億8000万人」は古い版の数字 |
| endings/paper_money/why | 1923年のドイツでは、お金を刷りすぎた結果、パン1個が約2000億マルクになった。 | 1923年のドイツではお金を刷りすぎた結果、11月にはパン1個が約1400億〜4300億マルクになった | 11月5日に政府がパンの値段を1400億マルクに上げ、11月のベルリンではパン1個が4280億マルク。「約2000億」の出典は見つからない（ドイツ歴史博物館の年表では9月26日に1037万マルク） |
| laws/pathogen_mutate/fact | 流行を続けるうちに、病原体は弱い型へ変わっていくことが多い。 | 流行が続いても病原体が弱い型へ変わるとは限らず、強まることもある | 「病原体はいつも弱毒化へ向かう」という説は、強さと広がりやすさの兼ね合い（トレードオフ）説に置き換えられた。新型コロナは流行初期に、アルファ株などで平均の強さが増した（Alizon & Sofonea 2021） |

## 要確認（出典が見つからない・確かめきれない）

| 項目 | 分かったこと |
| --- | --- |
| laws/learning/fact | 「約20年」を直接示す公的機関・査読論文の数字は見つからない。参考として、狩猟の腕が頂点になるのは30〜35歳という研究がある |
| twists/aging_society/news[0].why | 日本は出生数の山が1973年（約209万人）、生産年齢人口の山が1995年（約22年後）で合う。韓国は出生数の山が1971年、生産年齢人口の山が2019年（約48年後）で合わない。「20〜30年」を直接示す出典はない。日本だけにすれば確かめられる |
| twists/double_day/news[0].why | 「日射が1%増えると約2℃上がる」を直接示す公的機関や査読論文の出典が見つからない。NOAAは、太陽の周期による約1W/m²（約0.07%）の変化で0.1℃以下（短い周期での反応）と説明している。検索回数の上限に達し、これ以上は調べられなかった |
| twists/hyperinflation/news[1].why | 紙幣を燃やした写真や逸話は広く知られているが、「薪を買うより安い」を示す公的機関や査読論文の出典が見つからない。検索回数の上限に達し、これ以上は調べられなかった |
| twists/button_money/news[1].why | 11月に「パン1個が約2000億マルク」だったことを示す公的機関の出典が見つからない（英語版ウィキペディアの出典は個人のサイト）。LeMOでは、9月26日のベルリンでパン1個が1037万マルク。検索回数の上限に達し、これ以上は調べられなかった |

## すべての項目

| 項目 | 判定 | 出典 | 出典の年 | 数字の年 | URL |
| --- | --- | --- | --- | --- | --- |
| laws/human_food/fact | 一致 | 英国NHS「Understanding calories」／世界銀行（ILOモデル推計）「農業の就業者の割合」 | 2023 | 2024〜2025 | https://www.nhs.uk/live-well/healthy-weight/managing-your-weight/understanding-calories/ |
| laws/human_water/fact | 一致 | FAO AQUASTAT「Water use」 | 記載なし | 記載なし | https://www.fao.org/aquastat/en/overview/methodology/water-use/ |
| laws/density/voidWhy | 一致 | 国連経済社会局「World Urbanization Prospects 2018」 | 2018 | 2018 | https://www.un.org/development/desa/en/news/population/2018-revision-of-world-urbanization-prospects.html |
| laws/human_aging/fact | 一致 | 国連「World Population Prospects 2024」 | 2024 | 2023 | https://population.un.org/wpp/ |
| laws/human_sleep/fact | 一致 | 米国立神経疾患・脳卒中研究所（NINDS）「Brain Basics: Understanding Sleep」 | 2025 | — | https://www.ninds.nih.gov/health-information/public-education/brain-basics/brain-basics-understanding-sleep |
| laws/life_heat/fact | 一致 | Schlenker & Roberts（PNAS）／Hatfield & Prueger（Weather and Climate Extremes） | 2009／2015 | — | https://doi.org/10.1073/pnas.0906865106 |
| laws/human_oxygen/fact | 一致 | NASA「Life Support Baseline Values and Assumptions Document」改訂2版／NOAA 世界の年平均CO2濃度 | 2022／2026 | 2025 | https://ntrs.nasa.gov/api/citations/20210024855/downloads/BVAD_2.15.22-final.pdf |
| laws/plant_grow/fact | 直した | FAO AQUASTAT／van der Ent ほか（Water Resources Research）／Wei ほか（Geophysical Research Letters） | 2010／2017 | — | https://doi.org/10.1029/2010WR009127 |
| laws/plant_co2/fact | 直した | Global Carbon Budget 2025（Earth System Science Data）／IPCC第6次評価報告書 第1作業部会 第5章 | 2026／2021 | 2015〜2024／2010〜2019 | https://essd.copernicus.org/articles/18/3211/2026/ |
| laws/co2_heat/fact | 一致 | NASA「Global Warming」／NASA「What Is the Greenhouse Effect?」 | 2010 | — | https://science.nasa.gov/earth/climate-change/global-warming/ |
| laws/animal_exist/fact | 一致 | Poore & Nemecek（Science）／Klein ほか（Proceedings of the Royal Society B） | 2018／2007 | — | https://doi.org/10.1126/science.aaq0216 |
| laws/animal_pollen/fact | 一致 | IPBES「花粉媒介者・受粉・食料生産」評価報告書 | 2016 | — | https://www.ipbes.net/article/press-release-pollinators-vital-our-food-supply-under-threat |
| laws/zoonosis/fact | 一致 | 米国疾病予防管理センター（CDC）「About Zoonotic Diseases」 | 2025 | — | https://www.cdc.gov/one-health/about/about-zoonotic-diseases.html |
| laws/sea_salt/fact | 一致 | 米国地質調査所（USGS）「Why is the ocean salty?」／NOAA海洋局「The Global Conveyor Belt」 | 記載なし | — | https://www.usgs.gov/faqs/why-ocean-salty |
| laws/ocean_co2/fact | 直した | Global Carbon Budget 2025（Earth System Science Data）／IPCC第6次評価報告書 第1作業部会 第5章 | 2026／2021 | 2015〜2024／2010〜2019 | https://essd.copernicus.org/articles/18/3211/2026/ |
| laws/sun_shine/fact | 一致 | Li & Tung（Nature Communications）／Modak ほか（Environmental Research Letters） | 2023／2016 | — | https://doi.org/10.1038/s41467-023-43583-7 |
| laws/seasons/fact | 一致 | NASA「Earth: Facts」／米国立気象局（NWS）用語集「Monsoon」 | 記載なし | — | https://science.nasa.gov/earth/facts/ |
| laws/fire_burn/fact | 直した | WHO ファクトシート「Household air pollution」／Balch ほか（PNAS） | 2025／2017 | 記載なし（2025年12月更新）／1992〜2012 | https://www.who.int/news-room/fact-sheets/detail/household-air-pollution-and-health |
| laws/oil_heat/fact | 一致 | IEA「World Energy Outlook 2024」 | 2024 | 2023 | https://www.iea.org/reports/world-energy-outlook-2024/pathways-for-the-energy-mix |
| laws/oil_finite/fact | 一致 | 資源エネルギー庁「エネルギー動向（2025年版）」（エネルギー白書2024も同じ数字） | 2025 | 2020年末 | https://www.enecho.meti.go.jp/about/energytrends/202506/html/s-2-2.html |
| laws/electric/fact | 直した | 世界銀行 世界開発指標「送配電の損失（出力に対する%）」 | 2026閲覧 | 2024 | https://data.worldbank.org/indicator/EG.ELC.LOSS.ZS |
| laws/farm_land/fact | 一致 | FAO「森林資源評価2020 リモートセンシング調査」 | 2021〜2022 | 2000〜2018 | https://www.fao.org/forest-resources-assessment/remote-sensing/remote-sensing-survey/en |
| laws/food_rot/fact | 一致 | 国連「食品ロスと廃棄に関する啓発の国際デー」（FAOとUNEPの推計） | 記載なし | 記載なし | https://www.un.org/en/observances/end-food-waste-day |
| laws/medicine/fact | 一致 | GBD 2021 Antimicrobial Resistance Collaborators（Lancet） | 2024 | 2021 | https://doi.org/10.1016/S0140-6736(24)01867-1 |
| laws/learning/fact | 要確認 | （参考）Koster ほか（Science Advances） | 2020 | — | https://doi.org/10.1126/sciadv.aax9070 |
| laws/nation/fact | 直した | 国連経済社会局「International Migrant Stock 2024: Key facts and figures」／国連「Member States」 | 2025 | 2024 | https://www.un.org/development/desa/pd/sites/www.un.org.development.desa.pd/files/undesa_pd_2025_intlmigstock_2024_key_facts_and_figures_advance-unedited.pdf |
| laws/war/fact | 直した | ストックホルム国際平和研究所（SIPRI）2026年4月の発表 | 2026 | 2025 | https://www.sipri.org/media/press-release/2026/global-military-spending-rise-continues-european-and-asian-expenditures-surge |
| laws/weapons/fact | 直した | 米国ホロコースト記念博物館「World War II: In Depth」／米国立第二次世界大戦博物館「Worldwide Deaths in World War II」 | 記載なし | — | https://www.nationalww2museum.org/students-teachers/student-resources/research-starters/research-starters-worldwide-deaths-world-war |
| laws/weapons/voidWhy | 一致 | ヒューマン・ライツ・ウォッチ「Leave None to Tell the Story」／国連「ルワンダのツチに対するジェノサイド」アウトリーチ計画 | 1999 | 1994 | https://www.hrw.org/report/1999/03/01/leave-none-tell-story/genocide-rwanda |
| laws/fission/fact | 一致 | IEA「Global Energy Review 2025」／SIPRI年鑑2026 | 2025／2026 | 2024／2026年1月 | https://www.iea.org/reports/global-energy-review-2025/electricity |
| laws/wind/fact | 一致 | IEA「Global Energy Review 2025」／米国農務省 海外農業局「Grain: World Markets and Trade」／査読論文（Insects） | 2025／2026／2011 | 2024 | https://www.iea.org/reports/global-energy-review-2025/electricity |
| laws/art/fact | 一致 | Pike ほか（Science）／Oktaviana ほか（Nature） | 2012／2024 | — | https://doi.org/10.1126/science.1219957 |
| laws/religion/fact | 一致 | ピュー・リサーチ・センター「The Global Religious Landscape」 | 2012 | 2010 | https://www.pewresearch.org/religion/2012/12/18/global-religious-landscape-exec/ |
| laws/family/fact | 一致 | ILO「Care work and care jobs for the future of decent work」 | 2018 | 記載なし | https://www.ilo.org/global/about-the-ilo/newsroom/news/WCMS_633115/lang--en/index.htm |
| laws/play/fact | 一致 | 国連「子どもの権利条約」（UNICEFが載せている条文） | 1989 | — | https://www.unicef.org/child-rights-convention/convention-text |
| events/s2_outbreak/why | 一致 | 米国疾病予防管理センター（CDC）「1918 Pandemic (H1N1 virus)」／国連「The World at Six Billion」 | 1999 | 1918〜1919 | https://archive.cdc.gov/www_cdc_gov/flu/pandemic-resources/1918-pandemic-h1n1.html |
| events/s3_permafrost/why | 直した | IPCC第6次評価報告書 第1作業部会（政策決定者向け要約・第5章） | 2021 | — | https://www.ipcc.ch/report/ar6/wg1/chapter/summary-for-policymakers/ |
| events/export_ban/why | 一致 | Nature Food の論文（貿易政策の発表と国際価格の変動）／世界銀行 2022年4月26日の発表 | 2023／2022 | 2007〜2008／2022 | https://doi.org/10.1038/s43016-023-00729-6 |
| events/food_govt/why | 一致 | Koren & Winecoff（Food Security） | 2022 | 2011 | https://doi.org/10.1007/s12571-022-01300-0 |
| events/rewilding/why | 一致 | 世界銀行 世界開発指標（FAOのデータ）「農地の割合（陸地面積に対する%）」 | 2026閲覧 | 2023 | https://data.worldbank.org/indicator/AG.LND.AGRI.ZS |
| events/solar_flare/why | 一致 | Muller（Origins of Life and Evolution of Biospheres）／Moriña ほか（Scientific Reports） | 2014／2019 | 1859 | https://doi.org/10.1007/s11084-014-9368-3 |
| events/lockdown/why | 直した | WTO 2021年3月31日の発表（PR876）／国連世界観光機関（UNWTO）2020年4月28日の発表 | 2021／2020 | 2020 | https://www.wto.org/english/news_e/pres21_e/pr876_e.htm |
| events/vaccine/why | 一致 | WHO 2020年12月31日の発表 | 2020 | 2020 | https://www.who.int/news/item/31-12-2020-who-issues-its-first-emergency-use-validation-for-a-covid-19-vaccine-and-emphasizes-need-for-equitable-global-access |
| events/new_pathogen/why | 一致 | 米国疾病予防管理センター（CDC）「About Zoonotic Diseases」 | 2025 | — | https://www.cdc.gov/one-health/about/about-zoonotic-diseases.html |
| events/green_revolution/why | 直した | Pingali（PNAS） | 2012 | 1960〜2000 | https://doi.org/10.1073/pnas.0912953109 |
| events/sea_level/why | 一致 | 国連経済社会局「持続可能な開発の指標」の説明書（海岸近くに住む人口の割合） | 2007 | 2000年代 | https://www.un.org/esa/sustdev/natlinfo/indicators/methodology_sheets/oceans_seas_coasts/pop_coastal_areas.pdf |
| events/volcano/why | 一致 | Scientific Reports の論文（タンボラ噴火と島々）／Nature Communications の論文（タンボラ噴火後の樹木） | 2023 | 1815〜1816 | https://doi.org/10.1038/s41598-023-30729-2 |
| events/chain_food_jobs/why | 一致 | 世界銀行（ILOモデル推計）「農業の就業者の割合」 | 2026閲覧 | 2024〜2025 | https://data.worldbank.org/indicator/SL.AGR.EMPL.ZS |
| events/chain_greenhouse_cold/why | 一致 | NASA「Global Warming」 | 2010 | — | https://science.nasa.gov/earth/climate-change/global-warming/ |
| events/s4_arms_spending/why | 直した | SIPRI 2026年4月の発表／SIPRI 2025年4月の発表 | 2026／2025 | 2025 | https://www.sipri.org/media/press-release/2026/global-military-spending-rise-continues-european-and-asian-expenditures-surge |
| events/s5_price_shock/why | 一致 | 米国務省 歴史室「Oil Embargo, 1973–1974」／IMF「Finance & Development」（What Is a Recession?） | 2009 | 1973〜1975 | https://history.state.gov/milestones/1969-1976/oil-embargo |
| events/s5_coal/why | 一致 | 米国エネルギー情報局（EIA）「Carbon Dioxide Emissions Coefficients」 | 2024 | — | https://www.eia.gov/environment/emissions/co2_vol_mass.php |
| events/meteor_strike/why | 一致 | Chiarenza ほか（PNAS）／Senel ほか（Nature Geoscience） | 2020／2023 | — | https://doi.org/10.1073/pnas.2006087117 |
| events/loop_thaw/why | 一致 | Liskova ら, Frontiers in Veterinary Science（Stella ら, Scientific Reports 2020 も） | 2021 | 2016 | https://pmc.ncbi.nlm.nih.gov/articles/PMC8264129/ |
| events/loop_plague/why | 一致 | Legendre ら, PNAS（CNRS の発表で確認） | 2014 | 2014（3万年以上前の地層） | https://www.pnas.org/doi/10.1073/pnas.1320670111 |
| events/loop_harvest/why | 一致 | FAO ニュースリリース | 2014 | 2014 | https://www.fao.org/newsroom/detail/Ebola-leaves-hundreds-of-thousands-facing-hunger-in-three-worst-hit-countries/en |
| events/loop_war/why | 一致 | Sternberg, Applied Geography（Koren & Winecoff, Food Security 2022 も） | 2012 | 2010〜2011 | https://www.sciencedirect.com/science/article/abs/pii/S0143622812000161 |
| events/time_speed_note/why | 一致 | Ashby, Living Reviews in Relativity | 2003 | （物理） | https://pmc.ncbi.nlm.nih.gov/articles/PMC5253894/ |
| events/five_minutes_note/why | 一致 | Russell『The Analysis of Mind』第9講 | 1921 | 1921 | https://www.gutenberg.org/files/2529/2529-h/2529-h.htm |
| events/simulation_note/why | 一致 | Bostrom, Philosophical Quarterly 53(211) | 2003 | 2003 | https://ora.ox.ac.uk/objects/uuid:44c386c4-5d9e-4ecf-a47c-9631a2a59747 |
| events/brain_vat_note/why | 一致 | Putnam『Reason, Truth and History』第1章（Cambridge UP） | 1981 | 1981 | https://www.cambridge.org/core/books/abs/reason-truth-and-history/brains-in-a-vat/4301D7FCC5869697D0110E89CAA1A47B |
| events/parallel_note/why | 一致 | Everett, Reviews of Modern Physics 29, 454 | 1957 | 1957 | https://ui.adsabs.harvard.edu/abs/1957RvMP...29..454E |
| events/precog_disaster/why | 一致 | WMO／バングラデシュ政府ほか「Cyclone Sidr 被害・ニーズ評価」（Haque ら, WHO 紀要 2012 も） | 2020／2008 | 1970／2007 | https://wmo.int/media/news/worlds-deadliest-tropical-cyclone-was-50-years-ago |
| events/internet_gone_note/why | 一致 | ITU（Facts and Figures 2023） | 2023 | 2023 | https://www.itu.int/en/mediacentre/Pages/PR-2023-11-27-facts-and-figures-measuring-digital-development.aspx |
| events/self_driving_note/why | 一致 | WHO ファクトシート「Road traffic injuries」（Global status report on road safety 2023） | 2026 | 2021（報告は2023） | https://www.who.int/news-room/fact-sheets/detail/road-traffic-injuries |
| events/no_vaccine_note/why | 一致 | WHO「Vaccines and immunization」 | 2026閲覧 | 現行（毎年） | https://www.who.int/health-topics/vaccines-and-immunization |
| events/no_antibiotics_note/why | 一致 | Antimicrobial Resistance Collaborators（Murray ら）, The Lancet | 2022 | 2019 | https://doi.org/10.1016/S0140-6736(21)02724-0 |
| events/livestock_gone_note/why | 一致 | Poore & Nemecek, Science | 2018 | 2018年の論文 | https://doi.org/10.1126/science.aaq0216 |
| events/bees_gone_note/why | 一致 | IPBES 送粉者評価（Klein ら, Proc. R. Soc. B 2007 も） | 2016 | 2016 | https://www.ipbes.net/article/press-release-pollinators-vital-our-food-supply-under-threat |
| events/iron_gone_note/why | 直した | USGS（Iron and Steel Statistics and Information） | 2026閲覧 | 現行（毎年） | https://www.usgs.gov/centers/national-minerals-information-center/iron-and-steel-statistics-and-information |
| events/plastic_gone_note/why | 一致 | UN News（国連）／UNEP | 2025 | 2024〜2025 | https://news.un.org/en/story/2025/06/1164046 |
| events/no_farmers_note/why | 一致 | 世界銀行 WDI（ILO の推計） | 2026 | 2024〜2025 | https://data.worldbank.org/indicator/SL.AGR.EMPL.ZS |
| events/no_teachers_note/why | 一致 | UNESCO | 2026 | 2024 | https://www.unesco.org/en/articles/more-children-out-school-7th-year-row-273-million |
| events/no_police_note/why | 一致 | The Canadian Encyclopedia（Historica Canada） | 2022 | 1969 | https://www.thecanadianencyclopedia.ca/en/article/murray-hill-riot |
| events/no_army_note/why | 一致 | コスタリカ共和国憲法（1949年）第12条 | 1949 | 1949 | https://pdba.georgetown.edu/Constitutions/Costa/costarica49.html |
| events/no_sight_note/why | 直した | WHO ファクトシート「Blindness and vision impairment」／GBD 2019 Blindness and Vision Impairment Collaborators, Lancet Glob Health | 2026／2021 | 2020 | https://www.thelancet.com/journals/langlo/article/PIIS2214-109X(20)30425-3/fulltext |
| events/no_hearing_note/why | 一致 | WHO ファクトシート「Deafness and hearing loss」 | 2026 | 現行 | https://www.who.int/news-room/fact-sheets/detail/deafness-and-hearing-loss |
| events/no_bathing_note/why | 一致 | Cochrane（Ejemot-Nwadiaro ら）／CDC | 2021 | 2021 | https://www.cochrane.org/evidence/CD004265_does-encouraging-people-wash-their-hands-stop-them-having-diarrhoea |
| events/no_marriage_note/why | 一致 | 厚生労働省「令和3年度 出生に関する統計の概況」 | 2021 | 2019 | https://www.mhlw.go.jp/toukei/saikin/hw/jinkou/tokusyu/syussyo07/dl/gaikyou.pdf |
| events/superintelligence_note/why | 一致 | NobelPrize.org | 2024 | 2024 | https://www.nobelprize.org/prizes/chemistry/2024/press-release/ |
| events/no_computers_note/why | 一致 | SIA（WSTS のデータ） | 2024 | 2023 | https://www.semiconductors.org/global-semiconductor-sales-decrease-8-2-in-2023-market-rebounds-late-in-year/ |
| events/black_hole_far_note/why | 一致 | NASA（Hubble） | 2022 | 2022 | https://science.nasa.gov/missions/hubble/hubble-determines-mass-of-isolated-black-hole-roaming-our-milky-way-galaxy/ |
| events/black_hole_void_note/why | 直した | NOIRLab／ハーバード・スミソニアン天体物理学センター（El-Badry ら） | 2022 | 2022 | https://noirlab.edu/public/news/noirlab2227/ |
| events/antimatter_power_note/why | 一致 | CERN「Making antimatter」／米国立公文書館（広島の原爆の威力） | 2020 | 1945（原爆） | https://angelsanddemons.web.cern.ch/archived/antimatter/making-antimatter.html |
| events/light_slow_note/why | 一致 | Royal Museums Greenwich | 年の記載なし | 平均距離 | https://www.rmg.co.uk/stories/topics/how-far-away-moon |
| events/light_fast_note/why | 一致 | NIST（光速の値）／NASA（地球の直径） | 現行 | 定数 | https://physics.nist.gov/cgi-bin/cuu/Value?c |
| events/organ_regen_note/why | 一致 | 日本政府（JapanGov） | 2017 | 2014 | https://www.japan.go.jp/tomodachi/2017/summer2017/ips_cells.html |
| events/basic_income_note/why | 一致 | フィンランド社会保健省（実験の最終結果） | 2020 | 2017〜2018 | https://stm.fi/en/-/perustulokokeilun-tulokset-tyollisyysvaikutukset-vahaisia-toimeentulo-ja-psyykkinen-terveys-koettiin-paremmaksi |
| events/no_nuclear_power_note/why | 一致 | IEA「The Path to a New Era for Nuclear Energy」 | 2025 | 2024〜2025 | https://www.iea.org/reports/the-path-to-a-new-era-for-nuclear-energy/executive-summary |
| events/warming_fast_note/why | 一致 | IPCC AR6 統合報告書 SPM（A.1） | 2023 | 2011〜2020 | https://www.ipcc.ch/report/ar6/syr/downloads/report/IPCC_AR6_SYR_SPM.pdf |
| events/birth_recover_note/why | 一致 | 厚生労働省「令和5年人口動態統計（確定数）」／国立社会保障・人口問題研究所 | 2024／2023 | 2023 | https://www.mhlw.go.jp/toukei/saikin/hw/jinkou/kakutei23/dl/02_kek.pdf |
| events/birth_decline_note/why | 一致 | 厚生労働省「令和5年人口動態統計（確定数）」／国立社会保障・人口問題研究所 | 2024／2023 | 2023 | https://www.mhlw.go.jp/toukei/saikin/hw/jinkou/kakutei23/dl/02_kek.pdf |
| events/no_jobs_note/why | 一致 | 米議会調査局（CRS）R40655 | 2009 | 1933 | https://www.congress.gov/crs-product/R40655 |
| events/no_government_note/why | 一致 | International IDEA（Wahiu & Abebe） | 2025 | 1991〜2012 | https://www.idea.int/publications/catalogue/html/substate-governance-constitution-building-centre-view-somalia |
| events/dinosaurs_note/why | 一致 | Hutchinson ら, PLoS ONE（ロンドン自然史博物館も参照） | 2011 | 2011 | https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0026037 |
| events/no_forest_note/why | 一致 | FAO 世界森林資源評価（FRA 2025） | 2025 | 2025 | https://www.fao.org/newsroom/detail/global-deforestation-slows--but-forests-remain-under-pressure--fao-report-shows/en |
| events/world_government_note/why | 一致 | 国連（About Us／平和維持活動のページ） | 2026閲覧 | 現行 | https://www.un.org/en/about-us |
| events/no_children_note/why | 一致 | 厚生労働省「令和5年人口動態統計（確定数）」 | 2024 | 2023 | https://www.mhlw.go.jp/toukei/saikin/hw/jinkou/kakutei23/dl/02_kek.pdf |
| events/earth_drift_note/why | 一致 | NASA JPL「Basics of Space Flight」 | 現行 | （法則） | https://science.nasa.gov/learn/basics-of-space-flight/chapter6-1/ |
| events/earth_closer_note/why | 一致 | NASA JPL「Basics of Space Flight」 | 現行 | （法則） | https://science.nasa.gov/learn/basics-of-space-flight/chapter6-1/ |
| events/ice_age_note/why | 一致 | Tierney ら, Nature | 2020 | 約2万年前（最終氷期最盛期） | https://www.nature.com/articles/s41586-020-2617-x |
| events/sea_rise_note/why | 一致 | IPCC AR6 第1作業部会 SPM（A.1.7） | 2021 | 1901〜2018 | https://www.ipcc.ch/report/ar6/wg1/downloads/report/IPCC_AR6_WGI_SPM.pdf |
| events/eruptions_note/why | 一致 | Schurer ら, Environmental Research Letters | 2019 | 1815〜1816 | https://iopscience.iop.org/article/10.1088/1748-9326/ab3a10 |
| events/quakes_more_note/why | 一致 | 総務省消防庁「東北地方太平洋沖地震（東日本大震災）の被害状況（第164報）」 | 2024 | 2024年3月1日現在 | https://www.fdma.go.jp/disaster/higashinihon/items/164.pdf |
| events/acid_rain_note/why | 一致 | Grennfelt et al.「Acid rain and air pollution: 50 years of progress in environmental science and policy」Ambio（査読）／米EPA「The Legacy of EPA's Acid Rain Research」 | 2020 | 1970〜80年代 | https://pmc.ncbi.nlm.nih.gov/articles/PMC7028813/ |
| events/air_pollution_note/why | 一致 | WHO「Air pollution」（Health topics） | 2026閲覧 | 年あたりの推計（何年の値かの記載なし） | https://www.who.int/health-topics/air-pollution |
| events/desertification_note/why | 一致 | UNCCD「The Global Threat of Drying Lands」／国連「UN Decade for Deserts」 | 2024 | 2020年（1991〜2020年の平均） | https://www.unccd.int/sites/default/files/2024-12/aridity_report.pdf |
| events/f_water_1/why | 一致 | 国連ニュース（FAO「AQUASTAT 2025」の紹介） | 2025 | 2025年公表値 | https://news.un.org/en/story/2025/12/1166582 |
| events/f_reach_1/why | 一致 | FAO（Sharma）「Food Export Restrictions: Review of the 2007-2010 Experience」 | 2011 | 2007年〜2011年3月 | https://www.fao.org/fileadmin/templates/est/PUBLICATIONS/Comm_Working_Papers/EST-WP32.pdf |
| events/p_animal_1/why | 一致 | 米CDC「About Zoonotic Diseases」 | 2026閲覧 | 記載なし | https://www.cdc.gov/one-health/about/about-zoonotic-diseases.html |
| events/w_scarcity_1/why | 一致 | Lagi, Bertrand, Bar-Yam（NECSI、arXiv）／Bellemare「Rising Food Prices, Food Price Volatility, and Social Unrest」American Journal of Agricultural Economics（査読） | 2011／2015 | 2011年 | https://arxiv.org/abs/1108.2455 |
| events/w_fear_2/why | 一致 | APS News（米国物理学会）の1983年の核の誤警報の記事 | 2026 | 1983年9月26日 | https://www.aps.org/apsnews/2026/09/1983-averting-potential-nuclear-war |
| events/p_shutdown/why | 一致 | ILO「ILO Monitor: COVID-19 and the world of work. 7th edition」の報道発表 | 2021 | 2020年（2019年10〜12月との比較） | https://www.ilo.org/resource/news/ilo-uncertain-and-uneven-recovery-expected-following-unprecedented-labour |
| events/c_methane/why | 一致 | NOAA「Arctic Report Card 2019: Permafrost and the Global Carbon Cycle」 | 2019 | 2019年 | https://arctic.noaa.gov/report-card/report-card-2019/permafrost-and-the-global-carbon-cycle/ |
| events/f_market_break/why | 直した | FAO（Sharma 2011）／IFPRI Food Security Portal（Mamun & Laborde） | 2011／2023 | 2007年〜2011年3月 | https://www.fao.org/fileadmin/templates/est/PUBLICATIONS/Comm_Working_Papers/EST-WP32.pdf |
| events/f_monoculture/why | 一致 | UCバークレー古生物学博物館「Understanding Evolution: Monoculture and the Irish potato famine」 | 2026閲覧 | 1840年代 | https://evolution.berkeley.edu/the-relevance-of-evolution/agriculture/monoculture-and-the-irish-potato-famine-cases-of-missing-genetic-variation/ |
| events/c_lockin/why | 直した | Cui et al.「Quantifying operational lifetimes for coal power plants under the Paris goals」Nature Communications（査読）／IEA「The role of CCUS in low-carbon power systems」 | 2019／2020 | これまでの廃止の実績 | https://pmc.ncbi.nlm.nih.gov/articles/PMC6800419/ |
| events/c_dieback/why | 一致 | Gatti et al.「Amazonia as a carbon source linked to deforestation and climate change」Nature（査読） | 2021 | 2010〜2018年の観測 | https://www.nature.com/articles/s41586-021-03629-6 |
| events/w_border_war/why | 直した | 英国立公文書館のブログ「100 years ago today: Austria declares war on Serbia」／米国立第一次世界大戦博物館 | 2014 | 1914年6月28日・7月28日 | https://blog.nationalarchives.gov.uk/100-years-ago-today-austria-declares-war-serbia/ |
| events/w_first_strike/why | 一致 | National Security Archive（ジョージ・ワシントン大学）「False Warnings of Soviet Missile Attacks during 1979-80」／APS News | 2020 | 1979〜1980年・1983年 | https://nsarchive.gwu.edu/briefing-book/nuclear-vault/2020-03-16/false-warnings-soviet-missile-attacks-during-1979-80-led-alert-actions-us-strategic-forces |
| events/e_grid_down/why | 一致 | 米加電力系統停止合同調査部会「Final Report on the August 14, 2003 Blackout」 | 2004 | 2003年8月14日 | https://www.energy.gov/oe/articles/blackout-2003-final-report-august-14-2003-blackout-united-states-and-canada-causes-and |
| twists/aging_society/news[0].why | 要確認 | 内閣府「平成29年版高齢社会白書」／厚生労働省「人口動態統計」／韓国統計庁（報道で確認） | 2017 | 日本1973年・1995年、韓国1971年・2019年 | https://www8.cao.go.jp/kourei/whitepaper/w-2017/html/zenbun/s1_1_1.html |
| twists/co2_hunger/news[0].why | 一致 | NOAA Global Monitoring Laboratory「Trends in CO2」 | 2026 | 2026年8月 | https://gml.noaa.gov/ccgg/trends/ |
| twists/rain_loss/news[0].why | 一致 | van der Ent et al.「Origin and fate of atmospheric moisture over continents」Water Resources Research（査読） | 2010 | 2010年の推計（気象の再解析データから） | https://doi.org/10.1029/2010WR009127 |
| twists/rainforest_dieback/news[0].why | 一致 | NASA Science「Mission: Biomes（Rainforest）」 | 2026閲覧 | 記載なし | https://science.nasa.gov/kids/earth/mission-biomes/biorainforest/ |
| twists/ocean_collapse/news[0].why | 一致 | NOAA National Ocean Service「Why is the ocean salty?」 | 2026閲覧 | 記載なし | https://oceanservice.noaa.gov/facts/whysalty.html |
| twists/ocean_collapse/news[1].why | 直した | FAO「The State of World Fisheries and Aquaculture 2026」 | 2026 | 2023年 | https://www.fao.org/3/cd8357en/online/sofia-2026/global-fisheries-aquaculture.html |
| twists/monsoon_loss/news[0].why | 一致 | インド政府PIB「The Indian Monsoon: Nature's Pulse and Nation's Lifeline」 | 2025 | 平年 | https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/jul/doc2025715586601.pdf |
| twists/firewood_loss/news[0].why | 直した | WHO ファクトシート「Household air pollution」 | 2025 | 2025年12月16日更新 | https://www.who.int/news-room/fact-sheets/detail/household-air-pollution-and-health |
| twists/land_rush/news[0].why | 一致 | FAO「COP26: Agricultural expansion drives almost 90 percent of global deforestation」（FRA 2020 リモートセンシング調査） | 2021 | 2000〜2018年 | https://www.fao.org/newsroom/detail/cop26-agricultural-expansion-drives-almost-90-percent-of-global-deforestation/en |
| twists/endless_aging/news[0].why | 一致 | 総務省統計局「統計からみた我が国の高齢者」（統計トピックスNo.149） | 2026 | 2026年9月 | https://www.stat.go.jp/data/topics/topi1490.html |
| twists/nuclear_gap/news[0].why | 一致 | IEA「The Path to a New Era for Nuclear Energy」／RTE「Bilan électrique 2025」 | 2025／2026 | 世界は2023〜24年ごろ、フランスは2025年 | https://www.iea.org/reports/the-path-to-a-new-era-for-nuclear-energy/executive-summary |
| twists/storm_age/news[0].why | 一致 | NASA Glenn Research Center「The Drag Equation」 | 2026閲覧 | （物理法則） | https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/drag-equation/ |
| twists/stagnant_air/news[0].why | 一致 | WHO「Air pollution」（Health topics） | 2026閲覧 | 年あたりの推計（何年の値かの記載なし） | https://www.who.int/health-topics/air-pollution |
| twists/double_day/news[0].why | 要確認 | （参考）NOAA Climate.gov「Climate change: incoming sunlight」 | 2026閲覧 | — | https://www.climate.gov/news-features/understanding-climate/climate-change-incoming-sunlight |
| twists/hyperinflation/news[0].why | 一致 | IMF Finance & Development「What Is Monetarism?」（Jahan & Papageorgiou） | 2014 | — | https://www.imf.org/external/pubs/ft/fandd/2014/03/basics.htm |
| twists/hyperinflation/news[1].why | 要確認 | 見つからない | — | 1923年 |  |
| twists/meat_taboo/news[0].why | 一致 | Poore & Nemecek「Reducing food's environmental impacts through producers and consumers」Science（査読） | 2018 | 2018年公表 | https://ora.ox.ac.uk/objects/uuid:b0b53649-5e93-4415-bf07-6b0b1227172f |
| twists/culture_loss/news[0].why | 一致 | 国連「International Mother Language Day」（UNESCOの推計）／Cámara-Leret & Bascompte「Language extinction triggers the loss of unique medicinal knowledge」PNAS（査読） | 2021 | 現在 | https://www.un.org/en/observances/mother-language-day |
| twists/plants_stop_absorbing/news[0].why | 一致 | Friedlingstein et al.「Global Carbon Budget 2024」Earth System Science Data（査読） | 2025 | 2014〜2023年の平均 | https://essd.copernicus.org/articles/17/965/2025/ |
| twists/square_cube/news[0].why | 直した | Biewener「Biomechanical consequences of scaling」Journal of Experimental Biology（査読） | 2005 | — | https://doi.org/10.1242/jeb.01520 |
| twists/launch_cost/news[0].why | 一致 | NASA（Jones）「The Recent Large Reduction in Space Launch Cost」（ICES-2018-81） | 2018 | 2018年 | https://ntrs.nasa.gov/citations/20200001093 |
| twists/button_money/news[1].why | 要確認 | （参考）ドイツ歴史博物館 LeMO「Jahreschronik 1923」 | 2026閲覧 | 1923年9月26日（参考の値） | https://www.dhm.de/lemo/jahreschronik/1923 |
| twists/button_echo/news[1].why | 一致 | アーベル賞（ノルウェー科学文学アカデミー）2016年の授賞理由と解説 | 2016 | 1637年ごろ・1995年 | https://abelprize.no/abel-prize-laureates/2016 |
| twists/gold_crash/news[0].why | 一致 | 米セントルイス連銀FRED「Consumer Price Index in the United Kingdom」（英中銀「A millennium of macroeconomic data」） | 2026閲覧 | 1500〜1600年 | https://fred.stlouisfed.org/series/CPIUKA |
| twists/machine_war/news[0].why | 一致 | Center for AI Safety「Statement on AI Risk」 | 2023 | 2023年5月 | https://www.safe.ai/work/statement-on-ai-risk |
| twists/designer_babies/news[0].why | 一致 | 第2回ヒトゲノム編集国際サミット組織委員会の声明（米国科学アカデミーほか）／Cyranoski & Ledford「Genome-edited baby claim provokes international outcry」Nature | 2018 | 2018年11月 | https://www.nationalacademies.org/news/2018/11/statement-by-the-organizing-committee-of-the-second-international-summit-on-human-genome-editing |
| twists/bare_cold/news[0].why | 一致 | Henderson ほか「The cardio-respiratory effects of passive heating and the human thermoneutral zone」Physiological Reports（Stolwijk & Hardy 1966 を引用） | 2021 | 1966 | https://doi.org/10.14814/phy2.14973 |
| twists/sti_spread/news[0].why | 一致 | WHO ファクトシート「Sexually transmitted infections (STIs)」 | 2025 | 2020 | https://www.who.int/news-room/fact-sheets/detail/sexually-transmitted-infections-(stis) |
| twists/machine_rights/news[0].why | 一致 | Reuters（NBC News 掲載）「Google has fired a software engineer who claimed an AI chatbot was sentient」 | 2022 | 2022 | https://www.nbcnews.com/news/us-news/google-fired-software-engineer-claimed-ai-chatbot-was-sentient-rcna39679 |
| twists/antimatter_bomb/news[0].why | 一致 | 広島平和記念資料館「広島・長崎に投下された原爆」（TNT16キロトン）＋E=mc²の計算 | 2026閲覧 | 1945 | https://hpmmuseum.jp/modules/exhibition/index.php?action=ItemView&item_id=9&lang=jpn |
| twists/overwork/news[0].why | 一致 | WHO/ILO ニュースリリース「Long working hours increasing deaths from heart disease and stroke」 | 2021 | 2021（公表） | https://www.who.int/news/item/17-05-2021-long-working-hours-increasing-deaths-from-heart-disease-and-stroke-who-ilo |
| twists/pop_trap/news[0].why | 一致 | マルサス『An Essay on the Principle of Population』初版（Project Gutenberg） | 1798 | 1798 | https://www.gutenberg.org/ebooks/4239 |
| twists/caution_fatigue/news[0].why | 一致 | WHO欧州地域事務局「Pandemic fatigue – reinvigorating the public to prevent COVID-19」 | 2020 | 2020 | https://iris.who.int/handle/10665/335820 |
| twists/wish_bubble/news[0].why | 一致 | Federal Reserve History「Stock Market Crash of 1929」「The Great Recession and Its Aftermath」 | 2013 | 1929／2008 | https://www.federalreservehistory.org/essays/stock-market-crash-of-1929 |
| twists/black_market/news[0].why | 一致 | 帝国戦争博物館（IWM）「What You Need To Know About Rationing In The Second World War」 | 2026閲覧 | 1940／1941 | https://www.iwm.org.uk/history/what-you-need-to-know-about-rationing-in-the-second-world-war |
| crises/meteor/why | 直した | ロンドン自然史博物館（NHM）「How an asteroid ended the age of the dinosaurs」；Barnosky ほか（2011, Nature） | 2011 | 約6600万年前 | https://www.nhm.ac.uk/discover/how-an-asteroid-caused-extinction-of-dinosaurs.html |
| crises/pandemic/why | 一致 | CDC「1918 Pandemic (H1N1 virus)」 | 2026閲覧 | 1918〜1919 | https://archive.cdc.gov/www_cdc_gov/flu/pandemic-resources/1918-pandemic-h1n1.html |
| crises/supervolcano/why | 一致 | NOAA NESDIS「This Day In History: Mount Tambora Explosively Erupts in 1815」 | 2020 | 1815〜1816 | https://www.nesdis.noaa.gov/news/day-history-mount-tambora-explosively-erupts-1815 |
| crises/solar_storm/why | 一致 | NOAA NESDIS「What Was the Carrington Event?」「When Solar Storms Attack」 | 2015 | 1859 | https://www.nesdis.noaa.gov/about/k-12-education/space-weather/what-was-the-carrington-event |
| crises/megadrought/why | 一致 | Cullen ほか「Climate change and the collapse of the Akkadian empire」Geology 28(4) | 2000 | 約4200〜4000年前 | https://ui.adsabs.harvard.edu/abs/2000Geo....28..379C/abstract |
| crises/cold_age/why | 一致 | 米国気象学会（AMS）用語集「Little Ice Age」；Zhang ほか（2011, PNAS） | 2011 | 1300ごろ〜1850 | https://glossary.ametsoc.org/wiki/Little_ice_age |
| crises/blight/why | 一致 | アイルランド国立博物館「An Gorta Mór」 | 2026閲覧 | 1845〜1851 | https://www.museum.ie/en-IE/Museums/Decorative-Arts-History/Exhibitions/An-Gorta-Mor |
| crises/depression/why | 一致 | FDR大統領図書館・博物館「Great Depression Facts」 | 2026閲覧 | 1933 | https://www.fdrlibrary.org/great-depression-facts |
| crises/megaquake/why | 直した | NOAA JetStream「2004 Indian Ocean Tsunami」 | 2026閲覧 | 2004 | https://www.noaa.gov/jetstream/2004tsu_max |
| endings/stopped_spin/why | 一致 | NASA「Earth Fact Sheet」 | 2024 | 2024 | https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html |
| endings/undying_far/why | 一致 | 国立国語研究所「ことば研究館」（福沢将樹「古典文法では過去や完了の助動詞がたくさんあるのに…」） | 2026閲覧 | 10〜11世紀 | https://kotoba.ninjal.ac.jp/qa/yokuaru/qa-68/ |
| endings/far_future/why | 一致 | 「Metaphors and the Invention of Writing」Topics in Cognitive Science；Barnosky ほか（2011, Nature） | 2026／2011 | 前3300年ごろ／過去約5.4億年 | https://doi.org/10.1111/tops.12768 |
| endings/conquered/why | 一致 | Murphy ほか「Violence and weapon-related trauma at Puruchuco-Huaquerones, Peru」American Journal of Physical Anthropology | 2010 | 1530年代 | https://doi.org/10.1002/ajpa.21291 |
| endings/closed_eternity/why | 一致 | 国連 World Population Prospects 2024（Our World in Data 経由のデータ） | 2024 | 2023 | https://population.un.org/wpp/ |
| endings/utopia/why | 直した | Our World in Data「Child mortality rate」（Gapminder＋国連IGME 2025） | 2026 | 1900／2024 | https://ourworldindata.org/grapher/child-mortality |
| endings/withered_eternity/why | 一致 | 総務省統計局「統計トピックスNo.149 統計からみた我が国の高齢者」；厚生労働省「第9期介護保険事業計画に基づく介護職員の必要数について」 | 2026／2024 | 2026 | https://www.stat.go.jp/data/topics/topi1490.html |
| endings/undying/why | 一致 | 国連 World Population Prospects 2024（Our World in Data 経由のデータ） | 2024 | 2023 | https://population.un.org/wpp/ |
| endings/meteor_end/why | 直した | ロンドン自然史博物館（NHM）「How an asteroid ended the age of the dinosaurs」；Barnosky ほか（2011, Nature） | 2011 | 約6600万年前 | https://www.nhm.ac.uk/discover/how-an-asteroid-caused-extinction-of-dinosaurs.html |
| endings/machine_victory/why | 一致 | Center for AI Safety「Statement on AI Risk」 | 2023 | 2023 | https://aistatement.com/ |
| endings/plague_world/why | 一致 | Dean ほか（2018, PNAS）；Izdebski ほか（2022, Nature Ecology & Evolution） | 2018／2022 | 1346〜1353 | https://doi.org/10.1073/pnas.1715640115 |
| endings/mind_collapse/why | 直した | WHO ファクトシート「Depressive disorder (depression)」 | 2026 | 2023 | https://www.who.int/news-room/fact-sheets/detail/depression |
| endings/frozen/why | 一致 | Clark ほか「The Last Glacial Maximum」Science；アリゾナ大学（Tierney ほか 2020, Nature の紹介記事） | 2009／2020 | 約2万6500〜1万9000年前 | https://doi.org/10.1126/science.1172873 |
| endings/paper_money/why | 直した | リッチモンド連邦準備銀行 Economic Quarterly 88(1)（Hetzel「German Monetary History in the First Half of the Twentieth Century」） | 2002 | 1923年11月 | https://www.richmondfed.org/-/media/richmondfedorg/publications/research/economic_quarterly/2002/winter/pdf/hetzel.pdf |
| endings/famine_world/why | 一致 | WHO ファクトシート「Healthy diet」 | 2026 | 2026 | https://www.who.int/news-room/fact-sheets/detail/healthy-diet |
| phrases/fusion/adapt | 一致 | ジェヴォンズ『The Coal Question』（OLL版は1866年の第2版）；「Systems thinking and efficiency under emissions constraints」Patterns | 1866／2023 | 1865 | https://oll.libertyfund.org/titles/jevons-the-coal-question |
| phrases/robots/adapt | 一致 | ジェヴォンズ『The Coal Question』（OLL版は1866年の第2版）；「Systems thinking and efficiency under emissions constraints」Patterns | 1866／2023 | 1865 | https://oll.libertyfund.org/titles/jevons-the-coal-question |
| phrases/share/adapt | 一致 | Fehr & Gächter「Cooperation and Punishment in Public Goods Experiments」American Economic Review 90(4) | 2000 | 2000 | https://doi.org/10.1257/aer.90.4.980 |
| phrases/distancing/adapt | 一致 | WHO欧州地域事務局「Pandemic fatigue – reinvigorating the public to prevent COVID-19」 | 2020 | 2020 | https://iris.who.int/handle/10665/335820 |
| phrases/renewables/adapt | 一致 | ジェヴォンズ『The Coal Question』（OLL版は1866年の第2版）；「Systems thinking and efficiency under emissions constraints」Patterns | 1866／2023 | 1865 | https://oll.libertyfund.org/titles/jevons-the-coal-question |
| phrases/electrify/adapt | 一致 | ジェヴォンズ『The Coal Question』（OLL版は1866年の第2版）；「Systems thinking and efficiency under emissions constraints」Patterns | 1866／2023 | 1865 | https://oll.libertyfund.org/titles/jevons-the-coal-question |
| phrases/nuclear_power/adapt | 一致 | ジェヴォンズ『The Coal Question』（OLL版は1866年の第2版）；「Systems thinking and efficiency under emissions constraints」Patterns | 1866／2023 | 1865 | https://oll.libertyfund.org/titles/jevons-the-coal-question |
| phrases/grid_storage/adapt | 一致 | ジェヴォンズ『The Coal Question』（OLL版は1866年の第2版）；「Systems thinking and efficiency under emissions constraints」Patterns | 1866／2023 | 1865 | https://oll.libertyfund.org/titles/jevons-the-coal-question |
| phrases/new_fuel/adapt | 一致 | ジェヴォンズ『The Coal Question』（OLL版は1866年の第2版）；「Systems thinking and efficiency under emissions constraints」Patterns | 1866／2023 | 1865 | https://oll.libertyfund.org/titles/jevons-the-coal-question |
| phrases/biofuel/adapt | 一致 | ジェヴォンズ『The Coal Question』（OLL版は1866年の第2版）；「Systems thinking and efficiency under emissions constraints」Patterns | 1866／2023 | 1865 | https://oll.libertyfund.org/titles/jevons-the-coal-question |
| phrases/no_waste/adapt | 一致 | ジェヴォンズ『The Coal Question』（OLL版は1866年の第2版）；「Systems thinking and efficiency under emissions constraints」Patterns | 1866／2023 | 1865 | https://oll.libertyfund.org/titles/jevons-the-coal-question |
| phrases/desalination/adapt | 一致 | ジェヴォンズ『The Coal Question』（OLL版は1866年の第2版）；「Systems thinking and efficiency under emissions constraints」Patterns | 1866／2023 | 1865 | https://oll.libertyfund.org/titles/jevons-the-coal-question |
| indicators/people.hoard/why | 一致 | nippon.com「〈1973年の今日〉11月1日：石油ショックでトイレットペーパーパニック」 | 2023 | 1973 | https://www.nippon.com/ja/japan-topics/today11010/ |
| indicators/people.overshoot/why | 一致 | Klein「The Introduction, Increase, and Crash of Reindeer on St. Matthew Island」Journal of Wildlife Management 32(2) | 1968 | 1963／1966 | https://doi.org/10.2307/3798981 |
| laws/density/fact | 一致 | World Bank「Urban Development」 | 記載なし | 2025 | https://www.worldbank.org/ext/en/topic/urban-development |
| laws/human_birth/fact | 一致 | UNFPA 世界人口白書2022（報道発表） | 2022 | 2019 | https://www.unfpa.org/press/nearly-half-all-pregnancies-are-unintended%E2%80%94-global-crisis-says-new-unfpa-report |
| laws/death/fact | 一致 | OpenStax『Biology 2e』45.4 Population Dynamics and Regulation | 2018 | 記載なし | https://openstax.org/books/biology-2e/pages/45-4-population-dynamics-and-regulation |
| laws/cloud/fact | 一致 | NASA Earth Observatory「Clouds and Radiation」 | 1999 | 記載なし | https://science.nasa.gov/earth/earth-observatory/clouds-and-radiation/ |
| laws/water_rain/fact | 一致 | 国土交通省 報道発表（社会資本整備審議会答申「気候変動を踏まえた水災害対策のあり方」） | 2020 | 記載なし | https://www.mlit.go.jp/report/press/mizukokudo03_hh_001030.html |
| laws/heat_escape/fact | 一致 | NASA Earth Observatory「Climate and Earth's Energy Budget」 | 2009 | 記載なし | https://science.nasa.gov/earth/earth-observatory/climate-and-earths-energy-budget/ |
| laws/oil_co2/fact | 一致 | IPCC 2006年温室効果ガス目録ガイドライン 第2巻（エネルギー） | 2006 | 記載なし | https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_1_Ch1_Introduction.pdf |
| laws/energy_conserve/fact | 一致 | 『ファインマン物理学講義』第1巻 第4章（Caltech公開版） | 1963 | 記載なし | https://www.feynmanlectures.caltech.edu/I_04.html |
| laws/pathogen_infect/fact | 一致 | WHO ファクトシート「The top 10 causes of death」 | 2024 | 2021 | https://www.who.int/news-room/fact-sheets/detail/the-top-10-causes-of-death |
| laws/pathogen_mutate/fact | 直した | Alizon ほか「Virulence evolution and the trade-off hypothesis」J. Evol. Biol. | 2009 | 記載なし | https://academic.oup.com/jeb/article/22/2/245/7324136 |
| laws/pathogen_air/fact | 一致 | WHO ほか4機関の発表（空気を介してうつる病原体の新しい用語） | 2024 | 記載なし | https://www.who.int/news/item/18-04-2024-leading-health-agencies-outline-updated-terminology-for-pathogens-that-transmit-through-the-air |
| laws/pathogen_harm/fact | 一致 | Walther & Ewald「Pathogen survival in the external environment and the evolution of virulence」Biol. Rev. | 2004 | 記載なし | https://pmc.ncbi.nlm.nih.gov/articles/PMC7161823/ |
| laws/immune_memory/fact | 一致 | CDC『Pink Book』第13章 麻しん | 2024 | 記載なし | https://www.cdc.gov/pinkbook/hcp/table-of-contents/chapter-13-measles.html |
| laws/science_repro/fact | 一致 | 全米科学・工学・医学アカデミー『Reproducibility and Replicability in Science』 | 2019 | 記載なし | https://www.nationalacademies.org/publications/25303 |
| laws/automation/fact | 一致 | Frey & Osborne「The Future of Employment」（オックスフォード大 Oxford Martin School） | 2013 | 2010 | https://www.oxfordmartin.ox.ac.uk/publications/the-future-of-employment |
| laws/money/fact | 一致 | IMF『Finance & Development』「Back to Basics: What Is Money?」 | 2012 | 記載なし | https://www.imf.org/external/pubs/ft/fandd/2012/09/basics.htm |
| laws/crime/fact | 一致 | 米州開発銀行（IDB）『The Costs of Crime and Violence』 | 2017 | 2014 | https://publications.iadb.org/en/costs-crime-and-violence-new-evidence-and-insights-latin-america-and-caribbean |
| laws/happiness_seek/fact | 一致 | Easterlin「Explaining happiness」PNAS | 2003 | 記載なし | https://europepmc.org/article/MED/12958207 |
| laws/eco_recover/fact | 一致 | Poorter ほか「Multidimensional tropical forest recovery」Science | 2021 | 記載なし | https://research.wur.nl/en/publications/multidimensional-tropical-forest-recovery/ |
| unlocks/delay/card | 一致 | Sterman「Modeling Managerial Behavior: Misperceptions of Feedback in a Dynamic Decision Making Experiment」Management Science 35(3):321-339 | 1989 | 記載なし | https://doi.org/10.1287/mnsc.35.3.321 |
| unlocks/weights/card | 一致 | OpenStax『College Physics 2e』4.2 Newton's First Law of Motion: Inertia | 2022 | 記載なし | https://openstax.org/books/college-physics-2e/pages/4-2-newtons-first-law-of-motion-inertia |
| unlocks/loops/card | 一致 | Meadows・Meadows・Randers・Behrens『The Limits to Growth』（ローマ・クラブへの報告） | 1972 | 記載なし | https://www.clubofrome.org/publication/the-limits-to-growth/ |
| unlocks/slowing/card | 一致 | Scheffer ほか「Early-warning signals for critical transitions」Nature 461:53-59 | 2009 | 記載なし | https://doi.org/10.1038/nature08227 |
| unlocks/chaos/card | 一致 | Zhang ほか「What Is the Predictability Limit of Midlatitude Weather?」J. Atmos. Sci. 76(4):1077-1091 | 2019 | 2019 | https://doi.org/10.1175/JAS-D-18-0269.1 |
| unlocks/threeBody/card | 一致 | Poincaré「Sur le problème des trois corps et les équations de la dynamique」Acta Mathematica 13:1-270 | 1890 | 記載なし | https://projecteuclid.org/journals/acta-mathematica/volume-13/issue-1-2 |
| unlocks/redundancy/card | 一致 | NASA NPR 8715.3（NASA Safety Manual）付録B 用語集 | 2000 | 記載なし | https://nodis3.gsfc.nasa.gov/displayCA.cfm?Internal_ID=N_PR_8715_0003_&page_name=AppendixB |
| unlocks/conservation/card | 一致 | OpenStax『College Physics 2e』7.6 Conservation of Energy | 2022 | 記載なし | https://openstax.org/books/college-physics-2e/pages/7-6-conservation-of-energy |
| unlocks/habituation/card | 一致 | Frederick & Loewenstein「Hedonic Adaptation」（Kahneman・Diener・Schwarz 編『Well-Being: The Foundations of Hedonic Psychology』Russell Sage Foundation, pp.302-329） | 1999 | 記載なし | https://stafforini.com/works/frederick-1999-hedonic-adaptation/ |
| unlocks/lossAversion/card | 一致 | Brown・Imai・Vieider・Camerer「Meta-analysis of Empirical Estimates of Loss Aversion」J. Econ. Lit. 62(2):485-516 | 2024 | 2024 | https://doi.org/10.1257/jel.20221698 |
| unlocks/trust/card | 一致 | Slovic「Perceived Risk, Trust, and Democracy」Risk Analysis 13(6):675-682 | 1993 | 記載なし | https://doi.org/10.1111/j.1539-6924.1993.tb01329.x |
| unlocks/hoarding/card | 一致 | nippon.com「〈1973年の今日〉11月1日：石油ショックでトイレットペーパーパニック」 | 2023 | 1973 | https://www.nippon.com/ja/japan-topics/today11010/ |
| unlocks/spread/card | 一致 | Centola・Becker・Brackbill・Baronchelli「Experimental evidence for tipping points in social convention」Science 360(6393):1116-1119 | 2018 | 2018 | https://doi.org/10.1126/science.aas8827 |
| unlocks/crowding/card | 一致 | Gneezy & Rustichini「A Fine is a Price」J. Legal Stud. 29(1):1-17 | 2000 | 記載なし | https://doi.org/10.1086/468061 |
| unlocks/freeRide/card | 一致 | Fehr & Gächter「Cooperation and Punishment in Public Goods Experiments」Am. Econ. Rev. 90(4):980-994 | 2000 | 記載なし | https://doi.org/10.1257/aer.90.4.980 |
| unlocks/scarcity/card | 一致 | Mani・Mullainathan・Shafir・Zhao「Poverty Impedes Cognitive Function」Science 341(6149):976-980 | 2013 | 記載なし | https://doi.org/10.1126/science.1238041 |
| unlocks/fatigue/card | 一致 | WHO 欧州地域事務局「Pandemic fatigue: reinvigorating the public to prevent COVID-19」（2020年11月の改訂版） | 2020 | 記載なし | https://www.who.int/europe/publications/i/item/WHO-EURO-2020-1573-41324-56242 |
| unlocks/logHappiness/card | 一致 | Kahneman & Deaton「High income improves evaluation of life but not emotional well-being」PNAS 107(38):16489-16493 | 2010 | 記載なし | https://doi.org/10.1073/pnas.1011492107 |
| unlocks/jevons/card | 一致 | Jevons『The Coal Question』第7章「Of the Economy of Fuel」 | 1865 | 記載なし | https://www.econlib.org/library/YPDBooks/Jevons/jvnCQ7.html |
| unlocks/demography/card | 一致 | Our World in Data（Max Roser）「Demographic transition: Why is rapid population growth a temporary phenomenon?」 | 2023 | 記載なし | https://ourworldindata.org/demographic-transition |
| unlocks/caution/card | 一致 | Funk・Salathé・Jansen「Modelling the influence of human behaviour on the spread of infectious diseases: a review」J. R. Soc. Interface 7(50):1247-1256 | 2010 | 記載なし | https://doi.org/10.1098/rsif.2010.0142 |
| unlocks/overshoot/card | 一致 | Klein「The Introduction, Increase, and Crash of Reindeer on St. Matthew Island」J. Wildl. Manage. 32(2):350-367 | 1968 | 1966 | https://doi.org/10.2307/3798981 |
| unlocks/jcurve/card | 一致 | Lagi・Bertrand・Bar-Yam「The Food Crises and Political Instability in North Africa and the Middle East」（arXiv:1108.2455、NECSI） | 2011 | 記載なし | https://arxiv.org/abs/1108.2455 |
| unlocks/dilemma/card | 一致 | Jervis「Cooperation under the Security Dilemma」World Politics 30(2):167-214 | 1978 | 記載なし | https://doi.org/10.2307/2009958 |
| unlocks/cascade/card | 一致 | Granovetter「Threshold Models of Collective Behavior」Am. J. Sociol. 83(6):1420-1443 | 1978 | 記載なし | https://doi.org/10.1086/226707 |
