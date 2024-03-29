/*
 配架図レイヤーを表示するOpenLayers3プラグイン

 @author sakai@calil.jp
 @author ryuuji@calil.jp
 */

import LayerGroup from 'ol/layer/Group';
import XYZ from 'ol/source/xyz';
import VectorSource from 'ol/source/Vector';
import TileLayer from 'ol/layer/Tile';
import Style from 'ol/style/Style';
import VectorLayer from 'ol/layer/Vector';
import Text from 'ol/style/Text';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import {GeoJSON} from 'ol/format';
import Polygon from 'ol/geom/Polygon';
import Icon from 'ol/style/Icon';
import Point from 'ol/geom/Point';
import CircleStyle from 'ol/style/Circle';

export default class Kanilayer extends LayerGroup {

  /**
   * 強調表示する棚IDを指定
   * @param id
   * @returns {*|{min, max}}
   */
  setTargetShelf(id) {
    this.targetShelves = [{
      "id": id
    }];

    return this.vector.changed();
  }

  /**
   * @nodoc
   * @param ids
   * @returns {*|{min, max}}
   */
  setTargetShelves(ids) {
    this.targetShelves = ids;
    return this.vector.changed();
  }

  /**
   * 配架図のタイルソースオブジェクトを取得
   * @param id {String} フロアID
   * @returns {ol.source.XYZ} タイルソース
   * @private
   */
  getHaikaTileSource_(id) {
    var xid = ("0000000000" + parseInt(id)).slice(-10);

    return new XYZ({
      // url: "https://tiles.haika.io/" + xid + "/{z}/{x}/{y}.png",
      url: "https://lab.calil.jp/sabatomap/tiles/" + xid + "/{z}/{x}/{y}.png",
      maxZoom: 24
    });
  }

  /**
   * @nodoc 配架図のベクターソースオブジェクトを取得
   * @param id {String} フロアID
   * @returns {ol.source.Vector} ベクターソース
   * @private
   */
  getHaikaVectorSource_(id) {
    return new VectorSource({
      // url: ("https://app.haika.io/api/facility/2/" + (id) + ".geojson"),
      url: "https://s3-ap-northeast-1.amazonaws.com/calil.sabatomap2/" + id + ".json",
      format: new GeoJSON()
    });
  }

