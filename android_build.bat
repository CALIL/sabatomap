cordova build android --release

REM https://qiita.com/nogson/items/abe1016f36c3b331db30
REM https://stackoverflow.com/questions/44874386/apk-upload-failed-for-alpha-version-errors-from-apksigner-digest-algorithm-and
jarsigner -verbose -tsa http://timestamp.digicert.com -sigalg SHA1withRSA -digestalg SHA1 -keystore ./calil.keystore ./platforms/android/build/outputs/apk/android-release-unsigned.apk calil
jarsigner -verify -verbose -certs ./platforms/android/build/outputs/apk/android-release-unsigned.apk

zipalign -v 4 ./platforms/android/build/outputs/apk/android-release-unsigned.apk android-release.apk
