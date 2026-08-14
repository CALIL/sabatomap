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
import request from 'superagent';
import { getDistance } from 'geolib';
import { api, normalizeQuery, isEmptyQuery, isEqualQuery, stripQuery } from '../src/api.js';

describe('CommonJS 依存の受け取り方', () => {
  it('superagent は get を持つ', () => {
    expect(typeof request.get).toBe('function');
  });

  it('geolib の getDistance は関数', () => {
    expect(typeof getDistance).toBe('function');
    // 鯖江市図書館の敷地内で 0 より大きい距離が出る
    expect(getDistance(
      { latitude: 35.961639, longitude: 136.186172 },
      { latitude: 35.962279, longitude: 136.186977 },
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
