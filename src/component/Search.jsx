import React, { Component } from 'react';

import Book from './Book.jsx';
import Stocks from './Stocks.jsx';

import { api } from '../api.js';

export default class Search extends Component {
    constructor() {
        super();
        this.api = null;
        this.queryRef = React.createRef();
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
        this.startTime = null;
        this.intervalCount = 0;
    }

    componentDidMount() {
        document.addEventListener('backbutton', this.hideList.bind(this), false);
        this.intervalId = setInterval(() => {
            this.fetchDetail();
            // 最初の5個以降
            if (this.intervalCount>6) {
                clearInterval(this.intervalId);
                this.intervalId = setInterval(() => {
                    this.fetchDetail();
                }, 1000);
            }
        }, 100);
    }
    fetchDetail() {
        this.intervalCount += 1;
        if (this.state.query === '') {
            this.queueDetail = [];
        }
        if (this.queueDetail.length > 0) {
            const data = this.queueDetail[0];
            if (this.cacheDetail[data.book.id]) return;
            if (this.state.uuid === data.uuid) {
                const url = `https://sabatomap-mapper.calil.jp/get?uuid=${data.uuid}&id=${data.book.id}`
                fetch(url).then((r) => r.json()).then((r) => {
                    this.state.books.map((book) => {
                        if (book.id === data.book.id) {
                            book.detail = r.data;
                        }
                    });
                    if (this.state.currentBook && this.state.currentBook.id === data.book.id) {
                        this.selectBook(this.state.currentBook);
                    }
                    if(this.api) this.setState({});
                    this.cacheDetail[data.book.id] = r.data;
                });
            }
            this.queueDetail.shift();
        }
    }
    componentDidUpdate() {
    }
    componentWillUnmount() {
        if (this.api) this.api.kill();
        clearInterval(this.intervalId);
    }
    onSubmit(e) {
        e.preventDefault();
        if (this.queryRef.current) {
            this.queryRef.current.blur();
            this.setState({ query: this.queryRef.current.value }, () => {
                console.log('callback')
                if (this.state.query != '') {
                this.startTime = new Date().getTime();
                if (this.api) this.api.kill();
                this.queueDetail = [];
                this.setState({
                    loading: true,
                    visible: true,
                    uuid: null,
                    currentBook: null,
                    books: [],
                });
                this.api = new api({ free: this.state.query, region: this.props.region }, (data) => {
                    this.setState({
                        uuid: data.uuid,
                        books: data.books,
                        loading: data.running,
                    });
                    // console.log(data.books)
                    data.books.forEach((book) => {
                        if (this.cacheDetail[book.id]) {
                            book.detail = this.cacheDetail[book.id];
                        }
                        // if (book.detail || !book.holdings.includes(100622)) return;
                        if (book.detail) return;
                        this.queueDetail.push({
                            uuid: data.uuid,
                            book: book,
                        });
                    });
                    // console.log('this.queueDetail');
                    // console.log(this.queueDetail);
                });
                }
            });
        }
    }
    hideList() {
        this.api.kill();
        this.api = null;
        this.queueDetail = [];
        if (this.queryRef.current) {
            this.queryRef.current.value = '';
        }
        this.setState({
            query: '',
            loading: false, // Unitrad APIのポーリング中
            uuid: null, // Unitrad APIのUUID
            currentBook: null, // 現在選択されている本
            books: [],
            visible: false, // 検索結果の表示・非表示
        });
    }
    backToList() {
        this.setState({ currentBook: null });
        app.navigateShelf(null, []);
    }
    selectBook(book, stockIndex = 0) {
        this.setState({ currentBook: book });
        if (book.detail && book.detail.stocks.length > 0) {
            // fixme 整数型で来てしまっているのでとりあえずキャスト
            app.navigateShelf(String(book.detail.stocks[stockIndex].floorId), book.detail.stocks[stockIndex].shelves);
        } else {
            app.navigateShelf(null, []);
        }
    }

    render() {
        return (
            <div className={!this.state.visible || this.state.currentBook ? 'empty' : null}>
                <form className="box" action="#" onSubmit={this.onSubmit.bind(this)}>
                    <input type="search" ref={this.queryRef} placeholder={this.props.placeholder} />
                    <button type="submit" className="search fa fa-search" title="検索する" />
                    <button className={"clear fa fa-times" + (this.state.loading ? " loading" : "")}
                        title="検索結果を閉じる" onClick={this.hideList.bind(this)} />
                </form>
                <div className="results">
                    <div className="books">
                        {this.state.books.map((book, i) => {
                            return (
                                <Book book={book} key={book.id}
                                    selectBook={this.selectBook.bind(this)}
                                    showCover={(i < Math.floor((new Date().getTime() - this.startTime) / 1000))}
                                />
                            );
                        })}
                    </div>
                    {this.state.query !== '' && this.state.loading === false ? (
                        <a href={'https://sabae.calil.jp/?q=' + encodeURIComponent(this.state.query)} target="_blank">
                            <p className="sabato">
                                さばサーチで近隣の図書館を検索
                            </p>
                        </a>
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
                            <Stocks detail={this.state.currentBook.detail}
                                selectStock={(stockIndex) => this.selectBook(this.state.currentBook, stockIndex)}
                            />
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

