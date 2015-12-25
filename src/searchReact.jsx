var Search = React.createClass({
    getInitialState: function () {
        return {query: ''};
    },
    doSearch: function (query) {
        this.setState({query: query});
    },
    doClose: function () {
        this.doSearch('');
    },
    render: function () {
        return (
            <div className="reactSearch">
                <SearchBox onSearch={this.doSearch} placeholder="探したいこと・調べたいこと"/>
                <SearchResult systemid='Fukui_Sabae' query={this.state.query} onClose={this.doClose}/>
            </div>
        );
    }
});

var SearchBox = React.createClass({
    onInput: function () {
        if(this.refs.query.getDOMNode().value==''){
            this.props.onSearch('');
        }
    },
    doSubmit: function () {
        this.props.onSearch(this.refs.query.getDOMNode().value);
        this.refs.query.getDOMNode().blur(); //フォーカスを外す
    },
    render: function () {
        return (
            <form className="box" action="#" onSubmit={this.doSubmit}>
                <input type="search" ref="query" placeholder={this.props.placeholder} onInput={this.onInput} />
                <button type="submit" className="fa fa-search"/>
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
    },
    componentDidMount: function () {
        if (this.props.query != this.query && this.props.query!='') {
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
        var cls = 'results';
        if (this.props.query == '') {
            cls += ' empty';
        }
        return (
            <div className={cls}>
                <div className="close fa fa-times" onClick={this.props.onClose}></div>
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

var searchbox = React.render(
    <Search />,
    document.getElementById('searchBox')
);
