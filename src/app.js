import {transform, transformExtent} from 'ol/proj';
import {easeOut} from 'ol/easing';
import Map from 'ol/Map';
import {getDistance} from 'ol/sphere';
import View from 'ol/View';
import XYZ from 'ol/source/XYZ';
import Tile from 'ol/layer/Tile';

import Kanikama from './libs/kanikama.js';
import Kanimarker from './libs/kanimarker.js';
import Kanilayer from './libs/kanilayer.js';
import InitUI from './component/App.jsx';
import rules from './sabae.json';

var MAPBOX_TOKEN = "pk.eyJ1IjoiY2FsaWxqcCIsImEiOiJxZmNyWmdFIn0.hgdNoXE7D6i7SrEo6niG0w";

var SABAE_TILE_EXTENT = transformExtent([
  136.18617217725753,
  35.961639755749225,
  136.18697793129988,
  35.96227957363341
], "EPSG:4326", "EPSG:3857");

var homeBoundingBox = null;
var homeAngle = 0;
var waitingPosition = 0;
var UI = null;
var map = null;
var kanimarker = null;

var kanilayer = new Kanilayer({
  targetImageUrl: "img/flag.png",
  targetImageUrl2: "img/flag2.png",
  extent: SABAE_TILE_EXTENT
});

var kanikama = new Kanikama();

let fitRotation = function (r) {
  let virtualAngle;
  let n;
  if (typeof r === "undefined") {
    r = (180 - homeAngle) * Math.PI / 180;
  }
  let oldAngle = (map.getView().getRotation() * 180 / Math.PI) % 360;
  if (oldAngle < 0) {
    oldAngle += 360;
  }
  let newAngle = (r * 180 / Math.PI) % 360;
  if (newAngle > oldAngle) {
    n = newAngle - oldAngle;
    if (n <= 180) {
      virtualAngle = oldAngle + n;
    } else {
      virtualAngle = oldAngle - (360 - n);
    }
  } else {
    n = oldAngle - newAngle;
    if (n <= 180) {
      virtualAngle = oldAngle - n;
    } else {
      virtualAngle = oldAngle + (360 - n);
    }
  }
  let view = map.getView();
  let target = virtualAngle * Math.PI / 180;

  // View に rotation という公開プロパティは無い。ol 3 のころから getRotation() で、
  // ここは undefined と度数を比べていたので条件が常に真になり、
  // 向きが合っていても毎回 400ms のアニメーションが走っていた
  //
  // 単位もずれていた。virtualAngle は度、getRotation() はラジアン。
  // 浮動小数の丸めで厳密には一致しないので、0.01 度ぶんの幅で見る
  if (Math.abs(view.getRotation() - target) > 0.0002) {
    view.animate({rotation: target, duration: 400, easing: easeOut});
  }
};

var fitFloor = function () {
  let c1 = transform(map.getView().getCenter(), map.getView().getProjection(), "EPSG:4326");
  let c2 = [
    (homeBoundingBox[0] + homeBoundingBox[2]) / 2,
    (homeBoundingBox[1] + homeBoundingBox[3]) / 2
  ];
  let distance = getDistance(c1, c2);
  let _duration;
  if (distance <= 200) {
    fitRotation();
    _duration = 600;
  } else {
    map.getView().setRotation((180 - homeAngle) * Math.PI / 180);
    _duration = 0;
  }
  // easing は渡さない。OpenLayers 5 の既定（inAndOut）が使われる。
  // 以前は elastic を渡していたが ol/easing に elastic は存在せず（ol 5.3.3 に0件）、
  // browserify の ESM interop が undefined を黙って通していたため
  // 実際には View.js の `options.easing || inAndOut` で既定が効いていた。
  // esbuild は存在しない export をエラーにするのでここで気づいた。
  return map.getView().fit(transformExtent(homeBoundingBox, "EPSG:4326", "EPSG:3857"), {
    duration: _duration,
    constrainResolution: false
  });
};

var unloadFacility = function () {
  kanilayer.setFloorId(null);
  homeBoundingBox = null;
  homeAngle = 0;
  kanimarker.setPosition(null);

  return UI.setState({
    systemid: null,
    floors: []
  });
};

