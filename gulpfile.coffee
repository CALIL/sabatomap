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

# ウェブから依存ライブラリをダウンロードして配置する
gulp.task 'fetch_depends_web', ->
  depended_libraries = [
    'https://cdnjs.cloudflare.com/ajax/libs/react/0.13.3/react.js'
    'https://s3-ap-northeast-1.amazonaws.com/kanilayer/kanilayer.js'
    'https://s3-ap-northeast-1.amazonaws.com/kanimarker/kanimarker.js'
    'http://openlayers.org/en/v3.9.0/build/ol.js'
    'http://openlayers.org/en/v3.9.0/css/ol.css'
    'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css'
  ]
  download(depended_libraries).pipe gulp.dest('www/vendor')

# bowerでパッケージ管理しているライブラリを配置する
gulp.task 'fetch_depends_bower', ->
  bower.commands.install()
  gulp.src(['bower_components/jquery/dist/jquery.min.js']).pipe gulp.dest('www/vendor')
  gulp.src(['bower_components/fastclick/lib/fastclick.js']).pipe gulp.dest('www/vendor')
  gulp.src(['bower_components/font-awesome/css/font-awesome.min.css']).pipe gulp.dest('www/vendor/css')
  gulp.src(['bower_components/font-awesome/fonts/*']).pipe gulp.dest('www/vendor/fonts')

# CoffeeScriptをコンパイル
gulp.task 'compile_coffee' , ->
  gulp.src([
    'src/buffer.coffee',
    'src/kanikama.coffee',
    'src/app.coffee',
    'src/search.coffee',
  ]).pipe(coffee(bare: true)).pipe gulp.dest('src/compiled')

# アプリケーションファイルを結合
gulp.task 'concat', ['compile_coffee'], ->
  gulp.src [
    'www/vendor/kanimarker.js'
    'www/vendor/kanilayer.js'
    'src/compiled/buffer.js'
    'src/compiled/kanikama.js'
    'src/compiled/app.js'
    'src/notify.js'
    'src/searchSetting.js'
    'src/compiled/search.js'
    'src/searchReact.js'
  ]
  .pipe concat('all.js')
  .pipe gulp.dest 'www/js/'
  gulp.src(['src/load.js']).pipe gulp.dest('www/js')

# Cordovaの処理
gulp.task 'cordova_prepare', ['concat'], ->
  cdv.prepare()

gulp.task 'watch', ->
  gulp.watch ['src/*.coffee', 'src/*.js'], ['cordova_prepare']

gulp.task 'default', ['update']

gulp.task 'update', ['fetch_depends_web','fetch_depends_bower'], ->
  gulp.start 'cordova_prepare'


