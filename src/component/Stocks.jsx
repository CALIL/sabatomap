import React from 'react';

export default (props) => {
    return <div className={'stocks' + (!props.detail ? ' notfetch' : '')}>
        {(() => {
            if (props.detail) {
                if (props.detail.message != '') {
                    return <div className="stockB">{props.detail.message}</div>;
                } else {
                    return props.detail.stocks.map((stock, i) => {
                        return (
                            <div className="stockA" onClick={() => props.selectStock(i)} key={i}>
                                {stock.place}{stock.no != '' ? ' [' + stock.no + ']' : ''}
                            </div>
                        );
                    });
                }
            }
        })()}
    </div>
}