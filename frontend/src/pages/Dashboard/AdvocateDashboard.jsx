import { useCallback, useEffect, useState } from "react";
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
import analyticsService from "../../services/api/analyticsService";
import Navbar from "../../components/Navigation/Navbar";

const RANGE_OPTIONS = [
  { value: "30", label: "30 Days" },
  { value: "90", label: "90 Days" },
  { value: "180", label: "6 Months" },
  { value: "365", label: "1 Year" },
];

const PLATFORM_COLORS = ["#0f172a", "#2563eb", "#14b8a6", "#f59e0b"];

const DEFAULT_SUMMARY = {
  activeWorkers: 0,
  payoutVolume: 0,
  avgCommission: 0,
  payoutDelta: 0,
  commissionDelta: 0,
};

const DEFAULT_COMMISSION_TREND = {
  platforms: [],
  data: [],
};

const DEFAULT_DATA_COVERAGE = {
  sessionsInRange: 0,
  platformsTracked: 0,
  activeZones: 0,
  latestSessionDate: null,
};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return `PKR ${Math.round(toNumber(value)).toLocaleString("en-PK")}`;
}

function formatPlatformLabel(value) {
  return String(value || "Other")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function AdvocateDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState("");
  const [user, setUser] = useState(null);

  const [workersCount, setWorkersCount] = useState(0);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [vulnerabilityList, setVulnerabilityList] = useState([]);
  const [zoneDistribution, setZoneDistribution] = useState([]);
  const [commissionTrend, setCommissionTrend] = useState(
    DEFAULT_COMMISSION_TREND,
  );
  const [clusters, setClusters] = useState([]);
  const [dataCoverage, setDataCoverage] = useState(DEFAULT_DATA_COVERAGE);

  const dateRange = searchParams.get("range") || "90";

  const loadData = useCallback(async () => {
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

      const dashboardResult = await analyticsService.getAdvocateDashboard({
        range: dateRange,
        max_clusters: 6,
      });

      setWorkersCount(Math.round(toNumber(dashboardResult?.workersCount)));

      setSummary({
        activeWorkers: Math.round(
          toNumber(dashboardResult?.summary?.activeWorkers),
        ),
        payoutVolume: toNumber(dashboardResult?.summary?.payoutVolume),
        avgCommission: toNumber(dashboardResult?.summary?.avgCommission),
        payoutDelta: toNumber(dashboardResult?.summary?.payoutDelta),
        commissionDelta: toNumber(dashboardResult?.summary?.commissionDelta),
      });

      setVulnerabilityList(
        Array.isArray(dashboardResult?.vulnerabilityList)
          ? dashboardResult.vulnerabilityList
          : [],
      );

      setZoneDistribution(
        Array.isArray(dashboardResult?.zoneDistribution)
          ? dashboardResult.zoneDistribution
          : [],
      );

      setCommissionTrend({
        platforms: Array.isArray(dashboardResult?.commissionTrend?.platforms)
          ? dashboardResult.commissionTrend.platforms
          : [],
        data: Array.isArray(dashboardResult?.commissionTrend?.data)
          ? dashboardResult.commissionTrend.data
          : [],
      });

      setClusters(
        Array.isArray(dashboardResult?.clusters)
          ? dashboardResult.clusters
          : [],
      );

      setDataCoverage({
        sessionsInRange: Math.round(
          toNumber(dashboardResult?.dataCoverage?.sessionsInRange),
        ),
        platformsTracked: Math.round(
          toNumber(dashboardResult?.dataCoverage?.platformsTracked),
        ),
        activeZones: Math.round(
          toNumber(dashboardResult?.dataCoverage?.activeZones),
        ),
        latestSessionDate:
          dashboardResult?.dataCoverage?.latestSessionDate || null,
      });

      setWarning(dashboardResult?.warning || "");
    } catch (error) {
      console.error("Failed to load advocate dashboard:", error);
      setWarning(
        error.message || "Unable to load complete advocate analytics data.",
      );
    } finally {
      setLoading(false);
    }
  }, [dateRange, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
              of {workersCount} onboarded workers in selected window
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
                  {dataCoverage.sessionsInRange}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Platforms Tracked
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900">
                  {dataCoverage.platformsTracked}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Active Zones
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900">
                  {dataCoverage.activeZones}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Latest Session Seen
                </p>
                <p className="mt-1 font-semibold text-zinc-900">
                  {dataCoverage.latestSessionDate
                    ? new Date(
                        `${dataCoverage.latestSessionDate}T00:00:00`,
                      ).toLocaleDateString("en-PK")
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
              {clusters.map((cluster) => {
                const keywords = Array.isArray(cluster.keyword_signature)
                  ? cluster.keyword_signature
                  : [];
                const voteSummary = cluster.vote_summary || {};

                return (
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
                      {keywords.map((keyword, idx) => (
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
                        {toNumber(voteSummary.upvotes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ArrowDownRight className="h-3 w-3 text-red-500" />{" "}
                        {toNumber(voteSummary.downvotes)}
                      </span>
                      <span className="ml-auto font-medium text-zinc-700">
                        Score: {toNumber(voteSummary.score)}
                      </span>
                    </div>
                  </div>
                );
              })}
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
