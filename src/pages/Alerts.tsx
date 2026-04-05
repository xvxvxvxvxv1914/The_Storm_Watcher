import { useEffect, useState } from 'react';
import { AlertTriangle, Info, AlertOctagon, ShieldAlert } from 'lucide-react';
import { getAlerts, Alert as AlertType } from '../services/noaaApi';

const Alerts = () => {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAlerts = async () => {
    try {
      const data = await getAlerts();
      setAlerts(data || []);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 120000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityInfo = (message: string) => {
    const upper = message.toUpperCase();
    if (upper.includes('WARNING') || upper.includes('SEVERE') || upper.includes('EXTREME')) {
      return {
        severity: 'Warning',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        icon: <AlertOctagon className="w-5 h-5" />,
      };
    }
    if (upper.includes('WATCH') || upper.includes('ALERT')) {
      return {
        severity: 'Watch',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        icon: <AlertTriangle className="w-5 h-5" />,
      };
    }
    if (upper.includes('SUMMARY') || upper.includes('EXTENDED')) {
      return {
        severity: 'Information',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        icon: <Info className="w-5 h-5" />,
      };
    }
    return {
      severity: 'Advisory',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      icon: <ShieldAlert className="w-5 h-5" />,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[#00ff88]/20 border-t-[#00ff88] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Space Weather Alerts</h1>
          <p className="text-gray-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Info className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">All Clear</h3>
              <p className="text-gray-400">No active space weather alerts at this time.</p>
            </div>
          ) : (
            alerts.map((alert, index) => {
              const severityInfo = getSeverityInfo(alert.message);
              return (
                <div
                  key={index}
                  className={`${severityInfo.bgColor} backdrop-blur-sm border ${severityInfo.borderColor} rounded-2xl p-6`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className={`w-12 h-12 ${severityInfo.bgColor} rounded-lg flex items-center justify-center flex-shrink-0 ${severityInfo.color}`}>
                      {severityInfo.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${severityInfo.color} ${severityInfo.bgColor}`}>
                          {severityInfo.severity}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {new Date(alert.issue_datetime).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-white whitespace-pre-wrap font-mono text-sm leading-relaxed">
                        {alert.message}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-12 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-white mb-4">About Space Weather Alerts</h3>
          <div className="space-y-4 text-gray-400">
            <p>
              Space weather alerts are issued by NOAA's Space Weather Prediction Center to inform the public about potentially hazardous space weather events.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div>
                <h4 className="text-white font-semibold mb-2">Alert Types</h4>
                <ul className="space-y-1 text-sm">
                  <li className="text-red-400">• Warning: Imminent or occurring event</li>
                  <li className="text-orange-400">• Watch: Conditions favorable for event</li>
                  <li className="text-blue-400">• Summary: Past event information</li>
                  <li className="text-green-400">• Advisory: General information</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-2">Common Events</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Geomagnetic Storms (G-scale)</li>
                  <li>• Solar Radiation Storms (S-scale)</li>
                  <li>• Radio Blackouts (R-scale)</li>
                  <li>• Proton Events</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
