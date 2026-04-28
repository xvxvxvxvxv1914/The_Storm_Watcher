import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Camera, Satellite, RefreshCw, AlertCircle } from 'lucide-react';

const liveImages = [
  {
    id: 'ovation-north',
    title: 'Aurora Forecast (North)',
    source: 'NOAA SWPC',
    url: 'https://services.swpc.noaa.gov/images/animations/ovation/north/latest.jpg',
    description: 'Live satellite model of the Auroral Oval over the Northern Hemisphere.'
  },
  {
    id: 'ovation-south',
    title: 'Aurora Forecast (South)',
    source: 'NOAA SWPC',
    url: 'https://services.swpc.noaa.gov/images/animations/ovation/south/latest.jpg',
    description: 'Live satellite model of the Auroral Oval over the Southern Hemisphere.'
  },
  {
    id: 'sun-suvi',
    title: 'The Sun Right Now (SUVI 195Å)',
    source: 'GOES Satellite',
    url: 'https://services.swpc.noaa.gov/images/animations/suvi/primary/195/latest.png',
    description: 'Extreme ultraviolet image showing coronal holes and solar flares.'
  },
  {
    id: 'poker-flat',
    title: 'Alaska All-Sky Camera',
    source: 'Geophysical Institute',
    url: 'https://allsky.gi.alaska.edu/Data/PokerFlat/Latest.jpg',
    description: 'Real camera pointing straight up at the sky in Poker Flat, Alaska.'
  }
];

const Webcams = () => {
  const [timestamp, setTimestamp] = useState(Date.now());
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errorStates, setErrorStates] = useState<Record<string, boolean>>({});

  // Auto-refresh images every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleImageLoad = (id: string) => {
    setLoadingStates(prev => ({ ...prev, [id]: false }));
    setErrorStates(prev => ({ ...prev, [id]: false }));
  };

  const handleImageError = (id: string) => {
    setLoadingStates(prev => ({ ...prev, [id]: false }));
    setErrorStates(prev => ({ ...prev, [id]: true }));
  };

  const forceRefresh = () => {
    setLoadingStates(
      liveImages.reduce((acc, img) => ({ ...acc, [img.id]: true }), {})
    );
    setTimestamp(Date.now());
  };

  return (
    <div className="min-h-screen px-4 pt-32 pb-12 sm:pt-44 sm:pb-24 max-w-7xl mx-auto relative z-10">
      <Helmet>
        <title>Live Observatory | The Storm Watcher</title>
        <meta name="description" content="Professional space weather dashboards. View live NOAA satellite models, all-sky cameras, and real-time sun activity." />
        <link rel="canonical" href="https://thestormwatcher.com/webcams" />
      </Helmet>

      {/* Header */}
      <div className="text-center mb-12 sm:mb-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#3b82f6] to-[#2563eb] rounded-full mb-6 relative pulse-alert shadow-lg shadow-[#3b82f6]/20">
          <Satellite className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 uppercase tracking-wider">
          Live <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] to-[#60a5fa]">Observatory</span>
        </h1>
        <p className="text-[#94a3b8] text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-6">
          Access professional scientific feeds. These direct satellite models and observatory images update automatically every 60 seconds and are 100% reliable.
        </p>
        <button
          onClick={forceRefresh}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#3b82f6]/10 text-[#3b82f6] hover:bg-[#3b82f6]/20 font-medium transition-colors border border-[#3b82f6]/20"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Now
        </button>
      </div>

      {/* Grid of Images */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        {liveImages.map((img) => (
          <div key={img.id} className="glass-surface rounded-3xl overflow-hidden border border-white/10 flex flex-col group hover:border-[#3b82f6]/30 transition-colors duration-500">
            {/* Header info */}
            <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1 group-hover:text-[#3b82f6] transition-colors">{img.title}</h2>
                <div className="flex items-center gap-1.5 text-sm text-[#94a3b8]">
                  <Camera className="w-4 h-4 text-[#3b82f6]" />
                  {img.source}
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#10b981]/10 border border-[#10b981]/20 rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                <span className="text-xs font-bold text-[#10b981] uppercase tracking-wider">Live</span>
              </div>
            </div>

            {/* Image Container */}
            <div className="relative w-full aspect-video bg-[#05050a] flex items-center justify-center p-4">
              {loadingStates[img.id] && !errorStates[img.id] && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#05050a]/80 z-10">
                  <RefreshCw className="w-8 h-8 text-[#3b82f6] animate-spin" />
                </div>
              )}
              
              {errorStates[img.id] ? (
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 text-[#94a3b8] mx-auto mb-2" />
                  <p className="text-[#94a3b8] text-sm">Image temporarily unavailable.</p>
                </div>
              ) : (
                <img
                  src={`${img.url}?t=${timestamp}`}
                  alt={img.title}
                  className="w-full h-full object-contain rounded-lg"
                  onLoad={() => handleImageLoad(img.id)}
                  onError={() => handleImageError(img.id)}
                />
              )}
            </div>
            
            {/* Description */}
            <div className="p-4 bg-white/5 border-t border-white/5">
              <p className="text-sm text-[#94a3b8]">{img.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Webcams;
