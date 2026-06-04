"""
Генериране на ЛОГОТО на The Storm Watcher в неговите варианти.

Логото има две части: символът ("марката") и надписът ("логотип").
Тук ги комбинирам в стандартните оформления, които всяка марка ползва:

  1. Хоризонтално   — символ вляво, надпис вдясно (за хедъри, ленти)
  2. Вертикално      — символ горе, надпис под него (за квадратни места)
  3. Само символ     — иконата самостоятелно (за аватари, favicon)

За всяко оформление правя версия за тъмен и за светъл фон.

Надписът се изгражда като ИСТИНСКИ текст с шрифт Poppins. За да го
подравня точно до символа, измервам ширината му с реалния шрифтов файл
(през PIL), вместо да гадая — така нищо не „танцува" между версиите.
"""

import os
from PIL import ImageFont
from logo_builder import (
    symbol_core, _defs, NAVY_DEEP, ORANGE, EMERALD, PAPER, INK, GOLD
)

HERE = os.path.dirname(__file__)
FONT_BOLD = os.path.join(HERE, "fonts", "Poppins-Bold.ttf")
FONT_MED  = os.path.join(HERE, "fonts", "Poppins-Medium.ttf")


def _text_width(text, font_path, size):
    """Измерва пикселната ширина на текст с конкретния шрифт и размер."""
    font = ImageFont.truetype(font_path, size)
    bbox = font.getbbox(text)
    return bbox[2] - bbox[0]


def _symbol_group(x, y, size):
    """
    Връща символа, мащабиран до `size` пиксела и позициониран в (x, y).
    Символът е дефиниран в платно 1024x1024, затова го свиваме.
    """
    scale = size / 1024
    return (f'<g transform="translate({x:.2f} {y:.2f}) scale({scale:.5f})">'
            f'{symbol_core()}</g>')


def horizontal_logo(dark=True, accent_storm=True):
    """
    Хоризонтално лого: символ вляво, надпис „The Storm Watcher" вдясно.
    Надписът е центриран вертикално спрямо символа.
    """
    sym = 132                      # размер на символа
    gap = 34                       # отстояние символ ↔ текст
    fs  = 78                       # размер на шрифта
    text = "The Storm Watcher"

    text_color = PAPER if dark else INK
    bg_color   = NAVY_DEEP if dark else PAPER

    tw = _text_width(text, FONT_BOLD, fs)
    pad_x = 44
    pad_y = 40
    total_w = pad_x + sym + gap + tw + pad_x
    total_h = pad_y + sym + pad_y

    sym_x = pad_x
    sym_y = pad_y
    text_x = pad_x + sym + gap
    # базовата линия на текста спрямо центъра на символа
    text_baseline = pad_y + sym * 0.5 + fs * 0.34

    # Опционално оцветяваме „Storm" в оранжево за брандов акцент.
    if accent_storm:
        w_the   = _text_width("The ",   FONT_BOLD, fs)
        w_storm = _text_width("Storm ", FONT_BOLD, fs)
        text_svg = (
            f'<text x="{text_x:.1f}" y="{text_baseline:.1f}" '
            f'font-family="Poppins" font-weight="700" font-size="{fs}" '
            f'fill="{text_color}">The </text>'
            f'<text x="{text_x + w_the:.1f}" y="{text_baseline:.1f}" '
            f'font-family="Poppins" font-weight="700" font-size="{fs}" '
            f'fill="{ORANGE}">Storm </text>'
            f'<text x="{text_x + w_the + w_storm:.1f}" y="{text_baseline:.1f}" '
            f'font-family="Poppins" font-weight="700" font-size="{fs}" '
            f'fill="{text_color}">Watcher</text>'
        )
    else:
        text_svg = (f'<text x="{text_x:.1f}" y="{text_baseline:.1f}" '
                    f'font-family="Poppins" font-weight="700" font-size="{fs}" '
                    f'fill="{text_color}">{text}</text>')

    bg = f'<rect width="{total_w:.0f}" height="{total_h:.0f}" fill="{bg_color}"/>' if dark or not dark else ""
    # за прозрачна версия извикваме отделно (виж по-долу)
    return f"""<svg viewBox="0 0 {total_w:.0f} {total_h:.0f}" xmlns="http://www.w3.org/2000/svg">
{_defs()}
  {bg}
  {_symbol_group(sym_x, sym_y, sym)}
  {text_svg}
</svg>"""


