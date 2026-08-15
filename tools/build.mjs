#!/usr/bin/env node
/*
 www/ を組み立てる。cordova prepare がここから platforms/<name>/www/ へコピーする。

   node tools/build.mjs release   www/ を作る（minify あり・sourcemap なし）
   node tools/build.mjs debug     同じものを minify せず inline sourcemap つきで作る
   node tools/build.mjs watch     src/ を見張って debug ビルドを回し続ける
   node tools/build.mjs clean     platforms/ios/www を消す

 CALIL の他リポジトリ（unitrad-view / unitrac-ui / unitrad-ui / unitrad-ui-nagano /
 unitrad-kintone-plugin）は tools/lib/ に js / css / html / site を分けているが、
 あれは conf ごとに2000件以上を並列ビルドするための構造。sabatomap は配信先が1つなので
 1ファイルに収めてある。

 JS は esbuild、CSS は sass + postcss で、**esbuild に CSS を通していない**。
 これは他リポジトリと同じ方針。
 */
import esbuild from 'esbuild';
import * as sass from 'sass';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esbuildTargets } from './browserslist-target.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = (...p) => path.join(repoRoot, ...p);

/** ビルド時にコピーするもの。gulp の copy_css / copy_fonts / copy_jsons と同じ内容 */
const COPIES = [
  // ol.css は www/index.html が vendor/css/ol.css として読んでいる
  { from: ['node_modules/ol/ol.css'], to: 'www/vendor/css' },
  // Font Awesome のコピーは 2026-08-15 にやめた。
  // アイコンは src/component/Icon.jsx がインライン SVG で描く
  //
  // 配架図の GeoJSON。2019-10-29 に S3 参照へ戻して以来どこからも読まれていないが、
  // S3 バケットが失われたときの控えとして同梱を続ける。
  // ローカル参照へ戻すのは src/libs/kanilayer.js の getHaikaVectorSource_ の1行
  { from: ['src/json'], to: 'www/json' },
];

/** バイト数を読みやすく */
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

function copyAssets() {
  let files = 0;
  let bytes = 0;
  for (const { from, to } of COPIES) {
    fs.mkdirSync(r(to), { recursive: true });
    for (const src of from) {
      const abs = r(src);
      if (!fs.existsSync(abs)) throw new Error(`コピー元が無い: ${src}`);
      const entries = fs.statSync(abs).isDirectory()
        ? fs.readdirSync(abs).map((n) => path.join(abs, n))
        : [abs];
      for (const entry of entries) {
        if (fs.statSync(entry).isDirectory()) continue;
        const dest = path.join(r(to), path.basename(entry));
        fs.copyFileSync(entry, dest);
        files += 1;
        bytes += fs.statSync(dest).size;
      }
    }
  }
  console.log(`[copy] ${files} ファイル  ${kb(bytes)}`);
}

async function buildCss({ production }) {
  const srcFile = r('src/app.sass');
  // style は expanded を明示する。minify は cssnano に任せるので、
  // sass 側は読みやすい出力のままにしておく
  const compiled = sass.compile(srcFile, { style: 'expanded' });

  /*
   autoprefixer は .browserslistrc を読む。この下限（chrome 130 / iOS 18）でも
   まだ仕事があり、-webkit-user-select を6件と -webkit-transition を1件足す
   （後者は ::-webkit-input-placeholder の中なので正しい）。

   minify は release だけ。debug で潰すと手元で読めなくなる。
   unitrad-view / unitrac-ui などと同じ構成にしてある。
   */
  const plugins = production ? [autoprefixer, cssnano] : [autoprefixer];
  const result = await postcss(plugins).process(compiled.css, { from: undefined });

  for (const warn of result.warnings()) console.warn(`[css] ${warn.toString()}`);

  fs.mkdirSync(r('www/css'), { recursive: true });
  fs.writeFileSync(r('www/css/app.css'), result.css);
  console.log(`[css] www/css/app.css  ${kb(Buffer.byteLength(result.css))}${production ? '' : '  (debug)'}`);
}

