Queue = ->
  @__a = new Array
  return

Queue::enqueue = (o) ->
  @__a.push o
  return

Queue::dequeue = ->
  if @__a.length > 0
    return @__a.shift()
  null

Queue::size = ->
  @__a.length

Queue::toString = ->
  '[' + @__a.join(',') + ']'

class api
  count: null
  session: null
  sysid: null
  book_count: 0
  # 結果をレンダリングするかのフラグ
  render_flag: true
  showImageInstance: null
  continue_count: 0
  queue: new Queue()

  search: (target, queryText, render) ->
    @queue.size 0
    @target = target
    keyword = queryText
    @render = ()=>
      if @render_flag
        render()

    systemids = []
    @target.message = 'さがしています...'
    @target.hint = ''
    systemids.push(@target.params.systemid)
    @render()

    @continue_count = 0
    @count = null
    @session = null
    @bookimages = {}
    $.ajax
      url: 'https://api.calil.jp/search'
      type: 'GET'
      data:
        f: keyword
        sysid: systemids.join(',')
      dataType: 'jsonp'
      success: (data) =>
        log(data)
        @session = data.session
        if data.continue == 1
          @result(data)
          @continue_search(@session)
        else
          @result(data)

      error: () =>
        @error()

  continue_search: (session) ->
    if @render_flag == null
      return
    $.ajax
      url: 'https://api.calil.jp/search'
      type: 'GET'
      data:
        session: session
      dataType: 'jsonp'
      success: (data) =>
        log(data)
        if data.continue == 1
          @result(data)
          if @continue_count == 10
            @showAllMessage('時間がかかっています...')
          else if @continue_count == 120
            @showAllMessage('検索がタイムアウトしました', true)
            return
          setTimeout =>
            @continue_count++
            @continue_search(@session)
          , 1000
        else
          @result(data)
      error: () =>
        @error()
  # レンダリングをストップする
  stop: ->
    @render_flag = null
    @showImageInstance = null
  error: ->
    @showAllMessage('データ取得に失敗しました。', true)
  # すべてのモジュールのメッセージを出す
  showAllMessage: (message, error = false)->
    # データが表示されているtargetはスキップする
    if @target.complete
      return
    @target.message = message
    if error == true
      @target.error = true
      @target.complete = true
    @render()
  showMessage: (target, message)->
    target.message = message
    target.hint = ''
    @render()
  showError: (target, message)->
    target.message = message
    target.complete = true
    target.hint = ''
    target.error = true
    @render()
  result: (data) ->
    #log(data)
    #log(@target)
    # データを反映済のtargetは処理しない
    if @target.complete
      return
    resultData = data.results[@target.params.systemid]
    if resultData.status == 'Error'
      @showError(@target, '検索エラーが発生しました。')
      return
    if resultData.status == 'Running'
      return
    if resultData.status == 'OK'
      try
        if not data.results[@target.params.systemid]?
          @showError(@target, '検索の読み込みに失敗しました。')
          return
      catch error
        @showError(@target, '検索に失敗しました。')
        return

      @target.message = resultData.count + '件見つかりました'


      books = resultData.books
      @count = resultData.count
      if books.length <= 0
        @showError(@target, '見つかりませんでした。')
        return

      new_books = []
      for book in books
        book.id = book.K
        book.title = book.T
        book.url = book.U
        new_books.push(book)

      result = data.results[@target.params.systemid]
      @target.count = result.count
      @target.books = result.books
      @target.opacurl = result.opacurl
      @target.complete = true
      @target.error = false
      if resultData.count > 50
        @target.hint = '結果のうち50件目までを表示しています。'
      else
        @target.hint = ''
      # targetの書影用に連想配列を作る
      @bookimages[@target.id] = {}
      $(books).each (i, e) =>
        @queue.enqueue(e.K)
      log(@target)
      @detail(@target)
    @render()

  bookimages: {}
  detail: (target)->
    id = @queue.dequeue()
    if id == null
      return
    params =
      k: id
      s: target.params.systemid
      session: @session
      version: '1.1.0'
    $.ajax
      url: 'https://api.calil.jp/search_warabi_v1'
      type: 'GET'
      processData: true
      data: params
      dataType: 'jsonp'
      timeout: 5000,
      success: (data) =>
        log(data)
        $('#' + id).closest('.book').attr('data', JSON.stringify(data))
        $('#stock' + id).html(data.html)
        if data.isbn and data.isbn != ""
          $image = $('#image' + id)
          border = $image.css('border')
          $image.attr('src', 'https://images-na.ssl-images-amazon.com/images/P/' + data.isbn + '.09.MZZZZZZZ.jpg').css('border', 'none')
          $image.load ->
            height = $(this).css('height')
            $(this).css('height', 'auto')
            if this.width == 1
              this.src = 'https://calil.jp/public/img/no-image/medium-noborder.gif'
              $(this).css('height', height).css('border', border)
          @bookimages[target.id][data.isbn] = {
            id: id
            url: data.url
          }
      error: =>
        #        @error()
      complete: =>
        @detail(target)

class ShowGoogleImage
  show: (bookimages)->
    log(bookimages)
    isbns = []
    for isbn, book of bookimages
      isbns.push(isbn)
      $('#image' + book.id).attr('id', 'image' + isbn)
    params = []
    for isbn in isbns
      #      log(isbn)
      params.push('isbn:' + isbn)
    query = params.join('%20OR%20')
    params = {
      'q': query
      'country': 'JP'
    }
    $.ajax
      dataType: 'json'
      url: 'https://www.googleapis.com/books/v1/volumes'
    # パラメーターをurlエンコードせずに渡す
      data: decodeURIComponent($.param(params))
      crossDomain: true
      success: (gdata) =>
        new_bookimages = []
        if gdata.totalItems > 0
          for item in gdata.items
            if item.volumeInfo.imageLinks? and item.volumeInfo.industryIdentifiers?
              for i in item.volumeInfo.industryIdentifiers
                if i.type == 'ISBN_10'
                  isbn = i.identifier
              if item.volumeInfo.imageLinks?.thumbnail?
                imageurl = @getImageURL(item.volumeInfo.imageLinks.thumbnail)
                log(isbn)
                new_bookimages.push({"isbn": isbn, "imageurl": imageurl})
                $('#image' + isbn).attr('src', imageurl);
          console.log(new_bookimages)
      error: (data)=>
      complete: =>
        @animateThumb(0)

  # 書影のURLをhttps対応にする
  getImageURL: (url)->
    parser = document.createElement('a');
    parser.href = url
    parser.protocol = 'https:'
    parser.hostname = 'encrypted.google.com'
    return parser.href
  animateThumb: (index)->
    $obj = $(".thumbnail:eq(" + index + ")")
    if $obj.length > 0
      $obj.animate
        opacity: 1
      , 500
    setTimeout(=>
      @animateThumb(index + 1)
    , 100)
