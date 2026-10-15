# Puzzlea

Juego de puzzles para niños. Web (HTML/JS) empaquetada como APK con Capacitor y publicada también como web.

- **Rompecabezas:** piezas con forma real que empiezan fuera del tablero; se arrastran y encajan.
- **Deslizante:** modo alternativo.
- **Dificultad:** de 2×2 a 6×6 (iconos, sin texto). Sonido sí/no, se recuerda entre sesiones.

## Puzzles

1. **Por defecto:** las imágenes de la carpeta `images_default/` del repo (cuadradas). Se empaquetan en el APK y en la web al compilar;
   tras añadir o quitar imágenes, vuelve a lanzar Build APK / Build web. Sin imágenes el build falla (`ALLOW_EMPTY=1` lo permite).
2. **Propios:** botón `+` de la pantalla de inicio (se guardan en el dispositivo).

La app no descarga nada de ningún servidor.

## APK (GitHub Actions, gratis)

Workflow **Build APK** (en cada push a `main` o con *Run workflow*). Necesita los secrets
`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS` y `KEY_PASSWORD`.
Descarga el artefacto **puzzlea-apk**: `Puzzlea.apk` (release firmado) y `Puzzlea-debug.apk` (prueba).

## Web (S3)

El workflow **Build web** deja la web lista como artefacto **puzzlea-web** (`www/` con las imágenes por defecto dentro).
Para publicarla en S3, desde un equipo con AWS CLI:

    ./server/deploy-web.sh                      # s3://fbm-622215956948-eu-west-1-an/juegos/Puzzlea-web/
    ./server/deploy-web.sh s3://bucket/prefijo  # otro destino

- El destino **no** puede estar dentro de `juegos/Puzzlea/` (ese prefijo es el de los puzzles del servidor;
  la app lista todo lo que hay en él y las imágenes de la web saldrían duplicadas). El script lo comprueba.
- Con CloudFront delante: origen = ese prefijo (Origin path `/juegos/Puzzlea-web`) y *Default root object* = `index.html`.

Probar en local:

    node scripts/prepare-images.mjs
    python3 -m http.server 8080 -d www
