import { Helmet } from 'react-helmet-async';
import { Video, MapPin, Radio, ExternalLink, PlaySquare } from 'lucide-react';

const archives = [
  {
    id: 'abisko',
    title: 'Lights Over Lapland (Archive)',
    location: 'Abisko, Sweden',
    url: 'https://www.youtube.com/embed/PBnFEo6Bik8?autoplay=0&mute=1&loop=1&playlist=PBnFEo6Bik8',
  },
  {
    id: 'churchill',
    title: 'Explore.org Northern Lights',
    location: 'Churchill, Manitoba',
    url: 'https://www.youtube.com/embed/fvsONIgCEeo?autoplay=0&mute=1&loop=1&playlist=fvsONIgCEeo',
  },
  {
    id: 'fairbanks',
    title: 'Alaskan Aurora 4K',
    location: 'Fairbanks, Alaska',
    url: 'https://www.youtube.com/embed/WlHq-O2i47E?autoplay=0&mute=1&loop=1&playlist=WlHq-O2i47E',
  },
  {
    id: 'iceland',
    title: 'Icelandic Aurora Borealis',
    location: 'Reykjavík, Iceland',
    url: 'https://www.youtube.com/embed/YjzOSLhE4xM?autoplay=0&mute=1&loop=1&playlist=YjzOSLhE4xM',
  }
];

const liveLinks = [
  { name: 'Lights Over Lapland', url: 'https://www.youtube.com/@LightsOverLapland/live' },
  { name: 'Explore.org Churchill', url: 'https://www.youtube.com/@ExploreDogs/live' },
  { name: 'UAF Alaska', url: 'https://www.youtube.com/@UAFGeophysicalInstitute/live' },
  { name: 'Live Aurora Network', url: 'https://www.youtube.com/@LiveAuroraNetwork/live' },
];

const Webcams = () => {
  return (
    <div className="min-h-screen px-4 pt-32 pb-12 sm:pt-44 sm:pb-24 max-w-7xl mx-auto relative z-10">
      <Helmet>
        <title>Aurora Webcams & Archives | The Storm Watcher</title>
        <meta name="description" content="Watch the Northern Lights live from the ISS and explore curated 4K aurora archives from Abisko, Alaska, and Iceland." />
        <link rel="canonical" href="https://thestormwatcher.com/webcams" />
      </Helmet>

      {/* Header */}
      <div className="text-center mb-12 sm:mb-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-full mb-6 relative pulse-alert shadow-lg shadow-red-500/20">
          <Video className="w-8 h-8 text-white" />
          <div className="absolute top-0 right-0 w-4 h-4 bg-red-400 rounded-full border-2 border-[#0a0a1a] animate-ping" />
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 uppercase tracking-wider">
          Virtual <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-500">Aurora</span>
        </h1>
        <p className="text-[#94a3b8] text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          Cloudy outside? Watch the Northern Lights from space, enjoy curated 4K archives, or tune into external live webcams.
        </p>
      </div>

      {/* Featured ISS Live Stream */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Radio className="w-6 h-6 text-red-500 animate-pulse" />
          Featured: NASA ISS Live Stream
        </h2>
        <div className="glass-surface rounded-3xl overflow-hidden border border-red-500/30 shadow-2xl shadow-red-500/10">
          <div className="p-4 sm:p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Earth from Space</h3>
              <p className="text-sm text-[#94a3b8] mt-1">Watch for auroras when the station crosses the night side of Earth.</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Live</span>
            </div>
          </div>
          <div className="relative w-full pb-[56.25%] bg-[#05050a]">
            <iframe
              src="https://www.youtube.com/embed/xRPjKQtRXR8?autoplay=0&mute=1"
              title="ISS Live Stream"
              className="absolute top-0 left-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* 4K Archives Grid */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <PlaySquare className="w-6 h-6 text-[#f97316]" />
          Curated 4K Archives
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {archives.map((cam) => (
            <div key={cam.id} className="glass-surface rounded-3xl overflow-hidden border border-white/10 group hover:border-[#f97316]/30 transition-colors duration-500">
              <div className="p-5 border-b border-white/5 bg-white/5">
                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-[#f97316] transition-colors">{cam.title}</h3>
                <div className="flex items-center gap-1.5 text-sm text-[#94a3b8]">
                  <MapPin className="w-4 h-4 text-[#f97316]" />
                  {cam.location}
                </div>
              </div>
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

      {/* External Live Links */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <ExternalLink className="w-6 h-6 text-[#3b82f6]" />
          External Live Webcams
        </h2>
        <p className="text-[#94a3b8] mb-6">
          YouTube often restricts embedding for live streams. If you want to watch true live aurora cameras right now, use these direct links:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {liveLinks.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-surface p-4 rounded-xl border border-white/10 hover:border-[#3b82f6]/50 hover:bg-[#3b82f6]/10 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-medium text-white group-hover:text-[#3b82f6] transition-colors">{link.name}</span>
              </div>
              <ExternalLink className="w-4 h-4 text-[#94a3b8] group-hover:text-[#3b82f6]" />
            </a>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Webcams;
