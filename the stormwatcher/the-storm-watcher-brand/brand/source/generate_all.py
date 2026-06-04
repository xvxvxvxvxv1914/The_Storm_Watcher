"""
ГЛАВЕН ГЕНЕРАТОР — произвежда целия иконен пакет от SVG източниците.

Стартира се веднъж и попълва папките ios/, android/, web/ и social/.
Всичко идва от трите SVG файла (тъмен / прозрачен / стегнат), така че
визуалният език остава идентичен на всеки размер и платформа.
"""

import os
import json
import cairosvg
from PIL import Image

SRC = os.path.dirname(__file__)
BRAND = os.path.dirname(SRC)

ICON_DARK  = os.path.join(SRC, "icon_dark.svg")          # плътен navy фон
ICON_TRANS = os.path.join(SRC, "icon_transparent.svg")   # прозрачен (само символ)
ICON_TIGHT = os.path.join(SRC, "icon_tight.svg")         # уголемен за дребни размери


def render(svg_path, out_path, size):
    """Рендерира SVG до квадратен PNG с дадена страна (в пиксели)."""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    cairosvg.svg2png(url=svg_path, write_to=out_path,
                     output_width=size, output_height=size)


# ===========================================================================
# 1) iOS — пълен набор размери + Contents.json за Xcode AppIcon.appiconset
# ===========================================================================
def build_ios():
    """
    Apple очаква иконата в множество размери. Изброяваме ги като
    (страна_в_px, име_на_файл). Съвременният Xcode приема и единичен
    1024px файл, но пълният набор гарантира съвместимост със стари проекти.
    """
    out = os.path.join(BRAND, "ios", "AppIcon.appiconset")
    sizes = [
        (1024, "icon-1024.png"),   # App Store
        (180,  "icon-180.png"),    # iPhone @3x (60pt)
        (167,  "icon-167.png"),    # iPad Pro @2x (83.5pt)
        (152,  "icon-152.png"),    # iPad @2x (76pt)
        (120,  "icon-120.png"),    # iPhone @2x (60pt) / @3x (40pt)
        (87,   "icon-87.png"),     # iPhone @3x settings (29pt)
        (80,   "icon-80.png"),     # spotlight @2x (40pt)
        (76,   "icon-76.png"),     # iPad @1x (76pt)
        (60,   "icon-60.png"),     # notification @3x (20pt)
        (58,   "icon-58.png"),     # settings @2x (29pt)
        (40,   "icon-40.png"),     # spotlight/notif @2x (20pt)
        (29,   "icon-29.png"),     # settings @1x
        (20,   "icon-20.png"),     # notification @1x
    ]
    # дребните размери ползват „стегнатата" версия за по-добра четимост
    for px, name in sizes:
        src = ICON_TIGHT if px <= 40 else ICON_DARK
        render(src, os.path.join(out, name), px)

    # Contents.json — картата, по която Xcode свързва файловете с местата им
    contents = {
        "images": [
            {"size": "20x20",   "idiom": "iphone", "filename": "icon-40.png",  "scale": "2x"},
            {"size": "20x20",   "idiom": "iphone", "filename": "icon-60.png",  "scale": "3x"},
            {"size": "29x29",   "idiom": "iphone", "filename": "icon-58.png",  "scale": "2x"},
            {"size": "29x29",   "idiom": "iphone", "filename": "icon-87.png",  "scale": "3x"},
            {"size": "40x40",   "idiom": "iphone", "filename": "icon-80.png",  "scale": "2x"},
            {"size": "40x40",   "idiom": "iphone", "filename": "icon-120.png", "scale": "3x"},
            {"size": "60x60",   "idiom": "iphone", "filename": "icon-120.png", "scale": "2x"},
            {"size": "60x60",   "idiom": "iphone", "filename": "icon-180.png", "scale": "3x"},
            {"size": "20x20",   "idiom": "ipad",   "filename": "icon-20.png",  "scale": "1x"},
            {"size": "20x20",   "idiom": "ipad",   "filename": "icon-40.png",  "scale": "2x"},
            {"size": "29x29",   "idiom": "ipad",   "filename": "icon-29.png",  "scale": "1x"},
            {"size": "29x29",   "idiom": "ipad",   "filename": "icon-58.png",  "scale": "2x"},
            {"size": "40x40",   "idiom": "ipad",   "filename": "icon-40.png",  "scale": "1x"},
            {"size": "40x40",   "idiom": "ipad",   "filename": "icon-80.png",  "scale": "2x"},
            {"size": "76x76",   "idiom": "ipad",   "filename": "icon-76.png",  "scale": "1x"},
            {"size": "76x76",   "idiom": "ipad",   "filename": "icon-152.png", "scale": "2x"},
            {"size": "83.5x83.5","idiom": "ipad",  "filename": "icon-167.png", "scale": "2x"},
            {"size": "1024x1024","idiom": "ios-marketing", "filename": "icon-1024.png", "scale": "1x"},
        ],
        "info": {"version": 1, "author": "xcode"},
    }
    with open(os.path.join(out, "Contents.json"), "w") as f:
        json.dump(contents, f, indent=2)
    return len(sizes)


