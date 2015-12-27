gulp = require 'gulp'
bower = require 'bower'
del = require 'del'
coffee = require 'gulp-coffee'
download = require 'gulp-download'
concat = require 'gulp-concat'
exec = require 'gulp-exec'
cordova_lib = require('cordova-lib')
cdv = cordova_lib.cordova.raw
react = require('gulp-react')
plumber = require('gulp-plumber') # コンパイルエラーによる強制停止を防止する
notify = require('gulp-notify')

gulp.task 'fetch_depends_files', ->
  depended_libraries = [
    'http://lab.calil.jp/ol3custom/v3.10.1/ol.js'
    'http://openlayers.org/en/v3.10.1/css/ol.css'
  ]
  download(depended_libraries).pipe gulp.dest('www/vendor')

gulp.task 'copy_jquery', ->
  gulp.src(['node_modules/jquery/dist/jquery.min.js']).pipe gulp.dest('www/vendor')

gulp.task 'copy_fastclick', ->
  gulp.src(['node_modules/fastclick/lib/fastclick.js']).pipe gulp.dest('www/vendor')

gulp.task 'copy_font-awesome-css', ->
  gulp.src(['node_modules/font-awesome/css/font-awesome.min.css']).pipe gulp.dest('www/vendor/css')

gulp.task 'copy_font-awesome-fonts', ->
  gulp.src(['node_modules/font-awesome/fonts/*']).pipe gulp.dest('www/vendor/fonts')

gulp.task 'copy_geolib', ->
  gulp.src(['node_modules/Geolib/dist/geolib.min.js']).pipe gulp.dest('www/vendor')

gulp.task 'compile_coffee', ->
  gulp.src([
    'src/load.coffee',
    'src/app.coffee',
    'src/search.coffee',
  ]).pipe(coffee(bare: true)).pipe gulp.dest('src/compiled')

gulp.task 'compile_jsx', ->
  gulp.src('src/searchReact.jsx')
  .pipe(plumber({
    errorHandler: notify.onError "Error: <%= error.message %>"
  }))
  .pipe(react())
  .pipe(gulp.dest('src/compiled'))

gulp.task 'concat', ['compile_coffee', 'compile_jsx','copy_jquery','copy_fastclick','copy_font-awesome-css','copy_font-awesome-fonts','copy_geolib'], ->
  gulp.src [
    'node_modules/react/dist/react.min.js'
    'node_modules/react-dom/dist/react-dom.min.js'
    'node_modules/Kanikama/kanikama.js'
    'node_modules/Kanilayer/kanilayer.js'
    'node_modules/kanimarker/kanimarker.js'
    'src/compiled/app.js'
    'src/compiled/search.js'
    'src/compiled/searchReact.js'
  ]
  .pipe concat('all.js')
  .pipe gulp.dest 'www/js/'

gulp.task 'copy_load_js', ['compile_coffee'], ->
  gulp.src(['src/compiled/load.js']).pipe gulp.dest('www/js')

gulp.task 'clean', ->
  del(['platforms/ios/www/**'])

gulp.task 'cordova_prepare', ['copy_load_js', 'concat', 'clean','fetch_depends_files'], ->
  cdv.prepare()

gulp.task 'watch', ->
  gulp.watch ['src/*.coffee', 'src/*.js', 'src/*.jsx'], ['concat']

gulp.task 'default', ['cordova_prepare']

gulp.task 'update', ['cordova_prepare']