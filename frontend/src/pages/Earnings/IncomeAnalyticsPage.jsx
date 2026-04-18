import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  ShieldCheck,
  TriangleAlert
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import earningsService from '../../services/api/earningsService';
import authService from '../../services/api/authService';
import Navbar from '../../components/Navigation/Navbar';

const RANGE_OPTIONS = [
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: '180', label: 'Last 6 Months' },
  { value: '365', label: 'Last 12 Months' }
];

const TREND_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
];

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value) {
  if (!value) {
    return new Date(0);
  }

  const raw = String(value);
  const fallback = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw;
  const parsed = new Date(fallback);

  if (Number.isNaN(parsed.getTime())) {
    return new Date(0);
  }

  return parsed;
}

function formatCurrency(value) {
  return `PKR ${Math.round(toNumber(value)).toLocaleString('en-PK')}`;
}

function formatHourlyRate(value) {
  return `PKR ${toNumber(value).toFixed(1)}/hr`;
}

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

function getStartOfWeek(date) {
  const output = new Date(date);
  const day = (output.getDay() + 6) % 7;
  output.setDate(output.getDate() - day);
  output.setHours(0, 0, 0, 0);
  return output;
}

function getStartOfMonth(date) {
  const output = new Date(date);
  output.setDate(1);
  output.setHours(0, 0, 0, 0);
  return output;
}

function getMedian(values) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function mergeSessionsWithEarnings(sessions, earnings) {
  const earningsBySessionId = new Map((earnings || []).map((item) => [item.session_id, item]));

  return (sessions || [])
    .map((session) => {
      const earning = earningsBySessionId.get(session.id);
      if (!earning) {
        return null;
      }

      const gross = toNumber(earning.gross_earned);
      const deductions = toNumber(earning.platform_deductions);
      const net = toNumber(earning.net_received);
      const hoursWorked = toNumber(session.hours_worked);
      const evidence = session.evidance || session.evidence;

      return {
        id: session.id,
        workerId: session.worker_id,
        platform: session.platform,
        sessionDate: parseDate(session.session_date),
        sessionDateRaw: session.session_date,
        hoursWorked,
        gross,
        deductions,
        net,
        deductionRate: gross > 0 ? (deductions / gross) * 100 : 0,
        isVerified: evidence?.verified === true
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.sessionDate - left.sessionDate);
}

function normalizeWorkersPayload(result) {
  if (Array.isArray(result?.workers)) {
    return result.workers;
  }

  if (result?.worker) {
    return [result.worker];
  }

  return [];
}

function buildTrendData(records, mode) {
  if (!records.length) {
    return [];
  }

  const grouped = new Map();

  for (const record of records) {
    const bucketStart = mode === 'weekly' ? getStartOfWeek(record.sessionDate) : getStartOfMonth(record.sessionDate);
    const key = bucketStart.toISOString().slice(0, 10);

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        date: bucketStart,
        net: 0,
        totalHours: 0
      });
    }

    const entry = grouped.get(key);
    entry.net += record.net;
    entry.totalHours += record.hoursWorked;
  }

  return Array.from(grouped.values())
    .sort((left, right) => left.date - right.date)
    .slice(-6)
    .map((entry) => ({
      ...entry,
      label:
        mode === 'weekly'
          ? entry.date.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })
          : entry.date.toLocaleDateString('en-PK', { month: 'short', year: '2-digit' }),
      hourlyRate: entry.totalHours > 0 ? entry.net / entry.totalHours : 0
    }));
}

