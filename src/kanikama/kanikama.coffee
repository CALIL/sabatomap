#
# 鯖江用位置検出クラス
# @example
#   kanikama = new Kanikama(detectors, buffer)
#   kanikama.onChangeFloor = ->
#     # 施設、フロアの更新
#   kanikama.push(beacons)
#   view.setPosition(kanikama.position, kanikama.accuracy)
#
# @author sakai@calil.jp
#
class Kanikama
  # @property [Object] 追加されたGeoJSON一覧
  # @note フロア検出で使われている
  # @todo tableを新しくして代替できるようにする
  geojsons: {}

  # @property [Object] 最新の施設
  facility: null

  # @property [Object] 最新のフロア
  floor: null

  # @property [Array] 最新の現在位置
  # @fixme positionへ変える
  positionLatLng: null

  # @property [Number] 最新の現在位置の正確性
  # @fixme accuracyへ変える
  positionAccuracy: null

  # @property [Number] コンパスの向き
  compass: null

  # @private
  # @property [String] 前回の施設判定結果
  pastFacilityid: null

  # @private
  # @property [Object] 前回のフロア判定結果
  lastFloor: null

  # @private
  # @property [Number] フロア用の時間カウンタ
  # @note 別のフロアのまま閾値を超えるとフロア切り替え発生
  waitElapsed: 0

  # @private
  # @property [Number] 最後にフロア検出した時間
  lastFloorCall: 0

  # @private
  # @property [Object] {facility, floor, lane, uuid, major, minor}
  # ビーコンと[施設,フロア]のオブジェクトを変換するテーブル
  # beaconToClassifyを使って検索する
  table: null

  # @private
  # @property [String] 最後のfloorChangeイベントの時のフロアID
  notifiedFloorId: null

  #
  # Kanikamaのコンストラクタ
  #
  constructor: ->
    @buffer = new BeaconsBuffer(10)

  #
  # 計測データ(ビーコン)を保存
  # @param [Array] Beacons
  #
  pushBeacons: (beacons)->
    [@facility, @floor, @position, @target] = [null, null, null, null]

    @buffer.push(beacons)

    @facilityDetector()

    if @facility?
      @floorDetector()

    if @floor?
      switch @floor.id
        when '7' # sabae 1F
