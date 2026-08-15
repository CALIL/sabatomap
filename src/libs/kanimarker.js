/*
 Kanimarker
 Copyright (c) 2015 CALIL Inc.
 This software is released under the MIT License.
 http://opensource.org/licenses/mit-license.php
 */
import {easeOut, linear, inAndOut} from 'ol/easing';
import Feature from 'ol/Feature';
import Circle from 'ol/geom/Circle';
import Point from 'ol/geom/Point';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import CircleStyle from 'ol/style/Circle';
import Icon from 'ol/style/Icon';

// マーカーの寸法（CSS ピクセル）。
//
// ol 5 では地図座標で指定していて、位置ドットは `4 * pixelRatio * resolution`
// マップ単位＝ `4 * pixelRatio` CSS ピクセルだった。つまり retina で 8、
// それ以外で 4 と、同じ端末設定でも大きさが変わっていた。
// Feature に載せると CSS ピクセルで素直に書けるので、実機（retina）で
// 描かれていた値をそのまま定数にする。
const DOT_RADIUS = 8;
const DOT_STROKE_WIDTH = 3;

// 方位を示す三角形。ol 5 では生の canvas に
// moveTo(0,-20) / lineTo(-7,-12) / lineTo(7,-12) で描いていた。
//
// 縁は付けない。元のコードは strokeStyle と lineWidth 3 を設定していたが
// stroke() を呼んでおらず fill() だけなので、実際には縁が無い。
// SVG に stroke を書くと内側へ 1.5 食い込んで、見える青が
// 幅 14 から 7.4 まで縮む（実測で確認済み）
//
// 回転の中心をマーカー位置に合わせたいので、原点を中央に置いた
// 正方形にしてある。頂点までの距離は 20 なので 44x44 で足りる。
// width/height と viewBox は必ず同じ値にする。ずらすと ol が固有サイズと
// viewBox のどちらで大きさを決めるかに結果が左右される
const HEADING_ICON_SRC =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">' +
    '<path d="M22 2 L15 10 L29 10 Z" fill="#00a0e9"/>' +
    '</svg>'
  );

class Kanimarker {
  /**
   * マップに現在地マーカーをインストールする
   * @param map {import("ol/Map").default} マップオブジェクト
   */
  constructor(map) {
    // [ol.Map] マップオブジェクト（読み込み専用）
    this.map = map;

    // [String] 表示モードの状態（読み込み専用）
    // normal ... 通常モード
    // centered ... 追従モード
    // headingup ... ヘディングアップモード
    this.mode = "normal";

    // [Array<Number>] マーカーの位置（読み込み専用）
    this.position = null;

    // [Number] マーカーの角度（読み込み専用）
    this.direction = 0;

    // [Number] 計測精度・メートル（読み込み専用）
    this.accuracy = 0;

    // [Number] マーカー移動時のアニメーション時間(ms)
    this.moveDuration = 2000;

    // [Number] 計測精度のアニメーション時間(ms)
    this.accuracyDuration = 2000;

    this.animations = {
      move: null,
      moveMode: null,
      fade: null,
      accuracy: null
    };  // アニメーション用の内部ステート
    this.debug_ = false;  // デバッグ表示の有無(内部ステート)
    this.callbacks = {};  // コールバック用変数

    // 精度円・位置ドット・方位の三角形をそれぞれ Feature にする。
    // ol 5 では postcompose で map のキャンバスへ直接描いていたが、
    // ol 6 以降は map の描画イベントがキャンバスを持たない
    this.accuracyFeature_ = new Feature();
    this.positionFeature_ = new Feature();
    this.headingFeature_ = new Feature();

    // 3個しか入らないので空間インデックスは要らない
    this.source_ = new VectorSource({
      features: [this.accuracyFeature_, this.positionFeature_, this.headingFeature_],
      useSpatialIndex: false
    });

    // updateWhile* が無いと、ビューが動いている間はレイヤーが
    // 前のフレームのキャンバスを平行移動するだけになり、マーカーが遅れる
    this.layer_ = new VectorLayer({
      source: this.source_,
      updateWhileAnimating: true,
      updateWhileInteracting: true
    });

    // 前のフレームで Feature に書いた内容。同じなら触らない。
    // 毎フレーム書き換えると changed() が render を呼び続けて止まらなくなる
    this.applied_ = null;

    if (this.map != null) {
      this.map.addLayer(this.layer_);
      // map の precompose はどのレイヤーの描画よりも先に飛ぶので、
      // ここで Feature を書き換えれば同じフレームに載る
      this.map.on("precompose", this.updateFrame_.bind(this));
      this.layer_.on("postrender", this.renderDebug_.bind(this));
      this.map.on("pointerdrag", this.pointerdrag_.bind(this));
    }
  }

