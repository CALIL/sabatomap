var Queue, ShowGoogleImage, api;

Queue = function() {
  this.__a = new Array;
};

Queue.prototype.enqueue = function(o) {
  this.__a.push(o);
};

Queue.prototype.dequeue = function() {
  if (this.__a.length > 0) {
    return this.__a.shift();
  }
  return null;
};

Queue.prototype.size = function() {
  return this.__a.length;
};

Queue.prototype.toString = function() {
  return '[' + this.__a.join(',') + ']';
};

api = (function() {
  function api() {}

  api.prototype.count = null;

  api.prototype.session = null;

  api.prototype.sysid = null;

  api.prototype.book_count = 0;

  api.prototype.render_flag = true;

  api.prototype.showImageInstance = null;

  api.prototype.continue_count = 0;

  api.prototype.queue = {};

  api.prototype.search = function(target, queryText, render) {
    var keyword, systemids;
    this.target = target;
    keyword = queryText;
    this.render = (function(_this) {
      return function() {
        if (_this.render_flag) {
          return render();
        }
      };
    })(this);
    systemids = [];
    this.target.message = '検索中...';
    systemids.push(this.target.params.systemid);
    this.render();
    this.continue_count = 0;
    this.count = null;
    this.session = null;
    this.bookimages = {};
    return $.ajax({
      url: 'https://api.calil.jp/search',
      type: 'GET',
      data: {
        f: keyword,
        sysid: systemids.join(',')
      },
      dataType: 'jsonp',
      success: (function(_this) {
        return function(data) {
          log(data);
          _this.session = data.session;
          if (data["continue"] === 1) {
            _this.result(data);
            return _this.continue_search(_this.session);
          } else {
            return _this.result(data);
          }
        };
      })(this),
      error: (function(_this) {
        return function() {
          return _this.error();
        };
      })(this)
    });
  };

  api.prototype.continue_search = function(session) {
    if (this.render_flag === null) {
      return;
    }
    return $.ajax({
      url: 'https://api.calil.jp/search',
      type: 'GET',
      data: {
        session: session
      },
      dataType: 'jsonp',
      success: (function(_this) {
        return function(data) {
          log(data);
          if (data["continue"] === 1) {
            _this.result(data);
            if (_this.continue_count === 10) {
              _this.showAllMessage('検索に時間がかかっています...');
            } else if (_this.continue_count === 120) {
              _this.showAllMessage('検索がタイムアウトしました', true);
              return;
            }
            return setTimeout(function() {
              _this.continue_count++;
              return _this.continue_search(_this.session);
            }, 1000);
          } else {
            return _this.result(data);
          }
        };
      })(this),
      error: (function(_this) {
        return function() {
          return _this.error();
        };
      })(this)
    });
  };

  api.prototype.stop = function() {
    this.render_flag = null;
    return this.showImageInstance = null;
  };

  api.prototype.error = function() {
    return this.showAllMessage('データ取得に失敗しました。', true);
  };

  api.prototype.showAllMessage = function(message, error) {
    if (error == null) {
      error = false;
    }
    if (this.target.complete) {
      return;
    }
    this.target.message = message;
    if (error === true) {
      this.target.error = true;
      this.target.complete = true;
    }
    return this.render();
  };

  api.prototype.showMessage = function(target, message) {
    target.message = message;
    return this.render();
  };

  api.prototype.showError = function(target, message) {
    target.message = message;
    target.complete = true;
    target.error = true;
    return this.render();
  };

  api.prototype.result = function(data) {
    var book, books, error, error1, j, len, new_books, ref, result, resultData;
    log(data);
    log(this.target);
    if (this.target.complete) {
      return;
    }
    resultData = data.results[this.target.params.systemid];
    if (resultData.status === 'Error') {
      this.showError(this.target, '検索エラーが発生しました。');
      return;
    }
    if (resultData.status === 'Running') {
      return;
    }
    if (resultData.status === 'OK') {
      try {
        if (data.results[this.target.params.systemid] == null) {
          this.showError(this.target, '検索の読み込みに失敗しました。');
          return;
        }
      } catch (error1) {
        error = error1;
        this.showError(this.target, '検索に失敗しました。');
        return;
      }
      books = resultData.books;
      log(books);
      this.count = resultData.count;
      if (books.length <= 0) {
        this.showError(this.target, '本が見つかりませんでした。');
        return;
      }
      new_books = [];
      ref = books.slice(0, 20);
      for (j = 0, len = ref.length; j < len; j++) {
        book = ref[j];
        book.id = book.K;
        book.title = book.T;
        book.url = book.U;
        new_books.push(book);
      }
      result = data.results[this.target.params.systemid];
      this.target.count = result.count;
      this.target.books = result.books;
      this.target.opacurl = result.opacurl;
      this.target.complete = true;
      this.target.message = null;
      this.target.error = false;
      this.bookimages[this.target.id] = {};
      this.queue[this.target.id] = new Queue();
      $(books).each((function(_this) {
        return function(i, e) {
          if (i > 10) {
            return false;
          }
          return _this.queue[_this.target.id].enqueue(e.K);
        };
      })(this));
      log(this.target);
      this.detail(this.target);
    }
    return this.render();
  };

  api.prototype.bookimages = {};

  api.prototype.detail = function(target) {
    var id, params;
    id = this.queue[target.id].dequeue();
    log(id);
    if (id === null) {
      return;
    }
    params = {
      k: id,
      s: target.params.systemid,
      session: this.session
    };
    return $.ajax({
      url: 'https://api.calil.jp/search_warabi_v1',
      type: 'GET',
      processData: true,
      data: params,
      dataType: 'jsonp',
      timeout: 5000,
      success: (function(_this) {
        return function(data) {
          var $image, border;
          log(data);
          $('#' + id).closest('.book').attr('data', JSON.stringify(data));
          $('#stock' + id).html(data.html);
          if (data.isbn && data.isbn !== "") {
            $image = $('#image' + id);
            border = $image.css('border');
            $image.attr('src', 'https://images-na.ssl-images-amazon.com/images/P/' + data.isbn + '.09.MZZZZZZZ.jpg').css('border', 'none');
            $image.load(function() {
              var height;
              height = $(this).css('height');
              $(this).css('height', 'auto');
              if (this.width === 1) {
                this.src = 'https://calil.jp/public/img/no-image/medium-noborder.gif';
                return $(this).css('height', height).css('border', border);
              }
            });
            return _this.bookimages[target.id][data.isbn] = {
              id: id,
              url: data.url
            };
          }
        };
      })(this),
      error: (function(_this) {
        return function() {};
      })(this),
      complete: (function(_this) {
        return function() {
          return _this.detail(target);
        };
      })(this)
    });
  };

  return api;

})();