var loadFacility = function (id) {
  return (() => {
    for (var facility of kanikama.facilities_) {
      if (facility.id === id) {
        for (var floor of facility.floors) {
          if (floor.id === facility.entrance) {
            homeBoundingBox = floor.bbox;
            homeAngle = floor.angle;
            kanilayer.setTargetShelves([]);
            UI.setFacility(facility);
            map.getView().setRotation((180 - homeAngle) * Math.PI / 180);

            map.getView().fit(
              transformExtent(homeBoundingBox, "EPSG:4326", "EPSG:3857"),
              map.getSize()
            );

            loadFloor(floor.id);
            return;
          }
        }
      }
    }
  })();
};

var loadFloor = function (id) {
  if (kanilayer.floorId !== id) {
    for (var facility of kanikama.facilities_) {
      for (var floor of facility.floors) {
        if (floor.id === id) {
          homeBoundingBox = floor.bbox;
          homeAngle = floor.angle;
          break;
        }
      }
    }

    kanimarker.setPosition(null);
    kanilayer.setFloorId(id);
    UI.setFloorId(id);
  }

  return setTimeout(fitFloor, 100);
};

var didRangeBeaconsInRegion = function (beacons) {
  return kanikama.push(beacons);
};

var initializeApp = function () {
  var region;
  var delegate;
  var locationManager;
  var ref;
  var compassSuccess;
  var body;

  UI = InitUI({
    facilities: rules
  }, document.getElementById("ui"));

  if (typeof cordova !== "undefined" && cordova !== null && cordova.platformId !== "browser") {
    if (cordova.platformId === "ios") {
      body = document.getElementsByTagName("body");
      body[0].classList.add("ios");
    }

    if (cordova.platformId === "android") {
      kanikama.setTimeout(5000);
    }

    if (cordova.plugins.BluetoothStatus != null) {
      cordova.plugins.BluetoothStatus.initPlugin();
    }

    if (navigator.compass != null) {
      compassSuccess = function (heading) {
        var headingDifference = 7.38;
        heading = heading.magneticHeading + headingDifference;

        switch (cordova.platformId) {
          case "ios":
            heading += window.orientation;
            break;
          case "android":
            heading += screen.orientation.angle;
        }

        if (heading < 0) {
          heading += 360;
        }

        heading %= 360;
        kanikama.heading = heading;
        return kanimarker.setHeading(parseInt(heading));
      };

      navigator.compass.watchHeading(compassSuccess, null, {
        frequency: 100
      });
    }

    if ((((ref = cordova.plugins) != null ? ref.locationManager : void 0)) != null) {
      locationManager = cordova.plugins.locationManager;
      locationManager.requestWhenInUseAuthorization();
      delegate = new locationManager.Delegate();

      delegate.didRangeBeaconsInRegion = function (
        {
          beacons
        }) {
        return didRangeBeaconsInRegion.apply(window, [beacons]);
      };

      locationManager.setDelegate(delegate);
      region = new locationManager.BeaconRegion("sabatomap", "00000000-71C7-1001-B000-001C4D532518");
      locationManager.startRangingBeaconsInRegion(region).fail(console.error);
    }

    if (navigator.splashscreen != null) {
      setTimeout(navigator.splashscreen.hide, 2000);
    }

    if (navigator.connection != null && navigator.connection.type === "none") {
      UI.setState({
        offline: true
      });

      document.addEventListener("online", function () {
        return UI.setState({
          offline: false
        });
      });
    }
  }

  var osm = new Tile({
    source: new XYZ({
      url: "https://api.mapbox.com/styles/v1/caliljp/ckcconbmi0enu1job3l0ucbje/tiles/{z}/{x}/{y}?access_token=" + MAPBOX_TOKEN,
      maxZoom: 22
    }),

    minResolution: 0.1,
    visible: false,
    maxResolution: 2000000,
    preload: 3
  });

  document.getElementById("map").classList.add("visible");

  map = new Map({
    layers: [osm, kanilayer],
    controls: [],
    target: "map",

    view: new View({
      center: [15139450.747885207, 4163881.1440642904],
      zoom: 6,
      minResolution: 0.001
    })
  });

  setTimeout((function () {
    return osm.setVisible(true);
  }), 500);

  kanimarker = new Kanimarker(map);
  kanimarker.on("change:mode", invalidateLocator);

  kanikama.on("change:floor", function (floor) {
    return loadFloor(floor.id);
  });

  kanikama.on("change:position", function (p) {
    if (waitingPosition && kanikama.currentFloor.id !== kanilayer.floorId) {
      loadFloor(kanikama.currentFloor.id);
    }

    if (kanikama.currentFloor.id === kanilayer.floorId && p !== null) {
      if (p.accuracy >= 6) {
        kanimarker.moveDuration = 10000;
      } else {
        kanimarker.moveDuration = 2000;
      }

      if (kanimarker.accuracy != null && Math.abs(kanimarker.accuracy - p.accuracy) > 3) {
        kanimarker.accuracyDuration = 8000;
      } else {
        kanimarker.accuracyDuration = 2500;
      }

      kanimarker.setPosition(
        transform([p.latitude, p.longitude], "EPSG:4326", "EPSG:3857"),
        p.accuracy
      );

      if (waitingPosition) {
        waitingPosition = 0;
        return kanimarker.setMode("centered");
      }
    } else {
      return kanimarker.setPosition(null);
    }
  });

  var invalidateCompass = function () {
    var view_ = map.getView();
    var mapSize = Math.min(map.getSize()[0], map.getSize()[1]);
    var pixelPerMeter = (1 / view_.getResolution()) * window.devicePixelRatio;
    var deg = (view_.getRotation() * 180 / Math.PI) % 360;

    if (deg < 0) {
      deg += 360;
    }

    var cls = document.getElementById("compass");

    if (deg === 0 || 500 * pixelPerMeter >= mapSize) {
      return cls.className = "hidden";
    } else {
      cls.style.transform = ("rotate(" + (deg) + "deg)");
      return cls.className = "";
    }
  };

  document.getElementById("compass").addEventListener("click", function () {
    kanimarker.setMode("normal");
    return fitRotation(0);
  });

  map.getView().on("change:rotation", invalidateCompass);
  map.getView().on("change:resolution", invalidateCompass);
  window.addEventListener("BluetoothStatus.enabled", invalidateLocator);
  window.addEventListener("BluetoothStatus.disabled", invalidateLocator);
  kanikama.facilities_ = rules;
  return loadFacility("7");
};

