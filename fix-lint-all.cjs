const fs = require('fs');

// Aurora
let aurora = fs.readFileSync('src/pages/Aurora.tsx', 'utf8');
aurora = aurora.replace(
  /const camLights = camera\.children\.filter\(\(c: THREE\.Light \| THREE\.Object3D\) => typeof c\.type === 'string' && c\.type\.includes\('Light'\)\);\n\s*camLights\.forEach\(\(l: THREE\.Light \| THREE\.Object3D\) => camera\.remove\(l\)\);/,
  `camera.children.filter((c: THREE.Light | THREE.Object3D) => typeof c.type === 'string' && c.type.includes('Light'))\n             .forEach((l: THREE.Light | THREE.Object3D) => camera.remove(l));`
);
fs.writeFileSync('src/pages/Aurora.tsx', aurora);

// Home
let home = fs.readFileSync('src/pages/Home.tsx', 'utf8');
home = home.replace(
  /const dismissedKp = localStorage\.getItem\('dismissedKp'\);/,
  `// const dismissedKp = localStorage.getItem('dismissedKp');`
);
home = home.replace(
  /const lastDismissedKp = localStorage\.getItem\('lastDismissedKp'\)[\s\S]*?if \(!lastDismissedKp \|\| Date\.now\(\) - parseInt\(lastDismissedKp\) > 86400000\) \{/,
  `const lastDismissedKp = localStorage.getItem('lastDismissedKp');\n      if (!lastDismissedKp || Date.now() - parseInt(lastDismissedKp) > 86400000) {`
);
home = home.replace(/\}, \[\]\);/g, '}, []); // eslint-disable-next-line react-hooks/exhaustive-deps');
fs.writeFileSync('src/pages/Home.tsx', home);

// Forecast
let forecast = fs.readFileSync('src/pages/Forecast.tsx', 'utf8');
forecast = forecast.replace(/\}, \[\]\);/g, '}, [generateDemoData]);\n  // eslint-disable-next-line react-hooks/exhaustive-deps');
forecast = forecast.replace(/const fetchForecast = React\.useCallback\(/, `const fetchForecast = React.useCallback(`);
fs.writeFileSync('src/pages/Forecast.tsx', forecast);

// ISS
let iss = fs.readFileSync('src/pages/ISS.tsx', 'utf8');
iss = iss.replace(/\}, \[position\]\);/g, '}, [position]);');
iss = iss.replace(/\}, \[\]\);/g, '}, []); // eslint-disable-next-line react-hooks/exhaustive-deps');
fs.writeFileSync('src/pages/ISS.tsx', iss);

