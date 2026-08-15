/*
 ビーコンの受信状況を画面に出す（デバッグビルド専用）

 実機で「現在地が出ない」となったとき、USB を繋いで chrome://inspect を開ける
 状況ばかりではない。館内で端末だけを見て切り分けられるようにする。

 tools/build.mjs が `__DEBUG__` を建てたときだけ app.js から呼ばれる。
 release ビルドでは define と minify で丸ごと落ちる。

 **地図にも操作にも一切かぶらないこと**を優先している。
 pointer-events: none なので、下にあるボタンはそのまま押せる。
 位置はコンパス（top 70px / iOS 90px）に合わせ、右側は空けてある。
 */

/** 見出しと本文の色。夜の館内でも読めるよう白抜きにする */
const STYLE = [
  'position: absolute',
  'top: 70px',
  'left: 8px',
  'max-width: calc(100% - 70px)',
  'padding: 6px 8px',
  'border-radius: 4px',
  'background: rgba(0, 0, 0, 0.72)',
  'color: #fff',
  'font: 11px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  'white-space: pre',
  'pointer-events: none',
  'user-select: none',
  '-webkit-user-select: none',
  // #offline(2000000) より上、スプラッシュ(9000000) より下
  'z-index: 3000000',
].join(';');

/** rssi の強い順に minor:rssi を並べる。多いと読めないので上位だけ */
function formatBeacons(beacons, limit) {
  if (beacons.length === 0) {
    return 'なし';
  }
  const sorted = beacons.slice().sort((a, b) => b.rssi - a.rssi);
  const head = sorted.slice(0, limit).map((b) => `${b.minor}:${b.rssi}`).join(' ');
  return sorted.length > limit ? `${head} ほか${sorted.length - limit}` : head;
}

/** 経過を「12秒前」「3分前」に。まだ一度も無いときは null */
function since(at) {
  if (at === null) {
    return null;
  }
  const sec = Math.round((Date.now() - at) / 1000);
  return sec < 60 ? `${sec}秒前` : `${Math.round(sec / 60)}分前`;
}

/**
 * デバッグ表示を作る
 *
 * @param getState {function} 表示するデータを返す。app.js の diagnostics()
 * @param opts {Object} ios なら位置をずらす
 * @returns {Object} update() を持つ。呼ぶたびに描き直す
 */
export default function createBeaconDebug(getState, { ios = false } = {}) {
  const el = document.createElement('div');
  el.id = 'beacon-debug';
  el.setAttribute('style', ios ? STYLE.replace('top: 70px', 'top: 90px') : STYLE);
  document.body.appendChild(el);

  const render = () => {
    const s = getState();
    const lines = [];

    // ranging が増えていなければ、検出がそもそも始まっていない。
    // 圏内にビーコンが無くても1秒ごとに呼ばれるので、ここは必ず増える
    const last = since(s.lastRangeAt);
    lines.push(`BLE ${s.platform}  ranging ${s.ranging}${last === null ? '（未着）' : `（${last}）`}`);
    lines.push(`見えている ${formatBeacons(s.lastBeacons, 4)}`);
    lines.push(`のべ ${s.beacons} 本  施設 ${s.facility ?? '-'}  フロア ${s.floor ?? '-'}`);

    const p = s.position;
    lines.push(p === null
      ? '測位 なし'
      : `測位 ${p.algorithm}  誤差 ${p.accuracy}m  minor ${p.beacon ? p.beacon.minor : '-'}`);
    lines.push(`方位 ${s.heading === null ? '-' : Math.round(s.heading)}`);

    el.textContent = lines.join('\n');
  };

  render();
  // ranging が止まったことも見えるように、受信が無くても回す
  const timer = setInterval(render, 1000);

  return {
    update: render,
    destroy() {
      clearInterval(timer);
      el.remove();
    },
  };
}
