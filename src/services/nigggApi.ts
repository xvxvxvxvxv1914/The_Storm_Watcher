export interface NigggDataPoint {
  time: number;
  value: number;
}

export interface NigggDataSet {
  hComponent: NigggDataPoint[];
  fComponent: NigggDataPoint[];
}

export interface NigggStormStatus {
  label: 'CALM' | 'DISTURBED' | 'STORM';
  color: string;
  bg: string;
  desc: string;
  detail: string;
  humanEffect: string;
}

export const toDeltaSeries = (pts: NigggDataPoint[]): NigggDataPoint[] => {
  if (pts.length === 0) return [];
  // H component is highest during quiet conditions and drops during storms.
  // Use the 90th percentile as baseline so past storm data doesn't pull
  // the mean down and cause false positives.
  const sorted = [...pts].sort((a, b) => b.value - a.value);
  const baseline = sorted[Math.floor(sorted.length * 0.10)]?.value
    ?? (pts.reduce((s, p) => s + p.value, 0) / pts.length);
  return pts.map(p => ({ time: p.time, value: Number((p.value - baseline).toFixed(2)) }));
};

export const getNigggStormStatus = (minDelta: number): NigggStormStatus => {
  if (minDelta < -100) return {
    label: 'STORM', color: '#ef4444', bg: 'bg-red-500/10 border-red-500/30',
    desc: 'Магнитна буря',
    detail: 'GPS навигацията може да е неточна. Радиовръзките са нарушени. Възможно северно сияние над България.',
    humanEffect: 'Може да причини главоболие, нарушение на съня и промени в кръвното налягане. Хора с пейсмейкъри да бъдат внимателни.',
  };
  if (minDelta < -30) return {
    label: 'DISTURBED', color: '#f97316', bg: 'bg-orange-500/10 border-orange-500/30',
    desc: 'Магнитно смущение',
    detail: 'Леки нарушения в GPS точността и радиовръзките. Следете за развитие.',
    humanEffect: 'Чувствителни хора може да усетят лека умора или раздразнителност.',
  };
  return {
    label: 'CALM', color: '#10b981', bg: 'bg-emerald-500/10 border-emerald-500/30',
    desc: 'Спокойно',
    detail: 'Магнитното поле е стабилно. Няма смущения в навигацията или комуникациите.',
    humanEffect: 'Няма отчетено влияние върху хората.',
  };
};

// On native (Capacitor iOS/Android) CapacitorHttp bypasses CORS so we can call
// the endpoint directly. On web we go through the Vercel serverless proxy.
const isNative = typeof (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform === 'function'
  && (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor!.isNativePlatform!();

const NIGGG_URL = isNative
  ? 'https://pagmag.ngic.bg/pagcal2.php'
  : '/api/niggg';

export const fetchNigggData = async (): Promise<NigggDataSet> => {
  try {
    // We want the last 72 hours to ensure we catch working data.
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Format DD-MM-YYYY required by the PHP script.
    const formatDate = (date: Date) => {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}-${m}-${y}`;
    };

    const d1 = formatDate(threeDaysAgo);
    const d2 = formatDate(today);

    const formData = new URLSearchParams();
    formData.append('chdate1', d1);
    formData.append('chdate2', d2);

    const baseUrl = NIGGG_URL;

    const res = await fetch(baseUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch NIGGG data: ${res.status}`);
    }

    const text = await res.text();
    if (!text.trim()) {
       return { hComponent: [], fComponent: [] };
    }

    const json = JSON.parse(text);
    
    // Custom JSON array structure from NIGGG:
    // json[0] = number of days
    // json[1] = H component array
    // json[4] = F component array
    // json[5] = Array of date strings e.g. ["27-04-2026", "28-04-2026"]

    const daysCount = json[0] || 0;
    const hData = json[1] || [];
    const fData = json[4] || [];
    const dateStrings = json[5] || [];

    const hComponent: NigggDataPoint[] = [];
    const fComponent: NigggDataPoint[] = [];

    // The data arrays have exactly 1440 points (minutes) per day.
    let globalIndex = 0;

    for (let dayIdx = 0; dayIdx < daysCount; dayIdx++) {
      // Parse the date string "DD-MM-YYYY"
      const dateStr = dateStrings[dayIdx];
      if (!dateStr) continue;

      const [dd, mm, yyyy] = dateStr.split('-');
      // Create date object at UTC midnight for this date
      const baseDate = new Date(Date.UTC(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)));
      const baseTimestamp = Math.floor(baseDate.getTime() / 1000);

      for (let min = 0; min < 1440; min++) {
        const hVal = hData[globalIndex];
        const fVal = fData[globalIndex];
        
        const timestamp = baseTimestamp + (min * 60);

        // Filter out missing/invalid values (> 1e300)
        if (hVal !== null && hVal !== undefined && hVal < 1e100) {
          hComponent.push({ time: timestamp, value: Number(hVal.toFixed(2)) });
        }
        
        if (fVal !== null && fVal !== undefined && fVal < 1e100) {
          fComponent.push({ time: timestamp, value: Number(fVal.toFixed(2)) });
        }

        globalIndex++;
      }
    }

    return { hComponent, fComponent };
  } catch (error) {
    console.error('Error fetching NIGGG data:', error);
    return { hComponent: [], fComponent: [] };
  }
};
