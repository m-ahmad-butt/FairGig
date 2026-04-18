import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setTransactions, setLoading, setError } from '../store/slices/transactionsSlice';
import Navbar from '../components/Navbar/Navbar';
import transactionService from '../services/api/transactionService';
import toast from 'react-hot-toast';

function TransactionsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { transactions = [], loading } = useSelector((state) => state.transactions);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      dispatch(setLoading(true));
      const response = await transactionService.getMyTransactions();
      dispatch(setTransactions(response.transactions || response || []));
    } catch (error) {
      toast.error('Failed to load transactions');
      dispatch(setError(error.message));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [transactions, filterStatus, searchQuery]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [filteredTransactions]);

  const totalStats = useMemo(() => {
    const completedTransactions = transactions.filter(t => t.status === 'COMPLETED');
    return {
      total: completedTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
      succeeded: transactions.filter(t => t.status === 'COMPLETED').length,
      pending: transactions.filter(t => t.status === 'PENDING').length,
      failed: transactions.filter(t => t.status === 'FAILED').length,
    };
  }, [transactions]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'FAILED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-black selection:text-white">
      <Navbar />

      <main className="px-8 lg:px-20 py-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Transactions</h1>
            <p className="text-gray-500 font-medium">View your payment history</p>
          </div>
          <button
            onClick={() => navigate('/payments')}
            className="bg-black text-white px-6 py-2 rounded-lg text-sm font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
          >
            Add Funds
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Total Spent</p>
            <p className="text-3xl font-black">${totalStats.total.toFixed(2)}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Succeeded</p>
            <p className="text-3xl font-black text-green-600">{totalStats.succeeded}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Pending</p>
            <p className="text-3xl font-black text-yellow-600">{totalStats.pending}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Failed</p>
            <p className="text-3xl font-black text-red-600">{totalStats.failed}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black text-sm"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black text-sm font-bold"
            >
              <option value="all">All Status</option>
              <option value="succeeded">Succeeded</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400 font-medium">Loading transactions...</p>
          </div>
        ) : sortedTransactions.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl">
            <svg className="w-20 h-20 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <h3 className="text-2xl font-black mb-2">No transactions yet</h3>
            <p className="text-gray-400 font-medium mb-6">Start by adding funds to your account</p>
            <button
              onClick={() => navigate('/payments')}
              className="bg-black text-white px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
            >
              Add Funds
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">{transaction.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-black">
                        ${transaction.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${getStatusColor(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/transactions/${transaction.id}`)}
                          className="text-sm font-bold text-black hover:underline"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default TransactionsPage;