  /**
   * 現在進行中のアニメーションをキャンセルする
   */
  cancelAnimation() {
    // heading も消す。コンストラクタの初期値には無いが setHeading が足すので、
    // 落とすと方位のアニメーションだけ生き残って描画が止まらない
    return this.animations = {
      move: null,
      moveMode: null,
      fade: null,
      accuracy: null,
      heading: null
    };
  }

  /**
   * デバッグ表示の有無を設定する
   * @param value {Boolean}
   */
  setDebug(value) {
    this.debug_ = value;
    return this.map.render();
  }

  /**
   * 表示モードの設定をする
   * @param mode {String} normal / centered / headingup
   * @returns {boolean} 切り替えが成功したか
   */
  setMode(mode) {
    // var froms;
    var d;
    var diff;
    var to;
    var from;
    var animated;

    if (mode !== "normal" && mode !== "centered" && mode !== "headingup") {
      throw "invalid mode";
    }

    if (this.mode !== mode) {
      if (this.position === null && (mode === "centered" || mode === "headingup")) {
        return false;
      }

      if (this.direction === null && mode === "headingup") {
        return false;
      }

      this.mode = mode;

      if (this.position !== null && mode !== "normal") {
        animated = false;

        if (mode === "headingup") {
          from = this.map.getView().getRotation() * 180 / Math.PI % 360;
          to = -this.direction % 360;
          diff = from - to;

          if (diff < -180) {
            diff = -360 - diff;
          }

          if (diff > 180) {
            diff = diff - 360;
          }

          if (Math.abs(diff) > 100) {
            d = 800;
          } else if (Math.abs(diff) > 60) {
            d = 400;
          } else {
            d = 300;
          }
          animated = true;
          this.map.getView().animate({
            duration: d,
            rotation: -(this.direction / 180 * Math.PI),
            easing: easeOut
          })
        }

        if (!animated) {
          from = this.map.getView().getCenter();
          to = this.position;

          if (from[0] - to[0] !== 0 || from[1] - to[1] !== 0) {
            this.map.getView().animate({
              duration: 800,
              center: to,
              easing: easeOut,
            })
          }
        }

        this.map.getView().setCenter(this.position);
      }

      if (mode === "headingup") {
        //this.map.getView().setRotation(-(this.direction / 180 * Math.PI));
      } else {
        this.map.render();
      }

      this.dispatch("change:mode", this.mode);
      return true;
    }
  }

