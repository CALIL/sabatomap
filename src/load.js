var load = function() {
  var script;
  script = document.createElement('script');
  script.onload = function() {
    return app.initializeApp();
  };
  return superagent.get('https://calil.jp/static/apps/sabatomap/update_v120.js?_=' + Math.random()).timeout(5000).end(function(err, res) {
    if (err || !res.ok) {
      script.src = 'js/all.js';
    } else {
      script.innerHTML = res.text;
    }
    return document.body.appendChild(script);
  });
};

if (typeof cordova !== "undefined" && cordova !== null) {
  document.addEventListener('deviceready', load);
} else {
  load();
}
