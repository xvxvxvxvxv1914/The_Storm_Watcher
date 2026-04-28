import { Helmet } from 'react-helmet-async';
import { Video, MapPin, Radio } from 'lucide-react';

const webcams = [
  {
    id: 'abisko',
    title: 'Lights Over Lapland (Archive)',
    location: 'Abisko, Sweden',
    url: 'https://www.youtube.com/embed/PBnFEo6Bik8?autoplay=0&mute=1&loop=1&playlist=PBnFEo6Bik8',
  },
  {
    id: 'churchill',
    title: 'Explore.org Northern Lights',
    location: 'Churchill, Manitoba, Canada',
    url: 'https://www.youtube.com/embed/fvsONIgCEeo?autoplay=0&mute=1&loop=1&playlist=fvsONIgCEeo',
  },
  {
    id: 'fairbanks',
    title: 'Alaskan Aurora 4K',
    location: 'Fairbanks, Alaska, USA',
    url: 'https://www.youtube.com/embed/WlHq-O2i47E?autoplay=0&mute=1&loop=1&playlist=WlHq-O2i47E',
  },
  {
    id: 'tromso',
    title: 'Norwegian Sky 4K',
    location: 'Tromsø, Norway',
    url: 'https://www.youtube.com/embed/XjR2B1b504g?autoplay=0&mute=1&loop=1&playlist=XjR2B1b504g',
  },
  {
    id: 'iceland',
    title: 'Icelandic Aurora Borealis',
    location: 'Reykjavík, Iceland',
    url: 'https://www.youtube.com/embed/YjzOSLhE4xM?autoplay=0&mute=1&loop=1&playlist=YjzOSLhE4xM',
  },
  {
    id: 'iss',
    title: 'ISS Live Stream (View from Space)',
    location: 'Low Earth Orbit',
    url: 'https://www.youtube.com/embed/xRPjKQtRXR8?autoplay=0&mute=1', // Reliable 24/7 NASA stream
  }
];

const Webcams = () => {
  return (
    <div className="min-h-screen px-4 pt-32 pb-12 sm:pt-44 sm:pb-24 max-w-7xl mx-auto relative z-10">
      <Helmet>
        <title>Live Aurora Webcams | The Storm Watcher</title>
        <meta name="description" content="Watch the Northern Lights live from Abisko, Alaska, Canada, and more. 24/7 live streaming aurora borealis webcams." />
        <link rel="canonical" href="https://thestormwatcher.com/webcams" />
      </Helmet>

      {/* Header */}
      <div className="text-center mb-12 sm:mb-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-full mb-6 relative pulse-alert shadow-lg shadow-red-500/20">
          <Video className="w-8 h-8 text-white" />
          <div className="absolute top-0 right-0 w-4 h-4 bg-red-400 rounded-full border-2 border-[#0a0a1a] animate-ping" />
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 uppercase tracking-wider">
          Live <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-500">Webcams</span>
        </h1>
        <p className="text-[#94a3b8] text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          Cloudy outside? Watch the Northern Lights dancing across the Arctic circle right now from our curated selection of 24/7 live cameras.
        </p>
      </div>

      {/* Grid of webcams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
        {webcams.map((cam) => (
          <div key={cam.id} className="glass-surface rounded-3xl overflow-hidden border border-white/10 flex flex-col group hover:border-red-500/30 transition-colors duration-500">
            {/* Header info */}
            <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1 group-hover:text-red-400 transition-colors">{cam.title}</h2>
                <div className="flex items-center gap-1.5 text-sm text-[#94a3b8]">
                  <MapPin className="w-4 h-4 text-[#f97316]" />
                  {cam.location}
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">
                <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Live</span>
              </div>
            </div>

            {/* Video container with 16:9 aspect ratio */}
            <div className="relative w-full pb-[56.25%] bg-[#05050a]">
              <iframe
                src={cam.url}
                title={cam.title}
                className="absolute top-0 left-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Webcams;
