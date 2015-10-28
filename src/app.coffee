homeExtent = [15160175.492232606, 4295344.11748085, 15160265.302530615, 4295432.24882111]
homeRotationRadian = 3.1115421869123563

kanilayer = new Kanilayer()
kanikama = new Kanikama()
kanimarker = null

map = null

waitingPosition = 0 # 現在地ボタンを待っているかどうか（1以上で待っている）

window.alert = (s)->
  console.log s

# フロアボタンを作成
createFloorButton = (floors, activeId)->
  $('#floor-button').empty()
  floors.sort((a, b)-> Number(b.label) - Number(a.label))
  for floor in floors
    $('<div/>',
      class: 'button'
      id: 'floor' + floor.id
      text: floor.label
      floorId: floor.id
      on:
        click: ->
          loadFloor($(this).attr('floorId'))
    ).appendTo('#floor-button')
  $('#floor' + activeId).addClass('active')

# フロアを読み込む
# @param newFloorId {String} フロアID
loadFloor = (newFloorId)->
  if kanilayer.floorId != newFloorId
    kanimarker.setPosition(null)
    kanilayer.setFloorId(newFloorId)
    invalidatePositionButton()

  # 施設が1つなら自動的に選ぶ
  if kanikama.facilities_.length is 1
    createFloorButton(kanikama.facilities_[0].floors, newFloorId)
  else
    if kanikama.currentFacility isnt null
      createFloorButton(kanikama.currentFacility.floors, newFloorId)
    else
      # todo 施設がない場合は施設選択が必要

      # 画面をgeojsonサイズにフィットさせる
  setTimeout(->
    oldAngle = (map.getView().getRotation() * 180 / Math.PI ) % 360
    if oldAngle < 0
      oldAngle += 360
    newAngle = (homeRotationRadian * 180 / Math.PI) % 360

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
    map.getView().setRotation(virtualAngle * Math.PI / 180)

    # geojsonサイズにフィットさせる
    pan = ol.animation.pan(easing: ol.easing.elastic, duration: 800, source: map.getView().getCenter())
    map.beforeRender(pan)
    zoom = ol.animation.zoom(easing: ol.easing.elastic, duration: 800, resolution: map.getView().getResolution())
    map.beforeRender(zoom)
    map.getView().fit(homeExtent, map.getSize())
  , 100)

# ビーコンを処理
didRangeBeaconsInRegion = (beacons)->
  kanikama.push(beacons)

initialize = ->
  if cordova.plugins.BluetoothStatus?
    cordova.plugins.BluetoothStatus.initPlugin();

  window.open = cordova.InAppBrowser.open

  if navigator.compass?
    compassSuccess = (heading)->
      kanikama.heading = heading.magneticHeading
      kanimarker.setHeading(parseInt(heading.magneticHeading))
    compassError = (e)->
      return false
    navigator.compass.watchHeading(compassSuccess, compassError, frequency: 100)

  # イベントリスナ設定
  if cordova.plugins?.locationManager?
    locationManager = cordova.plugins.locationManager
    locationManager.requestWhenInUseAuthorization()
    delegate = new locationManager.Delegate()
    delegate.didRangeBeaconsInRegion = ({beacons}) ->
      didRangeBeaconsInRegion.apply(window, [beacons]) # thisが変わってしまうのでapplyで変える
    locationManager.setDelegate(delegate)
    region = new locationManager.BeaconRegion('warabi', '00000000-71C7-1001-B000-001C4D532518') # レンジング開始
    locationManager.startRangingBeaconsInRegion(region).fail(alert)

  # スプラッシュスクリーンを非表示
  if navigator.splashscreen?
    setTimeout(->
      navigator.splashscreen.hide()
    , 2000)

  if navigator.connection? and navigator.connection.type is 'none'
    $('.offline').stop().slideDown('fast') # オフラインメッセージの表示
    document.addEventListener('online', ->
      $('.offline').stop().slideUp('fast')
    , false)
  return

