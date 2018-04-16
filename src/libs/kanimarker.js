/*
 Kanimarker
 Copyright (c) 2015 CALIL Inc.
 This software is released under the MIT License.
 http://opensource.org/licenses/mit-license.php
 */
import ol from 'openlayers';

class Kanimarker {
  /**
   * マップに現在地マーカーをインストールする
   * @param map {ol.Map} マップオブジェクト
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

    this.animations = {};  // アニメーション用の内部ステート
    this.debug_ = false;  // デバッグ表示の有無(内部ステート)
    this.callbacks = {};  // コールバック用変数

    if (this.map != null) {
      this.map.on("postcompose", this.postcompose_, this);
      this.map.on("precompose", this.precompose_, this);
      this.map.on("pointerdrag", this.pointerdrag_, this);
    }
  }

  /**
   * 現在進行中のアニメーションをキャンセルする
   */
  cancelAnimation() {
    return this.animations = {};
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
    var froms;
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
            easing: ol.easing.easeOut
          })
          console.log(this.direction);

          //if (from - to !== 0) {
            

            /*
            animated = true;
            this.animations.moveMode = null;

            this.animations.rotationMode = {
              start: new Date(),
              from: diff,
              to: 0,
              duration: d,

              animate: function (frameStateTime) {
                var time = (frameStateTime - this.start) / this.duration;
                this.current = this.from + ((this.to - this.from) * ol.easing.easeOut(time));
                return time <= 1;
              }
            };
            */
         // }
        }

        if (!animated) {
          from = this.map.getView().getCenter();
          to = this.position;

          if (from[0] - to[0] !== 0 || from[1] - to[1] !== 0) {
            froms = [from[0] - to[0], from[1] - to[1]];

            if (this.animations.moveMode != null && this.animations.moveMode.animate(new Date())) {
              froms = [animations.current[0], animations.moveMode.current[1]];
            }
            this.map.getView().animate({
              duration: 800,
              center: to,
              easing: ol.easing.easeOut,
            })
            /*
            this.animations.moveMode = {
              start: new Date(),
              from: froms,
              to: [0, 0],
              duration: 800,

              animate: function (frameStateTime) {
                var time = (frameStateTime - this.start) / this.duration;

                this.current = [
                  this.from[0] + ((this.to[0] - this.from[0]) * ol.easing.easeOut(time)),
                  this.from[1] + ((this.to[1] - this.from[1]) * ol.easing.easeOut(time))
                ];

                return time <= 1;
              }
            };
            */
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
            easing = ol.easing.linear(time);
          } else if (this.duration > 2000) {
            easing = ol.easing.inAndOut(time);
          } else {
            easing = ol.easing.easeOut(time);
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
        this.current = this.from + ((this.to - this.from) * ol.easing.easeOut(time));
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
        this.current = this.from + ((this.to - this.from) * ol.easing.easeOut(time));
        return time <= 1;
      }
    };

    this.direction = direction;

    if (this.mode === "headingup") {
      this.map.getView().animate({
        duration: 500,
        rotation: -(this.direction / 180 * Math.PI),
        easing: ol.easing.easeOut
      })
      //return this.map.getView().setRotation(-(this.direction / 180 * Math.PI));
    } else if (!silent) {
      this.map.render();
    }
  }

  /**
   * nodoc マップ描画処理
   */
  postcompose_(event) {
    var txt;
    var pixel;
    var iconStyle;
    var circleStyle;
    var diff;
    var opacity_;
    var maxSize;
    var accuracySize;
    var context = event.context;
    var vectorContext = event.vectorContext;
    var frameState = event.frameState;
    var pixelRatio = frameState.pixelRatio;
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

    if (position != null) {
      accuracySize = (accuracy / frameState.viewState.resolution);
      maxSize = Math.max(this.map.getSize()[0], this.map.getSize()[1]);

      if (accuracySize > 3 && accuracySize * pixelRatio < maxSize) {
        opacity_ = 0.2 * opacity;

        if (accuracySize < 30) {
          opacity_ = opacity_ * (accuracySize / 30);
        }

        if (accuracySize * pixelRatio > maxSize * 0.2) {
          diff = accuracySize * pixelRatio - maxSize * 0.2;
          opacity_ = opacity_ * (1 - diff / (maxSize * 0.4));
          if (opacity_ < 0) {
            opacity_ = 0;
          }
        }

        if (opacity_ > 0) {
          vectorContext.setStyle(new ol.style.Style({
            fill: new ol.style.Fill({color:[56, 149, 255,opacity_]})
          }));
          vectorContext.drawCircle(new ol.geom.Circle(position, accuracySize * pixelRatio * frameState.viewState.resolution/2));
        }
      }

      vectorContext.setStyle(new ol.style.Style({
        fill: new ol.style.Fill({
          color: [0,160,233,opacity]
        }),
        stroke: new ol.style.Stroke({
          color: [255, 255, 255,opacity],
          width: 1.5 * pixelRatio
        })
      }));
      vectorContext.drawCircle(new ol.geom.Circle(position, 4 * pixelRatio * frameState.viewState.resolution));
      context.save();

      if (this.mode !== "normal") {
        if (this.animations.moveMode != null) {
          if (this.animations.moveMode.animate(frameState.time)) {
            position = position.slice();
            position[0] -= this.animations.moveMode.current[0];
            position[1] -= this.animations.moveMode.current[1];
            frameState.animate = true;
            pixel = this.map.getPixelFromCoordinate(position);
            context.translate(pixel[0] * pixelRatio, pixel[1] * pixelRatio);
          } else {
            this.animations.moveMode = null;
            context.translate(context.canvas.width / 2, context.canvas.height / 2);
          }
        } else {
          context.translate(context.canvas.width / 2, context.canvas.height / 2);
        }
      } else {
        pixel = this.map.getPixelFromCoordinate(position);
        context.translate(pixel[0] * pixelRatio, pixel[1] * pixelRatio);
      }

      context.rotate((direction / 180 * Math.PI) + frameState.viewState.rotation);
      context.scale(pixelRatio, pixelRatio);
      context.beginPath();
      context.moveTo(0, -20);
      context.lineTo(-7, -12);
      context.lineTo(7, -12);
      context.closePath();
      context.fillStyle = ("rgba(0, 160, 233, " + (opacity) + ")");
      context.strokeStyle = ("rgba(255, 255, 255, " + (opacity) + ")");
      context.lineWidth = 3;
      context.fill();
      context.restore();
    }

    if (this.debug_) {
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
/*
      if (this.animations.rotationMode != null) {
        txt += " [HeadingRotation]" + this.animations.rotationMode.current;
      }
*/
      context.save();
      context.fillStyle = "rgba(255, 255, 255, 0.6)";
      context.fillRect(0, context.canvas.height - 20, context.canvas.width, 20);
      context.font = "10px";
      context.fillStyle = "black";
      context.fillText(txt, 10, context.canvas.height - 7);
      return context.restore();
    }
  }

  /**
   * nodoc マップ描画前の処理
   */
  precompose_(event) {
    var diff;
    var direction;
    var position;
    var frameState;
    console.log(event);

    if (this.position !== null && this.mode !== "normal") {
      frameState = event.frameState;
      position = this.position;

      if (this.animations.move != null) {
        if (this.animations.move.animate(frameState.time)) {
          position = this.animations.move.current;
        } else {
          this.animations.move = null;
        }
      }

      if (this.animations.moveMode != null) {
        if (this.animations.moveMode.animate(frameState.time)) {
          position = position.slice();
          position[0] += this.animations.moveMode.current[0];
          position[1] += this.animations.moveMode.current[1];
          frameState.animate = true;
        } else {
          this.animations.moveMode = null;
        }
      }

      frameState.viewState.center[0] = position[0];
      frameState.viewState.center[1] = position[1];

      if (this.mode === "headingup") {
        direction = this.direction;

        if (this.animations.heading != null) {
          if (this.animations.heading.animate(frameState.time)) {
            direction = this.animations.heading.current;
          } else {
            this.animations.heading = null;
          }
        }
        /*
        diff = 0;

        if (this.animations.rotationMode != null) {
          if (this.animations.rotationMode.animate(frameState.time)) {
            diff = this.animations.rotationMode.current;
            frameState.animate = true;
          } else {
            this.animations.rotationMode = null;
          }
        }
        frameState.viewState.rotation = -((direction - diff) / 180 * Math.PI);
        */
      }
    }
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
