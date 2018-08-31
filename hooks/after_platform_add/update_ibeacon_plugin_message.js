#!/usr/bin/env node

// cordovaプロジェクトフォルダへの絶対パス
var rootdir = process.argv[2];
// android
var platform = process.env.CORDOVA_PLATFORMS;

if (platform === 'android') {
    var fs = require('fs');
    var filepath = rootdir + '/platforms/android/src/com/unarin/cordova/beacon/LocationManager.java';
    fs.readFile(filepath, 'utf8', function (err,data) {
      if (err) {
        return console.log(err);
      }
      var result = data.replace(/This app needs location access/g, 'さばとマップへようこそ');
      result = result.replace(/Please grant location access so this app can detect beacons./g, '館内マップの表示に位置情報を使います。位置情報へのアクセスを許可してください。');
    
      fs.writeFile(filepath, result, 'utf8', function (err) {
         if (err) return console.log(err);
      });
    });    
}

