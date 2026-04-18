import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import earningsService from '../../services/api/earningsService';
import authService from '../../services/api/authService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const formatCurrency = (value) => `PKR ${Number(value).toLocaleString()}`;

export default function IncomeAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState([]);
  const [stats, setStats] = useState({});
  
  const dateRange = searchParams.get('range') || '30';
  const user = authService.getUser();
  const workerId = user?.id || user?._id;

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const sessions = await earningsService.getWorkSessions(workerId);
      const allEarnings = await earningsService.getEarningsByWorker(workerId);
      
      const verifiedSessions = sessions.filter(s => s.evidance?.verified === true);
      
      const enriched = verifiedSessions.map(session => {
        const earning = allEarnings.find(e => e.session_id === session.id);
        return {
          ...session,
          earning: earning || null
        };
      }).filter(s => s.earning);
      
      setEarnings(enriched);
      
      const totalNet = enriched.reduce((sum, s) => sum + (s.earning?.net_received || 0), 0);
      const totalGross = enriched.reduce((sum, s) => sum + (s.earning?.gross_earned || 0), 0);
      const totalDeductions = enriched.reduce((sum, s) => sum + (s.earning?.platform_deductions || 0), 0);
      const totalHours = enriched.reduce((sum, s) => sum + (s.hours_worked || 0), 0);
      const totalTrips = enriched.reduce((sum, s) => sum + (s.trips_completed || 0), 0);
      
      setStats({
        totalNet,
        totalGross,
        totalDeductions,
        totalSessions: enriched.length,
        totalHours,
        totalTrips,
        avgPerSession: enriched.length > 0 ? totalNet / enriched.length : 0,
        avgPerHour: totalHours > 0 ? totalNet / totalHours : 0
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    const now = new Date();
    const days = parseInt(dateRange);
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    return earnings.filter(e => new Date(e.session_date) >= cutoff);
  };

  const getTimeSeriesData = () => {
    const filtered = getFilteredData();
    const grouped = {};
    
    filtered.forEach(e => {
      const date = new Date(e.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!grouped[date]) {
        grouped[date] = { date, net: 0, gross: 0, sessions: 0 };
      }
      grouped[date].net += e.earning?.net_received || 0;
      grouped[date].gross += e.earning?.gross_earned || 0;
      grouped[date].sessions += 1;
    });
    
    return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getPlatformData = () => {
    const filtered = getFilteredData();
    const grouped = {};
    
    filtered.forEach(e => {
      const platform = e.platform || 'Other';
      if (!grouped[platform]) {
        grouped[platform] = { platform, net: 0, sessions: 0 };
      }
      grouped[platform].net += e.earning?.net_received || 0;
      grouped[platform].sessions += 1;
    });
    
    return Object.values(grouped).sort((a, b) => b.net - a.net);
  };

  const filteredData = getFilteredData();
  const timeSeriesData = getTimeSeriesData();
  const platformData = getPlatformData();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center">
        <div className="text-white">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Income Analytics</h1>
            <p className="text-gray-400">Verified earnings only</p>
          </div>
          <div className="flex gap-2">
            {['7', '30', '90', '365'].map(days => (
              <button
                key={days}
                onClick={() => setSearchParams({ range: days })}
                className={`px-4 py-2 rounded-lg text-sm ${
                  dateRange === days ? 'bg-white text-black' : 'bg-[#1e1e1e] text-gray-400 hover:text-white'
                }`}
              >
                {days === '365' ? '1 Year' : `${days} Days`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1e1e1e] rounded-xl p-4">
            <p className="text-gray-400 text-sm">Total Net Earnings</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.totalNet)}</p>
          </div>
          <div className="bg-[#1e1e1e] rounded-xl p-4">
            <p className="text-gray-400 text-sm">Verified Sessions</p>
            <p className="text-2xl font-bold">{stats.totalSessions}</p>
          </div>
          <div className="bg-[#1e1e1e] rounded-xl p-4">
            <p className="text-gray-400 text-sm">Hours Worked</p>
            <p className="text-2xl font-bold">{stats.totalHours?.toFixed(1)}</p>
          </div>
          <div className="bg-[#1e1e1e] rounded-xl p-4">
            <p className="text-gray-400 text-sm">Avg per Session</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.avgPerSession)}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#1e1e1e] rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">Income Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ background: '#1e1e1e', border: 'none', borderRadius: '8px' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Line type="monotone" dataKey="net" stroke="#00C49F" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#1e1e1e] rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">Platform Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={platformData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="platform" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={12} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ background: '#1e1e1e', border: 'none', borderRadius: '8px' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Bar dataKey="net" fill="#0088FE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#1e1e1e] rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Recent Verified Sessions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-3">Date</th>
                  <th className="text-left py-3">Platform</th>
                  <th className="text-right py-3">Hours</th>
                  <th className="text-right py-3">Trips</th>
                  <th className="text-right py-3">Net</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(-10).reverse().map((session, i) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="py-3">{new Date(session.session_date).toLocaleDateString()}</td>
                    <td className="py-3">{session.platform}</td>
                    <td className="py-3 text-right">{session.hours_worked?.toFixed(1)}</td>
                    <td className="py-3 text-right">{session.trips_completed}</td>
                    <td className="py-3 text-right text-green-400">{formatCurrency(session.earning?.net_received)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <Link to="/worker/certificate" className="bg-[#1e1e1e] text-white px-6 py-3 rounded-xl hover:bg-gray-800">
            Generate Certificate
          </Link>
          <Link to="/worker/log-earnings" className="bg-[#1e1e1e] text-white px-6 py-3 rounded-xl hover:bg-gray-800">
            Log New Earnings
          </Link>
        </div>
      </div>
    </div>
  );
}