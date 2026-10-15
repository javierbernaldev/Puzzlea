# Puzzlea

Juego de puzzles para niños. Web (HTML/JS) empaquetada como APK con Capacitor y publicada también como web.

- **Rompecabezas:** piezas con forma real que empiezan fuera del tablero; se arrastran y encajan.
- **Deslizante:** modo alternativo.
- **Dificultad:** de 2×2 a 6×6 (iconos, sin texto). Sonido sí/no, se recuerda entre sesiones.

## Puzzles

1. **Por defecto:** las imágenes de la carpeta `images/` del repo (cuadradas, ~1024 px). Van dentro del APK y de la web.
   Al hacer push se vuelve a compilar todo con las que haya.
2. **Del servidor:** botón **☁️ Descargar puzzles**. Borra todos los puzzles que no sean los por defecto
   (también los subidos con `+`) y baja los del bucket S3:
   `https://fbm-622215956948-eu-west-1-an.s3.eu-west-1.amazonaws.com/juegos/Puzzlea/`
   (esa URL está fija en la app). Si el servidor está vacío o no responde, no se borra nada.

## Configurar el bucket (una vez)

`server/configure-s3.sh` (AWS CLI con permisos de S3) añade a la política del bucket lectura y listado públicos
**solo** de `juegos/Puzzlea/` y una regla CORS, sin tocar lo que ya tengas:

    ./server/configure-s3.sh
    # si el bucket bloquea políticas públicas:
    ALLOW_PUBLIC_POLICY=1 ./server/configure-s3.sh

Subir puzzles: `aws s3 sync ./imagenes s3://fbm-622215956948-eu-west-1-an/juegos/Puzzlea/`

El prefijo es público: no subas fotos privadas.

## APK (GitHub Actions, gratis)

Workflow **Build APK** (en cada push a `main` o con *Run workflow*). Necesita los secrets
`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS` y `KEY_PASSWORD`.
Descarga el artefacto **puzzlea-apk**: `Puzzlea.apk` (release firmado) y `Puzzlea-debug.apk` (prueba).

## Web

Workflow **Deploy web** publica `www/` en GitHub Pages. Una sola vez: *Settings → Pages → Source: GitHub Actions*
(en repos privados necesita un plan de pago; si no, ver más abajo). La URL aparece en la ejecución del workflow.

Probar en local:

    node scripts/prepare-images.mjs
    python3 -m http.server 8080 -d www

Alternativa a Pages: subir el contenido de `www/` (tras `prepare-images.mjs`) a S3 + CloudFront o a nginx.