$(document).on('ready',
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
      kanilayer
    ]
    controls: []
    target: 'map'
    maxZoom: 26
    minZoom: 18
    logo: false
    view: new ol.View(
      center: [15139450.747885207, 4163881.1440642904]
      rotation: homeRotationRadian
      zoom: 6
    )
  )
  kanimarker = new Kanimarker(map)

  # 鯖江図書館のサイズに合わせる
  map.getView().fit(homeExtent, map.getSize())

  # マーカーとモード切り替えボタン
  invalidatePositionButton = ->
    if not cordova.plugins.BluetoothStatus? or not cordova.plugins.BluetoothStatus.hasBTLE or not cordova.plugins.BluetoothStatus.BTenabled
      $('#position-mode').stop().fadeTo(200, 0.5)
      if kanimarker.mode == 'headingup'
        map.getView().setRotation(0)
      kanimarker.setMode('normal')
    else
      $('#position-mode').stop().fadeTo(200, 1)
    $('#position-mode').addClass('position-mode-normal')
    $('#position-mode').removeClass('position-mode-heading')
    $('#position-mode').removeClass('position-mode-center')
    $('#position-mode').removeClass('position-mode-wait')

    if waitingPosition
      $('#position-mode').addClass('position-mode-wait')
    else
      if kanimarker.mode == 'headingup'
        $('#position-mode').addClass('position-mode-heading')
      else if kanimarker.mode == 'centered'
        $('#position-mode').addClass('position-mode-center')

  kanimarker.on 'change:mode', (mode)->
    invalidatePositionButton()

  kanikama.on 'change:floor', (floor)->
    loadFloor(floor.id)

  kanikama.on 'change:position', (p)->
    if waitingPosition
      if kanikama.currentFloor.id isnt kanilayer.floorId
        loadFloor(kanikama.currentFloor.id)

    # 表示中のフロアと同じフロアの時だけ現在地を表示する
    if kanikama.currentFloor.id is kanilayer.floorId and kanikama.currentPosition isnt null
      position = ol.proj.transform([p.latitude, p.longitude], 'EPSG:4326', 'EPSG:3857')
      kanimarker.setPosition(position, p.accuracy)
    else
      kanimarker.setPosition(null)

    if waitingPosition
      waitingPosition = 0
      kanimarker.setMode('centered')
      invalidatePositionButton()

  waitPosition = ->
    waitingPosition++
    setTimeout(->
      if waitingPosition == 1 and kanikama.currentPosition is null
        showNotify('現在地が取得できませんでした')
        invalidatePositionButton()
      if waitingPosition > 1
        waitingPosition--
    , 6000)

  # モード切り替え
  $('#position-mode').on 'click', ->
    if kanimarker.mode == 'headingup'
      kanimarker.setMode('centered')
      map.getView().setRotation(homeRotationRadian)
      if kanimarker.position
        map.getView().setCenter(kanimarker.position)
    else if kanimarker.mode == 'centered'
      kanimarker.setMode('headingup')
    else
      if not cordova.plugins.BluetoothStatus? or not cordova.plugins.BluetoothStatus.hasBTLE
        showNotify('この機種は現在地を測定できません')
        if kanilayer.floorId
          loadFloor(kanilayer.floorId)
      else if not cordova.plugins.BluetoothStatus.BTenabled
        showNotify('BluetoothをONにしてください')
        if device.platform == 'Android'
          cordova.plugins.BluetoothStatus.promptForBT()
      else
        floorChanged = false
        if kanikama.currentPosition isnt null
          if kanikama.currentFloor.id != kanilayer.floorId
            loadFloor(kanikama.currentFloor.id) # フロアが違う場合は切り替える
            floorChanged = true
        if floorChanged
          setTimeout(=>
            if kanimarker.position isnt null
              kanimarker.setMode('centered')
            else
              waitPosition()
          , 1200)
        else
          if kanimarker.position isnt null
            kanimarker.setMode('centered')
          else
            waitPosition()

    invalidatePositionButton()

  # コンパス関係の処理
  invalidateCompass = (view_) ->
    mapSize = Math.min(map.getSize()[0], map.getSize()[1]) # マップの短辺を取得
    pixelPerMeter = (1 / view_.getResolution()) * window.devicePixelRatio # 1メートルのピクセル数
    deg = (view_.getRotation() * 180 / Math.PI) % 360
    if deg < 0
      deg += 360
    if deg == 0 or 100 * pixelPerMeter >= mapSize # 短辺が100m以下の時は表示しない
      $('#compass').addClass('ol-hidden')
    else
      $('#compass').css('transform', "rotate(#{deg}deg)")
      $('#compass').removeClass('ol-hidden')

  map.getView().on 'change:rotation', ->
    invalidateCompass(@)

  map.getView().on 'change:resolution', ->
    invalidateCompass(@)

  window.addEventListener 'BluetoothStatus.enabled', ->
    invalidatePositionButton()

  window.addEventListener 'BluetoothStatus.disabled', ->
    invalidatePositionButton()

  $('#compass').on 'click', ->
    if kanimarker.mode == 'headingup'
      kanimarker.setMode('centered')
    rotation = map.getView().getRotation()
    while rotation < -Math.PI
      rotation += 2 * Math.PI
    while rotation > Math.PI
      rotation -= 2 * Math.PI
    map.beforeRender(ol.animation.rotate(duration: 400, rotation: rotation))
    map.getView().setRotation(0)

  $.getJSON('data/sabae.json', (data)->
    kanikama.facilities_ = data
    loadFloor('7')
  )
)

showNotify = (message)->
  $('.notification').html(message)
  $('.notification').stop().fadeTo('normal', 1).delay(4000).fadeOut(500)

# 目的地を表示する
navigateShelf = (floorId, shelfId)->
  if floorId != kanilayer.floorId
    loadFloor(floorId)
  kanilayer.setTargetShelf(shelfId)
  $('.searchResult').fadeOut()
