import React from 'react';
import Stocks from './Stocks.jsx';
import Icon from './Icon.jsx';

export default (props) => {
    return (
        <div onClick={() => props.selectBook(props.book)}>
            {props.book.isbn && props.showCover ? (
                <img src={`https://asia-northeast1-libmuteki2.cloudfunctions.net/openbd_cover?isbn=${props.book.isbn}`}
                onError={(e)=>{e.target.style.display='none'}}
                />
            ) : null}
            {/*
                著者はタイトルの外に出す。中に入れていた頃は、タイトルの
                2行分の箱を2つで奪い合って**タイトルが途中で切れていた**
            */}
            <div className="title">{props.book.title}</div>
            <div className="author">{props.book.author}</div>
            <Stocks detail={props.book.detail}
             selectStock={(stockIndex) => props.selectBook(props.book, stockIndex)} />
            <div className="next"><Icon name="play" /></div>
        </div>
    );
}
