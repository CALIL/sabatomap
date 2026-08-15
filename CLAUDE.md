# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code) への指針を提供します。

## 概要

さばとマップ（Sabatomap）は、鯖江市図書館の屋内ナビゲーション用ハイブリッドモバイルアプリケーションです。Apache Cordova、React、iBeacon技術を使用して、利用者が本を見つけて図書館のフロアを移動するのを支援します。

## サポート下限とビルド条件

**iOS 18 以上 / Android 10 以上（API 29）**。「ここ7年ほどに出た iPhone / Pixel を、その機種で入る最新 OS まで上げた状態」を想定しています。

下限は 3 か所に分かれていて、**必ず一緒に動かします**。

| 場所 | 値 | 効くもの |
|---|---|---|
| `config.xml` の `deployment-target` | `18.0` | iOS でインストールできる範囲 |
| `config.xml` の `android-minSdkVersion` | `29` | Android でインストールできる範囲 |
| `.browserslistrc` | `ios_saf >= 18` / `chrome >= 130` | esbuild の `target`、autoprefixer |

`android-targetSdkVersion`（36）は**下限ではありません**。合わせて作る API のレベルで、Google Play の要件です。インストールできる端末を狭めるものではありません。

### ビルドは tools/build.mjs（esbuild）

2026-08-15 に browserify + babelify + uglifyify + gulp + Babel + core-js の一式を撤去し、
**`tools/build.mjs` の esbuild に置き換えました**。Babel も gulp も使いません。

```bash
node tools/build.mjs release   # www/ を作る（minify あり・sourcemap なし）
node tools/build.mjs debug     # minify せず inline sourcemap つき
node tools/build.mjs watch     # src/ を見張って debug ビルドを回し続ける
node tools/build.mjs clean     # platforms/ios/www を消す
```

`.browserslistrc` から esbuild の `target` を作るのは `tools/browserslist-target.mjs` です。
**下限をここにハードコードしないでください。** 3か所（`config.xml` の2つと `.browserslistrc`）が
ずれないよう、`.browserslistrc` を唯一のソースにしてあります。

`unitrad-view` / `unitrac-ui` / `unitrad-ui` / `unitrad-ui-nagano` / `unitrad-kintone-plugin` は
`tools/lib/` に js / css / html / site を分けていますが、あれは conf ごとに2000件以上を並列
ビルドするための構造です。sabatomap は配信先が1つなので1ファイルに収めてあります。
`tools/browserslist-target.mjs` はあちらと同じものなので、直すときは横展開してください。

**CSS は esbuild を通していません**（他リポジトリと同じ方針）。`sass` の `compile` →
release なら `postcss([autoprefixer, cssnano])`、debug なら `postcss([autoprefixer])` です。

- **`style: 'expanded'` を明示している。** minify は `cssnano` に任せるので、
  `sass` 側は読みやすい出力のままにしておきます
- **`minify` は release だけ。** debug で潰すと手元で読めなくなります。
  `unitrad-view` / `unitrac-ui` などと同じ構成です
- **`autoprefixer` はまだ仕事をしているので外さないこと。** この下限（chrome 130 / iOS 18）でも
  `-webkit-user-select` を6件と `-webkit-transition` を1件足します
  （後者は `::-webkit-input-placeholder` の中なので正しい挙動）

### postcss-assets はやめました

`resolve('compass.svg')` を `url('../img/compass.svg')` に置き換えるだけの用途で使っていましたが、
**2021-05-13 を最後に更新が止まっており**、CALIL の全ミラーで使っているのは sabatomap だけでした。
`src/app.sass` に `url('../img/…')` と直接書く形にして依存を外しています（6箇所）。

`../img/` は `www/css/app.css` から見た相対パスです。**画像を増やすときも `url('../img/…')` と
書いてください。** `resolve()` を書き戻すと未定義の関数として出力にそのまま残ります。

### polyfill は入れていません

`useBuiltIns: "usage"` + core-js 3 をやめました。実測の根拠がこれです。

- core-js は26モジュール（+ internals 145）＝ **145KB 注入されていました**が、中身は全部が誤検知
- `useBuiltIns: "usage"` は受け手の型を見ずメソッド名だけで判定します。配列の `map` /
  `filter` / `forEach` を書いただけで iterator ヘルパーの polyfill が入るのが増幅源でした