/** esbuild の共通オプション。watch は context を使うので分けてある */
function jsOptions({ production }) {
  const { targets, dropped } = esbuildTargets(repoRoot);
  if (dropped.length) {
    console.log(`[js] target に変換できず除外したブラウザ: ${dropped.join(', ')}`);
  }
  return {
    options: {
      absWorkingDir: repoRoot,
      entryPoints: [r('src/app.js')],
      outfile: r('www/js/all.js'),
      bundle: true,
      format: 'iife',
      target: targets,
      minify: production,
      sourcemap: production ? false : 'inline',
      /*
       browserify は process.env.NODE_ENV を定義しなかった。react-dom/client.js は
       "production" === process.env.NODE_ENV で分岐して require 先を決めるので、
       development 版と production 版の両方がバンドルに入り、比較が偽になって
       **development 版が実行されていた**（成果物に Invalid hook call などの
       development 専用文字列が残っていた）。ここで固定して production 版だけにする。
       */
      define: {
        'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
        /*
         デバッグビルドでだけ有効になる仕掛けの入口。いまは
         src/libs/beacondebug.js（ビーコンの受信状況を画面に出す）だけが使う。

         `if (__DEBUG__)` で囲っておくと、release では false に畳まれて
         minify が枝ごと落とす。**import した先のモジュールも落ちる**ので、
         デバッグ用のコードが本番の成果物に混ざらない。
         潰れていることは tools/build.mjs の呼び出し側ではなく成果物で確かめること
         （release ビルドの www/js/all.js を grep する）。
         */
        __DEBUG__: JSON.stringify(!production),
      },
      /*
       react / react-dom を preact/compat に差し替える。ソースは react のまま書ける。

       react-dom が成果物の 28%（180KB）を占めていた。preact に替えると
       628KB が 448KB になる。解析と実行が短くなるぶん起動が速い。

       react-dom/client は preact/compat/client に対応が要る（createRoot がある）。
       react/jsx-runtime は今は使っていないが、将来 automatic runtime に
       切り替えたときに素の react を掴まないよう先に張っておく。
       */
      alias: {
        react: 'preact/compat',
        'react-dom': 'preact/compat',
        'react-dom/client': 'preact/compat/client',
        'react/jsx-runtime': 'preact/compat/jsx-runtime',
      },
      /*
       esbuild の既定は charset: 'ascii' で、日本語を \uXXXX に展開する。
       browserify は生の UTF-8 を出していて本番で動いているので挙動を合わせる。
       www/index.html が <meta charset="utf-8"> を宣言しており、
       charset 属性の無い外部スクリプトは文書の符号化で解釈される。
       ついでに 491 バイト小さくなり、成果物を grep で確かめられる。
       */
      charset: 'utf8',
      metafile: true,
      logLevel: 'warning',
      /*
       loader の明示は要らない。.jsx は既定で jsx ローダー、.json は既定で json ローダー。
       jsx も既定の transform（classic runtime）で、src/component/*.jsx が全ファイル
       import React を明示しているので @babel/preset-react（runtime 未指定）と同じ挙動になる。

       unitrad 系にある jsxPlugin は要らない。あちらは conf の .js に JSX が書かれているため。
       supported の destructuring も要らない。下限が ios 18 / chrome 130 なのでネイティブ。
       inject の polyfill も要らない（下限が新しく、補うものが無いことを実測で確認済み）。
       */
    },
    targets,
  };
}

async function buildJs({ production }) {
  const { options, targets } = jsOptions({ production });
  const result = await esbuild.build(options);
  const bytes = fs.statSync(r('www/js/all.js')).size;
  console.log(`[js]  www/js/all.js  ${kb(bytes)}  target=${targets.join(',')}`);
  const inputs = Object.keys(result.metafile.inputs).length;
  console.log(`[js]  ${inputs} モジュール`);
  return result;
}

async function build({ production }) {
  const started = Date.now();
  copyAssets();
  await buildCss({ production });
  await buildJs({ production });
  console.log(`[done] ${Date.now() - started} ms`);
}

async function watch() {
  await build({ production: false });

  const { options } = jsOptions({ production: false });
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('[watch] src/ を見張っています。Ctrl+C で終了');

  // esbuild の watch は JS の依存グラフだけを見る。sass は別系統なので自分で拾う
  let timer = null;
  fs.watch(r('src'), { recursive: true }, (_event, filename) => {
    if (!filename || !filename.endsWith('.sass')) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      buildCss({ production: false }).catch((e) => console.error(`[css] ${e.message}`));
    }, 100);
  });
}

function clean() {
  // cordova prepare が updateWww で作り直すのでディレクトリごと消してよい。
  // force があるので platforms/ios が無くても失敗しない
  fs.rmSync(r('platforms/ios/www'), { recursive: true, force: true });
  console.log('[clean] platforms/ios/www を消した');
}

const sub = process.argv[2] ?? 'release';
try {
  if (sub === 'release') {
    process.env.NODE_ENV = 'production';
    await build({ production: true });
  } else if (sub === 'debug') {
    await build({ production: false });
  } else if (sub === 'watch') {
    await watch();
  } else if (sub === 'clean') {
    clean();
  } else {
    console.error(`使い方: node tools/build.mjs [release|debug|watch|clean]`);
    process.exit(1);
  }
} catch (e) {
  console.error(e.message ?? e);
  process.exit(1);
}
