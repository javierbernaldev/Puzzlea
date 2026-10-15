#!/usr/bin/env python3
"""Genera el icono de Puzzlea (4 piezas de puzzle de colores) y lo deja en:
  - <res>/mipmap-*/ic_launcher.png, ic_launcher_round.png, ic_launcher_foreground.png  (Android)
  - <res>/values/ic_launcher_background.xml                                            (color de fondo)
  - www/icon.png  (icono para la web)
Uso:  python3 scripts/make-icons.py android/app/src/main/res
Necesita Pillow (pip install pillow).
"""
import os, sys
from PIL import Image, ImageDraw, ImageFilter

BG = (27, 31, 59)                      # #1b1f3b, igual que la app
COLORS = [(255, 93, 93), (255, 196, 0), (60, 200, 120), (77, 150, 255)]  # rojo, amarillo, verde, azul
SS = 4                                  # supersampling


def pieces_image(size, fill):
    """4 piezas (2x2) con sus pestañas encajadas, ocupando `fill` del lado. Fondo transparente."""
    W = size * SS
    side = W * fill
    x0 = y0 = (W - side) / 2
    cell = side / 2
    r = cell * 0.19                      # radio de la cabeza de la pestaña
    c = r * 1.15                         # distancia del centro de la cabeza a la arista
    nw = r * 0.55                        # semiancho del cuello

    def knob(d, cx, cy, vertical_edge, direction, add):
        """Dibuja (add) o recorta la pestaña de la arista que pasa por (cx,cy).
        vertical_edge: arista vertical (pestaña hacia la derecha si direction=+1)."""
        fill_v = 255 if add else 0
        if vertical_edge:
            hx, hy = cx + direction * c, cy
            d.rectangle([min(cx, hx), cy - nw, max(cx, hx), cy + nw], fill=fill_v)
        else:
            hx, hy = cx, cy + direction * c
            d.rectangle([cx - nw, min(cy, hy), cx + nw, max(cy, hy)], fill=fill_v)
        d.ellipse([hx - r, hy - r, hx + r, hy + r], fill=fill_v)

    def piece_mask(row, col):
        m = Image.new('L', (W, W), 0)
        d = ImageDraw.Draw(m)
        px, py = x0 + col * cell, y0 + row * cell
        d.rectangle([px, py, px + cell, py + cell], fill=255)
        # arista vertical central (entre col 0 y col 1), una por fila
        dv = 1 if row == 0 else -1            # sentido de la pestaña: fila 0 hacia la derecha, fila 1 hacia la izquierda
        cx, cy = x0 + cell, py + cell / 2
        owner_col = 0 if dv == 1 else 1
        knob(d, cx, cy, True, dv, add=(col == owner_col))
        # arista horizontal central (entre fila 0 y fila 1), una por columna
        dh = 1 if col == 0 else -1            # col 0: pestaña hacia abajo; col 1: hacia arriba
        cx, cy = px + cell / 2, y0 + cell
        owner_row = 0 if dh == 1 else 1
        knob(d, cx, cy, False, dh, add=(row == owner_row))
        return m

    img = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    gap = max(2, int(W * 0.007))
    idx = 0
    for row in range(2):
        for col in range(2):
            m = piece_mask(row, col).filter(ImageFilter.MinFilter(gap * 2 + 1))
            img.paste(Image.new('RGBA', (W, W), COLORS[idx] + (255,)), (0, 0), m)
            idx += 1
    return img.resize((size, size), Image.LANCZOS)


def with_background(fg, size, radius=0.22, round_=False):
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    m = Image.new('L', (size * SS, size * SS), 0)
    d = ImageDraw.Draw(m)
    if round_:
        d.ellipse([0, 0, size * SS - 1, size * SS - 1], fill=255)
    else:
        d.rounded_rectangle([0, 0, size * SS - 1, size * SS - 1], radius=int(size * SS * radius), fill=255)
    m = m.resize((size, size), Image.LANCZOS)
    solid = Image.new('RGBA', (size, size), BG + (255,))
    bg.paste(solid, (0, 0), m)
    return Image.alpha_composite(bg, fg)


def main():
    res = sys.argv[1] if len(sys.argv) > 1 else 'android/app/src/main/res'
    dens = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    for name, px in dens.items():
        d = os.path.join(res, 'mipmap-' + name)
        if not os.path.isdir(d):
            os.makedirs(d)
        # icono clásico (cuadrado redondeado) y redondo: las piezas ocupan ~74 %
        with_background(pieces_image(px, 0.74), px).save(os.path.join(d, 'ic_launcher.png'))
        with_background(pieces_image(px, 0.66), px, round_=True).save(os.path.join(d, 'ic_launcher_round.png'))
        # primer plano del icono adaptable: lienzo de 108 dp, zona segura 66 dp -> piezas al 52 %
        fpx = px * 108 // 48
        pieces_image(fpx, 0.52).save(os.path.join(d, 'ic_launcher_foreground.png'))
    vals = os.path.join(res, 'values')
    os.makedirs(vals, exist_ok=True)
    with open(os.path.join(vals, 'ic_launcher_background.xml'), 'w') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
                '    <color name="ic_launcher_background">#%02X%02X%02X</color>\n</resources>\n' % BG)
    if os.path.isdir('www'):
        with_background(pieces_image(512, 0.74), 512).save(os.path.join('www', 'icon.png'))
    print('Iconos generados en', res)


if __name__ == '__main__':
    main()