- `src/` が実際に使うのは `new Map()` 1箇所と `Array.prototype.includes` 2箇所だけで、
  どちらも chrome 130 / iOS 18 にネイティブです

**下限を下げるときはここを再確認してください。** 足りない API が出たら core-js を戻すのではなく、
`unitrad-view` の `src/js/polyfill.ts` のように「足りないものだけ」を補う形にします。

### process.env.NODE_ENV は define で固定しています

browserify のときは定義されておらず、`react-dom/client.js` の
`"production" === process.env.NODE_ENV` が偽になって **development ビルドが実行されていました**
（成果物に `Invalid hook call` などの development 専用文字列が残り、ブラウザのコンソールに
`Download the React DevTools for a better development experience` が出ていた）。
`tools/build.mjs` の `define` で固定しているので外さないこと。

### charset は utf8 を明示しています

esbuild の既定は `charset: 'ascii'` で、日本語を `\uXXXX` に展開します。browserify は生の
UTF-8 を出していて本番で動いていたので挙動を合わせました（`www/index.html` が
`<meta charset="utf-8">` を宣言しており、`charset` 属性の無い外部スクリプトは文書の
符号化で解釈されます）。成果物を grep で確かめられる利点もあります。

### Flow は使いません

`src/api.js` と `src/component/App.jsx` に Flow の型注釈と `// @flow` プラグマが残っていましたが、
2026-08-15 に撤去しました。`flow-bin` も `.flowconfig` も無く、`UnitradQuery` / `UnitradResult` /
`UnitradQueryLoose` という**型名がどこにも定義されていない**状態だったので、型検査は一度も
走っていませんでした（unitrad-ui 由来のコードの名残）。

**`// @flow` を書き戻さないでください。** rolldown / oxc / esbuild はいずれも Flow を扱えず、
プラグマ1行だけで `Flow is not supported` としてパースを拒否します。`vitest` が動かなくなります。

## テスト

```bash
npm test          # vitest run
```

`test/mount.test.jsx` が jsdom で React コンポーネントを実際に `createRoot` してマウントします。
**「ビルドが通る」だけでは足りない**ためです。CommonJS の依存を バンドラー が `__toESM(..., 1)` で
包むと、`__esModule` を見ずに `module.exports` 全体が `default` に入り、
`import C from 'pkg'` がコンポーネントではなくオブジェクトになって描画時に落ちます。
型もビルドも通るので、1回描画するテストが無いと気づけません。

`test/interop.test.js` は `ol/sphere` の受け取り方、`src/api.js` のクエリ正規化関数、
および **`src/sabae.json` の座標の並び**（後述）を固定します。

グローバルの `window.app` を `src/component` の各所が直に参照するため、
`test/setup.js` でスタブしています。`app.js` を読み込むと `ol` と `cordova` まで要るためです。
`fetch` も解決しない Promise を返すスタブにしてあり、テストが実 API を叩くことはありません。

### 地図の描画は e2e でしか見ていない

**jsdom は canvas を持たないので、`npm test` は OpenLayers の描画を1行も検証していません。**
地図・レイヤー・マーカーが壊れたと分かるのは `test/e2e` だけです。

```bash
npm run copy && npx cordova prepare browser   # 先に配信物を作る
cd test/e2e && npm ci && npx playwright install chromium
npx playwright test                            # 基準画像と突き合わせる
npx playwright test --update-snapshots         # 見た目を意図的に変えたとき
```

`test/e2e` は**独立した `package.json`** です（本番の依存を汚さないため。`unitrad-view` と同じ）。

- 配信は `platforms/browser/www`。`www/` を直接配信しないのは、`index.html` が
  `cordova.js` を読んで `deviceready` を待つ設計で、それを置くのが `cordova prepare` だから
- ネットワークは全部スタブ（`support/stub.mjs`）。**ホスト名ではなくパスで当てている**。
  ホスト決め打ちにすると向き先が変わったとき静かに実 API へ素通りする
- タイルは単色 PNG をその場で生成して返す。**棚の絵は配架図タイル（ラスタ）に焼かれている**ので、
  基準画像に写るのは OpenLayers が描くもの（ラベル・旗・ハイライト・マーカー）だけになる。
  レンダラの退行を見るには都合がよい
- 配架図の GeoJSON は `src/json/*.json` を流用する。S3 が返すものの控え

