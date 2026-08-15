import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 cordova prepare browser が作った platforms/browser/www をそのまま配信する。

 www/ を直接配信しないのは、www/index.html が cordova.js を読んで deviceready を
 待つ設計で、cordova.js は prepare が platforms/browser/www へ注入するため。
 本番と同じ並びで確かめたいのでこちらを使う。
 */

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '../../../platforms/browser/www');
export const PORT = Number(process.env.E2E_PORT ?? 5173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

export function createServer(root = ROOT) {
  return http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(root, url === '/' ? 'index.html' : url);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
  });
}

// playwright の webServer から起動されたときはここが走る
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  if (!fs.existsSync(ROOT)) {
    console.error(`配信元がありません: ${ROOT}`);
    console.error('先に npm run copy と npx cordova prepare browser を実行してください');
    process.exit(1);
  }
  createServer().listen(PORT, '127.0.0.1', () => {
    console.log(`listening on http://127.0.0.1:${PORT}/  (${ROOT})`);
  });
}
