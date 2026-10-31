# Преводи на блога: статус при предаването (2026-10-31)

Спрях по искане на собственика, защото Cloud кредитът свършва. **Записани са 0 от 28
превода.** Направено е само проучването. Резултатът е долу, за да не се плаща
втори път.

## Остават всички 28

| Статия | Секции | Езици |
|---|---|---|
| `how-to-see-northern-lights` | 18 | da, es, fi, fr, is, ja, ko, no, pl, ru, sv, uk, zh |
| `best-places-aurora-europe` | 17 | da, de, es, fi, fr, is, ja, ko, no, pl, ru, sv, uk, zh |
| `what-is-solar-wind` | 14 | de |

## Как, след `4af5618`

- `4af5618` махна записите само със заглавие. Значи всеки превод е **нов** запис в
  `translations` и езикът трябва да се върне в `scripts/blog-translations.json`.
  След това се пуска `node scripts/generate-blog-metadata.mjs`. Новият тест
  „has a body for every translation“ пази от празен `content`.
- Структурата трябва да съвпада 1:1 с английския: ред, `type`, `level`, `variant` и
  брой елементи в списъка. Проверих със скрипт, че всички съществуващи преводи я
  спазват. Ако добавите тест за това, той ще мине.
- Старите заглавия и описания са в `3ca6bca`, например
  `git show 3ca6bca:src/data/blog/posts/best-places-aurora-europe.ts`. Заглавията
  на `how-to-see` стават. Описанията на `how-to-see` и всичко на `best-places`
  оставят „aurora (borealis)“ на английски, затова трябва да се пренапишат. В
  описанията липсва и последната фраза на английския текст: „Stop missing the
  lights“ или „with practical tips for each“.

## Термини (от `src/locales/*`) и обръщение

| | Сияние | Геомагнитна буря | Авроралният овал | Обръщение |
|---|---|---|---|---|
| da | nordlys(et) | geomagnetisk storm | nordlysovalen | du |
| de | Polarlicht(er), Nordlicht | geomagnetischer Sturm | Polarlichtoval | Sie, като другите de статии |
| es | aurora (boreal) | tormenta geomagnética | óvalo auroral | tú |
| fi | revontulet | geomagneettinen myrsky | revontuliovaali | sinä |
| fr | aurore(s) boréale(s) | tempête géomagnétique | ovale auroral | vous |
| is | norðurljós | jarðsegulstormur | norðurljósabeltið | þú |
| ja | オーロラ | 磁気嵐 (приложението: 地磁気嵐) | オーロラオーバル | です・ます |
| ko | 오로라 | 지자기 폭풍 | 오로라 타원 | 합니다체 |
| no | nordlys(et) | geomagnetisk storm | nordlysovalen | du |
| pl | zorza polarna | burza geomagnetyczna | owal zorzowy | ty, „Twój“ с главна буква |
| ru | северное/полярное сияние | геомагнитная буря | авроральный овал | вы |
| sv | norrsken(et) | geomagnetisk storm | norrskensovalen | du |
| uk | полярне/північне сяйво | геомагнітна буря | авроральний овал | ви |
| zh | 极光 / 北极光 | 地磁暴 | 极光椭圆带 | 您 |

„Kp“ остава навсякъде. Местните имена, които лесно се изпускат:

- fi: Huippuvuoret (= Svalbard), Tromssa, Torniojärvi (= Torneträsk), Joulupukin
  Pajakylä
- ru: Шпицберген; uk: Шпіцберген
- is: Svalbarði, Hjaltland (= Shetland), Lófót
- es: Reikiavik

Таблото в приложението се казва различно на всеки език. Вземи името от
`nav.dashboard` в съответния локал.

## Съмнителни места в английския оригинал (решете преди превода)

1. **best-places, Svalbard:** „aurora is possible year-round“ е невярно. През
   лятото е полярен ден, а сияние се вижда само на тъмно. Вероятно се има предвид
   „денонощно“ по време на полярната нощ. Българският превод вече казва „през целия
   ден“, тоест се разминава с английския.
2. **best-places, Abisko:** „accessible by gondola lift“. До Aurora Sky Station се
   стига със седалков лифт, не с кабинков. Безопасно е да се преведе с общо „лифт“.
3. **how-to-see, т. 7:** „solar maximum … is expected around 2025“. Към днешна дата
   това вече е минало.
4. **best-places, „Honourable Mentions“:** „frequent storms“ е двусмислено:
   метеорологични или геомагнитни бури. На ja, ko и zh трябва да се избере
   (嵐 / 폭풍 / 风暴 оставят двусмислието). „Northern Estonia and Latvia“ също е
   двусмислено.
5. По-дребно: Саариселкя е описана с „flat, open terrain“, а мястото е тундра с
   хълмове (tunturi). Финландски читател ще го забележи.

## Извън задачата, но същият проблем

Съществуващите bg и de преводи и всички преводи на `what-is-kp-index` оставят
„aurora“ и „Kp index“ на латиница: „носейки aurora до Шотландия“,
„aurora-Sichtbarkeit“, „Kp index란“.
