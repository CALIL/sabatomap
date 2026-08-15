# OpenLayers 5.3.3 → 10.10.0

2026-08-15 に6メジャーぶん上げたときの記録。次に上げる人が同じ調べ直しを
しなくて済むように、**当たった変更・当たらなかった変更・受け入れた見た目の差**を残す。

`ol` を使っている CALIL のリポジトリは sabatomap だけなので、横展開先は無い。

## 前提: 描画は e2e でしか見ていない

`npm test`（vitest / jsdom）は canvas を持たない。`Map` を作った時点で
何も描かれないので、地図・レイヤー・マーカーは1行も検証されない。

**壊れたと分かるのは `test/e2e` だけ。** ここは実ブラウザ（Chromium）で
基準画像と突き合わせる。詳しくは CLAUDE.md の「地図の描画は e2e でしか見ていない」を読む。

## 版ごとに何が当たったか

| 版 | コードの変更 | 基準画像 | 成果物 |
|---|---|---|---|
| 6.15.1 | **あり（本丸）** | 変わった | 601,230 → 651,272（+8.3%） |
| 7.5.2 | なし | 変わらず | 591,515（-9.2%） |
| 8.2.0 | なし | 変わらず | 638,748（+8.0%） |
| 9.2.4 | なし | 変わった | 647,346（+1.3%） |
| 10.10.0 | あり（例外の回避） | 変わらず | 642,667（-0.7%） |

差し引き +41,437 バイト（+6.9%）。ol は成果物の約半分を占める。

### 6.15.1 — 描画イベントがレイヤーへ移った

**map の描画イベントからキャンバスが無くなった。** `event.context` を持つのは
レイヤーの `prerender` / `postrender` だけになり、名前も `precompose` /
`postcompose` から変わった。map 側は名前が変わっていないが、
`context` と `vectorContext` を持たない。

当たった箇所:

| どこ | いままで | これから |
|---|---|---|
| kanimarker | map の `postcompose` で生キャンバスへ直接描画 | 専用の VectorLayer に Feature を3つ置く |
| kanimarker | map の `precompose` で `frameState.viewState.center` を書き換え | `view.setCenter()` へ一本化 |
| kanilayer | `vector.on("postcompose")` | `vector.on("postrender")` |
| kanilayer | `tileA.on("precompose")` | `tileA.on("prerender")` |
| app.js | `logo: false` | 削除された。落とすだけ |

**アニメーションを進めるのは map の `precompose`。** `CompositeMapRenderer.renderFrame`
（`renderer/Composite.js`）がどのレイヤーを描くよりも先にこれを投げるので、
ここで Feature を書き換えれば同じフレームに載る。`postrender` だと1フレーム遅れる。

生き残ったもの（移行の足場になった）:

- `frameState.animate = true` による次フレーム要求。`Map.js` が今も見ている
- `rendercomplete`
- 拡張子を省いた subpath import（`import XYZ from 'ol/source/XYZ'`）。
  ol 10 に `exports` マップは無い
- `ol/ol.css`
- `view.getAnimating()` / `getInteracting()`

#### 寸法が pixelRatio から切れた

ol 5 の kanimarker は地図座標で寸法を指定していた。

    vectorContext.drawCircle(new Circle(position, 4 * pixelRatio * resolution))

immediate renderer の transform は `pixelRatio / resolution`（地図座標→デバイス画素）
なので、これは `4 * pixelRatio` CSS ピクセルになる。**retina で 8、それ以外で 4**。
精度円も同じで、半径は `accuracy * pixelRatio / 2` マップ単位＝ retina で
`accuracy` マップ単位だった。

Feature に載せると CSS ピクセルで素直に書ける。実機は retina なので、
そちらで描かれていた値をそのまま定数にしてある（`DOT_RADIUS = 8` など）。
**dsf 1 / 2 / 3 で同じ大きさになることを実測で確認済み。**

精度円を薄くするしきい値にも pixelRatio が掛かっていた。retina で読むと
「円の直径が画面の何割を占めるか」を見ていたことになるので、その形で書き直した。

#### 方位の三角形に縁は無い

ol 5 のコードは `strokeStyle` と `lineWidth = 3` を設定しているが
**`stroke()` を呼んでおらず `fill()` だけ**。つまり縁は描かれていない。

