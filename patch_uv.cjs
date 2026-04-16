const fs = require('fs');
let data = fs.readFileSync('src/pages/UV.tsx', 'utf-8');

data = data.replace(/Could not load UV data\./g, "{t('uv.errorLoad')}");
data = data.replace(/<div className="text-sm text-\[#64748b\] uppercase tracking-widest mb-3 font-semibold">Current UV Index<\/div>/g, '<div className="text-sm text-[#64748b] uppercase tracking-widest mb-3 font-semibold">{t(\'uv.currentUvIndex\')}</div>');
data = data.replace(/>\{level.label\}</g, ">{t(level.labelKey)}<");
data = data.replace(/>\{level.advice\}</g, ">{t(level.adviceKey)}<");
data = data.replace(/Today's Maximum/g, "{t('uv.todaysMax')}");
data = data.replace(/>\{maxLevel.label\}</g, ">{t(maxLevel.labelKey)}<");
data = data.replace(/UV Index — Today/g, "{t('uv.indexToday')}");
data = data.replace(/UV Scale/g, "{t('uv.scale')}");
data = data.replace(/formatter=\{\(v: number\) => \[v, 'UV Index'\]\}/g, "formatter={(v: number) => [v, t('uv.chartTooltip')]}");

const scaleMatch = /}\.map\(item => \(\n\s*<div key=\{item\.range\} className="flex items-center gap-4">\n\s*<div className="w-12 text-center font-bold text-sm" style=\{\{ color: item\.color \}\}>\{item\.range\}<\/div>\n\s*<div className="w-20 font-semibold text-sm" style=\{\{ color: item\.color \}\}>\{item\.label\}<\/div>\n\s*<div className="text-\[#94a3b8\] text-sm">\{item\.advice\}<\/div>\n\s*<\/div>\n\s*\)\)/;

if (data.match(scaleMatch)) {
   // The scale array has hardcoded English.
   // We will translate it by mapping the range to a translation key.
   data = data.replace(
       /\[\s*\{\s*range:\s*'0–2',\s*label:\s*'Low',\s*color:\s*'#10b981',\s*advice:\s*'No protection needed.'\s*\},\s*\{\s*range:\s*'3–5',\s*label:\s*'Moderate',\s*color:\s*'#eab308',\s*advice:\s*'Sunscreen SPF 30\+ recommended.'\s*\},\s*\{\s*range:\s*'6–7',\s*label:\s*'High',\s*color:\s*'#f97316',\s*advice:\s*'SPF 50\+, hat and sunglasses required.'\s*\},\s*\{\s*range:\s*'8–10',\s*label:\s*'Very High',\s*color:\s*'#ef4444',\s*advice:\s*'Avoid sun 10am–4pm.'\s*\},\s*\{\s*range:\s*'11\+',\s*label:\s*'Extreme',\s*color:\s*'#7c3aed',\s*advice:\s*'Stay indoors during midday.'\s*\}\s*,?\s*\]\.map\(item => \(/s,
       `[
              { range: '0–2', labelKey: 'uv.level.low.label', color: '#10b981', adviceKey: 'uv.level.low.advice' },
              { range: '3–5', labelKey: 'uv.level.moderate.label', color: '#eab308', adviceKey: 'uv.level.moderate.advice' },
              { range: '6–7', labelKey: 'uv.level.high.label', color: '#f97316', adviceKey: 'uv.level.high.advice' },
              { range: '8–10', labelKey: 'uv.level.veryHigh.label', color: '#ef4444', adviceKey: 'uv.level.veryHigh.advice' },
              { range: '11+', labelKey: 'uv.level.extreme.label', color: '#7c3aed', adviceKey: 'uv.level.extreme.advice' },
            ].map(item => (`
   );
   data = data.replace(/>\{item\.label\}</g, ">{t(item.labelKey)}<");
   data = data.replace(/>\{item\.advice\}</g, ">{t(item.adviceKey)}<");
}

fs.writeFileSync('src/pages/UV.tsx', data);
console.log('UV.tsx patched');
