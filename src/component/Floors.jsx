import React, { Component } from 'react';

export default class Floors extends Component {
    constructor() {
        super();
        this.state = {
            id: null
        };
    }
    select(id) {
        this.setState({ id: id });
        setTimeout(function () {
            app.loadFloor(id);
        }, 10);
    }
    render() {
        var floors;
        if (this.props.floors) {
            floors = this.props.floors.map(function (floor) {
                return (
                    <div key={floor.id} className="floor">
                        <input name="view" type="radio" id={'F' + floor.id} checked={this.state.id === floor.id}
                            value={floor.id} onChange={this.select.bind(this, floor.id)} />
                        <label htmlFor={'F' + floor.id}>{floor.label}</label>
                    </div>
                );
            }, this);
            floors.reverse();
        }
        return (
            <div id="floors">
                {floors}
            </div>
        );
    }
}