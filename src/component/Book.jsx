import React, { Component } from 'react';
import Stocks from './Stocks.jsx';

export default (props) => {
    return (
        <div onClick={props.onClick}>
            {props.book.isbn ? (
                <img src={`https://asia-northeast1-libmuteki2.cloudfunctions.net/openbd_cover?isbn=${props.book.isbn}`} />
            ) : null}
            <div className="title">{props.book.title}
                <div className="author">{props.book.author}</div>
            </div>
            <Stocks detail={props.book.detail} />
            <div className="next"><i className="fa fa-play" /></div>
        </div>
    );
}
