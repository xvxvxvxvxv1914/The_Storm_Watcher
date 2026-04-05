import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Forecast from './pages/Forecast';
import Aurora from './pages/Aurora';
import Alerts from './pages/Alerts';
import Pricing from './pages/Pricing';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0a0a1a]">
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/aurora" element={<Aurora />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/pricing" element={<Pricing />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