# ===========================================================================
# 2) Android — legacy mipmaps + adaptive icon (foreground/background) + XML
# ===========================================================================
def build_android():
    base = os.path.join(BRAND, "android")

    # --- Legacy квадратни икони (плътен фон) за всяка плътност на екрана ---
    # dp -> px коефициенти: mdpi=1, hdpi=1.5, xhdpi=2, xxhdpi=3, xxxhdpi=4
    densities = {
        "mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192,
    }
    for dens, px in densities.items():
        folder = os.path.join(base, "legacy", f"mipmap-{dens}")
        render(ICON_DARK, os.path.join(folder, "ic_launcher.png"), px)
        render(ICON_DARK, os.path.join(folder, "ic_launcher_round.png"), px)

    # --- Adaptive icon (Android 8.0+) ---
    # Системата комбинира два слоя 108x108dp и сама ги маскира. Видими са
    # само централните 72dp (66%), затова символът ни (центриран, ~60%)
    # пасва идеално в безопасната зона.
    adapt_dens = {
        "mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432,
    }
    for dens, px in adapt_dens.items():
        folder = os.path.join(base, "adaptive", f"mipmap-{dens}")
        # преден план = прозрачен символ; фон = плътен navy
        render(ICON_TRANS, os.path.join(folder, "ic_launcher_foreground.png"), px)
        render(ICON_DARK,  os.path.join(folder, "ic_launcher_background.png"), px)

    # XML дефиниции на адаптивната икона (отиват в res/mipmap-anydpi-v26/)
    xml_dir = os.path.join(base, "adaptive", "mipmap-anydpi-v26")
    os.makedirs(xml_dir, exist_ok=True)
    adaptive_xml = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <background android:drawable="@mipmap/ic_launcher_background"/>\n'
        '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
        '</adaptive-icon>\n'
    )
    with open(os.path.join(xml_dir, "ic_launcher.xml"), "w") as f:
        f.write(adaptive_xml)
    with open(os.path.join(xml_dir, "ic_launcher_round.xml"), "w") as f:
        f.write(adaptive_xml)

    # --- Play Store икона ---
    render(ICON_DARK, os.path.join(base, "play-store-icon-512.png"), 512)
    return densities, adapt_dens


# ===========================================================================
# 3) Web / PWA — favicon, apple-touch, PWA икони, maskable, manifest, HTML
# ===========================================================================
def build_web():
    out = os.path.join(BRAND, "web")
    os.makedirs(out, exist_ok=True)

    # favicon.ico с три вградени размера (браузърите избират подходящия)
    tmp = []
    for px in (16, 32, 48):
        p = os.path.join(out, f"_fav{px}.png")
        render(ICON_TIGHT, p, px)
        tmp.append(p)
    imgs = [Image.open(p).convert("RGBA") for p in tmp]
    imgs[0].save(os.path.join(out, "favicon.ico"),
                 sizes=[(16, 16), (32, 32), (48, 48)],
                 append_images=imgs[1:])
    # самостоятелни PNG favicon-и (модерните браузъри ги предпочитат)
    render(ICON_TIGHT, os.path.join(out, "favicon-16.png"), 16)
    render(ICON_TIGHT, os.path.join(out, "favicon-32.png"), 32)
    render(ICON_TIGHT, os.path.join(out, "favicon-48.png"), 48)
    for p in tmp:
        os.remove(p)

    # векторен favicon (най-острият вариант за модерни браузъри)
    import shutil
    shutil.copy(ICON_TIGHT, os.path.join(out, "favicon.svg"))

    # Apple touch icon (когато добавиш сайта на началния екран на iPhone)
    render(ICON_DARK, os.path.join(out, "apple-touch-icon.png"), 180)

    # PWA икони — стандартни и „maskable" (с безопасна зона)
    render(ICON_DARK, os.path.join(out, "icon-192.png"), 192)
    render(ICON_DARK, os.path.join(out, "icon-512.png"), 512)
    render(ICON_DARK, os.path.join(out, "icon-192-maskable.png"), 192)
    render(ICON_DARK, os.path.join(out, "icon-512-maskable.png"), 512)

    # Примерен web app manifest за PWA инсталация
    manifest = {
        "name": "The Storm Watcher",
        "short_name": "Storm Watcher",
        "description": "Live space weather, aurora forecasts and storm alerts.",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#0a0e27",
        "theme_color": "#0a0e27",
        "icons": [
            {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
            {"src": "/icon-192-maskable.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
            {"src": "/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }
    with open(os.path.join(out, "site.webmanifest"), "w") as f:
        json.dump(manifest, f, indent=2)

    # Готов за поставяне HTML фрагмент за <head>
    head = """<!-- The Storm Watcher — икони и метаданни (постави в <head>) -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="shortcut icon" href="/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0a0e27">

<!-- Open Graph (споделяне във Facebook, LinkedIn и др.) -->
<meta property="og:title" content="The Storm Watcher">
<meta property="og:description" content="Know when the sky is about to come alive.">
<meta property="og:image" content="/og-image.png">
<meta property="og:type" content="website">

<!-- Twitter / X карта -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="The Storm Watcher">
<meta name="twitter:description" content="Live space weather & aurora alerts.">
<meta name="twitter:image" content="/og-image.png">
"""
    with open(os.path.join(out, "head-snippet.html"), "w") as f:
        f.write(head)


if __name__ == "__main__":
    n_ios = build_ios()
    leg, adapt = build_android()
    build_web()
    print(f"iOS: {n_ios} размера + Contents.json")
    print(f"Android legacy: {list(leg.keys())}")
    print(f"Android adaptive: {list(adapt.keys())} + XML")
    print("Web/PWA: favicon, apple-touch, PWA, maskable, manifest, HTML")
