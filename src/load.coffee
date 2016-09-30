load = ->
  script = document.createElement('script')
  script.onload = ->
    app.initializeApp()
  superagent.get 'https://calil.jp/static/apps/sabatomap/update_v120.js?_=' + Math.random()
    .timeout 5000
    .end (err, res) ->
      if err or not res.ok
        script.src = 'js/all.js'
      else
        script.innerHTML = res.text
      document.body.appendChild script
if cordova?
  document.addEventListener 'deviceready', load
else
  load()
