import browserslist from 'browserslist';

/*
 browserslist のブラウザ名 → esbuild の target 名。
 esbuild が対応値を持たないブラウザ（op_mini / kaios / and_qq / and_uc / samsung 等）は
 target に変換できないので落とす。落とした分はビルド時にログへ出す。
 Chromium 系（and_chr / android）は chrome へ寄せる。

 unitrad-view / unitrac-ui / unitrad-ui の tools/lib/browserslist-target.mjs と同じもの。
 直すときは横展開できる形にすること。
 */
const TARGET_NAMES = {
  chrome: 'chrome', and_chr: 'chrome', android: 'chrome',
  edge: 'edge',
  firefox: 'firefox', and_ff: 'firefox',
  safari: 'safari', ios_saf: 'ios',
  opera: 'opera', op_mob: 'opera',
  ie: 'ie'
};

/**
 * .browserslistrc を読んで esbuild の target 配列を作る。
 *
 * 下限は config.xml の android-minSdkVersion / deployment-target と対で決めている。
 * ここでハードコードせず .browserslistrc を唯一のソースにしているのは、
 * 3か所がずれないようにするため。
 *
 * @return {{targets: Array<string>, dropped: Array<string>}}
 */
export function esbuildTargets(repoRoot) {
  const mins = {};
  const dropped = new Set();

  for (const query of browserslist(undefined, { path: repoRoot })) {
    const sep = query.lastIndexOf(' ');
    const name = query.slice(0, sep);
    const target = TARGET_NAMES[name];
    if (!target) {
      dropped.add(name);
      continue;
    }
    /* "18.5-18.7" のような範囲は下限を、"all" や "TP" は数値化できないので落とす */
    const version = parseFloat(query.slice(sep + 1).split('-')[0]);
    if (!Number.isFinite(version)) {
      dropped.add(name);
      continue;
    }
    if (mins[target] === undefined || version < mins[target]) mins[target] = version;
  }

  return {
    targets: Object.entries(mins).map(([name, v]) => `${name}${v}`).sort(),
    dropped: [...dropped].sort()
  };
}
