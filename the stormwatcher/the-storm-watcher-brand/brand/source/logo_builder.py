"""
The Storm Watcher — система за брандинг.

Тук дефинирам логото веднъж, във векторен (SVG) вид, и от него
произвеждам всички варианти и размери. Идеята е, че имаме един
"източник на истината": ако променим символа тук, всичко надолу
по веригата се преизгражда автоматично и остава консистентно.

Концепция: "Изгряващо сияние" — слънчев диск, над който се издигат
концентрични aurora ленти, преливащи от оранжево (близо до слънцето,
източника на енергия) към емералд (полярното сияние, резултатът),
на фон от тъмно нощно небе.
"""

import math

# ---------------------------------------------------------------------------
# ПАЛИТРА НА МАРКАТА
# Тези стойности са единственото място, където дефинираме цветовете.
# ---------------------------------------------------------------------------
NAVY_DEEP   = "#0a0e27"   # най-тъмното небе (ръбове на иконата)
NAVY_MID    = "#141a3a"   # средно небе (към центъра)
NAVY_SOFT   = "#1e2548"   # най-светлото небе (вътрешен ореол)

ORANGE      = "#f97316"   # основен брандов оранжев (слънце, акценти)
ORANGE_DEEP = "#ea580c"   # по-тъмен оранжев (ръб на слънцето)
GOLD        = "#fbbf24"   # златно ядро на слънцето

EMERALD     = "#10b981"   # aurora зелено (свързва с KP индекса)
EMERALD_LT  = "#34d399"   # светъл емералд (връх на сиянието)

INK         = "#0a0e27"   # цвят на тъмен текст
PAPER       = "#f8fafc"   # цвят на светъл текст / wordmark на тъмен фон


def _arc_path(cx, cy, r, start_deg, end_deg):
    """
    Връща SVG path стринг за дъга от окръжност.

    Работим в стандартни математически градуси (0° = дясно, нараства
    обратно на часовника), но понеже в SVG оста Y сочи НАДОЛУ, обръщаме
    знака на синуса, за да изглежда дъгата правилно нагоре на екрана.
    """
    sx = cx + r * math.cos(math.radians(start_deg))
    sy = cy - r * math.sin(math.radians(start_deg))
    ex = cx + r * math.cos(math.radians(end_deg))
    ey = cy - r * math.sin(math.radians(end_deg))
    # large-arc-flag = 1 ако дъгата покрива повече от 180°
    large = 1 if abs(end_deg - start_deg) > 180 else 0
    # sweep-flag = 0 рисува "нагоре" в нашата обърната координатна система
    return f"M {sx:.2f} {sy:.2f} A {r:.2f} {r:.2f} 0 {large} 0 {ex:.2f} {ey:.2f}"


def _defs():
    """Дефиниции на градиенти и филтри, споделени от всички варианти."""
    return f"""
  <defs>
    <!-- Нощно небе: по-светло в центъра, тъмнее към ръбовете -->
    <radialGradient id="sky" cx="50%" cy="46%" r="72%">
      <stop offset="0%"  stop-color="{NAVY_SOFT}"/>
      <stop offset="55%" stop-color="{NAVY_MID}"/>
      <stop offset="100%" stop-color="{NAVY_DEEP}"/>
    </radialGradient>

    <!-- Слънчев диск: горещо златно ядро, преливащо към оранжев ръб -->
    <radialGradient id="sun" cx="50%" cy="42%" r="62%">
      <stop offset="0%"   stop-color="{GOLD}"/>
      <stop offset="55%"  stop-color="{ORANGE}"/>
      <stop offset="100%" stop-color="{ORANGE_DEEP}"/>
    </radialGradient>

    <!-- Aurora лента: оранжево в основата -> емералд на върха -->
    <linearGradient id="aurora" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%"   stop-color="{ORANGE}"/>
      <stop offset="45%"  stop-color="{EMERALD}"/>
      <stop offset="100%" stop-color="{EMERALD_LT}"/>
    </linearGradient>

    <!-- Меко сияние около слънцето -->
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="{ORANGE}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="{ORANGE}" stop-opacity="0"/>
    </radialGradient>

    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
  </defs>"""


