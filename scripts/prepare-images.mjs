// Copia las imágenes de images/ (puzzles por defecto) a www/images/ y genera manifest.json.
// Se ejecuta antes de compilar el APK y antes de publicar la web.
//   node scripts/prepare-images.mjs
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'images';
const DST = path.join('www', 'images');
const EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

fs.rmSync(DST, { recursive: true, force: true });
fs.mkdirSync(DST, { recursive: true });

const files = fs.existsSync(SRC)
  ? fs.readdirSync(SRC)
      .filter((f) => EXT.test(f) && fs.statSync(path.join(SRC, f)).isFile())
      .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
  : [];

for (const f of files) fs.copyFileSync(path.join(SRC, f), path.join(DST, f));
fs.writeFileSync(path.join(DST, 'manifest.json'), JSON.stringify(files));

console.log(`${files.length} imagen(es) por defecto en ${DST}`);
if (!files.length) console.warn('AVISO: no hay imágenes en images/; la app arrancará sin puzzles por defecto.');
