load = ->
  $.ajax
    type: 'GET'
    url: 'https://calil.jp/static/apps/sabatomap/update_v100.js'
    cache: false
    dataType: 'script'
    timeout: 5000
    success: (data) ->
      script = document.createElement('script')
      script.innerHTML = data
      script.onload = ->
        initialize()
      document.body.appendChild script
      return true
    error: ->
      script = document.createElement('script')
      script.src = 'js/all.js'
      script.onload = ->
        initialize()
      document.body.appendChild script
      return true
if typeof device is 'undefined'
  document.addEventListener 'deviceready', load
else
  load()