// 実際に createRoot でマウントして描画するテスト。
//
// なぜ「ビルドが通る」だけでは足りないか:
// CommonJS を esbuild でバンドルすると __toESM(..., 1) で包まれ、__esModule を見ずに
// module.exports 全体が default に入る。結果 `import C from 'pkg'` がコンポーネントでは
// なくオブジェクトになり、描画時に Element type is invalid で落ちる。
// 型もビルドも通るので、1回描画するテストが無いと気づけない。
import { describe, it, expect, afterEach } from 'vitest';
// act だけは preact から直接取る。react は本体（'react'）から出すが、
// preact/compat は出さず preact/test-utils にある。
// react / react-dom / react-dom/client は vitest.config.mjs の alias で
// preact/compat に差し替わるので、本番と同じものを動かしている
import { act } from 'preact/test-utils';
import { createRef } from 'react';
import { createRoot } from 'react-dom/client';

import InitUI from '../src/component/App.jsx';
import Search from '../src/component/Search.jsx';
import Book from '../src/component/Book.jsx';
import Stocks from '../src/component/Stocks.jsx';
import Floors from '../src/component/Floors.jsx';
import Locator from '../src/component/Locator.jsx';
import Facilities from '../src/component/Facilities.jsx';
import Icon from '../src/component/Icon.jsx';

const mounted = [];

async function mount(element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root;
  await act(async () => {
    root = createRoot(container);
    root.render(element);
  });
  mounted.push({ root, container });
  return container;
}

afterEach(async () => {
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await act(async () => root.unmount());
    container.remove();
  }
});

const FACILITIES = [
  { id: '7', name: '鯖江市図書館', systemid: 'Fukui_Sabae', floors: [
    { id: '7', label: '1F' },
    { id: '8', label: '2F' },
  ] },
];

const BOOK = {
  id: 'b1',
  title: 'テスト書名',
  author: 'テスト著者',
  isbn: '9784000000000',
  url: { opac: 'https://example.invalid/opac' },
  detail: { message: '', stocks: [{ place: '一般書架', no: '3', floorId: 7, shelves: [] }] },
};

describe('各コンポーネントが描画できる', () => {
  it('Facilities', async () => {
    const el = await mount(<Facilities facilities={FACILITIES} />);
    expect(el.querySelectorAll('.card')).toHaveLength(1);
    expect(el.textContent).toContain('鯖江市図書館');
  });

  it('Floors は階を逆順に並べる', async () => {
    const el = await mount(<Floors floors={FACILITIES[0].floors} />);
    const labels = [...el.querySelectorAll('label')].map((n) => n.textContent);
    expect(labels).toEqual(['2F', '1F']);
  });

  it('Locator', async () => {
    const el = await mount(<Locator onClick={() => {}} />);
    expect(el.querySelector('#locator button').className).toBe('disabled');
  });

  it('Stocks は detail が無ければ notfetch になる', async () => {
    const el = await mount(<Stocks detail={null} selectStock={() => {}} />);
    expect(el.querySelector('.stocks').className).toContain('notfetch');
  });

  it('Stocks は stocks を並べる', async () => {
    const el = await mount(<Stocks detail={BOOK.detail} selectStock={() => {}} />);
    expect(el.querySelector('.stockA').textContent).toBe('一般書架 [3]');
  });

  it('Book', async () => {
    const el = await mount(<Book book={BOOK} showCover={true} selectBook={() => {}} />);
    expect(el.querySelector('.title').textContent).toContain('テスト書名');
    expect(el.querySelector('img')).not.toBeNull();
    // fa-play をインライン SVG に置き換えた
    expect(el.querySelector('.next svg.icon path')).not.toBeNull();
  });

  it('Search', async () => {
    const el = await mount(<Search placeholder="探したいこと" region="sabae" />);
    expect(el.querySelector('input[type=search]').placeholder).toBe('探したいこと');
    expect(el.querySelector('button.search')).not.toBeNull();
    expect(el.querySelector('button.clear')).not.toBeNull();
    // 検索ボタンと閉じるボタンのアイコンがインライン SVG で出ている
    expect(el.querySelectorAll('svg.icon')).toHaveLength(2);
    expect(el.querySelector('button.search svg.icon path')).not.toBeNull();
  });
});

describe('Icon（Font Awesome の置き換え）', () => {
  // Font Awesome の webfont も CDN も使わない。使うのはこの5つだけ
  for (const [name, viewBox] of Object.entries({
    'search': '0 0 512 512',
    'times': '0 0 352 512',
    'play': '0 0 448 512',
    'arrow-left': '0 0 448 512',
    'chevron-right': '0 0 320 512',
  })) {
    it(`${name} が描画できる`, async () => {
      const el = await mount(<Icon name={name} />);
      const svg = el.querySelector('svg.icon');
      expect(svg).not.toBeNull();
      expect(svg.getAttribute('viewBox')).toBe(viewBox);
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.querySelector('path').getAttribute('d').length).toBeGreaterThan(50);
    });
  }
});

