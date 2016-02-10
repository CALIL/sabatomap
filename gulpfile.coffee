gulp = require 'gulp'
del = require 'del'
coffee = require 'gulp-coffee'
download = require 'gulp-download'
concat = require 'gulp-concat'
sass = require 'gulp-sass'
react = require 'gulp-react'
cordova_lib = require 'cordova-lib'
cdv = cordova_lib.cordova.raw

gulp.task 'fetch_depends_files', ->
  download([
    'http://lab.calil.jp/ol3custom/v3.10.1/ol.js'
    'http://openlayers.org/en/v3.10.1/css/ol.css'
  ]).pipe gulp.dest('www/vendor')

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
    'src/patch.coffee',
  ]).pipe(coffee(bare: true)).pipe gulp.dest('src/compiled')

gulp.task 'compile_jsx', ->
  gulp.src('src/searchReact.jsx')
  .pipe(react())
  .pipe(gulp.dest('src/compiled'))

gulp.task 'concat', ['compile_coffee', 'compile_jsx', 'copy_jquery', 'copy_fastclick', 'copy_font-awesome-css',
  'copy_font-awesome-fonts', 'copy_geolib'], ->
  replace = require 'gulp-replace'
  fs = require 'fs'
  rules = fs.readFileSync('src/facilities.json')
  gulp.src [
    'node_modules/react/dist/react.min.js'
    'node_modules/react-dom/dist/react-dom.min.js'
    'node_modules/geolib/dist/geolib.js'
    'node_modules/Kanikama/kanikama.js'
    'node_modules/Kanilayer/kanilayer.js'
    'node_modules/Kanimarker/kanimarker.js'
    'src/compiled/app.js'
    'src/compiled/search.js'
    'src/compiled/searchReact.js'
  ]
  .pipe concat('all.js')
  .pipe replace('__RULES__', rules)
  .pipe gulp.dest 'www/js/'

gulp.task 'sass', [], ->
  postcss = require('gulp-postcss');
  assets = require('postcss-assets');
  gulp.src('src/app.sass')
  .pipe(sass())
  .pipe(postcss([
    require('autoprefixer'),
    assets({
      loadPaths: ['www/img/']
      relativeTo: 'www/css/'
    })
  ]))
  .pipe(gulp.dest('www/css'))


gulp.task 'copy_load_js', ['compile_coffee'], ->
  gulp.src(['src/compiled/load.js']).pipe gulp.dest('www/js')

gulp.task 'clean', ->
  del(['platforms/ios/www/**'])

gulp.task 'cordova_prepare', ['copy_load_js', 'concat', 'clean', 'fetch_depends_files', 'sass'], ->
  cdv.prepare()

gulp.task 'watch', ->
  gulp.watch ['src/*.coffee', 'src/*.js', 'src/*.jsx', 'src/*.sass'], ['concat', 'sass']

gulp.task 'default', ['cordova_prepare']

gulp.task 'update', ['cordova_prepare']

gulp.task 'updater', [], ->
  target = 'v100'
  uglify = require('gulp-uglify')
  postcss = require('gulp-postcss')
  assets = require('postcss-assets')
  rename = require("gulp-rename")
  replace = require('gulp-replace')
  gulp.src('src/app.sass')
  .pipe(sass())
  .pipe(postcss([
    require('autoprefixer'),
    assets({
      loadPaths: ['www/img/']
      relativeTo: 'www/img/'
    })
  ]))
  .pipe(gulp.dest('updater/' + target))
  gulp.src(['www/img/*']).pipe gulp.dest('updater/' + target)
  gulp.src [
    'www/js/all.js'
    'src/compiled/patch.js'
  ]
  .pipe concat('update_' + target + '.js')
  .pipe replace('img/flag.png', 'https://calil.jp/static/apps/sabatomap/' + target + '/flag.png')
  .pipe replace('img/flag2.png', 'https://calil.jp/static/apps/sabatomap/' + target + '/flag2.png')
  .pipe replace('__CSS__', 'https://calil.jp/static/apps/sabatomap/' + target + '/app.css?' + Math.random())
  .pipe uglify()
  .pipe gulp.dest 'updater/'