export default function IncomeAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(authService.getUser());
  const [trendMode, setTrendMode] = useState('weekly');
  const [warning, setWarning] = useState('');

  const [workerRecords, setWorkerRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [allWorkers, setAllWorkers] = useState([]);

  const dateRange = searchParams.get('range') || '30';

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    setWarning('');

    try {
      const profile = await authService.getMe();
      setUser(profile);

      const role = String(profile?.role || '').toLowerCase();
      if (role !== 'worker') {
        if (role === 'analyst' || role === 'advocate') {
          navigate('/analyst/dashboard');
          return;
        }

        if (role === 'verifier') {
          navigate('/verifier/dashboard');
          return;
        }

        if (role === 'admin') {
          navigate('/admin/dashboard');
          return;
        }

        navigate('/');
        return;
      }

      const workerId = profile?.id || profile?._id;
      if (!workerId) {
        setWorkerRecords([]);
        setAllRecords([]);
        return;
      }

      const [
        workerSessionsResult,
        workerEarningsResult,
        allWorkersResult,
        allSessionsResult,
        allEarningsResult
      ] = await Promise.allSettled([
        earningsService.getWorkSessions(workerId),
        earningsService.getEarningsByWorker(workerId),
        authService.getOnPlatformWorkers(),
        earningsService.getWorkSessions(),
        earningsService.getAllEarnings()
      ]);

      const workerSessions = workerSessionsResult.status === 'fulfilled' ? workerSessionsResult.value : [];
      const workerEarnings = workerEarningsResult.status === 'fulfilled' ? workerEarningsResult.value : [];
      const workersList =
        allWorkersResult.status === 'fulfilled' ? normalizeWorkersPayload(allWorkersResult.value) : [];
      const sessionsList = allSessionsResult.status === 'fulfilled' ? allSessionsResult.value : [];
      const earningsList = allEarningsResult.status === 'fulfilled' ? allEarningsResult.value : [];

      const mergedWorkerRecords = mergeSessionsWithEarnings(workerSessions, workerEarnings);
      const mergedAllRecords = mergeSessionsWithEarnings(sessionsList, earningsList);

      setWorkerRecords(mergedWorkerRecords);
      setAllRecords(mergedAllRecords);
      setAllWorkers(workersList);

      if (allWorkersResult.status !== 'fulfilled' || allSessionsResult.status !== 'fulfilled' || allEarningsResult.status !== 'fulfilled') {
        setWarning('Some city-level benchmark data is unavailable right now. Core earnings analytics still work.');
      }
    } catch (error) {
      console.error('Failed to load worker analytics:', error);
      setWarning(error.message || 'Unable to load full analytics snapshot.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    const days = Number(dateRange);
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days);

    return workerRecords.filter((record) => record.sessionDate >= cutoff);
  }, [dateRange, workerRecords]);

  const previousPeriodRecords = useMemo(() => {
    const days = Number(dateRange);
    const currentStart = new Date();
    currentStart.setHours(0, 0, 0, 0);
    currentStart.setDate(currentStart.getDate() - days);

    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - days);

    return workerRecords.filter((record) => record.sessionDate >= previousStart && record.sessionDate < currentStart);
  }, [dateRange, workerRecords]);

  const summary = useMemo(() => {
    const totals = filteredRecords.reduce(
      (accumulator, record) => {
        accumulator.totalGross += record.gross;
        accumulator.totalDeductions += record.deductions;
        accumulator.totalNet += record.net;
        accumulator.totalHours += record.hoursWorked;
        accumulator.verified += record.isVerified ? 1 : 0;
        return accumulator;
      },
      {
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        totalHours: 0,
        verified: 0
      }
    );

    return {
      ...totals,
      totalSessions: filteredRecords.length,
      pending: Math.max(0, filteredRecords.length - totals.verified),
      avgHourly: totals.totalHours > 0 ? totals.totalNet / totals.totalHours : 0,
      avgCommissionRate: totals.totalGross > 0 ? (totals.totalDeductions / totals.totalGross) * 100 : 0
    };
  }, [filteredRecords]);

  const previousSummary = useMemo(() => {
    const totals = previousPeriodRecords.reduce(
      (accumulator, record) => {
        accumulator.totalGross += record.gross;
        accumulator.totalDeductions += record.deductions;
        accumulator.totalNet += record.net;
        accumulator.totalHours += record.hoursWorked;
        return accumulator;
      },
      {
        totalGross: 0,
        totalDeductions: 0,
        totalNet: 0,
        totalHours: 0
      }
    );

    const avgHourly = totals.totalHours > 0 ? totals.totalNet / totals.totalHours : 0;
    const avgCommissionRate = totals.totalGross > 0 ? (totals.totalDeductions / totals.totalGross) * 100 : 0;

    return {
      ...totals,
      avgHourly,
      avgCommissionRate
    };
  }, [previousPeriodRecords]);

  const changeSet = useMemo(
    () => ({
      payout: toChangePercent(summary.totalNet, previousSummary.totalNet),
      hourly: toChangePercent(summary.avgHourly, previousSummary.avgHourly),
      commission: toChangePercent(summary.avgCommissionRate, previousSummary.avgCommissionRate)
    }),
    [previousSummary.avgCommissionRate, previousSummary.avgHourly, previousSummary.totalNet, summary.avgCommissionRate, summary.avgHourly, summary.totalNet]
  );

  const trendData = useMemo(() => buildTrendData(filteredRecords, trendMode), [filteredRecords, trendMode]);

  const platformRates = useMemo(() => {
    const grouped = {};

    for (const record of filteredRecords) {
      const platform = formatPlatformLabel(record.platform);

      if (!grouped[platform]) {
        grouped[platform] = {
          platform,
          gross: 0,
          deductions: 0,
          sessions: 0
        };
      }

      grouped[platform].gross += record.gross;
      grouped[platform].deductions += record.deductions;
      grouped[platform].sessions += 1;
    }

    return Object.values(grouped)
      .map((item) => ({
        ...item,
        rate: item.gross > 0 ? (item.deductions / item.gross) * 100 : 0
      }))
      .sort((left, right) => right.gross - left.gross)
      .slice(0, 5);
  }, [filteredRecords]);

  const cityMedianComparison = useMemo(() => {
    const workerMap = new Map(allWorkers.map((item) => [item.id, item]));
    const activeWorker = user ? workerMap.get(user.id || user._id) || user : null;

    if (!activeWorker?.city || !activeWorker?.category) {
      return {
        peers: 0,
        medianNet: 0,
        medianHourly: 0,
        workerHourly: summary.avgHourly,
        workerNet: summary.totalNet,
        workerPosition: 50,
        medianPosition: 50
      };
    }

    const days = Number(dateRange);
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days);

    const peersByWorker = new Map();

    for (const record of allRecords) {
      if (record.sessionDate < cutoff) {
        continue;
      }

      const peer = workerMap.get(record.workerId);
      if (!peer) {
        continue;
      }

      const cityMatches = String(peer.city || '').toLowerCase() === String(activeWorker.city || '').toLowerCase();
      const categoryMatches = String(peer.category || '').toLowerCase() === String(activeWorker.category || '').toLowerCase();

      if (!cityMatches || !categoryMatches) {
        continue;
      }

      if (!peersByWorker.has(peer.id)) {
        peersByWorker.set(peer.id, {
          totalNet: 0,
          totalHours: 0
        });
      }

      const entry = peersByWorker.get(peer.id);
      entry.totalNet += record.net;
      entry.totalHours += record.hoursWorked;
    }

    const peerValues = Array.from(peersByWorker.values());
    const peerNet = peerValues.map((entry) => entry.totalNet).filter((value) => value > 0);
    const peerHourly = peerValues
      .map((entry) => (entry.totalHours > 0 ? entry.totalNet / entry.totalHours : 0))
      .filter((value) => value > 0);

    const medianNet = getMedian(peerNet);
    const medianHourly = getMedian(peerHourly);

    const axisMax = Math.max(medianHourly, summary.avgHourly, 1) * 1.4;
    const workerPosition = Math.min(100, (summary.avgHourly / axisMax) * 100);
    const medianPosition = Math.min(100, (medianHourly / axisMax) * 100);

    return {
      peers: peerValues.length,
      medianNet,
      medianHourly,
      workerHourly: summary.avgHourly,
      workerNet: summary.totalNet,
      workerPosition,
      medianPosition
    };
  }, [allRecords, allWorkers, dateRange, summary.avgHourly, summary.totalNet, user]);

  const recentRows = useMemo(() => filteredRecords.slice(0, 8), [filteredRecords]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100">
        <div className="text-zinc-600">Loading income analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 pb-10">
      <Navbar user={user} />

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950">Income Analytics</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Real-time breakdown of effective earnings, platform commissions, and market performance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={dateRange}
              onChange={(event) => setSearchParams({ range: event.target.value })}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>

        {warning && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {warning}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-700 bg-gradient-to-br from-slate-700 to-slate-900 p-5 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">Total Net Earnings</p>
            <p className="mt-3 text-5xl font-extrabold tracking-tight">{formatCurrency(summary.totalNet)}</p>
            <p className="mt-3 inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-200">
              {changeSet.payout >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(changeSet.payout).toFixed(1)}% vs last period
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Effective Hourly Rate</p>
            <p className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-900">{formatHourlyRate(summary.avgHourly)}</p>
            <p className="mt-1 text-sm text-zinc-600">Based on {summary.totalHours.toFixed(1)} active hours</p>
            <p className="mt-3 inline-flex items-center gap-1 text-xs text-zinc-500">
              {changeSet.hourly >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(changeSet.hourly).toFixed(1)}% vs last period
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Total Platform Fees</p>
            <p className="mt-3 text-4xl font-extrabold tracking-tight text-red-600">{formatCurrency(summary.totalDeductions)}</p>
            <p className="mt-1 text-sm text-zinc-600">Avg {summary.avgCommissionRate.toFixed(1)}% commission rate</p>
            <p className="mt-3 inline-flex items-center gap-1 text-xs text-zinc-500">
              {changeSet.commission <= 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
              {Math.abs(changeSet.commission).toFixed(1)}% vs last period
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Earnings Trend</h2>
              <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-1">
                {TREND_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTrendMode(option.value)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      trendMode === option.value
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-72 w-full">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: '#71717a', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `PKR ${Math.round(value / 1000)}k`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: '#71717a', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${Math.round(value)}`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '10px', borderColor: '#d4d4d8' }}
                      formatter={(value, name) => {
                        if (name === 'hourlyRate') {
                          return [formatHourlyRate(value), 'Hourly Rate'];
                        }

                        return [formatCurrency(value), 'Net Earnings'];
                      }}
                    />
                    <Bar yAxisId="left" dataKey="net" fill="#0f172a" radius={[6, 6, 0, 0]} maxBarSize={42} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="hourlyRate"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                  No session data found in this time range.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Commission Rates</h2>

            <div className="mt-4 space-y-4">
              {platformRates.length > 0 ? (
                platformRates.map((platform) => {
                  const width = Math.min(100, Math.max(4, platform.rate * 3));
                  const aboveAverage = platform.rate > summary.avgCommissionRate;

                  return (
                    <div key={platform.platform}>
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-sm font-semibold text-zinc-800">{platform.platform}</p>
                        <p className={`text-sm font-semibold ${aboveAverage ? 'text-red-600' : 'text-emerald-600'}`}>
                          {platform.rate.toFixed(1)}%
                        </p>
                      </div>
                      <div className="h-2.5 rounded-full bg-zinc-200">
                        <div
                          className={`h-full rounded-full ${aboveAverage ? 'bg-red-600' : 'bg-emerald-600'}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {platform.sessions} sessions • {formatCurrency(platform.deductions)} fees
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500">
                  No platform commission data available.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
              Market Comparison: {user?.city || 'Your City'}
            </h2>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
              {cityMedianComparison.peers} peers in benchmark
            </span>
          </div>

          <p className="mt-2 text-sm text-zinc-600">
            Category benchmark uses anonymized workers in your city and category from seeded records.
          </p>

          <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="font-semibold text-zinc-700">
                City Median: {formatHourlyRate(cityMedianComparison.medianHourly)}
              </p>
              <p className="font-semibold text-zinc-900">
                You: {formatHourlyRate(cityMedianComparison.workerHourly)}
              </p>
            </div>

            <div className="relative mt-5 h-2 rounded-full bg-zinc-200">
              <div
                className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-zinc-700 bg-white"
                style={{ left: `calc(${cityMedianComparison.medianPosition}% - 8px)` }}
              />
              <div
                className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-amber-500 bg-zinc-900"
                style={{ left: `calc(${cityMedianComparison.workerPosition}% - 8px)` }}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-5 text-xs text-zinc-600">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full border border-zinc-700 bg-white" />
                City median hourly
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-900" />
                Your hourly
              </span>
              <span>
                Median net in range: {formatCurrency(cityMedianComparison.medianNet)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_2fr]">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900">Verification Snapshot</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <p className="inline-flex items-center gap-2 font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  Verified: {summary.verified}
                </p>
              </div>
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                <p className="inline-flex items-center gap-2 font-medium">
                  <TriangleAlert className="h-4 w-4" />
                  Pending: {summary.pending}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to="/worker/certificate"
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                Generate Certificate
              </Link>
              <Link
                to="/worker/log-earnings"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Log Earnings
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900">Recent Sessions</h3>

            {recentRows.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500">
                      <th className="py-2 text-left font-semibold uppercase tracking-wide">Date</th>
                      <th className="py-2 text-left font-semibold uppercase tracking-wide">Platform</th>
                      <th className="py-2 text-right font-semibold uppercase tracking-wide">Hours</th>
                      <th className="py-2 text-right font-semibold uppercase tracking-wide">Commission</th>
                      <th className="py-2 text-right font-semibold uppercase tracking-wide">Net</th>
                      <th className="py-2 text-right font-semibold uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRows.map((record) => (
                      <tr key={record.id} className="border-b border-zinc-100 text-zinc-700">
                        <td className="py-2.5">{new Date(record.sessionDate).toLocaleDateString('en-PK')}</td>
                        <td className="py-2.5">{formatPlatformLabel(record.platform)}</td>
                        <td className="py-2.5 text-right">{record.hoursWorked.toFixed(1)}</td>
                        <td className="py-2.5 text-right text-red-600">{record.deductionRate.toFixed(1)}%</td>
                        <td className="py-2.5 text-right font-semibold text-zinc-900">{formatCurrency(record.net)}</td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              record.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {record.isVerified ? 'Verified' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500">
                No sessions found in selected period.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
