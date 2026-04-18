import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Clock3,
  FileText,
  Users,
  Wallet
} from 'lucide-react';
import authService from '../../services/api/authService';
import earningsService from '../../services/api/earningsService';
import Navbar from '../../components/Navigation/Navbar';

const formatCurrency = (value) => `PKR ${Number(value || 0).toLocaleString()}`;
const formatPlatform = (value) =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Platform';

const ACTION_CARDS = [
  {
    to: '/worker/log-earnings',
    title: 'Log a Shift',
    description: 'Record sessions, deductions, and net earnings.',
    icon: Wallet
  },
  {
    to: '/worker/analytics',
    title: 'View Analytics',
    description: 'Track trends in your weekly and monthly income.',
    icon: BarChart3
  },
  {
    to: '/worker/certificate',
    title: 'Get Certificate',
    description: 'Generate verified income proof for formal use.',
    icon: FileText
  },
  {
    to: '/worker/community',
    title: 'Community',
    description: 'Connect with workers and share field insights.',
    icon: Users
  }
];

export default function DashboardPage() {
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
  const normalizedRole = String(user?.role || '').toLowerCase();
  const isWorker = normalizedRole === 'worker';
  const firstName = user?.name?.trim()?.split(' ')[0] || 'there';

  const statCards = useMemo(
    () => [
      {
        title: 'This Week',
        value: formatCurrency(stats.thisWeek),
        helper: 'Current week net total',
        icon: Clock3,
        iconClassName: 'text-violet-600',
        iconWrapClassName: 'bg-violet-100',
        valueClassName: 'text-zinc-900'
      },
      {
        title: 'Total Earned',
        value: formatCurrency(stats.totalEarnings),
        helper: 'All-time net received',
        icon: Wallet,
        iconClassName: 'text-emerald-600',
        iconWrapClassName: 'bg-emerald-100',
        valueClassName: 'text-emerald-700'
      },
      {
        title: 'Verified Sessions',
        value: String(stats.verifiedCount),
        helper: 'Successfully verified',
        icon: BadgeCheck,
        iconClassName: 'text-sky-600',
        iconWrapClassName: 'bg-sky-100',
        valueClassName: 'text-zinc-900'
      },
      {
        title: 'Pending Reviews',
        value: String(stats.unverifiedCount),
        helper: 'Awaiting verifier action',
        icon: AlertTriangle,
        iconClassName: 'text-amber-600',
        iconWrapClassName: 'bg-amber-100',
        valueClassName: 'text-zinc-900'
      }
    ],
    [stats]
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const profile = await authService.getMe();
      setUser(profile);

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
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-600">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar user={user} />

      <div className="mx-auto max-w-5xl p-4 md:p-6">
        <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Worker Dashboard</p>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900 md:text-3xl">Welcome back, {firstName}!</h1>
          <p className="mt-1 text-zinc-600">Here is your earning summary and quick access to core actions.</p>
        </div>

        {isWorker && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((card) => (
                <div key={card.title} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{card.title}</p>
                      <p className={`mt-2 text-2xl font-bold ${card.valueClassName}`}>{card.value}</p>
                      <p className="mt-1 text-xs text-zinc-500">{card.helper}</p>
                    </div>
                    <div className={`rounded-lg p-2 ${card.iconWrapClassName}`}>
                      <card.icon className={`h-5 w-5 ${card.iconClassName}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/worker/log-earnings')}
                className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                Open Earnings Page
              </button>
              <button
                type="button"
                onClick={() => navigate('/worker/community')}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                Open Community
              </button>
            </div>

            {stats.anomalyCount > 0 && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-700">Anomaly Detected</p>
                    <p className="text-sm text-red-600">
                      {stats.anomalyCount} unusual deduction detected in your recent earnings
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Quick Actions</h2>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                {ACTION_CARDS.map((action) => (
                  <Link
                    key={action.to}
                    to={action.to}
                    className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-zinc-900">{action.title}</h3>
                        <p className="mt-1 text-sm text-zinc-600">{action.description}</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-zinc-700 transition-colors group-hover:border-zinc-300 group-hover:text-zinc-900">
                        <action.icon className="h-4 w-4" />
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        {!isWorker && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-zinc-700 shadow-sm">
            This account is currently configured for a non-worker role dashboard.
          </div>
        )}

        {isWorker && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">Recent Sessions</h3>
              <Link
                to="/worker/log-earnings"
                className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
              >
                View all
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            {earnings.length > 0 ? (
              <div className="space-y-3">
                {earnings.map((session, index) => {
                  const isVerified = session.evidance?.verified === true;

                  return (
                    <div
                      key={session.id || `${session.session_date}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-zinc-100 bg-zinc-50/70 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-zinc-900">{formatPlatform(session.platform)}</p>
                        <p className="mt-0.5 text-sm text-zinc-600">
                          {new Date(session.session_date).toLocaleDateString()} · {session.hours_worked?.toFixed(1)}h · {session.trips_completed} trips
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold text-zinc-900">{formatCurrency(session.earning?.net_received)}</p>
                        <p className={`mt-0.5 text-xs font-medium ${isVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {isVerified ? 'Verified' : 'Pending'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
                <p className="text-zinc-600">No shifts logged yet</p>
                <Link
                  to="/worker/log-earnings"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
                >
                  Log Your First Shift
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}