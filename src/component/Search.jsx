import React, { Component } from 'react';

import Book from './Book.jsx';
import Stocks from './Stocks.jsx';

import { api } from '../api.js';

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
        if (this.state.query === '') {
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
            this.api = new api({ free: this.state.query, region: this.props.region }, (data) => {
                this.setState({
                    uuid: data.uuid,
                    books: data.books,
                    completed: !data.running,
                });
                data.books.forEach((book) => {
                    if (this.cacheDetail[data.uuid + book.id]) {
                        book.detail = this.cacheDetail[data.uuid + book.id];
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
        if (this.queueDetail.length > 0) {
            const data = this.queueDetail[0];
            if (this.state.uuid === data.uuid) {
                const url = `https://sabatomap-mapper.calil.jp/get?uuid=${data.uuid}&id=${data.book.id}`
                fetch(url).then((r) => r.json()).then((r) => {
                    this.state.books.map((book) => {
                        if (book.id === data.book.id) {
                            book.detail = r.data;
                        }
                    });
                    this.setState({});
                    this.cacheDetail[data.uuid + data.book.id] = r.data;
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
        this.setState({hideResult: true});
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
    backToList() {
        this.setCurrentBook(null);
        this.hideResult(false);
        app.navigateShelf(null, []);
    }
    open(book) {
        if (book.detail && (book.detail.stocks.length > 0 || book.detail.message != '')) {
            this.setCurrentBook(book);
            if (book.detail.stocks.length > 0) {
                this.navigateShelf(book.detail.stocks[0]);
            } else {
                app.navigateShelf(null, []);
                this.onClose();
            }
        }
    }
    navigateShelf(stock) {
        // fixme 整数型で来てしまっているのでとりあえずキャスト
        app.navigateShelf(String(stock.floorId), stock.shelves);
        this.onClose();
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
                                <Book book={book} key={book.id}
                                    setCurrentBook={this.setCurrentBook.bind(this)}
                                    navigateShelf={this.navigateShelf.bind(this)}
                                    onClick={this.open.bind(this, book)}
                                />
                            );
                        })}
                    </div>
                    <p className="hint">{this.state.hint}</p>
                    {this.state.query !== '' && this.state.completed ? (
                        <p className="sabato">
                            <a href={'https://sabae.calil.jp/?q=' + encodeURIComponent(this.state.query)} target="_blank">
                                さばサーチで近隣の図書館を検索
                            </a>
                        </p>
                    ) : null}
                </div>
                {this.state.currentBook ? (
                    <div id="detail" className="show">
                        <div className="back" onClick={this.backToList.bind(this)}>
                            <i className="fa fa-arrow-left" />
                        </div>
                        <button className="fa fa-times close" title="結果を閉じる" onClick={this.backToList.bind(this)} />
                        <div className="block">
                            <div className="title">{this.state.currentBook.title}
                                <div className="author">{this.state.currentBook.author}</div>
                            </div>
                            <Stocks detail={this.state.currentBook.detail} navigateShelf={this.navigateShelf.bind(this)} />
                            {(() => {
                                for (let url of Object.values(this.state.currentBook.url)) {
                                    return <a href={url} target="_blank"><i className="fa fa-chevron-right" /> 予約・詳細を見る</a>
                                }
                            })()}
                        </div>
                    </div>
                ) : null}
            </div>
        );
    }
}

