/*
 デバッグビルドのビーコン表示を目で見るための使い捨てスクリプト。

   cd .. && npm run copy:debug && npx cordova prepare browser
   cd test/e2e && node shot-debug.mjs

 spec ではないので playwright test では拾われない。撮った png は test-results/ へ。
 */
import { chromium } from '@playwright/test';
import { createServer, PORT } from './support/server.mjs';
import { openApp, pushBeacons, settle } from './support/app.mjs';

const server = createServer();
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });

const { errors } = await openApp(page, PORT);

// 何も受け取っていない状態（実機で「反応しない」ときの見え方）
await page.screenshot({ path: 'test-results/debug-panel-empty.png' });
console.log('未受信:', await page.evaluate(() => document.getElementById('beacon-debug')?.textContent));

// 115番を流し込む
await pushBeacons(page, [
  { uuid: '00000000-71C7-1001-B000-001C4D532518', major: 105, minor: 115, rssi: -62 },
  { uuid: '00000000-71C7-1001-B000-001C4D532518', major: 105, minor: 114, rssi: -78 },
]);
await settle(page);
await page.screenshot({ path: 'test-results/debug-panel-ranged.png' });
console.log('受信後:', await page.evaluate(() => document.getElementById('beacon-debug')?.textContent));

// 下のボタンが押せること（pointer-events: none の確認）
const blocked = await page.evaluate(() => {
  const panel = document.getElementById('beacon-debug');
  const r = panel.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return hit === panel || panel.contains(hit);
});
console.log('パネルがタップを奪っているか:', blocked);

if (errors.length) console.log('エラー:', errors);

await browser.close();
server.close();