ShowGoogleImage = (function() {
  function ShowGoogleImage() {}

  ShowGoogleImage.prototype.show = function(bookimages) {
    var book, isbn, isbns, j, len, params, query;
    log(bookimages);
    isbns = [];
    for (isbn in bookimages) {
      book = bookimages[isbn];
      isbns.push(isbn);
      $('#image' + book.id).attr('id', 'image' + isbn);
    }
    params = [];
    for (j = 0, len = isbns.length; j < len; j++) {
      isbn = isbns[j];
      params.push('isbn:' + isbn);
    }
    query = params.join('%20OR%20');
    params = {
      'q': query,
      'country': 'JP'
    };
    return $.ajax({
      dataType: 'json',
      url: 'https://www.googleapis.com/books/v1/volumes',
      data: decodeURIComponent($.param(params)),
      crossDomain: true,
      success: (function(_this) {
        return function(gdata) {
          var i, imageurl, item, k, l, len1, len2, new_bookimages, ref, ref1, ref2;
          new_bookimages = [];
          if (gdata.totalItems > 0) {
            ref = gdata.items;
            for (k = 0, len1 = ref.length; k < len1; k++) {
              item = ref[k];
              if ((item.volumeInfo.imageLinks != null) && (item.volumeInfo.industryIdentifiers != null)) {
                ref1 = item.volumeInfo.industryIdentifiers;
                for (l = 0, len2 = ref1.length; l < len2; l++) {
                  i = ref1[l];
                  if (i.type === 'ISBN_10') {
                    isbn = i.identifier;
                  }
                }
                if (((ref2 = item.volumeInfo.imageLinks) != null ? ref2.thumbnail : void 0) != null) {
                  imageurl = _this.getImageURL(item.volumeInfo.imageLinks.thumbnail);
                  log(isbn);
                  new_bookimages.push({
                    "isbn": isbn,
                    "imageurl": imageurl
                  });
                  $('#image' + isbn).attr('src', imageurl);
                }
              }
            }
            return console.log(new_bookimages);
          }
        };
      })(this),
      error: (function(_this) {
        return function(data) {};
      })(this),
      complete: (function(_this) {
        return function() {
          return _this.animateThumb(0);
        };
      })(this)
    });
  };

  ShowGoogleImage.prototype.getImageURL = function(url) {
    var parser;
    parser = document.createElement('a');
    parser.href = url;
    parser.protocol = 'https:';
    parser.hostname = 'encrypted.google.com';
    return parser.href;
  };

  ShowGoogleImage.prototype.animateThumb = function(index) {
    var $obj;
    $obj = $(".thumbnail:eq(" + index + ")");
    if ($obj.length > 0) {
      $obj.animate({
        opacity: 1
      }, 500);
    }
    return setTimeout((function(_this) {
      return function() {
        return _this.animateThumb(index + 1);
      };
    })(this), 100);
  };

  return ShowGoogleImage;

})();
