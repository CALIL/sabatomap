function createScriptTag(src){
  document.write('<scri'+'pt src="'+src+'">'+'</scri'+'pt>');
}

var jsFiles = [
  // Kanikama
  'vendor/kanimarker.js',
  'vendor/kanilayer.js',
  'js/kanikama/buffer.js',
  'js/kanikama/kanikama.js',
  // このプロジェクト固有のプログラム
  'js/app.js',
  // 通知
  'js/notify.js',
  // 検索
  'js/searchSetting.js',
  'js/search.js',
  'js/searchReact.js',
];


for(var i=0,l=jsFiles.length;i<l;i++){
  createScriptTag(jsFiles[i]);
}


// サーバー
var scriptServer = 'https://calil.jp/static/apps/sabatomap/www/';
var scriptUrl = 'js/start.js';
// タイムアウト ミリ秒
var scriptTimeout = 5000;

$.ajax({
    type:'GET',
    url: scriptServer+scriptUrl,
    cache: false,
    dataType: 'script',
    timeout: scriptTimeout,
    success: function(data){
      var script = document.createElement('script');
      script.innerHTML = data;
      document.body.appendChild(script);
    },
    error: function(){
      var script = document.createElement('script');
      script.src = scriptUrl;
      document.body.appendChild(script);

    }
});