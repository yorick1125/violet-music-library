import { createServer } from 'node:http';
import { createReadStream, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { homedir } from 'node:os';

const root = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const lan = args.includes('--lan');
const host = lan ? '0.0.0.0' : '127.0.0.1';
const portArg = args.find(x => /^\d+$/.test(x));
const port = Number(portArg || 4173);
const types = { '.html':'text/html; charset=utf-8', '.webmanifest':'application/manifest+json', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.css':'text/css; charset=utf-8' };
const musicRoot = resolve(process.env.UTOPAI_MUSIC_DIR || join(homedir(), 'Music'));
const audioTypes = { '.wav':'audio/wav', '.mp3':'audio/mpeg', '.m4a':'audio/mp4', '.aac':'audio/aac', '.flac':'audio/flac', '.ogg':'audio/ogg', '.opus':'audio/ogg', '.aiff':'audio/aiff', '.wma':'audio/x-ms-wma', '.alac':'audio/mp4' };

function findAudioFiles(dir, result = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return result; }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const file = join(dir, entry.name);
    if (entry.isDirectory()) findAudioFiles(file, result);
    else if (entry.isFile() && audioTypes[extname(entry.name).toLowerCase()]) result.push(file);
  }
  return result;
}

function musicFiles() {
  return findAudioFiles(musicRoot).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

function sendAudio(req, res, file) {
  let stat;
  try { stat = statSync(file); } catch { res.writeHead(404).end('Not found'); return; }
  const type = audioTypes[extname(file).toLowerCase()];
  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) { res.writeHead(416).end(); return; }
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
    if (start > end || start >= stat.size) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }).end(); return; }
    res.writeHead(206, { 'Content-Type': type, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname); }
  catch { res.writeHead(400).end('Bad request'); return; }
  if (pathname === '/api/library') {
    const files = musicFiles();
    const tracks = files.map((file, id) => ({ id, name: file.slice(musicRoot.length + 1).replace(/\\/g, '/').split('/').pop().replace(/\.[^.]+$/, ''), fileName: file.slice(musicRoot.length + 1).replace(/\\/g, '/'), url: `/api/library/${id}` }));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify(tracks));
    return;
  }
  const audioMatch = /^\/api\/library\/(\d+)$/.exec(pathname);
  if (audioMatch) {
    const file = musicFiles()[Number(audioMatch[1])];
    if (!file) { res.writeHead(404).end('Not found'); return; }
    sendAudio(req, res, file);
    return;
  }
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = resolve(root, relative);
  if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end('Forbidden'); return; }
  try {
    if (!statSync(file).isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, host, () => {
  console.log(`Utopai is running at http://localhost:${port}`);
  if (lan) {
    for (const entries of Object.values(networkInterfaces())) for (const entry of entries || [])
      if (entry.family === 'IPv4' && !entry.internal) console.log(`Same-Wi-Fi phone preview: http://${entry.address}:${port}`);
    console.log('LAN preview is HTTP; installable PWA mode requires HTTPS.');
  }
});