**撮る前に必ず `settle()` を通すこと。** `rendercomplete` を1回待つだけでは足りません。
その瞬間に要求されていなかったタイルは待ってもらえず、**ベースタイルのレイヤーは
`initializeApp` の 500ms 後に visible になる**ので取りこぼします。`settle()` は
通信が2回続けて動かなくなるまで回し、`view.getAnimating()` が下りるのも待ちます。

**基準画像は OS ごとに別ファイル**です（`-chromium-linux.png` / `-chromium-win32.png`）。
文字の描画が OS で違うので共有できません。Linux 側は CI が書き出したものを
artifact から持ち帰ってコミットします。

### 地図を外から動かすための入口

`window.app` に3つ足してあります。ブラウザには iBeacon もコンパスも無いので、
測位から先を動かすには外から差し込むしかありません。手で調べるときにも使えます。

| | |
|---|---|
| `app.pushBeacons(beacons)` | 本番で cordova のプラグインが呼ぶ `didRangeBeaconsInRegion` と同じ入口 |
| `app.getMap()` | View の状態を見る / `rendercomplete` を待つ |
| `app.getMarker()` | `cancelAnimation()` で描画を止める |

**追従モードはブラウザでは到達できません。** `invalidateLocator`（`app.js`）が
`change:mode` を購読していて、`cordova.plugins.BluetoothStatus.hasBTLE` か
`BTenabled` が偽なら**その場で `setMode("normal")` に戻す**からです。
e2e は `enableBluetooth()` で BLE を持つ端末のふりをしてから確かめています。

### ★ Android では Bluetooth の ON/OFF を判定していません

`cordova-plugin-bluetooth-status` は **2016年2月が最終公開**で、Android の権限体系が
変わる前の作りのままです。`plugin.xml` が宣言するのは `BLUETOOTH` と `BLUETOOTH_ADMIN`
だけで、**どちらも targetSdk 31 以上のアプリでは無視されます**。

`cordova platform add android` で生成されるマニフェストを見ると、実際に

```
BLUETOOTH / BLUETOOTH_ADMIN     ← レガシー。targetSdk 36 では効かない
BLUETOOTH_SCAN                  ← iBeacon プラグインが足したもの
（BLUETOOTH_CONNECT は無い）
```

となります。`BluetoothStatus.java` の `initPlugin()` は

```java
sendJS("... hasBTLE = true;");     // ここまでは通る
if (bluetoothAdapter.isEnabled())  // API 31+ は BLUETOOTH_CONNECT が要る
```

の順で、`isEnabled()` が例外を投げても false を返しても、**`BTenabled` は
初期値の `false` のまま**になります（`BluetoothStatus.js` が `false` で初期化）。
つまり「オフ」と「分からない」を区別できません。

そのままだと `invalidateLocator` が「測定できません」を出し続けて
**現在地ボタンが永久に塞がります。**

#### どう直したか

`app.js` の `canTrustBluetoothState()` が **Android では `BTenabled` を信用しません。**

| | Android | iOS |
|---|---|---|
| BLE を持たない端末 | ボタンを塞ぐ（`hasBTLE` は権限が要らないので当てにできる） | 同じ |
| Bluetooth がオフ | **塞がない。** 押せば測位に進み、取れなければ「BluetoothがONか確かめてください」 | 押した時点で「BluetoothをONにしてください」 |

読み取るだけのために `BLUETOOTH_CONNECT`（実行時許可）をユーザーに求めるのは
割に合わないと判断しました。iOS は CoreBluetooth で権限の分割が無いので
これまで通りです。

**iBeacon プラグイン側の `isBluetoothEnabled()` も、AltBeacon の
`checkAvailability()` 経由で同じ `isEnabled()` を呼びます。**
乗り換えても直りません（調査済み）。

e2e で Android と iOS の両方を固定してあります
（`pretendBluetoothOff(page, {platformId})`）。

代償として、Android 11 以前でも Bluetooth オフの案内が
「押してから」になります。minSdk は 29 なので該当はしますが、
判定できない機種のほうが多数です。

## package.json の overrides

上流が古い依存を掴んでいて、そのままでは脆弱性が残るものだけ固定しています。

| | 固定先 | 理由 |
|---|---|---|
| `uuid` | `^11.1.1` | cordova-ios 8.1.1 → xcode 3.0.1 が `uuid ^7.0.3`。xcode は `uuid.v4()` しか使わず、11 でもそのまま動くことを確認済み |

