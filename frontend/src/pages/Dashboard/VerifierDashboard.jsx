import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
        navigate('/');
        return;
      }

      const data = await earningsService.getUnverifiedEvidenceDetailed();
      
      const items = data.items || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const reviewedToday = items.filter(item => {
        return item.evidence?.verified === true && new Date(item.evidence.updated_at || item.evidence.created_at) >= today;
      }).length;

      setPendingReview(items.slice(0, 10));

      setStats({
        reviewedToday,
        pendingCount: items.length,
        flaggedThisWeek: 0
      });
    } catch (error) {
      console.error('Failed to load verifier dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Verification Queue
          </h1>
          <p className="text-gray-500 mt-1">Review and verify worker earnings submissions</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
            <p className="text-gray-500 text-sm">Pending Review</p>
            <p className="text-2xl md:text-3xl font-bold text-amber-600 mt-1">
              {stats.pendingCount}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
            <p className="text-gray-500 text-sm">Reviewed Today</p>
            <p className="text-2xl md:text-3xl font-bold text-green-600 mt-1">
              {stats.reviewedToday}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
            <p className="text-gray-500 text-sm">Flagged This Week</p>
            <p className="text-2xl md:text-3xl font-bold text-red-600 mt-1">
              {stats.flaggedThisWeek}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Review Queue</h3>
            <span className="text-gray-500 text-sm">Oldest first</span>
          </div>

          {pendingReview.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No pending reviews</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingReview.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="text-gray-900 font-medium">{item.session?.platform || 'Unknown'}</p>
                      <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded">
                        Pending
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">
                      Worker: {item.session?.worker_id?.slice(0, 8)}... · {new Date(item.session?.session_date).toLocaleDateString()}
                    </p>
                    {item.earning && (
                      <p className="text-green-600 text-sm mt-1">
                        Net: {formatCurrency(item.earning.net_received)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/verifier/verification/${item.evidence?.id}`)}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Filters</h3>
          <div className="flex flex-wrap gap-2">
            {['Bykea', 'Careem', 'Foodpanda', 'Cheetay', 'Upwork'].map(platform => (
              <button
                key={platform}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:text-gray-900 hover:bg-gray-200"
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