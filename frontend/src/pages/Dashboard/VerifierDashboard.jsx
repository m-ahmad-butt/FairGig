import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../../services/api/authService';
import earningsService from '../../services/api/earningsService';
import Navbar from '../../components/Navigation/Navbar';

const formatCurrency = (value) => `PKR ${Number(value || 0).toLocaleString()}`;

export default function VerifierDashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingReview, setPendingReview] = useState([]);
  const [stats, setStats] = useState({
    reviewedToday: 0,
    pendingCount: 0,
    flaggedThisWeek: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const profile = await authService.getMe();
      setUser(profile);

      if (profile.role !== 'verifier') {
        navigate('/dashboard');
        return;
      }

      const sessions = await earningsService.getWorkSessions();
      
      const unverified = sessions.filter(s => s.evidance && !s.evidance.verified);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const reviewedToday = sessions.filter(s => {
        return s.evidance?.verified && new Date(s.evidance.updated_at || s.evidance.created_at) >= today;
      }).length;

      setPendingReview(unverified.slice(0, 10));

      setStats({
        reviewedToday,
        pendingCount: unverified.length,
        flaggedThisWeek: 0
      });
    } catch (error) {
      console.error('Failed to load verifier dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (sessionId) => {
    try {
      await earningsService.updateEvidence(sessionId, { verified: true });
      toast.success('Session verified');
      loadData();
    } catch (error) {
      toast.error('Failed to verify');
    }
  };

  const handleFlag = async (sessionId) => {
    try {
      await earningsService.updateEvidence(sessionId, { verified: false });
      toast.success('Session flagged');
      loadData();
    } catch (error) {
      toast.error('Failed to flag');
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
            Verification Queue
          </h1>
          <p className="text-gray-400 mt-1">Review and verify worker earnings submissions</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[#1e1e1e] rounded-xl p-4 md:p-6">
            <p className="text-gray-400 text-sm">Pending Review</p>
            <p className="text-2xl md:text-3xl font-bold text-amber-400 mt-1">
              {stats.pendingCount}
            </p>
          </div>
          <div className="bg-[#1e1e1e] rounded-xl p-4 md:p-6">
            <p className="text-gray-400 text-sm">Reviewed Today</p>
            <p className="text-2xl md:text-3xl font-bold text-green-400 mt-1">
              {stats.reviewedToday}
            </p>
          </div>
          <div className="bg-[#1e1e1e] rounded-xl p-4 md:p-6">
            <p className="text-gray-400 text-sm">Flagged This Week</p>
            <p className="text-2xl md:text-3xl font-bold text-red-400 mt-1">
              {stats.flaggedThisWeek}
            </p>
          </div>
        </div>

        <div className="bg-[#1e1e1e] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Review Queue</h3>
            <span className="text-gray-400 text-sm">Oldest first</span>
          </div>

          {pendingReview.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No pending reviews</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingReview.map((session, i) => (
                <div key={i} className="flex items-center justify-between py-4 border-b border-gray-800 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="text-white font-medium">{session.platform}</p>
                      <span className="px-2 py-1 text-xs bg-amber-500/20 text-amber-400 rounded">
                        Pending
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                      Worker: {session.worker_id?.slice(0, 8)}... · {new Date(session.session_date).toLocaleDateString()}
                    </p>
                    {session.earning && (
                      <p className="text-green-400 text-sm mt-1">
                        Net: {formatCurrency(session.earning.net_received)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVerify(session.id)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                    >
                      ✓ Verify
                    </button>
                    <button
                      onClick={() => handleFlag(session.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                    >
                      ⚠ Flag
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-[#1e1e1e] rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Quick Filters</h3>
          <div className="flex flex-wrap gap-2">
            {['Bykea', 'Careem', 'Foodpanda', 'Cheetay', 'Upwork'].map(platform => (
              <button
                key={platform}
                className="px-4 py-2 bg-[#111] text-gray-400 rounded-lg text-sm hover:text-white hover:bg-gray-800"
              >
                {platform}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}