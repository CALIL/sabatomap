import request from 'superagent';

function load() {
  let script = document.createElement('script');
  script.onload = function () {
    window.app.initializeApp();
  };

  request.get('https://calil.jp/static/apps/sabatomap/update_v160.js?_=' + Math.random())
    .timeout(5000)
    .end(function (err, res) {
      if (err || !res.ok) {
        script.src = 'js/all.js';
      } else {
        script.innerHTML = res.text;
      }
      document.body.appendChild(script);
    });
}

if (typeof cordova !== "undefined" && cordova !== null) {
  document.addEventListener('deviceready', load);
} else {
  load();
}
