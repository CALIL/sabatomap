import request from 'superagent'

export default class api {
  constructor(systemid, query, callback) {
    this.callback = callback;
    this.systemid = systemid;
    this.query = query;
    console.log("[API] start session for query -> " + query);

    this.value = {
      completed: false,
      message: "",
      hint: "",
      books: []
    };

    this.killed = false;
    this.session = null;
    this.queue = [];

    if (this.query) {
      this.continue();
    } else {
      this.value.completed = true;
    }

    this.changed();
  }

  kill() {
    console.log("[API] session " + (this.session) + " killed.");
    this.killed = true;
    return this.queue.length = 0;
  }

  changed() {
    return this.callback(this.value);
  }

  continue() {
    var params = {};

    if (this.session) {
      params = {
        session: this.session
      };
    } else {
      params = {
        f: this.query,
        sysid: this.systemid
      };
    }

    return request.get("https://api.calil.jp/search", params).end((err, res) => {
      if (err || !res.ok) {
        this.value.completed = true;
        return this.updateMessage("データ取得に失敗しました。");
      } else {
        return this.receive(res.body);
      }
    });
  }

  receive(data) {
    var result;
    var books;
    this.session = data.session;

    if (data.continue === 1) {
      console.log("[API] session continue...");

      if (!this.killed) {
        setTimeout((() => {
          return this.continue();
        }), 800);

        this.value.message = "さがしています";
        return;
      }
    } else {
      console.log("[API] session complete.");
    }

    this.value.completed = true;
    var resultData = data.results[this.systemid];

    if (resultData.status === "Error") {
      this.updateMessage("検索エラーが発生しました。");
      return;
    }

    if (resultData.status === "Running") {
      return;
    }

    if (resultData.status === "OK") {
      books = resultData.books;

      if (books.length <= 0) {
        this.updateMessage("見つかりませんでした。");
        return;
      }

      this.value.books = [];

      for (var book of books) {
        this.value.books.push({
          id: book.K,
          title: book.T,
          author: book.A,
          url: book.U,

          result: {
            stocks: [],
            thumbnail: "",
            message: ""
          }
        });

        this.queue.push(book.K);
      }

      result = data.results[this.systemid];
      this.value.count = result.count;
      this.value.completed = true;
      this.value.message = resultData.count + "件見つかりました";

      if (resultData.count > 50) {
        this.value.hint = "結果のうち新しい順で50件目までを表示しています。必要に応じてキーワードを絞り込んでください。";
      } else {
        this.value.hint = "";
      }

      this.detail();
      return this.changed();
    }
  }

  updateMessage(message) {
    this.value.message = message;
    return this.changed();
  }

  detail() {
    if (this.queue.length === 0) {
      return;
    }

    var id = this.queue.shift();

    var params = {
      k: id,
      s: this.systemid,
      session: this.session,
      version: "1.4.0"
    };

    return request.get("https://api.calil.jp/search_warabi_v1", params).timeout(5000).end((err, res) => {
      if (err || !res.ok) {
        console.error(err);
      } else {
        for (var book of this.value.books) {
          if (book.id === id) {
            book.result = res.body;
          }
        }

        this.changed();
      }

      return this.detail();
    });
  }
}
