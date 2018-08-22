import React, { Component } from 'react';
import Stocks from './Stocks.jsx';

export default (props) => {
    return (
        <div onClick={() => props.selectBook(props.book)}>
            {props.book.isbn && props.showCover ? (
                <img src={`https://asia-northeast1-libmuteki2.cloudfunctions.net/openbd_cover?isbn=${props.book.isbn}`}
                onError={(e)=>{e.target.style.display='none'}}
                />
            ) : null}
            <div className="title">{props.book.title}
                <div className="author">{props.book.author}</div>
            </div>
            <Stocks detail={props.book.detail}
             selectStock={(stockIndex) => props.selectBook(props.book, stockIndex)} />
            <div className="next"><i className="fa fa-play" /></div>
        </div>
    );
}