  /**
   * 現在地を設定する
   * @param toPosition {Array} 新しい現在地
   * @param accuracy {Number} 計測精度 nullの場合は前回の値を維持
   * @param silent {Boolean} 再描画抑制フラグ
   * @returns {*}
   */
  setPosition(toPosition, accuracy, silent = false) {
    var fromPosition;

    if ((typeof toPosition !== "undefined" && toPosition !== null && this.position != null && toPosition[0] === this.position[0] && toPosition[1] === this.position[1]) || (!(typeof toPosition !== "undefined" && toPosition !== null) && !(this.position != null))) {
      if (typeof accuracy !== "undefined" && accuracy !== null) {
        this.setAccuracy(accuracy, silent);
      }

      return;
    }

    if (typeof accuracy !== "undefined" && accuracy !== null) {
      this.setAccuracy(accuracy, true);
    }

    if (this.animations.move != null) {
      fromPosition = this.animations.move.current;
    } else {
      fromPosition = this.position;
    }

    this.position = toPosition;

    if (this.mode !== "normal" && (typeof toPosition !== "undefined" && toPosition !== null)) {
      this.map.getView().setCenter(toPosition.slice());
    }

    if (fromPosition != null && (typeof toPosition !== "undefined" && toPosition !== null)) {
      this.animations.move = {
        start: new Date(),
        from: fromPosition.slice(),
        to: toPosition.slice(),
        duration: this.moveDuration,

        animate: function (frameStateTime) {
          var easing;
          var time = (frameStateTime - this.start) / this.duration;

          if (this.duration > 8000) {
            easing = linear(time);
          } else if (this.duration > 2000) {
            easing = inAndOut(time);
          } else {
            easing = easeOut(time);
          }

          this.current = [
            this.from[0] + ((this.to[0] - this.from[0]) * easing),
            this.from[1] + ((this.to[1] - this.from[1]) * easing)
          ];

          return time <= 1;
        }
      };
    }

    if (!(fromPosition != null) && (typeof toPosition !== "undefined" && toPosition !== null)) {
      this.animations.fade = {
        start: new Date(),
        from: 0,
        to: 1,
        position: toPosition,

        animate: function (frameStateTime) {
          var time = (frameStateTime - this.start) / 500;

          this.current = this.from + ((this.to - this.from) * (function (x) {
              return x;
            })(time));

          return time <= 1;
        }
      };
    }

    if (fromPosition != null && !(typeof toPosition !== "undefined" && toPosition !== null)) {
      if (this.mode !== "normal") {
        this.setMode("normal");
      }

      this.animations.move = null;

      this.animations.fade = {
        start: new Date(),
        from: 1,
        to: 0,
        position: fromPosition,

        animate: function (frameStateTime) {
          var time = (frameStateTime - this.start) / 500;

          this.current = this.from + ((this.to - this.from) * (function (x) {
              return x;
            })(time));

          return time <= 1;
        }
      };
    }

    if (!silent) {
      return this.map.render();
    }
  }

  /**
   * 計測精度を設定する
   * @param accuracy {Number} 計測精度（単位はメートル）
   * @param silent {Boolean} 再描画抑制フラグ
   * @returns {*}
   */
  setAccuracy(accuracy, silent = false) {
    var from;

    if (this.accuracy === accuracy) {
      return;
    }

    if (this.animations.accuracy != null && this.animations.accuracy.animate(new Date())) {
      from = this.animations.accuracy.current;
    } else {
      from = this.accuracy;
    }

    this.accuracy = accuracy;

    this.animations.accuracy = {
      start: new Date(),
      from: from,
      to: accuracy,
      duration: this.accuracyDuration,

      animate: function (frameStateTime) {
        var time = (frameStateTime - this.start) / this.duration;
        this.current = this.from + ((this.to - this.from) * easeOut(time));
        return time <= 1;
      }
    };

    if (!silent) {
      return this.map.render();
    }
  }

  /**
   * マーカーの向きを設定する
   * @param direction {Number} 真北からの角度
   * @param silent {Boolean} 再描画抑制フラグ
   * @returns {*}
   */
  setHeading(direction, silent = false) {
    if (direction === undefined || this.direction === direction) {
      return;
    }

    var diff = this.direction - direction;

    if (diff < -180) {
      diff = -360 - diff;
    }

    if (diff > 180) {
      diff = diff - 360;
    }

    this.animations.heading = {
      start: new Date(),
      from: direction + diff,
      to: direction,

      animate: function (frameStateTime) {
        var time = (frameStateTime - this.start) / 500;
        this.current = this.from + ((this.to - this.from) * easeOut(time));
        return time <= 1;
      }
    };

    this.direction = direction;

    if (this.mode === "headingup") {
      this.map.getView().animate({
        duration: 500,
        rotation: -(this.direction / 180 * Math.PI),
        easing: easeOut
      })
      //return this.map.getView().setRotation(-(this.direction / 180 * Math.PI));
    } else if (!silent) {
      this.map.render();
    }
  }

