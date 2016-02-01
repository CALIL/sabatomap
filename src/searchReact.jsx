var Main = React.createClass({
    getInitialState: function () {
        return {query: '', completed: true, offline: false};
    },
    setFacility: function (facility) {
        this.refs.detail.setState({query: ''});
        this.setProps({floors: []}); // CSSアニメーション対策のためクリアする
        this.setProps({systemid: facility.systemid, floors: facility.floors});
    },
    setFloorId: function (id) {
        this.refs.floors.setState({'id': id});
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
    notify: function (message) {
        this.refs.locator.notify(message);
    },
    setMode: function (mode) {
        this.refs.locator.setState({'mode': mode});
    },
    render: function () {
        var cls = '';
        if (this.state.query == '') {
            cls += 'empty';
        }
        var offline = '';
        if (this.state.offline) {
            offline = (
                <div id="offline">ネットワークに接続できません</div>
            )
        }
        return (
            <div className={cls}>
                <SearchBox onSearch={this.doSearch} placeholder="探したいこと・調べたいこと" completed={this.state.completed}/>
                <SearchResult systemid={this.props.systemid} query={this.state.query} onClose={this.doClose}
                              setCompleted={this.setCompleted}/>
                <Floors floors={this.props.floors} ref="floors"/>
                <Locator ref="locator" onClick={locatorClicked}/>
                <Detail ref="detail"/>
                {offline}
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
    systemid: null,
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
        if (this.props.query != '') {
            if (this.props.query != this.query || this.props.systemid != this.systemid) {
                if (this.api) {
                    this.api.kill();
                }
                this.query = this.props.query;
                this.systemid = this.props.systemid;
                this.api = new api(this.props.systemid, this.props.query, this.doUpdate);
            }
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
                <Book {...book} key={book.id}/>
            );
        });
        return (
            <div className="results">
                <p className="message">{this.state.message}</p>
                <div className="books">
                    {books}
                </div>
                <p className="hint">{this.state.hint}</p>
            </div>
        );
    }
});

var Book = React.createClass({
    open: function () {
        if (this.props.result.stocks.length > 0 || this.props.result.message != '') {
            UI.refs.detail.setState({query: UI.state.query, book: this.props});
            if (this.props.result.stocks.length > 0) {
                this.navigateShelf(this.props.result.stocks[0]);
            } else {
                navigateShelf(null, []);
                UI.doClose();
            }
        }
    },
    navigateShelf: function (stock) {
        var floorid = String(stock.floorId); // fixme 整数型で来てしまっているのでとりあえずキャスト
        navigateShelf(floorid, stock.shelves);
        UI.doClose();
    },
    render: function () {
        var stocks;
        if (this.props.result.message != '') {
            stocks = (
                <div className="stockB">{this.props.result.message}</div>
            );
        } else {
            stocks = this.props.result.stocks.map(function (stock, i) {
                return (
                    <div className="stockA" onClick={this.navigateShelf.bind(this, stock)}>{stock.place}</div>
                );
            }, this);
        }
        return (
            <div onClick={this.open}>
                <img src={this.props.result.thumbnail}/>
                <div className="title">{this.props.title}
                    <div className="author">{this.props.author}</div>
                </div>
                <div className="stocks">
                    {stocks}
                </div>
                <div className="next"><i className="fa fa-play"/></div>
            </div>/**/
        );
    }
});

var Floors = React.createClass({
    getInitialState: function () {
        return {
            id: null
        };
    },
    select: function (id) {
        this.setState({id: id});
        setTimeout(function () {
            loadFloor(id);
        }, 10);
    },
    render: function () {
        var floors;
        if (this.props.floors) {
            floors = this.props.floors.map(function (floor) {
                return (
                    <div className="floor">
                        <input name="view" type="radio" id={'F'+floor.id} checked={this.state.id === floor.id}
                               value={floor.id} onChange={this.select.bind(this,floor.id)}/>
                        <label htmlFor={'F'+floor.id}>{floor.label}</label>
                    </div>
                );
            }, this);
            floors.reverse();
        }
        return (
            <div id="floors">
                {floors}
            </div>
        );
    }
});


var Locator = React.createClass({
    lastAppear: null,
    getInitialState: function () {
        return {
            mode: 'disabled',
            message: ''
        };
    },
    checkMessage: function () {
        this.setState({});
    },
    notify: function (message) {
        this.lastAppear = new Date();
        this.setState({message: message});
        setTimeout(this.checkMessage, 4000);
    },
    render: function () {
        var fade = '';
        if (this.state.message != '' && new Date() - this.lastAppear < 3500) {
            fade = 'visible'
        }
        return (
            <div id="locator">
                <button className={this.state.mode} onClick={this.props.onClick}/>
                <div className={fade}>{this.state.message}</div>
            </div>
        );
    }
});

var Detail = React.createClass({
    getInitialState: function () {
        return {
            query: '',
            book: {
                title: '',
                author: '',
                result: {
                    stocks: [],
                    message: ''
                }
            }
        };
    },
    back: function () {
        this.setState({query: ''});
        UI.doSearch(this.state.query);
        navigateShelf(null, []);
    },
    close: function () {
        this.setState({query: ''});
        navigateShelf(null, []);
    },
    navigateShelf: function (stock) {
        navigateShelf(stock.floorId, stock.shelves);
        UI.doClose();
    },
    render: function () {
        var cls = "";
        if (this.state.query != '') {
            cls = 'show';
        }
        var stocks;
        if (this.state.book.result.message != '') {
            stocks = (
                <div className="stockB">{this.state.book.result.message}</div>
            );
        } else {
            stocks = this.state.book.result.stocks.map(function (stock) {
                var add = "";
                if (stock.no != '') {
                    add = ' [' + stock.no + ']';
                }
                return (
                    <div className="stockA" onClick={this.navigateShelf.bind(this, stock)}>{stock.place}{add}</div>
                );
            }, this);
        }
        return (
            <div id="detail" className={cls}>
                <div className="back" onClick={this.back}>
                    <i className="fa fa-arrow-left"/>
                </div>
                <button className="fa fa-times close" title="結果を閉じる" onClick={this.close}/>
                <div className="block">
                    <div className="title">{this.state.book.title}
                        <div className="author">{this.state.book.author}</div>
                    </div>
                    <div className="stocks">
                        {stocks}
                    </div>
                    <a href={this.state.book.url} target="_blank"><i className="fa fa-chevron-right"/> 予約・詳細を見る</a>
                </div>
            </div>
        );
    }
});

var InitUI = function (props, element) {
    return ReactDOM.render(
        React.createElement(Main, props),
        element
    )
};