  /**
   * 配架図レイヤーを作成する
   * @param options {Object} オプション
   * @option kFloor {String} フロアID
   */
  constructor(options) {
    var options_ = {
      minResolution: 0.0001,
      maxResolution: 100,
      kFloor: null,
      targetImageUrl: null,
      targetImageUrl2: null
    };

    var merge = function(obj1, obj2) {
      if (!obj2) {
        obj2 = {};
      }

      return (() => {
        for (var attr of Object.keys(obj2)) {
          if (obj2.hasOwnProperty(attr)) {
            obj1[attr] = obj2[attr];
          }
        }
      })();
    };

    merge(options_, options);
    var preThis = {};
    preThis.targetImageUrl = null;
    preThis.targetImageUrl2 = null;


    if (options_.targetImageUrl != null) {
      preThis.targetImageUrl = options_.targetImageUrl;
    }

    if (options_.targetImageUrl2 != null) {
      preThis.targetImageUrl2 = options_.targetImageUrl2;
    }

    preThis.tileA = new TileLayer({
      source: null,
      opacity: 1,
      preload: 3
    });

    preThis.tileB = new TileLayer({
      source: null,
      opacity: 0,
      visible: false,
      preload: 3
    });

    var styleFunction = (feature, resolution) => {

      var message;
      var url;
      var size;
      var side;
      var index_;
      var index;
      var styles = [];

      if (resolution >= 1) return styles;

      if (feature.get("type") === "shelf") {

          index = -1;
          index_ = 0;
          side = null;

          for (var shelf of this.targetShelves) {
            if (shelf.id === parseInt(feature.get("id"))) {
              if (shelf.side != null) {
                if (side === null) {
                  side = shelf.side;
                } else {
                  if (side === "a" && shelf.side === "b") {
                    side = null;
                    break;
                  }

                  if (side === "b" && shelf.side === "a") {
                    side = null;
                    break;
                  }
                }
              }

              index = index_;
            }

            index_++;
          }

          if (index !== -1) {
            this.targetPosition = feature;

            if (index >= 1) {
              styles.push(new Style({
                stroke: new Stroke({
                  color: "#9E7E49",
                  width: 2
                }),

                fill: new Fill({
                  color: "#FFBE4D"
                }),

                geometry: function(feature) {
                  var a_;
                  var b_;
                  var d_;
                  var c_;
                  var a = feature.getGeometry().getCoordinates()[0][0];
                  var b = feature.getGeometry().getCoordinates()[0][1];
                  var c = feature.getGeometry().getCoordinates()[0][2];
                  var d = feature.getGeometry().getCoordinates()[0][3];
                  var size = (1 / resolution) * window.devicePixelRatio;

                  if (side === "a" && size >= 20 * window.devicePixelRatio) {
                    c_ = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
                    d_ = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2];
                    return new Polygon([[a, b, c_, d_, a]]);
                  } else if (side === "b" && size >= 20 * window.devicePixelRatio) {
                    b_ = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
                    a_ = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2];
                    return new Polygon([[a_, b_, c, d, a_]]);
                  } else {
                    return new Polygon([[a, b, c, d, a]]);
                  }
                }
              }));
            } else {
              styles.push(new Style({
                zIndex: 9998,

                stroke: new Stroke({
                  color: "#9E7E49",
                  width: 2
                }),

                fill: new Fill({
                  color: "#FFBE4D"
                }),

                geometry: function(feature) {
                  var a_;
                  var b_;
                  var d_;
                  var c_;
                  var a = feature.getGeometry().getCoordinates()[0][0];
                  var b = feature.getGeometry().getCoordinates()[0][1];
                  var c = feature.getGeometry().getCoordinates()[0][2];
                  var d = feature.getGeometry().getCoordinates()[0][3];
                  var size = (1 / resolution) * window.devicePixelRatio;

                  if (side === "a" && size >= 20 * window.devicePixelRatio) {
                    c_ = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
                    d_ = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2];
                    return new Polygon([[a, b, c_, d_, a]]);
                  } else if (side === "b" && size >= 20 * window.devicePixelRatio) {
                    b_ = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
                    a_ = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2];
                    return new Polygon([[a_, b_, c, d, a_]]);
                  } else {
                    return new Polygon([[a, b, c, d, a]]);
                  }
                }
              }));

              var mapResolution = (1 / resolution) * window.devicePixelRatio;
              // おそらく地図の表示段階によって、アイコンを表示するかどうかの判定
              if (mapResolution >= 1) {
                // 旗と、レサ太郎の切り替え判定
                if (mapResolution > (20 * window.devicePixelRatio)) {
                  url = this.targetImageUrl;
                  message = this.targetMessage;
                  var imageScale = 0.3;
                } else {
                  url = this.targetImageUrl2;
                  message = this.targetMessage2;
                  var imageScale = 0.28;
                }

                styles.push(new Style({
                  text: new Text({
                    textAlign: "left",
                    textBaseline: "hanging",
                    font: "Arial bold",
                    text: message,

                    fill: new Fill({
                      color: "#D95C02"
                    }),

                    stroke: new Stroke({
                      color: [255, 255, 255, 1],
                      width: 3
                    }),

                    scale: 2,
                    offsetX: 25,
                    offsetY: -40,
                    rotation: 0
                  }),

                  image: new Icon({
                    anchor: [0.5, 1],
                    scale: imageScale,
                    anchorXUnits: "fraction",
                    anchorYUnits: "fraction",
                    opacity: 1,
                    src: url
                  }),

                  geometry: function(feature) {
                    var abcd;
                    var cd;
                    var ab;
                    var diff_ad;
                    var a = feature.getGeometry().getCoordinates()[0][0];
                    var b = feature.getGeometry().getCoordinates()[0][1];
                    var c = feature.getGeometry().getCoordinates()[0][2];
                    var d = feature.getGeometry().getCoordinates()[0][3];
                    size = (1 / resolution) * window.devicePixelRatio;

                    if (side === "a" && size >= 20 * window.devicePixelRatio) {
                      diff_ad = [(d[0] - a[0]) / 2, (d[1] - a[1]) / 2];
                      ab = [(a[0] + b[0]) / 2 - diff_ad[0] * 2, (a[1] + b[1]) / 2 - diff_ad[1] * 2];
                      return new Point(ab);
                    } else if (side === "b" && size >= 20 * window.devicePixelRatio) {
                      diff_ad = [(d[0] - a[0]) / 2, (d[1] - a[1]) / 2];
                      cd = [(c[0] + d[0]) / 2 + diff_ad[0] * 1.5, (c[1] + d[1]) / 2 + diff_ad[1] * 1.5];
                      return new Point(cd);
                    } else {
                      abcd = [(a[0] + b[0] + c[0] + d[0]) / 4, (a[1] + b[1] + c[1] + d[1]) / 4];
                      return new Point(abcd);
                    }
                  },

                  zIndex: 9999
                }));
              }
            }
          } else {
            // consoe.log(resolution)
            if (resolution < 0.28 && feature.get("label") != null) {
              styles.push(new Style({
                text: new Text({
                  textAlign: "center",
                  textBaseline: "hanging",
                  font: "Arial",
                  text: feature.get("label"),
                  overflow: true,
                  fill: new Fill({
                    color: [0, 0, 0, 1]
                  }),
  
                  stroke: new Stroke({
                    color: [255, 255, 255, 1],
                    width: 1.5
                  }),
  
                  scale: 1.5,
                  offsetX: 0,
                  offsetY: 0,
                  rotation: 0
                })
              }));
            }
          }
      } else if (feature.get("type") === "beacon") {
          if (this.debug_ === true) {
            styles.push(new Style({
              image: new CircleStyle({
                radius: 5,
                fill: null,

                stroke: new Stroke({
                  color: "#000000"
                })
              }),

              text: new Text({
                textAlign: "left",
                textBaseline: "middle",
                font: "Arial 12px",
                text: feature.get("minor") + " (" + feature.get("lane") + ")",

                fill: new Fill({
                  color: [0, 0, 0, 1]
                }),

                stroke: new Stroke({
                  color: [255, 255, 255, 1],
                  width: 1.5
                }),

                scale: 1,
                offsetX: 8,
                offsetY: 0,
                rotation: 0
              })
            }));
          }
      }
      return styles;
    };

    preThis.vector = new VectorLayer({
      source: null,
      style: styleFunction,
      opacity: 1
    });

    options_.layers = [preThis.tileB, preThis.tileA, preThis.vector];
    super(options_);
    this.tileA = preThis.tileA;  // @nodoc 前面タイル (メインで使用する)
    this.tileB = preThis.tileB;  // @nodoc 背面タイル (切り替えの際に一時的に使用する)
    this.vector = preThis.vector;  // @nodoc ベクターレイヤー
    this.floorId = false;  // @property [String] 現在のフロアID（読み込み専用）
    this.debug_ = false;  // @nodoc デバッグ表示の有無(内部ステート)
    this.fadeAnimation = null;  // @nodoc アニメーション用の内部ステート
    this.targetMessage = "ここ!";  // @property [String] 目的地メッセージ 'ここ!'
    this.targetMessage2 = "目的地";  // @property [String] 目的地メッセージ '目的地'
    this.targetShelves = [];
    this.targetPosition = null;
    this.targetImageUrl = preThis.targetImageUrl;
    this.targetImageUrl2 = preThis.targetImageUrl2;
    this.vector.on("postcompose", this.postcompose_.bind(this));
    this.tileA.on("precompose", this.precompose_.bind(this));

    if (options_.kFloor != null) {
      this.setFloorId(options_.kFloor, false);
    }
  }

  /**
   * フロアを変更する
   * @param newId {String} フロアID
   * @param animation
   * @returns {*|{min, max}}
   */
  setFloorId(newId, animation = true) {
    var newSource;

    if (this.floorId !== newId) {
      this.floorId = newId;

      if (animation) {
        this.tileB.setSource(this.tileA.getSource());
        this.tileB.setOpacity(1);
        this.tileB.setVisible(true);
        this.tileA.setOpacity(0);
        this.vector.setOpacity(0);
      } else {
        this.tileA.setOpacity(1);
        this.tileB.setVisible(false);
        this.tileB.setSource(null);
        this.vector.setOpacity(1);
      }

      if (typeof newId !== "undefined" && newId !== null) {
        newSource = this.getHaikaTileSource_(newId);
        this.tileA.setSource(newSource);
        this.vector.setSource(this.getHaikaVectorSource_(newId));
      } else {
        newSource = this.getHaikaTileSource_(0);
        this.tileA.setSource(newSource);
        this.vector.setSource(null);
      }

      if (animation) {
        this.fadeAnimation = {
          start: new Date(),
          phase: 0,
          tilesStarted: 0,
          tilesLoaded: 0
        };

        if (!(typeof newId !== "undefined" && newId !== null)) {
          this.fadeAnimation.phase = 2;
        } else {
          newSource.on("tileloadstart", () => {
            if (this.fadeAnimation != null) {
              return this.fadeAnimation.tilesStarted++;
            }
          });

          newSource.on("tileloadend", () => {
            if (this.fadeAnimation != null) {
              return this.fadeAnimation.tilesLoaded++;
            }
          });

          newSource.on("tileloaderror", () => {
            if (this.fadeAnimation != null) {
              return this.fadeAnimation.tilesLoaded++;
            }
          });
        }
      }

      return this.changed();
    }
  }

  /**
   * デバッグ表示の有無を設定する
   * @param newValue {Boolean} する:true, しない: false
   * @returns {*|{min, max}}
   */
  showDebugInfomation(newValue) {
    this.debug_ = newValue;
    return this.changed();
  }

  /**
   * @nodoc マップ描画処理
   * @private
   */
  precompose_(event) {
    var time;
    var frameState = event.frameState;

    if (this.fadeAnimation != null) {
      frameState.animate = true;

      if (this.fadeAnimation.phase === 0) {
        if (frameState.time - this.fadeAnimation.start > 2000) {
          this.fadeAnimation.phase = 1;
          return this.fadeAnimation.start = new Date();
        } else if (this.fadeAnimation.tilesStarted > 0 && this.fadeAnimation.tilesLoaded > 0) {
          this.fadeAnimation.phase = 1;

          if (frameState.time - this.fadeAnimation.start > 50) {
            return this.fadeAnimation.start = new Date();
          }
        }
      } else if (this.fadeAnimation.phase === 1) {
        time = (frameState.time - this.fadeAnimation.start) / 200;

        if (time <= 1) {
          return this.tileA.setOpacity(time);
        } else {
          this.tileA.setOpacity(1);
          this.fadeAnimation.phase = 2;
          return this.fadeAnimation.start = new Date();
        }
      } else if (this.fadeAnimation.phase === 2) {
        time = (frameState.time - this.fadeAnimation.start) / 150;

        if (time <= 1) {
          this.tileB.setOpacity(1 - time);
          return this.vector.setOpacity(time);
        } else {
          this.vector.setOpacity(1);
          this.tileB.setVisible(false);
          this.tileB.setSource(null);
          return this.fadeAnimation = null;
        }
      }
    }
  }

  /**
   * @nodoc マップ描画処理
   * @private
   */
  postcompose_(event) {
    var debugText;
    var context;

    if (this.debug_) {
      context = event.context;
      debugText = "[Kanilayer]";

      if (this.fadeAnimation) {
        debugText += " アニメーション中 フェーズ:";
        debugText += this.fadeAnimation.phase;
      }

      context.save();
      context.fillStyle = "rgba(255, 255, 255, 0.6)";
      context.fillRect(0, context.canvas.height - 20, context.canvas.width, 20);
      context.font = "10px";
      context.fillStyle = "black";
      context.fillText(debugText, 10, context.canvas.height - 7);
      return context.restore();
    }
  }
}