describe('InitUI（本番と同じ入口）', () => {
  it('施設未選択なら Facilities を出し、インスタンスを同期で返す', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    let instance;
    await act(async () => {
      instance = InitUI({ facilities: FACILITIES }, container);
    });

    // app.js は InitUI の戻り値をコントローラとして同期的に使う（UI.setState など）
    expect(instance).toBeTruthy();
    expect(typeof instance.setFacility).toBe('function');
    expect(container.textContent).toContain('鯖江市図書館');

    // 施設を選ぶと Search と Floors と Locator に切り替わる
    await act(async () => instance.setFacility(FACILITIES[0]));
    expect(container.querySelector('input[type=search]')).not.toBeNull();
    expect(container.querySelector('#floors')).not.toBeNull();
    expect(container.querySelector('#locator')).not.toBeNull();

    container.remove();
  });

  /*
   src/app.js の loadFacility は UI.setFacility(facility) の**直後に同期で**
   loadFloor(floor.id) → UI.setFloorId(id) を呼ぶ。

   React 17 までは React のイベント外の setState が同期に流れていたので、
   setFloorId の時点で Floors はマウント済みだった。createRoot（React 18 以降）の
   自動バッチングでは描画が遅延するため floorsRef.current が null のままで、
   App.jsx の `if (this.floorsRef.current)` が黙って握りつぶす。
   結果、起動時にどの階も選択されない。

   act() を挟まずに app.js と同じ順で呼ぶのが再現条件。
   */
  it('setFacility の直後に setFloorId を呼んでも階が選択される', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let instance;
    await act(async () => {
      instance = InitUI({ facilities: FACILITIES }, container);
    });

    await act(async () => {
      // app.js の loadFacility と同じ並び。間に await を挟まない
      instance.setFacility(FACILITIES[0]);
      instance.setFloorId('7');
    });

    const radios = [...container.querySelectorAll('#floors .floor input')];
    expect(radios.map((r) => r.value)).toEqual(['8', '7']);   // 階は逆順に並ぶ
    expect(radios.find((r) => r.value === '7').checked).toBe(true);
    expect(radios.find((r) => r.value === '8').checked).toBe(false);

    container.remove();
  });
});

/*
 所蔵情報（Stocks）の取得キュー。

 Unitrad は集計中ずっとポーリングし、そのたびに Search のコールバックが
 「detail がまだ無い本」を全部キューへ積み直す。積んだ本の取得が終わる前に
 次のポーリングが来ると、同じ本が二重に積まれる。

 以前の fetchDetail は先頭が取得済みだったとき shift せずに return していたので、
 その二重ぶんが先頭に居座り、**キューが二度と進まなくなっていた**。
 後ろに並んだ本の所蔵情報が永久に出ない。
 */
describe('所蔵情報の取得キュー', () => {
  const item = (id) => ({ uuid: 'u1', book: { id } });
  const origFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = origFetch; });

  async function searchWithQueue(queue, cache) {
    const ref = createRef();
    await mount(<Search placeholder="探す" region="Fukui_Sabae" ref={ref} />);
    const s = ref.current;
    await act(async () => s.setState({ query: 'ねこ', uuid: 'u1', books: [] }));
    s.cacheDetail = cache;
    s.queueDetail = queue;
    return s;
  }

  it('先頭が取得済みでもキューが進む', async () => {
    const calls = [];
    globalThis.fetch = (url) => { calls.push(url); return new Promise(() => {}); };

    // A は取得済み。二重に積まれて先頭に残っている状態
    const s = await searchWithQueue([item('A'), item('B')], { A: { stocks: [] } });

    s.fetchDetail();

    expect(s.queueDetail).toHaveLength(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('id=B');
  });

  it('取得済みが続いても全部捨てて次を取りに行く', async () => {
    const calls = [];
    globalThis.fetch = (url) => { calls.push(url); return new Promise(() => {}); };

    const s = await searchWithQueue(
      [item('A'), item('B'), item('C')],
      { A: { stocks: [] }, B: { stocks: [] } }
    );

    s.fetchDetail();

    expect(s.queueDetail).toHaveLength(0);
    expect(calls[0]).toContain('id=C');
  });

  it('取得に失敗しても次へ進む', async () => {
    globalThis.fetch = () => Promise.reject(new Error('ネットワーク断'));

    const s = await searchWithQueue([item('A'), item('B')], {});

    s.fetchDetail();
    await new Promise((r) => setTimeout(r, 0));
    expect(s.queueDetail.map((q) => q.book.id)).toEqual(['B']);

    s.fetchDetail();
    await new Promise((r) => setTimeout(r, 0));
    expect(s.queueDetail).toHaveLength(0);
  });

  it('検索が切り替わったぶん（uuid 違い）は捨てる', async () => {
    const calls = [];
    globalThis.fetch = (url) => { calls.push(url); return new Promise(() => {}); };

    const s = await searchWithQueue(
      [{ uuid: 'u0', book: { id: 'X' } }, item('B')],
      {}
    );

    s.fetchDetail();
    expect(calls).toHaveLength(0);            // 古い検索のぶんは取りに行かない
    expect(s.queueDetail.map((q) => q.book.id)).toEqual(['B']);
  });
});
