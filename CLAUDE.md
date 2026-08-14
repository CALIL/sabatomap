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
`postcss([autoprefixer, postcss-assets])` です。2点だけ動かさないこと。

- **`style: 'expanded'` を明示している。** `gulp-sass` 6 の modern API の既定と同じ値で、
  変えると出力が変わります。移行時に gulp 版と1文字も違わないことを確認しました
- **`postcss-assets` は必須。** `src/app.sass` が `resolve()` を6箇所で使っています

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

`test/interop.test.js` は `superagent` と `geolib` の受け取り方、および `src/api.js` の
クエリ正規化関数を固定します。

グローバルの `window.app`（`src/app.js:5313` で代入）を `src/component` の各所が直に参照するため、
`test/setup.js` でスタブしています。`app.js` を読み込むと `ol` と `cordova` まで要るためです。
`fetch` も解決しない Promise を返すスタブにしてあり、テストが実 API を叩くことはありません。

## package.json の overrides

上流が古い依存を掴んでいて、そのままでは脆弱性が残るものだけ固定しています。

| | 固定先 | 理由 |
|---|---|---|
| `uuid` | `^11.1.1` | cordova-ios 8.1.1 → xcode 3.0.1 が `uuid ^7.0.3`。xcode は `uuid.v4()` しか使わず、11 でもそのまま動くことを確認済み |

`terser` の `^4.8.1` 固定は **uglifyify のためだけに存在していた**ので、esbuild 移行で外しました。
`npm audit` は現在 **0 件**です（browserify が Node の組み込みモジュールを差し替えるために
持っていた `elliptic` 系 low 4件も、browserify ごと消えました）。

### allowScripts

`esbuild` の postinstall を許可しています。`@parcel/watcher`（vitest 経由）は
入っていなくてもポーリングにフォールバックするので許可していません。

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
   - **Kanimarker** (`src/libs/kanimarker.js`): コンパス統合付き利用者位置マーカー
   - ベースタイル: Mapbox、フロアタイル: `lab.calil.jp/sabatomap/tiles/`

3. **本の検索と位置** (`src/api.js`)
   - 図書カタログ用Unitrad APIとのインターフェース
   - 本を物理的な棚の位置にマッピング
   - フロアプラン上でターゲット棚をハイライト

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