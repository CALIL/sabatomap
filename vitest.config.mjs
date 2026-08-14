import { defineConfig } from 'vitest/config';

// このリポジトリに vite.config は無い。vitest は vite.config があるとその root を
// 引き継ぐので、専用の設定をここに独立して置いている。
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{js,jsx}'],
    setupFiles: ['test/setup.js'],
    // jsdom はレイアウトを計算しない（flex も幅も 0 のまま）。
    // ここで見るのは「描画できるか」だけで、見た目の検証はしない。
    globals: false,
  },
});
