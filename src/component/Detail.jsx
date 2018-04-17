import React, { Component } from 'react';

export default class Detail extends Component {
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
        console.log(this.props.book)
        var stocks;
        if (this.props.book.detail.message != '') {
            stocks = (
                <div className="stockB">{this.props.book.detail.message}</div>
            );
        } else {
            stocks = this.props.book.detail.stocks.map(function (stock, i) {
                var add = "";
                if (stock.no != '') {
                    add = ' [' + stock.no + ']';
                }
                return (
                    <div className="stockA" onClick={this.navigateShelf.bind(this, stock)} key={i}>{stock.place}{add}</div>
                );
            }, this);
        }
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
                        {stocks}
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
