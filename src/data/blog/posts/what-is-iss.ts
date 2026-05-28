import type { BlogPost } from '../types';

const post: BlogPost = {
  slug: 'what-is-iss-how-to-track',
  title: 'What is the ISS and How to Track It',
  description: 'The International Space Station is the brightest object in the night sky after the Moon. Learn what it is, how to spot it, and how to track it in real time.',
  date: '2026-05-06',
  readingTime: 5,
  category: 'guide',
  coverEmoji: '🛰️',
  content: [
    {
      type: 'paragraph',
      text: 'On any clear night, if you know where to look and when, you can spot a bright star-like object moving steadily across the sky. No flashing lights, no sound — just a steady, bright dot travelling from horizon to horizon in about 6 minutes. That\'s the International Space Station, and it\'s the largest structure humanity has ever built in space.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'What is the ISS?',
    },
    {
      type: 'paragraph',
      text: 'The International Space Station is a modular space laboratory orbiting Earth at approximately 400 km altitude. It has been continuously inhabited since November 2000, making it the longest continuous human presence in space. The station is roughly the size of a football pitch, masses 420 tonnes, and travels at 28,000 km/h — completing an orbit of Earth every 90 minutes.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Who Lives on the ISS?',
    },
    {
      type: 'paragraph',
      text: 'The ISS typically hosts 6–7 crew members from partner agencies including NASA (USA), Roscosmos (Russia), ESA (Europe), JAXA (Japan), and CSA (Canada). Crew rotations happen roughly every 6 months, with astronauts arriving via SpaceX Crew Dragon or Russian Soyuz spacecraft.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Why is the ISS So Bright?',
    },
    {
      type: 'paragraph',
      text: 'The ISS is visible to the naked eye because of its enormous solar panels — 8 arrays spanning 73 metres from tip to tip. These panels reflect sunlight like a giant mirror. At its brightest, the ISS reaches magnitude -5.9, outshining Venus and second only to the Moon in the night sky.',
    },
    {
      type: 'callout',
      variant: 'info',
      text: 'The ISS is only visible when it\'s in sunlight while your location is in darkness — typically within 1–2 hours of sunset or sunrise. In the middle of the night, it passes through Earth\'s shadow and becomes invisible.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'How to Spot the ISS',
    },
    {
      type: 'list',
      items: [
        'Find the next visible pass for your location using The Storm Watcher\'s ISS tracker',
        'Go outside 5 minutes before the predicted time',
        'Face the direction shown (usually west or southwest for evening passes)',
        'Look for a bright, steady light moving faster than any aircraft',
        'It will travel all the way across the sky in 3–6 minutes',
        'No binoculars needed — naked eye is fine',
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: 'ISS and Aurora: A Perfect Combination',
    },
    {
      type: 'paragraph',
      text: 'One of the most spectacular sights in space photography is astronauts photographing aurora from above — looking down at the same light display aurora hunters see from the ground. During geomagnetic storms, ISS crew members have an unparalleled view of the aurora oval encircling both poles.',
    },
    {
      type: 'paragraph',
      text: 'If you\'re already outside watching aurora, check if the ISS is making a pass. The two phenomena together — a geomagnetic storm painting the sky green while the ISS slides silently overhead — is an unforgettable experience.',
    },
    {
      type: 'callout',
      variant: 'tip',
      text: 'The Storm Watcher\'s ISS page shows real-time position and upcoming visible passes for your location, alongside current aurora probability. Plan the perfect night outside.',
    },
  ],
  translations: {
    bg: {
      title: 'Какво е ISS и как да я проследим',
      description: 'Международната космическа станция е най-яркият обект в нощното небе след Луната. Научете как да я забележите и проследите в реално време.',
      content: [
        { type: 'paragraph', text: 'Във всяка ясна нощ, ако знаете къде и кога да гледате, можете да забележите ярък обект, подобен на звезда, който се движи стабилно в небето. Без мигащи светлини, без звук — просто стабилна, ярка точка, пътуваща от хоризонт до хоризонт за около 6 минути. Това е Международната космическа станция (ISS) и тя е най-голямата структура, която човечеството някога е изграждало в космоса.' },
        { type: 'heading', level: 2, text: 'Какво е ISS?' },
        { type: 'paragraph', text: 'Международната космическа станция е модулна космическа лаборатория, обикаляща около Земята на приблизително 400 km надморска височина. Тя е непрекъснато обитавана от ноември 2000 г., което я прави най-дългото непрекъснато човешко присъствие в космоса. Станцията е с приблизителните размери на футболно игрище, има маса 420 тона и се движи с 28 000 km/h — завършвайки една обиколка около Земята на всеки 90 минути.' },
        { type: 'heading', level: 2, text: 'Кой живее на ISS?' },
        { type: 'paragraph', text: 'ISS обикновено приема екипаж от 6–7 членове от партньорски агенции, включително NASA (САЩ), Роскосмос (Русия), ESA (Европа), JAXA (Япония) и CSA (Канада). Ротациите на екипажа се случват приблизително на всеки 6 месеца, като астронавтите пристигат чрез космически кораби SpaceX Crew Dragon или руски Союз.' },
        { type: 'heading', level: 2, text: 'Защо ISS е толкова ярка?' },
        { type: 'paragraph', text: 'ISS е видима с просто око поради огромните си слънчеви панели — 8 масива, разпростиращи се на 73 метра от край до край. Тези панели отразяват слънчевата светлина като гигантско огледало. В най-ярката си точка ISS достига магнитуд -5.9, засенчвайки Венера и отстъпвайки само на Луната в нощното небе.' },
        { type: 'callout', variant: 'info', text: 'ISS е видима само когато е осветена от Слънцето, докато вашата локация е в тъмнина — обикновено в рамките на 1–2 часа след залез или преди изгрев. В средата на нощта тя преминава през сянката на Земята и става невидима.' },
        { type: 'heading', level: 2, text: 'Как да забележите ISS' },
        { type: 'list', items: ['Намерете следващото видимо преминаване за вашата локация, като използвате ISS тракера на The Storm Watcher', 'Излезте навън 5 минути преди прогнозираното време', 'Обърнете се по посоката, показана на екрана (обикновено запад или югозапад за вечерни преминавания)', 'Потърсете ярка, стабилна светлина, движеща се по-бързо от всеки самолет', 'Тя ще пропътува целия път през небето за 3–6 минути', 'Не са необходими бинокли — просто oko е напълно достатъчно'] },
        { type: 'heading', level: 2, text: 'ISS и Aurora: Перфектна комбинация' },
        { type: 'paragraph', text: 'Една от най-зрелищните гледки в космическата фотография са астронавтите, снимащи aurora отгоре — гледайки надолу към същото светлинно шоу, което ловците на сияния виждат от земята. По време на геомагнитни бури екипажът на ISS има несравнима гледка към овала на сиянието, обграждащ двата полюса.' },
        { type: 'paragraph', text: 'Ако вече сте навън и наблюдавате aurora, проверете дали ISS не преминава в същия момент. Двата феномена заедно — геомагнитна буря, боядисваща небето в зелено, докато ISS се плъзга безшумно над главата ви — е незабравимо изживяване.' },
        { type: 'callout', variant: 'tip', text: 'Страницата за ISS на The Storm Watcher показва позицията в реално време и предстоящите видими преминавания за вашата локация, успоредно с текущата вероятност за aurora. Планирайте перфектната нощ навън.' },
      ],
    },
  },
};

export default post;
