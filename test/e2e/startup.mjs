/*
 起動の内訳を測る。テストからは使わない。

   node startup.mjs [回数]

 ネットワークは e2e と同じスタブなので通信の揺らぎが入らず、JS の解析・実行と
 アプリ側の待ち時間だけを切り出せる。デスクトップでの絶対値に意味は無いので、
 変更の前後を同じ機械で比べること。

 スプラッシュは cordova-browser が実装を持たないのでここでは測れない。
 代わりに「アプリが hide を呼ぶ時点」（splashHidden）を印にしてある。
 実機のスプラッシュはこの時刻まで出ることになる。
*/
import {chromium} from '@playwright/test';
import {createServer, PORT} from './support/server.mjs';
import {stubNetwork} from './support/stub.mjs';

const RUNS = Number(process.argv[2] ?? 5);
const server = createServer();
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch();
const rows = [];

for (let i = 0; i < RUNS; i++) {
  const ctx = await browser.newContext({
    viewport: {width: 414, height: 896},
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await stubNetwork(page, {port: PORT});

  // アプリのコードより先に入れて、節目に印を打つ
  await page.addInitScript(() => {
    window.__t = {};
    const mark = (k) => { if (window.__t[k] === undefined) window.__t[k] = performance.now(); };
    window.__mark = mark;
    document.addEventListener('deviceready', () => mark('deviceready'), false);

    // 実機のスプラッシュはアプリが hide を呼ぶまで出る。
    // ブラウザには実装が無いので、呼ばれた時刻だけ記録する
    navigator.splashscreen = {
      hide: () => mark('splashHidden'),
      show: () => {},
    };

    // window.app が生えた瞬間と initializeApp が呼ばれた瞬間
    let app;
    Object.defineProperty(window, 'app', {
      configurable: true,
      get: () => app,
      set: (v) => {
        mark('appReady');            // all.js の実行が終わった
        app = v;
        const orig = v.initializeApp.bind(v);
        v.initializeApp = function () { mark('initStart'); const r = orig(); mark('initEnd'); return r; };
      },
    });

    // 節目を rAF で拾う
    const poll = () => {
      if (document.querySelector('#ui input[type=search]')) mark('uiMounted');
      if (document.querySelector('#floors input:checked')) mark('floorChosen');
      const m = window.app && window.app.getMap && window.app.getMap();
      if (m) {
        if (window.__t.mapCreated === undefined) {
          mark('mapCreated');
          // 地図が初めて描き終わった瞬間。ベースタイルの 500ms とは独立に測る
          m.once('rendercomplete', () => mark('mapFirstRender'));
        }
        if (m.getLayers().item(0).getVisible()) mark('baseVisible');
      }
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);
  });

  await page.goto(`http://127.0.0.1:${PORT}/`, {waitUntil: 'commit'});
  await page.waitForFunction(
    () => window.__t && window.__t.baseVisible && window.__t.mapFirstRender,
    null, {timeout: 20000}
  );
  // ベースタイルまで含めて落ち着くまで
  await page.evaluate(() => new Promise((res) => {
    const m = window.app.getMap();
    m.once('rendercomplete', () => { window.__mark('settled'); res(); });
    m.render();
  }));

  const t = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const res = performance.getEntriesByType('resource');
    const js = res.find((r) => /all\.js$/.test(r.name));

    // 種類ごとに「何本・いつ始まり・いつ終わったか」
    const group = (re) => {
      const es = res.filter((r) => re.test(r.name));
      if (!es.length) return null;
      return {
        n: es.length,
        first: +Math.min(...es.map((e) => e.startTime)).toFixed(1),
        last: +Math.max(...es.map((e) => e.responseEnd)).toFixed(1),
      };
    };
    const groups = {
      geojson: group(/calil\.sabatomap2\/\d+\.json/),
      floorTile: group(/sabatomap\/tiles\//),
      baseTile: group(/api\.mapbox\.com/),
    };
    const paint = performance.getEntriesByType('paint')
      .reduce((a, p) => (a[p.name] = p.startTime, a), {});
    return {
      ...window.__t,
      jsStart: js.startTime,
      jsEnd: js.responseEnd,
      jsSize: js.decodedBodySize,
      fcp: paint['first-contentful-paint'] ?? 0,
      dcl: nav.domContentLoadedEventEnd,
      requests: res.length,
      groups,
    };
  });
  rows.push(t);
  await ctx.close();
}

await browser.close();
server.close();

const med = (k) => {
  const s = rows.map((r) => r[k]).filter((v) => typeof v === 'number').sort((a, b) => a - b);
  return s.length ? +s[Math.floor(s.length / 2)].toFixed(1) : NaN;
};

const line = (label, k, note = '') =>
  console.log(`  ${String(med(k)).padStart(7)}  ${label}${note ? '   ' + note : ''}`);

console.log(`${RUNS} 回の中央値（ミリ秒・ナビゲーション開始から）  成果物 ${(rows[0].jsSize / 1024).toFixed(0)} KB\n`);
line('all.js の取得完了', 'jsEnd');
line('all.js の実行完了（window.app が生える）', 'appReady', '← ここまでが解析と実行');
line('first-contentful-paint', 'fcp');
line('deviceready', 'deviceready');
line('initializeApp 開始', 'initStart');
line('initializeApp 終了', 'initEnd');
line('Map ができた', 'mapCreated');
line('UI がマウントされた', 'uiMounted');
line('フロアが決まった', 'floorChosen');
line('地図が初めて描き終わった', 'mapFirstRender', '← 利用者に配架図が見える');
line('スプラッシュを消した', 'splashHidden', '← 実機ではここまで出続ける');
line('ベースタイルが可視化', 'baseVisible');
line('全部落ち着いた', 'settled');
console.log(`\n  通信本数 ${med('requests')}`);
console.log('\n通信の内訳（中央値）');
for (const k of ['geojson', 'floorTile', 'baseTile']) {
  const gs = rows.map((r) => r.groups[k]).filter(Boolean);
  if (!gs.length) { console.log(`  ${k}: 0 本`); continue; }
  const m = (f) => {
    const s = gs.map(f).sort((a, b) => a - b);
    return +s[Math.floor(s.length / 2)].toFixed(1);
  };
  console.log(`  ${k.padEnd(10)} ${String(m((g) => g.n)).padStart(3)} 本   ${String(m((g) => g.first)).padStart(7)} → ${String(m((g) => g.last)).padStart(7)} ms`);
}
