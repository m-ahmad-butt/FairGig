import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../../services/api/authService';
import earningsService from '../../services/api/earningsService';
import Navbar from '../../components/Navigation/Navbar';

const formatCurrency = (value) => `PKR ${Number(value || 0).toLocaleString()}`;

export default function WorkerDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    verifiedCount: 0,
    unverifiedCount: 0,
    thisWeek: 0,
    anomalyCount: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const profile = await authService.getMe();
      setUser(profile);

      if (profile.role !== 'worker') {
        navigate('/dashboard');
        return;
      }

      const sessions = await earningsService.getWorkSessions(profile.id || profile._id);
      const allEarnings = await earningsService.getEarningsByWorker(profile.id || profile._id);

      const enriched = sessions.map(session => {
        const earning = allEarnings.find(e => e.session_id === session.id);
        return { ...session, earning: earning || null };
      });

      setEarnings(enriched.slice(0, 5));

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const thisWeek = enriched.filter(s => {
        return s.earning && new Date(s.session_date) >= weekStart;
      }).reduce((sum, s) => sum + (s.earning?.net_received || 0), 0);

      const verifiedCount = enriched.filter(s => s.evidance?.verified === true).length;
      const unverifiedCount = enriched.filter(s => s.evidance && !s.evidance.verified).length;

      setStats({
        totalEarnings: enriched.reduce((sum, s) => sum + (s.earning?.net_received || 0), 0),
        verifiedCount,
        unverifiedCount,
        thisWeek,
        anomalyCount: 0
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111]">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-400 mt-1">Here's your earnings overview</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1e1e1e] rounded-xl p-4 md:p-6">
            <p className="text-gray-400 text-sm">This Week</p>
            <p className="text-2xl md:text-3xl font-bold text-white mt-1">
              {formatCurrency(stats.thisWeek)}
            </p>
          </div>
          <div className="bg-[#1e1e1e] rounded-xl p-4 md:p-6">
            <p className="text-gray-400 text-sm">Total Earned</p>
            <p className="text-2xl md:text-3xl font-bold text-green-400 mt-1">
              {formatCurrency(stats.totalEarnings)}
            </p>
          </div>
          <div className="bg-[#1e1e1e] rounded-xl p-4 md:p-6">
            <p className="text-gray-400 text-sm">Verified</p>
            <p className="text-2xl md:text-3xl font-bold text-green-400 mt-1">
              {stats.verifiedCount}
            </p>
          </div>
          <div className="bg-[#1e1e1e] rounded-xl p-4 md:p-6">
            <p className="text-gray-400 text-sm">Pending</p>
            <p className="text-2xl md:text-3xl font-bold text-amber-400 mt-1">
              {stats.unverifiedCount}
            </p>
          </div>
        </div>

        {stats.anomalyCount > 0 && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4 mb-8">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-red-400 font-medium">Anomaly Detected</p>
                <p className="text-gray-400 text-sm">
                  {stats.anomalyCount} unusual deduction detected in your recent earnings
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <a href="/worker/log-earnings" className="bg-white text-black rounded-xl p-6 hover:bg-gray-200 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Log a Shift</h3>
                <p className="text-gray-600 text-sm mt-1">Record your work session</p>
              </div>
              <span className="text-3xl group-hover:scale-110 transition-transform">+</span>
            </div>
          </a>

          <a href="/worker/analytics" className="bg-[#1e1e1e] text-white rounded-xl p-6 hover:bg-gray-800 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">View Analytics</h3>
                <p className="text-gray-400 text-sm mt-1">Track your income trends</p>
              </div>
              <span className="text-2xl">📊</span>
            </div>
          </a>

          <a href="/worker/certificate" className="bg-[#1e1e1e] text-white rounded-xl p-6 hover:bg-gray-800 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Get Certificate</h3>
                <p className="text-gray-400 text-sm mt-1">Generate income proof</p>
              </div>
              <span className="text-2xl">📄</span>
            </div>
          </a>

          <a href="/worker/community" className="bg-[#1e1e1e] text-white rounded-xl p-6 hover:bg-gray-800 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Community</h3>
                <p className="text-gray-400 text-sm mt-1">Connect with other workers</p>
              </div>
              <span className="text-2xl">👥</span>
            </div>
          </a>
        </div>

        {earnings.length > 0 && (
          <div className="bg-[#1e1e1e] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Recent Sessions</h3>
              <a href="/worker/log-earnings" className="text-sm text-gray-400 hover:text-white">
                View all →
              </a>
            </div>
            <div className="space-y-3">
              {earnings.map((session, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${session.evidance?.verified ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <div>
                      <p className="text-white font-medium">{session.platform}</p>
                      <p className="text-gray-400 text-sm">
                        {new Date(session.session_date).toLocaleDateString()} · {session.hours_worked?.toFixed(1)}h · {session.trips_completed} trips
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatCurrency(session.earning?.net_received)}</p>
                    <p className={`text-xs ${session.evidance?.verified ? 'text-green-400' : 'text-amber-400'}`}>
                      {session.evidance?.verified ? '✓ Verified' : '⏳ Pending'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {earnings.length === 0 && (
          <div className="bg-[#1e1e1e] rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-4">No shifts logged yet</p>
            <a href="/worker/log-earnings" className="inline-block bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-200">
              Log Your First Shift
            </a>
          </div>
        )}
      </div>
    </div>
  );
}