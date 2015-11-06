###

鯖江市図書館マップ「さばとマップ」

Copyright (c) 2015 CALIL Inc.
This software is released under the MIT License.
http://opensource.org/licenses/mit-license.php

###

homeExtent = [15160175.492232606, 4295344.11748085, 15160265.302530615, 4295432.24882111]
homeRotationRadian = (180 - 2.5) / 180 * Math.PI
waitingPosition = 0 # 現在地ボタンを待っているかどうか（1以上で待っている）

map = null
kanimarker = null
kanilayer = new Kanilayer()
kanikama = new Kanikama()
if device.platform is 'Android'
  kanikama.setTimeout(5000)

window.alert = (s)->
  console.log s

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
    kanimarker.setPosition(null)
    kanilayer.setFloorId(id)
    $('#floor-button').empty()
    for floor in kanikama.facilities_[0].floors
      $('<div/>',
        class: 'button'
        id: 'floor' + floor.id
        text: floor.label
        floorId: floor.id
        on:
          click: ->
            loadFloor($(this).attr('floorId'))
      ).prependTo('#floor-button')
    $('#floor' + id).addClass('active')
  setTimeout fitFloor, 100

# ビーコンを処理
didRangeBeaconsInRegion = (beacons)->
  kanikama.push(beacons)

initialize = ->
  if cordova?
    if cordova.plugins.BluetoothStatus?
      cordova.plugins.BluetoothStatus.initPlugin()
    window.open = cordova.InAppBrowser.open
    if navigator.compass?
      compassSuccess = (heading)->
        headingDifference = 7.38 # 磁北と真北の差(単位は度)
        heading = heading.magneticHeading + headingDifference
        switch device.platform
          when 'iOS'
          #noinspection JSUnresolvedVariable
            heading += window.orientation # for iOS8 WKWebView
          when 'Android'
          #noinspection JSUnresolvedVariable
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
      $('.offline').stop().slideDown('fast')
      document.addEventListener('online', ->
        $('.offline').stop().slideUp('fast')
      , false)

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
    if cordova?
      if not cordova.plugins.BluetoothStatus? or not cordova.plugins.BluetoothStatus.hasBTLE or not cordova.plugins.BluetoothStatus.BTenabled
        kanimarker.setMode 'normal'
        $('#position-mode').stop().fadeTo(200, 0.5)
      else
        $('#position-mode').stop().fadeTo(200, 1)
    $('#position-mode').addClass('position-mode-normal').removeClass('position-mode-heading').removeClass('position-mode-center').removeClass('position-mode-wait')
    if waitingPosition
      $('#position-mode').addClass('position-mode-wait')
    else if kanimarker.mode == 'headingup'
      $('#position-mode').addClass('position-mode-heading')
    else if kanimarker.mode == 'centered'
      $('#position-mode').addClass('position-mode-center')

  kanimarker.on 'change:mode', -> invalidatePositionButton()
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

  waitPosition = ->
    waitingPosition++
    invalidatePositionButton()
    setTimeout ->
      if waitingPosition > 0
        waitingPosition--
      if waitingPosition is 0
        if kanikama.currentPosition is null
          showNotify('現在地が取得できませんでした')
        invalidatePositionButton()
    , 4000

  # モード切り替え
  $('#position-mode').on 'click', ->
    switch kanimarker.mode
      when 'headingup'
        kanimarker.setMode 'centered'
        fitRotation()
      when 'centered'
        kanimarker.setMode 'headingup'
      when 'normal'
        if not cordova? or not cordova.plugins.BluetoothStatus? or not cordova.plugins.BluetoothStatus.hasBTLE
          showNotify('この機種は現在地を測定できません')
          if kanilayer.floorId
            fitFloor()
        else if not cordova.plugins.BluetoothStatus.BTenabled
          if device.platform == 'Android'
            cordova.plugins.BluetoothStatus.promptForBT()
          else
            showNotify('BluetoothをONにしてください')
        else if kanikama.currentPosition is null
          # 現在地が不明な場合は待つ
          waitPosition()
        else if kanikama.currentFloor.id != kanilayer.floorId
          # フロアが違う場合はフロアを切り替える
          loadFloor(kanikama.currentFloor.id)
          waitPosition()
        else
          # centeredモードに切り替える
          kanimarker.setMode 'centered'

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
      $('#compass').css('transform', "rotate(#{deg}deg)").removeClass('ol-hidden')

  $('#compass').on 'click', ->
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
  window.addEventListener 'BluetoothStatus.enabled', invalidatePositionButton
  window.addEventListener 'BluetoothStatus.disabled', invalidatePositionButton

  $.getJSON 'data/sabae.json', (data)->
    kanikama.facilities_ = data
    loadFloor('7')

showNotify = (message)->
  $('.notification').html(message).stop().fadeTo('normal', 1).delay(4000).fadeOut(500)

# 目的地を表示する
navigateShelf = (floorId, shelfId)->
  if floorId != kanilayer.floorId
    loadFloor(floorId)
  kanilayer.setTargetShelf(shelfId)
  $('.searchResult').fadeOut()
