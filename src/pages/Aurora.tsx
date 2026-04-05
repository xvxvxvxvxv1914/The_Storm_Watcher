import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { getKpIndex } from '../services/noaaApi';

const Aurora = () => {
  const [kpValue, setKpValue] = useState<number>(0);
  const [imageKey, setImageKey] = useState(Date.now());

  useEffect(() => {
    const fetchKp = async () => {
      try {
        const data = await getKpIndex();
        if (data && data.length > 0) {
          const latest = data[data.length - 1];
          setKpValue(latest.kp_index || latest.estimated_kp || 0);
        }
      } catch (error) {
        console.error('Error fetching Kp index:', error);
      }
    };

    fetchKp();
    const interval = setInterval(fetchKp, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setImageKey(Date.now());
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  const getVisibilityInfo = (kp: number) => {
    if (kp >= 7) return { latitude: 50, color: 'text-red-400', intensity: 'Very High' };
    if (kp >= 6) return { latitude: 55, color: 'text-orange-400', intensity: 'High' };
    if (kp >= 5) return { latitude: 60, color: 'text-yellow-400', intensity: 'Moderate' };
    if (kp >= 4) return { latitude: 65, color: 'text-green-400', intensity: 'Low' };
    return { latitude: 70, color: 'text-gray-400', intensity: 'Very Low' };
  };

  const visibility = getVisibilityInfo(kpValue);

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Aurora Forecast</h1>
          <p className="text-gray-400">Real-time aurora visibility predictions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h3 className="text-gray-400 text-sm mb-2">Current Kp Index</h3>
            <div className="text-5xl font-bold text-[#00ff88] mb-2">{kpValue.toFixed(1)}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h3 className="text-gray-400 text-sm mb-2">Visibility Intensity</h3>
            <div className={`text-5xl font-bold mb-2 ${visibility.color}`}>{visibility.intensity}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <h3 className="text-gray-400 text-sm mb-2">Visible Down To</h3>
            <div className="text-5xl font-bold text-white mb-2">{visibility.latitude}°</div>
            <div className="text-gray-400 text-sm">Latitude</div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
          <h3 className="text-xl font-semibold text-white mb-4">Northern Hemisphere Forecast</h3>
          <div className="relative w-full aspect-square max-w-3xl mx-auto">
            <img
              key={imageKey}
              src={`https://services.swpc.noaa.gov/images/aurora-forecast-northern-hemisphere.jpg?${imageKey}`}
              alt="Aurora Forecast - Northern Hemisphere"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <p className="text-gray-400 text-sm text-center mt-4">
            Map updates every 5 minutes
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-6 h-6 text-[#00ff88]" />
            <h3 className="text-2xl font-semibold text-white">Visibility Guide</h3>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Aurora Visibility by Kp Index</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <span className="text-white">Kp 5+ (Storm G1)</span>
                  <span className="text-gray-400">Visible at 60° latitude (Southern Canada, Scotland)</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <span className="text-white">Kp 6+ (Storm G2)</span>
                  <span className="text-gray-400">Visible at 55° latitude (Northern UK, Denmark)</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <span className="text-white">Kp 7+ (Storm G3)</span>
                  <span className="text-gray-400">Visible at 50° latitude (Southern UK, Germany, Poland)</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <span className="text-white">Kp 8+ (Storm G4)</span>
                  <span className="text-gray-400">Visible at 45° latitude (Northern US, France, Italy)</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-3">Best Viewing Conditions</h4>
              <ul className="space-y-2 text-gray-400">
                <li>• Clear, dark skies away from light pollution</li>
                <li>• View between 10 PM and 2 AM local time</li>
                <li>• Look north (northern hemisphere) or south (southern hemisphere)</li>
                <li>• Check for cloud-free conditions</li>
                <li>• Allow 20-30 minutes for eyes to adjust to darkness</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Aurora;