**`uuid` は 11 が上限です。**「uuid@10 and below is no longer supported. For ESM codebases,
update to uuid@latest. For CommonJS codebases, use uuid@11」と本家が言っており、
`xcode` は `require('uuid')` の CommonJS です。最新は 14 ですが、上げると
iOS のビルドが壊れます。**CI は Android しか組まないので気づけません。**

`terser` の `^4.8.1` 固定は **uglifyify のためだけに存在していた**ので、esbuild 移行で外しました。
`npm audit` は現在 **0 件**です（browserify が Node の組み込みモジュールを差し替えるために
持っていた `elliptic` 系 low 4件も、browserify ごと消えました）。

### allowScripts

`esbuild` の postinstall を許可しています。`@parcel/watcher`（vitest 経由）は
入っていなくてもポーリングにフォールバックするので許可していません。

### プラグインは package.json が唯一のソースです

**`plugins/` は追跡していません**（`platforms/` と同じ生成物扱い。cordova の推奨）。
`cordova prepare` が `package.json` の `cordova.plugins` と devDependencies を見て
node_modules から組み立てます。

```
package.json（cordova.plugins + devDependencies）
  → npm ci で node_modules へ
    → cordova prepare が plugins/ を組み立て
      → platforms/<name> へ導入
```

プラグインを足すときは `cordova plugin add <名前>` を使ってください。
`package.json` の両方（`cordova.plugins` と devDependencies）に書かれます。

**2026-08-15 に vendoring をやめました。** コミットしていた頃は cordova-lib の
`restore-util.js` が「`plugins/<id>/` があるなら導入済み」と判断して node_modules を
見に行かないため、**package.json を上げてもビルド内容が変わりませんでした**。
実際に `cordova-plugin-device-orientation` が宣言 3.0.1-dev / 実体 3.0.0-dev で
ずれていましたし、Dependabot の bump PR は `package-lock.json` しか触らないので
1バイトも効きませんでした。

`cordova-plugin-device` は **iBeacon プラグインが `<dependency>` で要求している**ので
外せません。vendoring をやめると `fetch.json` の `@*` でレジストリの最新を引くように
なるため、devDependencies に `^3.0.0` として明示しています。
`src` から `device.*` は使っていません（2022年の `d20c756`
「device.platform → cordova.platformId」で使われなくなった）。

`cordova-lib` も外してあります。`cordova` 自身が同じ `^13.0.0` を依存に持つ重複でした。

## cordova プラグインの git 参照は SHA で固定しています

```
com.unarin.cordova.beacon:         github:CALIL/cordova-plugin-ibeacon#c60fb0e...
cordova-plugin-device-orientation: github:CALIL/cordova-plugin-device-orientation#16a8747...
```

ref 指定なしだと `npm install` を実行したタイミングで解決先が変わります。
実際に3年前まで巻き戻った差分が手元に残っていたことがあります。

`plugins/` の追跡をやめたので、**この固定がそのままビルド内容に効きます。**

`platforms/platforms.json` は追跡していません。`platforms/` を無視している以上、
それと対で意味を持つ状態ファイルを追跡してはいけないためです。以前はコミットされていて、
中身が `browser 5.0.4 / android 6.4.0 / ios 4.5.5` と2〜9メジャー古いままでした。

## アイコンはインライン SVG

`src/component/Icon.jsx` が `<svg className="icon">` を描きます。使うのは
`search` / `times` / `play` / `arrow-left` / `chevron-right` の**5つだけ**です。
増やすときは `ICONS` に viewBox と path を足してください。

**Font Awesome には戻さないでください。** 2026-08-15 に撤去した理由が2つあります。

1. 実際に使うのは5アイコンなのに、`fontawesome-free-5.15.4-web/` として
   **1701ファイル（約14.6MB）を同梱**していた
2. `www/index.html` はローカルの CSS ではなく **CDN（`use.fontawesome.com`）を読んでいた**ので、
   **オフラインではアイコンが出なかった**。Cordova アプリで外部ホストに依存していた

寸法は Font Awesome の webfont と**ピクセル単位で一致**させてあります。`src/app.sass` の
`.icon` が `height: 1em` だけを指定し、width を指定していないので、幅は viewBox の比率で
決まります（`fa-times` なら 352/512 = 0.6875em）。これは Font Awesome の
`svg-inline--fa` と同じ寸法です。**width を足さないこと。**

