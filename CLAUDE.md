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