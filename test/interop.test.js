// CommonJS の依存が default 解決で object に化けていないかを見る。
//
// esbuild は module.exports = {__esModule: true, default: X} を返す CommonJS を
// __toESM(..., 1) で包み、__esModule を見ずに module.exports 全体を default へ入れる。
// browserify は require をそのまま扱っていたので起きなかった問題で、
// バンドラーを入れ替えるときに必ず確認する場所。
//
// vitest はソースを直接読むのでバンドラーそのものの検証にはならないが、
// 「何を import してどう使っているか」の契約をここに固定しておけば、
// 実装側が受け方を変えたときに気づける。
import { describe, it, expect } from 'vitest';
import { getDistance } from 'ol/sphere';
import rules from '../src/sabae.json';
import { api, normalizeQuery, isEmptyQuery, isEqualQuery, stripQuery } from '../src/api.js';

describe('CommonJS 依存の受け取り方', () => {
  it('ol/sphere の getDistance は関数', () => {
    expect(typeof getDistance).toBe('function');
    // 鯖江市図書館の敷地内で 0 より大きい距離が出る。ol/sphere は [経度, 緯度]
    expect(getDistance(
      [136.186172, 35.961639],
      [136.186977, 35.962279],
    )).toBeGreaterThan(0);
  });

  it('api.js の公開関数が揃っている', () => {
    expect(typeof api).toBe('function');
    for (const fn of [normalizeQuery, isEmptyQuery, isEqualQuery, stripQuery]) {
      expect(typeof fn).toBe('function');
    }
  });
});

describe('クエリの正規化', () => {
  const FIELDS = ['free', 'title', 'author', 'publisher', 'isbn', 'ndc', 'year_start', 'year_end', 'region'];

  it('normalizeQuery は全フィールドを埋める', () => {
    const q = normalizeQuery({ free: 'ねこ' });
    expect(Object.keys(q).sort()).toEqual([...FIELDS].sort());
    expect(q.free).toBe('ねこ');
    expect(q.title).toBe('');
  });

  it('stripQuery は空のフィールドを落とす', () => {
    expect(stripQuery(normalizeQuery({ free: 'ねこ', region: 'sabae' })))
      .toEqual({ free: 'ねこ', region: 'sabae' });
  });

  it('isEmptyQuery は region だけなら空と見なす', () => {
    expect(isEmptyQuery(normalizeQuery({ region: 'sabae' }))).toBe(true);
    expect(isEmptyQuery(normalizeQuery({ free: 'ねこ', region: 'sabae' }))).toBe(false);
    expect(isEmptyQuery(null)).toBe(true);
  });

  it('isEqualQuery は region の違いを無視する', () => {
    const a = normalizeQuery({ free: 'ねこ', region: 'sabae' });
    const b = normalizeQuery({ free: 'ねこ', region: 'fukui' });
    expect(isEqualQuery(a, b)).toBe(true);
    expect(isEqualQuery(a, normalizeQuery({ free: 'いぬ' }))).toBe(false);
  });
});

/*
 sabae.json の座標の並びを固定する。

 latitude に経度、longitude に緯度が入っている（鯖江市は北緯 35.96 / 東経 136.18）。
 このリポジトリは位置で扱っていて、第1要素を経度として渡すことで辻褄が合っている。
 app.js の transform([p.latitude, p.longitude], "EPSG:4326", ...) と
 kanikama.js の getDistance([b.latitude, b.longitude], ...) が同じ約束で動く。

 **フィールド名を直すなら、この2箇所も同時に直すこと。** データだけ直すと
 地図のマーカーと距離が両方おかしくなる。片方だけ直しても同じ。
 このテストはその取り違えを落とすためにある。
 */
describe('sabae.json の座標の並び', () => {
  const floors = rules.flatMap((f) => f.floors);
  const points = floors.flatMap((f) => [
    ...(f.beacons ?? []), ...(f.nearest1 ?? []), ...(f.nearest2 ?? []), ...(f.nearestD ?? []),
  ]);

  it('全フロアの座標を拾えている', () => {
    // フロア7が 219+80+59+21、フロア8が 42+12+15 で計 448 点
    expect(points.length).toBe(448);
    expect(points.every((p) => typeof p.latitude === 'number' && typeof p.longitude === 'number')).toBe(true);
  });

  it('latitude に経度が、longitude に緯度が入っている', () => {
    for (const p of points) {
      // 緯度は -90〜90 なので、136 付近の値が latitude に入るのは名前が逆な証拠
      expect(p.latitude).toBeGreaterThan(136);
      expect(p.latitude).toBeLessThan(137);
      expect(p.longitude).toBeGreaterThan(35);
      expect(p.longitude).toBeLessThan(36);
    }
  });

  it('bbox は EPSG:4326 の [経度, 緯度, 経度, 緯度] で、座標がその中に収まる', () => {
    for (const floor of floors) {
      const [minLon, minLat, maxLon, maxLat] = floor.bbox;
      expect(minLon).toBeGreaterThan(136);
      expect(minLat).toBeGreaterThan(35);
      for (const b of floor.beacons ?? []) {
        expect(b.latitude).toBeGreaterThanOrEqual(minLon - 0.001);
        expect(b.latitude).toBeLessThanOrEqual(maxLon + 0.001);
        expect(b.longitude).toBeGreaterThanOrEqual(minLat - 0.001);
        expect(b.longitude).toBeLessThanOrEqual(maxLat + 0.001);
      }
    }
  });

  it('この並びで測ると館内に収まる距離になる', () => {
    for (const floor of floors) {
      const bs = floor.beacons ?? [];
      if (bs.length < 2) continue;
      let max = 0;
      for (const b of bs) {
        max = Math.max(max, getDistance(
          [bs[0].latitude, bs[0].longitude],
          [b.latitude, b.longitude],
        ));
      }
      // 鯖江市図書館は一辺 100m 弱。名前どおりに読むと桁が変わる
      expect(max).toBeGreaterThan(0);
      expect(max).toBeLessThan(200);
    }
  });
});
