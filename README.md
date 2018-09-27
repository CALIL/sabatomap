# 鯖江市図書館マップ「さばとマップ」

[![Circle CI](https://circleci.com/gh/CALIL/sabatomap/tree/master.svg?style=svg&circle-token=e92750cac39532ccb9f2a48ecda9153c233eb125)](https://circleci.com/gh/CALIL/sabatomap/tree/master) 
[<img src="https://dply.me/a231vi/button/small" alt="Download to device">](https://dply.me/a231vi#install)

![Splash](www/img/splash_for_browser.png)

## 対象プラットフォーム

- iOS (iOS8.3+)
- Android (4.4+)

## ビルド手順

```bash
npm install -g cordova
npm update
cordova platform update ios
cordova platform update android
gulp
cordova run browser
```

## Windowsでnode-sassのビルドに失敗する場合

npm install --global --production windows-build-tools

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