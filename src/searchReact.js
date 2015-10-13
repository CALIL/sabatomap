// React.js 使い方・ハマりどころのメモ
// https://www.evernote.com/l/AAGt9tKUiupOHqRT82I4O3XGVbu6eB68nHE

function log(obj) {
    console.log(obj);
}

var Search = React.createClass({
    displayName: "Search",
    getInitialState: function () {
        log('getInitialState');
        return {
            animation: true,
//      submit    : false,
            queryText: '',
        };
    },
    getDefaultProps: function () {
//    log('getDefaultProps');
        return {
            queryText: '',
            target: [],
            clickHandler: function () {
            }
        };
    },
    getTarget: function (targets, targetId) {
        for (i in targets) {
            if (targets[i].id == targetId) {
                return targets[i];
            }
        }
        return alert('図書館設定が見つかりませんでした。');
    },
    componentDidMount: function () {
        log('componentDidMount');
        log(this.props)

        this.setProps({
            targets: this.props.searchSetting.targets,
//      target : this.getTarget(this.props.searchSetting.targets, kanikama.facility.systemid),
            clickHandler: this.props.searchSetting.clickHandler
        });
        if (this.props.searchSetting.queryText != '') {
            this.setState({
                queryText: this.props.searchSetting.queryText,
            })
            $('#queryTextInput').val(this.props.searchSetting.queryText);
        }
    },
    // 検索クエリーをstateに反映
    handleUserInput: function (submit, queryText) {
        log(this.props.targets)
        var target = this.getTarget(this.props.targets, "Fukui_Sabae")
        this.setProps({
            target: target,
            clickHandler: target.clickHandler
        });
        this.setState({
            submit: submit,
            queryText: queryText,
        });
    },
    // 再レンダリング
    rerender: function () {
        this.setState({
            submit   : false,
            animation: false,
        });
    },
    render: function () {
        log('SearchBox render');
//    if(this.state.submit && this.state.queryText!=''){
        if (this.state.queryText != '') {
            var resultNode = React.createElement(SearchResult, {
                queryText: this.state.queryText,
                target: this.props.target,
                submit: this.state.submit,
                rerender: this.rerender,
                clickHandler: this.props.clickHandler
            });
        } else {
            var resultNode = null;
        }
        return (
            React.createElement("div", {className: "searchbox"},
                React.createElement(SearchBox, {
                    handleUserInput: this.handleUserInput,
                    submit: this.state.submit,
                    queryText: this.state.queryText
                }),
                resultNode
            )
        );
    }
});


// 検索ボックス
var SearchBox = React.createClass({
    displayName: "SearchBox",
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
            React.createElement("div", {className: "searchBox"},
                React.createElement("form", {
                        action: "get",
                        id: "searchForm",
                        className: "form-inline",
                        onSubmit: this.handleSubmit
                    },
                    React.createElement("input", {
                        type: "search",
                        className: "",
                        id: "queryTextInput",
                        ref: "queryTextInput",
                        placeholder: "探したいこと・調べたいこと",
                        onChange: this.handleChange
                    }),
                    React.createElement("i", {className: "fa fa-search searchBtn", onClick: this.handleSubmit})
                )
            )

        );
    }
});

var SearchResult = React.createClass({
    displayName: "SearchResult",
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
        this.props.target.error    = false;
    },
    start: function () {
        this.queryText = this.props.queryText;
        this.stop();
        this.format();
        this.searchInstances['local'] = new api();
        log(this.props.target)
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
            $searchResult.show().css('top', 0);
            $searchResult.css('opacity', 1);
        } else if (this.props.target.complete) {
            $searchResult.hide().css('top', $(window).height());
            $searchResult.css('opacity', 0);
            $searchResult.show().animate({'top': 0, 'opacity': 1}, 1000)
        }
//    log(this.refs.searchResult.getDOMNode())
//    $(this.refs.searchResult.getDOMNode()).css('height',0).css('height', $(window).height());
//    if(this.props.animation){
        // アニメーション用に透明度を初期化
//      $('.crosssearch').css({opacity: 0});
//    }
        // キーワードが変わっていたら再検索
        // もしくは検索エラーの場合
        if ((this.queryText != this.props.queryText) || (this.props.submit && this.props.target.error===true)) {
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
        $(this.refs.searchResult.getDOMNode()).fadeOut(function(){
            $(this).hide();
        });
        this.stop();
    },
    render: function () {
        var messageNode = null;
        if (this.props.target.message) {
            messageNode = React.createElement("p", {className: "searchMessage"}, this.props.target.message)
        }
        return (
            React.createElement("div", {className: "searchResult", ref: "searchResult"},
                React.createElement("div", {className: "searchDiv", ref: "searchDiv"},
                    React.createElement(BookList, {
                        books: this.props.target.books,
                        queryText: this.props.queryText,
                        clickHandler: this.clickHandler,
                        closeHandler: this.closeHandler
                    }),
                    messageNode
                )
            )
        );
    }
});

var BookList = React.createClass({
    displayName: "BookList",
    render: function () {
        var bookNodes = this.props.books.map(function (book, i) {
            return (
                React.createElement(Book, {key: book.id, book: book, clickHandler: this.props.clickHandler})
            );
        }.bind(this));
        return (
            React.createElement("div", {className: "booklist"},
                React.createElement("div", {className: "booklistTitle"}, this.props.queryText, "の検索結果"),
                React.createElement("div", {className: "booklistClose", onClick: this.props.closeHandler}, "×"),
                bookNodes
            )
        );
    }
});
var Book = React.createClass({
    displayName: "Book",
    render: function () {
        return (
            React.createElement("div", {className: "book"},
                React.createElement("div", {className: "leftblock"},

                    React.createElement("div", {
                            href: "#", //this.props.book.url
                            target: "_blank",
                           //  onClick: this.props.clickHandler
                        },
                        React.createElement("img", {
                            id: 'image' + this.props.book.id,
                            className: "thumbnail",
                            src: "https://calil.jp/public/img/no-image/medium-noborder.gif"
                        })
                    ),
                    React.createElement("div", {
                        href: "#", //this.props.book.url
                        target: "_blank",
                        id: this.props.book.id,
                        dangerouslySetInnerHTML: {__html: this.props.book.title},
                        //onClick: this.props.clickHandler
                    })
                ),
                React.createElement("div", {
                    className: "stock",
                    id: 'stock' + this.props.book.id
                })
            )
        );
    }
});


if (typeof searchSetting != 'undefined') {
    React.render(
        React.createElement(Search, {searchSetting: searchSetting}),
        document.getElementById('searchBox')
    );
}
