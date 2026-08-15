import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { solidPng } from './png.mjs';

/*
 外部への通信を全部止めて、決まったものを返す。

 **ホスト名ではなくパスで当てる。** ホスト決め打ちにすると、向き先が変わったときに
 静かに実 API へ素通りして、結果が通信状況に左右されるようになる。

 配架図の GeoJSON は src/json/*.json をそのまま使う。これは S3 が返すものの
 ローカル控えで、7.json は S3 と同じ 118,715 バイト。
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');

const BASE_TILE = solidPng(256, [232, 232, 232]);   // Mapbox のベースタイル代わり
const FLOOR_TILE = solidPng(256, [255, 255, 255]);  // 配架図タイル代わり
const COVER = solidPng(64, [200, 200, 200]);        // 書影代わり

const readJson = (p) => fs.readFileSync(path.join(repo, p), 'utf8');

/** Unitrad の検索応答。running が false なので polling は走らない */
export const SEARCH_RESULT = {
  uuid: 'e2e-uuid',
  version: 1,
  running: false,
  books: [
    {
      id: 'b1', title: 'テスト書名 いち', author: 'テスト著者', isbn: null,
      holdings: [100622], url: { opac: 'https://example.invalid/b1' },
    },
    {
      id: 'b2', title: 'テスト書名 に', author: 'テスト著者', isbn: null,
      holdings: [100622], url: { opac: 'https://example.invalid/b2' },
    },
  ],
};

/** sabatomap-mapper の応答。棚 320 を指す */
export const MAPPER_RESULT = {
  data: { message: '', stocks: [{ place: '一般書架', no: '3', floorId: 7, shelves: [{ id: 320 }] }] },
};

/**
 * ページのネットワークを固定する
 * @returns {{blocked: string[], calls: Record<string, number>}} 遮断した URL と種別ごとの回数
 */
export async function stubNetwork(page, { port }) {
  const blocked = [];
  const calls = { baseTile: 0, floorTile: 0, geojson: 0, search: 0, polling: 0, mapper: 0, cover: 0 };

  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes(`127.0.0.1:${port}`)) return route.continue();

    const { pathname } = new URL(url);
    const png = (body) => route.fulfill({ status: 200, contentType: 'image/png', body });
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json; charset=utf-8', body });

    // Mapbox のベースタイル: /styles/v1/<user>/<style>/tiles/{z}/{x}/{y}
    if (/\/styles\/v1\/.+\/tiles\//.test(pathname)) { calls.baseTile++; return png(BASE_TILE); }

    // 配架図タイル: /sabatomap/tiles/<xid>/{z}/{x}/{y}.png
    if (/\/sabatomap\/tiles\//.test(pathname)) { calls.floorTile++; return png(FLOOR_TILE); }

    // 配架図 GeoJSON: /calil.sabatomap2/<フロアID>.json
    const geo = pathname.match(/\/calil\.sabatomap2\/(\d+)\.json$/);
    if (geo) { calls.geojson++; return json(readJson(`src/json/${geo[1]}.json`)); }

    if (pathname.endsWith('/v1/search')) { calls.search++; return json(JSON.stringify(SEARCH_RESULT)); }
    if (pathname.endsWith('/v1/polling')) { calls.polling++; return json('null'); }
    if (pathname.endsWith('/get')) { calls.mapper++; return json(JSON.stringify(MAPPER_RESULT)); }
    if (pathname.endsWith('/openbd_cover')) { calls.cover++; return png(COVER); }

    blocked.push(url);
    return route.abort();
  });

  return { blocked, calls };
}
