// Prepara los puzzles POR DEFECTO que van empaquetados en la app y en la web:
//   repo: images_default/  ->  www/images/<imágenes> + www/images/manifest.json
//
// ALLOW_EMPTY=1 evita el error si no hay ninguna imagen.
//   node scripts/prepare-images.mjs
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'images_default';
const DST = path.join('www', 'images');
const EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

fs.rmSync(DST, { recursive: true, force: true });
fs.mkdirSync(DST, { recursive: true });

const files = fs.existsSync(SRC)
  ? fs.readdirSync(SRC).filter((f) => EXT.test(f) && fs.statSync(path.join(SRC, f)).isFile())
  : [];
files.sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
for (const f of files) fs.copyFileSync(path.join(SRC, f), path.join(DST, f));
fs.writeFileSync(path.join(DST, 'manifest.json'), JSON.stringify(files));

console.log(`${files.length} imagen(es) por defecto en ${DST}`);
if (!files.length && process.env.ALLOW_EMPTY !== '1') {
  console.error(`ERROR: no hay imágenes en ${SRC}/ (sube .jpg/.png al repo).`);
  process.exit(1);
}
