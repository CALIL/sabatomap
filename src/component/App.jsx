// @flow
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
const Fragment = React.Fragment;

const REGION = 'sabae';

import Facilities from './Facilities.jsx';

import Search from './Search.jsx';
import Floors from './Floors.jsx';
import Locator from './Locator.jsx';

class Main extends Component {
    constructor() {
        super();
        this.state = {
            offline: false
        };
        this.floorsRef = React.createRef();
        this.locatorRef = React.createRef();
    }
    setFacility(facility) {
        // detail refは現在使用されていないためコメントアウト
        // if (this.detailRef.current) {
        //     this.detailRef.current.setState({ query: '' });
        // }
        this.setState({ floors: [] }); // CSSアニメーション対策のためクリアする
        this.setState({ systemid: facility.systemid, floors: facility.floors });
    }
    setFloorId(id) {
        if (this.floorsRef.current) {
            this.floorsRef.current.setState({ 'id': id });
        }
    }
    notify(message) {
        if (this.locatorRef.current) {
            this.locatorRef.current.notify(message);
        }
    }
    setMode(mode) {
        if (this.locatorRef.current) {
            this.locatorRef.current.setState({ 'mode': mode });
        }
    }
    render() {
        console.log('Main render called, systemid:', this.state.systemid);
        var offline = '';
        if (this.state.offline) {
            offline = (
                <div id="offline">ネットワークに接続できません</div>
            )
        }
        if (this.state.systemid == null) {
            console.log('Rendering Facilities');
            return (
                <Fragment>
                    <Facilities facilities={this.props.facilities} />
                    {offline}
                </Fragment>
            );
        }
        console.log('Rendering Search and Floors');
        return (
            <Fragment>
                <Search placeholder="探したいこと・調べたいこと" region={REGION} />
                <Floors floors={this.state.floors} ref={this.floorsRef}/>
                <Locator ref={this.locatorRef} onClick={app.locatorClicked}/>
                {offline}
            </Fragment>
        );
    }
}

export default function InitUI(props, element) {
    console.log('InitUI called with element:', element, 'props:', props);
    
    // React 18のcreateRootを使用せず、従来のReactDOM.renderを使用
    const result = ReactDOM.render(<Main facilities={props.facilities} />, element);
    console.log('ReactDOM.render result:', result);
    return result;
}








