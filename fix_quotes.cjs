const fs = require('fs');

let data = fs.readFileSync('src/contexts/LanguageContext.tsx', 'utf-8');
data = data.replace(/'([^']*)'([^']*)'/g, (match, p1, p2) => {
    // We only want to target dictionary assignments exactly like:
    // 'uv.todaysMax': 'Today's Maximum',
    // But this regex is too broad.
    return match;
});

// A better way: just regex replace the specific strings.
data = data.replace(/'Today's Maximum'/g, '"Today\'s Maximum"');
data = data.replace(/'Maximum d'Aujourd'hui'/g, '"Maximum d\'Aujourd\'hui"');
data = data.replace(/'Indice UV — Aujourd'hui'/g, '"Indice UV — Aujourd\'hui"');
data = data.replace(/'Heure dorée jusqu'à'/g, '"Heure dorée jusqu\'à"');
data = data.replace(/'Chance d'aurore'/g, '"Chance d\'aurore"');
data = data.replace(/'Restez à l’intérieur à midi. Protection totale obligatoire.'/g, '"Restez à l\'intérieur à midi. Protection totale obligatoire."');
data = data.replace(/'Aucune protection nécessaire. Sans danger à l’extérieur.'/g, '"Aucune protection nécessaire. Sans danger à l\'extérieur."');
data = data.replace(/'Crème solaire SPF 30\+. Cherchez l’ombre à midi.'/g, '"Crème solaire SPF 30+. Cherchez l\'ombre à midi."');

fs.writeFileSync('src/contexts/LanguageContext.tsx', data);
