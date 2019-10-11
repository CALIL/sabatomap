cordova build android --release

REM https://qiita.com/nogson/items/abe1016f36c3b331db30
REM https://stackoverflow.com/questions/44874386/apk-upload-failed-for-alpha-version-errors-from-apksigner-digest-algorithm-and
REM keystore pass keepass
jarsigner -verbose -tsa http://timestamp.digicert.com -sigalg SHA1withRSA -digestalg SHA1 -keystore ./calil.keystore ./platforms\android\app\build\outputs\apk\release\app-release-unsigned.apk calil
jarsigner -verify -verbose -certs ./platforms\android\app\build\outputs\apk\release\app-release-unsigned.apk
zipalign -v 4 .\platforms\android\app\build\outputs\apk\release\app-release-unsigned.apk android-release.apk
