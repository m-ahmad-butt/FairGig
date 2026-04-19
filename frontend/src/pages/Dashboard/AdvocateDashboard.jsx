import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChartColumnBig,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import authService from "../../services/api/authService";
import earningsService from "../../services/api/earningsService";
import communityService from "../../services/api/communityService";
import Navbar from "../../components/Navigation/Navbar";

const RANGE_OPTIONS = [
  { value: "30", label: "30 Days" },
  { value: "90", label: "90 Days" },
  { value: "180", label: "6 Months" },
  { value: "365", label: "1 Year" },
];

const PLATFORM_COLORS = ["#0f172a", "#2563eb", "#14b8a6", "#f59e0b"];

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
  return `PKR ${Math.round(toNumber(value)).toLocaleString("en-PK")}`;
}

function formatPlatformLabel(value) {
  return String(value || "Other")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toChangePercent(current, previous) {
  if (!Number.isFinite(previous) || previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

function toWorkerAlias(workerId) {
  const safeId = String(workerId || "unknown");
  return `Worker-${safeId.slice(-4).toUpperCase()}`;
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

function mergeSessionsWithEarnings(sessions, earnings) {
  const earningsBySessionId = new Map(
    (earnings || []).map((item) => [item.session_id, item]),
  );

  return (sessions || [])
    .map((session) => {
      const earning = earningsBySessionId.get(session.id);
      if (!earning) {
        return null;
      }

      const gross = toNumber(earning.gross_earned);
      const deductions = toNumber(earning.platform_deductions);

      return {
        id: session.id,
        workerId: session.worker_id,
        platform: session.platform,
        sessionDate: parseDate(session.session_date),
        gross,
        deductions,
        net: toNumber(earning.net_received),
        deductionRate: gross > 0 ? (deductions / gross) * 100 : 0,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.sessionDate - left.sessionDate);
}

export default function AdvocateDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState("");
  const [user, setUser] = useState(null);

  const [workers, setWorkers] = useState([]);
  const [records, setRecords] = useState([]);
  const [clusters, setClusters] = useState([]);

  const dateRange = searchParams.get("range") || "90";

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    setWarning("");

    try {
      const profile = await authService.getMe();
      const normalizedRole = String(profile?.role || "").toLowerCase();

      if (normalizedRole !== "advocate") {
        if (normalizedRole === "worker") {
          navigate("/worker/dashboard");
          return;
        }

        if (normalizedRole === "verifier") {
          navigate("/verifier/dashboard");
          return;
        }

        if (normalizedRole === "admin") {
          navigate("/admin/dashboard");
          return;
        }

        navigate("/");
        return;
      }

      setUser(profile);

      const [workersResult, sessionsResult, earningsResult, clustersResult] =
        await Promise.allSettled([
          authService.getOnPlatformWorkers(),
          earningsService.getWorkSessions(),
          earningsService.getAllEarnings(),
          communityService.listPostClusters({ max_clusters: 6 }),
        ]);

      const workerList =
        workersResult.status === "fulfilled"
          ? normalizeWorkersPayload(workersResult.value)
          : [];
      const sessionsList =
        sessionsResult.status === "fulfilled" ? sessionsResult.value : [];
      const earningsList =
        earningsResult.status === "fulfilled" ? earningsResult.value : [];
      const clustersList =
        clustersResult.status === "fulfilled"
          ? clustersResult.value.clusters || []
          : [];

      setWorkers(workerList);
      setRecords(mergeSessionsWithEarnings(sessionsList, earningsList));
      setClusters(clustersList);

      if (
        workersResult.status !== "fulfilled" ||
        sessionsResult.status !== "fulfilled" ||
        earningsResult.status !== "fulfilled"
      ) {
        setWarning(
          "Some data channels are unavailable. Dashboard shows best-effort analytics from reachable services.",
        );
      }
    } catch (error) {
      console.error("Failed to load advocate dashboard:", error);
      setWarning(
        error.message || "Unable to load complete advocate analytics data.",
      );
    } finally {
      setLoading(false);
    }
  };

  const workerMap = useMemo(
    () => new Map(workers.map((item) => [item.id, item])),
    [workers],
  );

  const filteredRecords = useMemo(() => {
    const days = Number(dateRange);
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days);

    return records.filter((record) => record.sessionDate >= cutoff);
  }, [dateRange, records]);

  const previousPeriodRecords = useMemo(() => {
    const days = Number(dateRange);
    const currentStart = new Date();
    currentStart.setHours(0, 0, 0, 0);
    currentStart.setDate(currentStart.getDate() - days);

    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - days);

    return records.filter(
      (record) =>
        record.sessionDate >= previousStart &&
        record.sessionDate < currentStart,
    );
  }, [dateRange, records]);

  const summary = useMemo(() => {
    const currentGross = filteredRecords.reduce(
      (sum, record) => sum + record.gross,
      0,
    );
    const currentDeductions = filteredRecords.reduce(
      (sum, record) => sum + record.deductions,
      0,
    );
    const currentNet = filteredRecords.reduce(
      (sum, record) => sum + record.net,
      0,
    );

    const previousGross = previousPeriodRecords.reduce(
      (sum, record) => sum + record.gross,
      0,
    );
    const previousDeductions = previousPeriodRecords.reduce(
      (sum, record) => sum + record.deductions,
      0,
    );
    const previousNet = previousPeriodRecords.reduce(
      (sum, record) => sum + record.net,
      0,
    );

    const activeWorkers = new Set(
      filteredRecords.map((record) => record.workerId),
    ).size;

    const currentCommission =
      currentGross > 0 ? (currentDeductions / currentGross) * 100 : 0;
    const previousCommission =
      previousGross > 0 ? (previousDeductions / previousGross) * 100 : 0;

    return {
      activeWorkers,
      payoutVolume: currentNet,
      avgCommission: currentCommission,
      payoutDelta: toChangePercent(currentNet, previousNet),
      commissionDelta: toChangePercent(currentCommission, previousCommission),
    };
  }, [filteredRecords, previousPeriodRecords]);

  const vulnerabilityList = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );

    const grouped = new Map();

    for (const record of records) {
      if (record.sessionDate < previousMonthStart) {
        continue;
      }

      if (!grouped.has(record.workerId)) {
        grouped.set(record.workerId, {
          previousMonth: 0,
          currentMonth: 0,
        });
      }

      const entry = grouped.get(record.workerId);

      if (record.sessionDate >= currentMonthStart) {
        entry.currentMonth += record.net;
      } else if (record.sessionDate >= previousMonthStart) {
        entry.previousMonth += record.net;
      }
    }

    return Array.from(grouped.entries())
      .map(([workerId, value]) => {
        const previousMonth = value.previousMonth;
        const currentMonth = value.currentMonth;
        const dropPercent =
          previousMonth > 0
            ? ((previousMonth - currentMonth) / previousMonth) * 100
            : 0;
        const worker = workerMap.get(workerId);

        return {
          workerId,
          alias: toWorkerAlias(workerId),
          city: worker?.city || "Unknown",
          zone: worker?.zone || "Unknown",
          previousMonth,
          currentMonth,
          dropPercent,
        };
      })
      .filter((item) => item.dropPercent > 20)
      .sort((left, right) => right.dropPercent - left.dropPercent);
  }, [records, workerMap]);

  const zoneDistribution = useMemo(() => {
    const grouped = {};

    for (const record of filteredRecords) {
      const worker = workerMap.get(record.workerId);
      const zone = worker?.zone || "Unknown Zone";

      if (!grouped[zone]) {
        grouped[zone] = {
          zone,
          net: 0,
          workers: new Set(),
        };
      }

      grouped[zone].net += record.net;
      grouped[zone].workers.add(record.workerId);
    }

    return Object.values(grouped)
      .map((entry) => ({
        zone: entry.zone,
        net: entry.net,
        workers: entry.workers.size,
      }))
      .sort((left, right) => right.net - left.net)
      .slice(0, 8);
  }, [filteredRecords, workerMap]);

  const commissionTrend = useMemo(() => {
    const grossByPlatform = {};

    for (const record of filteredRecords) {
      const platform = formatPlatformLabel(record.platform);
      if (!grossByPlatform[platform]) {
        grossByPlatform[platform] = 0;
      }

      grossByPlatform[platform] += record.gross;
    }

    const topPlatforms = Object.entries(grossByPlatform)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
      .map(([platform]) => platform);

    const monthBuckets = [];
    const monthMap = new Map();
    const now = new Date();

    for (let offset = 5; offset >= 0; offset -= 1) {
      const monthStart = new Date(
        now.getFullYear(),
        now.getMonth() - offset,
        1,
      );
      const key = monthStart.toISOString().slice(0, 7);

      const row = {
        key,
        label: monthStart.toLocaleDateString("en-PK", {
          month: "short",
          year: "2-digit",
        }),
      };

      for (const platform of topPlatforms) {
        row[platform] = 0;
      }

      monthBuckets.push(row);
      monthMap.set(key, row);
    }

    for (const record of filteredRecords) {
      const platform = formatPlatformLabel(record.platform);
      if (!topPlatforms.includes(platform)) {
        continue;
      }

      const key = new Date(
        record.sessionDate.getFullYear(),
        record.sessionDate.getMonth(),
        1,
      )
        .toISOString()
        .slice(0, 7);
      const row = monthMap.get(key);

      if (!row) {
        continue;
      }

      const currentWeighted = row[`${platform}_weighted`] || 0;
      const currentGross = row[`${platform}_gross`] || 0;

      row[`${platform}_weighted`] =
        currentWeighted + record.deductionRate * record.gross;
      row[`${platform}_gross`] = currentGross + record.gross;
      row[platform] =
        row[`${platform}_gross`] > 0
          ? row[`${platform}_weighted`] / row[`${platform}_gross`]
          : 0;
    }

    const trendRows = monthBuckets.map((row) => {
      const cleanRow = {
        label: row.label,
      };

      for (const platform of topPlatforms) {
        cleanRow[platform] = toNumber(row[platform]);
      }

      return cleanRow;
    });

    return {
      platforms: topPlatforms,
      data: trendRows,
    };
  }, [filteredRecords]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <div className="text-zinc-600">Loading advocate analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 pb-10">
      <Navbar user={user} />

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Advocate Panel
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-zinc-950">
              Systemic Fairness Analytics
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Commission shifts, zone-level income distribution, and
              vulnerability alerts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={dateRange}
              onChange={(event) =>
                setSearchParams({ range: event.target.value })
              }
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
              onClick={loadData}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {warning && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {warning}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Active Workers
              </p>
              <Users className="h-5 w-5 text-zinc-500" />
            </div>
            <p className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-900">
              {summary.activeWorkers}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              of {workers.length} onboarded workers in selected window
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Payout Volume
              </p>
              <BarChart3 className="h-5 w-5 text-zinc-500" />
            </div>
            <p className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-900">
              {formatCurrency(summary.payoutVolume)}
            </p>
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-500">
              {summary.payoutDelta >= 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {Math.abs(summary.payoutDelta).toFixed(1)}% vs previous period
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Avg Commission
              </p>
              <ChartColumnBig className="h-5 w-5 text-zinc-500" />
            </div>
            <p className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-900">
              {summary.avgCommission.toFixed(1)}%
            </p>
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-500">
              {summary.commissionDelta >= 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {Math.abs(summary.commissionDelta).toFixed(1)}% vs previous period
            </p>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">
                Vulnerability Flags
              </p>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <p className="mt-3 text-4xl font-extrabold tracking-tight text-red-700">
              {vulnerabilityList.length}
            </p>
            <p className="mt-1 text-xs text-red-600">
              workers with month-on-month drop greater than 20%
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              Commission Rate Trend by Platform
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Weighted average platform deductions across monthly buckets.
            </p>

            <div className="mt-4 h-80 w-full">
              {commissionTrend.platforms.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={commissionTrend.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#71717a", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#71717a", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "10px",
                        borderColor: "#d4d4d8",
                      }}
                      formatter={(value) => [
                        `${toNumber(value).toFixed(1)}%`,
                        "Commission Rate",
                      ]}
                    />
                    <Legend />
                    {commissionTrend.platforms.map((platform, index) => (
                      <Line
                        key={platform}
                        type="monotone"
                        dataKey={platform}
                        name={platform}
                        stroke={PLATFORM_COLORS[index % PLATFORM_COLORS.length]}
                        strokeWidth={2.4}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                  Not enough platform data in this range.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              Data Coverage Snapshot
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Quick quality check for current analytics scope.
            </p>

            <div className="mt-4 space-y-3 text-sm text-zinc-700">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Sessions in Range
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900">
                  {filteredRecords.length}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Platforms Tracked
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900">
                  {commissionTrend.platforms.length}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Active Zones
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900">
                  {zoneDistribution.length}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Latest Session Seen
                </p>
                <p className="mt-1 font-semibold text-zinc-900">
                  {filteredRecords[0]
                    ? filteredRecords[0].sessionDate.toLocaleDateString("en-PK")
                    : "No data"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_2fr]">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              Income Distribution by City Zone
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Anonymized net totals grouped by worker zone.
            </p>

            <div className="mt-4 h-80 w-full">
              {zoneDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={zoneDistribution}
                    layout="vertical"
                    margin={{ left: 12, right: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis
                      type="number"
                      tick={{ fill: "#71717a", fontSize: 11 }}
                      tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="zone"
                      width={90}
                      tick={{ fill: "#52525b", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "10px",
                        borderColor: "#d4d4d8",
                      }}
                      formatter={(value, name) => {
                        if (name === "workers") {
                          return [value, "Workers"];
                        }

                        return [formatCurrency(value), "Net Income"];
                      }}
                    />
                    <Bar dataKey="net" fill="#0f172a" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                  No zone distribution data found for selected range.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              Workers with Income Drop Greater Than 20%
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Month-on-month vulnerability flags for targeted outreach.
            </p>

            {vulnerabilityList.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500">
                      <th className="py-2 text-left font-semibold uppercase tracking-wide">
                        Worker
                      </th>
                      <th className="py-2 text-left font-semibold uppercase tracking-wide">
                        Zone
                      </th>
                      <th className="py-2 text-right font-semibold uppercase tracking-wide">
                        Previous Month
                      </th>
                      <th className="py-2 text-right font-semibold uppercase tracking-wide">
                        Current Month
                      </th>
                      <th className="py-2 text-right font-semibold uppercase tracking-wide">
                        Drop
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {vulnerabilityList.slice(0, 12).map((worker) => (
                      <tr
                        key={worker.workerId}
                        className="border-b border-zinc-100 text-zinc-700"
                      >
                        <td className="py-2.5 font-semibold text-zinc-900">
                          {worker.alias}
                        </td>
                        <td className="py-2.5">
                          {worker.zone}, {worker.city}
                        </td>
                        <td className="py-2.5 text-right">
                          {formatCurrency(worker.previousMonth)}
                        </td>
                        <td className="py-2.5 text-right">
                          {formatCurrency(worker.currentMonth)}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-red-600">
                          {worker.dropPercent.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500">
                No high-risk workers detected in the current month snapshot.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900">
            Trending Grievance Clusters
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Top discussed issues among workers grouped by semantic similarity.
          </p>

          {clusters.length > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clusters.map((cluster) => (
                <div
                  key={cluster.cluster_id}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                      {formatPlatformLabel(cluster.platform)}
                    </span>
                    <span className="text-xs font-medium text-zinc-500">
                      {cluster.post_count} posts
                    </span>
                  </div>
                  <h3
                    className="text-sm font-semibold text-zinc-900 line-clamp-2"
                    title={cluster.representative_title}
                  >
                    "{cluster.representative_title}"
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {cluster.keyword_signature.map((keyword, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 border border-zinc-200"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500 border-t border-zinc-200 pt-3">
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3 text-emerald-500" />{" "}
                      {cluster.vote_summary.upvotes}
                    </span>
                    <span className="flex items-center gap-1">
                      <ArrowDownRight className="h-3 w-3 text-red-500" />{" "}
                      {cluster.vote_summary.downvotes}
                    </span>
                    <span className="ml-auto font-medium text-zinc-700">
                      Score: {cluster.vote_summary.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500">
              No recent grievance clusters detected.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
