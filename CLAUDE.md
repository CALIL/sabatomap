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
| `.browserslistrc` | `ios_saf >= 18` / `chrome >= 130` | Babel の変換、core-js の注入量、autoprefixer |

`android-targetSdkVersion`（36）は**下限ではありません**。合わせて作る API のレベルで、Google Play の要件です。インストールできる端末を狭めるものではありません。

### Babel の設定は babel.config.json に集約されている

`.babelrc` は使いません。browserify の `-g babelify` はグローバル変換で `node_modules` も通しますが、**`.babelrc` は `node_modules` に適用されません**。`babel.config.json`（ルート設定）なら両方に効きます。

`compile` スクリプトで `--presets` を渡さないでください。**プログラム指定の options は設定ファイルより優先される**ため、`--presets @babel/preset-env` のように素で渡すと、設定ファイル側の `useBuiltIns` や `targets` がまるごと無視されます。以前これで polyfill が 1 つも入っていませんでした。

ポリフィルは `useBuiltIns: "usage"` + core-js 3 で自動注入します。`@babel/polyfill` は使いません（非推奨、Babel 8 で削除）。

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

上流が古い依存を掴んでいて、そのままでは脆弱性が残るものだけ固定しています。**外すと `npm audit` の high / moderate が戻ります。**

| | 固定先 | 理由 |
|---|---|---|
| `terser` | `^4.8.1` | uglifyify 5.0.2 が `terser ^3.7.5` を要求するが、ReDoS の修正は 4.8.1。**5 系にはしないこと** — uglifyify は `ujs.minify()` を同期で呼んでおり、terser 5 の `minify()` は Promise を返すので壊れる |
| `uuid` | `^11.1.1` | cordova-ios 8.1.1 → xcode 3.0.1 が `uuid ^7.0.3`。xcode は `uuid.v4()` しか使わず、11 でもそのまま動くことを確認済み |

### 残っている指摘（elliptic 系 4件・low）

`elliptic` に修正版がありません（`browserify-sign` `create-ecdh` `crypto-browserify` はその親）。

いずれも browserify が Node の組み込みモジュールを差し替えるために持っているもので、**ソースが `crypto` を読み込んでいないためバンドルには入りません**。確認方法：

```bash
npx browserify -g babelify -g uglifyify --entry src/app.js --list | grep -c elliptic
# → 0
```

上流が直すか、browserify をやめるまでは消せません。

## よく使う開発コマンド

### 開発

- `npm start` - コンパイル、準備、ブラウザで実行
- `npm run compile` - BrowserifyとBabelでJavaScriptをバンドル
- `npm run copy` - コンパイルとすべてのgulpタスクを実行

### ビルド

- `npm run build` - Android向けビルド
- `npm run build_ios` - iOS向けビルド（iPhone-14をターゲット）
- `npm run build_browser` - ブラウザのみのビルド
- `npm run release` - Androidリリース版のビルド

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