import { test, expect } from '@playwright/test';
import {
  openApp, settle, pushBeacons, enableBluetooth, pretendBluetoothOff,
  viewState, markerState, expectMapScreenshot,
  BEACON_F7, BEACON_F7_FAR, BEACON_F8, SHELF_ID,
} from './support/app.mjs';
import { stubNetwork } from './support/stub.mjs';

/*
 地図の描画を実ブラウザで確かめる。

 npm test（vitest / jsdom）は canvas を持たないので、Map を作った時点で何も描かれない。
 OpenLayers の版を上げるときに壊れたと分かるのは、ここだけ。

 ネットワークは全部スタブしてある（test/e2e/support/stub.mjs）。
 タイルは単色、配架図は src/json/*.json、Unitrad と mapper は固定の応答。
 */

const PORT = Number(process.env.E2E_PORT ?? 5173);

test.describe('スプラッシュ', () => {
  /*
   www/index.html の #splash は全画面を覆う。

   アプリ側の z-index が桁違いに大きく（#offline 2000000 / #detail 1200000 /
   検索ボックス .box 1000000 / 検索結果 90000）、9999 で置いたら
   検索ボックスとその中の読み込み表示が透けて出た。

   .box は position + z-index で自前の重ね合わせコンテキストを作るので、
   その上に出られれば中身もまとめて隠れる。画面の何点かで最前面を確かめる。
   */
  test('出ている間は UI を覆い隠す', async ({ page }) => {
    await stubNetwork(page, { port: PORT });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'commit' });
    await page.waitForSelector('#ui input[type=search]', { timeout: 20000 });

    const top = await page.evaluate(() => {
      const s = document.getElementById('splash');
      if (!s) return { gone: true };
      const box = document.querySelector('#ui .box');
      const r = box.getBoundingClientRect();
      const at = (x, y) => {
        const el = document.elementFromPoint(x, y);
        return el === s || s.contains(el);
      };
      return {
        gone: false,
        zIndex: Number(getComputedStyle(s).zIndex),
        // 検索ボックスの左端・中央・右端（消去ボタンと読み込み表示がいる）
        coversBox: [r.left + 8, (r.left + r.right) / 2, r.right - 8]
          .every((x) => at(x, (r.top + r.bottom) / 2)),
        coversCenter: at(innerWidth / 2, innerHeight / 2 + 200),
        coversBottom: at(innerWidth / 2, innerHeight - 40),
      };
    });

    expect(top.gone).toBe(false);
    // アプリ側の最大 2000000 より上にいること
    expect(top.zIndex).toBeGreaterThan(2000000);
    expect(top.coversBox).toBe(true);
    expect(top.coversCenter).toBe(true);
    expect(top.coversBottom).toBe(true);
  });

  test('最短 2 秒出てから消える', async ({ page }) => {
    await stubNetwork(page, { port: PORT });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'commit' });
    await page.waitForSelector('#splash', { state: 'detached', timeout: 20000 });

    const at = await page.evaluate(() => performance.now());
    // ロゴを見せるための下限。地図が遅ければさらに延びる
    expect(at).toBeGreaterThan(1900);
  });
});

