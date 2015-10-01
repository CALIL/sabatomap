# さばとマップ

### インストール
```bash
npm install
gulp update
```
### コンパイル
```bash
gulp
```
or
```bash
gulp watch
```
これでplatforms以下のios, android用のプロジェクトが更新される

## 作成時コマンドラインでの作業
cordova create sabaedemo jp.calil.sabaedemo
cordova platform add ios
cordova plugin add cordova-plugin-splashscreen
cordova plugin add https://github.com/petermetz/cordova-plugin-ibeacon.git

/config.xmlの修正

cordova build ios

## Xcodeの作業
platforms/ios/sabaedemo.xcodeproj

Deployment Targetの修正(iOSのバージョン)
Device Orientationの設定

App Icons Sourceの設定
Launch Images Sourceの設定

Resource/splashへもスプラッシュを入れる


# アイコンダウンロード先一覧
http://fortawesome.github.io/Font-Awesome/icon/refresh/
http://fortawesome.github.io/Font-Awesome/icon/thumb-tack/
http://fortawesome.github.io/Font-Awesome/icon/globe/

https://www.google.com/design/icons/#ic_gps_fixed
https://www.google.com/design/icons/#ic_map
https://www.google.com/design/icons/#ic_navigation

https://www.iconfinder.com/icons/284190/archive_circle_compass_safari_web_icon ← 角度のみ修正

https://github.com/encharm/Font-Awesome-SVG-PNG/tree/master/black/svg
