# 鯖江市図書館マップ「さばとマップ」

[![Circle CI](https://circleci.com/gh/CALIL/sabatomap/tree/master.svg?style=svg&circle-token=e92750cac39532ccb9f2a48ecda9153c233eb125)](https://circleci.com/gh/CALIL/sabatomap/tree/master)

![Splash](www/img/splash_for_browser.png)


### 対象プラットフォーム

- iOS (iOS8.3+)
- Android (4.4+)
- Windows (10+)

### ビルド環境の整備

- node.js (0.12+)
- bower
- Cordava 5.1.1

```bash
npm install -g bower
npm install -g cordova
npm update
bower update
gulp
cordova platform update ios
cordova platform update android
cordova platform update windows
```