気付かずに SVG へ `stroke` を書いたら、内側へ 1.5 食い込んで見える青が
幅 14 から 7.4 まで縮んだ。

#### インライン SVG をアイコンにするときの注意

`width` / `height` と `viewBox` は**必ず同じ値にする**。ずらすと ol が
固有サイズと viewBox のどちらで大きさを決めるかに結果が左右される。

実効サイズは `固有サイズ × scale` の CSS ピクセルで、**画素密度に依らない**
（全面を塗った矩形に差し替えて dsf 1 / 2 / 3 で測ると 45 CSS ピクセルで一定）。
SVG は `drawImage` の描画先の解像度でラスタライズされるので、等倍で書いても
retina でぼやけない。2倍で書き出して scale 0.5 で戻す小細工は不要。

#### 配架図のラベルが 2.5px 下がった

文字の量は変わっていない（インク量の比 1.0003）。位置だけ動いた。

ol 6 は文字を一度ラベル用のキャンバスへ焼いてから貼る方式になり、
**`textBaseline` をブラウザに渡さなくなった**。常に `middle` で焼いて、
`TEXT_ALIGN[textBaseline] × 実測した高さ` で位置を決める
（`render/canvas/TextBuilder.js`）。`hanging` は **0.2** という近似値なので、
ブラウザ本来の hanging baseline とはずれる。

**補正はしていない。** ol が測った高さに依存する値なので、フォントや端末が
変わればずれ幅も変わる。特定の数字を `offsetY` に埋めても他所で外れる。

#### navigateShelf のズームが変わった

ol 5 の `View#fit` は既定でズームレベルへ丸めていた。ol 6 からは View の
`constrainResolution`（既定 false）に従うので丸めない。

実測すると棚へ移動したときのズームは **19.404** で、ol 5 はこれを **19** へ
落としていた。つまり検索結果から棚へ飛ぶたびに一段引いていた。丸めなくなったぶん
配架図のラベルが読めるようになる。

View に `constrainResolution: true` を足せば元へ戻せるが、ピンチ操作も
ズームレベルへ吸着させるので影響が大きい。**丸めない側を採った。**

あわせて `fit(extent, map.getSize())` の第2引数を直した。ol 4 までは size を
直接渡す形だったが ol 5 で変わっており、**配列を渡しても無視されていた**。

### 7.5.2 / 8.2.0 — 当たらなかった

事前に警戒していたが実際には当たらなかったもの:

- **Icon / RegularShape の displacement のスケーリング（v7）** — displacement を
  使っている箇所が無い
- **`ol/PluggableMap` の廃止（v7）** — 直接は使っていない
- **immediate renderer が context の transform を変えなくなった（v8）** —
  6.15.1 で Feature へ移した時点で immediate renderer を使わなくなっていた。
  ここが一番の当たりどころだったので、Feature 化を先にやった甲斐があった
- RegularShape の `radius1` 削除（v9）、Tile source の `opaque` 削除（v10）— 未使用

### 9.2.4 — 文字が画素の境界に乗らなくなった

字形の大きさも位置もほとんど同じなのに、**塗りが最後まで濃くならない**。

ラベル「参考図書」で測ると:

| | ol 8.2.0 | ol 9.2.4 |
|---|---|---|
| 真っ黒に近い画素 | 116 | 17 |
| 外接矩形 | 56×13 | 54×11 |
| インク量の比 | 1.00 | 0.90 |
| 重心のずれ | — | dx -0.75 / dy -0.23 |

8倍に拡大すると分かるが、**実寸では見分けがつかない**。

原因ではないと確かめたもの:

- **font の指定**（後述）。`"10px sans-serif"` に直しても
  `"15px sans-serif"` + scale 1 に直してもぼやけたまま
- **Text の `scale`**。1.5 のままでも 1 にしても変わらない
- **端末の画素密度**。dsf 1 / 2 / 3 でいずれも同じように起きる。
  等倍で焼いて拡大しているわけではない
- **白フチ**。`stroke` を外しても真っ黒画素は 15 のまま
- ol 側の `snapToPixel` の判定と `createLabel` のキャンバス寸法の計算は
  8.2.0 と 10.10.0 で同じ（`npm pack` して突き合わせ済み）

