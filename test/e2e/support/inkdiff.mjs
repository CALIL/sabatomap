// 2枚の PNG を「インク（暗さ）の量と重心」で比べる。
//
// 画素の突き合わせだけだと、位置が同じでアンチエイリアスだけ違う場合と、
// レイアウトが動いた場合を区別できない。文字の総インク量と重心が
// ほぼ同じなら前者、ずれていれば後者。
//
// テストからは使わない。使い方:
//   node support/inkdiff.mjs <期待画像> <実際の画像> [x y w h]
import {chromium} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const [expectedPath, actualPath, ...box] = process.argv.slice(2);

const toDataUri = (p) =>
  'data:image/png;base64,' + readFileSync(resolve(p)).toString('base64');

const browser = await chromium.launch();
const page = await browser.newPage();

const result = await page.evaluate(async ([a, b, rect]) => {
  const load = (src) => new Promise((ok, ng) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = ng;
    img.src = src;
  });

  const pixels = async (src) => {
    const img = await load(src);
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    return {
      data: c.getContext('2d').getImageData(0, 0, img.width, img.height).data,
      w: img.width,
      h: img.height
    };
  };

  const A = await pixels(a);
  const B = await pixels(b);
  if (A.w !== B.w || A.h !== B.h) return {error: `寸法が違う ${A.w}x${A.h} vs ${B.w}x${B.h}`};

  const [rx, ry, rw, rh] = rect || [0, 0, A.w, A.h];

  // 明るい紙の上の暗い字を想定して、暗さを重みにする
  const ink = (P) => {
    let sum = 0, sx = 0, sy = 0;
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        const i = (y * P.w + x) * 4;
        const lum = (P.data[i] * 0.299 + P.data[i + 1] * 0.587 + P.data[i + 2] * 0.114);
        const w = Math.max(0, 255 - lum);
        sum += w; sx += w * x; sy += w * y;
      }
    }
    return {sum, cx: sx / sum, cy: sy / sum};
  };

  // 差の大きさの分布。アンチエイリアスなら小さい差に偏る
  const buckets = {'>12': 0, '>32': 0, '>64': 0, '>128': 0};
  let maxDelta = 0;
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      const i = (y * A.w + x) * 4;
      const d = Math.max(
        Math.abs(A.data[i] - B.data[i]),
        Math.abs(A.data[i + 1] - B.data[i + 1]),
        Math.abs(A.data[i + 2] - B.data[i + 2])
      );
      maxDelta = Math.max(maxDelta, d);
      if (d > 12) buckets['>12']++;
      if (d > 32) buckets['>32']++;
      if (d > 64) buckets['>64']++;
      if (d > 128) buckets['>128']++;
    }
  }

  const ia = ink(A), ib = ink(B);
  return {
    範囲: {x: rx, y: ry, w: rw, h: rh},
    画素差: {...buckets, 最大: maxDelta, 全画素: rw * rh},
    インク量: {期待: Math.round(ia.sum), 実際: Math.round(ib.sum), 比: +(ib.sum / ia.sum).toFixed(4)},
    重心のずれ: {dx: +(ib.cx - ia.cx).toFixed(3), dy: +(ib.cy - ia.cy).toFixed(3)}
  };
}, [toDataUri(expectedPath), toDataUri(actualPath), box.length === 4 ? box.map(Number) : null]);

await browser.close();
console.log(JSON.stringify(result, null, 2));
