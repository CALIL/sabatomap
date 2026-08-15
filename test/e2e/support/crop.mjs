// PNG の一部を切り出して整数倍に拡大した PNG を書き出す（最近傍）。
// マーカーのような小さい描画を目で確かめるための道具。テストからは使わない。
//   node support/crop.mjs <入力> <出力> <x> <y> <w> <h> [倍率]
// 入力を複数（カンマ区切り）渡すと横に並べる。
import {chromium} from '@playwright/test';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const [inputs, out, x, y, w, h, scale = '6'] = process.argv.slice(2);

const sources = inputs.split(',').map(
  (p) => 'data:image/png;base64,' + readFileSync(resolve(p)).toString('base64')
);

const browser = await chromium.launch();
const page = await browser.newPage();

const dataUrl = await page.evaluate(async ([srcs, rect, z]) => {
  const load = (src) => new Promise((ok, ng) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = ng;
    img.src = src;
  });

  const imgs = [];
  for (const s of srcs) imgs.push(await load(s));

  const gap = 8;
  const c = document.createElement('canvas');
  c.width = (rect[2] * z + gap) * imgs.length - gap;
  c.height = rect[3] * z;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#ff00ff';
  ctx.fillRect(0, 0, c.width, c.height);

  imgs.forEach((img, i) => {
    ctx.drawImage(
      img, rect[0], rect[1], rect[2], rect[3],
      i * (rect[2] * z + gap), 0, rect[2] * z, rect[3] * z
    );
  });

  return c.toDataURL('image/png');
}, [sources, [x, y, w, h].map(Number), Number(scale)]);

await browser.close();
writeFileSync(resolve(out), Buffer.from(dataUrl.split(',')[1], 'base64'));
console.log(`書き出した: ${out}`);
