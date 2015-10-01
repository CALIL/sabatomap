var Kanikama,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Kanikama = (function() {
  Kanikama.prototype.geojsons = {};

  Kanikama.prototype.facility = null;

  Kanikama.prototype.floor = null;

  Kanikama.prototype.positionLatLng = null;

  Kanikama.prototype.positionAccuracy = null;

  Kanikama.prototype.compass = null;

  Kanikama.prototype.pastFacilityid = null;

  Kanikama.prototype.lastFloor = null;

  Kanikama.prototype.waitElapsed = 0;

  Kanikama.prototype.lastFloorCall = 0;

  Kanikama.prototype.table = null;

  Kanikama.prototype.notifiedFloorId = null;

  function Kanikama() {
    this.addGeoJSON = bind(this.addGeoJSON, this);
    this.buffer = new BeaconsBuffer(10);
  }

  Kanikama.prototype.pushBeacons = function(beacons) {
    var ref;
    ref = [null, null, null, null], this.facility = ref[0], this.floor = ref[1], this.position = ref[2], this.target = ref[3];
    this.buffer.push(beacons);
    this.facilityDetector();
    if (this.facility != null) {
      this.floorDetector();
    }
    if (this.floor != null) {
      switch (this.floor.id) {
        case '7':
          this.sabaePositionDetectorV2();
          break;
        case '8':
          this.sabaePositionDetector2F();
          break;
        default:
          console.log('floor.id not found');
      }
    }
  };

  Kanikama.prototype.pushCompass = function(compass) {
    this.compass = compass;
  };

  Kanikama.prototype.clear = function() {};

  Kanikama.prototype.beaconToClassify = function(b) {
    var c, i, len, ref;
    if (this.table === null) {
      return null;
    }
    ref = this.table;
    for (i = 0, len = ref.length; i < len; i++) {
      c = ref[i];
      if ((c.uuid !== null) && (c.uuid.toLowerCase() !== b.uuid.toLowerCase())) {
        continue;
      }
      if ((c.major !== null) && (c.major !== b.major)) {
        continue;
      }
      if ((c.minor !== null) && (c.minor instanceof Array) && (c.minor.indexOf(b.minor) === -1)) {
        continue;
      }
      if ((c.minor !== null) && (typeof c.minor === 'number') && (c.minor !== b.minor)) {
        continue;
      }
      if ((b.lane != null) && (c.lane !== b.lane)) {
        continue;
      }
      return c;
    }
    return null;
  };

  Kanikama.prototype.addGeoJSON = function(geojson) {
    var _b, _c, b, c, facility, feature, floor, i, j, k, l, len, len1, len2, len3, len4, m, ref, ref1, ref2, ref3, ref4, ref5, ref6, tmp;
    ref = geojson.properties, facility = ref.facility, floor = ref.floor;
    if (this.table === null) {
      this.table = [];
    }
    if (this.table.filter(function(c) {
      return (c.facility.id === facility.id) && (c.floor.id === floor.id);
    }).length !== 0) {
      return;
    }
    ref1 = geojson.features;
    for (i = 0, len = ref1.length; i < len; i++) {
      feature = ref1[i];
      b = feature.properties;
      if (b.type !== 'beacon') {
        continue;
      }
      if (typeof b.uuid === 'undefined') {
        continue;
      }
      if (typeof b.major === 'undefined') {
        continue;
      }
      if (typeof b.minor === 'undefined') {
        continue;
      }
      c = this.beaconToClassify(b);
      if (c !== null) {
        if (typeof c.minor === 'number') {
          ref2 = [c.minor, []], tmp = ref2[0], c.minor = ref2[1];
          c.minor.push(tmp);
        }
        c.minor.push(b.minor);
      } else {
        this.table.push({
          facility: facility,
          floor: floor,
          lane: b.lane,
          uuid: b.uuid,
          major: b.major,
          minor: b.minor
        });
      }
    }
    ref3 = [floor, facility];
    for (j = 0, len1 = ref3.length; j < len1; j++) {
      b = ref3[j];
      if (typeof b.uuid === 'undefined') {
        continue;
      }
      if (typeof b.major === 'undefined') {
        continue;
      }
      if (typeof b.minor === 'undefined') {
        continue;
      }
      if (this.beaconToClassify(b) !== null) {
        continue;
      }
      this.table.push({
        facility: facility,
        floor: floor,
        lane: b.lane,
        uuid: b.uuid,
        major: b.major,
        minor: b.minor
      });
    }
    ref4 = [floor, facility];
    for (k = 0, len2 = ref4.length; k < len2; k++) {
      b = ref4[k];
      if (typeof b.uuid === 'undefined') {
        continue;
      }
      if (typeof b.major === 'undefined') {
        continue;
      }
      ref5 = geojson.features;
      for (l = 0, len3 = ref5.length; l < len3; l++) {
        feature = ref5[l];
        _b = feature.properties;
        if (_b.type !== 'beacon') {
          continue;
        }
        if (typeof _b.uuid !== 'undefined') {
          continue;
        }
        if (typeof _b.major !== 'undefined') {
          continue;
        }
        if (typeof _b.minor === 'undefined') {
          continue;
        }
        c = null;
        ref6 = this.table;
        for (m = 0, len4 = ref6.length; m < len4; m++) {
          _c = ref6[m];
          if ((_c.uuid !== null) && (_c.uuid.toLowerCase() !== b.uuid.toLowerCase())) {
            continue;
          }
          if ((_c.major !== null) && (_c.major !== b.major)) {
            continue;
          }
          if ((_b.lane != null) && (_c.lane !== _b.lane)) {
            continue;
          }
          if (_c.floor.id !== floor.id) {
            continue;
          }
          c = _c;
        }
        if (c !== null) {
          if (typeof c.minor === 'number') {
            c.minor = [c.minor];
          }
          c.minor.push(_b.minor);
        } else {
          this.table.push({
            facility: facility,
            floor: floor,
            lane: _b.lane,
            uuid: b.uuid,
            major: b.major,
            minor: _b.minor
          });
        }
      }
    }
    if (this.geojsons == null) {
      this.geojsons = {};
    }
    if (this.geojsons[facility.id] == null) {
      this.geojsons[facility.id] = {};
    }
    this.geojsons[facility.id][floor.id] = geojson;
  };

  Kanikama.prototype.addMultipleGeoJSON = function(geojsons) {
    var geojson, i, len;
    for (i = 0, len = geojsons.length; i < len; i++) {
      geojson = geojsons[i];
      this.addGeoJSON(geojson);
    }
  };

  Kanikama.prototype.facilityDetector = function() {
    var accuracies, b, beacons, c, comparator, facilities, facility, i, id, j, len, len1, ref, windowSize;
    windowSize = 3;
    facilities = {};
    ref = this.buffer.last(windowSize);
    for (i = 0, len = ref.length; i < len; i++) {
      beacons = ref[i];
      for (j = 0, len1 = beacons.length; j < len1; j++) {
        b = beacons[j];
        c = this.beaconToClassify(b);
        if (c === null) {
          continue;
        }
        if (facilities[c.facility.id] == null) {
          facilities[c.facility.id] = [];
        }
        facilities[c.facility.id].push(b);
      }
    }
    accuracies = [];
    if (Object.keys(facilities).length > 0) {
      for (id in facilities) {
        beacons = facilities[id];
        beacons.sort(function(a, b) {
          return b.rssi - a.rssi;
        });
        accuracies.push({
          id: id,
          accuracy: this.rssiToAccuracy(beacons[0].rssi)
        });
      }
    }
    comparator = (function(_this) {
      return function(f0, f1) {
        if (f0.id === _this.pastFacilityid) {
          return -1;
        }
        if (f1.id === _this.pastFacilityid) {
          return 1;
        } else {
          return f1.accuracy - f0.accuracy;
        }
      };
    })(this);
    facility = accuracies.sort(comparator)[0];
    if (facility != null) {
      if (facility.accuracy > 1.0) {
        facility.accuracy = 1.0;
      }
      this.pastFacilityid = facility.id;
    }
    if ((facility == null) && (this.pastFacilityid != null)) {
      facility = {
        id: this.pastFacilityid,
        accuracy: 0.0
      };
    }
    if (facility != null) {
      facilities = this.table.filter(function(f) {
        return f.facility.id === facility.id;
      });
      this.facility = facilities[0].facility;
    }
    return true;
  };

  Kanikama.prototype.floorDetector = function() {
    var _beacons, _tmp, averages, b, beacons, changeFloor, effectiveRange, f, features, floorBeacons, geojson, i, id, j, lat, len, len1, lng, minors, near, nearFeatures, nears, newFloor, now, ref, ref1, ref2, sum, waitThreshold, windowSize;
    windowSize = 1;
    waitThreshold = 5000;
    effectiveRange = 3;
    changeFloor = false;
    beacons = [];
    ref = this.buffer.last(windowSize);
    for (i = 0, len = ref.length; i < len; i++) {
      _beacons = ref[i];
      _tmp = _beacons.filter((function(_this) {
        return function(b) {
          var c;
          c = _this.beaconToClassify(b);
          return (c !== null) && (c.facility.id === _this.facility.id);
        };
      })(this));
      beacons = beacons.concat(_tmp);
    }
    beacons = beacons.filter(function(b) {
      return b.rssi !== 0;
    });
    averages = [];
    ref1 = this.geojsons[this.facility.id];
    for (id in ref1) {
      geojson = ref1[id];
      floorBeacons = beacons.filter((function(_this) {
        return function(b) {
          var c;
          c = _this.beaconToClassify(b);
          return (c !== null) && ((String(c.facility.id) === String(_this.facility.id)) && (String(c.floor.id) === String(id)));
        };
      })(this));
      if (floorBeacons.length === 0) {
        continue;
      }
      floorBeacons.sort(function(a, b) {
        return b.rssi - a.rssi;
      });
      features = geojson.features.filter(function(feature) {
        return feature.properties.minor === floorBeacons[0].minor;
      });
      if (features.length === 0) {
        continue;
      }
      ref2 = features[0].geometry.coordinates, lat = ref2[0], lng = ref2[1];
      near = {
        latitude: lat,
        longitude: lng
      };
      nearFeatures = geojson.features.filter(function(feature) {
        var ref3;
        if (feature.properties.type !== 'beacon') {
          return false;
        }
        ref3 = feature.geometry.coordinates, lat = ref3[0], lng = ref3[1];
        return geolib.getDistance(near, {
          latitude: lat,
          longitude: lng
        }) <= effectiveRange;
      });
      minors = (function() {
        var j, len1, results;
        results = [];
        for (j = 0, len1 = nearFeatures.length; j < len1; j++) {
          f = nearFeatures[j];
          results.push(f.properties.minor);
        }
        return results;
      })();
      nears = beacons.filter(function(arg) {
        var minor;
        minor = arg.minor;
        return minors.indexOf(minor) !== -1;
      });
      sum = 0;
      for (j = 0, len1 = nears.length; j < len1; j++) {
        b = nears[j];
        sum += b.rssi;
      }
      averages.push({
        id: id,
        average: sum / nears.length
      });
    }
    id = null;
    if (averages.length > 0) {
      id = averages.sort(function(a, b) {
        return b.average - a.average;
      })[0].id;
    }
    newFloor = this.lastFloor;
    if ((this.lastFloor != null) && (id === this.lastFloor)) {
      this.waitElapsed = 0;
    } else {
      now = new Date();
      this.waitElapsed += now - this.lastFloorCall;
      if ((this.lastFloor === null) || (this.waitElapsed > waitThreshold)) {
        newFloor = id;
        console.log('floor changed' + this.waitElapsed + ' ' + this.lastFloor + '-->' + newFloor + ' ' + JSON.stringify(averages));
        this.waitElapsed = 0;
        changeFloor = true;
      }
      this.lastFloorCall = now;
    }
    this.lastFloor = newFloor;
    if (newFloor !== null) {
      this.floor = this.table.filter((function(_this) {
        return function(f) {
          return (f.facility.id === _this.facility.id) && (f.floor.id === newFloor);
        };
      })(this))[0].floor;
    } else {
      this.floor = null;
    }
    if (changeFloor && this.floor !== null && this.notifiedFloorId !== this.floor.id) {
      this.notifiedFloorId = this.floor.id;
      this.onChangeFloor();
    }
    return true;
  };

  Kanikama.prototype.sabaePositionDetector = function() {
    var POINT_2_LATLNG, WINDOW_SIZE, accuracy, algorithm, d, nearest1, nearest2, nearest2_v21, nearestD, p, ref, ref1, ref2, ref3, ref4, ref5, ret, text;
    WINDOW_SIZE = 1;
    POINT_2_LATLNG = [
      {
        "lane": "A",
        "latlng": [136.1863696569712, 35.96191126156543],
        "point": 0
      }, {
        "lane": "A",
        "latlng": [136.18639230648637, 35.961905875380126],
        "point": 1
      }, {
        "lane": "A",
        "latlng": [136.18641398322058, 35.96190510933523],
        "point": 2
      }, {
        "lane": "A",
        "latlng": [136.18643599258996, 35.96190433153515],
        "point": 3
      }, {
        "lane": "A",
        "latlng": [136.18645773928517, 35.9619038327686],
        "point": 4
      }, {
        "lane": "A",
        "latlng": [136.18647856748686, 35.96190278200115],
        "point": 5
      }, {
        "lane": "A",
        "latlng": [136.18650040327566, 35.961901875459894],
        "point": 6
      }, {
        "lane": "A",
        "latlng": [136.1865213689799, 35.961901314376206],
        "point": 7
      }, {
        "lane": "A",
        "latlng": [136.18654250584308, 35.96190083716078],
        "point": 8
      }, {
        "lane": "A",
        "latlng": [136.18656499963947, 35.961899772490426],
        "point": 9
      }, {
        "lane": "A",
        "latlng": [136.18658784059397, 35.96189896530245],
        "point": 10
      }, {
        "lane": "A",
        "latlng": [136.18661084786532, 35.96189815223689],
        "point": 11
      }, {
        "lane": "A",
        "latlng": [136.18663180388558, 35.96189741166151],
        "point": 12
      }, {
        "lane": "A",
        "latlng": [136.18665458939978, 35.96189660643273],
        "point": 13
      }, {
        "lane": "A",
        "latlng": [136.18667804018332, 35.96189577769361],
        "point": 14
      }, {
        "lane": "A",
        "latlng": [136.1867014335756, 35.961896974113614],
        "point": 15
      }, {
        "lane": "B",
        "latlng": [136.1863645958551, 35.96181743228368],
        "point": 0
      }, {
        "lane": "B",
        "latlng": [136.18638732106814, 35.96181653926824],
        "point": 1
      }, {
        "lane": "B",
        "latlng": [136.18641004628117, 35.9618156462528],
        "point": 2
      }, {
        "lane": "B",
        "latlng": [136.18643200502703, 35.96181496015777],
        "point": 3
      }, {
        "lane": "B",
        "latlng": [136.18645278986847, 35.96181413571413],
        "point": 4
      }, {
        "lane": "B",
        "latlng": [136.1864736807471, 35.961813217606256],
        "point": 5
      }, {
        "lane": "B",
        "latlng": [136.18649558647337, 35.96181257834334],
        "point": 6
      }, {
        "lane": "B",
        "latlng": [136.18651775487186, 35.961811660046926],
        "point": 7
      }, {
        "lane": "B",
        "latlng": [136.18653859515052, 35.961810833644094],
        "point": 8
      }, {
        "lane": "B",
        "latlng": [136.18655994164337, 35.96181012422727],
        "point": 9
      }, {
        "lane": "B",
        "latlng": [136.18658300674903, 35.96180935407544],
        "point": 10
      }, {
        "lane": "B",
        "latlng": [136.18660594887302, 35.96180836347738],
        "point": 11
      }, {
        "lane": "B",
        "latlng": [136.18662703027113, 35.96180788822115],
        "point": 12
      }, {
        "lane": "B",
        "latlng": [136.18664930228374, 35.96180683138758],
        "point": 13
      }, {
        "lane": "B",
        "latlng": [136.1866731362736, 35.961805899188256],
        "point": 14
      }, {
        "lane": "B",
        "latlng": [136.18669697026348, 35.961804966988936],
        "point": 15
      }, {
        "lane": "C",
        "latlng": [136.18682401061682, 35.96193899448264],
        "point": 0
      }, {
        "lane": "C",
        "latlng": [136.18682305444435, 35.96192126967809],
        "point": 1
      }, {
        "lane": "C",
        "latlng": [136.18682209827188, 35.96190354487355],
        "point": 2
      }, {
        "lane": "C",
        "latlng": [136.18682121956186, 35.96188725600254],
        "point": 3
      }, {
        "lane": "C",
        "latlng": [136.18682034085185, 35.96187096713153],
        "point": 4
      }, {
        "lane": "D",
        "latlng": [136.18627489493238, 35.96194931833726],
        "point": 0
      }, {
        "lane": "D",
        "latlng": [136.18627392194043, 35.96193127942226],
        "point": 1
      }, {
        "lane": "D",
        "latlng": [136.18627294894847, 35.96191324050726],
        "point": 2
      }, {
        "lane": "D",
        "latlng": [136.1862719807977, 35.96189529133811],
        "point": 3
      }, {
        "lane": "D",
        "latlng": [136.18627098118253, 35.96187675882095],
        "point": 4
      }, {
        "lane": "D",
        "latlng": [136.18626991863806, 35.96185705960781],
        "point": 5
      }, {
        "lane": "D",
        "latlng": [136.18627059384187, 35.961836624606605],
        "point": 6
      }, {
        "lane": "main",
        "latlng": [136.18630578213975, 35.96186289564538],
        "point": 0
      }, {
        "lane": "main",
        "latlng": [136.1863093982123, 35.96192993579218],
        "point": 1
      }, {
        "lane": "main",
        "latlng": [136.18624939353526, 35.961974946694816],
        "point": 2
      }, {
        "lane": "main",
        "latlng": [136.1865991356181, 35.96199405792012],
        "point": 3
      }, {
        "lane": "main",
        "latlng": [136.18667132039457, 35.96206775650696],
        "point": 4
      }, {
        "lane": "main",
        "latlng": [136.186868095626, 35.961953082088385],
        "point": 5
      }, {
        "lane": "main",
        "latlng": [136.1868959775686, 35.961924222503306],
        "point": 6
      }, {
        "lane": "main",
        "latlng": [136.18645326254045, 35.96199795415883],
        "point": 7
      }, {
        "lane": "circle",
        "latlng": [136.18688711744204, 35.96182176055322],
        "point": 0
      }, {
        "lane": "circle",
        "latlng": [136.18690607068305, 35.96180139894392],
        "point": 1
      }, {
        "lane": "circle",
        "latlng": [136.18692502392406, 35.96178103733462],
        "point": 2
      }, {
        "lane": "circle",
        "latlng": [136.18693411312233, 35.96175801209845],
        "point": 3
      }, {
        "lane": "circle",
        "latlng": [136.18693403260326, 35.96173283820016],
        "point": 4
      }, {
        "lane": "circle",
        "latlng": [136.1869257398401, 35.96170781964384],
        "point": 5
      }, {
        "lane": "circle",
        "latlng": [136.186907531943, 35.96168845658414],
        "point": 6
      }, {
        "lane": "circle",
        "latlng": [136.1868815979032, 35.96167620025106],
        "point": 7
      }, {
        "lane": "circle",
        "latlng": [136.18685298727485, 35.961669928067366],
        "point": 8
      }, {
        "lane": "circle",
        "latlng": [136.18682419286148, 35.96167157506923],
        "point": 9
      }, {
        "lane": "circle",
        "latlng": [136.1867980468882, 35.96168113108361],
        "point": 10
      }, {
        "lane": "circle",
        "latlng": [136.18677661682983, 35.961695735621504],
        "point": 11
      }, {
        "lane": "circle",
        "latlng": [136.18676168883835, 35.96171555035333],
        "point": 12
      }, {
        "lane": "circle",
        "latlng": [136.18675283853224, 35.9617399158996],
        "point": 13
      }, {
        "lane": "circle",
        "latlng": [136.18674398822614, 35.961764281445866],
        "point": 14
      }
    ];
    nearest1 = function(beacons, filter_near) {
      var e, error, map;
      if (filter_near == null) {
        filter_near = 0;
      }
      map = {
        "131": ["B", 0],
        "1": ["B", 1],
        "2": ["B", 2],
        "3": ["B", 3],
        "4": ["B", 4],
        "5": ["B", 5],
        "6": ["B", 6],
        "7": ["B", 7],
        "8": ["B", 8],
        "9": ["B", 9],
        "10": ["B", 10],
        "11": ["B", 11],
        "12": ["B", 12],
        "13": ["B", 13],
        "14": ["B", 14],
        "15": ["B", 15],
        "16": ["B", 0],
        "17": ["B", 1],
        "18": ["B", 2],
        "19": ["B", 3],
        "20": ["B", 4],
        "21": ["B", 5],
        "22": ["B", 6],
        "23": ["B", 7],
        "24": ["B", 8],
        "25": ["B", 9],
        "26": ["B", 10],
        "27": ["B", 11],
        "28": ["B", 12],
        "29": ["B", 13],
        "30": ["B", 14],
        "132": ["B", 15],
        "133": ["A", 0],
        "101": ["A", 1],
        "102": ["A", 2],
        "103": ["A", 3],
        "104": ["A", 4],
        "105": ["A", 5],
        "106": ["A", 6],
        "107": ["A", 7],
        "108": ["A", 8],
        "109": ["A", 9],
        "110": ["A", 10],
        "111": ["A", 11],
        "112": ["A", 12],
        "113": ["A", 13],
        "114": ["A", 14],
        "115": ["A", 15],
        "116": ["A", 0],
        "117": ["A", 1],
        "118": ["A", 2],
        "119": ["A", 3],
        "120": ["A", 4],
        "121": ["A", 5],
        "122": ["A", 6],
        "123": ["A", 7],
        "124": ["A", 8],
        "125": ["A", 9],
        "126": ["A", 10],
        "127": ["A", 11],
        "128": ["A", 12],
        "129": ["A", 13],
        "130": ["A", 14],
        "134": ["A", 15],
        "48": ["main", 6],
        "33": ["main", 2],
        "32": ["main", 1],
        "31": ["main", 0],
        "42": ["main", 4],
        "41": ["main", 3],
        "63": ["main", 7],
        "47": ["main", 5]
      };
      beacons = beacons.filter(function(_b) {
        return _b.rssi !== 0;
      });
      beacons.sort(function(_a, _b) {
        return _b.rssi - _a.rssi;
      });
      try {
        if (filter_near > 0 && beacons.length > 1 && beacons[0].rssi - beacons[1].rssi <= filter_near) {
          return null;
        }
        return map[beacons[0].minor];
      } catch (error) {
        e = error;
        return null;
      }
    };
    nearestD = function(beacons, heading, filter_near) {
      var _heading, _map, e, error, heading_offset, map, offsets, wide;
      if (filter_near == null) {
        filter_near = 0;
      }
      map = {
        "39": [["D", 5], ["D", 6]],
        "38": [["D", 4], ["D", 5]],
        "37": [["D", 3], ["D", 4]],
        "36": [["D", 2], ["D", 3]],
        "35": [["D", 1], ["D", 2]],
        "34": [["D", 0], ["D", 1]],
        "40": [["D", 6], ["D", 7]],
        "46": [["C", 3], ["C", 4]],
        "43": [["C", 0], ["C", 1]],
        "44": [["C", 1], ["C", 2]],
        "45": [["C", 2], ["C", 3]]
      };
      offsets = {
        'D': 90,
        'C': 90
      };
      beacons = beacons.filter(function(_b) {
        return _b.rssi !== 0;
      });
      beacons.sort(function(_a, _b) {
        return _b.rssi - _a.rssi;
      });
      try {
        if (filter_near > 0 && beacons.length > 1 && beacons[0]['rssi'] - beacons[1]['rssi'] < filter_near) {
          return null;
        }
        _map = map[beacons[0].minor];
        heading_offset = offsets[_map[0][0]];
        wide = 90;
        _heading = heading + heading_offset;
        if (_heading < 0) {
          _heading = 360 - _heading;
        }
        if (_heading >= 360) {
          _heading = _heading - 360;
        }
        console.log(heading);
        if ((90 - wide / 2 < _heading && _heading < 90 + wide / 2)) {
          return _map[1];
        }
        if ((270 - wide / 2 < _heading && _heading < 270 + wide / 2)) {
          return _map[0];
        }
        return null;
      } catch (error) {
        e = error;
        return null;
      }
    };
    nearest2 = function(beacons, filter_near) {
      var _map, a, b, beacon_a, beacon_b, candidate, e, error, i, len, map, ref;
      if (filter_near == null) {
        filter_near = 0;
      }
      map = [[[133, 116], ["A", 0]], [[101, 117], ["A", 1]], [[102, 118], ["A", 2]], [[103, 119], ["A", 3]], [[104, 120], ["A", 4]], [[105, 121], ["A", 5]], [[106, 122], ["A", 6]], [[107, 123], ["A", 7]], [[108, 124], ["A", 8]], [[109, 125], ["A", 9]], [[110, 126], ["A", 10]], [[111, 127], ["A", 11]], [[112, 128], ["A", 12]], [[113, 129], ["A", 13]], [[114, 130], ["A", 14]], [[115, 134], ["A", 15]], [[131, 16], ["B", 0]], [[1, 17], ["B", 1]], [[2, 18], ["B", 2]], [[3, 19], ["B", 3]], [[4, 20], ["B", 4]], [[5, 21], ["B", 5]], [[6, 22], ["B", 6]], [[7, 23], ["B", 7]], [[8, 24], ["B", 8]], [[9, 25], ["B", 9]], [[10, 26], ["B", 10]], [[11, 27], ["B", 11]], [[12, 28], ["B", 12]], [[13, 29], ["B", 13]], [[14, 30], ["B", 14]], [[15, 132], ["B", 15]], [[34, 35], ["D", 1]], [[35, 36], ["D", 2]], [[36, 37], ["D", 3]], [[37, 38], ["D", 4]], [[38, 39], ["D", 5]], [[39, 40], ["D", 6]], [[43, 44], ["C", 1]], [[44, 45], ["C", 2]], [[45, 46], ["C", 3]], [[49, 50], ["circle", 1]], [[50, 51], ["circle", 2]], [[51, 52], ["circle", 3]], [[52, 53], ["circle", 4]], [[53, 54], ["circle", 5]], [[54, 55], ["circle", 6]], [[55, 56], ["circle", 7]], [[56, 57], ["circle", 8]], [[57, 58], ["circle", 9]], [[58, 59], ["circle", 10]], [[59, 60], ["circle", 11]], [[60, 61], ["circle", 12]], [[61, 62], ["circle", 13]]];
      candidate = [];
      for (i = 0, len = map.length; i < len; i++) {
        _map = map[i];
        ref = _map[0], a = ref[0], b = ref[1];
        beacon_a = beacons.filter(function(_item) {
          return _item.rssi !== 0 && _item.minor === a;
        });
        beacon_b = beacons.filter(function(_item) {
          return _item.rssi !== 0 && _item.minor === b;
        });
        if (beacon_a.length > 0 && beacon_b.length > 0) {
          candidate.push({
            rssi: (beacon_a[0].rssi + beacon_b[0].rssi) / 2,
            point: _map[1]
          });
        }
      }
      candidate.sort(function(x, y) {
        return y.rssi - x.rssi;
      });
      try {
        if (filter_near > 0 && candidate.length > 1 && candidate[0].rssi - candidate[1].rssi <= filter_near) {
          return null;
        }
        return candidate[0].point;
      } catch (error) {
        e = error;
        return null;
      }
    };
    nearest2_v21 = function(beacons, filter_near, check_nearest) {
      var _map, a, b, beacon_a, beacon_b, candidate, i, len, map, ref;
      if (filter_near == null) {
        filter_near = 0;
      }
      if (check_nearest == null) {
        check_nearest = true;
      }
      map = [[[133, 116], ["A", 0]], [[101, 117], ["A", 1]], [[102, 118], ["A", 2]], [[103, 119], ["A", 3]], [[104, 120], ["A", 4]], [[105, 121], ["A", 5]], [[106, 122], ["A", 6]], [[107, 123], ["A", 7]], [[108, 124], ["A", 8]], [[109, 125], ["A", 9]], [[110, 126], ["A", 10]], [[111, 127], ["A", 11]], [[112, 128], ["A", 12]], [[113, 129], ["A", 13]], [[114, 130], ["A", 14]], [[115, 134], ["A", 15]], [[131, 16], ["B", 0]], [[1, 17], ["B", 1]], [[2, 18], ["B", 2]], [[3, 19], ["B", 3]], [[4, 20], ["B", 4]], [[5, 21], ["B", 5]], [[6, 22], ["B", 6]], [[7, 23], ["B", 7]], [[8, 24], ["B", 8]], [[9, 25], ["B", 9]], [[10, 26], ["B", 10]], [[11, 27], ["B", 11]], [[12, 28], ["B", 12]], [[13, 29], ["B", 13]], [[14, 30], ["B", 14]], [[15, 132], ["B", 15]], [[34, 35], ["D", 1]], [[35, 36], ["D", 2]], [[36, 37], ["D", 3]], [[37, 38], ["D", 4]], [[38, 39], ["D", 5]], [[39, 40], ["D", 6]], [[43, 44], ["C", 1]], [[44, 45], ["C", 2]], [[45, 46], ["C", 3]], [[49, 50], ["circle", 1]], [[50, 51], ["circle", 2]], [[51, 52], ["circle", 3]], [[52, 53], ["circle", 4]], [[53, 54], ["circle", 5]], [[54, 55], ["circle", 6]], [[55, 56], ["circle", 7]], [[56, 57], ["circle", 8]], [[57, 58], ["circle", 9]], [[58, 59], ["circle", 10]], [[59, 60], ["circle", 11]], [[60, 61], ["circle", 12]], [[61, 62], ["circle", 13]]];
      beacons = beacons.filter(function(_item) {
        return _item.rssi !== 0;
      });
      candidate = [];
      for (i = 0, len = map.length; i < len; i++) {
        _map = map[i];
        ref = _map[0], a = ref[0], b = ref[1];
        beacon_a = beacons.filter(function(_item) {
          return _item.minor === a;
        });
        beacon_b = beacons.filter(function(_item) {
          return _item.minor === b;
        });
        if (beacon_a.length > 0 && beacon_b.length > 0) {
          candidate.push({
            rssi: (beacon_a[0].rssi + beacon_b[0].rssi) / 2,
            point: _map[1],
            minor: _map[0]
          });
        }
      }
      if (candidate.length === 0) {
        return null;
      }
      candidate.sort(function(x, y) {
        return y.rssi - x.rssi;
      });
      if (filter_near > 0) {
        if (candidate.length > 1 && candidate[0]['rssi'] - candidate[1]['rssi'] <= filter_near) {
          return null;
        }
      }
      if (check_nearest) {
        beacons.sort(function(x, y) {
          return y.rssi - x.rssi;
        });
        if (candidate[0].minor.indexOf(beacons[0]['minor']) === -1) {
          return null;
        }
      }
      return candidate[0].point;
    };
    d = this.buffer.last(WINDOW_SIZE)[0];
    accuracy = 1;
    ret = nearestD(d, this.compass, 6);
    algorithm = 'nearestD';
    if (ret == null) {
      ret = nearest2_v21(d, 3);
      algorithm = 'nearest2';
      if (ret == null) {
        accuracy = 0.6;
        ret = nearest1(d, 6);
        algorithm = 'nearest1';
        if (ret == null) {
          accuracy = 0.3;
          ret = nearest2_v21(d, 1);
          algorithm = 'nearest2';
          if (ret == null) {
            ret = nearest1(d);
            accuracy = 0;
            if (ret == null) {
              accuracy = 0;
              algorithm = null;
            }
          }
        }
      }
    }
    this.positionAccuracy = accuracy;
    if (ret != null) {
      p = POINT_2_LATLNG.filter(function(row) {
        return row.lane === ret[0] && row.point === ret[1];
      })[0];
      if (p != null) {
        if (true) {
          this.lane = p.lane;
          this.position = p.point;
          this.positionLatLng = p.latlng;
        }
      }
    }
    d = d.filter(function(_b) {
      return _b.rssi !== 0;
    });
    d.sort(function(_a, _b) {
      return _b.rssi - _a.rssi;
    });
    text = JSON.stringify({
      accuracy: accuracy != null ? accuracy : null,
      algorithm: algorithm != null ? algorithm : null,
      rssi: {
        0: String((ref = d[0]) != null ? ref.minor : void 0) + ' ' + String((ref1 = d[0]) != null ? ref1.rssi : void 0),
        1: String((ref2 = d[1]) != null ? ref2.minor : void 0) + ' ' + String((ref3 = d[1]) != null ? ref3.rssi : void 0),
        diff: ((ref4 = d[0]) != null ? ref4.rssi : void 0) - ((ref5 = d[1]) != null ? ref5.rssi : void 0)
      }
    }, null, 2);
    $('#info').text(text);
    return true;
  };

  Kanikama.prototype.sabaePositionDetector2F = function() {
    var POINT_2_LATLNG, WINDOW_SIZE, accuracy, algorithm, d, nearest1, nearest2_v21, nearestD, p, ref, ref1, ref2, ref3, ref4, ref5, ret, text;
    WINDOW_SIZE = 1;
    POINT_2_LATLNG = [
      {
        'lane': 'A',
        'latlng': [136.18664149707814, 35.961922650475515],
        'point': 1
      }, {
        'lane': 'A',
        'latlng': [136.18664090411215, 35.96190136111812],
        'point': 2
      }, {
        'lane': 'A',
        'latlng': [136.1866403474554, 35.961880744854575],
        'point': 3
      }, {
        'lane': 'A',
        'latlng': [136.18663936665007, 35.96186050324796],
        'point': 4
      }, {
        'lane': 'A',
        'latlng': [136.18663798543406, 35.96183901695468],
        'point': 5
      }, {
        'lane': 'A',
        'latlng': [136.186636778032, 35.961818693439],
        'point': 6
      }, {
        'lane': 'A',
        'latlng': [136.18663599524763, 35.961800063339226],
        'point': 7
      }, {
        'lane': 'A',
        'latlng': [136.18664209004413, 35.961943939832906],
        'point': 0
      }, {
        'lane': 'A',
        'latlng': [136.18663521246324, 35.96178143323945],
        'point': 8
      }, {
        'lane': 'B',
        'latlng': [136.1865081258662, 35.961814383130005],
        'point': 1
      }, {
        'lane': 'B',
        'latlng': [136.18649116148566, 35.9618149826434],
        'point': 2
      }, {
        'lane': 'B',
        'latlng': [136.18647231217363, 35.96181564876941],
        'point': 3
      }, {
        'lane': 'B',
        'latlng': [136.18645268671315, 35.96181634232413],
        'point': 4
      }, {
        'lane': 'B',
        'latlng': [136.18652509024673, 35.961813783616606],
        'point': 0
      }, {
        'lane': 'B',
        'latlng': [136.18643306125267, 35.961817035878845],
        'point': 5
      }, {
        'lane': 'C',
        'latlng': [136.18648076714635, 35.961876628358254],
        'point': 1
      }, {
        'lane': 'C',
        'latlng': [136.1864798667226, 35.96185993563094],
        'point': 2
      }, {
        'lane': 'C',
        'latlng': [136.1865110434673, 35.96185096612878],
        'point': 3
      }, {
        'lane': 'C',
        'latlng': [136.18654306739097, 35.961857702149636],
        'point': 4
      }, {
        'lane': 'C',
        'latlng': [136.18654415108932, 35.96187470310983],
        'point': 5
      }, {
        'lane': 'C',
        'latlng': [136.1864816675701, 35.96189332108557],
        'point': 0
      }, {
        'lane': 'C',
        'latlng': [136.18654523478767, 35.96189170407002],
        'point': 6
      }, {
        'lane': 'D',
        'latlng': [136.18655039499117, 35.961835998008716],
        'point': 1
      }, {
        'lane': 'E',
        'latlng': [136.18659600073724, 35.961966833958826],
        'point': 1
      }, {
        'lane': 'E',
        'latlng': [136.18658901475447, 35.961985603727015],
        'point': 2
      }, {
        'lane': 'E',
        'latlng': [136.18657058471123, 35.96198580545023],
        'point': 3
      }, {
        'lane': 'E',
        'latlng': [136.18655019274166, 35.96198670592536],
        'point': 4
      }, {
        'lane': 'F',
        'latlng': [136.1865445207419, 35.96173945498899],
        'point': 1
      }
    ];
    nearest1 = function(beacons, filter_near) {
      var e, error, map;
      if (filter_near == null) {
        filter_near = 0;
      }
      map = {
        "76": ["A", 0],
        "83": ["A", 8],
        "71": ["B", 0],
        "75": ["B", 5],
        "64": ["C", 0],
        "69": ["C", 6],
        "70": ["D", 1],
        "85": ["E", 1],
        "86": ["E", 2],
        "87": ["E", 3],
        "88": ["E", 4],
        "84": ["F", 1]
      };
      beacons = beacons.filter(function(_b) {
        return _b.rssi !== 0;
      });
      beacons.sort(function(_a, _b) {
        return _b.rssi - _a.rssi;
      });
      try {
        if (filter_near > 0 && beacons.length > 1 && beacons[0].rssi - beacons[1].rssi <= filter_near) {
          return null;
        }
        return map[beacons[0].minor];
      } catch (error) {
        e = error;
        return null;
      }
    };
    nearestD = function(beacons, heading, filter_near) {
      var _heading, _map, e, error, heading_offset, map, offsets, wide;
      if (filter_near == null) {
        filter_near = 0;
      }
      map = {};
      offsets = {
        'A': 90,
        'C': 90
      };
      beacons = beacons.filter(function(_b) {
        return _b.rssi !== 0;
      });
      beacons.sort(function(_a, _b) {
        return _b.rssi - _a.rssi;
      });
      try {
        if (filter_near > 0 && beacons.length > 1 && beacons[0]['rssi'] - beacons[1]['rssi'] < filter_near) {
          return null;
        }
        _map = map[beacons[0].minor];
        heading_offset = offsets[_map[0][0]];
        wide = 90;
        _heading = heading + heading_offset;
        if (_heading < 0) {
          _heading = 360 - _heading;
        }
        if (_heading >= 360) {
          _heading = _heading - 360;
        }
        console.log(heading);
        if ((90 - wide / 2 < _heading && _heading < 90 + wide / 2)) {
          return _map[1];
        }
        if ((270 - wide / 2 < _heading && _heading < 270 + wide / 2)) {
          return _map[0];
        }
        return null;
      } catch (error) {
        e = error;
        return null;
      }
    };
    nearest2_v21 = function(beacons, filter_near, check_nearest) {
      var _map, a, b, beacon_a, beacon_b, candidate, i, len, map, ref;
      if (filter_near == null) {
        filter_near = 0;
      }
      if (check_nearest == null) {
        check_nearest = true;
      }
      map = [[[76, 77], ["A", 1]], [[77, 78], ["A", 2]], [[78, 79], ["A", 3]], [[79, 80], ["A", 4]], [[80, 81], ["A", 5]], [[81, 82], ["A", 6]], [[82, 83], ["A", 7]], [[71, 72], ["B", 1]], [[72, 73], ["B", 2]], [[73, 74], ["B", 3]], [[74, 75], ["B", 4]], [[64, 65], ["C", 1]], [[65, 66], ["C", 2]], [[66, 67], ["C", 3]], [[67, 68], ["C", 4]], [[68, 69], ["C", 5]]];
      beacons = beacons.filter(function(_item) {
        return _item.rssi !== 0;
      });
      candidate = [];
      for (i = 0, len = map.length; i < len; i++) {
        _map = map[i];
        ref = _map[0], a = ref[0], b = ref[1];
        beacon_a = beacons.filter(function(_item) {
          return _item.minor === a;
        });
        beacon_b = beacons.filter(function(_item) {
          return _item.minor === b;
        });
        if (beacon_a.length > 0 && beacon_b.length > 0) {
          candidate.push({
            rssi: (beacon_a[0].rssi + beacon_b[0].rssi) / 2,
            point: _map[1],
            minor: _map[0]
          });
        }
      }
      if (candidate.length === 0) {
        return null;
      }
      candidate.sort(function(x, y) {
        return y.rssi - x.rssi;
      });
      if (filter_near > 0) {
        if (candidate.length > 1 && candidate[0]['rssi'] - candidate[1]['rssi'] <= filter_near) {
          return null;
        }
      }
      if (check_nearest) {
        beacons.sort(function(x, y) {
          return y.rssi - x.rssi;
        });
        if (candidate[0].minor.indexOf(beacons[0]['minor']) === -1) {
          return null;
        }
      }
      return candidate[0].point;
    };
    d = this.buffer.last(WINDOW_SIZE)[0];
    accuracy = 1;
    ret = nearestD(d, this.compass, 6);
    algorithm = 'nearestD';
    if (ret == null) {
      ret = nearest2_v21(d, 3);
      algorithm = 'nearest2';
      if (ret == null) {
        accuracy = 0.9;
        ret = nearest1(d, 6);
        algorithm = 'nearest1';
        if (ret == null) {
          accuracy = 0.3;
          ret = nearest2_v21(d, 1);
          algorithm = 'nearest2';
          if (ret == null) {
            ret = nearest1(d);
            accuracy = 0;
            if (ret == null) {
              accuracy = 0;
              algorithm = null;
            }
          }
        }
      }
    }
    this.positionAccuracy = accuracy;
    if (ret != null) {
      p = POINT_2_LATLNG.filter(function(row) {
        return row.lane === ret[0] && row.point === ret[1];
      })[0];
      if (p != null) {
        if (true) {
          this.lane = p.lane;
          this.position = p.point;
          this.positionLatLng = p.latlng;
        }
      }
    }
    d = d.filter(function(_b) {
      return _b.rssi !== 0;
    });
    d.sort(function(_a, _b) {
      return _b.rssi - _a.rssi;
    });
    text = JSON.stringify({
      accuracy: accuracy != null ? accuracy : null,
      algorithm: algorithm != null ? algorithm : null,
      rssi: {
        0: String((ref = d[0]) != null ? ref.minor : void 0) + ' ' + String((ref1 = d[0]) != null ? ref1.rssi : void 0),
        1: String((ref2 = d[1]) != null ? ref2.minor : void 0) + ' ' + String((ref3 = d[1]) != null ? ref3.rssi : void 0),
        diff: ((ref4 = d[0]) != null ? ref4.rssi : void 0) - ((ref5 = d[1]) != null ? ref5.rssi : void 0)
      }
    }, null, 2);
    $('#info').text(text);
    return true;
  };

  Kanikama.prototype.rssiToAccuracy = function(rssi) {
    if (rssi > -59) {
      return 10;
    }
    return 10 / (1 - (rssi + 59) * 10 / 20);
  };

  Kanikama.prototype.onChangeFloor = function() {};

  Kanikama.prototype.sabaePositionDetectorV2 = function() {
    var POINT_2_LATLNG, WINDOW_SIZE, accuracy, algorithm, d, nearest1, nearest2, nearest2_v21, nearestD, p, ref, ref1, ref2, ref3, ref4, ref5, ret, text;
    WINDOW_SIZE = 1;
    POINT_2_LATLNG = [
      {
        "lane": "A",
        "latlng": [136.1863696569712, 35.96191126156543],
        "point": 0
      }, {
        "lane": "A",
        "latlng": [136.18639230648637, 35.961905875380126],
        "point": 1
      }, {
        "lane": "A",
        "latlng": [136.18641398322058, 35.96190510933523],
        "point": 2
      }, {
        "lane": "A",
        "latlng": [136.18643599258996, 35.96190433153515],
        "point": 3
      }, {
        "lane": "A",
        "latlng": [136.18645773928517, 35.9619038327686],
        "point": 4
      }, {
        "lane": "A",
        "latlng": [136.18647856748686, 35.96190278200115],
        "point": 5
      }, {
        "lane": "A",
        "latlng": [136.18650040327566, 35.961901875459894],
        "point": 6
      }, {
        "lane": "A",
        "latlng": [136.1865213689799, 35.961901314376206],
        "point": 7
      }, {
        "lane": "A",
        "latlng": [136.18654250584308, 35.96190083716078],
        "point": 8
      }, {
        "lane": "A",
        "latlng": [136.18656499963947, 35.961899772490426],
        "point": 9
      }, {
        "lane": "A",
        "latlng": [136.18658784059397, 35.96189896530245],
        "point": 10
      }, {
        "lane": "A",
        "latlng": [136.18661084786532, 35.96189815223689],
        "point": 11
      }, {
        "lane": "A",
        "latlng": [136.18663180388558, 35.96189741166151],
        "point": 12
      }, {
        "lane": "A",
        "latlng": [136.18665458939978, 35.96189660643273],
        "point": 13
      }, {
        "lane": "A",
        "latlng": [136.18667804018332, 35.96189577769361],
        "point": 14
      }, {
        "lane": "A",
        "latlng": [136.1867014335756, 35.961896974113614],
        "point": 15
      }, {
        "lane": "B",
        "latlng": [136.1863645958551, 35.96181743228368],
        "point": 0
      }, {
        "lane": "B",
        "latlng": [136.18638732106814, 35.96181653926824],
        "point": 1
      }, {
        "lane": "B",
        "latlng": [136.18641004628117, 35.9618156462528],
        "point": 2
      }, {
        "lane": "B",
        "latlng": [136.18643200502703, 35.96181496015777],
        "point": 3
      }, {
        "lane": "B",
        "latlng": [136.18645278986847, 35.96181413571413],
        "point": 4
      }, {
        "lane": "B",
        "latlng": [136.1864736807471, 35.961813217606256],
        "point": 5
      }, {
        "lane": "B",
        "latlng": [136.18649558647337, 35.96181257834334],
        "point": 6
      }, {
        "lane": "B",
        "latlng": [136.18651775487186, 35.961811660046926],
        "point": 7
      }, {
        "lane": "B",
        "latlng": [136.18653859515052, 35.961810833644094],
        "point": 8
      }, {
        "lane": "B",
        "latlng": [136.18655994164337, 35.96181012422727],
        "point": 9
      }, {
        "lane": "B",
        "latlng": [136.18658300674903, 35.96180935407544],
        "point": 10
      }, {
        "lane": "B",
        "latlng": [136.18660594887302, 35.96180836347738],
        "point": 11
      }, {
        "lane": "B",
        "latlng": [136.18662703027113, 35.96180788822115],
        "point": 12
      }, {
        "lane": "B",
        "latlng": [136.18664930228374, 35.96180683138758],
        "point": 13
      }, {
        "lane": "B",
        "latlng": [136.1866731362736, 35.961805899188256],
        "point": 14
      }, {
        "lane": "B",
        "latlng": [136.18669697026348, 35.961804966988936],
        "point": 15
      }, {
        "lane": "C",
        "latlng": [136.18682401061682, 35.96193899448264],
        "point": 0
      }, {
        "lane": "C",
        "latlng": [136.18682305444435, 35.96192126967809],
        "point": 1
      }, {
        "lane": "C",
        "latlng": [136.18682209827188, 35.96190354487355],
        "point": 2
      }, {
        "lane": "C",
        "latlng": [136.18682121956186, 35.96188725600254],
        "point": 3
      }, {
        "lane": "C",
        "latlng": [136.18682034085185, 35.96187096713153],
        "point": 4
      }, {
        "lane": "D",
        "latlng": [136.18627489493238, 35.96194931833726],
        "point": 0
      }, {
        "lane": "D",
        "latlng": [136.18627392194043, 35.96193127942226],
        "point": 1
      }, {
        "lane": "D",
        "latlng": [136.18627294894847, 35.96191324050726],
        "point": 2
      }, {
        "lane": "D",
        "latlng": [136.1862719807977, 35.96189529133811],
        "point": 3
      }, {
        "lane": "D",
        "latlng": [136.18627098118253, 35.96187675882095],
        "point": 4
      }, {
        "lane": "D",
        "latlng": [136.18626991863806, 35.96185705960781],
        "point": 5
      }, {
        "lane": "D",
        "latlng": [136.18627059384187, 35.961836624606605],
        "point": 6
      }, {
        "lane": "main",
        "latlng": [136.18630578213975, 35.96186289564538],
        "point": 0
      }, {
        "lane": "main",
        "latlng": [136.1863093982123, 35.96192993579218],
        "point": 1
      }, {
        "lane": "main",
        "latlng": [136.18624939353526, 35.961974946694816],
        "point": 2
      }, {
        "lane": "main",
        "latlng": [136.1865991356181, 35.96199405792012],
        "point": 3
      }, {
        "lane": "main",
        "latlng": [136.18667132039457, 35.96206775650696],
        "point": 4
      }, {
        "lane": "main",
        "latlng": [136.186868095626, 35.961953082088385],
        "point": 5
      }, {
        "lane": "main",
        "latlng": [136.1868959775686, 35.961924222503306],
        "point": 6
      }, {
        "lane": "main",
        "latlng": [136.18645326254045, 35.96199795415883],
        "point": 7
      }, {
        "lane": "circle",
        "latlng": [136.18688711744204, 35.96182176055322],
        "point": 0
      }, {
        "lane": "circle",
        "latlng": [136.18690607068305, 35.96180139894392],
        "point": 1
      }, {
        "lane": "circle",
        "latlng": [136.18692502392406, 35.96178103733462],
        "point": 2
      }, {
        "lane": "circle",
        "latlng": [136.18693411312233, 35.96175801209845],
        "point": 3
      }, {
        "lane": "circle",
        "latlng": [136.18693403260326, 35.96173283820016],
        "point": 4
      }, {
        "lane": "circle",
        "latlng": [136.1869257398401, 35.96170781964384],
        "point": 5
      }, {
        "lane": "circle",
        "latlng": [136.186907531943, 35.96168845658414],
        "point": 6
      }, {
        "lane": "circle",
        "latlng": [136.1868815979032, 35.96167620025106],
        "point": 7
      }, {
        "lane": "circle",
        "latlng": [136.18685298727485, 35.961669928067366],
        "point": 8
      }, {
        "lane": "circle",
        "latlng": [136.18682419286148, 35.96167157506923],
        "point": 9
      }, {
        "lane": "circle",
        "latlng": [136.1867980468882, 35.96168113108361],
        "point": 10
      }, {
        "lane": "circle",
        "latlng": [136.18677661682983, 35.961695735621504],
        "point": 11
      }, {
        "lane": "circle",
        "latlng": [136.18676168883835, 35.96171555035333],
        "point": 12
      }, {
        "lane": "circle",
        "latlng": [136.18675283853224, 35.9617399158996],
        "point": 13
      }, {
        "lane": "circle",
        "latlng": [136.18674398822614, 35.961764281445866],
        "point": 14
      }
    ];
    nearest1 = function(beacons, filter_near) {
      var e, error, map;
      if (filter_near == null) {
        filter_near = 0;
      }
      map = {
        "131": ["B", 0],
        "1": ["B", 1],
        "2": ["B", 2],
        "3": ["B", 3],
        "4": ["B", 4],
        "5": ["B", 5],
        "6": ["B", 6],
        "7": ["B", 7],
        "8": ["B", 8],
        "9": ["B", 9],
        "10": ["B", 10],
        "11": ["B", 11],
        "12": ["B", 12],
        "13": ["B", 13],
        "14": ["B", 14],
        "15": ["B", 15],
        "16": ["B", 0],
        "17": ["B", 1],
        "18": ["B", 2],
        "19": ["B", 3],
        "20": ["B", 4],
        "21": ["B", 5],
        "22": ["B", 6],
        "23": ["B", 7],
        "24": ["B", 8],
        "25": ["B", 9],
        "26": ["B", 10],
        "27": ["B", 11],
        "28": ["B", 12],
        "29": ["B", 13],
        "30": ["B", 14],
        "132": ["B", 15],
        "133": ["A", 0],
        "101": ["A", 1],
        "102": ["A", 2],
        "103": ["A", 3],
        "104": ["A", 4],
        "105": ["A", 5],
        "106": ["A", 6],
        "107": ["A", 7],
        "108": ["A", 8],
        "109": ["A", 9],
        "110": ["A", 10],
        "111": ["A", 11],
        "112": ["A", 12],
        "113": ["A", 13],
        "114": ["A", 14],
        "115": ["A", 15],
        "116": ["A", 0],
        "117": ["A", 1],
        "118": ["A", 2],
        "119": ["A", 3],
        "120": ["A", 4],
        "121": ["A", 5],
        "122": ["A", 6],
        "123": ["A", 7],
        "124": ["A", 8],
        "125": ["A", 9],
        "126": ["A", 10],
        "127": ["A", 11],
        "128": ["A", 12],
        "129": ["A", 13],
        "130": ["A", 14],
        "134": ["A", 15],
        "48": ["main", 6],
        "33": ["main", 2],
        "32": ["main", 1],
        "31": ["main", 0],
        "42": ["main", 4],
        "41": ["main", 3],
        "63": ["main", 7],
        "47": ["main", 5]
      };
      beacons = beacons.filter(function(_b) {
        return _b.rssi !== 0;
      });
      beacons.sort(function(_a, _b) {
        return _b.rssi - _a.rssi;
      });
      try {
        if (filter_near > 0 && beacons.length > 1 && beacons[0].rssi - beacons[1].rssi <= filter_near) {
          return null;
        }
        return map[beacons[0].minor];
      } catch (error) {
        e = error;
        return null;
      }
    };
    nearestD = function(beacons, heading, filter_near) {
      var i, len, map, p, ref;
      if (filter_near == null) {
        filter_near = 0;
      }
      map = [
        {
          beacon: 40,
          point: ["D", 6],
          offset: 270,
          wide: 90
        }, {
          beacon: 39,
          point: ["D", 5],
          offset: 270,
          wide: 90
        }, {
          beacon: 38,
          point: ["D", 4],
          offset: 270,
          wide: 90
        }, {
          beacon: 37,
          point: ["D", 3],
          offset: 270,
          wide: 90
        }, {
          beacon: 36,
          point: ["D", 2],
          offset: 270,
          wide: 90
        }, {
          beacon: 35,
          point: ["D", 1],
          offset: 270,
          wide: 90
        }, {
          beacon: 34,
          point: ["D", 0],
          offset: 270,
          wide: 90
        }, {
          beacon: 46,
          point: ["C", 3],
          offset: 270,
          wide: 90
        }, {
          beacon: 45,
          point: ["C", 2],
          offset: 270,
          wide: 90
        }, {
          beacon: 44,
          point: ["C", 1],
          offset: 270,
          wide: 90
        }, {
          beacon: 43,
          point: ["C", 0],
          offset: 270,
          wide: 90
        }, {
          beacon: 40,
          point: ["D", 7],
          offset: 90,
          wide: 90
        }, {
          beacon: 39,
          point: ["D", 6],
          offset: 90,
          wide: 90
        }, {
          beacon: 38,
          point: ["D", 5],
          offset: 90,
          wide: 90
        }, {
          beacon: 37,
          point: ["D", 4],
          offset: 90,
          wide: 90
        }, {
          beacon: 36,
          point: ["D", 3],
          offset: 90,
          wide: 90
        }, {
          beacon: 35,
          point: ["D", 2],
          offset: 90,
          wide: 90
        }, {
          beacon: 34,
          point: ["D", 1],
          offset: 90,
          wide: 90
        }, {
          beacon: 46,
          point: ["C", 4],
          offset: 90,
          wide: 90
        }, {
          beacon: 45,
          point: ["C", 3],
          offset: 90,
          wide: 90
        }, {
          beacon: 44,
          point: ["C", 2],
          offset: 90,
          wide: 90
        }, {
          beacon: 43,
          point: ["C", 1],
          offset: 90,
          wide: 90
        }
      ];
      beacons = beacons.filter(function(_b) {
        return _b.rssi !== 0;
      });
      beacons.sort(function(_a, _b) {
        return _b.rssi - _a.rssi;
      });
      if (filter_near > 0 && beacons.length > 1 && beacons[0]['rssi'] - beacons[1]['rssi'] < filter_near) {
        return null;
      }
      for (i = 0, len = map.length; i < len; i++) {
        p = map[i];
        if (p.beacon === beacons[0].minor) {
          if (((90 - p.wide / 2) < (ref = (heading + p.offset) % 360) && ref < (90 + p.wide / 2))) {
            return p.point;
          }
        }
      }
      return null;
    };
    nearest2 = function(beacons, filter_near) {
      var _map, a, b, beacon_a, beacon_b, candidate, e, error, i, len, map, ref;
      if (filter_near == null) {
        filter_near = 0;
      }
      map = [[[133, 116], ["A", 0]], [[101, 117], ["A", 1]], [[102, 118], ["A", 2]], [[103, 119], ["A", 3]], [[104, 120], ["A", 4]], [[105, 121], ["A", 5]], [[106, 122], ["A", 6]], [[107, 123], ["A", 7]], [[108, 124], ["A", 8]], [[109, 125], ["A", 9]], [[110, 126], ["A", 10]], [[111, 127], ["A", 11]], [[112, 128], ["A", 12]], [[113, 129], ["A", 13]], [[114, 130], ["A", 14]], [[115, 134], ["A", 15]], [[131, 16], ["B", 0]], [[1, 17], ["B", 1]], [[2, 18], ["B", 2]], [[3, 19], ["B", 3]], [[4, 20], ["B", 4]], [[5, 21], ["B", 5]], [[6, 22], ["B", 6]], [[7, 23], ["B", 7]], [[8, 24], ["B", 8]], [[9, 25], ["B", 9]], [[10, 26], ["B", 10]], [[11, 27], ["B", 11]], [[12, 28], ["B", 12]], [[13, 29], ["B", 13]], [[14, 30], ["B", 14]], [[15, 132], ["B", 15]], [[34, 35], ["D", 1]], [[35, 36], ["D", 2]], [[36, 37], ["D", 3]], [[37, 38], ["D", 4]], [[38, 39], ["D", 5]], [[39, 40], ["D", 6]], [[43, 44], ["C", 1]], [[44, 45], ["C", 2]], [[45, 46], ["C", 3]], [[49, 50], ["circle", 1]], [[50, 51], ["circle", 2]], [[51, 52], ["circle", 3]], [[52, 53], ["circle", 4]], [[53, 54], ["circle", 5]], [[54, 55], ["circle", 6]], [[55, 56], ["circle", 7]], [[56, 57], ["circle", 8]], [[57, 58], ["circle", 9]], [[58, 59], ["circle", 10]], [[59, 60], ["circle", 11]], [[60, 61], ["circle", 12]], [[61, 62], ["circle", 13]]];
      candidate = [];
      for (i = 0, len = map.length; i < len; i++) {
        _map = map[i];
        ref = _map[0], a = ref[0], b = ref[1];
        beacon_a = beacons.filter(function(_item) {
          return _item.rssi !== 0 && _item.minor === a;
        });
        beacon_b = beacons.filter(function(_item) {
          return _item.rssi !== 0 && _item.minor === b;
        });
        if (beacon_a.length > 0 && beacon_b.length > 0) {
          candidate.push({
            rssi: (beacon_a[0].rssi + beacon_b[0].rssi) / 2,
            point: _map[1]
          });
        }
      }
      candidate.sort(function(x, y) {
        return y.rssi - x.rssi;
      });
      try {
        if (filter_near > 0 && candidate.length > 1 && candidate[0].rssi - candidate[1].rssi <= filter_near) {
          return null;
        }
        return candidate[0].point;
      } catch (error) {
        e = error;
        return null;
      }
    };
    nearest2_v21 = function(beacons, filter_near, check_nearest) {
      var _map, a, b, beacon_a, beacon_b, candidate, i, len, map, ref;
      if (filter_near == null) {
        filter_near = 0;
      }
      if (check_nearest == null) {
        check_nearest = true;
      }
      map = [[[133, 116], ["A", 0]], [[101, 117], ["A", 1]], [[102, 118], ["A", 2]], [[103, 119], ["A", 3]], [[104, 120], ["A", 4]], [[105, 121], ["A", 5]], [[106, 122], ["A", 6]], [[107, 123], ["A", 7]], [[108, 124], ["A", 8]], [[109, 125], ["A", 9]], [[110, 126], ["A", 10]], [[111, 127], ["A", 11]], [[112, 128], ["A", 12]], [[113, 129], ["A", 13]], [[114, 130], ["A", 14]], [[115, 134], ["A", 15]], [[131, 16], ["B", 0]], [[1, 17], ["B", 1]], [[2, 18], ["B", 2]], [[3, 19], ["B", 3]], [[4, 20], ["B", 4]], [[5, 21], ["B", 5]], [[6, 22], ["B", 6]], [[7, 23], ["B", 7]], [[8, 24], ["B", 8]], [[9, 25], ["B", 9]], [[10, 26], ["B", 10]], [[11, 27], ["B", 11]], [[12, 28], ["B", 12]], [[13, 29], ["B", 13]], [[14, 30], ["B", 14]], [[15, 132], ["B", 15]], [[34, 35], ["D", 1]], [[35, 36], ["D", 2]], [[36, 37], ["D", 3]], [[37, 38], ["D", 4]], [[38, 39], ["D", 5]], [[39, 40], ["D", 6]], [[43, 44], ["C", 1]], [[44, 45], ["C", 2]], [[45, 46], ["C", 3]], [[49, 50], ["circle", 1]], [[50, 51], ["circle", 2]], [[51, 52], ["circle", 3]], [[52, 53], ["circle", 4]], [[53, 54], ["circle", 5]], [[54, 55], ["circle", 6]], [[55, 56], ["circle", 7]], [[56, 57], ["circle", 8]], [[57, 58], ["circle", 9]], [[58, 59], ["circle", 10]], [[59, 60], ["circle", 11]], [[60, 61], ["circle", 12]], [[61, 62], ["circle", 13]]];
      beacons = beacons.filter(function(_item) {
        return _item.rssi !== 0;
      });
      candidate = [];
      for (i = 0, len = map.length; i < len; i++) {
        _map = map[i];
        ref = _map[0], a = ref[0], b = ref[1];
        beacon_a = beacons.filter(function(_item) {
          return _item.minor === a;
        });
        beacon_b = beacons.filter(function(_item) {
          return _item.minor === b;
        });
        if (beacon_a.length > 0 && beacon_b.length > 0) {
          candidate.push({
            rssi: (beacon_a[0].rssi + beacon_b[0].rssi) / 2,
            point: _map[1],
            minor: _map[0]
          });
        }
      }
      if (candidate.length === 0) {
        return null;
      }
      candidate.sort(function(x, y) {
        return y.rssi - x.rssi;
      });
      if (filter_near > 0) {
        if (candidate.length > 1 && candidate[0]['rssi'] - candidate[1]['rssi'] <= filter_near) {
          return null;
        }
      }
      if (check_nearest) {
        beacons.sort(function(x, y) {
          return y.rssi - x.rssi;
        });
        if (candidate[0].minor.indexOf(beacons[0]['minor']) === -1) {
          return null;
        }
      }
      return candidate[0].point;
    };
    d = this.buffer.last(WINDOW_SIZE)[0];
    accuracy = 1;
    ret = nearestD(d, this.compass, 6);
    algorithm = 'nearestD';
    if (ret == null) {
      ret = nearest2_v21(d, 3);
      algorithm = 'nearest2';
      if (ret == null) {
        accuracy = 0.6;
        ret = nearest1(d, 6);
        algorithm = 'nearest1';
        if (ret == null) {
          accuracy = 0.3;
          ret = nearest2_v21(d, 1);
          algorithm = 'nearest2';
          if (ret == null) {
            ret = nearest1(d);
            accuracy = 0;
            if (ret == null) {
              accuracy = 0;
              algorithm = null;
            }
          }
        }
      }
    }
    this.algorithm = algorithm;
    this.positionAccuracy = accuracy;
    if (ret != null) {
      p = POINT_2_LATLNG.filter(function(row) {
        return row.lane === ret[0] && row.point === ret[1];
      })[0];
      if (p != null) {
        if (true) {
          this.lane = p.lane;
          this.position = p.point;
          this.positionLatLng = p.latlng;
        }
      }
    }
    d = d.filter(function(_b) {
      return _b.rssi !== 0;
    });
    d.sort(function(_a, _b) {
      return _b.rssi - _a.rssi;
    });
    text = JSON.stringify({
      accuracy: accuracy != null ? accuracy : null,
      algorithm: algorithm != null ? algorithm : null,
      rssi: {
        0: String((ref = d[0]) != null ? ref.minor : void 0) + ' ' + String((ref1 = d[0]) != null ? ref1.rssi : void 0),
        1: String((ref2 = d[1]) != null ? ref2.minor : void 0) + ' ' + String((ref3 = d[1]) != null ? ref3.rssi : void 0),
        diff: ((ref4 = d[0]) != null ? ref4.rssi : void 0) - ((ref5 = d[1]) != null ? ref5.rssi : void 0)
      }
    }, null, 2);
    $('#info').text(text);
    return true;
  };

  return Kanikama;

})();
