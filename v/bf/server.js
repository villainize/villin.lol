const fs = require('fs');
const http = require('http');
const path = require('path');
const root = __dirname;
const port = Number(process.env.BF_DB_PORT || 8792);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.md': 'text/markdown' };
http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end('bad request'); return; }
  if (urlPath.startsWith('/bf-db/')) urlPath = urlPath.slice(6);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(root, urlPath));
  const relative = path.relative(root, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(filePath, (error, data) => {
    if (error) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': path.extname(filePath) === '.json' ? 'application/json' : types[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`BF Database: http://127.0.0.1:${port}`));
