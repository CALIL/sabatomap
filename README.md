# 鯖江市図書館マップ「さばとマップ」

![Splash](www/img/splash_for_browser.png)

## 対象プラットフォーム

- **iOS 18 以上**
- **Android 10 以上**（API 29）

「ここ7年ほどに出た iPhone / Pixel を、その機種で入る最新 OS まで上げた状態」を想定しています。

- iOS 26 は iPhone 11（2019年）以降が対象です。2018年の XR / XS が iOS 18 止まりなので、そこまで拾って 18 を下限にしています
- Android の WebView は OS と別に Play ストアで更新されます。Chrome 139（2025年8月）以降は Android 10 以上が要件なので、Android 10 以上なら最新の WebView が入ります。Pixel 3a の最終 OS が Android 12L、Pixel 4 / 5 が Android 13 なので、いずれも該当します

### 下限を変えるとき

**3か所を必ず一緒に動かしてください。**

| 場所 | 何を書くか |
|---|---|
| `config.xml` の `deployment-target` | iOS の下限。未指定だと cordova-ios の既定が黙って効く |
| `config.xml` の `android-minSdkVersion` | Android の下限。未指定だと cordova-android の既定が黙って効く |
| `.browserslistrc` | esbuild の `target` と autoprefixer のプレフィックス |

`android-targetSdkVersion` は**下限ではありません**。合わせて作る API のレベルで、Google Play の要件です。インストールできる端末を狭めるものではないので、下限の話とは混ぜないでください。

## 地図のしくみ

