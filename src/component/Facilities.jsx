import React, { Component } from 'react';

export default class Facilities extends Component {
    constructor() {
        super();
        this.state = {
        };
    }
    select(id) {
        setTimeout(function () {
            app.loadFacility(id);
        }, 10);
    }
    render() {
        var cards;
        if (this.props.facilities) {
            cards = this.props.facilities.map(function (facility) {
                return (
                    <div key={facility.id} className="card" onClick={this.select.bind(this, facility.id)}>
                        <div className="name">{facility.name}</div>
                        <p>この図書館を選ぶ</p>
                    </div>
                );
            }, this);
        }
        return (
            <div className="facilities">
                <div className="cards">
                    {cards}
                </div>
            </div>
        );
    }
}