# Puzzlea (APK)

Juego de puzzles con imágenes propias. Web (HTML/JS) empaquetada con Capacitor.

- **Modos:** intercambiar piezas (tocar o arrastrar) y deslizante.
- **Dificultad:** 3×3 a 6×6.
- **Tus imágenes:** botón `+` en la galería (galería o cámara). Se recortan a cuadrado y se guardan en el móvil (IndexedDB).

## Generar el APK gratis (GitHub Actions)

1. Crea un repo en GitHub (público o privado) y sube esta carpeta a `main`.
2. Pestaña **Actions** → **Build APK** (se lanza solo con cada push, o con *Run workflow*).
3. Cuando acabe (~5 min), abre la ejecución y descarga el artefacto **puzzlea-apk** (zip con `app-debug.apk`).
4. Pásalo al móvil e instálalo (permitir "orígenes desconocidos").

## Probar en el navegador

    cd www && python3 -m http.server 8080

Abre `http://IP:8080` (en svrfbm habría que abrir ese puerto en el security group).

## Compilar en local (opcional)

Requiere Node 20+, JDK 21 y Android SDK:

    npm install && npx cap add android && npx cap sync android
    cd android && ./gradlew assembleDebug