var navigateShelf = function (floorId, shelves) {
  if (typeof floorId !== "undefined" && floorId !== null) {
    if (floorId !== kanilayer.floorId) {
      loadFloor(floorId);
    }
  }

  kanilayer.setTargetShelves(shelves);

  if (shelves.length > 0) {
    // 第2引数はオプションオブジェクト。ol 4 までは size を直接渡す形だったが
    // ol 5 で変わっており、配列を渡しても無視されていた
    //
    // ol 5 の fit は既定でズームレベルへ丸めていた（実測 19.404 → 19）。
    // ol 6 からは View の constrainResolution（既定 false）に従うので
    // 丸めずぴったり合わせる。棚へ移動したときに一段引かなくなり、
    // 配架図のラベルが出るようになった
    return map.getView().fit(
      transformExtent(homeBoundingBox, "EPSG:4326", "EPSG:3857"),
      {size: map.getSize()}
    );
  }
};

/**
 * Bluetooth が有効かどうかを信用してよいか
 *
 * Android 12（API 31）から BluetoothAdapter.isEnabled() には BLUETOOTH_CONNECT が
 * 要る。cordova-plugin-bluetooth-status は 2016年で止まっていて BLUETOOTH と
 * BLUETOOTH_ADMIN しか宣言しておらず、どちらも targetSdk 31 以上では無視される。
 *
 * 例外を投げても false を返しても BTenabled は BluetoothStatus.js の初期値
 * false のままになるので、「オフ」と「分からない」を区別できない。
 * そのまま使うと現在地ボタンが永久に「測定できません」になる。
 *
 * 読み取るだけのために BLUETOOTH_CONNECT（実行時許可）を要求するのは割に合わないので、
 * Android では判定をあきらめて、測位そのものの結果で案内する。
 * iOS は CoreBluetooth で権限の分割が無いのでこれまで通り信用してよい。
 */
var canTrustBluetoothState = function () {
  return typeof cordova !== "undefined" && cordova !== null && cordova.platformId !== "android";
};

/** 現在地の測定ができる見込みがあるか */
var canLocate = function () {
  if (!(typeof cordova !== "undefined" && cordova !== null) || !(cordova.plugins.BluetoothStatus != null)) {
    return false;
  }

  // hasBTLE は hasSystemFeature(FEATURE_BLUETOOTH_LE) 由来で権限が要らないため、
  // どの Android でも当てにできる
  if (!cordova.plugins.BluetoothStatus.hasBTLE) {
    return false;
  }

  return !canTrustBluetoothState() || cordova.plugins.BluetoothStatus.BTenabled;
};