  /**
   * nodoc 1フレーム分アニメーションを進めて Feature へ反映する
   *
   * map の precompose はレイヤーの描画より前に飛ぶので、ここで書き換えれば
   * 同じフレームに載る。ol 5 では postcompose で直接キャンバスへ描いていた
   *
   * @param event {import("ol/render/Event").default}
   * @private
   */
  updateFrame_(event) {
    var frameState = event.frameState;
    var opacity = 1;
    var position = this.position;
    var accuracy = this.accuracy;
    var direction = this.direction;

    if (this.animations.move != null) {
      if (this.animations.move.animate(frameState.time)) {
        position = this.animations.move.current;
        frameState.animate = true;
      } else {
        this.animations.move = null;
      }
    }

    if (this.animations.fade != null) {
      if (this.animations.fade.animate(frameState.time)) {
        opacity = this.animations.fade.current;
        position = this.animations.fade.position;
        frameState.animate = true;
      } else {
        this.animations.fade = null;
      }
    }

    if (this.animations.heading != null) {
      if (this.animations.heading.animate(frameState.time)) {
        direction = this.animations.heading.current;
        frameState.animate = true;
      } else {
        this.animations.heading = null;
      }
    }

    if (this.animations.accuracy != null) {
      if (this.animations.accuracy.animate(frameState.time)) {
        accuracy = this.animations.accuracy.current;
        frameState.animate = true;
      } else {
        this.animations.accuracy = null;
      }
    }

    // 追従モードではビューの中心をマーカーへ寄せる。
    // ol 5 は frameState.viewState.center を直接書き換えていたが、
    // 同じことを View 側へ一本化した。値が変わっていないときに
    // setCenter を呼ぶと changed() が飛んで描画が止まらなくなるので、
    // 座標を比べてから呼ぶ（position は毎フレーム新しい配列になる）
    if (position != null && this.mode !== "normal") {
      var center = this.map.getView().getCenter();

      if (center == null || center[0] !== position[0] || center[1] !== position[1]) {
        this.map.getView().setCenter(position.slice());
      }
    }

    this.applyToFeatures_(position, accuracy, direction, opacity, frameState);
  }

  /**
   * nodoc 計算した状態を Feature の geometry と style へ書く
   * @private
   */
  applyToFeatures_(position, accuracy, direction, opacity, frameState) {
    var resolution = frameState.viewState.resolution;
    var size = this.map.getSize();
    var maxSize = size ? Math.max(size[0], size[1]) : 0;

    var applied = position == null
      ? "hidden"
      : [position[0], position[1], accuracy, direction, opacity, resolution, maxSize].join(",");

    if (this.applied_ === applied) {
      return;
    }

    this.applied_ = applied;

    // setStyle に null を渡すとレイヤーの既定スタイルへ戻ってしまう。
    // 何も描かせないときは空配列を渡す
    if (position == null) {
      this.accuracyFeature_.setStyle([]);
      this.positionFeature_.setStyle([]);
      this.headingFeature_.setStyle([]);
      return;
    }

    // 精度円の半径。ol 5 は accuracy * pixelRatio / 2 マップ単位で描いており、
    // retina では accuracy マップ単位になっていた
    this.accuracyFeature_.setGeometry(new Circle(position, accuracy));
    this.accuracyFeature_.setStyle(this.accuracyStyle_(accuracy / resolution, maxSize, opacity));

    this.positionFeature_.setGeometry(new Point(position));
    this.positionFeature_.setStyle(new Style({
      zIndex: 1,

      image: new CircleStyle({
        radius: DOT_RADIUS,

        fill: new Fill({
          color: [0, 160, 233, opacity]
        }),

        stroke: new Stroke({
          color: [255, 255, 255, opacity],
          width: DOT_STROKE_WIDTH
        })
      })
    }));

    this.headingFeature_.setGeometry(new Point(position));
    this.headingFeature_.setStyle(new Style({
      zIndex: 2,

      image: new Icon({
        src: HEADING_ICON_SRC,
        anchor: [0.5, 0.5],
        opacity: opacity,
        // ビューの回転を ol が足してくれる。
        // ol 5 の direction + frameState.viewState.rotation と同じ
        rotateWithView: true,
        rotation: direction / 180 * Math.PI
      })
    }));
  }

