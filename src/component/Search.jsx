import React, { Component } from 'react';

import Book from './Book.jsx';

import {api} from '../api.js';

export default class Search extends Component {
    constructor() {
        super();
        this.api = null;
        this.prevQuery = '';
        this.state = {
            query: '',
            completed: true,
            uuid: null,
            currentBook: null,
            books: [],
            message: '',
            hint: '',
            hideResult: false,
        };
        this.cacheDetail = {};
        this.queueDetail = [];
        setInterval(this.fetchDetail.bind(this), 1000);
    }

    componentDidMount() {
        if (this.state.query==='') {
            this.queueDetail = [];
        }
        if (this.state.query != '' && this.state.query != this.prevQuery) {
            if (this.api) {
                this.api.kill();
            }
            this.queueDetail = [];
            this.prevQuery = this.state.query;
            this.setState({
                completed: false,
            });
            this.api = new api({free: this.state.query, region: this.props.region}, (data) => {
                this.setState({
                    uuid: data.uuid,
                    books: data.books,
                    completed: !data.running,
                });
                data.books.forEach((book) => {
                    if (this.cacheDetail[data.uuid+book.id]) {
                        book.detail = this.cacheDetail[data.uuid+book.id];
                    }
                    if (book.detail || !book.holdings.includes(100622)) return;
                    this.queueDetail.push({
                        uuid: data.uuid,
                        book: book,
                    });
                });
            });
        }
    }
    fetchDetail() {
        if (this.queueDetail.length>0) {
            const data = this.queueDetail[0];
            if (this.state.uuid===data.uuid) {
                const url = `https://sabatomap-mapper.calil.jp/get?uuid=${data.uuid}&id=${data.book.id}`
                fetch(url).then((r) => r.json()).then((r) => {
                    this.state.books.map((book) => {
                        if (book.id===data.book.id) {
                            book.detail = r.data;
                        }
                    });
                    this.setState({});
                    this.cacheDetail[data.uuid+data.book.id] = r.data;
                });
            }
            this.queueDetail.shift();
        }
    }
    componentDidUpdate() {
        this.componentDidMount();
    }
    componentWillUnmount() {
        if (this.api) {
            this.api.kill();
        }
    }

    onSubmit(e) {
        e.preventDefault();
        this.onSearch(this.refs.query.value);
        this.refs.query.blur();
    }
    onFocus(e) {
        e.preventDefault();
        if (this.refs.query.value != '') {
            this.refs.query.select();
        }
    }
    onClose() {
        setTimeout(() => {
            this.refs.query.focus();
        }, 100);
    }
    onSearch(query) {
        this.setState({ query: query });
    }

    setCurrentBook(book) {
        this.setState({ currentBook: book });
        if (book) this.hideResult(true);
    }
    hideResult(hideResult) {
        this.setState({ hideResult: hideResult });
    }

    render() {
        return (
            <div className={this.state.hideResult ? 'empty' : null}>
                <form className="box" action="#" onSubmit={this.onSubmit.bind(this)}>
                    <input type="search" ref="query" placeholder={this.props.placeholder} onFocus={this.onFocus.bind(this)} />
                    <button type="submit" className="search fa fa-search" title="検索する" />
                    <button className={"clear fa fa-times" + (this.state.completed == false ? " loading" : "")}
                     title="検索結果を閉じる" onClick={this.onClose.bind(this)} />
                </form>
                <div className="results">
                    <p className="message">{this.state.message}</p>
                    <div className="books">
                        {this.state.books.map((book) => {
                            return (
                                <Book book={book} key={book.id} setCurrentBook={this.setCurrentBook.bind(this)} onClose={this.onClose.bind(this)} />
                            );
                        })}
                    </div>
                    <p className="hint">{this.state.hint}</p>
                    {this.state.query!=='' && this.state.completed  ? (
                        <p className="sabato">
                            <a href={'https://sabae.calil.jp/?q=' + encodeURIComponent(this.state.query)} target="_blank">
                                さばサーチで近隣の図書館を検索
                            </a>
                        </p>
                    ) : null}
                </div>
                {this.state.currentBook ? (
                    <Detail ref="detail"
                        book={this.state.currentBook}
                        setCurrentBook={this.setCurrentBook.bind(this)} hideResult={this.hideResult.bind(this)}
                        onClose={this.onClose.bind(this)} />
                ) : null}
            </div>
        );
    }
}

class Detail extends Component {
    constructor() {
        super();
        this.state = {
        };
    }
    close() {
        this.props.setCurrentBook(null);
        this.props.hideResult(false);
        app.navigateShelf(null, []);
    }
    navigateShelf(stock) {
        app.navigateShelf(stock.floorId, stock.shelves);
        this.props.onClose();
    }
    render() {
        return (
            <div id="detail" className="show">
                <div className="back" onClick={this.close.bind(this)}>
                    <i className="fa fa-arrow-left" />
                </div>
                <button className="fa fa-times close" title="結果を閉じる" onClick={this.close.bind(this)} />
                <div className="block">
                    <div className="title">{this.props.book.title}
                        <div className="author">{this.props.book.author}</div>
                    </div>
                    <div className="stocks">
                        {(() => {
                            if (this.props.book.detail.message != '') {
                                return <div className="stockB">{this.props.book.detail.message}</div>;
                            } else {
                                return this.props.book.detail.stocks.map((stock, i) => {
                                    return (
                                        <div className="stockA" onClick={this.navigateShelf.bind(this, stock)} key={i}>
                                            {stock.place}{stock.no != '' ? ' [' + stock.no + ']' : ''}
                                        </div>
                                    );
                                });
                            }
                        })()}
                    </div>
                    {(() => {
                        for(let url of Object.values(this.props.book.url)) {
                            return <a href={url} target="_blank"><i className="fa fa-chevron-right" /> 予約・詳細を見る</a>
                        }
                    })()}
                </div>
            </div>
        );
    }
}
