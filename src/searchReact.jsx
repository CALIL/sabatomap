var Search = React.createClass({
    getInitialState: function () {
        return {query: '', completed: true};
    },
    doSearch: function (query) {
        this.setState({query: query});
    },
    doClose: function () {
        this.doSearch('');
    },
    setCompleted: function (x) {
        this.setState({completed: x});
    },
    render: function () {
        var cls = '';
        if (this.state.query == '') {
            cls += 'empty';
        }
        return (
            <div className={cls}>
                <SearchBox onSearch={this.doSearch} placeholder="探したいこと・調べたいこと" completed={this.state.completed}/>
                <SearchResult systemid={this.props.systemid} query={this.state.query} onClose={this.doClose}
                              setCompleted={this.setCompleted}/>
            </div>
        );
    }
});

var SearchBox = React.createClass({
    onClose: function () {
        this.refs.query.value = '';
        var check = document.querySelectorAll(".ios");
        if (check.length == 0) {
            var q = this.refs.query;
            setTimeout(function () {
                q.focus();
            }, 100);
        }
    },
    onFocus: function (e) {
        var check = document.querySelectorAll(".empty");
        if (check.length != 0) {
            this.refs.query.select();
        }
        e.preventDefault();
    },
    onInput: function () {
        if (this.refs.query.value == '') {
            this.props.onSearch('');
        }
    },
    doSubmit: function (e) {
        e.preventDefault();
        this.props.onSearch(this.refs.query.value);
        this.refs.query.blur(); //フォーカスを外す
    },
    render: function () {
        var cls = "clear fa fa-times";
        if (this.props.completed == false) {
            cls += " loading"
        }
        return (
            <form className="box" action="#" onSubmit={this.doSubmit}>
                <input type="search" ref="query" placeholder={this.props.placeholder} onInput={this.onInput}
                       onFocus={this.onFocus}/>
                <button type="submit" className="search fa fa-search" title="検索する"/>
                <button className={cls} title="検索結果を閉じる" onClick={this.onClose}/>
            </form>
        );
    }
});

var SearchResult = React.createClass({
    api: null,
    query: '',
    getInitialState: function () {
        return {
            books: [],
            message: '',
            hint: ''
        };
    },
    doUpdate: function (data) {
        this.setState(data);
        this.props.setCompleted(data.completed);
    },
    componentDidMount: function () {
        if (this.props.query != this.query && this.props.query != '') {
            if (this.api) {
                this.api.kill();
            }
            this.query = this.props.query;
            this.api = new api(this.props.systemid, this.props.query, this.doUpdate);
        }
    },
    componentDidUpdate: function () {
        this.componentDidMount();
    },
    componentWillUnmount: function () {
        if (this.api) {
            this.api.kill();
        }
    },
    render: function () {
        var books = this.state.books.map(function (book) {
            return (
                <Book key={book.id} book={book}/>
            );
        });
        return (
            <div className="results">
                <p className="message">{this.state.message}</p>
                <div className="books">
                    {books}
                </div>
                <p>{this.state.hint}</p>
            </div>
        );
    }
});

var Book = React.createClass({
    render: function () {
        return (
            <div className="book">
                <img id={'image' + this.props.book.id} className="thumbnail"
                     src="https://calil.jp/public/img/no-image/medium-noborder.gif"/>
                <a href={this.props.book.url} target="_blank">{this.props.book.title}</a>
                <div className="stock" id={'stock' + this.props.book.id}></div>
            </div>
        );
    }
});

var searchbox = ReactDOM.render(
    <Search systemid="Fukui_Sabae"/>,
    document.getElementById('searchBox')
);