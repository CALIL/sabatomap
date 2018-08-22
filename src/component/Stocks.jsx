import React from 'react';

const navigateShelf = (stock) => {
    // fixme 整数型で来てしまっているのでとりあえずキャスト
    app.navigateShelf(String(stock.floorId), stock.shelves);
}


export default (props) => {
    return <div className={'stocks' + (!props.detail ? ' notfetch' : '')}>
        {(() => {
            if (props.detail) {
                if (props.detail.message != '') {
                    return <div className="stockB">{props.detail.message}</div>;
                } else {
                    return props.detail.stocks.map((stock, i) => {
                        return (
                            <div className="stockA" onClick={navigateShelf(stock)} key={i}>
                                {stock.place}{stock.no != '' ? ' [' + stock.no + ']' : ''}
                            </div>
                        );
                    });
                }
            }
        })()}
    </div>
}