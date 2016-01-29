###

鯖江市図書館マップ「さばとマップ」

Copyright (c) 2016 CALIL Inc.
This software is released under the MIT License.
http://opensource.org/licenses/mit-license.php

###

# アプリケーション定数
MAPBOX_TOKEN = 'pk.eyJ1IjoiY2FsaWxqcCIsImEiOiJxZmNyWmdFIn0.hgdNoXE7D6i7SrEo6niG0w'
homeExtent = [15160175.492232606, 4295344.11748085, 15160265.302530615, 4295432.24882111]
homeRotationRadian = (180 - 2.5) / 180 * Math.PI

# 現在地ボタンを待っているかどうか（1以上で待っている）
waitingPosition = 0
UI = null
map = null
initialized = false
kanimarker = null
kanilayer = new Kanilayer({targetImageUrl: 'img/flag.png', targetImageUrl2: 'img/flag2.png'})
kanikama = new Kanikama()

fitRotation = ->
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
  map.beforeRender(ol.animation.rotate(duration: 400, rotation: oldAngle * Math.PI / 180))
  map.getView().setRotation(virtualAngle * Math.PI / 180)

fitFloor = ->
  fitRotation()
  pan = ol.animation.pan(easing: ol.easing.elastic, duration: 800, source: map.getView().getCenter())
  map.beforeRender(pan)
  zoom = ol.animation.zoom(easing: ol.easing.elastic, duration: 800, resolution: map.getView().getResolution())
  map.beforeRender(zoom)
  map.getView().fit(homeExtent, map.getSize())

# フロアを読み込む
# @param id {String} フロアID
loadFloor = (id)->
  if kanilayer.floorId != id
    kanimarker.setPosition null
    kanilayer.setFloorId id
    UI.setFloorId id
  setTimeout fitFloor, 100

# ビーコンを処理
didRangeBeaconsInRegion = (beacons)->
  kanikama.push(beacons)

