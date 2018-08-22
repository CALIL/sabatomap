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
            loading: false, // Unitrad APIのポーリング中
            uuid: null, // Unitrad APIのUUID
            currentBook: null, // 現在選択されている本
            books: [],
            visible: false, // 検索結果の表示・非表示
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
                loading: true,
            });
            this.api = new api({ free: this.state.query, region: this.props.region }, (data) => {
                this.setState({
                    uuid: data.uuid,
                    books: data.books,
                    loading: data.running,
                    visible: true,
                });
                data.books.forEach((book) => {
                    if (this.cacheDetail[book.id]) {
                        book.detail = this.cacheDetail[book.id];
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
                    this.cacheDetail[data.book.id] = r.data;
                });
            }
            this.queueDetail.shift();
        }
    }
    componentDidUpdate() {
        this.componentDidMount();
    }
    componentWillUnmount() {
        if (this.api) this.api.kill();
    }
    onSubmit(e) {
        e.preventDefault();
        this.setState({ query: this.refs.query.value });
        this.refs.query.blur();
    }
    hideList() {
        this.setState({visible: false});
    }
    backToList() {
        this.setState({ currentBook: null });
        app.navigateShelf(null, []);
    }
    showDetail(book) {
        this.setState({ currentBook: book });
        if (book.detail && book.detail.stocks.length > 0) {
            // fixme 整数型で来てしまっているのでとりあえずキャスト
            app.navigateShelf(String(book.detail.stocks[0].floorId), book.detail.stocks[0].shelves);
        } else {
            app.navigateShelf(null, []);
        }
    }

    render() {
        return (
            <div className={!this.state.visible || this.state.currentBook ? 'empty' : null}>
                <form className="box" action="#" onSubmit={this.onSubmit.bind(this)}>
                    <input type="search" ref="query" placeholder={this.props.placeholder} />
                    <button type="submit" className="search fa fa-search" title="検索する" />
                    <button className={"clear fa fa-times" + (this.state.loading ? " loading" : "")}
                        title="検索結果を閉じる" onClick={this.hideList.bind(this)} />
                </form>
                <div className="results">
                    <div className="books">
                        {this.state.books.map((book) => {
                            return (
                                <Book book={book} key={book.id}
                                    onClick={this.showDetail.bind(this, book)}
                                />
                            );
                        })}
                    </div>
                    {this.state.query !== '' && this.state.loading === false ? (
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
                            <Stocks detail={this.state.currentBook.detail} />
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

