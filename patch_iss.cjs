const fs = require('fs');
let data = fs.readFileSync('src/pages/ISS.tsx', 'utf-8');

// Insert useLanguage
data = data.replace(/import \{ getIssPosition, getIssPasses, IssPosition, IssPass \} from '\.\.\/services\/issApi';/, "import { getIssPosition, getIssPasses, IssPosition, IssPass } from '../services/issApi';\nimport { useLanguage } from '../contexts/LanguageContext';");
data = data.replace(/const ISS = \(\) => \{/, "const ISS = () => {\n  const { t } = useLanguage();");

// Replace strings
data = data.replace(/>International Space Station — live position & pass predictions</g, ">{t('iss.subtitle')}<");
data = data.replace(/>Live Position</g, ">{t('iss.livePosition')}<");
data = data.replace(/>updates every 5s</g, ">{t('iss.updates5s')}<");
data = data.replace(/>Latitude</g, ">{t('iss.latitude')}<");
data = data.replace(/>Longitude</g, ">{t('iss.longitude')}<");
data = data.replace(/>Altitude</g, ">{t('iss.altitude')}<");
data = data.replace(/>Speed</g, ">{t('iss.speed')}<");

data = data.replace(/>Next 7 days · minimum elevation 10°</g, ">{t('iss.passesSubtitle')}<");
data = data.replace(/>No visible passes in the next 7 days\.</g, ">{t('iss.noPasses')}<");

data = data.replace(/> Excellent \(60\+\)</, ">{t('iss.excellent')}<");
data = data.replace(/> Good \(30°\+\)</, ">{t('iss.good')}<");
data = data.replace(/> Low \(10°\+\)</, ">{t('iss.low')}<");
data = data.replace(/>Your location</, ">{t('iss.yourLocation')}<");
data = data.replace(/>Next</, ">{t('iss.nextPassTitle')}<");

fs.writeFileSync('src/pages/ISS.tsx', data);
console.log('ISS.tsx patched');
