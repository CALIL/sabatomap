// @flow
import 'react-fastclick';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
const Fragment = React.Fragment;

const REGION = 'sabae';

import Facilities from './component/Facilities.jsx';

import Search from './component/Search.jsx';
import Floors from './component/Floors.jsx';
import Locator from './component/Locator.jsx';

export class Main extends Component {
    constructor() {
        super();
        this.state = {
            offline: false
        };
    }
    setFacility(facility) {
        if (this.refs.detail) {
            this.refs.detail.setSstate({ query: '' });
        }
        this.setState({ floors: [] }); // CSSアニメーション対策のためクリアする
        this.setState({ systemid: facility.systemid, floors: facility.floors });
    }
    setFloorId(id) {
        this.refs.floors.setState({ 'id': id });
    }
    notify(message) {
        this.refs.locator.notify(message);
    }
    setMode(mode) {
        this.refs.locator.setState({ 'mode': mode });
    }
    render() {
        var offline = '';
        if (this.state.offline) {
            offline = (
                <div id="offline">ネットワークに接続できません</div>
            )
        }
        if (this.state.systemid == null) {
            return (
                <Fragment>
                    <Facilities facilities={this.props.facilities} />
                    {offline}
                </Fragment>
            );
        }
        return (
            <Fragment>
                <Search placeholder="探したいこと・調べたいこと" region={REGION} />
                <Floors floors={this.state.floors} ref="floors"/>
                <Locator ref="locator" onClick={app.locatorClicked}/>
                {offline}
            </Fragment>
        );
    }
}


export default function InitUI(props, element) {
    return ReactDOM.render(
        React.createElement(Main, props),
        element
    )
}








