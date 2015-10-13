view = new ol.View(
  center: [15139450.747885207, 4163881.1440642904] # 初期状態で日本地図を出しておく
  zoom: 6
)

homeRotaion = 3.1115421869123563
centerAdjusted = false
kLayer = new Kanilayer()

kanikama = new Kanikama()
kanikama.onChangeFloor = ()->
  if kanikama.floor isnt null
    loadFloor(kanikama.floor.id)
map = null
kanimarker = null
facilityTable = null
window.alert = (s)->
  console.log s

loadFloor = (id)->
  if kLayer.floorId != id
    kanimarker.setPosition(null)
    kLayer.setFloorId(id)
    centerAdjusted=false
    invalidatePositionButton()


    # 画面をgeojsonサイズにフィットさせる
  setTimeout(->
    geojson = kanikama.geojsons[7][id]
    if geojson?
      oldAngle = (view.getRotation() * 180 / Math.PI ) % 360
      if oldAngle < 0
        oldAngle += 360
      newAngle = (homeRotaion * 180 / Math.PI) % 360

      # アニメーションのための仮想的な角度を計算
      # 左回りの場合はマイナスの値をとる場合がある
      if newAngle > oldAngle
        n = newAngle - oldAngle
        if n <= 180
          virtualAngle = oldAngle + n # 右回り n度回る
        else
          virtualAngle = oldAngle - (360 - n) # 左回り 360 - n度回る
      else
        n = oldAngle - newAngle
        if n <= 180
          virtualAngle = oldAngle - n # 左回り n度回る
        else
          virtualAngle = oldAngle + (360 - n) # 右回り 360 - n度回る

      # 回転
      map.beforeRender(ol.animation.rotate(duration: 400, rotation: oldAngle * Math.PI / 180))
      view.setRotation(virtualAngle * Math.PI / 180)

      # geojsonサイズにフィットさせる
      extent = new ol.extent.boundingExtent([
        ol.proj.transform([geojson.bbox[0], geojson.bbox[1]], 'EPSG:4326', 'EPSG:3857')
        ol.proj.transform([geojson.bbox[2], geojson.bbox[3]], 'EPSG:4326', 'EPSG:3857')
      ])
      pan = ol.animation.pan(easing: ol.easing.elastic, duration: 800, source: view.getCenter())
      map.beforeRender(pan)
      zoom = ol.animation.zoom(easing: ol.easing.elastic, duration: 800, resolution: map.getView().getResolution())
      map.beforeRender(zoom)
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
  try
    kanikama.pushBeacons(beacons)
  catch e
#    console.error(e)

  # 現在地あり
  if kanikama.floor isnt null and kanikama.positionLatLng isnt null
    # 表示中のフロアと同じフロアの時だけ現在地を表示する
    if kanikama.floor.id is kLayer.floorId
      newAcc = kanikama.positionAccuracy
      accuracy = 6.0
      if newAcc >= 0
        accuracy = 6.0
      if newAcc >= 0.3
        accuracy = 4.0
      if newAcc >= 0.9
        accuracy = 0.1

      center = ol.proj.transform(kanikama.positionLatLng, 'EPSG:4326', 'EPSG:3857')
      kanimarker.setPosition(center, accuracy)
    else
      kanimarker.setPosition(null) # 別のフロア todo フロアボタンを光らせる？ ユーザーへの通知
  else
    kanimarker.setPosition(null)

initialize = ->
  if cordova.plugins.BluetoothStatus?
    cordova.plugins.BluetoothStatus.initPlugin();

  # in app browser
  window.open = cordova.InAppBrowser.open

  # コンパスを受け取る
  compassSuccess = (heading)->
    kanikama.pushCompass(heading.magneticHeading)
    kanimarker.setDirection(parseInt(heading.magneticHeading)) # 小数点以下の変化は変更しない
    return

  compassError = (e)->
    return

  if navigator.compass?
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
    setTimeout(->
      navigator.splashscreen.hide()
    , 2000)

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

  if navigator.connection? and navigator.connection.type is 'none'
    $('.offline').stop().slideDown('fast') # オフラインメッセージの表示
    document.addEventListener('online', ->
      $('.offline').stop().slideUp('fast')
      loadGeoJSON()
    , false)
  else
    loadGeoJSON()
  return

$(document).on('ready',

  # fastclickを適用
  FastClick.attach(document.body)

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

  invalidatePositionButton = ->
    if not cordova.plugins.BluetoothStatus?
      $('#position-mode').stop().fadeTo(200, 0.5)
    else if not cordova.plugins.BluetoothStatus.hasBTLE or not cordova.plugins.BluetoothStatus.BTenabled
      $('#position-mode').stop().fadeTo(200, 0.5)
      if kanimarker.headingUp
        kanimarker.setHeadingUp(false)
        map.getView().setRotation(0)
        if kanimarker.position
          map.getView().setCenter(kanimarker.position)
      centerAdjusted = false
    else
      $('#position-mode').stop().fadeTo(200, 1)

    $('#position-mode').addClass('position-mode-normal')
    $('#position-mode').removeClass('position-mode-heading')
    $('#position-mode').removeClass('position-mode-center')
    if kanimarker.headingUp
      $('#position-mode').addClass('position-mode-heading')
    else
      if centerAdjusted
        $('#position-mode').addClass('position-mode-center')

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
    if kanimarker.headingUp
      kanimarker.setHeadingUp(false)
      map.getView().setRotation(homeRotaion)
      if kanimarker.position
        map.getView().setCenter(kanimarker.position)
      centerAdjusted = true
    else if centerAdjusted
      kanimarker.setHeadingUp(true)
    else
      if not cordova.plugins.BluetoothStatus? or not cordova.plugins.BluetoothStatus.hasBTLE
        showNotify('この機種は現在地を測定できません')
        if kLayer.floorId
          loadFloor(kLayer.floorId)
      else if not cordova.plugins.BluetoothStatus.BTenabled
        showNotify('BluetoothをONにしてください')
        if device.platform == 'Android'
          cordova.plugins.BluetoothStatus.promptForBT()
      else
        floorChanged=false
        if kanikama.floor isnt null and kanikama.positionLatLng isnt null
          if kanikama.floor.id != kLayer.floorId
            loadFloor(kanikama.floor.id) # フロアが違う場合は切り替える
            floorChanged=true
        if floorChanged
          setTimeout(=>
            if kanimarker.position isnt null
              view.setCenter(kanimarker.position)
              centerAdjusted = true
            else
              showNotify('現在地が取得できません')
          ,2000)
        else
          if kanimarker.position isnt null
            view.setCenter(kanimarker.position)
            centerAdjusted = true
          else
            showNotify('現在地が取得できません')

    invalidatePositionButton()

  # コンパス関係の処理
  invalidateCompass = (view_) ->
    rotation = view_.getRotation()
    zoom = view_.getZoom()
    deg = (rotation * 180 / Math.PI) % 360
    if deg < 0
      deg += 360
    if deg == 0
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


  window.addEventListener 'BluetoothStatus.enabled', ->
    invalidatePositionButton()

  window.addEventListener 'BluetoothStatus.disabled', ->
    invalidatePositionButton()

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

showNotify = (message)->
  $('.notification').html(message)
  $('.notification').stop().fadeTo('normal', 1).delay(4000).fadeOut(500)
