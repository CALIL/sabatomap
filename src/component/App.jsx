import React, { Component } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
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
        //
        // flushSync で1回ずつ流している理由が2つある。
        //
        // 1. app.js の loadFacility は、この直後に同期で loadFloor → UI.setFloorId を呼ぶ。
        //    React 17 までは React のイベント外の setState が同期に流れていたので、
        //    その時点で Floors がマウント済みだった。createRoot（React 18 以降）の
        //    自動バッチングでは描画が遅れ、setFloorId が floorsRef.current === null で
        //    握りつぶされて起動時にどの階も選択されない状態になる。
        //    InitUI が同じ理由で flushSync しているのと同じ扱いにする。
        // 2. floors を空にしてから入れ直すのは CSS アニメーションの作り直しが目的で、
        //    2回の setState が別々に描画されることが前提になっている。
        //    自動バッチングでまとめられると空の描画が起きず、意図が失われる。
        flushSync(() => {
            this.setState({ floors: [] }); // CSSアニメーション対策のためクリアする
        });
        flushSync(() => {
            this.setState({ systemid: facility.systemid, floors: facility.floors });
        });
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

    // app.jsがInitUIの戻り値をコントローラとして同期的に使うため、
    // flushSyncでレンダーを完了させてからMainのインスタンスを返す
    let instance = null;
    const root = createRoot(element);
    flushSync(() => {
        root.render(<Main facilities={props.facilities} ref={(el) => { instance = el; }} />);
    });
    console.log('InitUI instance:', instance);
    return instance;
}








