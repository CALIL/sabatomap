bower = require 'bower'
del = require 'del'
gulp = require 'gulp'
coffee = require 'gulp-coffee'
download = require 'gulp-download'
exec = require 'gulp-exec'
path = require 'path'
fs = require 'fs'

plugins = ['org.apache.cordova.file']


libs = [
  'https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js'
  'https://cdnjs.cloudflare.com/ajax/libs/react/0.13.3/react.js'
  'https://s3-ap-northeast-1.amazonaws.com/kanilayer/kanilayer.js'
  'https://s3-ap-northeast-1.amazonaws.com/kanimarker/kanimarker.js'
  'http://openlayers.org/en/v3.9.0/build/ol.js'
  'http://openlayers.org/en/v3.9.0/css/ol.css'
  'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css'
]

bowerLibs = [
    'font-awesome/**/*.min.css'
    'font-awesome/**/fonts/*'
]

gulp.task 'default', ->
  gulp.start 'compile:cordova'

gulp.task 'update', ['compile:lib'], ->
  gulp.start 'compile:cordova'

# ライブラリのダウンロード
gulp.task 'compile:lib', ->
  download(libs).pipe gulp.dest('www/vendor')

  bower.commands.install().on 'end', ->
    gulp.src bowerLibs.map (e) -> "bower_components/#{e}"
    .pipe gulp.dest('www/vendor')

# srcディレクトリのcoffeeをコンパイル
gulp.task 'compile:coffee', ->
  # coffeeのファイルをコンパイル
  gulp.src ['src/**/*.coffee', '!src/**/doc/**/*', '!src/**/snippet/**/*', '!src/**/test/**/*']
  .pipe coffee(bare: true)
  .pipe gulp.dest('www/js')

  # js単体のファイルをコピー
  gulp.src ['src/**/*.js', '!src/**/doc/**/*', '!src/**/snippet/**/*', '!src/**/test/**/*']
  .pipe gulp.dest('www/js')

# cordovaの更新
gulp.task 'compile:cordova', ['compile:coffee'], (cb)->
  gulp.src('.')
  .pipe exec('cordova prepare', (err, stdout, stderr)->
    console.log stdout
    console.log stderr
    cb err
  )

gulp.task 'watch', ->
  gulp.watch ['src/**/*.coffee', 'src/**/*.js'], ['compile:cordova']



