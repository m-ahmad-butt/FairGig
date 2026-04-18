import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../../services/api/authService';
import earningsService from '../../services/api/earningsService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import Navbar from '../../components/Navigation/Navbar';

const formatCurrency = (value) => `PKR ${Number(value || 0).toLocaleString()}`;

export default function AdvocateDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState([]);
  const [stats, setStats] = useState({
    totalWorkers: 0,
    vulnerableWorkers: 0,
    totalEarnings: 0,
    avgIncome: 0,
    platformStats: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const profile = await authService.getMe();
      setUser(profile);

      if (profile.role !== 'analyst' && profile.role !== 'advocate') {
        navigate('/dashboard');
        return;
      }

      const sessions = await earningsService.getWorkSessions();
      const earnings = await earningsService.getEarningsByWorker();

      const workerMap = {};
      sessions.forEach(session => {
        if (!workerMap[session.worker_id]) {
          workerMap[session.worker_id] = {
            worker_id: session.worker_id,
            sessions: 0,
            totalEarned: 0,
            lastMonth: 0,
            thisMonth: 0
          };
        }
        const earning = earnings.find(e => e.session_id === session.id);
        if (earning) {
          workerMap[session.worker_id].sessions += 1;
          workerMap[session.worker_id].totalEarned += earning.net_received || 0;
          
          const sessionDate = new Date(session.session_date);
          const now = new Date();
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          
          if (sessionDate >= thisMonth) {
            workerMap[session.worker_id].thisMonth += earning.net_received || 0;
          } else if (sessionDate >= lastMonth) {
            workerMap[session.worker_id].lastMonth += earning.net_received || 0;
          }
        }
      });

      const workerList = Object.values(workerMap);
      const vulnerable = workerList.filter(w => {
        const drop = w.lastMonth > 0 ? ((w.lastMonth - w.thisMonth) / w.lastMonth) * 100 : 0;
        return drop > 20;
      });

      const platformMap = {};
      sessions.forEach(session => {
        const earning = earnings.find(e => e.session_id === session.id);
        if (!platformMap[session.platform]) {
          platformMap[session.platform] = { platform: session.platform, workers: 0, totalEarned: 0 };
        }
        platformMap[session.platform].workers += 1;
        platformMap[session.platform].totalEarned += earning?.net_received || 0;
      });

      setWorkers(workerList.slice(0, 10));
      setStats({
        totalWorkers: workerList.length,
        vulnerableWorkers: vulnerable.length,
        totalEarnings: workerList.reduce((sum, w) => sum + w.totalEarned, 0),
        avgIncome: workerList.length > 0 ? workerList.reduce((sum, w) => sum + w.totalEarned, 0) / workerList.length : 0,
        platformStats: Object.values(platformMap)
      });
    } catch (error) {
      console.error('Failed to load advocate dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthlyData = () => {
    const monthly = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = month.toLocaleDateString('en-US', { month: 'short' });
      monthly[key] = { month: key, earnings: 0, workers: new Set() };
    }

    stats.platformStats.forEach(p => {
      if (p.totalEarned > 0) {
        monthly['This Month'].earnings += p.totalEarned;
      }
    });

    return Object.values(monthly);
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

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Analytics Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Platform-wide earnings insights and trends</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1e1e1e] rounded-xl p-4 md:p-6">
            <p className="text-gray-400 text-sm">Total Workers</p>
            <p className="text-2xl md:text-3xl font-bold text-white mt-1">
              {stats.totalWorkers}
            </p>
          </div>
          <div className="bg-[#1e1e1e] rounded-xl p-4 md:p-6">
            <p className="text-gray-400 text-sm">Total Earnings</p>
            <p className="text-2xl md:text-3xl font-bold text-green-400 mt-1">
              {formatCurrency(stats.totalEarnings)}
            </p>
          </div>
          <div className="bg-[#1e1e1e] rounded-xl p-4 md:p-6">
            <p className="text-gray-400 text-sm">Avg Income</p>
            <p className="text-2xl md:text-3xl font-bold text-white mt-1">
              {formatCurrency(stats.avgIncome)}
            </p>
          </div>
          <div className="bg-[#1e1e1e] rounded-xl p-4 md:p-6">
            <p className="text-gray-400 text-sm">Vulnerable Workers</p>
            <p className="text-2xl md:text-3xl font-bold text-red-400 mt-1">
              {stats.vulnerableWorkers}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#1e1e1e] rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Earnings by Platform</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.platformStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="platform" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: '#1e1e1e', border: 'none', borderRadius: '8px' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Bar dataKey="totalEarned" fill="#0088FE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#1e1e1e] rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Income Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.platformStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="platform" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip
                  contentStyle={{ background: '#1e1e1e', border: 'none', borderRadius: '8px' }}
                />
                <Bar dataKey="workers" fill="#00C49F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#1e1e1e] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Platform Scorecard</h3>
            </div>
            <div className="space-y-4">
              {stats.platformStats.slice(0, 5).map((platform, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                  <div>
                    <p className="text-white font-medium">{platform.platform}</p>
                    <p className="text-gray-400 text-sm">{platform.workers} workers</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-medium">{formatCurrency(platform.totalEarned)}</p>
                    <p className="text-gray-400 text-sm">total earned</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#1e1e1e] rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Vulnerability Flags</h3>
            {stats.vulnerableWorkers > 0 ? (
              <div className="space-y-3">
                <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-400 font-medium">Income Drop &gt;20%</p>
                      <p className="text-gray-400 text-sm">Workers with significant month-over-month decline</p>
                    </div>
                    <span className="text-2xl font-bold text-red-400">{stats.vulnerableWorkers}</span>
                  </div>
                </div>
                <button className="w-full py-3 bg-[#111] text-white rounded-lg text-sm hover:bg-gray-800">
                  View Vulnerability List
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No vulnerable workers detected</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#1e1e1e] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Worker Overview</h3>
            <button className="text-sm text-gray-400 hover:text-white">Export CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-3">Worker ID</th>
                  <th className="text-right py-3">Sessions</th>
                  <th className="text-right py-3">Total Earned</th>
                  <th className="text-right py-3">Avg/Session</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((worker, i) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="py-3 text-white font-mono text-xs">{worker.worker_id?.slice(0, 12)}...</td>
                    <td className="py-3 text-right text-gray-300">{worker.sessions}</td>
                    <td className="py-3 text-right text-green-400">{formatCurrency(worker.totalEarned)}</td>
                    <td className="py-3 text-right text-gray-300">
                      {formatCurrency(worker.sessions > 0 ? worker.totalEarned / worker.sessions : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}