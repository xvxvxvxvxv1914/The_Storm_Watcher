import { Github, Twitter, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-[#0a0a1a] border-t border-white/10 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-white font-semibold mb-4">The Storm Watcher</h3>
            <p className="text-gray-400 text-sm">
              Real-time space weather monitoring and alerts powered by NOAA data.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-[#00ff88] text-sm transition-colors">About</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#00ff88] text-sm transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#00ff88] text-sm transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#00ff88] text-sm transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Connect</h3>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-[#00ff88] transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#00ff88] transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#00ff88] transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8">
          <p className="text-center text-gray-400 text-sm">
            Data provided by NOAA Space Weather Prediction Center. © 2026 The Storm Watcher. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
