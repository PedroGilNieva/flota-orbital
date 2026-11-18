import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ensure } from './game.js';
import { gameRequest } from './service.js';

const publicDir = new URL('./public/', import.meta.url);
const dataDir = process.env.DATA_DIR || fileURLToPath(new URL('./data/', import.meta.url));
mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(dataDir + '/rooms.sqlite');
db.exec('PRAGMA journal_mode=WAL');
db.exec(readFileSync(new URL('./drizzle/0000_rooms.sql',import.meta.url),'utf8'));
const storage = {
  first: (sql,...args) => db.prepare(sql).get(...args),
  run: (sql,...args) => db.prepare(sql).run(...args).changes
};
const files = new Map([['/', ['index.html','text/html']], ['/style.css',['style.css','text/css']], ['/app.js',['app.js','text/javascript']], ['/art.js',['art.js','text/javascript']]]);
files.set('/radar.js',['radar.js','text/javascript']);

async function readBody(req) {
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    ensure(length < 8192,'Petición demasiado grande.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}
const server = http.createServer(async (req,res) => {
  const url = new URL(req.url,'http://localhost');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Cache-Control','no-store');
  if (url.pathname.startsWith('/api/')) {
    res.setHeader('Content-Type','application/json; charset=utf-8');
    const action = url.pathname.slice(5);
    try {
      ensure(req.method === (action === 'state' ? 'GET' : 'POST'),'Método incorrecto.');
      const body = await readBody(req);
      const token = req.headers.authorization?.replace(/^Bearer /,'');
      const result=await gameRequest(storage,action,body,url.searchParams.get('room') || '',token);
      res.end(JSON.stringify(result));
    } catch(e) {
      res.statusCode = 400;
      res.end(JSON.stringify({error:e.message}));
    }
    return;
  }
  const file = files.get(url.pathname);
  if (!file) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type',file[1]+'; charset=utf-8');
  res.end(readFileSync(new URL(file[0],publicDir)));
});
server.listen(Number(process.env.PORT || 8080), '0.0.0.0', () => console.log('Flota Orbital en http://localhost:'+server.address().port));