`fill: currentColor` も必須です。`.box button` が `color` と `transition: color 0.4s` で
`:hover` / `:focus` の色を変えており、`::before` のグリフだった前提を保つためです。

path データの出典は Font Awesome Free 5.15.4 の `svgs/solid/*.svg` で、
アイコンのライセンスは CC BY 4.0 です。

## データの置き場所

### ★ sabae.json は latitude に経度、longitude に緯度が入っている

鯖江市は北緯 35.96 / 東経 136.18 ですが、`beacons` / `nearest1` / `nearest2` / `nearestD` の
**448点すべてで `latitude` に 136 台、`longitude` に 35 台**が入っています。名前が逆です。

**このリポジトリは座標を「位置」で扱っていて、それで辻褄が合っています。**
第1要素（`latitude`）を経度、第2要素（`longitude`）を緯度として渡す約束です。

| 場所 | 書き方 |
|---|---|
| `src/app.js` の `change:position` | `transform([p.latitude, p.longitude], "EPSG:4326", ...)` |
| `src/libs/kanikama.js` のフロア判定 | `getDistance([b.latitude, b.longitude], ...)`（`ol/sphere` は `[経度, 緯度]`） |
| `bbox` | `[経度, 緯度, 経度, 緯度]`。こちらは EPSG:4326 の正しい並び |

**フィールド名を直すなら、上の2箇所も同時に直してください。** データだけ直すと
地図のマーカーと距離が両方おかしくなります。片方だけでも同じです。
`test/interop.test.js` の「sabae.json の座標の並び」がこの取り違えを落とします。

かつて `geolib` を使っていたときは、**名前で読むライブラリだったので間違えていました**。
全 24,449 ペアで実測すると平均 18.1〜18.4 パーセント、最大 98.8 パーセントずれ、
3m 判定が 170 組で変わっていました。2026-08-15 に `ol/sphere` へ寄せて解消しています。

### 施設・ビーコンデータは src/sabae.json が唯一のソース

`src/app.js` が `import rules from './sabae.json'` で読み、`initializeApp()` が
`InitUI({facilities: rules})` と `kanikama.facilities_ = rules` に渡します。
**施設・フロア・ビーコンを増やすときはこのファイルだけを直してください。**

経緯を書いておきます。2016年の初版はこの形でした。`src/app.js` には `__RULES__` という
プレースホルダだけがあり、`gulp buildjs` が `replace('__RULES__', fs.readFileSync('src/sabae.json'))`
でビルド時に差し込んでいました。ところが 2019-04-23（`a1eb2dc`）にビルドが gulp から
npm script の素の browserify へ移った際、replace 工程が無くなったぶんを埋めるために
**JSON が `src/app.js` へ直接貼り付けられ**（+4935/-77、458行 → 5316行）、
`src/sabae.json` は 2016-02-15 から更新されないまま残りました。

2026-08-15 に `import` へ戻しました。両者は `JSON.stringify` レベルで完全一致していた
（どちらも凍結していた）ので、データの内容は変わっていません。

### 配架図の GeoJSON は S3 から取ります

`src/libs/kanilayer.js` の `getHaikaVectorSource_` が
`https://s3-ap-northeast-1.amazonaws.com/calil.sabatomap2/<フロアID>.json` を読みます。

`src/json/7.json` と `8.json` は**同じ内容のローカル控え**です。2019-10-29 に
一度ローカル参照へ変えた（`d256d85`）ものの同日に S3 へ戻した（`e5569f3`）ため、
現在どこからも読まれていません。**S3 バケットが失われたときの控えとして残してあります。**
`tools/build.mjs` の `COPIES` が `www/json/` へ置くのも同じ理由です。
ローカル参照へ戻すのは `getHaikaVectorSource_` の1行です。

## よく使う開発コマンド

### 開発

- `npm start` - `www/` を作って `cordova prepare` → ブラウザで実行
- `npm run watch` - `src/` を見張って `www/` を作り直し続ける
- `npm run copy` - `www/` を作る（JS・CSS・vendor・json）。**CI が呼ぶのはこれ**

`copy` / `compile` / `build_browser` は同じ `node tools/build.mjs release` の別名です。
`copy` という名前は `ci.yml` と `android.yml` が呼んでいるので変えないこと。

