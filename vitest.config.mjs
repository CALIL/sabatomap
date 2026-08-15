import { defineConfig } from 'vitest/config';

// このリポジトリに vite.config は無い。vitest は vite.config があるとその root を
// 引き継ぐので、専用の設定をここに独立して置いている。
export default defineConfig({
  // 本番の成果物は tools/build.mjs の alias で preact/compat に差し替わる。
  // ここを揃えないと、テストは react を、実機は preact を動かすことになり、
  // マウントテストが本番と別物を検証してしまう
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom/client': 'preact/compat/client',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/compat/jsx-runtime',
    },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{js,jsx}'],
    setupFiles: ['test/setup.js'],
    // jsdom はレイアウトを計算しない（flex も幅も 0 のまま）。
    // ここで見るのは「描画できるか」だけで、見た目の検証はしない。
    globals: false,
  },
});
