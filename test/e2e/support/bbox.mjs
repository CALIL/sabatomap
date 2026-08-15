// 指定した色に近い画素の外接矩形を測る。マーカーの寸法を目でなく数字で
// 確かめるための道具。テストからは使わない。
//   node support/bbox.mjs <png> <r> <g> <b> [許容差] [x y w h]
import {chromium} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const [png, r, g, b, tol = '40', ...box] = process.argv.slice(2);

const browser = await chromium.launch();
const page = await browser.newPage();

const result = await page.evaluate(async ([src, target, tolerance, rect]) => {
  const img = await new Promise((ok, ng) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = ng;
    i.src = src;
  });
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, img.width, img.height).data;

  const [rx, ry, rw, rh] = rect || [0, 0, img.width, img.height];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, n = 0;

  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      const i = (y * img.width + x) * 4;
      if (Math.abs(d[i] - target[0]) <= tolerance &&
          Math.abs(d[i + 1] - target[1]) <= tolerance &&
          Math.abs(d[i + 2] - target[2]) <= tolerance) {
        n++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!n) return {該当画素: 0};
  return {
    該当画素: n,
    x: [minX, maxX], y: [minY, maxY],
    幅: maxX - minX + 1, 高さ: maxY - minY + 1
  };
}, [
  'data:image/png;base64,' + readFileSync(resolve(png)).toString('base64'),
  [Number(r), Number(g), Number(b)],
  Number(tol),
  box.length === 4 ? box.map(Number) : null
]);

await browser.close();
console.log(JSON.stringify(result));