test.describe('地図', () => {
  test('起動すると1階の配架図が出る', async ({ page }) => {
    const { net, errors } = await openApp(page, PORT);

    // 施設が1件なので自動で選ばれ、entrance の 7（1階）が読み込まれる
    await expect(page.locator('#map')).toHaveClass(/visible/);
    await expect(page.locator('#floors input[value="7"]')).toBeChecked();
    expect(net.calls.geojson).toBeGreaterThan(0);
    expect(net.calls.floorTile).toBeGreaterThan(0);
    expect(net.calls.baseTile).toBeGreaterThan(0);

    await expectMapScreenshot(page, 'floor-7.png');
    expect(errors).toEqual([]);
    expect(net.blocked).toEqual([]);
  });

  test('フロアを切り替えると2階になる', async ({ page }) => {
    const { net, errors } = await openApp(page, PORT);
    const before = net.calls.geojson;

    await page.evaluate(() => window.app.loadFloor('8'));
    await settle(page);

    await expect(page.locator('#floors input[value="8"]')).toBeChecked();
    expect(net.calls.geojson).toBeGreaterThan(before);

    await expectMapScreenshot(page, 'floor-8.png');
    expect(errors).toEqual([]);
  });

  test('棚を指定するとハイライトされる', async ({ page }) => {
    const { errors } = await openApp(page, PORT);

    await page.evaluate((id) => window.app.navigateShelf('7', [{ id }]), SHELF_ID);
    await settle(page);

    await expectMapScreenshot(page, 'shelf-highlight.png');
    expect(errors).toEqual([]);
  });

  test('ビーコンを受け取ると現在地マーカーが出る', async ({ page }) => {
    const { errors } = await openApp(page, PORT);

    expect(await markerState(page)).toMatchObject({ position: null, mode: 'normal' });

    // 1本だけ押すと nearest1 が当たり、確度 3m の位置が決まる
    await pushBeacons(page, [{ ...BEACON_F7, rssi: -50 }]);
    await settle(page);

    const marker = await markerState(page);
    expect(marker.position).not.toBeNull();
    expect(marker.accuracy).toBe(3);

    await expectMapScreenshot(page, 'marker.png');
    expect(errors).toEqual([]);
  });

  test('現在地ボタンで追従モードになり中心が現在地に寄る', async ({ page }) => {
    const { errors } = await openApp(page, PORT);

    // BLE を持つ端末のふりをしないと invalidateLocator が normal へ戻す
    await enableBluetooth(page);
    await pushBeacons(page, [{ ...BEACON_F7, rssi: -50 }]);
    await settle(page);

    await page.evaluate(() => window.app.locatorClicked());
    await settle(page);

    const marker = await markerState(page);
    expect(marker.mode).toBe('centered');

    // 追従モードでは View の中心がマーカーの位置に一致する
    const view = await viewState(page);
    expect(view.center).toEqual(marker.position);

    await expectMapScreenshot(page, 'marker-centered.png');
    expect(errors).toEqual([]);
  });

  test('もう一度押すと headingup になる', async ({ page }) => {
    const { errors } = await openApp(page, PORT);

    await enableBluetooth(page);
    await pushBeacons(page, [{ ...BEACON_F7, rssi: -50 }]);
    await page.evaluate(() => window.app.getMarker().setHeading(90, true));
    await settle(page);

    await page.evaluate(() => window.app.locatorClicked());   // normal -> centered
    await settle(page);
    await page.evaluate(() => window.app.locatorClicked());   // centered -> headingup
    await settle(page);

    expect(await markerState(page)).toMatchObject({ mode: 'headingup' });
    await expectMapScreenshot(page, 'marker-headingup.png');
    expect(errors).toEqual([]);
  });

  /*
   locatorClicked の normal 分岐と invalidateLocator は
   cordova.plugins.BluetoothStatus.hasBTLE / BTenabled を見る。
   ブラウザのプロキシは BLE を持たないので、現在地ボタンは追従モードに入らず
   「この機種は現在地を測定できません」を出して地図を合わせ直すだけになる。
   **change:mode の購読者がその場で normal へ戻すため、追従モードには到達できない。**
   実機と挙動が違う場所なので固定しておく。
   */
  test('BLE が無い端末では現在地ボタンが測定できない旨を出す', async ({ page }) => {
    const { errors } = await openApp(page, PORT);

    await pushBeacons(page, [{ ...BEACON_F7, rssi: -50 }]);
    await settle(page);

    await page.evaluate(() => window.app.locatorClicked());

    await expect(page.locator('#locator > div')).toHaveText('この機種は現在地を測定できません');
    expect(await markerState(page)).toMatchObject({ mode: 'normal' });
    expect(errors).toEqual([]);
  });

  /*
   Android 12 以降は BluetoothAdapter.isEnabled() に BLUETOOTH_CONNECT が要るが、
   cordova-plugin-bluetooth-status（2016年で停止）は宣言していない。
   例外を投げても false を返しても BTenabled は初期値 false のままになり、
   「オフ」と「分からない」を区別できない。

   そのまま使うと現在地ボタンが永久に塞がるので、Android では BTenabled を
   信用せず測位そのものの結果で案内する。iOS は権限の分割が無いのでこれまで通り。
   */
  test('Android では Bluetooth が切れていても現在地ボタンを塞がない', async ({ page }) => {
    const { errors } = await openApp(page, PORT);
    await pretendBluetoothOff(page, { platformId: 'android' });
    await pushBeacons(page, [{ ...BEACON_F7, rssi: -50 }]);
    await settle(page);

    await page.evaluate(() => window.app.locatorClicked());

    // 「BluetoothをONにしてください」で止めず、測位まで進む
    await expect(page.locator('#locator > div')).not.toHaveText('BluetoothをONにしてください');
    expect(await markerState(page)).toMatchObject({ mode: 'centered' });
    expect(errors).toEqual([]);
  });

  test('iOS では Bluetooth が切れていることを先に伝える', async ({ page }) => {
    const { errors } = await openApp(page, PORT);
    await pretendBluetoothOff(page, { platformId: 'ios' });
    await pushBeacons(page, [{ ...BEACON_F7, rssi: -50 }]);
    await settle(page);

    await page.evaluate(() => window.app.locatorClicked());

    await expect(page.locator('#locator > div')).toHaveText('BluetoothをONにしてください');
    expect(await markerState(page)).toMatchObject({ mode: 'normal' });
    expect(errors).toEqual([]);
  });

  test('方位を受け取るとマーカーが回る', async ({ page }) => {
    const { errors } = await openApp(page, PORT);

    await pushBeacons(page, [{ ...BEACON_F7, rssi: -50 }]);
    await page.evaluate(() => window.app.getMarker().setHeading(90, true));
    await settle(page);

    expect(await markerState(page)).toMatchObject({ direction: 90 });

    await expectMapScreenshot(page, 'marker-heading.png');
    expect(errors).toEqual([]);
  });

  test('同じフロアの別のビーコンを受け取ると現在地が動く', async ({ page }) => {
    const { errors } = await openApp(page, PORT);

    await pushBeacons(page, [{ ...BEACON_F7, rssi: -50 }]);
    await settle(page);
    const first = await markerState(page);

    await pushBeacons(page, [{ ...BEACON_F7_FAR, rssi: -50 }]);
    await settle(page);
    const second = await markerState(page);

    expect(second.position).not.toEqual(first.position);
    expect(errors).toEqual([]);
  });

  /*
   kanikama.updateFloor は「現在のフロアを 5 秒間以上検出していない場合」にだけ
   フロアを切り替える。人が階をまたぐ途中で行き来しないための履歴条件で、
   別フロアのビーコンを1回受け取っただけでは変わらないのが正しい。
   */
  test('別フロアのビーコンを受け取ってもすぐには切り替わらない', async ({ page }) => {
    const { errors } = await openApp(page, PORT);

    await pushBeacons(page, [{ ...BEACON_F7, rssi: -50 }]);
    await settle(page);
    await expect(page.locator('#floors input[value="7"]')).toBeChecked();

    await pushBeacons(page, [{ ...BEACON_F8, rssi: -40 }]);
    await settle(page);

    await expect(page.locator('#floors input[value="7"]')).toBeChecked();
    expect(errors).toEqual([]);
  });
});

