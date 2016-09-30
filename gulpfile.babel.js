import gulp from 'gulp';
import del from 'del';
import download from 'gulp-download';
import concat from 'gulp-concat';
import sass from 'gulp-sass';
import react from 'gulp-react';
import cordova_lib from 'cordova-lib';
import browserify from 'browserify'
import babelify from 'babelify'
import source from "vinyl-source-stream";
let cdv = cordova_lib.cordova.raw;

gulp.task('fetch_depends_files', () =>
  download([
    'http://lab.calil.jp/ol3custom/v3.10.1/ol.js',
    'http://openlayers.org/en/v3.10.1/css/ol.css'
  ]).pipe(gulp.dest('www/vendor'))
);

gulp.task('copy_superagent', () => gulp.src(['node_modules/superagent/superagent.js']).pipe(gulp.dest('www/vendor'))
);

gulp.task('copy_fastclick', () => gulp.src(['node_modules/fastclick/lib/fastclick.js']).pipe(gulp.dest('www/vendor'))
);

gulp.task('copy_font-awesome-css', () => gulp.src(['node_modules/font-awesome/css/font-awesome.min.css']).pipe(gulp.dest('www/vendor/css'))
);

gulp.task('copy_font-awesome-fonts', () => gulp.src(['node_modules/font-awesome/fonts/*']).pipe(gulp.dest('www/vendor/fonts'))
);

gulp.task('compile_es2015', () =>
  browserify('src/app.js')
    .on("error", (err) => console.log("Error : " + err.message))
    .transform('babelify', {
      presets: ['es2015', 'react']
    })
    .bundle()
    .pipe(source('app.js'))
    .pipe(gulp.dest('src/compiled'))
);

gulp.task('compile_kanikama', () =>
  browserify('node_modules/Kanikama/kanikama.js')
    .on("error", (err) => console.log("Error : " + err.message))
    .transform('babelify', {
      presets: ['es2015', 'react']
    })
    .bundle()
    .pipe(source('kanikama.js'))
    .pipe(gulp.dest('src/compiled'))
);

gulp.task('concat', ['compile_es2015', 'compile_kanikama', 'copy_superagent', 'copy_fastclick', 'copy_font-awesome-css',
    'copy_font-awesome-fonts'], function () {
    let replace = require('gulp-replace');
    let fs = require('fs');
    let rules = fs.readFileSync('src/sabae.json');
    return gulp.src([
      'node_modules/Kanilayer/kanilayer.js',
      'node_modules/Kanimarker/kanimarker.js',
      'src/compiled/kanikama.js',
      'src/compiled/app.js',
    ])
      .pipe(concat('all.js'))
      .pipe(replace('__RULES__', rules))
      .pipe(gulp.dest('www/js/'));
  }
);

gulp.task('sass', [], function () {
    let postcss = require('gulp-postcss');
    let assets = require('postcss-assets');
    return gulp.src('src/app.sass')
      .pipe(sass())
      .pipe(postcss([
        require('autoprefixer'),
        assets({
          loadPaths: ['www/img/'],
          relativeTo: 'www/css/'
        })
      ]))
      .pipe(gulp.dest('www/css'));
  }
);


gulp.task('copy_load_js', () => gulp.src(['src/load.js']).pipe(gulp.dest('www/js'))
);

gulp.task('clean', () => del(['platforms/ios/www/**'])
);

gulp.task('cordova_prepare', ['copy_load_js', 'concat', 'clean', 'fetch_depends_files', 'sass'], () => cdv.prepare()
);

gulp.task('watch', () => gulp.watch(['src/*.js', 'src/*.jsx', 'src/*.sass'], ['concat', 'sass'])
);

gulp.task('default', ['cordova_prepare']);

gulp.task('update', ['cordova_prepare']);

gulp.task('updater', [], function () {
    let target = 'v100';
    let uglify = require('gulp-uglify');
    let postcss = require('gulp-postcss');
    let assets = require('postcss-assets');
    let rename = require("gulp-rename");
    let replace = require('gulp-replace');
    gulp.src('src/app.sass')
      .pipe(sass())
      .pipe(postcss([
        require('autoprefixer'),
        assets({
          loadPaths: ['www/img/'],
          relativeTo: 'www/img/'
        })
      ]))
      .pipe(gulp.dest(`updater/${target}`));
    gulp.src(['www/img/*']).pipe(gulp.dest(`updater/${target}`));
    return gulp.src([
      'www/js/all.js',
      'src/patch.js'
    ])
      .pipe(concat(`update_${target}.js`))
      .pipe(replace('img/flag.png', `https://calil.jp/static/apps/sabatomap/${target}/flag.png`))
      .pipe(replace('img/flag2.png', `https://calil.jp/static/apps/sabatomap/${target}/flag2.png`))
      .pipe(replace('__CSS__', `https://calil.jp/static/apps/sabatomap/${target}/app.css?${Math.random()}`))
      .pipe(uglify())
      .pipe(gulp.dest('updater/'));
  }
);
