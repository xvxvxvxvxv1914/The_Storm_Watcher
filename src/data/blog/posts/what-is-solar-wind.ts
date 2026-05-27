import type { BlogPost } from '../types';

const post: BlogPost = {
  slug: 'what-is-solar-wind',
  title: 'What is Solar Wind and Why Does It Matter?',
  description: 'Solar wind is a constant stream of particles from the Sun that drives space weather on Earth. Learn how it works and what the numbers mean.',
  date: '2025-06-04',
  readingTime: 5,
  category: 'solar',
  coverEmoji: '💨',
  content: [
    {
      type: 'paragraph',
      text: 'The Sun isn\'t just a ball of light — it\'s constantly exhaling. A continuous stream of charged particles flows outward from the Sun in all directions at speeds of 400–800 km/s. This is the solar wind, and it shapes the space environment of every planet in our solar system, including Earth.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'What Is Solar Wind Made Of?',
    },
    {
      type: 'paragraph',
      text: 'Solar wind is a plasma — a mix of electrons, protons, and alpha particles (helium nuclei) that have escaped the Sun\'s corona. The corona is the Sun\'s outermost atmospheric layer, and it\'s so hot (over 1 million °C) that particles achieve escape velocity and stream outward into space.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Key Solar Wind Parameters',
    },
    {
      type: 'list',
      items: [
        'Speed (km/s): Typical values range from 300–800 km/s. Faster wind compresses Earth\'s magnetosphere more strongly.',
        'Density (particles/cm³): Higher density means more particles hitting Earth\'s field. Normal is 5–10 p/cm³.',
        'Bz (magnetic field component): The most critical parameter. When Bz points south (negative), energy couples into Earth\'s magnetosphere and storms develop.',
        'Bt (total magnetic field): Overall magnetic field strength of the solar wind.',
      ],
    },
    {
      type: 'callout',
      variant: 'warning',
      text: 'Watch for negative Bz values! A strongly negative Bz (below -10 nT) sustained for hours is the clearest sign a geomagnetic storm is underway or imminent. This single parameter is more predictive of aurora than any other.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'How Does Solar Wind Affect Earth?',
    },
    {
      type: 'paragraph',
      text: 'Earth\'s magnetic field acts as a shield against the solar wind, deflecting most of the stream around the planet. The region where this interaction occurs is called the magnetosphere. During quiet periods, this shield holds firm. But when an unusually fast or dense pulse of solar wind arrives — especially carrying a southward magnetic field — the shield bends and partially breaks down.',
    },
    {
      type: 'paragraph',
      text: 'This allows charged particles to funnel down along magnetic field lines near the poles, where they collide with atmospheric gases. Those collisions release energy as light — the aurora.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'How Is Solar Wind Measured?',
    },
    {
      type: 'paragraph',
      text: 'NASA\'s DSCOVR satellite sits at the L1 Lagrange point — a gravitational balance point about 1.5 million km between Earth and Sun. From there, it measures solar wind in real time, giving 15–60 minutes of warning before conditions hit Earth.',
    },
    {
      type: 'callout',
      variant: 'tip',
      text: 'The Storm Watcher displays live solar wind speed, density, and Bz on the Dashboard. When speed exceeds 600 km/s and Bz dips below -10, that\'s your cue to look outside.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Solar Wind vs. Coronal Mass Ejection',
    },
    {
      type: 'paragraph',
      text: 'The steady solar wind is different from a coronal mass ejection (CME). The solar wind is constant background radiation. A CME is a sudden, massive eruption — a billion-tonne cloud of magnetized plasma ejected at 1,000–3,000 km/s. CMEs are what cause the most powerful geomagnetic storms.',
    },
  ],
  translations: {
    bg: {
      title: 'Какво е слънчев вятър и защо е важен?',
      description: 'Слънчевият вятър е постоянен поток от частици от Слънцето, който задвижва космическото време на Земята. Научете как работи.',
      content: [
        { type: 'paragraph', text: 'Слънцето не е просто топка светлина — то постоянно издишва. Непрекъснат поток от заредени частици изтича навън от Слънцето във всички посоки със скорости от 400–800 km/s. Това е слънчевият вятър и той оформя космическата среда на всяка планета в нашата слънчева система, включително Земята.' },
        { type: 'heading', level: 2, text: 'От какво е направен слънчевият вятър?' },
        { type: 'paragraph', text: 'Слънчевият вятър е плазма — смес от електрони, протони и алфа-частици (хелиеви ядра), които са избягали от короната на Слънцето. Короната е най-външният атмосферен слой на Слънцето и е толкова гореща (над 1 милион °C), че частиците достигат втора космическа скорост и изтичат навън в космоса.' },
        { type: 'heading', level: 2, text: 'Ключови параметри на слънчевия вятър' },
        { type: 'list', items: ['Скорост (km/s): Типичните стойности варират от 300–800 km/s. По-бързият вятър притиска земната магнитосфера по-силно.', 'Плътност (частици/cm³): По-високата плътност означава повече частици, удрящи полето на Земята. Нормалното е 5–10 p/cm³.', 'Bz (компонента на магнитното поле): Най-критичният параметър. Когато Bz сочи на юг (отрицателно), енергията се свързва с земната магнитосфера и се развиват бури.', 'Bt (общо магнитно поле): Общата сила на магнитното поле на слънчевия вятър.'] },
        { type: 'callout', variant: 'warning', text: 'Следете за отрицателни Bz стойности! Силно отрицателно Bz (под -10 nT), поддържано с часове, е най-ясният знак, че геомагнитна буря е в ход или предстои. Този единичен параметър е по-прогнозен за aurora от всеки друг.' },
        { type: 'heading', level: 2, text: 'Как слънчевият вятър влияе на Земята?' },
        { type: 'paragraph', text: 'Магнитното поле на Земята действа като щит срещу слънчевия вятър, отклонявайки по-голямата част от потока около планетата. Регионът, където се случва това взаимодействие, се нарича магнитосфера. По време на спокойни периоди този щит държи здраво. Но когато пристигне необичайно бърз или плътен импулс на слънчевия вятър — особено носещ южно магнитно поле — щитът се огъва и частично се пробива.' },
        { type: 'paragraph', text: 'Това позволява на заредените частици да се фуниеобразно насочват по линиите на магнитното поле близо до полюсите, където се сблъскват с атмосферните газове. Тези сблъсъци освобождават енергия под формата на светлина — aurora.' },
        { type: 'heading', level: 2, text: 'Как се измерва слънчевият вятър?' },
        { type: 'paragraph', text: 'Сателитът DSCOVR на НАСА се намира в точката на Лагранж L1 — точка на гравитационен баланс на около 1,5 милиона километра между Земята и Слънцето. Оттам той измерва слънчевия вятър в реално време, давайки 15–60 минути предизвестие, преди условията да ударят Земята.' },
        { type: 'callout', variant: 'tip', text: 'The Storm Watcher показва скоростта, плътността и Bz на слънчевия вятър на живо на таблото. Когато скоростта надвиши 600 km/s и Bz падне под -10, това е вашият знак да погледнете навън.' },
        { type: 'heading', level: 2, text: 'Слънчев вятър срещу изхвърляне на коронална маса' },
        { type: 'paragraph', text: 'Постоянният слънчев вятър е различен от изхвърлянето на коронална маса (CME). Слънчевият вятър е постоянен фонов радиационен поток. CME е внезапно, масивно изригване — облак от магнетизирана плазма с тегло милиард тона, изхвърлен с 1000–3000 km/s. Именно CME причиняват най-мощните геомагнитни бури.' },
      ],
    },
    de: { title: 'Was ist Sonnenwind und warum ist er wichtig?', description: 'Sonnenwind ist ein ständiger Strom von Teilchen von der Sonne, der das Weltraumwetter auf der Erde antreibt. Erfahren Sie, wie er funktioniert.', content: [] },
  },
};

export default post;
