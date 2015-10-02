view = new ol.View(
  center: [15139450.747885207, 4163881.1440642904] # 初期状態で日本地図を出しておく
  zoom: 6
)

homeRotaion = 3.1115421869123563

kLayer = new Kanilayer()

kanikama = new Kanikama()
kanikama.onChangeFloor = ()->
  if kanikama.floor isnt null
    loadFloor(kanikama.floor.id)
map = null
kanimarker = null
facilityTable = null

loadFloor = (id)->
  kanimarker.setPosition(null)
  kLayer.setFloorId(id)

  setTimeout(->
    calcDeg = (ra, rb)->
      diff = (ra % 360) - (rb % 360)
      if diff < 0
        if diff <= -180
          diff = (360 - (diff * -1))
        else
          diff = diff * -1
      else
        if diff > 180
          diff = 360 - diff
        else
          diff = diff * -1
      return ra + diff

    # 画面をgeojsonサイズにフィットさせる
    geojson = kanikama.geojsons[7][id]
    if geojson?
      extent = new ol.extent.boundingExtent([
        ol.proj.transform([geojson.bbox[0], geojson.bbox[1]], 'EPSG:4326', 'EPSG:3857')
        ol.proj.transform([geojson.bbox[2], geojson.bbox[3]], 'EPSG:4326', 'EPSG:3857')
      ])

      # 回転アニメーション
      pan = ol.animation.pan(easing: ol.easing.elastic, duration: 800, source: view.getCenter())
      map.beforeRender(pan)
      zoom = ol.animation.zoom(easing: ol.easing.elastic, duration: 800, resolution: map.getView().getResolution())
      map.beforeRender(zoom)

      oldAngle = view.getRotation() * 180 / Math.PI
      #newAngle = -geojson.properties.floor.angle
      newAngle = homeRotaion * 180 / Math.PI
      if Math.abs(oldAngle - newAngle) > 20
        rotate = ol.animation.rotate(duration: 400, rotation: view.getRotation())
        map.beforeRender(rotate)
        view.setRotation(calcDeg(oldAngle, newAngle) * Math.PI / 180)

      # geojsonサイズにフィットさせる
      view.fit(extent, map.getSize())
  , 100)

  # フロアボタンを表示
  button = $('#floor-button')
  button.empty()
  if facilityTable.table.length > 1
    for floor in facilityTable.table
      button.append("""<div class="button" id="#{floor.floor_id}">#{floor.label}</div>""")
      $('#' + floor.floor_id).on 'click', ->
        id_ = $(this).attr('id')
        loadFloor(id_)
    $('#' + id).addClass('active')

# ビーコンを処理
didRangeBeaconsInRegion = (beacons)->
  # Android版でmajor, minorがStringで来る対策
  if device?.platform is 'Android'
    for b in beacons
      b.major = Number(b.major)
      b.minor = Number(b.minor)

  # kanikamaにバグがあるのでとりあえずtry catch
  center = null
  accuracy = null
  try
    kanikama.pushBeacons(beacons)
    latlng = kanikama.positionLatLng
    newAcc = kanikama.positionAccuracy

    center = ol.proj.transform(latlng, 'EPSG:4326', 'EPSG:3857')
    accuracy = 6.0
    if newAcc >= 0
      accuracy = 6.0
    if newAcc >= 0.3
      accuracy = 4.0
    if newAcc >= 0.9
      accuracy = 0.1
  catch e
    console.error(e)

  # 表示中のフロアが違ったら現在地を出さない
  if kanikama.floor? #and kanikama.floor.id is kLayer.floorId
    kanimarker.setPosition(center, accuracy)
  else
    kanimarker.setPosition(null)

initialize = ->
  # メッセージ閉じるボタン
  $('.message_close').on('click', ->
    $($(this).parent()).fadeOut(200)
    $(this).parent().attr('user_closed', true)
  )

  # in app browser
  window.open = cordova.InAppBrowser.open

  # コンパスを受け取る
  compassSuccess = (heading)->
    kanikama.pushCompass(heading.magneticHeading)
    kanimarker.setDirection(parseInt(heading.magneticHeading)) # 小数点以下の変化は変更しない
    return

  compassError = (e)->
    alert("コンパスエラー コード:#{e.code}")
    return

  navigator.compass.watchHeading(compassSuccess, compassError, frequency: 100)

  # イベントリスナ設定
  if cordova.plugins?.locationManager?
    locationManager = cordova.plugins.locationManager
    locationManager.requestWhenInUseAuthorization()
    delegate = new locationManager.Delegate()
    delegate.didRangeBeaconsInRegion = ({beacons}) ->
      didRangeBeaconsInRegion.apply(window, [beacons]) # thisが変わってしまうのでapplyで変える
    locationManager.setDelegate(delegate)

    # レンジング開始
    region = new locationManager.BeaconRegion('warabi', '00000000-71C7-1001-B000-001C4D532518')
    locationManager.startRangingBeaconsInRegion(region).fail(alert)

  # スプラッシュスクリーンを非表示
  if navigator.splashscreen?
    navigator.splashscreen.hide()

  loadGeoJSON = ->
    $.when(
      $.getJSON('https://app.haika.io/api/facility/7')
      $.getJSON('https://app.haika.io/api/facility/7/7.geojson')
      $.getJSON('https://app.haika.io/api/facility/7/8.geojson')
    ).done(->
      for data in arguments
        if data[1] is 'success'
          if data[0].table?
            facilityTable = data[0]
            facilityTable.table.reverse()
          else
            kanikama.addGeoJSON(data[0])

      loadFloor(7)
    )
    return

  if navigator.connection.type is 'none'
    setTimeout(->
      $.notify('オンラインになるのを待っています', delay: 10 * 1000)
    , 1000)
    document.addEventListener('online', loadGeoJSON, false)
  else
    loadGeoJSON()
  return