def _stars():
    """Няколко дискретни звезди — добавят дълбочина без да шумят."""
    pts = [
        (210, 250, 3.0, 0.7), (300, 180, 2.0, 0.5), (820, 240, 3.2, 0.7),
        (760, 360, 2.0, 0.45), (180, 540, 2.4, 0.5), (860, 600, 2.6, 0.55),
        (250, 760, 2.2, 0.5), (790, 800, 3.0, 0.6), (520, 150, 2.2, 0.5),
        (660, 720, 1.8, 0.4),
    ]
    out = []
    for x, y, r, o in pts:
        out.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#cbd5f5" opacity="{o}"/>')
    return "\n    ".join(out)


def symbol_core(scale_stars=True):
    """
    Само графичното ядро на символа (без фон), центрирано в платно 1024x1024.
    Това ядро се преизползва както върху тъмен фон, така и прозрачно.

    Композиция:
      - слънчев диск, разположен леко под центъра (като изгрев);
      - три aurora ленти, които се издигат над него;
      - меко оранжево сияние, което свързва двете.
    """
    # Слънцето е по-високо от центъра на платното; aurora лентите се
    # простират надолу, така че оптическият център на масата излиза в
    # средата на квадрата — важно, за да не изглежда символът наклонен
    # при кръгло/squircle изрязване на иконата.
    cx, cy = 512, 430          # център на слънцето
    sun_r  = 142               # радиус на слънчевия диск

    # Три концентрични дъги под слънцето, нарастващи и изтъняващи.
    # Всяка е малко по-къса от долната, за да създаде форма на ветрило.
    bands = [
        (sun_r + 82,  50, 198, 342),   # (радиус, дебелина, начало°, край°)
        (sun_r + 180, 42, 208, 332),
        (sun_r + 274, 32, 220, 320),
    ]
    band_svg = []
    for i, (r, w, a0, a1) in enumerate(bands):
        # външните ленти са по-прозрачни — сиянието избледнява нагоре
        op = [0.95, 0.7, 0.45][i]
        band_svg.append(
            f'<path d="{_arc_path(cx, cy, r, a0, a1)}" fill="none" '
            f'stroke="url(#aurora)" stroke-width="{w}" '
            f'stroke-linecap="round" opacity="{op}"/>'
        )
    bands_str = "\n    ".join(band_svg)

    halo = (f'<circle cx="{cx}" cy="{cy}" r="{sun_r+70}" '
            f'fill="url(#halo)" filter="url(#soft)"/>')

    sun = (f'<circle cx="{cx}" cy="{cy}" r="{sun_r}" fill="url(#sun)"/>')

    # Тънка светла дъга в горния ляв край на слънцето — намек за обем
    rim = (f'<path d="{_arc_path(cx, cy, sun_r-6, 95, 175)}" fill="none" '
           f'stroke="{GOLD}" stroke-width="6" stroke-linecap="round" '
           f'opacity="0.8"/>')

    return f"""
    {bands_str}
    {halo}
    {sun}
    {rim}"""


def make_icon_svg(background=True, stars=True, pad=0):
    """
    Пълна иконка в платно 1024x1024.
      background=True  -> плътен navy фон (за iOS, maskable, social);
      background=False -> прозрачен фон (за Android adaptive foreground, лого).
      pad              -> допълнително свиване на ядрото навътре (за safe-zone).
    """
    bg = ""
    star_layer = ""
    if background:
        bg = '<rect width="1024" height="1024" fill="url(#sky)"/>'
        if stars:
            star_layer = f'<g>{_stars()}</g>'

    core = symbol_core()

    # При нужда свиваме ядрото към центъра (полезно за maskable safe-zone)
    transform = ""
    if pad:
        s = 1 - pad
        tx = 512 * pad
        ty = 512 * pad
        transform = f' transform="translate({tx:.1f} {ty:.1f}) scale({s:.4f})"'

    return f"""<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
{_defs()}
  {bg}
  {star_layer}
  <g{transform}>{core}
  </g>
</svg>"""


if __name__ == "__main__":
    # При директно стартиране записваме трите ключови SVG-та.
    import os
    here = os.path.dirname(__file__)
    with open(os.path.join(here, "icon_dark.svg"), "w") as f:
        f.write(make_icon_svg(background=True, stars=True))
    with open(os.path.join(here, "icon_transparent.svg"), "w") as f:
        f.write(make_icon_svg(background=False, stars=False))
    with open(os.path.join(here, "icon_maskable.svg"), "w") as f:
        f.write(make_icon_svg(background=True, stars=True, pad=0.16))
    print("SVG източниците са записани.")