地図は [OpenLayers](https://openlayers.org/) で描いています。レイヤーは3枚重ねです。

| レイヤー | 中身 | 出どころ |
|---|---|---|
| ベースタイル | 建物の外の地図 | Mapbox（起動から 500ms 後に表示） |
| 配架図 (`Kanilayer`) | フロアの平面図と棚のラベル・ハイライト | タイルは `lab.calil.jp/sabatomap/tiles/`、棚の形は S3 の GeoJSON |
| 現在地 (`Kanimarker`) | 精度円・位置ドット・方位の三角形 | iBeacon の測位結果 |

- **`Kanilayer`**（`src/libs/kanilayer.js`）は `LayerGroup` を継承していて、
  中にタイル2枚（切り替え時のフェード用）とベクターレイヤー1枚を持ちます。
  **棚の絵そのものはタイルに焼かれています。** ベクターレイヤーが描くのは
  棚のラベル、目的地のハイライト、旗のアイコンです
- **`Kanimarker`**（`src/libs/kanimarker.js`）は専用のベクターレイヤーに
  Feature を3つ置き、map の `precompose` で毎フレーム位置・向き・精度を更新します。
  通常・追従・ヘディングアップの3モードがあります
- 棚の位置と施設・ビーコンの定義は `src/sabae.json`。配架図の GeoJSON は
  実行時に S3 から取ります（`src/json/*.json` は同じものの控え）
- **`sabae.json` は `latitude` に経度、`longitude` に緯度が入っています**（名前が逆）。
  コード側もこの並びで読む前提になっている意図的な仕様です。詳しくは CLAUDE.md の
  「データの置き場所」を参照してください

`ol` を上げるときは **`doc/openlayers-migration.md`** を先に読んでください。

## ビルド手順

```bash
npm ci
npx cordova platform add ios
npx cordova platform add android
npm start           # www/ を作って cordova prepare → ブラウザで実行
npm run build       # Android（実機かエミュレータが必要）
npm run build_ios   # iOS
```

`www/` の組み立ては `node tools/build.mjs`（esbuild）です。`npm run watch` で
`src/` を見張りながら作り直せます。詳しくは CLAUDE.md を参照してください。

**`npm run build_browser` の成果物をブラウザで直接開いても動きません。**
`www/index.html` が `cordova.js` を読んで `deviceready` を待つ設計で、`cordova.js` は
`cordova prepare` が `platforms/browser/www/` に注入するためです。確認は `npm start` で。

## 変更の反映

```bash
npm run copy && npx cordova prepare
```

## デバッグ

ブラウザの開発コンソールでエラーを見る

### iOS

Safari → 開発 → シミュレーターもしくは実機

## Android

ChromeのURLに以下を入力

```
chrome://inspect/
```

端末をinspect


## Windowsでgradleへのパスが見つからない場合

https://gradle.org/releases/

Gradleのバイナリーを解凍してbinフォルダへPathを通す<br>

```cmd
set PATH=%PATH%;C:\Users\deguc\Desktop\gradle-5.6.2\bin\
```

```powershell
$PATH = [Environment]::GetEnvironmentVariable("PATH")
$gradle_path = "C:\Users\deguc\Desktop\gradle-8.10.2\bin\"
[Environment]::SetEnvironmentVariable("PATH", "$PATH;$gradle_path")
```

## cordova platform add でエラーが出る場合

プラグインを入れなおしてみる

```powershell
cordova plugin rm cordova-plugin-ibeacon
cordova plugin add https://github.com/CALIL/cordova-plugin-ibeacon
cordova plugin rm cordova-plugin-device-orientation
cordova plugin add https://github.com/CALIL/cordova-plugin-device-orientation
```

## アイコン

`src/component/Icon.jsx` がインライン SVG で描きます。Font Awesome の同梱と CDN 参照は
2026-08-15 に撤去しました（オフラインでアイコンが消える経路だったため）。
アイコンを増やすときは `Icon.jsx` の `ICONS` に path を足してください。

## Android の位置情報の許可ダイアログは OS のものです

**アプリから文言は変えられません。** 表示されるのは Android 標準のダイアログで、
日本語の文言は OS が用意しています。

かつて `hooks/after_platform_add/update_ibeacon_plugin_message.js` が
プラグインの英文を日本語へ置換していましたが、2026-08-16 に削除しました。
**2019 年から何も置換していなかった**ためです。

- 上流のプラグインが 2019-12 に文言を設定で変えられるようにした際、
  置換対象の英文（`This app needs location access`）が消えた。
  実際 2.0.5（2019-10）にはあり、2.0.9（2023-01）には無い
- いまのプラグインは独自ダイアログを出さず、`Activity.requestPermissions` を
  直接呼ぶだけ。`AlertDialog` の import は残っているが未使用
- CI が焼いた APK と署名済み release APK の dex を検索して、
  日本語も英語も **0 件**であることを確認済み

そもそも `platforms/` 以下の生成物を書き換える作りだったので、
**動いていたとしても `cordova prepare` のたびに上書きされて消えていました。**

## Android のテスト版を自動で配る

`master` へ入るたびに、署名済み **APK** を組んで **Google Play の内部アプリ共有**へ上げます
（`.github/workflows/android-deploy.yml`）。実行のまとめにダウンロード URL が出ます。
内部テストトラック（`internal`）を選んだときだけ AAB になります。

**テスターは Play ストアアプリの設定で「内部アプリ共有」を有効に**してから URL を開いてください。

手動実行すると配信先を選べます。

| 配信先 | 中身 |
|---|---|
| `internalsharing`（既定） | ビルドごとに URL。**versionCode が重複していても通る**ので自動配信に向く。トラックには影響しない |
| `internal`（内部テスト） | Play 経由で配られ更新も自動。**`android-versionCode` を先に上げること**。ここで使った番号は production の下限にもなる |

### 認証は OIDC で、鍵は置きません

GitHub の OIDC トークンを Workload Identity Federation で交換します。
**Play へ上げる鍵はこのリポジトリに置きません。**

必要な Variables / Secrets は `.github/workflows/android-deploy.yml` の先頭に
一覧があります。**まだ設定されていないので、いまのままでは最初のステップで止まります。**
値と、Google Cloud 側のリソース（サービスアカウントと Workload Identity の紐付け）は
社内の非公開リポジトリで管理しています。

**このリポジトリは public です。** ワークフローは `pull_request` では走らせていません。
同一リポジトリのブランチからの PR には secrets が渡るためで、
配信は `push: master` と手動実行に限っています。

## Android版ストアへ公開

`config.xml` の `android-versionCode` と `version` をあげる。

```bash
npm run copy
npx cordova prepare android
npx cordova build android --release -- --packageType=bundle
```

`--packageType=bundle` を付けないと AAB ではなく APK ができる。Google Play が要求するのは AAB。

1Password の「さばとマップ」の keystore をダウンロードして、プロジェクトのルートに
`sabatomap-keystore.jks` として保存する（`.gitignore` 済み）。
パスワードと鍵エイリアスも同じ項目に入っている。

```bash
op document get <item> --output ./sabatomap-keystore.jks
jarsigner -keystore ./sabatomap-keystore.jks platforms/android/app/build/outputs/bundle/release/app-release.aab <alias>
jarsigner -verify platforms/android/app/build/outputs/bundle/release/app-release.aab
```

**このリポジトリは public なので、item ID や鍵エイリアスは書かない。**
必要な値は 1Password 側にある。

`npm run release` は `cordova run android --release` で、**実機かエミュレータへ送り込む操作**なので
ストア用の成果物は作れない。混同しないこと。

## 更新履歴

- 2015/11/6 オープンソースとして公開

## ライセンスについて

The MIT License (MIT)

Copyright (c) 2015 CALIL Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

鯖江市図書館キャラクター「れさのすけ」「れさたろう」の著作権は鯖江市図書館に帰属します。
画像データは鯖江市図書館の許諾に基づきプロジェクトに同梱されていますが、再利用にあたっては鯖江市図書館にご確認ください。
このプロジェクトは鯖江市がオープンデータライセンス(CC-BY)で公開中および公開予定のデータを含んでいます。
