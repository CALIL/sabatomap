var SABAE, appTest_1f, appTest_2f, didRangeBeaconsInRegion, facilityTable, homeRotaion, initializeApp, initializeCordovaPlugin, kLayer, kanikama, kanimarker, loadFloor, map, view;

view = new ol.View({
  center: [15139450.747885207, 4163881.1440642904],
  zoom: 6
});

homeRotaion = 3.1115421869123563;

kLayer = new Kanilayer();

SABAE = true;

kanikama = new Kanikama();

kanikama.onChangeFloor = function() {
  if (kanikama.floor !== null) {
    return loadFloor(kanikama.floor.id);
  }
};

map = null;

kanimarker = null;

facilityTable = null;

loadFloor = function(id) {
  var button, floor, i, len, ref;
  kanimarker.setPosition(null);
  kLayer.setFloorId(id);
  setTimeout(function() {
    var calcDeg, extent, geojson, newAngle, oldAngle, pan, rotate, zoom;
    calcDeg = function(ra, rb) {
      var diff;
      diff = (ra % 360) - (rb % 360);
      if (diff < 0) {
        if (diff <= -180) {
          diff = 360 - (diff * -1);
        } else {
          diff = diff * -1;
        }
      } else {
        if (diff > 180) {
          diff = 360 - diff;
        } else {
          diff = diff * -1;
        }
      }
      return ra + diff;
    };
    geojson = kanikama.geojsons[7][id];
    if (geojson != null) {
      extent = new ol.extent.boundingExtent([ol.proj.transform([geojson.bbox[0], geojson.bbox[1]], 'EPSG:4326', 'EPSG:3857'), ol.proj.transform([geojson.bbox[2], geojson.bbox[3]], 'EPSG:4326', 'EPSG:3857')]);
      pan = ol.animation.pan({
        easing: ol.easing.elastic,
        duration: 800,
        source: view.getCenter()
      });
      map.beforeRender(pan);
      zoom = ol.animation.zoom({
        easing: ol.easing.elastic,
        duration: 800,
        resolution: map.getView().getResolution()
      });
      map.beforeRender(zoom);
      oldAngle = view.getRotation() * 180 / Math.PI;
      newAngle = homeRotaion * 180 / Math.PI;
      if (Math.abs(oldAngle - newAngle) > 20) {
        rotate = ol.animation.rotate({
          duration: 400,
          rotation: view.getRotation()
        });
        map.beforeRender(rotate);
        view.setRotation(calcDeg(oldAngle, newAngle) * Math.PI / 180);
      }
      return view.fit(extent, map.getSize());
    }
  }, 100);
  button = $('#floor-button');
  button.empty();
  if (facilityTable.table.length > 1) {
    ref = facilityTable.table;
    for (i = 0, len = ref.length; i < len; i++) {
      floor = ref[i];
      button.append("<div class=\"button\" id=\"" + floor.floor_id + "\">" + floor.label + "</div>");
      $('#' + floor.floor_id).on('click', function() {
        var id_;
        id_ = $(this).attr('id');
        return loadFloor(id_);
      });
    }
    return $('#' + id).addClass('active');
  }
};

didRangeBeaconsInRegion = function(beacons) {
  var accuracy, b, center, e, error, i, latlng, len, newAcc;
  if (cordova.plugins.BluetoothStatus.BTenabled && beacons.length <= 0) {

  } else {

  }
  if ((typeof device !== "undefined" && device !== null ? device.platform : void 0) === 'Android') {
    for (i = 0, len = beacons.length; i < len; i++) {
      b = beacons[i];
      b.major = Number(b.major);
      b.minor = Number(b.minor);
    }
  }
  center = null;
  accuracy = null;
  try {
    kanikama.pushBeacons(beacons);
    latlng = kanikama.positionLatLng;
    newAcc = kanikama.positionAccuracy;
    center = ol.proj.transform(latlng, 'EPSG:4326', 'EPSG:3857');
    accuracy = 6.0;
    if (newAcc >= 0) {
      accuracy = 6.0;
    }
    if (newAcc >= 0.3) {
      accuracy = 4.0;
    }
    if (newAcc >= 0.9) {
      accuracy = 0.1;
    }
  } catch (error) {
    e = error;
    console.error(e);
  }
  if (kanikama.floor != null) {
    return kanimarker.setPosition(center, accuracy);
  } else {
    return kanimarker.setPosition(null);
  }
};

initializeCordovaPlugin = function() {
  var compassError, compassSuccess, delegate, locationManager, ref, region;
  $('.message_close').on('click', function() {
    $($(this).parent()).fadeOut(200);
    return $(this).parent().attr('user_closed', true);
  });
  window.open = cordova.InAppBrowser.open;
  compassSuccess = function(heading) {
    kanikama.pushCompass(heading.magneticHeading);
    kanimarker.setDirection(parseInt(heading.magneticHeading));
  };
  compassError = function(e) {
    alert("コンパスエラー コード:" + e.code);
  };
  navigator.compass.watchHeading(compassSuccess, compassError, {
    frequency: 100
  });
  if (((ref = cordova.plugins) != null ? ref.locationManager : void 0) != null) {
    locationManager = cordova.plugins.locationManager;
    locationManager.requestWhenInUseAuthorization();
    delegate = new locationManager.Delegate();
    delegate.didRangeBeaconsInRegion = function(arg) {
      var beacons;
      beacons = arg.beacons;
      return didRangeBeaconsInRegion.apply(window, [beacons]);
    };
    locationManager.setDelegate(delegate);
    region = new locationManager.BeaconRegion('warabi', '00000000-71C7-1001-B000-001C4D532518');
    locationManager.startRangingBeaconsInRegion(region).fail(alert);
  }
  if (navigator.splashscreen != null) {
    navigator.splashscreen.hide();
  }
  if ((typeof device !== "undefined" && device !== null ? device.platform : void 0) === 'Android') {
    window.addEventListener('native.keyboardhide', function() {
      cosole.log('native.keyboardhide');
    });
    return window.addEventListener('native.keyboardshow', function(e) {
      cosole.log('native.keyboardshow' + e.keyboardHeight);
    });
  }
};