### ビルド

- `npm run build` - Android向けビルド
- `npm run build_ios` - iOS向けビルド（iPhone-14をターゲット）
- `npm run build_browser` - `www/js/all.js` と `www/css/app.css` を作るだけ
- `npm run release` - Androidリリース版のビルド

**`npm run build_browser` の成果物をブラウザで直接開いても動きません。**
`www/index.html` が `<script src="cordova.js">` を読んで `deviceready` を待つ設計で、
`cordova.js` は `cordova prepare` が `platforms/browser/www/` に注入するため
`www/` 直下には存在しません。ブラウザでの確認は `npm start` を使ってください。

### プラットフォームセットアップ

```bash
npm install -g cordova
npm update
cordova platform add ios
cordova platform add android
```

### 変更の適用

```bash
cordova prepare
```

## アーキテクチャ概要

### 主要コンポーネント

1. **iBeacon処理システム** (`src/libs/kanikama.js`)
   - Bluetoothビーコン信号のバッファリングと処理
   - 三点測位による利用者位置の計算
   - ビーコン近接度に基づく施設/フロア検出の管理
   - UUID: `00000000-71C7-1001-B000-001C4D532518`

2. **地図レンダリングシステム**
   - **Kanilayer** (`src/libs/kanilayer.js`): フロアプラン用のカスタムOpenLayersレイヤー
   - **Kanimarker** (`src/libs/kanimarker.js`): コンパス統合付き利用者位置マーカー。
     精度円・位置ドット・方位の三角形をそれぞれ Feature として専用の VectorLayer に置き、
     map の `precompose` で1フレーム分アニメーションを進めて書き戻します
   - ベースタイル: Mapbox、フロアタイル: `lab.calil.jp/sabatomap/tiles/`
   - **`ol` を上げるときは `doc/openlayers-migration.md` を先に読んでください。**
     2026-08-15 に 5.3.3 → 10.10.0 へ上げたときの、版ごとに当たった変更・
     当たらなかった変更・受け入れた見た目の差と、差分を調べる道具がまとまっています

3. **本の検索と位置** (`src/api.js`)
   - 図書カタログ用Unitrad APIとのインターフェース
   - 本を物理的な棚の位置にマッピング
   - フロアプラン上でターゲット棚をハイライト
   - **通信は `fetch` のみ。** 2026-08-15 に superagent を撤去しました。
     `polling` は `timeout=10` を渡しますが、これは**サーバ側のロングポーリングの指定**で
     クライアントの待ち時間ではありません。「更新なし」はレスポンスが `null` で返ります
   - `fetchMapping` は**どこからも呼ばれていません**（unitrad-ui 由来の名残）。
     さばとマップの棚マッピングは `sabatomap-mapper.calil.jp` を使います。
     `normalizeQuery` / `isEmptyQuery` / `isEqualQuery` も app 側からは未使用で、
     テストが挙動を固定しているだけです

### データフロー

1. **屋内測位**: 物理ビーコン → Cordovaプラグイン → Kanikama処理 → 位置更新 → 地図マーカーアニメーション
2. **本の検索**: 利用者クエリ → Unitrad API → 位置マッピング → 地図上の棚ハイライト
3. **フロアナビゲーション**: ビーコン信号 → フロア検出 → 自動フロア切り替え → 地図更新

### 主要Reactコンポーネント

- `App.jsx` - 施設/フロア状態を管理するメインコンポーネント
- `Search.jsx` - 検索結果表示付き本検索インターフェース
- `Locator.jsx` - 位置情報サービスコントロールUI
- `Floors.jsx` - 手動フロアセレクター

## 重要事項

- このアプリケーションは鯖江市図書館専用に設計されており、ビーコン設定がハードコードされています
- iBeacon用のカスタムCordovaプラグイン（CALILからフォーク）とデバイス方向プラグインを使用
- フロアプランとマッピングデータは外部エンドポイントから提供されます
- 本のマッピングAPIエンドポイント: `sabatomap-mapper.calil.jp`

## Androidリリース手順

1. config.xmlの`android-versionCode`と`version`を更新
2. 1Passwordからkeystoreをダウンロード（「さばとマップ」として保存）
3. keystoreをプロジェクトルートに配置
4. 適切な署名でリリース版をビルド（keyAlias: calil）