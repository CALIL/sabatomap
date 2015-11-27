
load = ->
  script = document.createElement('script')
  script.onload = ->
    initializeApp()
  $.ajax
    type: 'GET'
    url: 'https://calil.jp/static/apps/sabatomap/update_v100.js'
    cache: false
    dataType: 'script'
    timeout: 5000
    success: (data) ->
      script.innerHTML = data
      document.body.appendChild script
    error: ->
      script.src = 'js/all.js'
      document.body.appendChild script
#if cordova?
#  document.addEventListener 'deviceready', load
#else
load()