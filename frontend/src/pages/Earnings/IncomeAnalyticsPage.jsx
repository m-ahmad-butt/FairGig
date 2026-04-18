import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Filter,
  ShieldAlert,
  Wallet,
  Workflow
} from 'lucide-react';
import earningsService from '../../services/api/earningsService';
import authService from '../../services/api/authService';
import Navbar from '../../components/Navigation/Navbar';

const RANGE_OPTIONS = [
  { value: '7', label: '7 Days' },
  { value: '30', label: '30 Days' },
  { value: '90', label: '90 Days' },
  { value: '365', label: '1 Year' }
];

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-PK')}`;

function formatPlatformLabel(value) {
  return String(value || 'Other')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toChangePercent(current, previous) {
  if (!Number.isFinite(previous) || previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

function buildSeries(points, key, min, max) {
  if (!points.length) {
    return { path: '', dots: [] };
  }

  const allSame = points.every((point) => Number(point[key]) === Number(points[0][key]));
  if (allSame) {
    const dots = points.map((_, index) => {
      const x = 5 + (index / Math.max(points.length - 1, 1)) * 90;
      return { x, y: 54 };
    });

    const path = dots
      .map((dot, index) => `${index === 0 ? 'M' : 'L'} ${dot.x.toFixed(2)} ${dot.y.toFixed(2)}`)
      .join(' ');

    return { path, dots };
  }

  const range = max - min || 1;
  const dots = points.map((point, index) => {
    const x = 5 + (index / Math.max(points.length - 1, 1)) * 90;
    const y = 92 - ((Number(point[key]) - min) / range) * 84;
    return { x, y };
  });

  const path = dots
    .map((dot, index) => `${index === 0 ? 'M' : 'L'} ${dot.x.toFixed(2)} ${dot.y.toFixed(2)}`)
    .join(' ');

  return { path, dots };
}

export default function IncomeAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(authService.getUser());
  const [loggedSessions, setLoggedSessions] = useState([]);

  const dateRange = searchParams.get('range') || '30';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const profile = await authService.getMe();
      setUser(profile);

      const workerId = profile?.id || profile?._id;
      if (!workerId) {
        setLoggedSessions([]);
        return;
      }

      const sessions = await earningsService.getWorkSessions(workerId);
      const allEarnings = await earningsService.getEarningsByWorker(workerId);

      const merged = sessions
        .map((session) => {
          const earning = allEarnings.find((item) => item.session_id === session.id);
          if (!earning) {
            return null;
          }

          const gross = Number(earning.gross_earned || 0);
          const deductions = Number(earning.platform_deductions || 0);

          return {
            ...session,
            earning,
            gross,
            deductions,
            net: Number(earning.net_received || 0),
            deductionRate: gross > 0 ? (deductions / gross) * 100 : 0,
            isVerified: session.evidance?.verified === true
          };
        })
        .filter(Boolean)
        .sort((left, right) => new Date(right.session_date) - new Date(left.session_date));

      setLoggedSessions(merged);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = useMemo(() => {
    const days = Number(dateRange);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return loggedSessions.filter((session) => new Date(session.session_date) >= cutoff);
  }, [dateRange, loggedSessions]);

  const verificationSnapshot = useMemo(() => {
    const verified = filteredSessions.filter((session) => session.isVerified).length;
    return {
      verified,
      pending: Math.max(0, filteredSessions.length - verified)
    };
  }, [filteredSessions]);

  const currentStats = useMemo(() => {
    const totalNet = filteredSessions.reduce((sum, session) => sum + session.net, 0);
    const totalGross = filteredSessions.reduce((sum, session) => sum + session.gross, 0);
    const totalDeductions = filteredSessions.reduce((sum, session) => sum + session.deductions, 0);
    const totalHours = filteredSessions.reduce((sum, session) => sum + Number(session.hours_worked || 0), 0);
    const activePlatforms = new Set(filteredSessions.map((session) => session.platform)).size;
    const flaggedCount = filteredSessions.filter((session) => session.deductionRate >= 30).length;

    return {
      totalNet,
      totalGross,
      totalDeductions,
      totalHours,
      totalSessions: filteredSessions.length,
      activePlatforms,
      flaggedCount,
      avgDeductionRate: totalGross > 0 ? (totalDeductions / totalGross) * 100 : 0
    };
  }, [filteredSessions]);

  const previousStats = useMemo(() => {
    const days = Number(dateRange);
    const now = new Date();

    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - days);

    const previousEnd = new Date(currentStart);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - days);

    const previousSessions = loggedSessions.filter((session) => {
      const date = new Date(session.session_date);
      return date >= previousStart && date < previousEnd;
    });

    const previousNet = previousSessions.reduce((sum, session) => sum + session.net, 0);
    const previousFlags = previousSessions.filter((session) => session.deductionRate >= 30).length;
    const previousAvgDeduction =
      previousSessions.reduce((sum, session) => sum + session.gross, 0) > 0
        ? (previousSessions.reduce((sum, session) => sum + session.deductions, 0) /
            previousSessions.reduce((sum, session) => sum + session.gross, 0)) *
          100
        : 0;

    return {
      payoutDelta: toChangePercent(currentStats.totalNet, previousNet),
      flagsDelta: toChangePercent(currentStats.flaggedCount, previousFlags),
      deductionDelta: toChangePercent(currentStats.avgDeductionRate, previousAvgDeduction)
    };
  }, [currentStats.avgDeductionRate, currentStats.flaggedCount, currentStats.totalNet, dateRange, loggedSessions]);

  const trendPoints = useMemo(() => {
    const map = new Map();

    filteredSessions.forEach((session) => {
      const date = new Date(session.session_date);
      const key = date.toISOString().slice(0, 10);

      if (!map.has(key)) {
        map.set(key, {
          key,
          label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          net: 0,
          gross: 0
        });
      }

      const bucket = map.get(key);
      bucket.net += session.net;
      bucket.gross += session.gross;
    });

    return Array.from(map.values())
      .sort((left, right) => new Date(left.key) - new Date(right.key))
      .slice(-8);
  }, [filteredSessions]);

  const trendSeries = useMemo(() => {
    const max = Math.max(
      1,
      ...trendPoints.map((point) => Math.max(Number(point.net || 0), Number(point.gross || 0)))
    );
    const net = buildSeries(trendPoints, 'net', 0, max);
    const gross = buildSeries(trendPoints, 'gross', 0, max);

    return { net, gross };
  }, [trendPoints]);

  const platformBreakdown = useMemo(() => {
    const grouped = {};

    filteredSessions.forEach((session) => {
      const platform = formatPlatformLabel(session.platform);
      if (!grouped[platform]) {
        grouped[platform] = { platform, net: 0 };
      }

      grouped[platform].net += session.net;
    });

    const items = Object.values(grouped).sort((left, right) => right.net - left.net).slice(0, 6);
    const total = items.reduce((sum, item) => sum + item.net, 0) || 1;

    return items.map((item) => ({
      ...item,
      share: (item.net / total) * 100
    }));
  }, [filteredSessions]);

  const varianceBlocks = useMemo(() => {
    const values = filteredSessions.slice(0, 8).map((session) => session.deductionRate);
    return values.map((value) => Math.min(90, 20 + value * 2));
  }, [filteredSessions]);

  const recentRows = useMemo(() => filteredSessions.slice(0, 8), [filteredSessions]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100">
        <div className="text-zinc-600">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 pb-8">
      <Navbar user={user} />

      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Section 3C</p>
            <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-zinc-950">Analytics Overview</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Logged sessions: {verificationSnapshot.verified} verified, {verificationSnapshot.pending} pending.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              <Filter className="h-4 w-4" />
              Global Filters
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSearchParams({ range: option.value })}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                dateRange === option.value
                  ? 'bg-zinc-950 text-white'
                  : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-4 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Deduction Flags</p>
            <p className="mt-2 text-4xl font-bold">{currentStats.flaggedCount}</p>
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-300">
              {previousStats.flagsDelta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(previousStats.flagsDelta).toFixed(1)}% vs last period
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Avg Deduction Rate</p>
            <p className="mt-2 text-4xl font-bold text-zinc-900">{currentStats.avgDeductionRate.toFixed(1)}%</p>
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-500">
              {previousStats.deductionDelta <= 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
              {Math.abs(previousStats.deductionDelta).toFixed(1)}% vs last period
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Logged Sessions</p>
            <p className="mt-2 text-4xl font-bold text-zinc-900">{currentStats.totalSessions}</p>
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-500">
              <Workflow className="h-3.5 w-3.5" />
              {verificationSnapshot.verified} verified • {verificationSnapshot.pending} pending
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Payout Volume</p>
            <p className="mt-2 text-4xl font-bold text-zinc-900">{formatCurrency(currentStats.totalNet)}</p>
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-500">
              {previousStats.payoutDelta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(previousStats.payoutDelta).toFixed(1)}% vs last period
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-bold text-zinc-900">Income Trend</h2>

            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              {trendPoints.length > 0 ? (
                <>
                  <svg viewBox="0 0 100 100" className="h-64 w-full" preserveAspectRatio="none" role="img" aria-label="Income trend chart">
                    <path d={trendSeries.gross.path} fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeDasharray="3 2" strokeLinecap="round" />
                    <path d={trendSeries.net.path} fill="none" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
                    {trendSeries.net.dots.map((dot, index) => (
                      <circle key={`${dot.x}-${index}`} cx={dot.x} cy={dot.y} r="1.6" fill="#0f172a" />
                    ))}
                  </svg>

                  <div className="mt-2 flex justify-between text-xs text-zinc-500">
                    {trendPoints.map((point) => (
                      <span key={point.key}>{point.label}</span>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-600">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#0f172a]" />
                      Net
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#94a3b8]" />
                      Gross
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-zinc-500">No sessions in selected range.</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-bold text-zinc-900">Top Platforms</h2>

            <div className="mt-4 space-y-4">
              {platformBreakdown.length > 0 ? (
                platformBreakdown.map((item) => (
                  <div key={item.platform}>
                    <div className="mb-1 flex items-center justify-between text-sm text-zinc-700">
                      <span className="font-medium">{item.platform}</span>
                      <span>{item.share.toFixed(0)}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-zinc-200">
                      <div
                        className="h-full rounded-full bg-slate-600"
                        style={{ width: `${Math.max(6, item.share)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{formatCurrency(item.net)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">No platform data yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_2fr]">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-bold text-zinc-900">Income Variance</h2>
            <p className="mt-1 text-sm text-zinc-600">Relative deduction intensity across your latest sessions.</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {varianceBlocks.length > 0 ? (
                varianceBlocks.map((opacity, index) => (
                  <div
                    key={`${opacity}-${index}`}
                    className="h-14 rounded-md bg-slate-700"
                    style={{ opacity: opacity / 100 }}
                  />
                ))
              ) : (
                <div className="col-span-2 rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                  Not enough sessions for variance map.
                </div>
              )}
            </div>

            <div className="mt-4 space-y-1 text-sm text-zinc-600">
              <p className="inline-flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-zinc-700" />
                High disparity indicates larger deduction swings.
              </p>
              <p className="inline-flex items-center gap-2">
                <Wallet className="h-4 w-4 text-zinc-700" />
                Active platforms: {currentStats.activePlatforms}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-bold text-zinc-900">Recent Sessions</h2>

            {recentRows.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500">
                      <th className="py-2 text-left font-semibold uppercase tracking-wide">Date</th>
                      <th className="py-2 text-left font-semibold uppercase tracking-wide">Platform</th>
                      <th className="py-2 text-right font-semibold uppercase tracking-wide">Hours</th>
                      <th className="py-2 text-right font-semibold uppercase tracking-wide">Deductions</th>
                      <th className="py-2 text-right font-semibold uppercase tracking-wide">Net</th>
                      <th className="py-2 text-right font-semibold uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRows.map((session) => (
                      <tr key={session.id} className="border-b border-zinc-100 text-zinc-700">
                        <td className="py-2.5">{new Date(session.session_date).toLocaleDateString()}</td>
                        <td className="py-2.5">{formatPlatformLabel(session.platform)}</td>
                        <td className="py-2.5 text-right">{Number(session.hours_worked || 0).toFixed(1)}</td>
                        <td className="py-2.5 text-right text-red-600">{session.deductionRate.toFixed(1)}%</td>
                        <td className="py-2.5 text-right font-semibold text-zinc-900">{formatCurrency(session.net)}</td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              session.isVerified
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {session.isVerified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                No sessions found for this range.
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/worker/certificate"
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            Generate Certificate
          </Link>
          <Link
            to="/worker/log-earnings"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Log New Earnings
          </Link>
        </div>
      </div>
    </div>
  );
}