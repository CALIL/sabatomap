import { describe, it, expect, beforeEach } from 'vitest';

import Kanikama from '../src/libs/kanikama.js';
import rules from '../src/sabae.json';

// 測位そのものを実データで確かめる。
//
// ここが無い間、ビーコンからの測位は1行も検証されていなかった。
// jsdom で足りる（地図もキャンバスも要らない）。
//
// 座標について: sabae.json は latitude に経度、longitude に緯度が入っている。
// 名前が実態と逆なので、期待値もその並びで書く。詳しくは kanikama.js 冒頭。

const UUID = '00000000-71C7-1001-B000-001C4D532518';

/** 実機の delegate.didRangeBeaconsInRegion と同じ形 */
const beacon = (minor, rssi, major = 105) => ({ uuid: UUID, major, minor, rssi });

/** app.js の初期化と同じ設定にする */
const newKanikama = () => {
  const k = new Kanikama();
  k.facilities_ = rules;
  k.setTimeout(5000);
  return k;
};

const floor7 = () => rules[0].floors.find((f) => f.id === '7') ?? rules[0].floors[0];

describe('Kanikama', () => {
  let k;
  beforeEach(() => {
    k = newKanikama();
  });

  it('sabae.json の 1F に minor 115 が nearest1 の候補として入っている', () => {
    const entry = floor7().nearest1.find((p) => p.beacon.minor === 115);
    expect(entry).toBeDefined();
    // latitude 側が経度（136 台）。ここが入れ替わると測位が福井県から飛び出す
    expect(entry.latitude).toBeGreaterThan(136);
    expect(entry.longitude).toBeGreaterThan(35);
    expect(entry.longitude).toBeLessThan(36);
  });

  it('ビーコン1本（minor 115）で施設・フロア・現在地が決まる', () => {
    k.push([beacon(115, -60)]);

    expect(k.currentFacility).not.toBeNull();
    expect(k.currentFloor).not.toBeNull();
    expect(k.currentFloor.id).toBe('7');

    expect(k.currentPosition).not.toBeNull();
    expect(k.currentPosition.algorithm).toBe('nearest1');
    expect(k.currentPosition.beacon.minor).toBe(115);
  });

  it('change:position が通知される', () => {
    const seen = [];
    k.on('change:position', (p) => seen.push(p));
    k.push([beacon(115, -60)]);
    expect(seen.length).toBe(1);
    expect(seen[0].algorithm).toBe('nearest1');
  });

  it('rssi が 0 のビーコンは測位に使わない', () => {
    k.push([beacon(115, 0)]);
    expect(k.currentPosition).toBeNull();
  });

  it('施設に無いビーコンでは何も決まらない', () => {
    k.push([beacon(9999, -60, 999)]);
    expect(k.currentFacility).toBeNull();
    expect(k.currentPosition).toBeNull();
  });
});
