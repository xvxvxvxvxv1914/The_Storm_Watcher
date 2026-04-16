const fs = require('fs');

let data = fs.readFileSync('src/services/uvApi.ts', 'utf-8');

data = data.replace(
  /export const getUvLevel = \(uv: number\): \{ label: string; color: string; bg: string; advice: string \} => \{\n  if \(uv < 3\) return \{ label: 'Low', color: '#10b981', bg: 'from-\\[#10b981\\] to-\\[#059669\\]', advice: 'No protection needed\. Safe to be outside\.' \};\n  if \(uv < 6\) return \{ label: 'Moderate', color: '#eab308', bg: 'from-\\[#eab308\\] to-\\[#ca8a04\\]', advice: 'Wear sunscreen SPF 30\+\. Seek shade during midday\.' \};\n  if \(uv < 8\) return \{ label: 'High', color: '#f97316', bg: 'from-\\[#f97316\\] to-\\[#ea580c\\]', advice: 'Sunscreen SPF 50\+, hat and sunglasses required\. Limit time outdoors\.' \};\n  if \(uv < 11\) return \{ label: 'Very High', color: '#ef4444', bg: 'from-\\[#ef4444\\] to-\\[#dc2626\\]', advice: 'Extra protection needed\. Avoid sun between 10am–4pm\.' \};\n  return \{ label: 'Extreme', color: '#7c3aed', bg: 'from-\\[#7c3aed\\] to-\\[#6d28d9\\]', advice: 'Stay indoors during midday\. Full protection mandatory if outside\.' \};\n\};/g,
`export const getUvLevel = (uv: number): { labelKey: string; color: string; bg: string; adviceKey: string } => {
  if (uv < 3) return { labelKey: 'uv.level.low.label', color: '#10b981', bg: 'from-[#10b981] to-[#059669]', adviceKey: 'uv.level.low.advice' };
  if (uv < 6) return { labelKey: 'uv.level.moderate.label', color: '#eab308', bg: 'from-[#eab308] to-[#ca8a04]', adviceKey: 'uv.level.moderate.advice' };
  if (uv < 8) return { labelKey: 'uv.level.high.label', color: '#f97316', bg: 'from-[#f97316] to-[#ea580c]', adviceKey: 'uv.level.high.advice' };
  if (uv < 11) return { labelKey: 'uv.level.veryHigh.label', color: '#ef4444', bg: 'from-[#ef4444] to-[#dc2626]', adviceKey: 'uv.level.veryHigh.advice' };
  return { labelKey: 'uv.level.extreme.label', color: '#7c3aed', bg: 'from-[#7c3aed] to-[#6d28d9]', adviceKey: 'uv.level.extreme.advice' };
};`
);

fs.writeFileSync('src/services/uvApi.ts', data);
console.log('uvApi.ts updated');
