import { expect } from '@playwright/test';
import { stubNetwork } from './stub.mjs';

/*
 アプリを決まった状態まで持っていくための道具。

 撮る前に必ず settle() を通すこと。OpenLayers は frameState.animate が立っている間
 rendercomplete を投げないので、アニメーションを止めてから待ち合わせる。
 */

/** フロア7の nearest1[0] に対応するビーコン。押すと位置が確定する */
export const BEACON_F7 = { uuid: '00000000-71C7-1001-B000-001C4D532518', major: 105, minor: 1 };
/** 同じフロア7で、上から最も離れた nearest1 の点に対応するビーコン */
export const BEACON_F7_FAR = { uuid: '00000000-71C7-1001-B000-001C4D532518', major: 105, minor: 48 };
/** フロア8の nearest1[0] に対応するビーコン */
export const BEACON_F8 = { uuid: '00000000-71C7-1001-B000-001C4D532518', major: 105, minor: 64 };
/** 配架図 GeoJSON に実在する棚 */
export const SHELF_ID = 320;

/** page ごとの通信カウンタ。settle が「静まったか」を見るのに使う */
const NET = new WeakMap();

export async function openApp(page, port) {
  const net = await stubNetwork(page, { port });
  NET.set(page, net);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // 遮断した外部通信ぶんは数えない
    if (/net::ERR_FAILED|net::ERR_ABORTED|Failed to load resource/.test(t)) return;
    errors.push(`console: ${t.slice(0, 300)}`);
  });

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
  await page.waitForSelector('#ui input[type=search]', { timeout: 20000 });
  // ベースタイルのレイヤーは initializeApp の 500ms 後に visible になる。
  // 待たずに撮ると背景が入ったり入らなかったりする
  await page.waitForFunction(() => {
    const map = window.app.getMap();
    return map && map.getLayers().item(0).getVisible();
  }, null, { timeout: 20000 });
  // スプラッシュ（www/index.html の #splash）は最短 2 秒出る。
  // 全画面を覆うので、消えるまで待たないと地図の代わりにこれを撮ってしまう
  await page.waitForSelector('#splash', { state: 'detached', timeout: 20000 });
  await settle(page);
  return { net, errors };
}

/**
 * BLE を持つ端末のふりをする
 *
 * `invalidateLocator`（app.js）は change:mode を購読していて、
 * `cordova.plugins.BluetoothStatus.hasBTLE` か `BTenabled` が偽なら
 * **その場で setMode("normal") に戻す**。ブラウザのプロキシは BLE を持たないので、
 * これを立てないと追従モードの描画にはどうやっても入れない。
 */
export async function enableBluetooth(page) {
  await page.evaluate(() => {
    const bt = window.cordova?.plugins?.BluetoothStatus;
    if (!bt) throw new Error('cordova.plugins.BluetoothStatus が無い');
    bt.hasBTLE = true;
    bt.BTenabled = true;
  });
}

/**
 * BLE はあるが Bluetooth は切れている端末のふりをする
 *
 * platformId を差し替えられるのは、app.js が Android のときだけ
 * BTenabled を信用しないようにしているため。ブラウザのプラットフォームでは
 * platformId が 'browser' なので、そのままでは Android の分岐を通らない
 */
export async function pretendBluetoothOff(page, { platformId } = {}) {
  await page.evaluate((id) => {
    const bt = window.cordova?.plugins?.BluetoothStatus;
    if (!bt) throw new Error('cordova.plugins.BluetoothStatus が無い');
    bt.hasBTLE = true;
    bt.BTenabled = false;
    if (id) window.cordova.platformId = id;
  }, platformId);
}

/** 1フレーム回して rendercomplete を待つ */
async function renderOnce(page, ms) {
  await page.evaluate((timeout) => new Promise((resolve, reject) => {
    const map = window.app.getMap();
    if (!map) return reject(new Error('map がまだ無い'));
    const timer = setTimeout(() => reject(new Error('rendercomplete が来ない')), timeout);
    map.once('rendercomplete', () => { clearTimeout(timer); resolve(); });
    map.render();   // 何も変わっていないときでも1フレーム回して発火させる
  }), ms);
}

