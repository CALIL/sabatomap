/*

 Kanikama
 Copyright (c) 2015 CALIL Inc.
 This software is released under the MIT License.
 http://opensource.org/licenses/mit-license.php

 */

import geolib from 'geolib'

/**
 * ビーコンオブジェクトが同じかどうか評価する
 * @param a
 * @param b
 * @returns {boolean}
 */
export function equalBeacon(a, b) {
  return a.uuid.toLowerCase() === b.uuid.toLowerCase() && a.major === b.major && a.minor === b.minor;
}

/**
 * Some utility for beacons buffer
 * @private
 */
export class Buffer {
  validate_(beacons) {
    for (var b of beacons) {
      if (typeof b.major !== "number" || typeof b.minor !== "number" || typeof b.rssi !== "number" || typeof b.uuid !== "string") {
        return false;
      }
    }

    return true;
  }

  /**
   * @param length {Number} Length of buffer
   * @param verify {Boolean} Verify data at each push (default:false)
   */
  constructor(length, verify = true) {
    this.length = length;
    this.verify = verify;
    this.buffer = [];
    this.ranged = [];
    this.timeout = 0;
  }

  /**
   * Push new beacons to buffer
   *
   * @param beacons {Object} List of beacons
   * @return {Number} New buffer length
   */
  push(beacons) {
    for (let b of beacons) {
      if (typeof b.major === "string") {
        b.major = Number(b.major);
      }

      if (typeof b.minor === "string") {
        b.minor = Number(b.minor);
      }
    }

    if (this.verify && !this.validate_(beacons)) {
      throw new Error("Invalid Beacons.");
    }

    if (this.buffer.length >= this.length) {
      this.buffer.shift();
    }

    this.buffer.push(beacons);

    // 平均処理のための処理
    if (this.timeout > 0) {
      for (let a of beacons) {
        var found = false;
        for (let b of this.ranged) {
          if (equalBeacon(a, b)) {
            b.rssi = a.rssi;
            b.lastAppear = new Date();
            found = true;
          }
        }

        if (!found) {
          a.lastAppear = new Date();
          this.ranged.push(a);
        }
      }
      const t = this.timeout;
      this.ranged = this.ranged.filter(function(c) {
        return new Date() - c.lastAppear < t;
      });
    }

    return true;
  }

  /**
   * Return slice of buffer
   * @param size is should set over 0
   * @returns {*}
   */
  last(size) {
    if (size === 1 && this.timeout > 0) {
      return [this.ranged];
    } else {
      return this.buffer.slice(-1 * size);
    }
  }

  /**
   * Clear buffer
   */
  clear() {
    this.buffer.length = 0;
    this.ranged.length = 0;
    return 0;
  }

  /**
   * Return buffer length
   */
  size() {
    return this.buffer.length;
  }
}

export class Kanikama {
  constructor() {
    this.facilities_ = null;
    this.currentFacility = null;  // 現在選択されている施設
    this.currentFloor = null;  // 現在選択されているフロア
    this.currentPosition = null;  // 現在地
    this.heading = null;  // デバイスの向いている方向(度/null)
    this.callbacks = {};  // コールバック用変数
    this.buffer = new Buffer(10);  // 計測データのバッファ
    this.uid = 1000000000;
  }

  setTimeout(timeout) {
    this.buffer.timeout = timeout;
  }