test.describe('検索', () => {
  test('検索して本を開くと棚がハイライトされる', async ({ page }) => {
    const { net, errors } = await openApp(page, PORT);

    await page.fill('#ui input[type=search]', 'ねこ');
    await page.press('#ui input[type=search]', 'Enter');
    await page.waitForSelector('#ui .books > div', { timeout: 20000 });

    expect(net.calls.search).toBe(1);
    await expect(page.locator('#ui .books > div')).toHaveCount(2);

    await page.click('#ui .books > div:first-child');
    await page.waitForSelector('#detail.show', { timeout: 10000 });
    await expect(page.locator('#detail .stocks .stockA')).toHaveText('一般書架 [3]');

    await settle(page);
    await expectMapScreenshot(page, 'search-shelf.png');
    expect(errors).toEqual([]);
  });

  /*
   検索欄の右のボタンは1つしかなく、通常は ✘（検索結果を閉じる）、
   集計中は .loading が付いてスピナーが :before で乗る。
   両方出すと重なって読めないので、読み込み中は ✘ を隠す。

   Unitrad は running が true の間ポーリングを続ける。
   スタブの searchRunning でその状態を作る。
   */
  test('集計中は ✘ を隠してスピナーだけ出す', async ({ page }) => {
    await stubNetwork(page, { port: PORT, searchRunning: true });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'commit' });
    await page.waitForSelector('#splash', { state: 'detached', timeout: 20000 });

    await page.fill('#ui input[type=search]', 'ねこ');
    await page.press('#ui input[type=search]', 'Enter');
    await page.waitForSelector('#ui .clear.loading', { timeout: 20000 });

    const clear = page.locator('#ui .clear.loading');
    // ボタン自体は押せるまま（検索結果を閉じられる）
    await expect(clear).toBeVisible();
    // 中の ✘ だけが消えている
    await expect(clear.locator('.icon')).toBeHidden();
    // スピナーは出ている
    expect(await clear.evaluate((el) =>
      getComputedStyle(el, ':before').animationName)).toBe('spinner');
  });
});
