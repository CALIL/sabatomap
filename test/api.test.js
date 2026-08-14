// src/api.js が superagent の .query(obj).end(cb) から fetch へ移ったので、
// 揃えた挙動をここで固定する。
//
//   - クエリの組み立て（stripQuery が空を落としたうえで URL に載る）
//   - 2xx 以外は失敗として扱い、search は1秒後に再試行する
//   - polling は「更新なし」を null で判定して再試行する
//   - 通信の失敗でポーリングが止まらない
import { describe, it, expect, vi, afterEach } from 'vitest';
import { api } from '../src/api.js';

/** fetch のスタブ。res.text() を返すところまで本物に合わせる */
const okText = (body) => Promise.resolve({
  ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(body),
});
const failWith = (status) => Promise.resolve({
  ok: false, status, statusText: 'Error', text: () => Promise.resolve(''),
});

const alive = [];
afterEach(() => {
  while (alive.length) alive.pop().kill();
  // test/setup.js の既定に戻す
  globalThis.fetch = () => new Promise(() => {});
});

/** 検索を走らせずに polling だけ試すためのインスタンス */
function bareApi(callback, data) {
  const a = Object.create(api.prototype);
  a.killed = false;
  a.callback = callback;
  a.data = data;
  alive.push(a);
  return a;
}

const RESULT = { uuid: 'u1', version: 1, books: [], running: false };

describe('search', () => {
  it('空でないフィールドだけを URL に載せる', async () => {
    const urls = [];
    globalThis.fetch = (url) => { urls.push(String(url)); return okText(JSON.stringify(RESULT)); };

    const received = [];
    alive.push(new api({ free: 'ねこ', title: '', region: 'sabae' }, (d) => received.push(d)));
    await vi.waitFor(() => expect(received).toHaveLength(1));

    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe('https://unitrad.calil.jp/v1/search?free=%E3%81%AD%E3%81%93&region=sabae');
    expect(received[0]).toEqual(RESULT);
  });

  it('2xx 以外なら再試行する', async () => {
    let n = 0;
    globalThis.fetch = () => {
      n += 1;
      return n === 1 ? failWith(503) : okText(JSON.stringify(RESULT));
    };

    const received = [];
    alive.push(new api({ free: 'ねこ' }, (d) => received.push(d)));
    // 再試行は 1000ms 後
    await vi.waitFor(() => expect(received).toHaveLength(1), { timeout: 4000 });
    expect(n).toBe(2);
  });

  it('通信そのものが失敗しても再試行する', async () => {
    let n = 0;
    globalThis.fetch = () => {
      n += 1;
      return n === 1 ? Promise.reject(new TypeError('Failed to fetch')) : okText(JSON.stringify(RESULT));
    };

    const received = [];
    alive.push(new api({ free: 'ねこ' }, (d) => received.push(d)));
    await vi.waitFor(() => expect(received).toHaveLength(1), { timeout: 4000 });
    expect(n).toBe(2);
  });

  it('kill 後は結果を配らない', async () => {
    let resolve;
    globalThis.fetch = () => new Promise((r) => { resolve = r; });

    const received = [];
    const a = new api({ free: 'ねこ' }, (d) => received.push(d));
    a.kill();
    resolve({ ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(JSON.stringify(RESULT)) });
    await new Promise((r) => setTimeout(r, 50));
    expect(received).toHaveLength(0);
  });
});

describe('polling', () => {
  it('null は「更新なし」なので再試行する', async () => {
    const bodies = ['null', JSON.stringify({ uuid: 'u1', version: 2, books: [], running: false })];
    const urls = [];
    let n = 0;
    globalThis.fetch = (url) => { urls.push(String(url)); return okText(bodies[n++]); };

    const received = [];
    bareApi((d) => received.push(d), { uuid: 'u1', version: 1, books: [] }).polling();

    await vi.waitFor(() => expect(received).toHaveLength(1), { timeout: 4000 });
    expect(n).toBe(2);
    expect(urls[0]).toBe('https://unitrad.calil.jp/v1/polling?uuid=u1&version=1&diff=1&timeout=10');
    expect(received[0].version).toBe(2);
  });

  it('通信の失敗で止まらない', async () => {
    let n = 0;
    globalThis.fetch = () => {
      n += 1;
      return n === 1
        ? Promise.reject(new TypeError('Failed to fetch'))
        : okText(JSON.stringify({ uuid: 'u1', version: 2, books: [], running: false }));
    };

    const received = [];
    bareApi((d) => received.push(d), { uuid: 'u1', version: 1, books: [] }).polling();

    await vi.waitFor(() => expect(received).toHaveLength(1), { timeout: 4000 });
    expect(n).toBe(2);
  });
});

describe('receive の差分適用', () => {
  it('books_diff の insert と update を反映する', async () => {
    globalThis.fetch = () => okText(JSON.stringify({
      uuid: 'u1', version: 1, running: false,
      books: [{ id: 'b1', title: '一冊目', holdings: [] }],
    }));

    const received = [];
    const a = new api({ free: 'ねこ' }, (d) => received.push(d));
    alive.push(a);
    await vi.waitFor(() => expect(received).toHaveLength(1));

    a.receive({
      version: 2,
      running: false,
      books_diff: {
        insert: [{ id: 'b2', title: '二冊目', holdings: [] }],
        update: [{ _idx: 0, holdings: [100622] }],
      },
    });

    expect(a.data.version).toBe(2);
    expect(a.data.books.map((b) => b.id)).toEqual(['b1', 'b2']);
    expect(a.data.books[0].holdings).toEqual([100622]);
  });
});