/**
 * アニメーションを止めて、描画が落ち着くまで待つ
 *
 * rendercomplete を1回待つだけでは足りない。**その瞬間に要求されていなかったタイルは
 * 待ってもらえない**ので、後から可視になったレイヤー（ベースタイルは 500ms 後に
 * visible になる）の読み込みを取りこぼす。
 * 通信の総数が2回続けて変わらなくなるまで回す。
 */
export async function settle(page, { timeout = 20000 } = {}) {
  await page.evaluate(() => {
    const m = window.app.getMarker();
    if (m) m.cancelAnimation();
  });

  /*
   View のアニメーションが終わるのを待つ。setMode("headingup") は
   view.animate({rotation}) を最大 800ms 走らせるので、待たずに撮ると
   回転の途中が写る。getAnimating は ol 5 にも 10 にもある。
   マーカーと違って途中で止めると目標の角度に着かないので、止めずに待つ。
   */
  await page.waitForFunction(() => {
    const v = window.app.getMap()?.getView();
    return v && !v.getAnimating() && !v.getInteracting();
  }, null, { timeout });

  const net = NET.get(page);
  const total = () => (net ? Object.values(net.calls).reduce((a, b) => a + b, 0) : 0);

  const deadline = Date.now() + timeout;
  let quiet = 0;
  let last = -1;
  while (Date.now() < deadline) {
    const before = total();
    await renderOnce(page, Math.max(1000, deadline - Date.now()));
    await page.waitForTimeout(200);   // 直後に飛ぶ要求を拾う猶予
    const after = total();
    quiet = after === before && after === last ? quiet + 1 : 0;
    last = after;
    // preload の分が遅れて飛ぶので、2回続けて動かないことを確かめる
    if (!net || quiet >= 2) break;
  }
  await page.waitForFunction(() => document.fonts.status === 'loaded');
}

/**
 * ビーコンを流し込む。本番で cordova のプラグインが呼ぶ入口と同じ
 */
export async function pushBeacons(page, beacons) {
  await page.evaluate((bs) => window.app.pushBeacons(bs), beacons);
}

/** View の状態を読む。アサート用 */
export async function viewState(page) {
  return page.evaluate(() => {
    const v = window.app.getMap().getView();
    const c = v.getCenter();
    return {
      center: c ? [Math.round(c[0]), Math.round(c[1])] : null,
      zoom: Math.round(v.getZoom() * 100) / 100,
      rotation: Math.round(v.getRotation() * 1000) / 1000,
    };
  });
}

/** マーカーの状態を読む */
export async function markerState(page) {
  return page.evaluate(() => {
    const m = window.app.getMarker();
    if (!m) return null;
    return {
      position: m.position ? m.position.map((n) => Math.round(n)) : null,
      accuracy: m.accuracy,
      direction: m.direction,
      mode: m.mode,
    };
  });
}

/** 地図の描画を撮る。UI（検索欄など）は含めない */
export async function expectMapScreenshot(page, name) {
  await expect(page.locator('#map')).toHaveScreenshot(name, {
    // タイルの継ぎ目やアンチエイリアスで数画素ぶれることがある
    maxDiffPixelRatio: 0.002,
    animations: 'disabled',
  });
}

/**
 * UI（検索欄・検索結果・詳細・フロアボタン）を撮る
 *
 * **地図と分けているのは、UI の崩れが #map のゴールデンに写らないから。**
 * 検索結果の一覧はここができるまで画像で検証されていなかった。
 */
export async function expectUiScreenshot(page, name) {
  await expect(page.locator('#ui')).toHaveScreenshot(name, {
    maxDiffPixelRatio: 0.002,
    animations: 'disabled',
  });
}

/**
 * ルートのフォントサイズを上げる（拡大表示のふり）
 *
 * Android のシステムフォント設定や利用者のズームで字だけが大きくなる状況を作る。
 * **これで崩れないことが「フォントサイズに耐える」の定義。** px 固定の寸法が
 * 残っていると、字だけ大きくなって箱が追いつかず切れる。
 *
 * 効かせるには UI 側の font-size が rem 基準である必要がある。
 */
export async function enlargeFont(page, size = '24px') {
  await page.addStyleTag({ content: `html { font-size: ${size} }` });
  // レイアウトが落ち着くのを待つ
  await page.waitForTimeout(200);
}
