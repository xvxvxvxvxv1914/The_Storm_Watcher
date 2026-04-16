const fs = require('fs');

// Patch SunTimes.tsx
let sun = fs.readFileSync('src/pages/SunTimes.tsx', 'utf-8');
sun = sun.replace(/import \{ Sun, Sunrise, Sunset, Clock, MapPin, AlertTriangle \} from 'lucide-react';/, "import { Sun, Sunrise, Sunset, Clock, MapPin, AlertTriangle } from 'lucide-react';\nimport { useLanguage } from '../contexts/LanguageContext';");
sun = sun.replace(/const SunTimes = \(\) => \{/, "const SunTimes = () => {\n  const { t } = useLanguage();");
sun = sun.replace(/>Sun</g, ">{t('sun.title')}<");
sun = sun.replace(/>Sunrise</g, ">{t('sun.sunrise')}<");
sun = sun.replace(/>Sunset</g, ">{t('sun.sunset')}<");
sun = sun.replace(/>Daylight:</g, ">{t('sun.daylight')}:<");
sun = sun.replace(/>Daylight</g, ">{t('sun.daylight')}<");
sun = sun.replace(/>Golden hour until \{today\.goldenMorningEnd\}</, ">{t('sun.goldenMorning')} {today.goldenMorningEnd}<");
sun = sun.replace(/>Golden hour from \{today\.goldenEveningStart\}</, ">{t('sun.goldenEvening')} {today.goldenEveningStart}<");
sun = sun.replace(/Sofia, Bulgaria \(default\)/g, "{t('uv.defaultLocation')}");
fs.writeFileSync('src/pages/SunTimes.tsx', sun);

// Patch SkyVisibility.tsx
let sky = fs.readFileSync('src/pages/SkyVisibility.tsx', 'utf-8');
sky = sky.replace(/import \{ Cloud, Eye, Star, Moon, MapPin, AlertTriangle \} from 'lucide-react';/, "import { Cloud, Eye, Star, Moon, MapPin, AlertTriangle } from 'lucide-react';\nimport { useLanguage } from '../contexts/LanguageContext';");
sky = sky.replace(/const SkyVisibility = \(\) => \{/, "const SkyVisibility = () => {\n  const { t } = useLanguage();");
sky = sky.replace(/>Sky /g, ">{t('sky.title')} ");
sky = sky.replace(/>Tonight</g, ">{t('sky.tonight')}<");
sky = sky.replace(/>Visibility</g, ">{t('sky.visibility')}<");
sky = sky.replace(/>Cloud Cover</g, ">{t('sky.cloudCover')}<");
sky = sky.replace(/>Aurora Chance</g, ">{t('sky.auroraChance')}<");
sky = sky.replace(/>Geomagnetic</g, ">{t('sky.geomagnetic')}<");
sky = sky.replace(/>Hourly Breakdown</g, ">{t('sky.hourlyBreakdown')}<");

sky = sky.replace(/> Clear</, ">{t('sky.clear')}<");
sky = sky.replace(/> Partly cloudy</, ">{t('sky.partlyCloudy')}<");
sky = sky.replace(/> Mostly cloudy</, ">{t('sky.mostlyCloudy')}<");
sky = sky.replace(/> Overcast</, ">{t('sky.overcast')}<");

sky = sky.replace(/' Sofia, Bulgaria \(default\)'/g, "t('uv.defaultLocation')");
fs.writeFileSync('src/pages/SkyVisibility.tsx', sky);

console.log('SunTimes.tsx and SkyVisibility.tsx patched');
