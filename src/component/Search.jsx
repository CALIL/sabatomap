import React, { Component } from 'react';

import Book from './Book';
import Detail from './Detail';

import {api} from '../api';

export default class Search extends Component {
    constructor() {
        super();
        this.api = null;
        this.prevQuery = '';
        this.state = {
            query: '',
            completed: true,
            currentBook: null,
            books: [],
            message: '',
            hint: '',
            hideResult: false,
        };
    }

    componentDidMount() {
        if (this.state.query != '' && this.state.query != this.prevQuery) {
            if (this.api) {
                this.api.kill();
            }
            this.prevQuery = this.state.query;
            this.api = new api({free: this.state.query, region: this.props.region}, (data) => {
                this.setState({books: data.books});
                this.setState({ completed: !data.running });
            });
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
                            // Todo: テスト用 のちほど削除
                            book.detail = {"url": "https://www.lib100.nexs-service.jp/sabae/webopac/searchdetail.do?biblioid=1046049", "message": "", "stocks": [{"shelves": [{"id": 320, "side": "a"}], "floor": "1階", "floorId": 7, "place": "1階 一般総記", "no": "020シ", "message": "020シ/320【a面】 "}], "isbn": "4766416716", "thumbnail": "https://cover.openbd.jp/9784766416718.jpg"}
                            return (
                                <Book book={book} key={book.id} setCurrentBook={this.setCurrentBook.bind(this)} onClose={this.onClose.bind(this)} />
                            );
                        })}
                    </div>
                    <p className="hint">{this.state.hint}</p>
                    {this.state.query!=='' ? (
                        <p className="sabato"><a href={'https://sabae.calil.jp/?q=' + encodeURIComponent(this.state.query)} target="_blank">さばサーチで近隣の図書館を検索</a></p>
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