$(document).on('ready',
  map = new ol.Map(
    layers: [
      new ol.layer.Tile(# 世界地図
        source: new ol.source.XYZ(
          url: 'https://api.tiles.mapbox.com/v4/caliljp.ihofg5ie/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiY2FsaWxqcCIsImEiOiJxZmNyWmdFIn0.hgdNoXE7D6i7SrEo6niG0w'
          maxZoom: 22)
        minResolution: 0.1
        maxResolution: 2000000
        preload: 3)
      kLayer
    ]
    controls: []
    target: 'map'
    maxZoom: 26
    minZoom: 18
    logo: false
    view: view
  )
  kanimarker = new Kanimarker(map)

  # 鯖江図書館のサイズに合わせる
  extent = [15160175.492232606, 4295344.11748085, 15160265.302530615, 4295432.24882111]
  view.fit(extent, map.getSize())
  view.setRotation(178 * Math.PI / 180)

  # マーカーとモード切り替えボタン
  centerAdjusted = false
  invalidatePositionButton = ->
    $('#position-mode').addClass('position-mode-normal')
    $('#position-mode').removeClass('position-mode-heading')
    $('#position-mode').removeClass('position-mode-center')
    if kanimarker.headingUp
      $('#position-mode').addClass('position-mode-heading')
    else
      if centerAdjusted
        $('#position-mode').addClass('position-mode-center')
      else
        $('#position-mode').addClass('position-mode-normal')
  # messageEvent モード変更

  # 現在地に戻したあとマップを動かした
  map.on 'pointerdrag', ->
    if centerAdjusted
      centerAdjusted = false
      invalidatePositionButton()

  # 追従モードが外れた時
  kanimarker.on 'change:headingup', (headingup)->
    invalidatePositionButton()

  # モード切り替え
  $('#position-mode').on 'click', ->
    # Bluetooth OFF
    if cordova.plugins.BluetoothStatus.hasBTLE and not cordova.plugins.BluetoothStatus.BTenabled
      $.notify('Bluetoothをオンにしてください', {
        placement:
          from: 'bottom'
          align: 'right'
      })
    else if kanimarker.position is null
      $.notify('現在地が取得できません', {
        placement:
          from: 'bottom'
          align: 'right'
      })
    else
      if kanimarker.headingUp
        kanimarker.setHeadingUp(false)
        map.getView().setRotation(0)
        map.getView().setCenter(kanimarker.position)
        centerAdjusted = true
      else
        if centerAdjusted
          kanimarker.setHeadingUp(true)
          # messageEvent ヘディングアップモード
        else
          view.setRotation(homeRotaion)
          if kanimarker.position isnt null
            view.setCenter(kanimarker.position)
            centerAdjusted = true
      invalidatePositionButton()
    return

  # コンパス関係の処理
  invalidateCompass = (view_) ->
    rotation = view_.getRotation()
    zoom = view_.getZoom()
    deg = (rotation * 180 / Math.PI) % 360
    if deg < 0
      deg += 360
    if deg==0
      if $('#compass').hasClass('ol-hidden') == false
        $('#compass').addClass('ol-hidden')
    else if zoom <= 18
      $('#compass').css('transform', "rotate(#{rotation}rad)")
      if $('#compass').hasClass('ol-hidden') == true
        $('#compass').removeClass('ol-hidden')
    else
      if $('#compass').hasClass('ol-hidden') == false
        $('#compass').addClass('ol-hidden')

  view.on 'change:rotation', ->
    invalidateCompass(@)

  view.on 'change:resolution', ->
    invalidateCompass(@)

  $('#compass').on 'click', ->
    kanimarker.setHeadingUp(false)
    rotation = view.getRotation()
    while rotation < -Math.PI
      rotation += 2 * Math.PI
    while rotation > Math.PI
      rotation -= 2 * Math.PI
    map.beforeRender(ol.animation.rotate(duration: 400, rotation: rotation))
    view.setRotation(0)
)

appTest_1f = ->
  didRangeBeaconsInRegion.call(window,
    [{"major": 105, "uuid": "00000000-71C7-1001-B000-001C4D532518", "rssi": -60, "minor": 1}])

appTest_2f = ->
  didRangeBeaconsInRegion.call(window,
    [{"major": 105, "uuid": "00000000-71C7-1001-B000-001C4D532518", "rssi": -60, "minor": 70}])
