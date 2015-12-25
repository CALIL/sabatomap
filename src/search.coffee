class api
  constructor: (systemid, query, callback) ->
    console.log('[API] start session for query -> ' + query)
    @value = {
      message: ''
      hint: ''
      books: []
    }
    @bookimages = {}
    @showImageInstance = null
    @continue_count = 0
    @killed = false
    @queue = []
    @session = null
    @onChange = callback
    @systemid = systemid
    @query = query
    if @query
      $.ajax
        url: 'https://api.calil.jp/search'
        type: 'GET'
        data:
          f: query
          sysid: @systemid
        dataType: 'json'
        success: (data) =>
          @session = data.session
          @receive(data)
        error: () =>
          @updateMessage('データ取得に失敗しました。')
    @changed()

  kill: ()->
    console.log('[API] session ' + (@session) + ' killed.')
    @killed = true
    @showImageInstance = null
    @queue.length = 0

  changed: ()->
    if @onChange
      @onChange(@value)

  continue: () ->
    $.ajax
      url: 'https://api.calil.jp/search'
      type: 'GET'
      data:
        session: @session
      dataType: 'json'
      success: (data) =>
        @receive(data)
      error: () =>
        @updateMessage('データ取得に失敗しました。')

  receive: (data)->
    if data.continue == 1
      console.log('[API] session continue...')
      if not @killed
        setTimeout (=> @continue() ), 800
        @value.message = 'さがしています'
        return
    else
      console.log('[API] session complete.')
    resultData = data.results[@systemid]
    if resultData.status == 'Error'
      @updateMessage('検索エラーが発生しました。')
      return
    if resultData.status == 'Running'
      return
    if resultData.status == 'OK'
      books = resultData.books
      if books.length <= 0
        @updateMessage('見つかりませんでした。')
        return
      @value.books = []
      for book in books
        @value.books.push({
          id: book.K
          title: book.T
          url: book.U
        })
        @queue.push(book.K)
      result = data.results[@systemid]
      @value.count = result.count
      @value.message = resultData.count + '件見つかりました'
      if resultData.count > 50
        @value.hint = '結果のうち50件目までを表示しています。'
      else
        @value.hint = ''
      @detail()
      @changed()

  updateMessage: (message)->
    @value.message = message
    @changed()

  detail: ()->
    if @queue.length == 0
      return
    id = @queue.shift()
    params =
      k: id
      s: @systemid
      session: @session
      version: '1.3.0'
    $.ajax
      url: 'https://api.calil.jp/search_warabi_v1'
      type: 'GET'
      processData: true
      data: params
      dataType: 'json'
      timeout: 5000,
      success: (data) =>
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
          @bookimages[data.isbn] = {
            id: id
            url: data.url
          }
      complete: =>
        @detail()

class ShowGoogleImage
  show: (bookimages)->
    log(bookimages)
    isbns = []
    for isbn, book of bookimages
      isbns.push(isbn)
      $('#image' + book.id).attr('id', 'image' + isbn)
    params = []
    for isbn in isbns
      params.push('isbn:' + isbn)
    query = params.join('%20OR%20')
    params = {
      'q': query
      'country': 'JP'
    }
    $.ajax
      dataType: 'json'
      url: 'https://www.googleapis.com/books/v1/volumes'
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
