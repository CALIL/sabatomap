/*

 Unitrad UI APIライブラリ

 Copyright (c) 2017 CALIL Inc.
 This software is released under the MIT License.
 http://opensource.org/licenses/mit-license.php

 */

const ENDPOINT = 'https://unitrad.calil.jp/v1/';
const FIELDS = ['free', 'title', 'author', 'publisher', 'isbn', 'ndc', 'year_start', 'year_end', 'region'];


/**
 * Unitrad APIにアクセスするための共通関数
 *
 * 以前は superagent の `.query(obj).end(cb)` だった。fetch に寄せたのは
 * superagent を落とすため。挙動は次の3点で揃えてある。
 *   - 2xx 以外は失敗として扱う（superagent の .end() が err を立てるのと同じ）
 *   - レスポンスは JSON としてパースする
 *   - polling が「更新なし」を res.body === null で判定していたので、
 *     空のレスポンスは null を返す
 *
 * @param command {String} APIのコマンド
 * @param params {Object} クエリパラメータ
 * @returns {Promise<Object>} パース済みのレスポンス
 * @private
 */
function _request(command, params) {
  const url = new URL(command, ENDPOINT);
  for (let [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`${command}: ${res.status} ${res.statusText}`);
      return res.text();
    })
    .then((text) => (text === '' ? null : JSON.parse(text)));
}


/** 横断検索APIクラス  */
export class api {
  /**
   * 検索APIの起動
   * @param query {Object} 検索クエリ
   * @param callback {Function} 検索結果を受け取るコールバック関数
   */
  constructor(query, callback) {
    this.callback = callback;
    this.killed = false;
    this.search(query);
  }

  /**
   * 検索の中止
   */
  kill() {
    this.killed = true;
  }

  search(query) {
    if (!this.killed) {
      // then に成功と失敗を両方渡す。catch にすると receive() が投げた例外まで
      // 拾って再検索してしまい、superagent の .end(cb) と挙動が変わる
      _request('search', stripQuery(query)).then(
        (data) => this.receive(data),
        () => setTimeout(() => this.search(query), 1000)
      );
    }
  }

  polling() {
    if (!this.killed) {
      // timeout はサーバ側のロングポーリングの指定で、クライアントの待ち時間ではない
      _request('polling', {
        uuid: this.data.uuid,
        version: this.data.version,
        diff: 1,
        timeout: 10
      }).then(
        (data) => {
          if (data === null) {
            setTimeout(() => this.polling(), 100)
          } else {
            this.receive(data)
          }
        },
        // 以前は err を見ずに res.body を触っていたので、通信が失敗すると
        // res が undefined で TypeError になりポーリングが止まっていた。
        // search と同じく間を置いて再試行する
        () => setTimeout(() => this.polling(), 1000)
      );
    }
  }

  receive(data) {
    if (!this.killed) {
      if (data.books_diff) {
        Array.prototype.push.apply(this.data.books, data.books_diff.insert);
        for (let key in data) {
          if (data.hasOwnProperty(key) && key !== 'books_diff') {
            this.data[key] = data[key];
          }
        }
        for (let d of data.books_diff.update) {
          for (let key in d) {
            if (d.hasOwnProperty(key) && key !== '_idx') {
              if (Array.isArray(d[key]) === true) {
                Array.prototype.push.apply(this.data.books[d._idx][key], d[key]);
              } else if (d[key] instanceof Object) {
                for (let k in d[key]) {
                  if (d[key].hasOwnProperty(k)) {
                    this.data.books[d._idx][key][k] = d[key][k];
                  }
                }
              } else {
                this.data.books[d._idx][key] = d[key];
              }
            }
          }
        }
      } else {
        this.data = data;
      }
      this.callback(this.data);
      if (data.running === true) {
        console.log('[Unitrad] continue...');
        setTimeout(() => this.polling(), 500);
      } else {
        console.log('[Unitrad] complete.');
      }
    }
  }
  getMap() {
    if (!this.killed) {
      let fetchCount = 0;
      this.data.books.forEach((book) => {
        if (book.detail || !book.holdings.includes(100622)) return;
        // if (fetchCount >= 3) return;
        const url = `https://sabatomap-mapper.calil.jp/get?uuid=${this.data.uuid}&id=${book.id}`
        fetchCount += 1;
        fetch(url).then((r) => r.json()).then((r) => {
          book.detail = r.data;
          this.callback(this.data);
        });
        if (fetchCount >= 3) {
          setTimeout(() => this.getMap(), 3000);
        }
      });
    }
  }
}


/**
 * クエリを共通形式にして返す
 * @param query
 * @returns {Object}
 */
export function normalizeQuery(query) {
  let tmp = {};
  for (let k of FIELDS) {
    tmp[k] = query[k] ? query[k] : '';
  }
  return tmp
}


/**
 * クエリが空かどうか判定する
 *   "region"のみの場合は空と判定する
 * @param query
 * @returns {boolean}
 */
export function isEmptyQuery(query) {
  if (query) {
    for (let k of FIELDS) {
      if (k === 'region') continue;
      if (query.hasOwnProperty(k) && query[k] !== '') return false
    }
  }
  return true
}


/**
 * クエリが同じかどうか判定する
 * @param q1 比較元クエリ
 * @param q2 比較先クエリ
 * @returns {boolean}
 */
export function isEqualQuery(q1, q2) {
  for (let k of FIELDS) {
    if (k === 'region') continue;
    if ((q1 && q1.hasOwnProperty(k) ? q1[k] : '') !== (q2 && q2.hasOwnProperty(k) ? q2[k] : '' )) return false
  }
  return true
}


/**
 * クエリを内容のあるプロパティだけにする
 * @param query
 * @returns {Object} query
 */
export function stripQuery(query) {
  let tmp = {};
  for (let k of FIELDS) {
    if (query.hasOwnProperty(k) && query[k] !== '') {
      tmp[k] = query[k];
    }
  }
  return tmp
}

/**
 * マッピングデータを取得する
 *
 * **このリポジトリでは誰も呼んでいない**（unitrad-ui 由来のコードの名残）。
 * さばとマップの棚マッピングは sabatomap-mapper.calil.jp を使う。
 *
 * @param region {String} リージョン
 * @param callback {Function} マッピングデータを受け取るコールバック関数
 */
export function fetchMapping(region, callback) {
  _request('mapping', {'region': region}).then(callback, console.error)
}

