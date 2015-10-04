# さばとマップ

### 準備
基本作業
```bash
npm update
```

コンパイルが通らないのでひとまず↓のコマンドを実行
```bash
cordova platform update ios
```

### コンパイル
platforms以下のios, android用のプロジェクトに反映
```bash
gulp
```
又は, 
```bash
gulp watch
```

## プロジェクトを作成した時の作業

```bash
cordova create sabatomap jp.calil.sabatomap
cordova platform add ios
cordova plugin add cordova-plugin-splashscreen
cordova plugin add https://github.com/petermetz/cordova-plugin-ibeacon.git
```

/config.xmlの修正

```bash
cordova build ios
```

### Xcodeの作業
platforms/ios/Sabae\ Library\ Map.xcodeproj

Deployment Targetの修正(iOSのバージョン)

App Icons Sourceの設定
Launch Images Sourceの設定

Resource/splashへもスプラッシュを入れる


## アイコンダウンロード先一覧
http://fortawesome.github.io/Font-Awesome/icon/refresh/
http://fortawesome.github.io/Font-Awesome/icon/thumb-tack/
http://fortawesome.github.io/Font-Awesome/icon/globe/

https://www.google.com/design/icons/#ic_gps_fixed
https://www.google.com/design/icons/#ic_map
https://www.google.com/design/icons/#ic_navigation

https://www.iconfinder.com/icons/284190/archive_circle_compass_safari_web_icon ← 角度のみ修正

https://github.com/encharm/Font-Awesome-SVG-PNG/tree/master/black/svg
