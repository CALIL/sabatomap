// React.js 使い方・ハマりどころのメモ
// https://www.evernote.com/l/AAGt9tKUiupOHqRT82I4O3XGVbu6eB68nHE

var log = function (obj) {
    try {
        console.log(obj)
    } catch (e) {
    }
};
var Search = React.createClass({
    getInitialState: function () {
        log('getInitialState');
        return {
            animation: true,
            queryText: ''
        };
    },
    getDefaultProps: function () {
        return {
            queryText: '',
            target: [],
            clickHandler: function () {
            }
        };
    },
    componentDidMount: function () {
        log('componentDidMount');
        log(this.props);
        this.setProps({
            target: this.props.searchSetting.targets[0],
            clickHandler: this.props.searchSetting.clickHandler
        });
        if (this.props.searchSetting.queryText != '') {
            this.setState({
                queryText: this.props.searchSetting.queryText
            })
            $('#queryTextInput').val(this.props.searchSetting.queryText);
        }
    },
    // 検索クエリーをstateに反映
    handleUserInput: function (submit, queryText) {
        this.setState({
            submit: submit,
            queryText: queryText
        });
    },
    // 再レンダリング
    rerender: function () {
        this.setState({
            submit: false,
            animation: false
        });
    },
    render: function () {
        log('SearchBox render');
        if (this.state.queryText != '') {
            var resultNode = <SearchResult queryText={this.state.queryText} target={this.props.target}
                                           rerender={this.rerender}
                                           clickHandler={this.props.clickHandler}/>;
        }
        return (
            <div className="search">
                <SearchBox handleUserInput={this.handleUserInput} submit={this.state.submit}
                           queryText={this.props.queryText}/>
                {resultNode}
            </div>
        );
    }
});


var SearchBox = React.createClass({
    handleSubmit: function (e) {
        e.preventDefault();
        this.props.handleUserInput(
            true,
            this.refs.queryTextInput.getDOMNode().value
        );
        this.refs.queryTextInput.getDOMNode().blur()
    },
    componentDidMount: function () {
        var textInputNode = this.refs.queryTextInput.getDOMNode();
        if (this.props.queryText != '') {
            textInputNode.value = this.props.queryText;
        }
    },
    render: function () {
        return (
            <div className="searchBox">
                <form id="searchForm" onSubmit={this.handleSubmit}>
                    <input type="search" id="queryTextInput" ref="queryTextInput" placeholder="探したいこと・調べたいこと"/>
                    <i className="fa fa-search searchBtn" onClick={this.handleSubmit}/>
                </form>
            </div>
        );
    }
});


var SearchResult = React.createClass({
    searchInstances: {},
    queryText: '',
    format: function () {
        // データを初期化する renderが走るのでsetPropsは使わない
        this.props.target.message = null;
        this.props.target.count = 0;
        this.props.target.books = [];
        this.props.target.bookimages = [];
        this.props.target.opacurl = null;
        this.props.target.complete = false;
        this.props.target.error = false;
    },
    start: function () {
        this.queryText = this.props.queryText;
        this.stop();
        this.format();
        this.searchInstances['local'] = new api();
        this.searchInstances['local'].search(this.props.target, this.props.queryText, this.props.rerender);
    },
    stop: function () {
        // レンダリングをしないようにする
        if (typeof this.searchInstances['local'] != 'undefined') {
            this.searchInstances['local'].stop();
        }
    },
    componentWillMount: function () {
        log('SearchList componentWillMount')
        // 初回のrenderのためにデータの初期化が必要
        this.format()
    },
    componentDidMount: function () {
        log('SearchList componentDidMount')
        this.start();
    },
    componentDidUpdate: function () {
        log('SearchList componentDidUpdate')
        var $searchResult = $(this.refs.searchResult.getDOMNode());
        log(this.props.target)
        if (this.props.target.message) {
            $searchResult.fadeIn(500);
        } else if (this.props.target.complete) {
            $searchResult.fadeIn(800);
        }
        if ((this.queryText != this.props.queryText) || (this.props.submit && this.props.target.error === true)) {
            this.start();
        }
    },
    componentWillUnmount: function () {
        // レンダリングをしないようにする
        this.stop();
    },
    clickHandler: function (e) {
        if (this.props.clickHandler) {
            e.preventDefault();
            var data = $(e.target).closest('.book').attr('data');
            if (data) {
                data = JSON.parse(data);
                $(this.refs.searchResult.getDOMNode()).fadeOut();
                this.stop();
                this.props.clickHandler(data);
            }
        }
    },
    closeHandler: function () {
        $(this.refs.searchResult.getDOMNode()).fadeOut(300, function () {
            $(this).hide();
        });
        this.stop();
    },
    render: function () {
        return (
            <div className="searchResult" ref="searchResult">
                <div className="booklistClose fa fa-times" onClick={this.closeHandler}></div>
                <p className="searchMessage">{this.props.target.message}</p>
                <BookList books={this.props.target.books}/>
                <p>{this.props.target.hint}</p>
            </div>
        );
    }
});

var BookList = React.createClass({
    render: function () {

        var bookNodes = this.props.books.map(function (book, i) {
            return (
                <Book key={book.id} book={book}/>
            );
        }.bind(this));
        return (
            <div className="booklist">
                {bookNodes}
            </div>
        );
    }
});

var Book = React.createClass({
    render: function () {
        return (
            <div className="book">
                <div className="leftblock">
                    <div>
                        <img id={'image' + this.props.book.id} className="thumbnail"
                             src="https://calil.jp/public/img/no-image/medium-noborder.gif" alt=""/>
                    </div>
                    <a href={this.props.book.url} target="_blank" id={this.props.book.id}>{this.props.book.title}</a>
                </div>
                <div className="stock" id={'stock' + this.props.book.id}></div>
            </div>
        );
    }
});

if (typeof searchSetting != 'undefined') {
    React.render(
        <Search searchSetting={searchSetting}/>,
        document.getElementById('searchBox')
    );
}