initializeApp = function() {
  var centerAdjusted, extent, invalidateCompass, invalidatePositionButton;
  $.when($.getJSON('https://app.haika.io/api/facility/7'), $.getJSON('https://app.haika.io/api/facility/7/7.geojson'), $.getJSON('https://app.haika.io/api/facility/7/8.geojson')).done(function() {
    var data, i, len;
    for (i = 0, len = arguments.length; i < len; i++) {
      data = arguments[i];
      if (data[1] === 'success') {
        if (data[0].table != null) {
          facilityTable = data[0];
          facilityTable.table.reverse();
        } else {
          kanikama.addGeoJSON(data[0]);
        }
      }
    }
    return loadFloor(7);
  });
  map = new ol.Map({
    layers: [
      new ol.layer.Tile({
        source: new ol.source.XYZ({
          url: 'https://api.tiles.mapbox.com/v4/caliljp.ihofg5ie/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiY2FsaWxqcCIsImEiOiJxZmNyWmdFIn0.hgdNoXE7D6i7SrEo6niG0w',
          maxZoom: 22
        }),
        minResolution: 0.1,
        maxResolution: 2000000,
        preload: 3
      }), kLayer
    ],
    controls: [],
    target: 'map',
    maxZoom: 26,
    minZoom: 18,
    logo: false,
    view: view
  });
  kanimarker = new Kanimarker(map);
  extent = [15160175.492232606, 4295344.11748085, 15160265.302530615, 4295432.24882111];
  view.fit(extent, map.getSize());
  centerAdjusted = false;
  invalidatePositionButton = function() {
    $('#position-mode').addClass('position-mode-normal');
    $('#position-mode').removeClass('position-mode-heading');
    $('#position-mode').removeClass('position-mode-center');
    if (kanimarker.headingUp) {
      return $('#position-mode').addClass('position-mode-heading');
    } else {
      if (centerAdjusted) {
        return $('#position-mode').addClass('position-mode-center');
      } else {
        return $('#position-mode').addClass('position-mode-normal');
      }
    }
  };
  map.on('pointerdrag', function() {
    if (centerAdjusted) {
      centerAdjusted = false;
      return invalidatePositionButton();
    }
  });
  kanimarker.on('change:headingup', function(headingup) {
    return invalidatePositionButton();
  });
  $('#position-mode').on('click', function() {
    if (kanimarker.headingUp) {
      kanimarker.setHeadingUp(false);
      map.getView().setRotation(0);
      if (kanimarker.position !== null) {
        map.getView().setCenter(kanimarker.position);
      }
      centerAdjusted = true;
    } else {
      if (centerAdjusted) {
        kanimarker.setHeadingUp(true);
      } else {
        view.setRotation(homeRotaion);
        if (kanimarker.position !== null) {
          view.setCenter(kanimarker.position);
          centerAdjusted = true;
        }
        if (cordova.plugins.BluetoothStatus.hasBTLE && !cordova.plugins.BluetoothStatus.BTenabled && notifyClosed) {
          $.notify('Bluetoothをオンにしてください', {
            placement: {
              from: 'bottom',
              align: 'right'
            }
          });
        }
      }
    }
    return invalidatePositionButton();
  });
  invalidateCompass = function(view_) {
    var deg, rotation, zoom;
    rotation = view_.getRotation();
    zoom = view_.getZoom();
    $('#compass').css('transform', "rotate(" + rotation + "rad)");
    deg = (rotation * 180 / Math.PI) % 360;
    if (deg < 0) {
      deg += 360;
    }
    if ((deg === 0) || (zoom > 20)) {
      return $('#compass').addClass('ol-hidden');
    } else {
      return $('#compass').removeClass('ol-hidden');
    }
  };
  view.on('change:rotation', function() {
    return invalidateCompass(this);
  });
  view.on('change:resolution', function() {
    return invalidateCompass(this);
  });
  return $('#compass').on('click', function() {
    var rotation;
    kanimarker.setHeadingUp(false);
    rotation = view.getRotation();
    while (rotation < -Math.PI) {
      rotation += 2 * Math.PI;
    }
    while (rotation > Math.PI) {
      rotation -= 2 * Math.PI;
    }
    map.beforeRender(ol.animation.rotate({
      duration: 400,
      rotation: rotation
    }));
    return view.setRotation(0);
  });
};

appTest_1f = function() {
  return didRangeBeaconsInRegion.call(window, [
    {
      "major": 105,
      "uuid": "00000000-71C7-1001-B000-001C4D532518",
      "rssi": -60,
      "minor": 1
    }
  ]);
};

appTest_2f = function() {
  return didRangeBeaconsInRegion.call(window, [
    {
      "major": 105,
      "uuid": "00000000-71C7-1001-B000-001C4D532518",
      "rssi": -60,
      "minor": 70
    }
  ]);
};