  /**
   * 現在選択されている施設のビーコンがバッファにあるか調べる
   *
   * @param windowSize {Number} 調査するバッファの長さ
   * @returns {Boolean} ビーコンの有無
   * @private
   */
  existCurrentFacilityBeacon(windowSize) {
    if (this.currentFacility !== null) {
      const buffer = this.buffer.last(windowSize);
      for (let i = 0; i < buffer.length; i++) {
        for (let j = 0; j < buffer[i].length; j++) {
          for (let k = 0; k < this.currentFacility.beacons.length; k++) {
            const a = this.currentFacility.beacons[k];
            const b = buffer[i][j];
            if (equalBeacon(a, b)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  /**
   * もっとも近い(RSSIが強い)ビーコンの施設を返す
   *
   * @param windowSize {Number} 調査するバッファの長さ
   * @returns {Object} 施設
   * @private
   */
  getNearestFacility(windowSize) {
    let nearestBeacon = null;
    let tmp = this.buffer.last(windowSize);
    for (let beacons of tmp) {
      for (let b of beacons) {
        if (nearestBeacon === null || nearestBeacon.rssi < b.rssi) {
          nearestBeacon = b;
        }
      }
    }

    if (nearestBeacon) {
      for (let facility of this.facilities_) {
        for (let fb of facility.beacons) {
          if (equalBeacon(fb, nearestBeacon)) {
            return facility;
          }
        }
      }
    }

    return null;
  }

  /**
   * バッファを処理して施設を選択す
   *
   * 現在選択されている施設のビーコンがバッファにない場合、新しい施設を選択する
   * @private
   */
  updateFacility() {
    var newFacility;

    if (!this.existCurrentFacilityBeacon(10)) {
      newFacility = this.getNearestFacility(3);

      if (newFacility) {
        this.currentFacility = newFacility;
        this.currentFloor = null;
        this.currentPosition = null;
        return this.dispatch("change:facility", this.currentFacility);
      }
    }
  }

  /**
   * もっとも近いフロアを返す
   *
   * ・各フロアで一番RSSIが近いビーコンの周囲3メートルのRSSI平均を比較する
   * ・施設が選択されていない状態で呼び出した場合はエラーとなる
   * ・ビーコンに該当するフロアが1つのみの場合はそのフロアを返す
   * @param windowSize {Number} 調査するバッファの長さ
   * @returns {Object} フロア
   * @private
   */
  getNearestFloor(windowSize) {
    // ビーコンをフロア毎に仕分ける
    // RSSIが0のビーコンは無視する
    let foundFloor = 0;
    for (let floor of this.currentFacility.floors) {
      floor._runtime.beacons = [];
      for (const beacons of this.buffer.last(windowSize)) {
        for (const b of beacons) {
          for (const fb of floor.beacons) {
            if (equalBeacon(fb, b) && b.rssi !== 0) {
              floor._runtime.beacons.push({
                uuid: b.uuid,
                major: b.major,
                minor: b.minor,
                rssi: b.rssi,
                longitude: fb.longitude,
                latitude: fb.latitude
              });
              break;
            }
          }
        }
      }
      if (floor._runtime.beacons.length > 0) {
        foundFloor++;
      }
    }

    // 見つかったフロアがひとつの場合はフロアを確定
    if (foundFloor === 1) {
      for (let floor of this.currentFacility.floors) {
        if (floor._runtime.beacons.length > 0) {
          return floor;
        }
      }
    }

    // 各フロアでRSSIが最も強いビーコンの周囲3mのビーコンの平均RSSIを計算
    // 最も平均RSSIが高いフロアを返す
    let result = null, rssiSum = 0, rssiCount = 0;
    const effectiveRange = 3;
    for (let floor of this.currentFacility.floors) {
      if (floor._runtime.beacons.length > 0) {
        floor._runtime.beacons.sort((a, b) => b.rssi - a.rssi);
        for (const b of floor._runtime.beacons) {
          const distance = geolib.getDistance(b, floor._runtime.beacons[0]);
          if (distance <= effectiveRange) {
            rssiSum += b.rssi;
            rssiCount++;
          }
        }
        floor._runtime.averageRssi = rssiSum / rssiCount;

        if (result === null || floor._runtime.averageRssi > result._runtime.averageRssi) {
          result = floor;
        }
      }
    }
    return result;
  }

  /**
   * バッファを処理してフロアを選択する
   * @private
   */
  updateFloor() {
    // フロアのランタイム変数を初期化
    // 識別のためのユニークなID(UID)を設定
    for (var floor of this.currentFacility.floors) {
      if (!floor._runtime) {
        floor._runtime = {
          uid: this.uid++
        };
      }
    }

    if (this.currentFloor === null && this.currentFacility.floors.length === 1) {
      this.currentFloor = this.currentFacility.floors[0];
      this.currentPosition = null;
    } else {
      let newFloor = this.getNearestFloor(3);
      if (newFloor !== null) {
        newFloor._runtime.lastAppear = new Date();

        // フロアが1つしかない場合は即時フロアを確定する
        if (!this.currentFloor) {
          this.currentFloor = newFloor;
          this.currentPosition = null;
          this.dispatch("change:floor", this.currentFloor);
        } else if (newFloor._runtime.uid !== this.currentFloor._runtime.uid) {
          // 現在のフロアを5秒間以上検出していない場合は切り替え
          if ((new Date()) - this.currentFloor._runtime.lastAppear > 5000) {
            this.currentFloor = newFloor;
            this.currentPosition = null;
            this.dispatch("change:floor", this.currentFloor);
          }
        }
      }
    }
  }

  /**
   * Nearest1アルゴリズムの実装
   *
   * RSSIが最も強いビーコンを現在地として推定する
   * currentFloor.nearest1に条件リストがある場合に動く
   * {
   *   latitude: 緯度
   *   longitude: 経度
   *   beacon: ビーコン
   * }
   *
   * @param beacons {Object} 計測データ
   * @param filter_near {Number} 第2候補との差の閾値
   * @returns {Object} フロア
   * @private
   */
  nearest1(beacons, filter_near) {
    if (beacons.length === 0) {
      return null;
    }
    if (!this.currentFloor.nearest1) {
      return null;
    }
    beacons = beacons.filter((b) => b.rssi !== 0);
    beacons.sort((a, b) => b.rssi - a.rssi);

    if (filter_near > 0 && beacons.length > 1 && beacons[0].rssi - beacons[1].rssi <= filter_near) {
        return null;
    }

    for (let p of this.currentFloor.nearest1) {
      if (equalBeacon(p.beacon, beacons[0])) {
        p.rssi = beacons[0].rssi;
        p.algorithm = "nearest1";
        return p;
      }
    }
    return null;
  }

  /**
   * NearestDアルゴリズムの実装
   *
   * RSSIが最も強いビーコンとデバイスの向きにより現在地を推定する
   * currentFloor.nearestDに条件リストがある場合に動く
   * {
   *   latitude: 緯度
   *   longitude: 経度
   *   beacon: ビーコン
   *   direction: デバイスの方向(度)
   *   range: directionを中心とした適用範囲(度)
   * }
   *
   * @param beacons {Object} 計測データ  * @param beacons
   * @param filter_near {Number} 第2候補との差の閾値  * @param filter_near
   * @returns {Object} フロア  * @returns {*}
   * @private
   */
  nearestD(beacons, filter_near) {
    var end;
    var start;

    if (this.heading === null) {
      return null;
    }

    if (beacons.length === 0) {
      return null;
    }

    if (!this.currentFloor.nearestD) {
      return null;
    }

    beacons = beacons.filter(function(_b) {
      return _b.rssi !== 0;
    });

    beacons.sort(function(_a, _b) {
      return _b.rssi - _a.rssi;
    });

    if (filter_near > 0 && beacons.length > 1) {
      if (beacons[0].rssi - beacons[1].rssi <= filter_near) {
        return null;
      }
    }

    for (var p of this.currentFloor.nearestD) {
      if (equalBeacon(p.beacon, beacons[0])) {
        p.algorithm = "nearestD";
        p.rssi = beacons[0].rssi;
        start = p.direction - p.range / 2;
        end = p.direction + p.range / 2;

        if (start <= this.heading && this.heading <= end) {
          return p;
        }

        if (start < 0) {
          if (start + 360 <= this.heading && this.heading <= 360) {
            return p;
          }
        }

        if (end >= 360) {
          if (0 <= this.heading && this.heading <= end - 360) {
            return p;
          }
        }
      }
    }

    return null;
  }

  /**
   * Nearest2アルゴリズムの実装
   *
   * 2点の平均RSSIの比較により現在地を推定する
   * currentFloor.nearest2に条件リストがある場合に動く
   * {
   *   latitude: 緯度
   *   longitude: 経度
   *   beacons: [ビーコン1,ビーコン2]
   * }
   *
   * @param beacons {Object} 計測データ
   * @param filter_near {Number} 第2候補との差の閾値
   * @returns {Object} フロア
   * @private
   */
  nearest2(beacons, filter_near) {
    if (beacons.length < 2) {
      return null;
    }

    if (!this.currentFloor.nearest2) {
      return null;
    }

    beacons = beacons.filter(function(_item) {
      return _item.rssi !== 0;
    });

    beacons.sort(function(x, y) {
      return y.rssi - x.rssi;
    });

    const fa = (a) => (b) => equalBeacon(b, a);
    const fb = (a) => (b) => equalBeacon(b, a);

    let candidate = [];
    for (const p of this.currentFloor.nearest2) {
      const a = beacons.filter(fa(p.beacons[0]));
      const b = beacons.filter(fb(p.beacons[1]));
      if (a.length > 0 && b.length > 0) {
        p.rssi = (a[0].rssi + b[0].rssi) / 2;
        candidate.push(p);
      }
    }

    if (candidate.length === 0) {
      return null;
    }

    candidate.sort(function(x, y) {
      return y.rssi - x.rssi;
    });

    if (filter_near > 0) {
      if (candidate.length > 1 && candidate[0].rssi - candidate[1].rssi <= filter_near) {
        return null;
      }
    }

    // どちらかがトップであれば返す
    if (equalBeacon(candidate[0].beacons[0], beacons[0]) || equalBeacon(candidate[0].beacons[1], beacons[0])) {
      candidate[0].algorithm = "nearest2";
      return candidate[0];
    }

    return null;
  }

  /**
   * バッファを処理して現在場所を推定する
   * @private
   */
  updatePosition() {
    const d = this.buffer.last(1)[0];
    let accuracy = 0.1;
    let newPosition = this.nearestD(d, 5);
    if (newPosition === null) {
      newPosition = this.nearest2(d, 3);
      if (newPosition === null) {
        accuracy = 3;
        newPosition = this.nearestD(d, 4);
        if (newPosition === null) {
          newPosition = this.nearest1(d, 6);
          if (newPosition === null) {
            accuracy = 6;
            newPosition = this.nearest2(d, 1);
            if (newPosition === null) {
              if (this.currentPosition === null || this.currentPosition.accuracy >= 6) {
                newPosition = this.nearest1(d, 0);
                accuracy = 10;
              }
            }
          }
        }
      }
    }

    if (newPosition !== null) {  // 現在地が見つかった場合は移動
      newPosition.accuracy = accuracy;
      this.currentPosition = newPosition;
      this.currentPosition._runtime = {
        lastAppear: new Date(),
        accuracy: accuracy
      };
      this.dispatch("change:position", this.currentPosition);
    } else if (this.currentPosition !== null) {  // 現在地が見つからない場合は、accuracyを下げる
      const diff = new Date() - this.currentPosition._runtime.lastAppear;
      if (diff > this.buffer.timeout + 10000) {  // 10秒間現在地が見つからない場合は現在地は不明とする
        this.currentPosition = null;
        this.dispatch("change:position", this.currentPosition);
      } else {
        const a = this.nowAccuracy_();
        if (a !== this.currentPosition.accuracy) {
          this.currentPosition.accuracy = a;
          this.dispatch("change:position", this.currentPosition);
        }
      }
    }
  }

  /**
   * 現在の確度を取得する
   * @returns {number} accuracy 現在の確度
   * @private
   */
  nowAccuracy_() {
    const diff = new Date() - this.currentPosition._runtime.lastAppear;
    let a = this.currentPosition._runtime.accuracy;
    if (a < 3) {
      a = 3;
    }
    if (diff > this.buffer.timeout + 5000) {
      a *= 5;
    } else if (diff > this.buffer.timeout + 2000) {
      a *= 2;
    }
    if (a >= 25) {
      a = 25;
    }
    return a;
  }

  /**
   * 新しい計測データを追加して状態をアップデートする
   */
  push(beacons) {
    this.buffer.push(beacons);
    this.updateFacility();

    if (this.currentFacility !== null) {
      this.updateFloor();

      if (this.currentFloor !== null) {
        this.updatePosition();
      }
    }
  }

  /**
   * イベントハンドラーを設定する
   *
   * @param type {String} イベント名
   * @param listener {function} コールバック関数
   * change:headingup (newvalue) - 追従モードの変更を通知する
   * @returns {Kanikama}
   */
  on(type, listener) {
    this.callbacks[type] = this.callbacks[type] || [];
    this.callbacks[type].push(listener);
    return this;
  }

  /**
   * @nodoc イベントを通知する
   * @param type
   * @param data
   * @private
   */
  dispatch(type, data) {
    const chain = this.callbacks[type];


    if (Array.isArray(chain)) {
      for (const listener of chain) {
        listener(data);
      }
    }
  }
}

// Deprecated
// ひとまずこれまで通りグローバルで使えるようにしておく
if (window) {
  window.Kanikama = Kanikama;
}
