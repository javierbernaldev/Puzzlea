// Prepara los puzzles POR DEFECTO que van empaquetados en la app y en la web:
//   www/images/<imágenes>  +  www/images/manifest.json
//
// Fuentes (se juntan; si un nombre está en las dos, gana la carpeta del repo):
//   1. S3:   juegos/Puzzlea/images_default/   (lectura pública; no necesita credenciales de AWS)
//   2. Repo: carpetas  images_default/  e  images/   (si existen)
//
// Variables opcionales:
//   DEFAULT_IMAGES_URL=<url>   cambia la carpeta de S3; vacía ("") la desactiva
//   ALLOW_EMPTY=1              no falla si no hay ninguna imagen por defecto
//
//   node scripts/prepare-images.mjs
import fs from 'node:fs';
import path from 'node:path';

const DST = path.join('www', 'images');
const LOCAL_DIRS = ['images_default', 'images'];
const EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
const DEFAULT_URL =
  'https://fbm-622215956948-eu-west-1-an.s3.eu-west-1.amazonaws.com/juegos/Puzzlea/images_default/';
const REMOTE = process.env.DEFAULT_IMAGES_URL ?? DEFAULT_URL;

const decodeXml = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

async function listRemote(base) {
  const u = new URL(base);
  const prefix = decodeURIComponent(u.pathname.replace(/^\//, ''));
  const keys = [];
  let token = '';
  do {
    const q = new URL(u.origin + '/');
    q.searchParams.set('list-type', '2');
    q.searchParams.set('prefix', prefix);
    if (token) q.searchParams.set('continuation-token', token);
    const r = await fetch(q);
    if (!r.ok) throw new Error(`listado HTTP ${r.status}`);
    const xml = await r.text();
    for (const m of xml.matchAll(/<Key>([^<]*)<\/Key>/g)) keys.push(decodeXml(m[1]));
    const trunc = /<IsTruncated>true<\/IsTruncated>/.test(xml);
    const next = xml.match(/<NextContinuationToken>([^<]*)<\/NextContinuationToken>/);
    token = trunc && next ? decodeXml(next[1]) : '';
  } while (token);
  return { origin: u.origin, keys: keys.filter((k) => EXT.test(k) && !k.endsWith('/')) };
}

fs.rmSync(DST, { recursive: true, force: true });
fs.mkdirSync(DST, { recursive: true });
const have = new Set();

/* 1. S3 */
let remoteCount = 0;
let remoteError = null;
if (REMOTE) {
  try {
    const { origin, keys } = await listRemote(REMOTE);
    for (const key of keys) {
      const name = path.posix.basename(key);
      const url = origin + '/' + key.split('/').map(encodeURIComponent).join('/');
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
      fs.writeFileSync(path.join(DST, name), Buffer.from(await r.arrayBuffer()));
      have.add(name);
      remoteCount++;
    }
  } catch (e) {
    remoteError = e;
  }
}

/* 2. Repo (gana si el nombre coincide) */
let localCount = 0;
for (const dir of LOCAL_DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!EXT.test(f) || !fs.statSync(path.join(dir, f)).isFile()) continue;
    fs.copyFileSync(path.join(dir, f), path.join(DST, f));
    if (!have.has(f)) localCount++;
    have.add(f);
  }
}

const files = [...have].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
fs.writeFileSync(path.join(DST, 'manifest.json'), JSON.stringify(files));

console.log(`${files.length} imagen(es) por defecto en ${DST}  (S3: ${remoteCount}, repo: ${localCount})`);

if (remoteError) {
  const msg = `No pude bajar las imágenes de ${REMOTE}: ${remoteError.message}` +
    (/HTTP 403/.test(remoteError.message) ? '\n  (¿has ejecutado server/configure-s3.sh? Falta permiso público de listado/lectura.)' : '');
  if (files.length) console.warn('AVISO: ' + msg);
  else { console.error('ERROR: ' + msg); process.exit(1); }
}
if (!files.length && process.env.ALLOW_EMPTY !== '1') {
  console.error('ERROR: no hay ninguna imagen por defecto (ni en S3 ni en images_default/ o images/).');
  process.exit(1);
}
