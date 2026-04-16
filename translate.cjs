const fs = require('fs');

const data = fs.readFileSync('src/contexts/LanguageContext.tsx', 'utf-8');

const navTranslations = {
  en: { 'nav.uv': 'UV', 'nav.sun': 'Sun', 'nav.sky': 'Sky Tonight', 'nav.iss': 'ISS Tracker' },
  bg: { 'nav.uv': 'УВ Индекс', 'nav.sun': 'Слънце', 'nav.sky': 'Небето Тази Нощ', 'nav.iss': 'ISS Тракер' },
  es: { 'nav.uv': 'Índice UV', 'nav.sun': 'Sol', 'nav.sky': 'Cielo Esta Noche', 'nav.iss': 'Rastreador ISS' },
  fr: { 'nav.uv': 'Indice UV', 'nav.sun': 'Soleil', 'nav.sky': 'Ciel Ce Soir', 'nav.iss': 'Tracker ISS' },
  de: { 'nav.uv': 'UV-Index', 'nav.sun': 'Sonne', 'nav.sky': 'Himmel Heute Nacht', 'nav.iss': 'ISS Tracker' },
  ru: { 'nav.uv': 'УФ-индекс', 'nav.sun': 'Солнце', 'nav.sky': 'Небо Сегодня Ночью', 'nav.iss': 'Трекер МКС' },
  zh: { 'nav.uv': '紫外线指数', 'nav.sun': '太阳', 'nav.sky': '今晚天空', 'nav.iss': '国际空间站追踪' },
  ja: { 'nav.uv': 'UV指数', 'nav.sun': '太陽', 'nav.sky': '今夜の空', 'nav.iss': 'ISSトラッカー' }
};

let updatedData = data;

for (const [lang, trans] of Object.entries(navTranslations)) {
  const marker = `${lang}: {`;
  const insertStr = Object.entries(trans)
    .map(([k, v]) => `\n    '${k}': '${v}',`)
    .join('');
  
  updatedData = updatedData.replace(marker, marker + insertStr);
}

fs.writeFileSync('src/contexts/LanguageContext.tsx', updatedData);
console.log('Navigation translations injected successfully');
