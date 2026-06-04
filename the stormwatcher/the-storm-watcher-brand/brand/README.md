# The Storm Watcher — Брандинг пакет

Пълен набор от лого, икони и насоки за марката. Всичко е генерирано от един векторен източник, така че остава консистентно на всеки размер и платформа.

Започни с **`BRAND-GUIDELINES.md`** (правилата за марката) и **`preview-icons.png`** (как изглежда иконата).

---

## Структура

```
brand/
├── BRAND-GUIDELINES.md      ← правила: цветове, шрифт, употреба
├── README.md                ← този файл
├── preview-icons.png        ← преглед на иконата в системните маски
├── palette.png              ← цветовата палитра нагледно
│
├── logo/                    ← логото за общо ползване
│   ├── *.svg                  векторни (за уеб, безкрайно мащабиране)
│   └── *@2x.png               растерни (за документи, имейли, презентации)
│
├── ios/
│   └── AppIcon.appiconset/  ← пуска се директно в Xcode (13 размера + Contents.json)
│
├── android/
│   ├── legacy/mipmap-*/       стари квадратни икони (5 плътности)
│   ├── adaptive/mipmap-*/     адаптивна икона: foreground + background
│   ├── adaptive/mipmap-anydpi-v26/  XML дефиниции
│   └── play-store-icon-512.png
│
├── web/                     ← всичко за сайта и PWA
│   ├── favicon.ico / .svg / favicon-16,32,48.png
│   ├── apple-touch-icon.png
│   ├── icon-192,512.png + maskable варианти
│   ├── og-image.png           (споделяне в социални мрежи)
│   ├── site.webmanifest       (PWA манифест — готов)
│   └── head-snippet.html      (готов код за <head>)
│
├── social/
│   └── og-image.png + .svg    (1200×630, за Facebook, X, LinkedIn)
│
└── source/                  ← източниците (за бъдещи промени)
    ├── *.svg                  векторните оригинали на символа
    ├── *.py                   скриптовете, които генерират всичко
    └── fonts/                 шрифтът Poppins
```

---

## Бързо вграждане

### Уеб (сайтът)

1. Копирай съдържанието на `web/` в публичната (root) папка на сайта.
2. Отвори `web/head-snippet.html` и постави съдържанието му в `<head>`.
3. Готово — favicon, apple-touch икона, PWA манифест и OG картинка работят.

Ако сайтът е на Vite/React (както The Storm Watcher), файловете отиват в `public/`, а фрагментът — в `index.html`.

### iOS

1. В Xcode отвори `Assets.xcassets`.
2. Изтрий съществуващия `AppIcon` и плъзни папката `ios/AppIcon.appiconset/` на нейно място.

### Android

1. Копирай папките `android/legacy/mipmap-*` и `android/adaptive/mipmap-*` в `app/src/main/res/`.
2. Копирай `android/adaptive/mipmap-anydpi-v26/` също в `res/`.
3. В `AndroidManifest.xml` иконата вече се реферира като `@mipmap/ic_launcher`.

---

## Как да промениш нещо по-късно

Цялата система идва от `source/`. Ако някога поискаш да коригираш цвят, форма или отстояние:

1. Цветовете са на едно място — в началото на `source/logo_builder.py`.
2. Формата на символа е във функцията `symbol_core()` в същия файл.
3. След промяна стартирай отново трите скрипта:

```bash
cd source
python3 logo_builder.py      # обновява SVG източниците
python3 logo_variants.py     # обновява логата
python3 generate_all.py      # обновява всички икони
```

Всичко надолу по веригата се преизгражда автоматично и остава синхронизирано. Това е смисълът на „един източник на истината": променяш на едно място, не на сто.

---

## Цветове накратко

- Night Sky `#0a0e27` · фон
- Storm Orange `#f97316` · основен акцент
- Aurora Emerald `#10b981` · сигнали и данни

Шрифт: **Poppins** (за латиница). За кирилица използвай **Manrope** или **Inter**.
