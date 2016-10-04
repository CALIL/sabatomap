import Kanikama from './libs/kanikama.js';
import Kanimarker from './libs/kanimarker.js';
import Kanilayer from './libs/kanilayer.js';
import InitUI from './searchReact.jsx';

var MAPBOX_TOKEN = "pk.eyJ1IjoiY2FsaWxqcCIsImEiOiJxZmNyWmdFIn0.hgdNoXE7D6i7SrEo6niG0w";

var SABAE_TILE_EXTENT = ol.proj.transformExtent([
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

var fitRotation = function(r) {
  var virtualAngle;
  var n;

  if (typeof r === "undefined") {
    r = (180 - homeAngle) * Math.PI / 180;
  }

  var oldAngle = (map.getView().getRotation() * 180 / Math.PI) % 360;

  if (oldAngle < 0) {
    oldAngle += 360;
  }

  var newAngle = (r * 180 / Math.PI) % 360;

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

  map.beforeRender(ol.animation.rotate({
    duration: 400,
    rotation: oldAngle * Math.PI / 180
  }));

  return map.getView().setRotation(virtualAngle * Math.PI / 180);
};

var fitFloor = function() {
  var zoom;
  var pan;
  var c1 = ol.proj.transform(map.getView().getCenter(), map.getView().getProjection(), "EPSG:4326");

  var c2 = [
    (homeBoundingBox[0] + homeBoundingBox[2]) / 2,
    (homeBoundingBox[1] + homeBoundingBox[3]) / 2
  ];

  var distance = new ol.Sphere(6378137).haversineDistance(c1, c2);

  if (distance <= 200) {
    fitRotation();

    pan = ol.animation.pan({
      easing: ol.easing.elastic,
      duration: 800,
      source: map.getView().getCenter()
    });

    map.beforeRender(pan);

    zoom = ol.animation.zoom({
      easing: ol.easing.elastic,
      duration: 800,
      resolution: map.getView().getResolution()
    });

    map.beforeRender(zoom);
  } else {
    map.getView().setRotation((180 - homeAngle) * Math.PI / 180);
  }

  return map.getView().fit(
    ol.proj.transformExtent(homeBoundingBox, "EPSG:4326", "EPSG:3857"),
    map.getSize()
  );
};

var unloadFacility = function() {
  kanilayer.setFloorId(null);
  homeBoundingBox = null;
  homeAngle = 0;
  kanimarker.setPosition(null);

  return UI.setState({
    systemid: null,
    floors: []
  });
};

var loadFacility = function(id) {
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
              ol.proj.transformExtent(homeBoundingBox, "EPSG:4326", "EPSG:3857"),
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

var loadFloor = function(id) {
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

var didRangeBeaconsInRegion = function(beacons) {
  return kanikama.push(beacons);
};

var initializeApp = function() {
  var region;
  var delegate;
  var locationManager;
  var ref;
  var compassSuccess;
  var body;
  var rules = __RULES__;

  UI = InitUI({
    facilities: rules
  }, document.getElementById("ui"));

  if (typeof cordova !== "undefined" && cordova !== null) {
    if (device.platform === "iOS") {
      body = document.getElementsByTagName("body");
      body[0].classList.add("ios");
    }

    if (device.platform === "Android") {
      kanikama.setTimeout(5000);
    }

    if (cordova.plugins.BluetoothStatus != null) {
      cordova.plugins.BluetoothStatus.initPlugin();
    }

    window.open = cordova.InAppBrowser.open;

    if (navigator.compass != null) {
      compassSuccess = function(heading) {
        var headingDifference = 7.38;
        heading = heading.magneticHeading + headingDifference;

        switch (device.platform) {
        case "iOS":
          heading += window.orientation;
          break;
        case "Android":
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

      delegate.didRangeBeaconsInRegion = function(
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

      document.addEventListener("online", function() {
        return UI.setState({
          offline: false
        });
      });
    }
  }

  FastClick.attach(document.body);

  var osm = new ol.layer.Tile({
    source: new ol.source.XYZ({
      url: "https://api.tiles.mapbox.com/v4/caliljp.ihofg5ie/{z}/{x}/{y}.png?access_token=" + MAPBOX_TOKEN,
      maxZoom: 22
    }),

    minResolution: 0.1,
    visible: false,
    maxResolution: 2000000,
    preload: 3
  });

  document.getElementById("map").classList.add("visible");

  map = new ol.Map({
    layers: [osm, kanilayer],
    controls: [],
    target: "map",
    logo: false,

    view: new ol.View({
      center: [15139450.747885207, 4163881.1440642904],
      zoom: 6,
      minResolution: 0.001
    })
  });

  setTimeout((function() {
    return osm.setVisible(true);
  }), 500);

  kanimarker = new Kanimarker(map);
  kanimarker.on("change:mode", invalidateLocator);

  kanikama.on("change:floor", function(floor) {
    return loadFloor(floor.id);
  });

  kanikama.on("change:position", function(p) {
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
        ol.proj.transform([p.latitude, p.longitude], "EPSG:4326", "EPSG:3857"),
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

  var invalidateCompass = function() {
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

  document.getElementById("compass").addEventListener("click", function() {
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

var navigateShelf = function(floorId, shelves) {
  if (typeof floorId !== "undefined" && floorId !== null) {
    if (floorId !== kanilayer.floorId) {
      loadFloor(floorId);
    }
  }

  kanilayer.setTargetShelves(shelves);

  if (shelves.length > 0) {
    return map.getView().fit(
      ol.proj.transformExtent(homeBoundingBox, "EPSG:4326", "EPSG:3857"),
      map.getSize()
    );
  }
};

var invalidateLocator = function() {
  if (!(typeof cordova !== "undefined" && cordova !== null) || !(cordova.plugins.BluetoothStatus != null) || !cordova.plugins.BluetoothStatus.hasBTLE || !cordova.plugins.BluetoothStatus.BTenabled) {
    kanimarker.setMode("normal");
    return UI.setMode("disabled");
  } else if (waitingPosition) {
    return UI.setMode("waiting");
  } else {
    return UI.setMode(kanimarker.mode);
  }
};

var waitPosition = function() {
  waitingPosition++;
  invalidateLocator();

  return setTimeout(function() {
    if (waitingPosition > 0) {
      waitingPosition--;
    }

    if (waitingPosition === 0) {
      if (kanikama.currentPosition === null) {
        UI.notify("現在地を取得できませんでした");
      }

      return invalidateLocator();
    }
  }, 4000);
};

var locatorClicked = function() {
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
    } else if (!cordova.plugins.BluetoothStatus.BTenabled) {
      if (device.platform === "Android") {
        return cordova.plugins.BluetoothStatus.promptForBT();
      } else {
        return UI.notify("BluetoothをONにしてください");
      }
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
}

window.app = new App();