  /**
   * nodoc 精度円のスタイル。画面に対して大きくなりすぎたら薄くして消す
   *
   * ol 5 は radius を pixelRatio 込みのマップ単位で持っていたため、しきい値にも
   * pixelRatio が掛かっていた。retina（pixelRatio 2）で見ると
   * 「円の直径が画面の何割を占めるか」を見ていたことになるので、その形で書く
   *
   * @param radiusPx {Number} 精度円の半径（CSS ピクセル）
   * @param maxSize {Number} 地図の長辺（CSS ピクセル）
   * @param opacity {Number} フェードの不透明度
   * @private
   */
  accuracyStyle_(radiusPx, maxSize, opacity) {
    var diameterPx = radiusPx * 2;

    if (!(radiusPx > 3 && diameterPx < maxSize)) {
      return [];
    }

    var value = 0.2 * opacity;

    if (radiusPx < 30) {
      value = value * (radiusPx / 30);
    }

    if (diameterPx > maxSize * 0.2) {
      value = value * (1 - (diameterPx - maxSize * 0.2) / (maxSize * 0.4));

      if (value < 0) {
        value = 0;
      }
    }

    if (!(value > 0)) {
      return [];
    }

    return new Style({
      zIndex: 0,

      fill: new Fill({
        color: [56, 149, 255, value]
      })
    });
  }

  /**
   * nodoc デバッグ表示。マーカーのレイヤーの上に直接描く
   *
   * ol 6 以降、キャンバスを持つ描画イベントはレイヤー側にしか無い
   *
   * @param event {import("ol/render/Event").default}
   * @private
   */
  renderDebug_(event) {
    var txt;
    var context;

    if (!this.debug_) {
      return;
    }

    context = event.context;
    txt = ("Position:" + this.position + " Heading:" + this.direction + " Accuracy:" + this.accuracy + " Mode:" + this.mode);

    if (this.animations.move != null) {
      txt += " [Move]";
    }

    if (this.animations.heading != null) {
      txt += " [Rotate]";
    }

    if (this.animations.accuracy != null) {
      txt += " [Accuracy]";
    }

    if (this.animations.fade != null) {
      txt += " [Fadein/Out]";
    }

    context.save();
    context.fillStyle = "rgba(255, 255, 255, 0.6)";
    context.fillRect(0, context.canvas.height - 20, context.canvas.width, 20);
    context.font = "10px";
    context.fillStyle = "black";
    context.fillText(txt, 10, context.canvas.height - 7);
    return context.restore();
  }

  /**
   * nodoc ドラッグイベントの処理
   */
  pointerdrag_() {
    if (this.mode !== "normal") {
      return this.setMode("normal");
    }
  }

  /**
   * イベントハンドラーを設定する
   * @param type {String} イベント名
   * @param listener {function} コールバック関数
   * @returns {Kanimarker}
   *
   * @example change:headingup (newvalue) - 追従モードの変更を通知する
   */
  on(type, listener) {
    this.callbacks[type] || (this.callbacks[type] = []);
    this.callbacks[type].push(listener);
    return this;
  }

  /**
   * nodoc イベントを通知する
   */
  dispatch(type, data) {
    var chain = this.callbacks[type];

    if (chain != null) {
      return (() => {
        for (var callback of chain) {
          callback(data);
        }
      })();
    }
  }
}

if (typeof exports !== "undefined") {
  module.exports = Kanimarker;
}

// Deprecated
// ひとまずこれまで通りグローバルで使えるようにしておく
if (window) {
  window.Kanimarker = Kanimarker;
}
