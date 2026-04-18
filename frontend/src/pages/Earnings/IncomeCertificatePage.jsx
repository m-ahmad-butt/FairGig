import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import earningsService from '../../services/api/earningsService';
import authService from '../../services/api/authService';

const formatCurrency = (value) => `PKR ${Number(value || 0).toLocaleString()}`;

export default function IncomeCertificatePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState([]);
  const [stats, setStats] = useState({});
  
  const year = searchParams.get('year') || new Date().getFullYear().toString();
  const user = authService.getUser();
  const workerId = user?.id || user?._id;
  const workerName = user?.name || 'Worker';

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    setLoading(true);
    try {
      const sessions = await earningsService.getWorkSessions(workerId);
      const allEarnings = await earningsService.getEarningsByWorker(workerId);
      
      const yearStart = new Date(`${year}-01-01`);
      const yearEnd = new Date(`${year}-12-31`);
      
      const verifiedInYear = sessions.filter(s => {
        const sessionDate = new Date(s.session_date);
        return s.evidance?.verified === true && sessionDate >= yearStart && sessionDate <= yearEnd;
      });
      
      const enriched = verifiedInYear.map(session => {
        const earning = allEarnings.find(e => e.session_id === session.id);
        return { ...session, earning: earning || null };
      }).filter(s => s.earning);
      
      setEarnings(enriched);
      
      const totalNet = enriched.reduce((sum, s) => sum + (s.earning?.net_received || 0), 0);
      const totalGross = enriched.reduce((sum, s) => sum + (s.earning?.gross_earned || 0), 0);
      const totalHours = enriched.reduce((sum, s) => sum + (s.hours_worked || 0), 0);
      
      setStats({
        totalNet,
        totalGross,
        totalSessions: enriched.length,
        totalHours,
        year: parseInt(year)
      });
    } catch (error) {
      console.error('Failed to load certificate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const getMonthlyData = () => {
    const monthly = Array(12).fill(0).map(() => ({ net: 0, sessions: 0, hours: 0 }));
    
    earnings.forEach(e => {
      const month = new Date(e.session_date).getMonth();
      monthly[month].net += e.earning?.net_received || 0;
      monthly[month].sessions += 1;
      monthly[month].hours += e.hours_worked || 0;
    });
    
    return monthly;
  };

  const monthlyData = getMonthlyData();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center">
        <div className="text-white">Loading certificate...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 no-print">
          <div>
            <h1 className="text-2xl font-bold">Income Certificate</h1>
            <p className="text-gray-400">Verified earnings for {year}</p>
          </div>
          <div className="flex gap-4">
            <select
              value={year}
              onChange={(e) => setSearchParams({ year: e.target.value })}
              className="bg-[#1e1e1e] border border-gray-700 rounded-lg px-4 py-2 text-white"
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={handlePrint}
              className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-gray-200"
            >
              Print Certificate
            </button>
          </div>
        </div>

        <div className="print:bg-white print:text-black">
          <div 
            className="bg-white text-black rounded-xl p-8"
            id="certificate"
            style={{ minHeight: '800px' }}
          >
            <div className="text-center border-b-2 border-black pb-6 mb-6">
              <h1 className="text-3xl font-bold uppercase tracking-wider">FairGig</h1>
              <p className="text-lg mt-2">Income Certificate</p>
              <p className="text-sm mt-1">Fiscal Year {year}</p>
            </div>

            <div className="mb-8">
              <div className="flex justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">Worker Name</p>
                  <p className="text-xl font-bold">{workerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Certificate Date</p>
                  <p className="font-medium">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="border border-gray-300 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
              </div>
              <div className="border border-gray-300 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold">{stats.totalHours?.toFixed(1)}</p>
              </div>
              <div className="border border-gray-300 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">Total Net Income</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalNet)}</p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-bold text-lg mb-4">Monthly Breakdown</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2">Month</th>
                    <th className="text-right py-2">Sessions</th>
                    <th className="text-right py-2">Hours</th>
                    <th className="text-right py-2">Net Income</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((month, idx) => (
                    <tr key={month} className="border-b border-gray-200">
                      <td className="py-2">{month}</td>
                      <td className="text-right">{monthlyData[idx].sessions}</td>
                      <td className="text-right">{monthlyData[idx].hours?.toFixed(1)}</td>
                      <td className="text-right font-medium">{formatCurrency(monthlyData[idx].net)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-bold">
                    <td className="py-2">Total</td>
                    <td className="text-right">{stats.totalSessions}</td>
                    <td className="text-right">{stats.totalHours?.toFixed(1)}</td>
                    <td className="text-right">{formatCurrency(stats.totalNet)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="text-center text-sm text-gray-600 mt-12 pt-6 border-t border-gray-300">
              <p>This certificate is generated based on verified work sessions on the FairGig platform.</p>
              <p className="mt-1">Certificate ID: FG-{year}-{workerId?.slice(0, 8)}-{Date.now()}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-4 no-print">
          <Link to="/worker/analytics" className="bg-[#1e1e1e] text-white px-6 py-3 rounded-xl hover:bg-gray-800">
            View Analytics
          </Link>
          <Link to="/worker/log-earnings" className="bg-[#1e1e1e] text-white px-6 py-3 rounded-xl hover:bg-gray-800">
            Log New Earnings
          </Link>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #certificate { 
            box-shadow: none !important; 
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}