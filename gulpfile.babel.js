import gulp from 'gulp';
import del from 'del';
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

gulp.task('clean', (done) => {
    del(['platforms/ios/www/**']);
    done();
});
gulp.task('watch', (done) => {
    gulp.watch(['src/*.js', 'src/*.jsx', 'src/*.sass'], ['buildjs', 'sass']);
    done();
});
