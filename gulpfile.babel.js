import gulp from 'gulp';
// 削除は Node 標準で足りるので del は使わない
import { rm } from 'node:fs/promises';
import dartSass from 'sass';
import gulpSass from 'gulp-sass';
const sass = gulpSass(dartSass);
import browserify from 'browserify'
import babelify from "babelify";
import source from "vinyl-source-stream";
import replace from 'gulp-replace';
import fs from 'fs';

gulp.task('copy_css', () => gulp.src(['node_modules/ol/ol.css', 'fontawesome-free-5.15.4-web/css/fontawesome.css']).pipe(gulp.dest('www/vendor/css')));
gulp.task('copy_fonts', () => gulp.src(['fontawesome-free-5.15.4-web/webfonts/*']).pipe(gulp.dest('www/vendor/webfonts')));
gulp.task('copy_jsons', () => gulp.src(['src/json/*']).pipe(gulp.dest('www/json/')));

// gulp.task('buildjs', gulp.series( gulp.parallel('copy_css', 'copy_fonts'), () => {
//   const rules = fs.readFileSync('src/sabae.json');
//   var options = {
//         entries: "./src/app.js",   // Entry point
//         extensions: [".js"],            // consider files with these extensions as modules
//         debug: false,  // add resource map at the end of the file or not
//         paths: ["./src/"]           // This allows relative imports in require, with './scripts/' as root
//   };
//   return browserify(options).transform(babelify).bundle()
//     .pipe(source('all.js'))
//     .pipe(replace('__RULES__', rules))
//     .pipe(gulp.dest('www/js/'));
// }));


gulp.task('sass', function () {
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

// 削除の完了を待ってから done() を呼ぶ。
// 以前は待たずに done() していたので、消し終わる前に次へ進んでいた
//
// del の頃は 'platforms/ios/www/**' というグロブを渡していたので、
// 中身だけを消してディレクトリ自体は空のまま残していた。fs.rm は
// ディレクトリごと消すが、cordova prepare が updateWww で作り直すため
// 問題ない（cordova-common の FileUpdater が cpSync を recursive で呼ぶ）。
// force: true があるので platforms/ios が無い状態でも失敗しない。
gulp.task('clean', () => rm('platforms/ios/www', { recursive: true, force: true }));
gulp.task('watch', (done) => {
    gulp.watch(['src/*.js', 'src/*.jsx', 'src/*.sass'], ['buildjs', 'sass']);
    done();
});
