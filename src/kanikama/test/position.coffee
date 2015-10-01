#
# for Mac Chrome
# sudo /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --args -allow-file-access-from-files
#
#
SABAE = true
kanikama = new OldKanikama()
newKanikama = new Kanikama()

# データの準備
$ ->
  $.when(
    $.getJSON('https://app.haika.io/api/facility/7/7.geojson')
    $.getJSON('https://app.haika.io/api/facility/7/8.geojson')
  ).then(->
    for data in arguments
      if data[1] is 'success'
        kanikama.addGeoJSON(data[0])
        newKanikama.addGeoJSON(data[0])
    return
  ).then(->
    showResult('テスト開始')
    test() # 20件分をテスト
  )
  return

# テキスト表示
showResult = (text)->
  setTimeout(->
    $('#result').text($('#result').text() + text + '\n')
  , 10)

# テスト本体
# @param size [Number] テストするログデータの件数 未指定:全件
test = (size = null)->
  $.getJSON('./nd_data.json', (testData)->
    showResult('データ読み込み完了')

    result =
      ok: 0
      ng: 0
    for row, i in testData
      if size? and i >= size
        break
      kanikama.pushCompass(row.compass[0].webkitCompassHeading)
      newKanikama.pushCompass(row.compass[0].webkitCompassHeading)
      for beacons in row.data
        kanikama.pushBeacons(beacons)
        newKanikama.pushBeacons(beacons)

        answer = kanikama.positionLatLng
        position = newKanikama.positionLatLng

        # 旧kanikamaと試作kanikamaが同じかどうか
        if (answer is position) or ((position? and answer?) and (position[0] is answer[0] and position[1] is answer[1]))
          result.ok++
        else
          result.ng++
          console.log('エラー' + kanikama.positionAccuracy)
          console.log([kanikama.lane, newKanikama.lane])
          console.log([kanikama.position, newKanikama.position])
    showResult(JSON.stringify(result, null, 2))
    if result.ng > 0
      showResult('テスト完了! ngあり')
    else
      showResult('テスト完了!')
    return
  )
