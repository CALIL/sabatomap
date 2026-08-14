// React 19 の act() を使うにはこのフラグが要る。
// 立てないと「not wrapped in act(...)」の警告が出る。
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// src/component の各所が window.app（src/app.js:5313 で代入される）を直に参照する。
//   App.jsx        … app.locatorClicked
//   Search.jsx     … app.navigateShelf
//   Facilities.jsx … app.loadFacility
//   Floors.jsx     … app.loadFloor
// app.js を読み込むと ol と cordova まで要るので、テストではスタブで受ける。
globalThis.app = {
  locatorClicked() {},
  navigateShelf() {},
  loadFacility() {},
  loadFloor() {},
  initializeApp() {},
};

// 実 API を叩かせない。解決しない Promise を返すので、
// レスポンス待ちのコードパスはそのまま止まる。
globalThis.fetch = () => new Promise(() => {});
