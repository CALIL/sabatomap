// 実際に createRoot でマウントして描画するテスト。
//
// なぜ「ビルドが通る」だけでは足りないか:
// CommonJS を esbuild でバンドルすると __toESM(..., 1) で包まれ、__esModule を見ずに
// module.exports 全体が default に入る。結果 `import C from 'pkg'` がコンポーネントでは
// なくオブジェクトになり、描画時に Element type is invalid で落ちる。
// 型もビルドも通るので、1回描画するテストが無いと気づけない。
import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
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
});
