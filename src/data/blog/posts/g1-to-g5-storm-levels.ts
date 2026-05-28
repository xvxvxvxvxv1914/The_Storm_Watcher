import type { BlogPost } from '../types';

const post: BlogPost = {
  slug: 'g1-to-g5-storm-levels',
  title: 'G1 to G5: Understanding Geomagnetic Storm Levels',
  description: 'NOAA\'s G-scale classifies geomagnetic storms from G1 (minor) to G5 (extreme). Here\'s exactly what each level means for aurora, technology, and daily life.',
  date: '2026-03-20',
  readingTime: 5,
  category: 'space-weather',
  coverEmoji: '⚡',
  content: [
    {
      type: 'paragraph',
      text: 'NOAA uses a five-level scale — G1 through G5 — to classify the severity of geomagnetic storms. Each level has specific thresholds, predictable aurora visibility ranges, and real-world impacts on technology. Here\'s everything you need to know.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'G1 — Minor Storm (Kp 5)',
    },
    {
      type: 'paragraph',
      text: 'G1 storms are the most common, occurring roughly 1,700 times per 11-year solar cycle. They cause minor fluctuations in power grids and have a small impact on satellite operations. Aurora is visible from northern Scandinavia, Iceland, and northern Canada.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'G2 — Moderate Storm (Kp 6)',
    },
    {
      type: 'paragraph',
      text: 'G2 storms occur about 600 times per solar cycle. High-latitude power systems may experience voltage alarms, and some HF radio propagation is affected. Aurora extends down to roughly 55°N — visible from Scotland, southern Scandinavia, and the northern Baltic states.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'G3 — Strong Storm (Kp 7)',
    },
    {
      type: 'paragraph',
      text: 'G3 storms happen about 200 times per solar cycle. Voltage corrections may be required in power systems, satellite drag increases, and GPS accuracy degrades. Aurora is visible at 50°N — northern France, Germany, Poland, and the northern United States.',
    },
    {
      type: 'callout',
      variant: 'info',
      text: 'A G3 storm in October 2024 produced aurora visible across central Europe, including reports from Spain and Italy. These events are becoming more frequent as we approach solar maximum.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'G4 — Severe Storm (Kp 8)',
    },
    {
      type: 'paragraph',
      text: 'G4 storms occur only about 100 times per solar cycle. Widespread power grid voltage control issues, possible blackouts in some areas, satellite navigation errors, and surface charging on spacecraft. Aurora is visible down to 45°N — covering most of Europe and the continental United States.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'G5 — Extreme Storm (Kp 9)',
    },
    {
      type: 'paragraph',
      text: 'G5 storms are rare — only about 4 per solar cycle. At this level, power grid systems can experience complete collapse, transformers may be permanently damaged, satellite navigation and HF radio fail across large areas, and aurora can be seen as far south as the tropics.',
    },
    {
      type: 'callout',
      variant: 'warning',
      text: 'The most extreme G5 event on record was the Carrington Event of 1859, which induced currents so powerful that telegraph operators received electric shocks and papers ignited spontaneously. A similar event today would cause trillions in damage.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Aurora Visibility by Storm Level',
    },
    {
      type: 'list',
      items: [
        'G1: Above 65°N (northern Lapland, northern Iceland)',
        'G2: Above 55°N (Scotland, southern Scandinavia)',
        'G3: Above 50°N (northern France, Poland, central Canada)',
        'G4: Above 45°N (most of Europe, northern USA)',
        'G5: Above 40°N (Mediterranean, southern USA, northern China)',
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: 'How to Get Alerted',
    },
    {
      type: 'paragraph',
      text: 'The Storm Watcher monitors the Kp index in real time and sends push notifications the moment a storm begins. You can set your own Kp threshold — get alerted at G1 if you\'re in northern Norway, or only at G3 if you\'re in central Europe.',
    },
  ],
  translations: {
    bg: {
      title: 'G1 до G5: Разбиране на нивата на геомагнитните бури',
      description: 'G-скалата на NOAA класифицира геомагнитните бури от G1 (малка) до G5 (екстремна). Ето какво означава всяко ниво за aurora и технологиите.',
      content: [
        { type: 'paragraph', text: 'NOAA използва петстепенна скала — от G1 до G5 — за класифициране на сериозността на геомагнитните бури. Всяко ниво има специфични прагове, предвидими диапазони на видимост на aurora и реални въздействия върху технологиите. Ето всичко, което трябва да знаете.' },
        { type: 'heading', level: 2, text: 'G1 — Малка буря (Kp 5)' },
        { type: 'paragraph', text: 'Бурите от ниво G1 са най-често срещаните, като се случват приблизително 1700 пъти на 11-годишен слънчев цикъл. Те причиняват леки флуктуации в електрическите мрежи и имат малко въздействие върху сателитните операции. Aurora е видимо от северна Скандинавия, Исландия и северна Канада.' },
        { type: 'heading', level: 2, text: 'G2 — Умерена буря (Kp 6)' },
        { type: 'paragraph', text: 'G2 бурите се случват около 600 пъти на слънчев цикъл. Енергийните системи на високи ширини могат да изпитат аларми за напрежение, а разпространението на HF радиовълните е засегнато. Aurora се разпростира до около 55°N — видимо от Шотландия, южна Скандинавия и северните балтийски държави.' },
        { type: 'heading', level: 2, text: 'G3 — Силна буря (Kp 7)' },
        { type: 'paragraph', text: 'G3 бурите се случват около 200 пъти на слънчев цикъл. Може да се изискват корекции на напрежението в енергийните системи, съпротивлението върху сателитите се увеличава, а точността на GPS се влошава. Aurora се вижда на 50°N — северна Франция, Германия, Полша и северните части на САЩ.' },
        { type: 'callout', variant: 'info', text: 'Силна буря G3 през октомври 2024 г. произведе aurora, видимо в цяла Централна Европа, включително доклади от Испания и Италия. Тези събития стават по-чести с приближаването към слънчевия максимум.' },
        { type: 'heading', level: 2, text: 'G4 — Тежка буря (Kp 8)' },
        { type: 'paragraph', text: 'G4 бурите се случват само около 100 пъти на слънчев цикъл. Наблюдават се широко разпространени проблеми с контрола на напрежението в електрическата мрежа, възможни прекъсвания на тока в някои райони, грешки в сателитната навигация и повърхностно зареждане на космически кораби. Aurora е видимо на юг до 45°N — покривайки по-голямата част от Европа и континенталната част на САЩ.' },
        { type: 'heading', level: 2, text: 'G5 — Екстремна буря (Kp 9)' },
        { type: 'paragraph', text: 'G5 бурите са редки — само около 4 на слънчев цикъл. На това ниво системите на електрическата мрежа могат да претърпят пълен колапс, трансформаторите могат да бъдат трайно повредени, сателитната навигация и HF радиото спират в големи райони, а aurora може да се види на юг чак до тропиците.' },
        { type: 'callout', variant: 'warning', text: 'Най-екстремното G5 събитие в историята е събитието Карингтън от 1859 г., което индуцира толкова мощни токове, че телеграфните оператори получиха токови удари, а документите се запалиха спонтанно. Подобно събитие днес би причинило щети за трилиони.' },
        { type: 'heading', level: 2, text: 'Видимост на aurora по нива на бурята' },
        { type: 'list', items: ['G1: Над 65°N (северна Лапландия, северна Исландия)', 'G2: Над 55°N (Шотландия, южна Скандинавия)', 'G3: Над 50°N (северна Франция, Полша, централна Канада)', 'G4: Над 45°N (по-голямата част от Европа, северната част на САЩ)', 'G5: Над 40°N (Средиземноморието, южните части на САЩ, северна Китай)'] },
        { type: 'heading', level: 2, text: 'Как да получавате сигнали' },
        { type: 'paragraph', text: 'The Storm Watcher следи Kp index в реално време и изпраща push известия в момента, в който започне буря. Можете да зададете свой собствен Kp праг — получете предупреждение при G1, ако сте в северна Норвегия, или само при G3, ако сте в Централна Европа.' },
      ],
    },
  },
};

export default post;
