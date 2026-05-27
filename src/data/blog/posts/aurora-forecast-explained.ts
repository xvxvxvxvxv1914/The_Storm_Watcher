import type { BlogPost } from '../types';

const post: BlogPost = {
  slug: 'aurora-forecast-explained',
  title: 'Aurora Forecast Explained: How to Read Space Weather Data',
  description: 'Aurora forecasts are full of jargon — Kp, Bz, solar wind speed, OVATION. This guide explains each number and how to interpret them together.',
  date: '2025-06-08',
  readingTime: 6,
  category: 'guide',
  coverEmoji: '🔭',
  content: [
    {
      type: 'paragraph',
      text: 'Reading an aurora forecast for the first time can feel like learning a new language. Kp indices, Bz values, solar wind speeds, OVATION probabilities — it\'s a lot. This guide breaks down each piece of data and shows you how to combine them into a simple yes/no answer: will there be aurora tonight?',
    },
    {
      type: 'heading',
      level: 2,
      text: 'The Four Key Numbers',
    },
    {
      type: 'heading',
      level: 3,
      text: '1. Kp Index (0–9)',
    },
    {
      type: 'paragraph',
      text: 'The Kp index is your headline number. It tells you how active Earth\'s magnetic field is globally right now. Kp 0–2 = quiet. Kp 3–4 = active. Kp 5+ = storm. At your latitude, look up the minimum Kp needed for aurora overhead — typically Kp 3 for 65°N, Kp 5 for 55°N, Kp 7 for 45°N.',
    },
    {
      type: 'heading',
      level: 3,
      text: '2. Bz (Magnetic Field Orientation)',
    },
    {
      type: 'paragraph',
      text: 'Bz is arguably more important than Kp in real time. It measures the north-south component of the interplanetary magnetic field. When Bz goes negative (southward), it couples with Earth\'s field and drives geomagnetic activity. The more negative, the stronger the effect.',
    },
    {
      type: 'list',
      items: [
        'Bz > 0 (northward): Magnetic shield intact, aurora suppressed',
        'Bz -5 to -10: Mild coupling, Kp likely to rise',
        'Bz -10 to -20: Strong coupling, expect Kp 5–7',
        'Bz < -20: Extreme coupling, G3–G5 storm territory',
      ],
    },
    {
      type: 'heading',
      level: 3,
      text: '3. Solar Wind Speed (km/s)',
    },
    {
      type: 'paragraph',
      text: 'Solar wind speed amplifies everything. Fast wind (600+ km/s) compresses the magnetosphere harder and increases coupling efficiency. A modest Bz of -8 with 700 km/s wind will drive more activity than Bz -8 with 400 km/s wind. Normal background speed is 350–450 km/s.',
    },
    {
      type: 'heading',
      level: 3,
      text: '4. OVATION Aurora Probability',
    },
    {
      type: 'paragraph',
      text: 'OVATION is NOAA\'s model that converts solar wind data into a probability map of aurora intensity at each latitude. It updates every minute and shows where aurora is most likely in the next 30–90 minutes. A probability above 20% at your location is worth going outside for.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'How to Read Them Together',
    },
    {
      type: 'callout',
      variant: 'tip',
      text: 'Green light checklist: Kp ≥ your threshold AND Bz negative AND wind speed rising AND OVATION probability > 10% at your latitude AND sky clear. All five? Go outside now.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'The 3-Day Forecast vs. Real-Time Data',
    },
    {
      type: 'paragraph',
      text: 'The 3-day forecast is useful for planning — if NOAA predicts a G2 storm in 48 hours, book your trip to dark skies. But the 3-day forecast is based on observed CME activity, not the actual solar wind data. It can be off by 12+ hours. Once you\'re within 1 hour of potential aurora, switch to real-time Kp and Bz data.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'Cloud Cover: The Overlooked Variable',
    },
    {
      type: 'paragraph',
      text: 'A Kp 8 storm behind thick cloud cover is invisible. Always check local cloud cover alongside space weather data. The Storm Watcher combines both: live Kp and solar wind data alongside cloud percentage for your exact location, so you know whether to drive to clearer skies.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'When to Trust the Forecast',
    },
    {
      type: 'list',
      items: [
        '3 days out: Only trust G3+ predictions based on confirmed Earth-directed CMEs',
        '24 hours out: G1–G2 predictions become more reliable as solar wind approaches',
        '1 hour out: Real-time Bz and Kp are your most reliable indicators',
        'Right now: OVATION probability gives the best 30-minute outlook',
      ],
    },
  ],
  translations: {
    bg: {
      title: 'Прогнозата за aurora обяснена: Как да четем данни за космическото време',
      description: 'Прогнозите за сияния са пълни с жаргон — Kp, Bz, скорост на слънчевия вятър, OVATION. Това ръководство обяснява всяко число.',
      content: [
        { type: 'paragraph', text: 'Четенето на прогноза за aurora за първи път може да изглежда като учене на нов език. Kp индекси, Bz стойности, скорост на слънчевия вятър, OVATION вероятности — твърде много е. Това ръководство разбива всяка част от данните и ви показва как да ги комбинирате в прост отговор „да/не": ще има ли сияние тази вечер?' },
        { type: 'heading', level: 2, text: 'Четирите ключови числа' },
        { type: 'heading', level: 3, text: '1. Kp Index (0–9)' },
        { type: 'paragraph', text: 'Kp index е вашето заглавно число. То ви казва колко активно е земното магнитно поле в глобален мащаб в момента. Kp 0–2 = спокойно. Kp 3–4 = активно. Kp 5+ = буря. За вашата географска ширина проверете минималния Kp, необходим за виждане на aurora над главата ви — обикновено Kp 3 за 65°N, Kp 5 за 55°N, Kp 7 за 45°N.' },
        { type: 'heading', level: 3, text: '2. Bz (Ориентация на магнитното поле)' },
        { type: 'paragraph', text: 'Bz е може би по-важно от Kp в реално време. То измерва северно-южната компонента на междупланетното магнитно поле. Когато Bz стане отрицателно (на юг), то се свързва с земното поле и задвижва геомагнитната активност. Колкото по-отрицателно е, толкова по-силен е ефектът.' },
        { type: 'list', items: ['Bz > 0 (на север): Магнитният щит е непокътнат, сиянието е потиснато', 'Bz -5 до -10: Леко свързване, Kp вероятно ще се покачи', 'Bz -10 до -20: Силно свързване, очаквайте Kp 5–7', 'Bz < -20: Екстремно свързване, територия на G3–G5 буря'] },
        { type: 'heading', level: 3, text: '3. Скорост на слънчевия вятър (km/s)' },
        { type: 'paragraph', text: 'Скоростта на слънчевия вятър усилва всичко. Бързият вятър (600+ km/s) притиска магнитосферата по-силно и увеличава ефективността на свързване. Скромно Bz от -8 с вятър от 700 km/s ще задвижи повече активност, отколкото Bz -8 с вятър от 400 km/s. Нормалната фонова скорост е 350–450 km/s.' },
        { type: 'heading', level: 3, text: '4. OVATION Вероятност за aurora' },
        { type: 'paragraph', text: 'OVATION е моделът на NOAA, който превръща данните за слънчевия вятър в карта на вероятностите за интензивност на aurora на всяка географска ширина. Той се обновява всяка минута и показва къде сиянието е най-вероятно в следващите 30–90 минути. Вероятност над 20% за вашата локация означава, че си струва да излезете навън.' },
        { type: 'heading', level: 2, text: 'Как да ги четете заедно' },
        { type: 'callout', variant: 'tip', text: 'Контролен списък за зелена светлина: Kp ≥ вашия праг И Bz е отрицателно И скоростта на вятъра се покачва И OVATION вероятността е > 10% на вашата ширина И небето е ясно. Всичките пет? Излизайте навън веднага.' },
        { type: 'heading', level: 2, text: '3-дневната прогноза срещу данни в реално време' },
        { type: 'paragraph', text: '3-дневната прогноза е полезна за планиране — ако NOAA предвиди G2 буря след 48 часа, резервирайте пътуването си до места с тъмно небе. Но 3-дневната прогноза се базира на наблюдаваната CME активност, а не на действителните данни за слънчевия вятър. Тя може да сгреши с 12+ часа. След като сте в рамките на 1 час от потенциално сияние, превключете на Kp и Bz данни в реално време.' },
        { type: 'heading', level: 2, text: 'Облачност: Пренебрегваната променлива' },
        { type: 'paragraph', text: 'Буря от ниво Kp 8 зад гъста облачност е невидима. Винаги проверявайте локалната облачност заедно с данните за космическото време. The Storm Watcher комбинира и двете: Kp на живо и данни за слънчевия вятър паралелно с процента облачност за вашата точна локация, за да знаете дали да карате до места с по-ясно небе.' },
        { type: 'heading', level: 2, text: 'Кога да вярвате на прогнозата' },
        { type: 'list', items: ['3 дни предварително: Вярвайте само на прогнози за G3+, базирани на потвърдени CME, насочени към Земята', '24 часа предварително: Прогнозите за G1–G2 стават по-надеждни с приближаването на слънчевия вятър', '1 час предварително: Bz и Kp в реално време са вашите най-надеждни индикатори', 'В момента: Вероятността от OVATION дава най-добрата 30-минутна перспектива'] },
      ],
    },
  },
};

export default post;
