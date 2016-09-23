class api
  constructor: (systemid, query, callback) ->
    @callback = callback
    @systemid = systemid
    @query = query
    console.log('[API] start session for query -> ' + query)
    @value =
      completed: false
      message: ''
      hint: ''
      books: []
    @killed = false
    @session = null
    @queue = []
    if @query
      @continue()
    else
      @value.completed = true
    @changed()

  kill: ->
    console.log('[API] session ' + (@session) + ' killed.')
    @killed = true
    @queue.length = 0

  changed: ->
    @callback @value

  continue: ->
    params = {}
    if @session
      params = {session: @session}
    else
      params = {f: @query, sysid: @systemid}
    superagent.get 'https://api.calil.jp/search', params
      .end (err, res) =>
        if err or not res.ok
          @value.completed = true
          @updateMessage('データ取得に失敗しました。')
        else
          @receive(res.body)

  receive: (data)->
    @session = data.session
    if data.continue == 1
      console.log('[API] session continue...')
      if not @killed
        setTimeout (=> @continue() ), 800
        @value.message = 'さがしています'
        return
    else
      console.log('[API] session complete.')
    @value.completed = true
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
          author: book.A
          url: book.U
          result:
            stocks: []
            thumbnail: ''
            message: ''
        })
        @queue.push(book.K)
      result = data.results[@systemid]
      @value.count = result.count
      @value.completed = true
      @value.message = resultData.count + '件見つかりました'
      if resultData.count > 50
        @value.hint = '結果のうち新しい順で50件目までを表示しています。必要に応じてキーワードを絞り込んでください。'
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
      version: '1.4.0'
    superagent.get 'https://api.calil.jp/search_warabi_v1', params
      .timeout 5000
      .end (err, res) =>
        if err or not res.ok
          console.error(err)
        else
          for book in @value.books
            if book.id == id
              book.result = res.body
          @changed()
        @detail()
