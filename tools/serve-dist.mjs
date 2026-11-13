// Serves a production build the way a CDN would, so Lighthouse measures the real app instead of
// `ng serve` (unminified Vite pre-bundles, no compression): HTTP/2 over TLS, brotli/gzip,
// immutable caching for hashed files, SPA fallback to index.html.
//
//   node tools/serve-dist.mjs [dir=dist/contentful-spartacus-demo/browser] [port=4200]
//
// A self-signed localhost certificate is generated once into .cert/ (gitignored) with openssl.
// Local measurement only; not a production server.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http2 from 'node:http2';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(process.argv[2] ?? 'dist/contentful-spartacus-demo/browser');
const port = Number(process.argv[3] ?? 4200);
const certDir = path.resolve('.cert');
const keyFile = path.join(certDir, 'localhost-key.pem');
const certFile = path.join(certDir, 'localhost.pem');

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error(`No build in ${root}. Run: npx ng build --configuration local-perf`);
  process.exit(1);
}
if (!fs.existsSync(keyFile) || !fs.existsSync(certFile)) {
  fs.mkdirSync(certDir, { recursive: true });
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-days',
      '365',
      '-subj',
      '/CN=localhost',
      '-addext',
      'subjectAltName=DNS:localhost,IP:127.0.0.1',
      '-keyout',
      keyFile,
      '-out',
      certFile,
    ],
    { stdio: 'ignore' },
  );
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt']);
const HASHED = /-[A-Z0-9]{8}\.[a-z0-9]+$/; // Angular's outputHashing file names

// Precompress once at startup (brotli q11, gzip 9), as a CDN or build step would.
const files = new Map();
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    const ext = path.extname(entry.name);
    const body = fs.readFileSync(full);
    const compress = COMPRESSIBLE.has(ext) && body.length > 1024;
    files.set('/' + path.relative(root, full).split(path.sep).join('/'), {
      type: TYPES[ext] ?? 'application/octet-stream',
      cache: HASHED.test(entry.name) ? 'public, max-age=31536000, immutable' : 'no-cache',
      body,
      br: compress ? zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }) : undefined,
      gzip: compress ? zlib.gzipSync(body, { level: 9 }) : undefined,
    });
  }
};
walk(root);

const server = http2.createSecureServer({ key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile), allowHTTP1: true }, (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'https://localhost').pathname);
  const file = files.get(pathname) ?? files.get('/index.html'); // SPA fallback for storefront routes
  const accept = String(req.headers['accept-encoding'] ?? '');
  const [encoding, body] =
    file.br && /\bbr\b/.test(accept) ? ['br', file.br] : file.gzip && /\bgzip\b/.test(accept) ? ['gzip', file.gzip] : [undefined, file.body];
  res.setHeader('content-type', file.type);
  res.setHeader('cache-control', file === files.get('/index.html') ? 'no-cache' : file.cache);
  res.setHeader('vary', 'accept-encoding');
  if (encoding) res.setHeader('content-encoding', encoding);
  res.end(body);
});
server.listen(port, () => console.log(`Serving ${root} (${files.size} files) at https://localhost:${port}/  (HTTP/2, brotli/gzip)`));
