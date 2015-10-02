// サーバー
var scriptServer = 'https://calil.jp/static/apps/sabatomap/www/';
var scriptUrl = 'js/sabatomap2.all.js';
// タイムアウト ミリ秒
var scriptTimeout = 5000;


var scriptOnLoad = function () {
  $(document).trigger('deviceready');
};

$.ajax({
    type:'GET',
    url: scriptServer+scriptUrl,
    cache: false,
    dataType: 'script',
    timeout: scriptTimeout,
    success: function(data){
      var script = document.createElement('script');
      script.onload = scriptOnLoad;
      script.innerHTML = data;
      document.body.appendChild(script);
    },
    error: function(){
      var script = document.createElement('script');
      script.onload = scriptOnLoad;
      script.src = scriptUrl;
      document.body.appendChild(script);
    },
    complete: function(){
    }
});