initializeApp = ->
  if initialized
    return
  UI = InitUI(
    {systemid: "Fukui_Sabae", floors: [{id: "7", label: '1'}, {id: "8", label: '2'}]},
    document.getElementById('searchBox'))

  if cordova?
    if device.platform is 'iOS'
      body = document.getElementsByTagName('body')
      body[0].classList.add('ios')
    if device.platform is 'Android'
      kanikama.setTimeout(5000)
    if cordova.plugins.BluetoothStatus?
      cordova.plugins.BluetoothStatus.initPlugin()
    window.open = cordova.InAppBrowser.open
    if navigator.compass?
      compassSuccess = (heading)->
        headingDifference = 7.38 # 磁北と真北の差(単位は度)
        heading = heading.magneticHeading + headingDifference
        switch device.platform
          when 'iOS'
            heading += window.orientation # for iOS8 WKWebView
          when 'Android'
            heading += screen.orientation.angle # for Android Crosswalk
        # 0-360の範囲に収める
        if heading < 0
          heading += 360 # マイナスの値を考慮
        heading %= 360

        kanikama.heading = heading
        kanimarker.setHeading(parseInt(heading))
      navigator.compass.watchHeading(compassSuccess, null, frequency: 100)

    # イベントリスナ設定
    if cordova.plugins?.locationManager?
      locationManager = cordova.plugins.locationManager
      locationManager.requestWhenInUseAuthorization()
      delegate = new locationManager.Delegate()
      delegate.didRangeBeaconsInRegion = ({beacons}) ->
        didRangeBeaconsInRegion.apply(window, [beacons]) # thisが変わってしまうのでapplyで変える
      locationManager.setDelegate(delegate)
      region = new locationManager.BeaconRegion('sabatomap', '00000000-71C7-1001-B000-001C4D532518') # レンジング開始
      locationManager.startRangingBeaconsInRegion(region).fail(console.error)

    # スプラッシュスクリーンを非表示
    if navigator.splashscreen?
      setTimeout navigator.splashscreen.hide, 2000

    # オフラインメッセージの表示
    if navigator.connection? and navigator.connection.type is 'none'
      UI.setState({offline: true})
      document.addEventListener 'online', ->
        UI.setState({offline: false})

  FastClick.attach(document.body)
  map = new ol.Map(
    layers: [
      new ol.layer.Tile(# 世界地図
        source: new ol.source.XYZ(
          url: 'https://api.tiles.mapbox.com/v4/caliljp.ihofg5ie/{z}/{x}/{y}.png?access_token=' + MAPBOX_TOKEN
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
  map.getView().fit(homeExtent, map.getSize()) # 鯖江図書館のサイズに合わせる
  kanimarker = new Kanimarker(map)
  kanimarker.on 'change:mode', -> invalidateLocator()
  kanikama.on 'change:floor', (floor)-> loadFloor(floor.id)
  kanikama.on 'change:position', (p)->
    if waitingPosition and kanikama.currentFloor.id isnt kanilayer.floorId
      loadFloor(kanikama.currentFloor.id)
    # 表示中のフロアと同じフロアの時だけ現在地を表示する
    if kanikama.currentFloor.id is kanilayer.floorId and p isnt null
      if p.accuracy >= 6
        kanimarker.moveDuration = 10000
      else
        kanimarker.moveDuration = 2000
      if kanimarker.accuracy? and Math.abs(kanimarker.accuracy - p.accuracy) > 3
        kanimarker.accuracyDuration = 8000
      else
        kanimarker.accuracyDuration = 2500
      kanimarker.setPosition(ol.proj.transform([p.latitude, p.longitude], 'EPSG:4326', 'EPSG:3857'), p.accuracy)
      if waitingPosition
        waitingPosition = 0
        kanimarker.setMode 'centered'
    else
      kanimarker.setPosition(null)

  # コンパス関係の処理
  invalidateCompass = (view_) ->
    mapSize = Math.min(map.getSize()[0], map.getSize()[1]) # マップの短辺を取得
    pixelPerMeter = (1 / view_.getResolution()) * window.devicePixelRatio # 1メートルのピクセル数
    deg = (view_.getRotation() * 180 / Math.PI) % 360
    if deg < 0
      deg += 360
    cls = document.getElementById('compass')
    if deg == 0 or 500 * pixelPerMeter >= mapSize # 短辺が100m以下の時は表示しない
      cls.className = 'hidden'
    else
      cls.style.transform = "rotate(#{deg}deg)"
      cls.className = ''

  document.getElementById('compass').addEventListener 'click', ->
    kanimarker.setMode 'normal'
    rotation = map.getView().getRotation()
    while rotation < -Math.PI
      rotation += 2 * Math.PI
    while rotation > Math.PI
      rotation -= 2 * Math.PI
    map.beforeRender(ol.animation.rotate(duration: 400, rotation: rotation))
    map.getView().setRotation(0)

  map.getView().on 'change:rotation', -> invalidateCompass(@)
  map.getView().on 'change:resolution', -> invalidateCompass(@)

  window.addEventListener 'BluetoothStatus.enabled', invalidateLocator
  window.addEventListener 'BluetoothStatus.disabled', invalidateLocator

  kanikama.facilities_ = __RULES__
  loadFloor '7'

# 目的地を表示する
navigateShelf = (floorId, shelves)->
  if floorId?
    if floorId != kanilayer.floorId
      loadFloor(floorId)
  kanilayer.setTargetShelves(shelves)
  if shelves.length > 0
    map.getView().fit(homeExtent, map.getSize())

# マーカーとモード切り替えボタン
invalidateLocator = ->
  if not cordova? or not cordova.plugins.BluetoothStatus? or not cordova.plugins.BluetoothStatus.hasBTLE or not cordova.plugins.BluetoothStatus.BTenabled
    kanimarker.setMode 'normal'
    UI.setMode 'disabled'
  else if waitingPosition
    UI.setMode 'waiting'
  else
    UI.setMode kanimarker.mode

waitPosition = ->
  waitingPosition++
  invalidateLocator()
  setTimeout ->
    if waitingPosition > 0
      waitingPosition--
    if waitingPosition is 0
      if kanikama.currentPosition is null
        UI.notify '現在地を取得できませんでした'
      invalidateLocator()
  , 4000

# モード切り替え
locatorClicked = ->
  switch kanimarker.mode
    when 'headingup'
      kanimarker.setMode 'centered'
      fitRotation()
    when 'centered'
      kanimarker.setMode 'headingup'
    when 'normal'
      if not cordova? or not cordova.plugins.BluetoothStatus? or not cordova.plugins.BluetoothStatus.hasBTLE
        UI.notify 'この機種は現在地を測定できません'
        fitFloor()
      else if not cordova.plugins.BluetoothStatus.BTenabled
        if device.platform == 'Android'
          cordova.plugins.BluetoothStatus.promptForBT()
        else
          UI.notify 'BluetoothをONにしてください'
      else if kanikama.currentPosition is null
        waitPosition() # 現在地が不明な場合は待つ
      else if kanikama.currentFloor.id != kanilayer.floorId
        loadFloor(kanikama.currentFloor.id) # フロアが違う場合はフロアを切り替える
        waitPosition()
      else
        kanimarker.setMode 'centered' # centeredモードに切り替える

# 周辺の情報を表示
latestNearestInformationMinor = null
loadNearestInformation = (minor)->
  latestNearestInformationMinor = minor
  $.ajax
    dataType: 'html'
    url: "https://calil.jp/warabi/nu/bunrui.php?minor=" + minor + '&new=' + 1
    cache: false
    crossDomain: true
  .done (data)->
    if latestNearestInformationMinor is minor
      $("#nu-info").html data
      $("#nu-info").show()
  .fail ->
    $("#nu-info").html '<div>データがありません</div>'
    $("#nu-info").show()
