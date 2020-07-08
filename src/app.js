import {transform, transformExtent} from 'ol/proj';
import {easeOut, elastic} from 'ol/easing';
import Map from 'ol/Map';
import {getDistance} from 'ol/sphere';
import View from 'ol/view';
import XYZ from 'ol/source/xyz';
import Tile from 'ol/layer/tile';

import Kanikama from './libs/kanikama.js';
import Kanimarker from './libs/kanimarker.js';
import Kanilayer from './libs/kanilayer.js';
import InitUI from './component/App.jsx';

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
  let view =  map.getView();
  console.log(virtualAngle,view.rotation);
  if(view.rotation !== virtualAngle){
      view.animate({rotation: virtualAngle * Math.PI / 180, duration: 400, easing: easeOut});
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
  return map.getView().fit(transformExtent(homeBoundingBox, "EPSG:4326", "EPSG:3857"), {
    duration: _duration,
    constrainResolution: false,
    easing: elastic
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
  var rules = [
    {
      "id": "7",
      "name": "鯖江市図書館",
      "libid": 100622,
      "short": "鯖江市図書館 (SR)",
      "systemid": "Fukui_Sabae",
      "entrance": "7",
      "beacons": [
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 1
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 2
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 3
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 4
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 5
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 6
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 7
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 8
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 9
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 10
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 11
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 12
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 13
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 14
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 15
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 16
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 17
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 18
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 19
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 20
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 21
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 22
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 23
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 24
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 25
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 26
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 27
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 28
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 29
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 30
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 31
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 32
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 33
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 34
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 35
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 36
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 37
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 38
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 39
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 40
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 41
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 42
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 43
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 44
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 45
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 46
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 47
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 48
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 49
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 50
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 51
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 52
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 53
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 54
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 55
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 56
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 57
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 58
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 59
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 60
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 61
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 62
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 63
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 64
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 65
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 66
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 67
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 68
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 69
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 70
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 71
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 72
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 73
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 74
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 75
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 76
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 77
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 78
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 79
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 80
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 81
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 82
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 83
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 84
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 85
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 86
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 87
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 88
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 89
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 90
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 91
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 92
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 93
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 94
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 95
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 96
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 97
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 98
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 99
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 100
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 101
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 102
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 103
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 104
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 105
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 106
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 107
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 108
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 109
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 110
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 111
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 112
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 113
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 114
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 115
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 116
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 117
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 118
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 119
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 120
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 121
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 122
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 123
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 124
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 125
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 126
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 127
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 128
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 129
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 130
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 131
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 132
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 133
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 134
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 135
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 136
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 137
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 138
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 139
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 140
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 141
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 142
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 143
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 144
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 145
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 146
        },
        {
          "uuid": "00000000-71C7-1001-B000-001C4D532518",
          "major": 105,
          "minor": 147
        }
      ],
      "floors": [
        {
          "id": "7",
          "label": "1",
          "bbox": [
            136.1861727897373,
            35.96163959200056,
            136.18697804145978,
            35.962279113149016
          ],
          "angle": 2.5,
          "beacons": [
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 1,
              "latitude": 136.18638732106814,
              "longitude": 35.96181653926824
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 2,
              "latitude": 136.18641004628117,
              "longitude": 35.9618156462528
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 3,
              "latitude": 136.18643200502703,
              "longitude": 35.96181496015777
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 4,
              "latitude": 136.18645278986847,
              "longitude": 35.96181413571413
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 5,
              "latitude": 136.1864736807471,
              "longitude": 35.961813217606256
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 6,
              "latitude": 136.18649558647337,
              "longitude": 35.96181257834334
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 7,
              "latitude": 136.18651775487186,
              "longitude": 35.961811660046926
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 8,
              "latitude": 136.18653859515052,
              "longitude": 35.961810833644094
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 9,
              "latitude": 136.18655994164337,
              "longitude": 35.96181012422727
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 10,
              "latitude": 136.18658300674903,
              "longitude": 35.96180935407544
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 11,
              "latitude": 136.18660594887302,
              "longitude": 35.96180836347738
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 12,
              "latitude": 136.18662703027113,
              "longitude": 35.96180788822115
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 13,
              "latitude": 136.18664930228374,
              "longitude": 35.96180683138758
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 14,
              "latitude": 136.1866731362736,
              "longitude": 35.961805899188256
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 15,
              "latitude": 136.18669697026348,
              "longitude": 35.961804966988936
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 16,
              "latitude": 136.1863645958551,
              "longitude": 35.96181743228368
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 17,
              "latitude": 136.18638732106814,
              "longitude": 35.96181653926824
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 18,
              "latitude": 136.18641004628117,
              "longitude": 35.9618156462528
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 19,
              "latitude": 136.18643200502703,
              "longitude": 35.96181496015777
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 20,
              "latitude": 136.18645278986847,
              "longitude": 35.96181413571413
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 21,
              "latitude": 136.1864736807471,
              "longitude": 35.961813217606256
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 22,
              "latitude": 136.18649558647337,
              "longitude": 35.96181257834334
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 23,
              "latitude": 136.18651775487186,
              "longitude": 35.961811660046926
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 24,
              "latitude": 136.18653859515052,
              "longitude": 35.961810833644094
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 25,
              "latitude": 136.18655994164337,
              "longitude": 35.96181012422727
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 26,
              "latitude": 136.18658300674903,
              "longitude": 35.96180935407544
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 27,
              "latitude": 136.18660594887302,
              "longitude": 35.96180836347738
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 28,
              "latitude": 136.18662703027113,
              "longitude": 35.96180788822115
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 29,
              "latitude": 136.18664930228374,
              "longitude": 35.96180683138758
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 30,
              "latitude": 136.1866731362736,
              "longitude": 35.961805899188256
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 31,
              "latitude": 136.18630578213975,
              "longitude": 35.96186289564538
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 32,
              "latitude": 136.1863093982123,
              "longitude": 35.96192993579218
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 33,
              "latitude": 136.18624939353526,
              "longitude": 35.961974946694816
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 34,
              "latitude": 136.18627489493238,
              "longitude": 35.96194931833726
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 41,
              "latitude": 136.1865917918578,
              "longitude": 35.96200825456856
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 42,
              "latitude": 136.18667132039457,
              "longitude": 35.96206775650696
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 43,
              "latitude": 136.18681269711863,
              "longitude": 35.96194344055807
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 44,
              "latitude": 136.186812900094,
              "longitude": 35.961924550828186
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 46,
              "latitude": 136.18682034085185,
              "longitude": 35.96187096713153
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 47,
              "latitude": 136.186868095626,
              "longitude": 35.961953082088385
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 48,
              "latitude": 136.1868959775686,
              "longitude": 35.961924222503306
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 49,
              "latitude": 136.18688711744204,
              "longitude": 35.96182176055322
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 62,
              "latitude": 136.18674398822614,
              "longitude": 35.961764281445866
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 63,
              "latitude": 136.18645326254045,
              "longitude": 35.96199795415883
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 101,
              "latitude": 136.18639230648637,
              "longitude": 35.961905875380126
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 102,
              "latitude": 136.18641398322058,
              "longitude": 35.96190510933523
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 103,
              "latitude": 136.18643599258996,
              "longitude": 35.96190433153515
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 104,
              "latitude": 136.18645773928517,
              "longitude": 35.9619038327686
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 105,
              "latitude": 136.18647856748686,
              "longitude": 35.96190278200115
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 106,
              "latitude": 136.18650040327566,
              "longitude": 35.961901875459894
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 107,
              "latitude": 136.1865213689799,
              "longitude": 35.961901314376206
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 108,
              "latitude": 136.18654250584308,
              "longitude": 35.96190083716078
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 109,
              "latitude": 136.18656499963947,
              "longitude": 35.961899772490426
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 110,
              "latitude": 136.18658784059397,
              "longitude": 35.96189896530245
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 111,
              "latitude": 136.18661084786532,
              "longitude": 35.96189815223689
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 112,
              "latitude": 136.18663180388558,
              "longitude": 35.96189741166151
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 113,
              "latitude": 136.18665458939978,
              "longitude": 35.96189660643273
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 114,
              "latitude": 136.18667804018332,
              "longitude": 35.96189577769361
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 115,
              "latitude": 136.1867014335756,
              "longitude": 35.961896974113614
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 116,
              "latitude": 136.1863696569712,
              "longitude": 35.96191126156543
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 117,
              "latitude": 136.18639230648637,
              "longitude": 35.961905875380126
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 118,
              "latitude": 136.18641398322058,
              "longitude": 35.96190510933523
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 119,
              "latitude": 136.18643599258996,
              "longitude": 35.96190433153515
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 120,
              "latitude": 136.18645773928517,
              "longitude": 35.9619038327686
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 121,
              "latitude": 136.18647856748686,
              "longitude": 35.96190278200115
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 122,
              "latitude": 136.18650040327566,
              "longitude": 35.961901875459894
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 123,
              "latitude": 136.1865213689799,
              "longitude": 35.961901314376206
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 124,
              "latitude": 136.18654250584308,
              "longitude": 35.96190083716078
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 125,
              "latitude": 136.18656499963947,
              "longitude": 35.961899772490426
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 126,
              "latitude": 136.18658784059397,
              "longitude": 35.96189896530245
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 127,
              "latitude": 136.18661084786532,
              "longitude": 35.96189815223689
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 128,
              "latitude": 136.18663180388558,
              "longitude": 35.96189741166151
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 129,
              "latitude": 136.18665458939978,
              "longitude": 35.96189660643273
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 130,
              "latitude": 136.18667804018332,
              "longitude": 35.96189577769361
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 131,
              "latitude": 136.1863645958551,
              "longitude": 35.96181743228368
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 132,
              "latitude": 136.18669697026348,
              "longitude": 35.961804966988936
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 133,
              "latitude": 136.1863696569712,
              "longitude": 35.96191126156543
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 134,
              "latitude": 136.1867014335756,
              "longitude": 35.961896974113614
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 146,
              "latitude": 136.18652869617665,
              "longitude": 35.962006258239946
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 307,
              "latitude": 136.18681235160025,
              "longitude": 35.96190820532909
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 133,
              "latitude": 136.1863696569712,
              "longitude": 35.96191126156543
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 133,
              "latitude": 136.1863696569712,
              "longitude": 35.96191126156543
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 101,
              "latitude": 136.18639230648637,
              "longitude": 35.961905875380126
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 101,
              "latitude": 136.18639230648637,
              "longitude": 35.961905875380126
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 102,
              "latitude": 136.18641398322058,
              "longitude": 35.96190510933523
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 102,
              "latitude": 136.18641398322058,
              "longitude": 35.96190510933523
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 103,
              "latitude": 136.18643599258996,
              "longitude": 35.96190433153515
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 103,
              "latitude": 136.18643599258996,
              "longitude": 35.96190433153515
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 104,
              "latitude": 136.18645773928517,
              "longitude": 35.9619038327686
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 104,
              "latitude": 136.18645773928517,
              "longitude": 35.9619038327686
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 105,
              "latitude": 136.18647856748686,
              "longitude": 35.96190278200115
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 105,
              "latitude": 136.18647856748686,
              "longitude": 35.96190278200115
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 106,
              "latitude": 136.18650040327566,
              "longitude": 35.961901875459894
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 106,
              "latitude": 136.18650040327566,
              "longitude": 35.961901875459894
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 107,
              "latitude": 136.1865213689799,
              "longitude": 35.961901314376206
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 107,
              "latitude": 136.1865213689799,
              "longitude": 35.961901314376206
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 108,
              "latitude": 136.18654250584308,
              "longitude": 35.96190083716078
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 108,
              "latitude": 136.18654250584308,
              "longitude": 35.96190083716078
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 109,
              "latitude": 136.18656499963947,
              "longitude": 35.961899772490426
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 109,
              "latitude": 136.18656499963947,
              "longitude": 35.961899772490426
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 110,
              "latitude": 136.18658784059397,
              "longitude": 35.96189896530245
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 110,
              "latitude": 136.18658784059397,
              "longitude": 35.96189896530245
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 111,
              "latitude": 136.18661084786532,
              "longitude": 35.96189815223689
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 111,
              "latitude": 136.18661084786532,
              "longitude": 35.96189815223689
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 112,
              "latitude": 136.18663180388558,
              "longitude": 35.96189741166151
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 112,
              "latitude": 136.18663180388558,
              "longitude": 35.96189741166151
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 113,
              "latitude": 136.18665458939978,
              "longitude": 35.96189660643273
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 113,
              "latitude": 136.18665458939978,
              "longitude": 35.96189660643273
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 114,
              "latitude": 136.18667804018332,
              "longitude": 35.96189577769361
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 114,
              "latitude": 136.18667804018332,
              "longitude": 35.96189577769361
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 115,
              "latitude": 136.1867014335756,
              "longitude": 35.961896974113614
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 115,
              "latitude": 136.1867014335756,
              "longitude": 35.961896974113614
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 131,
              "latitude": 136.1863645958551,
              "longitude": 35.96181743228368
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 131,
              "latitude": 136.1863645958551,
              "longitude": 35.96181743228368
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 1,
              "latitude": 136.18638732106814,
              "longitude": 35.96181653926824
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 1,
              "latitude": 136.18638732106814,
              "longitude": 35.96181653926824
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 2,
              "latitude": 136.18641004628117,
              "longitude": 35.9618156462528
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 2,
              "latitude": 136.18641004628117,
              "longitude": 35.9618156462528
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 3,
              "latitude": 136.18643200502703,
              "longitude": 35.96181496015777
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 3,
              "latitude": 136.18643200502703,
              "longitude": 35.96181496015777
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 4,
              "latitude": 136.18645278986847,
              "longitude": 35.96181413571413
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 4,
              "latitude": 136.18645278986847,
              "longitude": 35.96181413571413
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 5,
              "latitude": 136.1864736807471,
              "longitude": 35.961813217606256
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 5,
              "latitude": 136.1864736807471,
              "longitude": 35.961813217606256
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 6,
              "latitude": 136.18649558647337,
              "longitude": 35.96181257834334
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 6,
              "latitude": 136.18649558647337,
              "longitude": 35.96181257834334
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 7,
              "latitude": 136.18651775487186,
              "longitude": 35.961811660046926
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 7,
              "latitude": 136.18651775487186,
              "longitude": 35.961811660046926
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 8,
              "latitude": 136.18653859515052,
              "longitude": 35.961810833644094
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 8,
              "latitude": 136.18653859515052,
              "longitude": 35.961810833644094
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 9,
              "latitude": 136.18655994164337,
              "longitude": 35.96181012422727
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 9,
              "latitude": 136.18655994164337,
              "longitude": 35.96181012422727
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 10,
              "latitude": 136.18658300674903,
              "longitude": 35.96180935407544
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 10,
              "latitude": 136.18658300674903,
              "longitude": 35.96180935407544
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 11,
              "latitude": 136.18660594887302,
              "longitude": 35.96180836347738
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 11,
              "latitude": 136.18660594887302,
              "longitude": 35.96180836347738
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 12,
              "latitude": 136.18662703027113,
              "longitude": 35.96180788822115
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 12,
              "latitude": 136.18662703027113,
              "longitude": 35.96180788822115
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 13,
              "latitude": 136.18664930228374,
              "longitude": 35.96180683138758
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 13,
              "latitude": 136.18664930228374,
              "longitude": 35.96180683138758
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 14,
              "latitude": 136.1866731362736,
              "longitude": 35.961805899188256
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 14,
              "latitude": 136.1866731362736,
              "longitude": 35.961805899188256
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 15,
              "latitude": 136.18669697026348,
              "longitude": 35.961804966988936
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 15,
              "latitude": 136.18669697026348,
              "longitude": 35.961804966988936
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 34,
              "latitude": 136.18627392194043,
              "longitude": 35.96193127942226
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 34,
              "latitude": 136.18627392194043,
              "longitude": 35.96193127942226
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 35,
              "latitude": 136.18627294894847,
              "longitude": 35.96191324050726
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 35,
              "latitude": 136.18627294894847,
              "longitude": 35.96191324050726
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 36,
              "latitude": 136.1862719807977,
              "longitude": 35.96189529133811
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 36,
              "latitude": 136.1862719807977,
              "longitude": 35.96189529133811
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 37,
              "latitude": 136.18627098118253,
              "longitude": 35.96187675882095
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 37,
              "latitude": 136.18627098118253,
              "longitude": 35.96187675882095
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 38,
              "latitude": 136.18626991863806,
              "longitude": 35.96185705960781
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 38,
              "latitude": 136.18626991863806,
              "longitude": 35.96185705960781
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 39,
              "latitude": 136.18627059384187,
              "longitude": 35.961836624606605
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 39,
              "latitude": 136.18627059384187,
              "longitude": 35.961836624606605
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 43,
              "latitude": 136.18682401061682,
              "longitude": 35.96193899448264
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 43,
              "latitude": 136.18682401061682,
              "longitude": 35.96193899448264
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 43,
              "latitude": 136.18682305444435,
              "longitude": 35.96192126967809
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 43,
              "latitude": 136.18682305444435,
              "longitude": 35.96192126967809
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 44,
              "latitude": 136.18682209827188,
              "longitude": 35.96190354487355
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 44,
              "latitude": 136.18682209827188,
              "longitude": 35.96190354487355
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 45,
              "latitude": 136.18682121956186,
              "longitude": 35.96188725600254
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 45,
              "latitude": 136.18682121956186,
              "longitude": 35.96188725600254
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 49,
              "latitude": 136.18690607068305,
              "longitude": 35.96180139894392
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 49,
              "latitude": 136.18690607068305,
              "longitude": 35.96180139894392
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 50,
              "latitude": 136.18692502392406,
              "longitude": 35.96178103733462
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 50,
              "latitude": 136.18692502392406,
              "longitude": 35.96178103733462
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 51,
              "latitude": 136.18693411312233,
              "longitude": 35.96175801209845
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 51,
              "latitude": 136.18693411312233,
              "longitude": 35.96175801209845
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 52,
              "latitude": 136.18693403260326,
              "longitude": 35.96173283820016
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 52,
              "latitude": 136.18693403260326,
              "longitude": 35.96173283820016
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 53,
              "latitude": 136.1869257398401,
              "longitude": 35.96170781964384
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 53,
              "latitude": 136.1869257398401,
              "longitude": 35.96170781964384
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 54,
              "latitude": 136.186907531943,
              "longitude": 35.96168845658414
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 54,
              "latitude": 136.186907531943,
              "longitude": 35.96168845658414
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 55,
              "latitude": 136.1868815979032,
              "longitude": 35.96167620025106
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 55,
              "latitude": 136.1868815979032,
              "longitude": 35.96167620025106
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 56,
              "latitude": 136.18685298727485,
              "longitude": 35.961669928067366
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 56,
              "latitude": 136.18685298727485,
              "longitude": 35.961669928067366
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 57,
              "latitude": 136.18682419286148,
              "longitude": 35.96167157506923
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 57,
              "latitude": 136.18682419286148,
              "longitude": 35.96167157506923
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 58,
              "latitude": 136.1867980468882,
              "longitude": 35.96168113108361
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 58,
              "latitude": 136.1867980468882,
              "longitude": 35.96168113108361
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 59,
              "latitude": 136.18677661682983,
              "longitude": 35.961695735621504
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 59,
              "latitude": 136.18677661682983,
              "longitude": 35.961695735621504
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 60,
              "latitude": 136.18676168883835,
              "longitude": 35.96171555035333
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 60,
              "latitude": 136.18676168883835,
              "longitude": 35.96171555035333
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 61,
              "latitude": 136.18675283853224,
              "longitude": 35.9617399158996
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 61,
              "latitude": 136.18675283853224,
              "longitude": 35.9617399158996
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 146,
              "latitude": 136.18656032999033,
              "longitude": 35.962003701647376
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 146,
              "latitude": 136.18656032999033,
              "longitude": 35.962003701647376
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 33,
              "latitude": 136.18623621697776,
              "longitude": 35.96196956774787
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 33,
              "latitude": 136.18623621697776,
              "longitude": 35.96196956774787
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 135,
              "latitude": 136.1862490417946,
              "longitude": 35.96195400848403
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 135,
              "latitude": 136.1862490417946,
              "longitude": 35.96195400848403
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 46,
              "latitude": 136.18681645952623,
              "longitude": 35.961889627184846
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 46,
              "latitude": 136.18681645952623,
              "longitude": 35.961889627184846
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 40,
              "latitude": 136.18627059384187,
              "longitude": 35.961836624606605
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 39,
              "latitude": 136.18626991863806,
              "longitude": 35.96185705960781
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 38,
              "latitude": 136.18627098118253,
              "longitude": 35.96187675882095
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 37,
              "latitude": 136.1862719807977,
              "longitude": 35.96189529133811
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 36,
              "latitude": 136.18627294894847,
              "longitude": 35.96191324050726
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 35,
              "latitude": 136.18627392194043,
              "longitude": 35.96193127942226
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 34,
              "latitude": 136.18627489493238,
              "longitude": 35.96194931833726
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 46,
              "latitude": 136.18682121956186,
              "longitude": 35.96188725600254
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 45,
              "latitude": 136.18682209827188,
              "longitude": 35.96190354487355
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 44,
              "latitude": 136.18682305444435,
              "longitude": 35.96192126967809
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 43,
              "latitude": 136.18682401061682,
              "longitude": 35.96193899448264
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 39,
              "latitude": 136.18627059384187,
              "longitude": 35.961836624606605
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 38,
              "latitude": 136.18626991863806,
              "longitude": 35.96185705960781
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 37,
              "latitude": 136.18627098118253,
              "longitude": 35.96187675882095
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 36,
              "latitude": 136.1862719807977,
              "longitude": 35.96189529133811
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 35,
              "latitude": 136.18627294894847,
              "longitude": 35.96191324050726
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 34,
              "latitude": 136.18627392194043,
              "longitude": 35.96193127942226
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 46,
              "latitude": 136.18682034085185,
              "longitude": 35.96187096713153
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 45,
              "latitude": 136.18682121956186,
              "longitude": 35.96188725600254
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 44,
              "latitude": 136.18682209827188,
              "longitude": 35.96190354487355
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 43,
              "latitude": 136.18682305444435,
              "longitude": 35.96192126967809
            }
          ],
          "nearest1": [
            {
              "latitude": 136.18638732106814,
              "longitude": 35.96181653926824,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 1
              }
            },
            {
              "latitude": 136.18641004628117,
              "longitude": 35.9618156462528,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 2
              }
            },
            {
              "latitude": 136.18643200502703,
              "longitude": 35.96181496015777,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 3
              }
            },
            {
              "latitude": 136.18645278986847,
              "longitude": 35.96181413571413,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 4
              }
            },
            {
              "latitude": 136.1864736807471,
              "longitude": 35.961813217606256,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 5
              }
            },
            {
              "latitude": 136.18649558647337,
              "longitude": 35.96181257834334,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 6
              }
            },
            {
              "latitude": 136.18651775487186,
              "longitude": 35.961811660046926,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 7
              }
            },
            {
              "latitude": 136.18653859515052,
              "longitude": 35.961810833644094,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 8
              }
            },
            {
              "latitude": 136.18655994164337,
              "longitude": 35.96181012422727,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 9
              }
            },
            {
              "latitude": 136.18658300674903,
              "longitude": 35.96180935407544,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 10
              }
            },
            {
              "latitude": 136.18660594887302,
              "longitude": 35.96180836347738,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 11
              }
            },
            {
              "latitude": 136.18662703027113,
              "longitude": 35.96180788822115,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 12
              }
            },
            {
              "latitude": 136.18664930228374,
              "longitude": 35.96180683138758,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 13
              }
            },
            {
              "latitude": 136.1866731362736,
              "longitude": 35.961805899188256,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 14
              }
            },
            {
              "latitude": 136.18669697026348,
              "longitude": 35.961804966988936,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 15
              }
            },
            {
              "latitude": 136.1863645958551,
              "longitude": 35.96181743228368,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 16
              }
            },
            {
              "latitude": 136.18638732106814,
              "longitude": 35.96181653926824,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 17
              }
            },
            {
              "latitude": 136.18641004628117,
              "longitude": 35.9618156462528,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 18
              }
            },
            {
              "latitude": 136.18643200502703,
              "longitude": 35.96181496015777,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 19
              }
            },
            {
              "latitude": 136.18645278986847,
              "longitude": 35.96181413571413,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 20
              }
            },
            {
              "latitude": 136.1864736807471,
              "longitude": 35.961813217606256,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 21
              }
            },
            {
              "latitude": 136.18649558647337,
              "longitude": 35.96181257834334,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 22
              }
            },
            {
              "latitude": 136.18651775487186,
              "longitude": 35.961811660046926,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 23
              }
            },
            {
              "latitude": 136.18653859515052,
              "longitude": 35.961810833644094,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 24
              }
            },
            {
              "latitude": 136.18655994164337,
              "longitude": 35.96181012422727,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 25
              }
            },
            {
              "latitude": 136.18658300674903,
              "longitude": 35.96180935407544,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 26
              }
            },
            {
              "latitude": 136.18660594887302,
              "longitude": 35.96180836347738,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 27
              }
            },
            {
              "latitude": 136.18662703027113,
              "longitude": 35.96180788822115,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 28
              }
            },
            {
              "latitude": 136.18664930228374,
              "longitude": 35.96180683138758,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 29
              }
            },
            {
              "latitude": 136.1866731362736,
              "longitude": 35.961805899188256,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 30
              }
            },
            {
              "latitude": 136.18630578213975,
              "longitude": 35.96186289564538,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 31
              }
            },
            {
              "latitude": 136.1863093982123,
              "longitude": 35.96192993579218,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 32
              }
            },
            {
              "latitude": 136.18624939353526,
              "longitude": 35.961974946694816,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 33
              }
            },
            {
              "latitude": 136.18627489493238,
              "longitude": 35.96194931833726,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 34
              }
            },
            {
              "latitude": 136.1865917918578,
              "longitude": 35.96200825456856,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 41
              }
            },
            {
              "latitude": 136.18667132039457,
              "longitude": 35.96206775650696,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 42
              }
            },
            {
              "latitude": 136.18681269711863,
              "longitude": 35.96194344055807,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 43
              }
            },
            {
              "latitude": 136.186812900094,
              "longitude": 35.961924550828186,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 44
              }
            },
            {
              "latitude": 136.18682034085185,
              "longitude": 35.96187096713153,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 46
              }
            },
            {
              "latitude": 136.186868095626,
              "longitude": 35.961953082088385,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 47
              }
            },
            {
              "latitude": 136.1868959775686,
              "longitude": 35.961924222503306,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 48
              }
            },
            {
              "latitude": 136.18688711744204,
              "longitude": 35.96182176055322,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 49
              }
            },
            {
              "latitude": 136.18674398822614,
              "longitude": 35.961764281445866,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 62
              }
            },
            {
              "latitude": 136.18645326254045,
              "longitude": 35.96199795415883,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 63
              }
            },
            {
              "latitude": 136.18639230648637,
              "longitude": 35.961905875380126,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 101
              }
            },
            {
              "latitude": 136.18641398322058,
              "longitude": 35.96190510933523,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 102
              }
            },
            {
              "latitude": 136.18643599258996,
              "longitude": 35.96190433153515,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 103
              }
            },
            {
              "latitude": 136.18645773928517,
              "longitude": 35.9619038327686,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 104
              }
            },
            {
              "latitude": 136.18647856748686,
              "longitude": 35.96190278200115,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 105
              }
            },
            {
              "latitude": 136.18650040327566,
              "longitude": 35.961901875459894,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 106
              }
            },
            {
              "latitude": 136.1865213689799,
              "longitude": 35.961901314376206,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 107
              }
            },
            {
              "latitude": 136.18654250584308,
              "longitude": 35.96190083716078,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 108
              }
            },
            {
              "latitude": 136.18656499963947,
              "longitude": 35.961899772490426,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 109
              }
            },
            {
              "latitude": 136.18658784059397,
              "longitude": 35.96189896530245,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 110
              }
            },
            {
              "latitude": 136.18661084786532,
              "longitude": 35.96189815223689,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 111
              }
            },
            {
              "latitude": 136.18663180388558,
              "longitude": 35.96189741166151,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 112
              }
            },
            {
              "latitude": 136.18665458939978,
              "longitude": 35.96189660643273,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 113
              }
            },
            {
              "latitude": 136.18667804018332,
              "longitude": 35.96189577769361,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 114
              }
            },
            {
              "latitude": 136.1867014335756,
              "longitude": 35.961896974113614,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 115
              }
            },
            {
              "latitude": 136.1863696569712,
              "longitude": 35.96191126156543,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 116
              }
            },
            {
              "latitude": 136.18639230648637,
              "longitude": 35.961905875380126,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 117
              }
            },
            {
              "latitude": 136.18641398322058,
              "longitude": 35.96190510933523,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 118
              }
            },
            {
              "latitude": 136.18643599258996,
              "longitude": 35.96190433153515,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 119
              }
            },
            {
              "latitude": 136.18645773928517,
              "longitude": 35.9619038327686,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 120
              }
            },
            {
              "latitude": 136.18647856748686,
              "longitude": 35.96190278200115,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 121
              }
            },
            {
              "latitude": 136.18650040327566,
              "longitude": 35.961901875459894,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 122
              }
            },
            {
              "latitude": 136.1865213689799,
              "longitude": 35.961901314376206,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 123
              }
            },
            {
              "latitude": 136.18654250584308,
              "longitude": 35.96190083716078,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 124
              }
            },
            {
              "latitude": 136.18656499963947,
              "longitude": 35.961899772490426,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 125
              }
            },
            {
              "latitude": 136.18658784059397,
              "longitude": 35.96189896530245,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 126
              }
            },
            {
              "latitude": 136.18661084786532,
              "longitude": 35.96189815223689,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 127
              }
            },
            {
              "latitude": 136.18663180388558,
              "longitude": 35.96189741166151,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 128
              }
            },
            {
              "latitude": 136.18665458939978,
              "longitude": 35.96189660643273,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 129
              }
            },
            {
              "latitude": 136.18667804018332,
              "longitude": 35.96189577769361,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 130
              }
            },
            {
              "latitude": 136.1863645958551,
              "longitude": 35.96181743228368,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 131
              }
            },
            {
              "latitude": 136.18669697026348,
              "longitude": 35.961804966988936,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 132
              }
            },
            {
              "latitude": 136.1863696569712,
              "longitude": 35.96191126156543,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 133
              }
            },
            {
              "latitude": 136.1867014335756,
              "longitude": 35.961896974113614,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 134
              }
            },
            {
              "latitude": 136.18652869617665,
              "longitude": 35.962006258239946,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 146
              }
            },
            {
              "latitude": 136.18681235160025,
              "longitude": 35.96190820532909,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 307
              }
            }
          ],
          "nearest2": [
            {
              "latitude": 136.1863696569712,
              "longitude": 35.96191126156543,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 133
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 116
                }
              ]
            },
            {
              "latitude": 136.18639230648637,
              "longitude": 35.961905875380126,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 101
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 117
                }
              ]
            },
            {
              "latitude": 136.18641398322058,
              "longitude": 35.96190510933523,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 102
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 118
                }
              ]
            },
            {
              "latitude": 136.18643599258996,
              "longitude": 35.96190433153515,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 103
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 119
                }
              ]
            },
            {
              "latitude": 136.18645773928517,
              "longitude": 35.9619038327686,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 104
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 120
                }
              ]
            },
            {
              "latitude": 136.18647856748686,
              "longitude": 35.96190278200115,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 105
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 121
                }
              ]
            },
            {
              "latitude": 136.18650040327566,
              "longitude": 35.961901875459894,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 106
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 122
                }
              ]
            },
            {
              "latitude": 136.1865213689799,
              "longitude": 35.961901314376206,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 107
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 123
                }
              ]
            },
            {
              "latitude": 136.18654250584308,
              "longitude": 35.96190083716078,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 108
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 124
                }
              ]
            },
            {
              "latitude": 136.18656499963947,
              "longitude": 35.961899772490426,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 109
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 125
                }
              ]
            },
            {
              "latitude": 136.18658784059397,
              "longitude": 35.96189896530245,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 110
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 126
                }
              ]
            },
            {
              "latitude": 136.18661084786532,
              "longitude": 35.96189815223689,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 111
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 127
                }
              ]
            },
            {
              "latitude": 136.18663180388558,
              "longitude": 35.96189741166151,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 112
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 128
                }
              ]
            },
            {
              "latitude": 136.18665458939978,
              "longitude": 35.96189660643273,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 113
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 129
                }
              ]
            },
            {
              "latitude": 136.18667804018332,
              "longitude": 35.96189577769361,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 114
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 130
                }
              ]
            },
            {
              "latitude": 136.1867014335756,
              "longitude": 35.961896974113614,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 115
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 134
                }
              ]
            },
            {
              "latitude": 136.1863645958551,
              "longitude": 35.96181743228368,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 131
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 16
                }
              ]
            },
            {
              "latitude": 136.18638732106814,
              "longitude": 35.96181653926824,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 1
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 17
                }
              ]
            },
            {
              "latitude": 136.18641004628117,
              "longitude": 35.9618156462528,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 2
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 18
                }
              ]
            },
            {
              "latitude": 136.18643200502703,
              "longitude": 35.96181496015777,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 3
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 19
                }
              ]
            },
            {
              "latitude": 136.18645278986847,
              "longitude": 35.96181413571413,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 4
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 20
                }
              ]
            },
            {
              "latitude": 136.1864736807471,
              "longitude": 35.961813217606256,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 5
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 21
                }
              ]
            },
            {
              "latitude": 136.18649558647337,
              "longitude": 35.96181257834334,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 6
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 22
                }
              ]
            },
            {
              "latitude": 136.18651775487186,
              "longitude": 35.961811660046926,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 7
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 23
                }
              ]
            },
            {
              "latitude": 136.18653859515052,
              "longitude": 35.961810833644094,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 8
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 24
                }
              ]
            },
            {
              "latitude": 136.18655994164337,
              "longitude": 35.96181012422727,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 9
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 25
                }
              ]
            },
            {
              "latitude": 136.18658300674903,
              "longitude": 35.96180935407544,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 10
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 26
                }
              ]
            },
            {
              "latitude": 136.18660594887302,
              "longitude": 35.96180836347738,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 11
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 27
                }
              ]
            },
            {
              "latitude": 136.18662703027113,
              "longitude": 35.96180788822115,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 12
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 28
                }
              ]
            },
            {
              "latitude": 136.18664930228374,
              "longitude": 35.96180683138758,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 13
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 29
                }
              ]
            },
            {
              "latitude": 136.1866731362736,
              "longitude": 35.961805899188256,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 14
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 30
                }
              ]
            },
            {
              "latitude": 136.18669697026348,
              "longitude": 35.961804966988936,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 15
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 132
                }
              ]
            },
            {
              "latitude": 136.18627392194043,
              "longitude": 35.96193127942226,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 34
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 35
                }
              ]
            },
            {
              "latitude": 136.18627294894847,
              "longitude": 35.96191324050726,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 35
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 36
                }
              ]
            },
            {
              "latitude": 136.1862719807977,
              "longitude": 35.96189529133811,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 36
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 37
                }
              ]
            },
            {
              "latitude": 136.18627098118253,
              "longitude": 35.96187675882095,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 37
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 38
                }
              ]
            },
            {
              "latitude": 136.18626991863806,
              "longitude": 35.96185705960781,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 38
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 39
                }
              ]
            },
            {
              "latitude": 136.18627059384187,
              "longitude": 35.961836624606605,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 39
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 40
                }
              ]
            },
            {
              "latitude": 136.18682401061682,
              "longitude": 35.96193899448264,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 43
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 47
                }
              ]
            },
            {
              "latitude": 136.18682305444435,
              "longitude": 35.96192126967809,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 43
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 44
                }
              ]
            },
            {
              "latitude": 136.18682209827188,
              "longitude": 35.96190354487355,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 44
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 45
                }
              ]
            },
            {
              "latitude": 136.18682121956186,
              "longitude": 35.96188725600254,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 45
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 46
                }
              ]
            },
            {
              "latitude": 136.18690607068305,
              "longitude": 35.96180139894392,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 49
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 50
                }
              ]
            },
            {
              "latitude": 136.18692502392406,
              "longitude": 35.96178103733462,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 50
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 51
                }
              ]
            },
            {
              "latitude": 136.18693411312233,
              "longitude": 35.96175801209845,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 51
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 52
                }
              ]
            },
            {
              "latitude": 136.18693403260326,
              "longitude": 35.96173283820016,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 52
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 53
                }
              ]
            },
            {
              "latitude": 136.1869257398401,
              "longitude": 35.96170781964384,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 53
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 54
                }
              ]
            },
            {
              "latitude": 136.186907531943,
              "longitude": 35.96168845658414,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 54
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 55
                }
              ]
            },
            {
              "latitude": 136.1868815979032,
              "longitude": 35.96167620025106,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 55
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 56
                }
              ]
            },
            {
              "latitude": 136.18685298727485,
              "longitude": 35.961669928067366,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 56
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 57
                }
              ]
            },
            {
              "latitude": 136.18682419286148,
              "longitude": 35.96167157506923,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 57
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 58
                }
              ]
            },
            {
              "latitude": 136.1867980468882,
              "longitude": 35.96168113108361,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 58
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 59
                }
              ]
            },
            {
              "latitude": 136.18677661682983,
              "longitude": 35.961695735621504,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 59
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 60
                }
              ]
            },
            {
              "latitude": 136.18676168883835,
              "longitude": 35.96171555035333,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 60
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 61
                }
              ]
            },
            {
              "latitude": 136.18675283853224,
              "longitude": 35.9617399158996,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 61
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 62
                }
              ]
            },
            {
              "latitude": 136.18656032999033,
              "longitude": 35.962003701647376,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 146
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 147
                }
              ]
            },
            {
              "latitude": 136.18623621697776,
              "longitude": 35.96196956774787,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 33
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 135
                }
              ]
            },
            {
              "latitude": 136.1862490417946,
              "longitude": 35.96195400848403,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 135
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 34
                }
              ]
            },
            {
              "latitude": 136.18681645952623,
              "longitude": 35.961889627184846,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 46
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 308
                }
              ]
            }
          ],
          "nearestD": [
            {
              "latitude": 136.18627059384187,
              "longitude": 35.961836624606605,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 40
              },
              "direction": 180,
              "range": 90
            },
            {
              "latitude": 136.18626991863806,
              "longitude": 35.96185705960781,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 39
              },
              "direction": 180,
              "range": 90
            },
            {
              "latitude": 136.18627098118253,
              "longitude": 35.96187675882095,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 38
              },
              "direction": 180,
              "range": 90
            },
            {
              "latitude": 136.1862719807977,
              "longitude": 35.96189529133811,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 37
              },
              "direction": 180,
              "range": 90
            },
            {
              "latitude": 136.18627294894847,
              "longitude": 35.96191324050726,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 36
              },
              "direction": 180,
              "range": 90
            },
            {
              "latitude": 136.18627392194043,
              "longitude": 35.96193127942226,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 35
              },
              "direction": 180,
              "range": 90
            },
            {
              "latitude": 136.18627489493238,
              "longitude": 35.96194931833726,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 34
              },
              "direction": 180,
              "range": 90
            },
            {
              "latitude": 136.18682121956186,
              "longitude": 35.96188725600254,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 46
              },
              "direction": 180,
              "range": 90
            },
            {
              "latitude": 136.18682209827188,
              "longitude": 35.96190354487355,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 45
              },
              "direction": 180,
              "range": 90
            },
            {
              "latitude": 136.18682305444435,
              "longitude": 35.96192126967809,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 44
              },
              "direction": 180,
              "range": 90
            },
            {
              "latitude": 136.18682401061682,
              "longitude": 35.96193899448264,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 43
              },
              "direction": 180,
              "range": 90
            },
            {
              "latitude": 136.18627059384187,
              "longitude": 35.961836624606605,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 39
              },
              "direction": 0,
              "range": 90
            },
            {
              "latitude": 136.18626991863806,
              "longitude": 35.96185705960781,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 38
              },
              "direction": 0,
              "range": 90
            },
            {
              "latitude": 136.18627098118253,
              "longitude": 35.96187675882095,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 37
              },
              "direction": 0,
              "range": 90
            },
            {
              "latitude": 136.1862719807977,
              "longitude": 35.96189529133811,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 36
              },
              "direction": 0,
              "range": 90
            },
            {
              "latitude": 136.18627294894847,
              "longitude": 35.96191324050726,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 35
              },
              "direction": 0,
              "range": 90
            },
            {
              "latitude": 136.18627392194043,
              "longitude": 35.96193127942226,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 34
              },
              "direction": 0,
              "range": 90
            },
            {
              "latitude": 136.18682034085185,
              "longitude": 35.96187096713153,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 46
              },
              "direction": 0,
              "range": 90
            },
            {
              "latitude": 136.18682121956186,
              "longitude": 35.96188725600254,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 45
              },
              "direction": 0,
              "range": 90
            },
            {
              "latitude": 136.18682209827188,
              "longitude": 35.96190354487355,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 44
              },
              "direction": 0,
              "range": 90
            },
            {
              "latitude": 136.18682305444435,
              "longitude": 35.96192126967809,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 43
              },
              "direction": 0,
              "range": 90
            }
          ]
        },
        {
          "id": "8",
          "label": "2",
          "bbox": [
            136.18617217725753,
            35.961639755749225,
            136.18697793129988,
            35.96227957363341
          ],
          "angle": 2.5,
          "beacons": [
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 64,
              "latitude": 136.1864759346859,
              "longitude": 35.96193223291855
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 70,
              "latitude": 136.18653830117026,
              "longitude": 35.961928949915816
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 71,
              "latitude": 136.18652509024673,
              "longitude": 35.961813783616606
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 75,
              "latitude": 136.18643306125267,
              "longitude": 35.961817035878845
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 76,
              "latitude": 136.18664209004413,
              "longitude": 35.961943939832906
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 83,
              "latitude": 136.18663521246324,
              "longitude": 35.96178143323945
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 84,
              "latitude": 136.1865445207419,
              "longitude": 35.96173945498899
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 85,
              "latitude": 136.1865965118468,
              "longitude": 35.96196709072564
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 86,
              "latitude": 136.18656592259623,
              "longitude": 35.962025798155054
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 87,
              "latitude": 136.18654187666812,
              "longitude": 35.96203046756157
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 88,
              "latitude": 136.1865272044753,
              "longitude": 35.962026974982585
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 93,
              "latitude": 136.18654349037516,
              "longitude": 35.961852157310595
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 76,
              "latitude": 136.18664149707814,
              "longitude": 35.961922650475515
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 76,
              "latitude": 136.18664149707814,
              "longitude": 35.961922650475515
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 77,
              "latitude": 136.18664090411215,
              "longitude": 35.96190136111812
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 77,
              "latitude": 136.18664090411215,
              "longitude": 35.96190136111812
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 78,
              "latitude": 136.1866403474554,
              "longitude": 35.961880744854575
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 78,
              "latitude": 136.1866403474554,
              "longitude": 35.961880744854575
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 79,
              "latitude": 136.18663936665007,
              "longitude": 35.96186050324796
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 79,
              "latitude": 136.18663936665007,
              "longitude": 35.96186050324796
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 80,
              "latitude": 136.18663798543406,
              "longitude": 35.96183901695468
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 80,
              "latitude": 136.18663798543406,
              "longitude": 35.96183901695468
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 81,
              "latitude": 136.186636778032,
              "longitude": 35.961818693439
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 81,
              "latitude": 136.186636778032,
              "longitude": 35.961818693439
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 82,
              "latitude": 136.18663599524763,
              "longitude": 35.961800063339226
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 82,
              "latitude": 136.18663599524763,
              "longitude": 35.961800063339226
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 71,
              "latitude": 136.1865081258662,
              "longitude": 35.961814383130005
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 71,
              "latitude": 136.1865081258662,
              "longitude": 35.961814383130005
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 72,
              "latitude": 136.18649116148566,
              "longitude": 35.9618149826434
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 72,
              "latitude": 136.18649116148566,
              "longitude": 35.9618149826434
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 73,
              "latitude": 136.18647231217363,
              "longitude": 35.96181564876941
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 73,
              "latitude": 136.18647231217363,
              "longitude": 35.96181564876941
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 74,
              "latitude": 136.18645268671315,
              "longitude": 35.96181634232413
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 74,
              "latitude": 136.18645268671315,
              "longitude": 35.96181634232413
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 65,
              "latitude": 136.1864747002346,
              "longitude": 35.961909347727875
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 65,
              "latitude": 136.1864747002346,
              "longitude": 35.961909347727875
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 67,
              "latitude": 136.18647164816076,
              "longitude": 35.961885717518804
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 67,
              "latitude": 136.18647164816076,
              "longitude": 35.961885717518804
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 89,
              "latitude": 136.18653703765466,
              "longitude": 35.961905526250064
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 89,
              "latitude": 136.18653703765466,
              "longitude": 35.961905526250064
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 91,
              "latitude": 136.1865366664738,
              "longitude": 35.9618842290559
            },
            {
              "uuid": "00000000-71C7-1001-B000-001C4D532518",
              "major": 105,
              "minor": 91,
              "latitude": 136.1865366664738,
              "longitude": 35.9618842290559
            }
          ],
          "nearest1": [
            {
              "latitude": 136.1864759346859,
              "longitude": 35.96193223291855,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 64
              }
            },
            {
              "latitude": 136.18653830117026,
              "longitude": 35.961928949915816,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 70
              }
            },
            {
              "latitude": 136.18652509024673,
              "longitude": 35.961813783616606,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 71
              }
            },
            {
              "latitude": 136.18643306125267,
              "longitude": 35.961817035878845,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 75
              }
            },
            {
              "latitude": 136.18664209004413,
              "longitude": 35.961943939832906,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 76
              }
            },
            {
              "latitude": 136.18663521246324,
              "longitude": 35.96178143323945,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 83
              }
            },
            {
              "latitude": 136.1865445207419,
              "longitude": 35.96173945498899,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 84
              }
            },
            {
              "latitude": 136.1865965118468,
              "longitude": 35.96196709072564,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 85
              }
            },
            {
              "latitude": 136.18656592259623,
              "longitude": 35.962025798155054,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 86
              }
            },
            {
              "latitude": 136.18654187666812,
              "longitude": 35.96203046756157,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 87
              }
            },
            {
              "latitude": 136.1865272044753,
              "longitude": 35.962026974982585,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 88
              }
            },
            {
              "latitude": 136.18654349037516,
              "longitude": 35.961852157310595,
              "beacon": {
                "uuid": "00000000-71C7-1001-B000-001C4D532518",
                "major": 105,
                "minor": 93
              }
            }
          ],
          "nearest2": [
            {
              "latitude": 136.18664149707814,
              "longitude": 35.961922650475515,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 76
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 77
                }
              ]
            },
            {
              "latitude": 136.18664090411215,
              "longitude": 35.96190136111812,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 77
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 78
                }
              ]
            },
            {
              "latitude": 136.1866403474554,
              "longitude": 35.961880744854575,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 78
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 79
                }
              ]
            },
            {
              "latitude": 136.18663936665007,
              "longitude": 35.96186050324796,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 79
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 80
                }
              ]
            },
            {
              "latitude": 136.18663798543406,
              "longitude": 35.96183901695468,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 80
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 81
                }
              ]
            },
            {
              "latitude": 136.186636778032,
              "longitude": 35.961818693439,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 81
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 82
                }
              ]
            },
            {
              "latitude": 136.18663599524763,
              "longitude": 35.961800063339226,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 82
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 83
                }
              ]
            },
            {
              "latitude": 136.1865081258662,
              "longitude": 35.961814383130005,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 71
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 72
                }
              ]
            },
            {
              "latitude": 136.18649116148566,
              "longitude": 35.9618149826434,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 72
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 73
                }
              ]
            },
            {
              "latitude": 136.18647231217363,
              "longitude": 35.96181564876941,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 73
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 74
                }
              ]
            },
            {
              "latitude": 136.18645268671315,
              "longitude": 35.96181634232413,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 74
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 75
                }
              ]
            },
            {
              "latitude": 136.1864747002346,
              "longitude": 35.961909347727875,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 65
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 66
                }
              ]
            },
            {
              "latitude": 136.18647164816076,
              "longitude": 35.961885717518804,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 67
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 69
                }
              ]
            },
            {
              "latitude": 136.18653703765466,
              "longitude": 35.961905526250064,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 89
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 90
                }
              ]
            },
            {
              "latitude": 136.1865366664738,
              "longitude": 35.9618842290559,
              "beacons": [
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 91
                },
                {
                  "uuid": "00000000-71C7-1001-B000-001C4D532518",
                  "major": 105,
                  "minor": 92
                }
              ]
            }
          ],
          "nearestD": []
        }
      ]
    }
  ];

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
      compassSuccess = function (heading) {
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
    logo: false,

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
    return map.getView().fit(
      transformExtent(homeBoundingBox, "EPSG:4326", "EPSG:3857"),
      map.getSize()
    );
  }
};

var invalidateLocator = function () {
  if (!(typeof cordova !== "undefined" && cordova !== null) || !(cordova.plugins.BluetoothStatus != null) || !cordova.plugins.BluetoothStatus.hasBTLE || !cordova.plugins.BluetoothStatus.BTenabled) {
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
        UI.notify("現在地を取得できませんでした");
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
    console.log(kanilayer);
    return locatorClicked();
  }

  getUI() {
    return UI;
  }
}

window.app = new App();