def horizontal_logo_transparent(accent_storm=True, light_text=True):
    """Хоризонтално лого без фон — за поставяне върху произволен фон."""
    full = horizontal_logo(dark=light_text, accent_storm=accent_storm)
    # премахваме фоновия правоъгълник (първия <rect ... fill=NAVY/PAPER)
    import re
    full = re.sub(r'<rect width="[^"]*" height="[^"]*" fill="#[0-9a-fA-F]*"/>',
                  '', full, count=1)
    return full


def stacked_logo(dark=True, tagline=False):
    """Вертикално лого: символ горе, надпис отдолу, центрирани."""
    sym = 200
    fs  = 60
    text = "The Storm Watcher"
    tagline_text = "Know when the sky comes alive"
    fs_tag = 24

    text_color = PAPER if dark else INK
    bg_color   = NAVY_DEEP if dark else PAPER

    tw = _text_width(text, FONT_BOLD, fs)
    tw_tag = _text_width(tagline_text, FONT_MED, fs_tag) if tagline else 0

    pad = 56
    content_w = max(sym, tw, tw_tag)
    total_w = content_w + pad * 2
    gap_sym_text = 28
    gap_text_tag = 16
    total_h = pad + sym + gap_sym_text + fs + (gap_text_tag + fs_tag if tagline else 0) + pad

    cx = total_w / 2
    sym_x = cx - sym / 2
    sym_y = pad
    text_baseline = pad + sym + gap_sym_text + fs * 0.78

    w_the   = _text_width("The ",   FONT_BOLD, fs)
    w_storm = _text_width("Storm ", FONT_BOLD, fs)
    text_start = cx - tw / 2
    text_svg = (
        f'<text x="{text_start:.1f}" y="{text_baseline:.1f}" '
        f'font-family="Poppins" font-weight="700" font-size="{fs}" '
        f'fill="{text_color}">The </text>'
        f'<text x="{text_start + w_the:.1f}" y="{text_baseline:.1f}" '
        f'font-family="Poppins" font-weight="700" font-size="{fs}" '
        f'fill="{ORANGE}">Storm </text>'
        f'<text x="{text_start + w_the + w_storm:.1f}" y="{text_baseline:.1f}" '
        f'font-family="Poppins" font-weight="700" font-size="{fs}" '
        f'fill="{text_color}">Watcher</text>'
    )

    tag_svg = ""
    if tagline:
        tag_baseline = text_baseline + gap_text_tag + fs_tag
        tag_start = cx - tw_tag / 2
        tag_svg = (f'<text x="{tag_start:.1f}" y="{tag_baseline:.1f}" '
                   f'font-family="Poppins" font-weight="500" font-size="{fs_tag}" '
                   f'fill="{EMERALD}" letter-spacing="1.5">{tagline_text}</text>')

    bg = f'<rect width="{total_w:.0f}" height="{total_h:.0f}" fill="{bg_color}"/>'
    return f"""<svg viewBox="0 0 {total_w:.0f} {total_h:.0f}" xmlns="http://www.w3.org/2000/svg">
{_defs()}
  {bg}
  {_symbol_group(sym_x, sym_y, sym)}
  {text_svg}
  {tag_svg}
</svg>"""


if __name__ == "__main__":
    out = HERE
    variants = {
        "logo_horizontal_dark.svg":  horizontal_logo(dark=True),
        "logo_horizontal_light.svg": horizontal_logo(dark=False),
        "logo_horizontal_on_transparent_light.svg": horizontal_logo_transparent(light_text=True),
        "logo_horizontal_on_transparent_dark.svg":  horizontal_logo_transparent(light_text=False),
        "logo_stacked_dark.svg":     stacked_logo(dark=True),
        "logo_stacked_light.svg":    stacked_logo(dark=False),
        "logo_stacked_tagline_dark.svg": stacked_logo(dark=True, tagline=True),
    }
    for name, svg in variants.items():
        with open(os.path.join(out, name), "w") as f:
            f.write(svg)
    print("Логата са записани:", ", ".join(variants.keys()))
