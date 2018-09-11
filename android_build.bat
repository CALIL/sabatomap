cordova build android --release

jarsigner -verbose -tsa http://timestamp.digicert.com -sigalg SHA1withRSA -digestalg SHA1 -keystore ./calil.keystore ./platforms/android/build/outputs/apk/android-release-unsigned.apk calil
jarsigner -verify -verbose -certs ./platforms/android/build/outputs/apk/android-release-unsigned.apk

zipalign -v 4 ./platforms/android/build/outputs/apk/android-release-unsigned.apk android-release.apk
