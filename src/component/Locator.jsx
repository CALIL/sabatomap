import React, { Component } from 'react';

export default class Locator extends Component {
    constructor() {
        super();
        this.lastAppear = null;
        this.state = {
            mode: 'disabled',
            message: ''
        };
    }
    checkMessage() {
        this.setState({});
    }
    notify(message) {
        this.lastAppear = new Date();
        this.setState({ message: message });
        setTimeout(this.checkMessage, 4000);
    }
    render() {
        var fade = '';
        if (this.state.message != '' && new Date() - this.lastAppear < 3500) {
            fade = 'visible'
        }
        return (
            <div id="locator">
                <button className={this.state.mode} onClick={this.props.onClick} />
                <div className={fade}>{this.state.message}</div>
            </div>
        );
    }
}