#          @sabaePositionDetector()
          @sabaePositionDetectorV2()
        when '8' # sabae 2F
          @sabaePositionDetector2F()
        else
          console.log 'floor.id not found'
    return

  #
  # 計測データ(コンパス)を保存
  # @param [Number] コンパスの角度
  # @todo 最新値だけでいいのか決める
  # @todo GeoJSONからレーン全体の角度を計算する 傾き
  #
  pushCompass: (@compass)->
    return

  #
  # 保持した値の消去
  # @todo ディテクタ以外の値も戻す
  # @fixme 実装
  #
  clear: ->
    return

  #
  # ビーコンがどの施設、フロアに属しているか調べる
  # @param [Beacon] ビーコンオブジェクト
  # @return [Object] {facility, floor, lane, uuid, major, minor}
  #
  beaconToClassify: (b)->
    if @table is null
      return null
    for c in @table
      continue if (c.uuid isnt null) and (c.uuid.toLowerCase() isnt b.uuid.toLowerCase())
      continue if (c.major isnt null) and (c.major isnt b.major)
      continue if (c.minor isnt null) and (c.minor instanceof Array) and (c.minor.indexOf(b.minor) is -1)
      continue if (c.minor isnt null) and (typeof c.minor is 'number') and (c.minor isnt b.minor)
      continue if b.lane? and (c.lane isnt b.lane)
      return c
    return null

  #
  # 新しいgeojsonの追加
  # @note メンバーの値が同じGeoJSONが入力された場合は先に入力されたGeoJSONが優先される
  #
  addGeoJSON: (geojson)=>
    {facility, floor} = geojson.properties

    # テーブルの追加
    if @table is null
      @table = []

    # 既に追加済みのフロアか調べる
    if @table.filter((c)-> (c.facility.id is facility.id) and (c.floor.id is floor.id)).length isnt 0
      return

    # 別のuuid,majorのビーコンを同じフロアに置く時 (レアケース 現状は無くても動く)
    for feature in geojson.features
      b = feature.properties
      continue if b.type isnt 'beacon'
      continue if typeof b.uuid is 'undefined'
      continue if typeof b.major is 'undefined'
      continue if typeof b.minor is 'undefined'
      c = @beaconToClassify(b)
      if c isnt null # todo: 数字Checkだけで大丈夫か考える
        if typeof c.minor is 'number'
          [tmp, c.minor] = [c.minor, []]
          c.minor.push(tmp)
        c.minor.push(b.minor)
      else
        @table.push(
          facility: facility
          floor: floor
          lane: b.lane
          uuid: b.uuid
          major: b.major
          minor: b.minor
        )
    # floor facility でminorの指定がある時
    for b in [floor, facility]
      continue if typeof b.uuid is 'undefined'
      continue if typeof b.major is 'undefined'
      continue if typeof b.minor is 'undefined'
      continue if @beaconToClassify(b) isnt null
      @table.push(
        facility: facility
        floor: floor
        lane: b.lane
        uuid: b.uuid
        major: b.major
        minor: b.minor
      )
    # minorだけ'beacon'から取る時
    for b in [floor, facility]
      continue if typeof b.uuid is 'undefined'
      continue if typeof b.major is 'undefined'
      for feature in geojson.features
        _b = feature.properties
        continue if _b.type isnt 'beacon'
        continue if typeof _b.uuid isnt 'undefined'
        continue if typeof _b.major isnt 'undefined'
        continue if typeof _b.minor is 'undefined'
        c = null
        for _c in @table
          continue if (_c.uuid isnt null) and (_c.uuid.toLowerCase() isnt b.uuid.toLowerCase())
          continue if (_c.major isnt null) and (_c.major isnt b.major)
          continue if _b.lane? and (_c.lane isnt _b.lane)
          continue if _c.floor.id isnt floor.id
          c = _c
        if c isnt null
          if typeof c.minor is 'number'
            c.minor = [c.minor]
          c.minor.push(_b.minor)
        else
          @table.push(
            facility: facility
            floor: floor
            lane: _b.lane
            uuid: b.uuid
            major: b.major
            minor: _b.minor
          )

    # GeoJSONの追加
    if not @geojsons?
      @geojsons = {}

    if not @geojsons[facility.id]?
      @geojsons[facility.id] = {}

    @geojsons[facility.id][floor.id] = geojson
    return

  #
  # 一気にkanikama.addGeoJSON()をする
  #
  addMultipleGeoJSON: (geojsons)->
    for geojson in geojsons
      @addGeoJSON(geojson)
    return

  #
  # @private
  # 施設検出
  #
  facilityDetector: ->
    windowSize = 3

    # 施設ごとにビーコンを分ける
    facilities = {}
    for beacons in @buffer.last(windowSize)
      for b in beacons
        c = @beaconToClassify(b)
        if c is null
          continue
        if not facilities[c.facility.id]?
          facilities[c.facility.id] = []
        facilities[c.facility.id].push(b)

    # 施設ごとの確度を計算
    accuracies = []
    if Object.keys(facilities).length > 0
      for id, beacons of facilities
        beacons.sort((a, b)-> b.rssi - a.rssi)
        accuracies.push(id: id, accuracy: @rssiToAccuracy(beacons[0].rssi))

    # 施設判定
    comparator = (f0, f1)=>
      # 前回の判定結果(pastFacility)accuracy降順
      if f0.id is @pastFacilityid
        return -1
      if f1.id is @pastFacilityid
        return 1
      else
        return f1.accuracy - f0.accuracy
    facility = accuracies.sort(comparator)[0]

    # 施設を保存
    if facility?
      if facility.accuracy > 1.0
        facility.accuracy = 1.0
      @pastFacilityid = facility.id

    # 検出した施設が無いので、前回の施設を使う
    if (not facility?) and @pastFacilityid?
      facility = {id: @pastFacilityid, accuracy: 0.0}

    # 施設を反映
    if facility?
      facilities = @table.filter((f)-> f.facility.id is facility.id)
      @facility = facilities[0].facility
    return true

  #
  # @private
  # フロア検出
  # @todo あり → なし → あり なしの時間が長ければ消す
  #
  floorDetector: ->
    windowSize = 1
    waitThreshold = 5000 # 新しいフロアへの切り替え遅延時間(ms)
    effectiveRange = 3 # 信頼できるRSSIの範囲(メートル)
    changeFloor = false

    # 施設分のビーコンを取り出す
    beacons = []
    for _beacons in @buffer.last(windowSize)
      _tmp = _beacons.filter((b)=>
        c = @beaconToClassify(b)
        return (c isnt null) and (c.facility.id is @facility.id)
      )
      beacons = beacons.concat(_tmp)

    beacons = beacons.filter((b)-> b.rssi isnt 0)

    # フロアごとに振り分けて平均値のリストを作る
    averages = []
    for id, geojson of @geojsons[@facility.id]
      # フロアのビーコンを抽出
      floorBeacons = beacons.filter((b)=>
        c = @beaconToClassify(b)
        return (c isnt null) and ((String(c.facility.id) == String(@facility.id)) and (String(c.floor.id) == String(id)))
      )
      if floorBeacons.length is 0
        continue

      # 最も電波の強いビーコンのfeatureを抽出
      floorBeacons.sort((a, b)-> b.rssi - a.rssi)
      features = geojson.features.filter((feature)-> feature.properties.minor is floorBeacons[0].minor)

      if features.length is 0
        continue

      [lat, lng] = features[0].geometry.coordinates
      near = {latitude: lat, longitude: lng}

      # 最も電波の強いビーコンからeffectiveRangeに収まる範囲のビーコンを抽出 ライブラリ依存で距離計算する
      nearFeatures = geojson.features.filter((feature)->
        if feature.properties.type isnt 'beacon'
          return false
        [lat, lng] = feature.geometry.coordinates
        # fixme: geojsonが他の座標系でも動くように対応する
        return geolib.getDistance(near, {latitude: lat, longitude: lng}) <= effectiveRange
      )
      # 操作しやすい配列へ入れる
      minors =
        for f in nearFeatures
          f.properties.minor
      nears = beacons.filter(({minor})-> minors.indexOf(minor) isnt -1)

      sum = 0
      for b in nears
        sum += b.rssi
      averages.push(id: id, average: sum / nears.length)

    # 一番近いフロアを取り出す
    id = null
    if averages.length > 0
      id = averages.sort((a, b)-> b.average - a.average)[0].id

    # 前回検出したフロアを取り出す
    # 他のフロアへ切り替える時はチャタリング対策する

    newFloor = @lastFloor
    if @lastFloor? and (id is @lastFloor)
      @waitElapsed = 0
    else
      now = new Date()
      @waitElapsed += (now - @lastFloorCall)
      if (@lastFloor is null) or (@waitElapsed > waitThreshold)
        newFloor = id
        console.log 'floor changed' + @waitElapsed + ' ' + @lastFloor + '-->' + newFloor + ' ' + JSON.stringify(averages)
        @waitElapsed = 0
        changeFloor = true
      @lastFloorCall = now
    @lastFloor = newFloor # 初回はすぐに切り替える

    # 検出成功ならtableを取ってくる
    if newFloor isnt null
      @floor = @table.filter((f)=> (f.facility.id is @facility.id) and (f.floor.id is newFloor))[0].floor
    else
      @floor = null

    if changeFloor and @floor isnt null and @notifiedFloorId isnt @floor.id
      @notifiedFloorId = @floor.id
      @onChangeFloor()

    return true

  #
  # @private
  # 鯖江1F用
  #
  sabaePositionDetector: ->
    #  [{
    #    latlng: [136.18636965697120, 35.961911261565430]
    #    conditions: [
    #      {type: 'neareset1', beacon: a},
    #      {type: 'neareset2', beacon: [a, b]},
    #      {type: 'nearesetD', beacon: a, offset: 0, range: 90},
    #      {type: 'nearesetD', beacon: b, offset: 180, range: 90},
    #    ]
    #  }, {
    #    latlng: [136.18636965697128, 35.961911261565435]
    #    conditions: [
    #      {type: 'neareset1', beacon: b},
    #      {type: 'neareset2', beacon: [b, c]},
    #      {type: 'nearesetD', beacon: b, offset: 0, range: 90},
    #      {type: 'nearesetD', beacon: c, offset: 180, range: 90},
    #    ]
    #  }]
    WINDOW_SIZE = 1
    POINT_2_LATLNG = [
      {"lane": "A", "latlng": [136.1863696569712, 35.96191126156543], "point": 0},
      {"lane": "A", "latlng": [136.18639230648637, 35.961905875380126], "point": 1},
      {"lane": "A", "latlng": [136.18641398322058, 35.96190510933523], "point": 2},
      {"lane": "A", "latlng": [136.18643599258996, 35.96190433153515], "point": 3},
      {"lane": "A", "latlng": [136.18645773928517, 35.9619038327686], "point": 4},
      {"lane": "A", "latlng": [136.18647856748686, 35.96190278200115], "point": 5},
      {"lane": "A", "latlng": [136.18650040327566, 35.961901875459894], "point": 6},
      {"lane": "A", "latlng": [136.1865213689799, 35.961901314376206], "point": 7},
      {"lane": "A", "latlng": [136.18654250584308, 35.96190083716078], "point": 8},
      {"lane": "A", "latlng": [136.18656499963947, 35.961899772490426], "point": 9},
      {"lane": "A", "latlng": [136.18658784059397, 35.96189896530245], "point": 10},
      {"lane": "A", "latlng": [136.18661084786532, 35.96189815223689], "point": 11},
      {"lane": "A", "latlng": [136.18663180388558, 35.96189741166151], "point": 12},
      {"lane": "A", "latlng": [136.18665458939978, 35.96189660643273], "point": 13},
      {"lane": "A", "latlng": [136.18667804018332, 35.96189577769361], "point": 14},
      {"lane": "A", "latlng": [136.1867014335756, 35.961896974113614], "point": 15},
      {"lane": "B", "latlng": [136.1863645958551, 35.96181743228368], "point": 0},
      {"lane": "B", "latlng": [136.18638732106814, 35.96181653926824], "point": 1},
      {"lane": "B", "latlng": [136.18641004628117, 35.9618156462528], "point": 2},
      {"lane": "B", "latlng": [136.18643200502703, 35.96181496015777], "point": 3},
      {"lane": "B", "latlng": [136.18645278986847, 35.96181413571413], "point": 4},
      {"lane": "B", "latlng": [136.1864736807471, 35.961813217606256], "point": 5},
      {"lane": "B", "latlng": [136.18649558647337, 35.96181257834334], "point": 6},
      {"lane": "B", "latlng": [136.18651775487186, 35.961811660046926], "point": 7},
      {"lane": "B", "latlng": [136.18653859515052, 35.961810833644094], "point": 8},
      {"lane": "B", "latlng": [136.18655994164337, 35.96181012422727], "point": 9},
      {"lane": "B", "latlng": [136.18658300674903, 35.96180935407544], "point": 10},
      {"lane": "B", "latlng": [136.18660594887302, 35.96180836347738], "point": 11},
      {"lane": "B", "latlng": [136.18662703027113, 35.96180788822115], "point": 12},
      {"lane": "B", "latlng": [136.18664930228374, 35.96180683138758], "point": 13},
      {"lane": "B", "latlng": [136.1866731362736, 35.961805899188256], "point": 14},
      {"lane": "B", "latlng": [136.18669697026348, 35.961804966988936], "point": 15},
      {"lane": "C", "latlng": [136.18682401061682, 35.96193899448264], "point": 0},
      {"lane": "C", "latlng": [136.18682305444435, 35.96192126967809], "point": 1},
      {"lane": "C", "latlng": [136.18682209827188, 35.96190354487355], "point": 2},
      {"lane": "C", "latlng": [136.18682121956186, 35.96188725600254], "point": 3},
      {"lane": "C", "latlng": [136.18682034085185, 35.96187096713153], "point": 4},
      {"lane": "D", "latlng": [136.18627489493238, 35.96194931833726], "point": 0},
      {"lane": "D", "latlng": [136.18627392194043, 35.96193127942226], "point": 1},
      {"lane": "D", "latlng": [136.18627294894847, 35.96191324050726], "point": 2},
      {"lane": "D", "latlng": [136.1862719807977, 35.96189529133811], "point": 3},
      {"lane": "D", "latlng": [136.18627098118253, 35.96187675882095], "point": 4},
      {"lane": "D", "latlng": [136.18626991863806, 35.96185705960781], "point": 5},
      {"lane": "D", "latlng": [136.18627059384187, 35.961836624606605], "point": 6},
      {"lane": "main", "latlng": [136.18630578213975, 35.96186289564538], "point": 0},
      {"lane": "main", "latlng": [136.1863093982123, 35.96192993579218], "point": 1},
      {"lane": "main", "latlng": [136.18624939353526, 35.961974946694816], "point": 2},
      {"lane": "main", "latlng": [136.1865991356181, 35.96199405792012], "point": 3},
      {"lane": "main", "latlng": [136.18667132039457, 35.96206775650696], "point": 4},
      {"lane": "main", "latlng": [136.186868095626, 35.961953082088385], "point": 5},
      {"lane": "main", "latlng": [136.1868959775686, 35.961924222503306], "point": 6},
      {"lane": "main", "latlng": [136.18645326254045, 35.96199795415883], "point": 7},
      {"lane": "circle", "latlng": [136.18688711744204, 35.96182176055322], "point": 0},
      {"lane": "circle", "latlng": [136.18690607068305, 35.96180139894392], "point": 1},
      {"lane": "circle", "latlng": [136.18692502392406, 35.96178103733462], "point": 2},
      {"lane": "circle", "latlng": [136.18693411312233, 35.96175801209845], "point": 3},
      {"lane": "circle", "latlng": [136.18693403260326, 35.96173283820016], "point": 4},
      {"lane": "circle", "latlng": [136.1869257398401, 35.96170781964384], "point": 5},
      {"lane": "circle", "latlng": [136.186907531943, 35.96168845658414], "point": 6},
      {"lane": "circle", "latlng": [136.1868815979032, 35.96167620025106], "point": 7},
      {"lane": "circle", "latlng": [136.18685298727485, 35.961669928067366], "point": 8},
      {"lane": "circle", "latlng": [136.18682419286148, 35.96167157506923], "point": 9},
      {"lane": "circle", "latlng": [136.1867980468882, 35.96168113108361], "point": 10},
      {"lane": "circle", "latlng": [136.18677661682983, 35.961695735621504], "point": 11},
      {"lane": "circle", "latlng": [136.18676168883835, 35.96171555035333], "point": 12},
      {"lane": "circle", "latlng": [136.18675283853224, 35.9617399158996], "point": 13},
      {"lane": "circle", "latlng": [136.18674398822614, 35.961764281445866], "point": 14}]

    # 電波強度が最上位の場所を現在地とする
    # 'A, B'レーンに対応
    nearest1 = (beacons, filter_near = 0)->
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
      }
      beacons = beacons.filter((_b)-> _b.rssi isnt 0)
      beacons.sort((_a, _b)-> _b.rssi - _a.rssi)
      try
        if filter_near > 0 and beacons.length > 1 and beacons[0].rssi - beacons[1].rssi <= filter_near
          return null
        return map[beacons[0].minor]
      catch e
        return null

    # 電波強度が最上位の場所から向いている(compass)場所を現在地とする
    # 低書架('A, B'以外のレーン)に対応
    nearestD = (beacons, heading, filter_near = 0)->
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
      }
      offsets = {
        'D': 90
        'C': 90
      }
      beacons = beacons.filter((_b)-> _b.rssi isnt 0)
      beacons.sort((_a, _b)-> _b.rssi - _a.rssi)
      try
        if filter_near > 0 and beacons.length > 1 and beacons[0]['rssi'] - beacons[1]['rssi'] < filter_near
          return null

        # 想定している例外 'ビーコン, マップ, オフセット値' が無い時
        _map = map[beacons[0].minor]

        heading_offset = offsets[_map[0][0]]
        wide = 90 # (1-180)

        _heading = heading + heading_offset
        if _heading < 0
          _heading = 360 - _heading
        if _heading >= 360
          _heading = _heading - 360

        console.log heading
        if 90 - wide / 2 < _heading < 90 + wide / 2
          return _map[1]

        if 270 - wide / 2 < _heading < 270 + wide / 2
          return _map[0]
        return null
      catch e
        return null

    # 電波強度, 上位2つの組を現在地とする
    # 1階全ての書架に対応
    nearest2 = (beacons, filter_near = 0)->
      map = [[[133, 116], ["A", 0]],
             [[101, 117], ["A", 1]],
             [[102, 118], ["A", 2]],
             [[103, 119], ["A", 3]],
             [[104, 120], ["A", 4]],
             [[105, 121], ["A", 5]],
             [[106, 122], ["A", 6]],
             [[107, 123], ["A", 7]],
             [[108, 124], ["A", 8]],
             [[109, 125], ["A", 9]],
             [[110, 126], ["A", 10]],
             [[111, 127], ["A", 11]],
             [[112, 128], ["A", 12]],
             [[113, 129], ["A", 13]],
             [[114, 130], ["A", 14]],
             [[115, 134], ["A", 15]],
             [[131, 16], ["B", 0]],
             [[1, 17], ["B", 1]],
             [[2, 18], ["B", 2]],
             [[3, 19], ["B", 3]],
             [[4, 20], ["B", 4]],
             [[5, 21], ["B", 5]],
             [[6, 22], ["B", 6]],
             [[7, 23], ["B", 7]],
             [[8, 24], ["B", 8]],
             [[9, 25], ["B", 9]],
             [[10, 26], ["B", 10]],
             [[11, 27], ["B", 11]],
             [[12, 28], ["B", 12]],
             [[13, 29], ["B", 13]],
             [[14, 30], ["B", 14]],
             [[15, 132], ["B", 15]],
             [[34, 35], ["D", 1]],
             [[35, 36], ["D", 2]],
             [[36, 37], ["D", 3]],
             [[37, 38], ["D", 4]],
             [[38, 39], ["D", 5]],
             [[39, 40], ["D", 6]],
             [[43, 44], ["C", 1]],
             [[44, 45], ["C", 2]],
             [[45, 46], ["C", 3]],
             [[49, 50], ["circle", 1]],
             [[50, 51], ["circle", 2]],
             [[51, 52], ["circle", 3]],
             [[52, 53], ["circle", 4]],
             [[53, 54], ["circle", 5]],
             [[54, 55], ["circle", 6]],
             [[55, 56], ["circle", 7]],
             [[56, 57], ["circle", 8]],
             [[57, 58], ["circle", 9]],
             [[58, 59], ["circle", 10]],
             [[59, 60], ["circle", 11]],
             [[60, 61], ["circle", 12]],
             [[61, 62], ["circle", 13]]]
      candidate = []
      for _map in map
        [a, b] = _map[0]
        beacon_a = beacons.filter((_item)-> _item.rssi isnt 0 and _item.minor is a)
        beacon_b = beacons.filter((_item)-> _item.rssi isnt 0 and _item.minor is b)
        if beacon_a.length > 0 and beacon_b.length > 0
          candidate.push(rssi: (beacon_a[0].rssi + beacon_b[0].rssi) / 2, point: _map[1])
      candidate.sort((x, y)-> y.rssi - x.rssi)
      try
        if filter_near > 0 and candidate.length > 1 and candidate[0].rssi - candidate[1].rssi <= filter_near
          return null
        return candidate[0].point
      catch e
        return null

    nearest2_v21 = (beacons, filter_near = 0, check_nearest = true)->
      map = [[[133, 116], ["A", 0]],
             [[101, 117], ["A", 1]],
             [[102, 118], ["A", 2]],
             [[103, 119], ["A", 3]],
             [[104, 120], ["A", 4]],
             [[105, 121], ["A", 5]],
             [[106, 122], ["A", 6]],
             [[107, 123], ["A", 7]],
             [[108, 124], ["A", 8]],
             [[109, 125], ["A", 9]],
             [[110, 126], ["A", 10]],
             [[111, 127], ["A", 11]],
             [[112, 128], ["A", 12]],
             [[113, 129], ["A", 13]],
             [[114, 130], ["A", 14]],
             [[115, 134], ["A", 15]],
             [[131, 16], ["B", 0]],
             [[1, 17], ["B", 1]],
             [[2, 18], ["B", 2]],
             [[3, 19], ["B", 3]],
             [[4, 20], ["B", 4]],
             [[5, 21], ["B", 5]],
             [[6, 22], ["B", 6]],
             [[7, 23], ["B", 7]],
             [[8, 24], ["B", 8]],
             [[9, 25], ["B", 9]],
             [[10, 26], ["B", 10]],
             [[11, 27], ["B", 11]],
             [[12, 28], ["B", 12]],
             [[13, 29], ["B", 13]],
             [[14, 30], ["B", 14]],
             [[15, 132], ["B", 15]],
             [[34, 35], ["D", 1]],
             [[35, 36], ["D", 2]],
             [[36, 37], ["D", 3]],
             [[37, 38], ["D", 4]],
             [[38, 39], ["D", 5]],
             [[39, 40], ["D", 6]],
             [[43, 44], ["C", 1]],
             [[44, 45], ["C", 2]],
             [[45, 46], ["C", 3]],
             [[49, 50], ["circle", 1]],
             [[50, 51], ["circle", 2]],
             [[51, 52], ["circle", 3]],
             [[52, 53], ["circle", 4]],
             [[53, 54], ["circle", 5]],
             [[54, 55], ["circle", 6]],
             [[55, 56], ["circle", 7]],
             [[56, 57], ["circle", 8]],
             [[57, 58], ["circle", 9]],
             [[58, 59], ["circle", 10]],
             [[59, 60], ["circle", 11]],
             [[60, 61], ["circle", 12]],
             [[61, 62], ["circle", 13]]]
      beacons = beacons.filter((_item)-> _item.rssi isnt 0)
      candidate = []
      for _map in map
        [a, b] = _map[0]
        beacon_a = beacons.filter((_item)-> _item.minor is a)
        beacon_b = beacons.filter((_item)-> _item.minor is b)
        if beacon_a.length > 0 and beacon_b.length > 0
          candidate.push(rssi: (beacon_a[0].rssi + beacon_b[0].rssi) / 2, point: _map[1], minor: _map[0])

      if candidate.length is 0
        return null

      candidate.sort((x, y)-> y.rssi - x.rssi)
      if filter_near > 0
        if candidate.length > 1 and candidate[0]['rssi'] - candidate[1]['rssi'] <= filter_near
          return null

      if check_nearest # 一番強いビーコンであることを検査する
        beacons.sort((x, y)-> y.rssi - x.rssi)
        if candidate[0].minor.indexOf(beacons[0]['minor']) is -1
          return null

      return candidate[0].point

    d = @buffer.last(WINDOW_SIZE)[0]

    accuracy = 1
    ret = nearestD(d, @compass, 6)
    algorithm = 'nearestD'
    if not ret?
      ret = nearest2_v21(d, 3)
      algorithm = 'nearest2'
      if not ret?
        accuracy = 0.6
        ret = nearest1(d, 6)
        algorithm = 'nearest1'
        if not ret?
          accuracy = 0.3
          ret = nearest2_v21(d, 1)
          algorithm = 'nearest2'
          if not ret?
            ret = nearest1(d)
            accuracy = 0
            if not ret?
              accuracy = 0
              algorithm = null

    @positionAccuracy = accuracy
    if ret?
      p = POINT_2_LATLNG.filter((row)-> row.lane is ret[0] and row.point is ret[1])[0]
      if p?
        if true #accuracy is 0 and $('#destination').attr('accuracy') == 'true'
          @lane = p.lane
          @position = p.point
          @positionLatLng = p.latlng

    # 関数の状態を画面に出す
    d = d.filter((_b)-> _b.rssi isnt 0)
    d.sort((_a, _b)-> _b.rssi - _a.rssi)
    text = JSON.stringify({
      accuracy: accuracy ? null,
      algorithm: algorithm ? null,
      rssi:
        0: String(d[0]?.minor) + ' ' + String(d[0]?.rssi)
        1: String(d[1]?.minor) + ' ' + String(d[1]?.rssi)
        diff: d[0]?.rssi - d[1]?.rssi
    }, null, 2)
    $('#info').text(text)

    return true

  #
  # @private
  # 鯖江2F用
  #
  sabaePositionDetector2F: ->
    WINDOW_SIZE = 1
    POINT_2_LATLNG = [
      {'lane': 'A', 'latlng': [136.18664149707814, 35.961922650475515], 'point': 1},
      {'lane': 'A', 'latlng': [136.18664090411215, 35.96190136111812], 'point': 2},
      {'lane': 'A', 'latlng': [136.1866403474554, 35.961880744854575], 'point': 3},
      {'lane': 'A', 'latlng': [136.18663936665007, 35.96186050324796], 'point': 4},
      {'lane': 'A', 'latlng': [136.18663798543406, 35.96183901695468], 'point': 5},
      {'lane': 'A', 'latlng': [136.186636778032, 35.961818693439], 'point': 6},
      {'lane': 'A', 'latlng': [136.18663599524763, 35.961800063339226], 'point': 7},
      {'lane': 'A', 'latlng': [136.18664209004413, 35.961943939832906], 'point': 0},
      {'lane': 'A', 'latlng': [136.18663521246324, 35.96178143323945], 'point': 8},
      {'lane': 'B', 'latlng': [136.1865081258662, 35.961814383130005], 'point': 1},
      {'lane': 'B', 'latlng': [136.18649116148566, 35.9618149826434], 'point': 2},
      {'lane': 'B', 'latlng': [136.18647231217363, 35.96181564876941], 'point': 3},
      {'lane': 'B', 'latlng': [136.18645268671315, 35.96181634232413], 'point': 4},
      {'lane': 'B', 'latlng': [136.18652509024673, 35.961813783616606], 'point': 0},
      {'lane': 'B', 'latlng': [136.18643306125267, 35.961817035878845], 'point': 5},
      {'lane': 'C', 'latlng': [136.18648076714635, 35.961876628358254], 'point': 1},
      {'lane': 'C', 'latlng': [136.1864798667226, 35.96185993563094], 'point': 2},
      {'lane': 'C', 'latlng': [136.1865110434673, 35.96185096612878], 'point': 3},
      {'lane': 'C', 'latlng': [136.18654306739097, 35.961857702149636], 'point': 4},
      {'lane': 'C', 'latlng': [136.18654415108932, 35.96187470310983], 'point': 5},
      {'lane': 'C', 'latlng': [136.1864816675701, 35.96189332108557], 'point': 0},
      {'lane': 'C', 'latlng': [136.18654523478767, 35.96189170407002], 'point': 6},
      {'lane': 'D', 'latlng': [136.18655039499117, 35.961835998008716], 'point': 1},
      {'lane': 'E', 'latlng': [136.18659600073724, 35.961966833958826], 'point': 1},
      {'lane': 'E', 'latlng': [136.18658901475447, 35.961985603727015], 'point': 2},
      {'lane': 'E', 'latlng': [136.18657058471123, 35.96198580545023], 'point': 3},
      {'lane': 'E', 'latlng': [136.18655019274166, 35.96198670592536], 'point': 4},
      {'lane': 'F', 'latlng': [136.1865445207419, 35.96173945498899], 'point': 1}
    ]

    # 電波強度が最上位の場所を現在地とする
    # 'A, B'レーンに対応
    nearest1 = (beacons, filter_near = 0)->
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
      }
      beacons = beacons.filter((_b)-> _b.rssi isnt 0)
      beacons.sort((_a, _b)-> _b.rssi - _a.rssi)
      try
        if filter_near > 0 and beacons.length > 1 and beacons[0].rssi - beacons[1].rssi <= filter_near
          return null
        return map[beacons[0].minor]
      catch e
        return null

    # 電波強度が最上位の場所から向いている(compass)場所を現在地とする
    # 低書架('A, B'以外のレーン)に対応
    nearestD = (beacons, heading, filter_near = 0)->
      map = {
      }
      offsets = {
        'A': 90
        'C': 90
      }
      beacons = beacons.filter((_b)-> _b.rssi isnt 0)
      beacons.sort((_a, _b)-> _b.rssi - _a.rssi)
      try
        if filter_near > 0 and beacons.length > 1 and beacons[0]['rssi'] - beacons[1]['rssi'] < filter_near
          return null

        # 想定している例外 'ビーコン, マップ, オフセット値' が無い時
        _map = map[beacons[0].minor]

        heading_offset = offsets[_map[0][0]]
        wide = 90 # (1-180)

        _heading = heading + heading_offset
        if _heading < 0
          _heading = 360 - _heading
        if _heading >= 360
          _heading = _heading - 360

        console.log heading
        if 90 - wide / 2 < _heading < 90 + wide / 2
          return _map[1]

        if 270 - wide / 2 < _heading < 270 + wide / 2
          return _map[0]
        return null
      catch e
        return null

    nearest2_v21 = (beacons, filter_near = 0, check_nearest = true)->
      map = [
        [[76, 77], ["A", 1]],
        [[77, 78], ["A", 2]],
        [[78, 79], ["A", 3]],
        [[79, 80], ["A", 4]],
        [[80, 81], ["A", 5]],
        [[81, 82], ["A", 6]],
        [[82, 83], ["A", 7]],
        [[71, 72], ["B", 1]],
        [[72, 73], ["B", 2]],
        [[73, 74], ["B", 3]],
        [[74, 75], ["B", 4]],
        [[64, 65], ["C", 1]],
        [[65, 66], ["C", 2]],
        [[66, 67], ["C", 3]],
        [[67, 68], ["C", 4]],
        [[68, 69], ["C", 5]]
      ]
      beacons = beacons.filter((_item)-> _item.rssi isnt 0)
      candidate = []
      for _map in map
        [a, b] = _map[0]
        beacon_a = beacons.filter((_item)-> _item.minor is a)
        beacon_b = beacons.filter((_item)-> _item.minor is b)
        if beacon_a.length > 0 and beacon_b.length > 0
          candidate.push(rssi: (beacon_a[0].rssi + beacon_b[0].rssi) / 2, point: _map[1], minor: _map[0])

      if candidate.length is 0
        return null

      candidate.sort((x, y)-> y.rssi - x.rssi)
      if filter_near > 0
        if candidate.length > 1 and candidate[0]['rssi'] - candidate[1]['rssi'] <= filter_near
          return null

      if check_nearest # 一番強いビーコンであることを検査する
        beacons.sort((x, y)-> y.rssi - x.rssi)
        if candidate[0].minor.indexOf(beacons[0]['minor']) is -1
          return null

      return candidate[0].point

    d = @buffer.last(WINDOW_SIZE)[0]

    accuracy = 1
    ret = nearestD(d, @compass, 6)
    algorithm = 'nearestD'
    if not ret?
      ret = nearest2_v21(d, 3)
      algorithm = 'nearest2'
      if not ret?
        accuracy = 0.9
        ret = nearest1(d, 6)
        algorithm = 'nearest1'
        if not ret?
          accuracy = 0.3
          ret = nearest2_v21(d, 1)
          algorithm = 'nearest2'
          if not ret?
            ret = nearest1(d)
            accuracy = 0
            if not ret?
              accuracy = 0
              algorithm = null

    @positionAccuracy = accuracy
    if ret?
      p = POINT_2_LATLNG.filter((row)-> row.lane is ret[0] and row.point is ret[1])[0]
      if p?
        if true #accuracy is 0 and $('#destination').attr('accuracy') == 'true'
          @lane = p.lane
          @position = p.point
          @positionLatLng = p.latlng

    # 関数の状態を画面に出す
    d = d.filter((_b)-> _b.rssi isnt 0)
    d.sort((_a, _b)-> _b.rssi - _a.rssi)
    text = JSON.stringify({
      accuracy: accuracy ? null,
      algorithm: algorithm ? null,
      rssi:
        0: String(d[0]?.minor) + ' ' + String(d[0]?.rssi)
        1: String(d[1]?.minor) + ' ' + String(d[1]?.rssi)
        diff: d[0]?.rssi - d[1]?.rssi
    }, null, 2)
    $('#info').text(text)

    return true

  #
  # rssiから距離を計算する
  #
  rssiToAccuracy: (rssi)->
    if rssi > -59
      return 10
    return 10 / (1 - (rssi + 59) * 10 / 20)

  #
  # @callback
  #
  onChangeFloor: ->
    return



  #
  # @private
  # 鯖江1F用
  #
  sabaePositionDetectorV2: ->
    #  [{
    #    latlng: [136.18636965697120, 35.961911261565430]
    #    conditions: [
    #      {type: 'neareset1', beacon: a},
    #      {type: 'neareset2', beacon: [a, b]},
    #      {type: 'nearesetD', beacon: a, offset: 0, range: 90},
    #      {type: 'nearesetD', beacon: b, offset: 180, range: 90},
    #    ]
    #  }, {
    #    latlng: [136.18636965697128, 35.961911261565435]
    #    conditions: [
    #      {type: 'neareset1', beacon: b},
    #      {type: 'neareset2', beacon: [b, c]},
    #      {type: 'nearesetD', beacon: b, offset: 0, range: 90},
    #      {type: 'nearesetD', beacon: c, offset: 180, range: 90},
    #    ]
    #  }]
    WINDOW_SIZE = 1
    POINT_2_LATLNG = [
      {"lane": "A", "latlng": [136.1863696569712, 35.96191126156543], "point": 0},
      {"lane": "A", "latlng": [136.18639230648637, 35.961905875380126], "point": 1},
      {"lane": "A", "latlng": [136.18641398322058, 35.96190510933523], "point": 2},
      {"lane": "A", "latlng": [136.18643599258996, 35.96190433153515], "point": 3},
      {"lane": "A", "latlng": [136.18645773928517, 35.9619038327686], "point": 4},
      {"lane": "A", "latlng": [136.18647856748686, 35.96190278200115], "point": 5},
      {"lane": "A", "latlng": [136.18650040327566, 35.961901875459894], "point": 6},
      {"lane": "A", "latlng": [136.1865213689799, 35.961901314376206], "point": 7},
      {"lane": "A", "latlng": [136.18654250584308, 35.96190083716078], "point": 8},
      {"lane": "A", "latlng": [136.18656499963947, 35.961899772490426], "point": 9},
      {"lane": "A", "latlng": [136.18658784059397, 35.96189896530245], "point": 10},
      {"lane": "A", "latlng": [136.18661084786532, 35.96189815223689], "point": 11},
      {"lane": "A", "latlng": [136.18663180388558, 35.96189741166151], "point": 12},
      {"lane": "A", "latlng": [136.18665458939978, 35.96189660643273], "point": 13},
      {"lane": "A", "latlng": [136.18667804018332, 35.96189577769361], "point": 14},
      {"lane": "A", "latlng": [136.1867014335756, 35.961896974113614], "point": 15},
      {"lane": "B", "latlng": [136.1863645958551, 35.96181743228368], "point": 0},
      {"lane": "B", "latlng": [136.18638732106814, 35.96181653926824], "point": 1},
      {"lane": "B", "latlng": [136.18641004628117, 35.9618156462528], "point": 2},
      {"lane": "B", "latlng": [136.18643200502703, 35.96181496015777], "point": 3},
      {"lane": "B", "latlng": [136.18645278986847, 35.96181413571413], "point": 4},
      {"lane": "B", "latlng": [136.1864736807471, 35.961813217606256], "point": 5},
      {"lane": "B", "latlng": [136.18649558647337, 35.96181257834334], "point": 6},
      {"lane": "B", "latlng": [136.18651775487186, 35.961811660046926], "point": 7},
      {"lane": "B", "latlng": [136.18653859515052, 35.961810833644094], "point": 8},
      {"lane": "B", "latlng": [136.18655994164337, 35.96181012422727], "point": 9},
      {"lane": "B", "latlng": [136.18658300674903, 35.96180935407544], "point": 10},
      {"lane": "B", "latlng": [136.18660594887302, 35.96180836347738], "point": 11},
      {"lane": "B", "latlng": [136.18662703027113, 35.96180788822115], "point": 12},
      {"lane": "B", "latlng": [136.18664930228374, 35.96180683138758], "point": 13},
      {"lane": "B", "latlng": [136.1866731362736, 35.961805899188256], "point": 14},
      {"lane": "B", "latlng": [136.18669697026348, 35.961804966988936], "point": 15},
      {"lane": "C", "latlng": [136.18682401061682, 35.96193899448264], "point": 0},
      {"lane": "C", "latlng": [136.18682305444435, 35.96192126967809], "point": 1},
      {"lane": "C", "latlng": [136.18682209827188, 35.96190354487355], "point": 2},
      {"lane": "C", "latlng": [136.18682121956186, 35.96188725600254], "point": 3},
      {"lane": "C", "latlng": [136.18682034085185, 35.96187096713153], "point": 4},
      {"lane": "D", "latlng": [136.18627489493238, 35.96194931833726], "point": 0},
      {"lane": "D", "latlng": [136.18627392194043, 35.96193127942226], "point": 1},
      {"lane": "D", "latlng": [136.18627294894847, 35.96191324050726], "point": 2},
      {"lane": "D", "latlng": [136.1862719807977, 35.96189529133811], "point": 3},
      {"lane": "D", "latlng": [136.18627098118253, 35.96187675882095], "point": 4},
      {"lane": "D", "latlng": [136.18626991863806, 35.96185705960781], "point": 5},
      {"lane": "D", "latlng": [136.18627059384187, 35.961836624606605], "point": 6},
      {"lane": "main", "latlng": [136.18630578213975, 35.96186289564538], "point": 0},
      {"lane": "main", "latlng": [136.1863093982123, 35.96192993579218], "point": 1},
      {"lane": "main", "latlng": [136.18624939353526, 35.961974946694816], "point": 2},
      {"lane": "main", "latlng": [136.1865991356181, 35.96199405792012], "point": 3},
      {"lane": "main", "latlng": [136.18667132039457, 35.96206775650696], "point": 4},
      {"lane": "main", "latlng": [136.186868095626, 35.961953082088385], "point": 5},
      {"lane": "main", "latlng": [136.1868959775686, 35.961924222503306], "point": 6},
      {"lane": "main", "latlng": [136.18645326254045, 35.96199795415883], "point": 7},
      {"lane": "circle", "latlng": [136.18688711744204, 35.96182176055322], "point": 0},
      {"lane": "circle", "latlng": [136.18690607068305, 35.96180139894392], "point": 1},
      {"lane": "circle", "latlng": [136.18692502392406, 35.96178103733462], "point": 2},
      {"lane": "circle", "latlng": [136.18693411312233, 35.96175801209845], "point": 3},
      {"lane": "circle", "latlng": [136.18693403260326, 35.96173283820016], "point": 4},
      {"lane": "circle", "latlng": [136.1869257398401, 35.96170781964384], "point": 5},
      {"lane": "circle", "latlng": [136.186907531943, 35.96168845658414], "point": 6},
      {"lane": "circle", "latlng": [136.1868815979032, 35.96167620025106], "point": 7},
      {"lane": "circle", "latlng": [136.18685298727485, 35.961669928067366], "point": 8},
      {"lane": "circle", "latlng": [136.18682419286148, 35.96167157506923], "point": 9},
      {"lane": "circle", "latlng": [136.1867980468882, 35.96168113108361], "point": 10},
      {"lane": "circle", "latlng": [136.18677661682983, 35.961695735621504], "point": 11},
      {"lane": "circle", "latlng": [136.18676168883835, 35.96171555035333], "point": 12},
      {"lane": "circle", "latlng": [136.18675283853224, 35.9617399158996], "point": 13},
      {"lane": "circle", "latlng": [136.18674398822614, 35.961764281445866], "point": 14}]

    # 電波強度が最上位の場所を現在地とする
    # 'A, B'レーンに対応
    nearest1 = (beacons, filter_near = 0)->
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
      }
      beacons = beacons.filter((_b)-> _b.rssi isnt 0)
      beacons.sort((_a, _b)-> _b.rssi - _a.rssi)
      try
        if filter_near > 0 and beacons.length > 1 and beacons[0].rssi - beacons[1].rssi <= filter_near
          return null
        return map[beacons[0].minor]
      catch e
        return null

    # 電波強度が最上位の場所から向いている(compass)場所を現在地とする
    # 低書架('A, B'以外のレーン)に対応
    nearestD = (beacons, heading, filter_near = 0)->
      map = [
        {beacon: 40, point: ["D", 6], offset: 270, wide: 90}
        {beacon: 39, point: ["D", 5], offset: 270, wide: 90}
        {beacon: 38, point: ["D", 4], offset: 270, wide: 90}
        {beacon: 37, point: ["D", 3], offset: 270, wide: 90}
        {beacon: 36, point: ["D", 2], offset: 270, wide: 90}
        {beacon: 35, point: ["D", 1], offset: 270, wide: 90}
        {beacon: 34, point: ["D", 0], offset: 270, wide: 90}
        {beacon: 46, point: ["C", 3], offset: 270, wide: 90}
        {beacon: 45, point: ["C", 2], offset: 270, wide: 90}
        {beacon: 44, point: ["C", 1], offset: 270, wide: 90}
        {beacon: 43, point: ["C", 0], offset: 270, wide: 90}
        {beacon: 40, point: ["D", 7], offset: 90, wide: 90}
        {beacon: 39, point: ["D", 6], offset: 90, wide: 90}
        {beacon: 38, point: ["D", 5], offset: 90, wide: 90}
        {beacon: 37, point: ["D", 4], offset: 90, wide: 90}
        {beacon: 36, point: ["D", 3], offset: 90, wide: 90}
        {beacon: 35, point: ["D", 2], offset: 90, wide: 90}
        {beacon: 34, point: ["D", 1], offset: 90, wide: 90}
        {beacon: 46, point: ["C", 4], offset: 90, wide: 90}
        {beacon: 45, point: ["C", 3], offset: 90, wide: 90}
        {beacon: 44, point: ["C", 2], offset: 90, wide: 90}
        {beacon: 43, point: ["C", 1], offset: 90, wide: 90}
      ]
      beacons = beacons.filter((_b)-> _b.rssi isnt 0)
      beacons.sort((_a, _b)-> _b.rssi - _a.rssi)

      if filter_near > 0 and beacons.length > 1 and beacons[0]['rssi'] - beacons[1]['rssi'] < filter_near
        return null

      # 想定している例外 'ビーコン, マップ, オフセット値' が無い時
      for p in map
        if p.beacon is beacons[0].minor
          if (90 - p.wide / 2) < ((heading + p.offset) % 360) < (90 + p.wide / 2)
            return p.point
      return null

    # 電波強度, 上位2つの組を現在地とする
    # 1階全ての書架に対応
    nearest2 = (beacons, filter_near = 0)->
      map = [[[133, 116], ["A", 0]],
             [[101, 117], ["A", 1]],
             [[102, 118], ["A", 2]],
             [[103, 119], ["A", 3]],
             [[104, 120], ["A", 4]],
             [[105, 121], ["A", 5]],
             [[106, 122], ["A", 6]],
             [[107, 123], ["A", 7]],
             [[108, 124], ["A", 8]],
             [[109, 125], ["A", 9]],
             [[110, 126], ["A", 10]],
             [[111, 127], ["A", 11]],
             [[112, 128], ["A", 12]],
             [[113, 129], ["A", 13]],
             [[114, 130], ["A", 14]],
             [[115, 134], ["A", 15]],
             [[131, 16], ["B", 0]],
             [[1, 17], ["B", 1]],
             [[2, 18], ["B", 2]],
             [[3, 19], ["B", 3]],
             [[4, 20], ["B", 4]],
             [[5, 21], ["B", 5]],
             [[6, 22], ["B", 6]],
             [[7, 23], ["B", 7]],
             [[8, 24], ["B", 8]],
             [[9, 25], ["B", 9]],
             [[10, 26], ["B", 10]],
             [[11, 27], ["B", 11]],
             [[12, 28], ["B", 12]],
             [[13, 29], ["B", 13]],
             [[14, 30], ["B", 14]],
             [[15, 132], ["B", 15]],
             [[34, 35], ["D", 1]],
             [[35, 36], ["D", 2]],
             [[36, 37], ["D", 3]],
             [[37, 38], ["D", 4]],
             [[38, 39], ["D", 5]],
             [[39, 40], ["D", 6]],
             [[43, 44], ["C", 1]],
             [[44, 45], ["C", 2]],
             [[45, 46], ["C", 3]],
             [[49, 50], ["circle", 1]],
             [[50, 51], ["circle", 2]],
             [[51, 52], ["circle", 3]],
             [[52, 53], ["circle", 4]],
             [[53, 54], ["circle", 5]],
             [[54, 55], ["circle", 6]],
             [[55, 56], ["circle", 7]],
             [[56, 57], ["circle", 8]],
             [[57, 58], ["circle", 9]],
             [[58, 59], ["circle", 10]],
             [[59, 60], ["circle", 11]],
             [[60, 61], ["circle", 12]],
             [[61, 62], ["circle", 13]]]
      candidate = []
      for _map in map
        [a, b] = _map[0]
        beacon_a = beacons.filter((_item)-> _item.rssi isnt 0 and _item.minor is a)
        beacon_b = beacons.filter((_item)-> _item.rssi isnt 0 and _item.minor is b)
        if beacon_a.length > 0 and beacon_b.length > 0
          candidate.push(rssi: (beacon_a[0].rssi + beacon_b[0].rssi) / 2, point: _map[1])
      candidate.sort((x, y)-> y.rssi - x.rssi)
      try
        if filter_near > 0 and candidate.length > 1 and candidate[0].rssi - candidate[1].rssi <= filter_near
          return null
        return candidate[0].point
      catch e
        return null

    nearest2_v21 = (beacons, filter_near = 0, check_nearest = true)->
      map = [[[133, 116], ["A", 0]],
             [[101, 117], ["A", 1]],
             [[102, 118], ["A", 2]],
             [[103, 119], ["A", 3]],
             [[104, 120], ["A", 4]],
             [[105, 121], ["A", 5]],
             [[106, 122], ["A", 6]],
             [[107, 123], ["A", 7]],
             [[108, 124], ["A", 8]],
             [[109, 125], ["A", 9]],
             [[110, 126], ["A", 10]],
             [[111, 127], ["A", 11]],
             [[112, 128], ["A", 12]],
             [[113, 129], ["A", 13]],
             [[114, 130], ["A", 14]],
             [[115, 134], ["A", 15]],
             [[131, 16], ["B", 0]],
             [[1, 17], ["B", 1]],
             [[2, 18], ["B", 2]],
             [[3, 19], ["B", 3]],
             [[4, 20], ["B", 4]],
             [[5, 21], ["B", 5]],
             [[6, 22], ["B", 6]],
             [[7, 23], ["B", 7]],
             [[8, 24], ["B", 8]],
             [[9, 25], ["B", 9]],
             [[10, 26], ["B", 10]],
             [[11, 27], ["B", 11]],
             [[12, 28], ["B", 12]],
             [[13, 29], ["B", 13]],
             [[14, 30], ["B", 14]],
             [[15, 132], ["B", 15]],
             [[34, 35], ["D", 1]],
             [[35, 36], ["D", 2]],
             [[36, 37], ["D", 3]],
             [[37, 38], ["D", 4]],
             [[38, 39], ["D", 5]],
             [[39, 40], ["D", 6]],
             [[43, 44], ["C", 1]],
             [[44, 45], ["C", 2]],
             [[45, 46], ["C", 3]],
             [[49, 50], ["circle", 1]],
             [[50, 51], ["circle", 2]],
             [[51, 52], ["circle", 3]],
             [[52, 53], ["circle", 4]],
             [[53, 54], ["circle", 5]],
             [[54, 55], ["circle", 6]],
             [[55, 56], ["circle", 7]],
             [[56, 57], ["circle", 8]],
             [[57, 58], ["circle", 9]],
             [[58, 59], ["circle", 10]],
             [[59, 60], ["circle", 11]],
             [[60, 61], ["circle", 12]],
             [[61, 62], ["circle", 13]]]
      beacons = beacons.filter((_item)-> _item.rssi isnt 0)
      candidate = []
      for _map in map
        [a, b] = _map[0]
        beacon_a = beacons.filter((_item)-> _item.minor is a)
        beacon_b = beacons.filter((_item)-> _item.minor is b)
        if beacon_a.length > 0 and beacon_b.length > 0
          candidate.push(rssi: (beacon_a[0].rssi + beacon_b[0].rssi) / 2, point: _map[1], minor: _map[0])

      if candidate.length is 0
        return null

      candidate.sort((x, y)-> y.rssi - x.rssi)
      if filter_near > 0
        if candidate.length > 1 and candidate[0]['rssi'] - candidate[1]['rssi'] <= filter_near
          return null

      if check_nearest # 一番強いビーコンであることを検査する
        beacons.sort((x, y)-> y.rssi - x.rssi)
        if candidate[0].minor.indexOf(beacons[0]['minor']) is -1
          return null

      return candidate[0].point

    d = @buffer.last(WINDOW_SIZE)[0]

    accuracy = 1
    ret = nearestD(d, @compass, 6)
    algorithm = 'nearestD'
    if not ret?
      ret = nearest2_v21(d, 3)
      algorithm = 'nearest2'
      if not ret?
        accuracy = 0.6
        ret = nearest1(d, 6)
        algorithm = 'nearest1'
        if not ret?
          accuracy = 0.3
          ret = nearest2_v21(d, 1)
          algorithm = 'nearest2'
          if not ret?
            ret = nearest1(d)
            accuracy = 0
            if not ret?
              accuracy = 0
              algorithm = null

    @algorithm = algorithm
    @positionAccuracy = accuracy
    if ret?
      p = POINT_2_LATLNG.filter((row)-> row.lane is ret[0] and row.point is ret[1])[0]
      if p?
        if true #accuracy is 0 and $('#destination').attr('accuracy') == 'true'
          @lane = p.lane
          @position = p.point
          @positionLatLng = p.latlng

    # 関数の状態を画面に出す
    d = d.filter((_b)-> _b.rssi isnt 0)
    d.sort((_a, _b)-> _b.rssi - _a.rssi)
    text = JSON.stringify({
      accuracy: accuracy ? null,
      algorithm: algorithm ? null,
      rssi:
        0: String(d[0]?.minor) + ' ' + String(d[0]?.rssi)
        1: String(d[1]?.minor) + ' ' + String(d[1]?.rssi)
        diff: d[0]?.rssi - d[1]?.rssi
    }, null, 2)
    $('#info').text(text)

    return true

#TODO: POSITION_TABLEの統合を進める 無理そうならfloor, facility周りの不確定な仕様を確定させる→バグ直す
