import gulp from 'gulp';
import del from 'del';
import concat from 'gulp-concat';
import sass from 'gulp-sass';
import cordova_lib from 'cordova-lib';
import browserify from 'browserify'
import source from "vinyl-source-stream";
import replace from 'gulp-replace';
import fs from 'fs';
let cdv = cordova_lib.cordova.raw;

gulp.task('copy_openlayers_css', () => gulp.src(['node_modules/openlayers/css/ol.css']).pipe(gulp.dest('www/vendor/css'))
);

gulp.task('copy_font-awesome-css', () => gulp.src(['node_modules/font-awesome/css/font-awesome.min.css']).pipe(gulp.dest('www/vendor/css'))
);

gulp.task('copy_font-awesome-fonts', () => gulp.src(['node_modules/font-awesome/fonts/*']).pipe(gulp.dest('www/vendor/fonts'))
);

gulp.task('compile_es2015', ['copy_openlayers_css', 'copy_font-awesome-css', 'copy_font-awesome-fonts'], function () {
  const rules = fs.readFileSync('src/sabae.json');
  return browserify('src/app.js')
    .on("error", (err) => console.log("Error : " + err.message))
    .transform('babelify', {
      presets: ['es2015', 'react']
    })
    .bundle()
    .pipe(source('all.js'))
    .pipe(replace('__RULES__', rules))
    .pipe(gulp.dest('www/js/'));
});


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

gulp.task('clean', () => del(['platforms/ios/www/**'])
);

gulp.task('cordova_prepare', ['compile_es2015', 'clean', 'copy_openlayers_css', 'sass'], () => cdv.prepare()
);

gulp.task('watch', () => gulp.watch(['src/*.js', 'src/*.jsx', 'src/*.sass'], ['compile_es2015', 'sass'])
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
