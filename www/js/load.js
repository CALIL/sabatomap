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

// Todo: deviceReadyで実行する
// Todo: オフラインだったら、ローカル
// Todo: オンラインだったら、サーバーからロードする

for(var i=0,l=jsFiles.length;i<l;i++){
  createScriptTag(jsFiles[i]);
}