var invalidateLocator = function () {
  if (!canLocate()) {
    kanimarker.setMode("normal");
    return UI.setMode("disabled");
  } else if (waitingPosition) {
    return UI.setMode("waiting");
  } else {
    return UI.setMode(kanimarker.mode);
  }
};

var waitPosition = function () {
  waitingPosition++;
  invalidateLocator();

  return setTimeout(function () {
    if (waitingPosition > 0) {
      waitingPosition--;
    }

    if (waitingPosition === 0) {
      if (kanikama.currentPosition === null) {
        // Bluetooth の状態を先に確かめられない環境では、ここでしか伝えられない
        UI.notify(canTrustBluetoothState()
          ? "現在地を取得できませんでした"
          : "現在地を取得できませんでした。BluetoothがONか確かめてください");
      }
      if (kanikama.currentPosition && kanikama.accuracy > 10) {
        UI.notify("棚の中に入ると正確な位置がわかります");
      }

      return invalidateLocator();
    }
  }, 4000);
};

var locatorClicked = function () {
  switch (kanimarker.mode) {
    case "headingup":
      kanimarker.setMode("centered");
      return fitRotation();
    case "centered":
      return kanimarker.setMode("headingup");
    case "normal":
      if (!(typeof cordova !== "undefined" && cordova !== null) || !(cordova.plugins.BluetoothStatus != null) || !cordova.plugins.BluetoothStatus.hasBTLE) {
        UI.notify("この機種は現在地を測定できません");
        return fitFloor();
      } else if (canTrustBluetoothState() && !cordova.plugins.BluetoothStatus.BTenabled) {
        return UI.notify("BluetoothをONにしてください");
      } else if (kanikama.currentPosition === null) {
        return waitPosition();
      } else if (kanikama.currentFloor.id !== kanilayer.floorId) {
        loadFloor(kanikama.currentFloor.id);
        return waitPosition();
      } else {
        return kanimarker.setMode("centered");
      }
  }
};

export default class App {
  constructor() {
    this.initializeApp = this.initializeApp.bind(this);
    this.loadFacility = this.loadFacility.bind(this);
    this.loadFloor = this.loadFloor.bind(this);
    this.navigateShelf = this.navigateShelf.bind(this);
    this.locatorClicked = this.locatorClicked.bind(this);
    this.getUI = this.getUI.bind(this);
    this.pushBeacons = this.pushBeacons.bind(this);
    this.getMap = this.getMap.bind(this);
    this.getMarker = this.getMarker.bind(this);
  }

  initializeApp() {
    return initializeApp();
  }

  loadFacility(id) {
    return loadFacility(id);
  }

  loadFloor(id) {
    return loadFloor(id);
  }

  navigateShelf(floorId, shelves) {
    return navigateShelf(floorId, shelves);
  }

  locatorClicked() {
    return locatorClicked();
  }

  getUI() {
    return UI;
  }

  /*
   ここから下は地図の中身を外から掴むための入口。

   iBeacon も端末のコンパスもブラウザには無いので、測位から先を動かすには
   外から差し込むしかない。test/e2e はここを使って
   「ビーコンを受け取った」状態を作り、描画を撮る。手で調べるときにも使える。
   */

  /**
   * ビーコンの測定値を流し込む
   *
   * 本番で cordova のプラグインが呼ぶ delegate.didRangeBeaconsInRegion と同じ入口。
   * ここを通すと kanikama のフロア判定と kanimarker の位置更新まで一続きで動く。
   *
   * @param beacons {Array} [{uuid, major, minor, rssi}, ...]
   */
  pushBeacons(beacons) {
    return didRangeBeaconsInRegion(beacons);
  }

  /**
   * OpenLayers の Map を返す
   *
   * View の状態を固定したり rendercomplete を待ったりするのに使う。
   * initializeApp より前は null。
   */
  getMap() {
    return map;
  }

  /**
   * 現在地マーカー（Kanimarker）を返す
   *
   * 撮影前に cancelAnimation() を呼んで描画を止めるのに使う。
   * initializeApp より前は null。
   */
  getMarker() {
    return kanimarker;
  }
}

window.app = new App();
