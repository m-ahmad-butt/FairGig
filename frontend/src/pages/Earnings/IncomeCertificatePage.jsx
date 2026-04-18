import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import certificateService from '../../services/api/certificateService';
import authService from '../../services/api/authService';

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-PK')}`;

function buildDefaultRange() {
  const today = new Date();
  const fromDate = `${today.getFullYear()}-01-01`;
  const toDate = today.toISOString().slice(0, 10);
  return { fromDate, toDate };
}

export default function IncomeCertificatePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [stats, setStats] = useState({
    totalNet: 0,
    totalGross: 0,
    totalSessions: 0,
    totalHours: 0
  });
  const [periodBreakdown, setPeriodBreakdown] = useState([]);
  const [certificateHtml, setCertificateHtml] = useState('');
  const [certificateMeta, setCertificateMeta] = useState({
    id: '',
    generatedAt: null,
    fromDate: '',
    toDate: '',
    rangeLabel: ''
  });
  const defaultRange = useMemo(() => buildDefaultRange(), []);
  const [draftRange, setDraftRange] = useState({
    fromDate: searchParams.get('from_date') || defaultRange.fromDate,
    toDate: searchParams.get('to_date') || defaultRange.toDate
  });
  
  const fromDate = searchParams.get('from_date') || defaultRange.fromDate;
  const toDate = searchParams.get('to_date') || defaultRange.toDate;
  const user = authService.getUser();
  const workerId = user?.id || user?._id;
  const workerName = user?.name || 'Worker';

  useEffect(() => {
    setDraftRange({ fromDate, toDate });
  }, [fromDate, toDate]);

  useEffect(() => {
    loadData();
  }, [fromDate, toDate]);

  const loadData = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      if (!workerId) {
        throw new Error('Unable to identify worker. Please login again.');
      }

      if (!fromDate || !toDate) {
        throw new Error('from_date and to_date are required');
      }

      if (toDate < fromDate) {
        throw new Error('to_date must be on or after from_date');
      }

      const filters = { fromDate, toDate, workerName };
      const [payload, html] = await Promise.all([
        certificateService.getIncomeCertificate(workerId, filters),
        certificateService.getIncomeCertificateHtml(workerId, filters)
      ]);
      const summary = payload?.summary || {};

      setStats({
        totalNet: Number(summary.total_net || 0),
        totalGross: Number(summary.total_gross || 0),
        totalSessions: Number(summary.total_sessions || 0),
        totalHours: Number(summary.total_hours || 0)
      });

      setPeriodBreakdown(Array.isArray(payload?.period_breakdown) ? payload.period_breakdown : []);
      setCertificateHtml(html);

      setCertificateMeta({
        id: payload?.certificate_id || `FG-${String(workerId).slice(0, 8)}`,
        generatedAt: payload?.generated_at || null,
        fromDate: payload?.from_date || fromDate,
        toDate: payload?.to_date || toDate,
        rangeLabel: payload?.range_label || `${fromDate} to ${toDate}`
      });
    } catch (error) {
      console.error('Failed to load certificate data:', error);
      setErrorMessage(error.message || 'Failed to load certificate data');
      setPeriodBreakdown([]);
      setCertificateHtml('');
      setStats({
        totalNet: 0,
        totalGross: 0,
        totalSessions: 0,
        totalHours: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const applyDateRange = () => {
    if (!draftRange.fromDate || !draftRange.toDate) {
      setErrorMessage('Select both from and to dates.');
      return;
    }

    if (draftRange.toDate < draftRange.fromDate) {
      setErrorMessage('To date must be on or after from date.');
      return;
    }

    setErrorMessage('');
    setSearchParams({
      from_date: draftRange.fromDate,
      to_date: draftRange.toDate
    });
  };

  const handlePrint = () => {
    if (!certificateHtml) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1000,height=900');
    if (!printWindow) {
      return;
    }

    printWindow.document.open();
    printWindow.document.write(certificateHtml);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 200);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center">
        <div className="text-white">Loading certificate...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Income Certificate</h1>
              <p className="mt-1 text-sm text-zinc-600">Generate a print-ready certificate for any date range using verified earnings.</p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm text-zinc-700">
                <span className="mb-1 block">From</span>
                <input
                  type="date"
                  value={draftRange.fromDate}
                  max={draftRange.toDate}
                  onChange={(event) => setDraftRange((previous) => ({ ...previous, fromDate: event.target.value }))}
                  className="h-10 rounded-md border border-zinc-300 px-3 text-zinc-900"
                />
              </label>
              <label className="text-sm text-zinc-700">
                <span className="mb-1 block">To</span>
                <input
                  type="date"
                  value={draftRange.toDate}
                  min={draftRange.fromDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setDraftRange((previous) => ({ ...previous, toDate: event.target.value }))}
                  className="h-10 rounded-md border border-zinc-300 px-3 text-zinc-900"
                />
              </label>
              <button
                type="button"
                onClick={applyDateRange}
                className="h-10 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Apply Range
              </button>
              <button
                type="button"
                onClick={handlePrint}
                disabled={!certificateHtml}
                className="h-10 rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                Print Certificate
              </button>
            </div>
          </div>

          {(errorMessage || loading) && (
            <p className={`mt-3 text-sm ${errorMessage ? 'text-red-600' : 'text-zinc-500'}`}>
              {errorMessage || 'Loading certificate...'}
            </p>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-lg border border-zinc-200 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Range</p>
              <p className="mt-1 text-sm font-semibold text-zinc-900">{certificateMeta.rangeLabel || `${fromDate} to ${toDate}`}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Verified Sessions</p>
              <p className="mt-1 text-lg font-bold text-zinc-900">{stats.totalSessions}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Total Hours</p>
              <p className="mt-1 text-lg font-bold text-zinc-900">{stats.totalHours.toFixed(1)}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Net Verified Income</p>
              <p className="mt-1 text-lg font-bold text-zinc-900">{formatCurrency(stats.totalNet)}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Certificate ID</p>
              <p className="mt-1 truncate text-sm font-semibold text-zinc-900">{certificateMeta.id || '-'}</p>
            </div>
          </div>

          {periodBreakdown.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Period</th>
                    <th className="px-3 py-2 text-right">Sessions</th>
                    <th className="px-3 py-2 text-right">Hours</th>
                    <th className="px-3 py-2 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {periodBreakdown.map((item) => (
                    <tr key={item.key} className="border-t border-zinc-100 text-zinc-800">
                      <td className="px-3 py-2">{item.label}</td>
                      <td className="px-3 py-2 text-right">{item.sessions}</td>
                      <td className="px-3 py-2 text-right">{Number(item.hours || 0).toFixed(1)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {certificateHtml ? (
            <iframe
              title="Income Certificate Preview"
              srcDoc={certificateHtml}
              sandbox="allow-same-origin"
              className="h-[980px] w-full bg-white"
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-zinc-500">Certificate preview unavailable.</div>
          )}
        </div>

        <div className="flex gap-4">
          <Link to="/worker/analytics" className="rounded-lg border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
            View Analytics
          </Link>
          <Link to="/worker/log-earnings" className="rounded-lg border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
            Log New Earnings
          </Link>
        </div>
      </div>
    </div>
  );
}