**10.10.0 でも同じ数字**（真っ黒画素 17 / インク量の比 0.905）なので、
9 だけの一時的な問題ではない。ここから先はこれが既定の見え方になる。

### 10.10.0 — preload と setSource(null) が競合する

    TypeError: Cannot read properties of null (reading 'getTileGridForProjection')
        at enqueueTiles

**画面は正しく描けているのに例外だけ飛ぶ。** e2e が `pageerror` を拾わなければ
気付けない。

ol 10 のタイルレイヤーは `preload` が 0 より大きいと、先読みぶんのタイル要求を
`setTimeout(0)` に載せる（`renderer/canvas/TileLayer.js` の `renderFrame`）。
その遅れて走る `enqueueTiles` は `getRenderSource()` を null 検査せずに使うので、
間に `setSource(null)` が挟まると落ちる。

kanilayer はフェードが終わった背面タイル（tileB）に対してまさにそれをしていた。
tileA / tileB は `preload: 3`。

**ソースを外すのをやめ、`visible` を false にするだけにした**（`hideTileB_`）。
描画対象から外れるのでタイル要求は飛ばない。古いソースは次のフロア切り替えで
上書きされるので、残るのは常に1個だけ。

## 残っている宿題

### Text の font 指定が3つとも不正

`kanilayer.js` の3つの `Text` はいずれも CSS の font 短縮形として成立していない。

    font: "Arial"        ラベル（scale 1.5）
    font: "Arial bold"   目的地メッセージ（scale 2）
    font: "Arial 12px"   ビーコンのデバッグ表示（scale 1）

正しくは `"bold 10px Arial"` `"12px Arial"` のように**サイズが先**。
現状は canvas が既定の `10px sans-serif` にフォールバックしているので、
**Arial も bold も 12px も一度も効いたことがない。**

直すと見た目が動く。ol の `measureTextHeight` は `div` の `style.font` に
代入して測るので、不正な指定だと div が継承したフォント（アプリの CSS）で
測られる。`"10px sans-serif"` に直すとラベルが 4.85px 動いた。

**この移行では触っていない。** 直すなら単体で、基準画像の差分を見ながらやる。

### 9.2.4 の文字のにじみ

上記のとおり当てる場所が見つかっていない。実寸で差が出ないので受け入れたが、
ol 側で直るか、`snapToPixel` に効く設定が見つかれば戻したい。

## 差分を調べる道具

`test/e2e/support` に置いてある。テストからは使わない。

| | 用途 |
|---|---|
| `crop.mjs` | 一部を切り出して整数倍に拡大。2枚並べられる |
| `bbox.mjs` | 指定した色に近い画素の外接矩形と個数 |
| `inkdiff.mjs` | インク量と重心。アンチエイリアスか位置ずれかを切り分ける |

**画素を数えるだけでは足りない。** 位置が同じでアンチエイリアスだけ違う場合と
レイアウトが動いた場合を区別できないので、`inkdiff.mjs` で
「文字の総量」と「重心」を見る。総量が同じで重心が動いていれば位置ずれ、
重心が同じで総量が減っていればにじみ。

    node support/crop.mjs "期待.png,実際.png" 出力.png <x> <y> <w> <h> <倍率>
    node support/bbox.mjs 画像.png <r> <g> <b> [許容差] [x y w h]
    node support/inkdiff.mjs 期待.png 実際.png [x y w h]

基準画像は `test/e2e/map.spec.mjs-snapshots/`、失敗したときの実際の描画は
`test/e2e/test-results/<テスト名>/*-actual.png` に出る。

## 次に上げるときの進め方

1. **メジャーを1つずつ上げる。** まとめて上げると、どの版で何が変わったか分からなくなる
2. 各段で `npm test` → `npm run copy` → `npx cordova prepare browser` → `npx playwright test`
3. 基準画像が動いたら、**撮り直す前に上の道具で中身を見る。**
   位置ずれなのか、にじみなのか、別物が描かれているのかで対応が変わる
4. `pageerror` は e2e が拾う。**画面が正しくても例外が出ていることがある**
5. 成果物のバイト数を記録する
