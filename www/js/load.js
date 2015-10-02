var scriptTimeout = 5000;

$.ajax({
    type: 'GET',
    url: 'https://calil.jp/static/apps/sabatomap/v100.js',
    cache: false,
    dataType: 'script',
    timeout: scriptTimeout,
    success: function (data) {
        var scriptOnLoad = function () {
            initialize();
        };
        var script = document.createElement('script');
        script.onload = scriptOnLoad;
        script.innerHTML = data;
        document.body.appendChild(script);
    },
    error: function () {
        var script = document.createElement('script');
        script.src = 'js/all.js';
        document.body.appendChild(script);
        setTimeout(function () {
            initialize(); // とりあえずスプラッシュ非表示の遅延のため
        }, 2000);
    },
    complete: function () {
    }
});
 