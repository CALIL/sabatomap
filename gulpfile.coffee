bower = require 'bower'
del = require 'del'
gulp = require 'gulp'
coffee = require 'gulp-coffee'
download = require 'gulp-download'
concat = require 'gulp-concat'
exec = require 'gulp-exec'
path = require 'path'
fs = require 'fs'
cordova_lib = require('cordova-lib')
cdv = cordova_lib.cordova.raw

react       = require('gulp-react')
# gulp-plumber コンパイルエラーによる強制停止を防止する
plumber     = require('gulp-plumber')
notify      = require('gulp-notify')


# ウェブから依存ライブラリをダウンロードして配置する
gulp.task 'fetch_depends_web', ->
  depended_libraries = [
    'https://s3-ap-northeast-1.amazonaws.com/kanimarker/kanimarker.js'
    'http://lab.calil.jp/ol3custom/v3.10.1/ol.js'
    'http://openlayers.org/en/v3.10.1/css/ol.css'
  ]
  download(depended_libraries).pipe gulp.dest('www/vendor')

gulp.task 'bower_install', ->
  bower.commands.install()

# bowerでパッケージ管理しているライブラリを配置する
gulp.task 'fetch_depends_bower', ['bower_install'], ->
  gulp.src(['bower_components/jquery/dist/jquery.min.js']).pipe gulp.dest('www/vendor')
  gulp.src(['bower_components/fastclick/lib/fastclick.js']).pipe gulp.dest('www/vendor')
  gulp.src(['bower_components/font-awesome/css/font-awesome.min.css']).pipe gulp.dest('www/vendor/css')
  gulp.src(['bower_components/font-awesome/fonts/*']).pipe gulp.dest('www/vendor/fonts')
  gulp.src(['bower_components/react/react.js']).pipe gulp.dest('www/vendor')
  gulp.src(['bower_components/Geolib/dist/geolib.min.js']).pipe gulp.dest('www/vendor')


# CoffeeScriptをコンパイル
gulp.task 'compile_coffee', ->
  gulp.src([
    'src/load.coffee',
    'src/app.coffee',
    'src/search.coffee',
  ]).pipe(coffee(bare: true)).pipe gulp.dest('src/compiled')


# JSXファイルをコンパイル
gulp.task 'compile_jsx', ->
  gulp.src('src/searchReact.jsx')
    .pipe(plumber({
      errorHandler: notify.onError "Error: <%= error.message %>"
    }))
    .pipe(react())
    .pipe(gulp.dest('src/compiled'))

gulp.task 'clean_all_js', (cb)->
  del(['www/js/all.js'], cb)

# アプリケーションファイルを結合
gulp.task 'concat', ['compile_coffee', 'clean_all_js','compile_jsx'], ->
  gulp.src [
    'node_modules/Kanikama/kanikama.js'
    'node_modules/Kanilayer/kanilayer.js'
    'www/vendor/kanimarker.js'
    'www/vendor/kanilayer.js'
    'src/compiled/app.js'
    'src/searchSetting.js'
    'src/compiled/search.js'
    'src/compiled/searchReact.js'
  ]
  .pipe concat('all.js')
  .pipe gulp.dest 'www/js/'

gulp.task 'copy_load_js',['compile_coffee'], ->
  gulp.src(['src/compiled/load.js']).pipe gulp.dest('www/js')

gulp.task 'clean', ->
  del(['platforms/ios/www/**'])

# Cordovaの処理
gulp.task 'cordova_prepare', ['copy_load_js', 'concat', 'clean'], ->
  cdv.prepare()

gulp.task 'watch', ->
  gulp.watch ['src/*.coffee', 'src/*.js'], ['cordova_prepare']
# JSXファイルの開発用
gulp.task 'watch-jsx', ->
  gulp.watch('src/*.jsx', ['compile_jsx', 'concat'])

gulp.task 'default', ['update']

gulp.task 'update', ['fetch_depends_web', 'fetch_depends_bower'], ->
  gulp.start 'cordova_prepare'
