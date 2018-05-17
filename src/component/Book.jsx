import React, { Component } from 'react';

export default class Book extends Component {
    constructor() {
        super();
        this.state = {
        };
    }
    open() {
        if (this.props.book.detail && (this.props.book.detail.stocks.length > 0 || this.props.book.detail.message != '')) {
            this.props.setCurrentBook(this.props.book);
            if (this.props.book.detail.stocks.length > 0) {
                this.navigateShelf(this.props.book.detail.stocks[0]);
            } else {
                app.navigateShelf(null, []);
                this.props.onClose();
            }
        }
    }
    navigateShelf(stock) {
        var floorid = String(stock.floorId); // fixme 整数型で来てしまっているのでとりあえずキャスト
        app.navigateShelf(floorid, stock.shelves);
        this.props.onClose();
    }
    render() {
        var stocks;
        if (this.props.book.detail) {
            if (this.props.book.detail.message != '') {
                stocks = (
                    <div className="stockB">{this.props.book.detail.message}</div>
                );
            } else {
                stocks = this.props.book.detail.stocks.map(function (stock, i) {
                    return (
                        <div className="stockA" onClick={this.navigateShelf.bind(this, stock)} key={i}>{stock.place}</div>
                    );
                }, this);
            }
        }
        let isbn;
        if (this.props.book.isbn) {
            isbn = this.props.book.isbn.replace(/-/g, '');
        }
        return (
            <div onClick={this.open.bind(this)}>
                {this.props.book.isbn && isbn.length===13 ? (
                    <img src={`https://cover.openbd.jp/${isbn}.jpg`} />
                ) : null}
                <div className="title">{this.props.book.title}
                    <div className="author">{this.props.book.author}</div>
                </div>
                <div className={'stocks' + (!this.props.book.detail ? ' notfetch' : '')}>
                {this.props.book.detail ? (
                    stocks
                ) : null}
                </div>
                <div className="next"><i className="fa fa-play" /></div>
            </div>
        );
    }
}
