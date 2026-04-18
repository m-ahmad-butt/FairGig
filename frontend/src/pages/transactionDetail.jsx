import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import transactionService from '../services/api/transactionService';
import Navbar from '../components/Navbar/Navbar';
import toast from 'react-hot-toast';

function TransactionDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token } = useSelector((state) => state.auth);
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactionDetail();
  }, [id]);

  const fetchTransactionDetail = async () => {
    try {
      setLoading(true);
      const response = await transactionService.getTransactionDetails(id);
      setTransaction(response.transaction);
    } catch (error) {
      toast.error('Failed to load transaction details');
      navigate('/transactions');
    } finally {
      setLoading(false);
    }
  };

  const statusColor = useMemo(() => {
    if (!transaction) return 'gray';
    switch (transaction.status) {
      case 'completed':
        return 'green';
      case 'pending':
        return 'yellow';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
  }, [transaction]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-black font-sans">
        <Navbar />
        <main className="px-8 lg:px-20 py-8 max-w-4xl mx-auto">
          <div className="text-center py-20">
            <p className="text-gray-400 font-medium">Loading transaction details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!transaction) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-black selection:text-white">
      <Navbar />

      <main className="px-8 lg:px-20 py-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/transactions')}
            className="text-sm font-bold text-gray-600 hover:text-black transition-colors mb-4"
          >
            Back to Transactions
          </button>
          <h1 className="text-3xl font-black tracking-tight mb-2">Transaction Details</h1>
          <p className="text-gray-500 font-medium">View complete transaction information</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8">
          <div className="flex items-center justify-between mb-8 pb-8 border-b border-gray-100">
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase mb-2">Amount</p>
              <p className="text-4xl font-black">${transaction.amount}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-black uppercase bg-${statusColor}-100 text-${statusColor}-700`}>
              {transaction.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase mb-2">Transaction ID</p>
              <p className="text-sm font-mono text-gray-900">{transaction.id}</p>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-500 uppercase mb-2">Payment Method</p>
              <p className="text-sm font-medium text-gray-900">{transaction.paymentMethod || 'Card'}</p>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-500 uppercase mb-2">Date</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date(transaction.createdAt).toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-500 uppercase mb-2">Description</p>
              <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
            </div>

            {transaction.stripePaymentIntentId && (
              <div className="md:col-span-2">
                <p className="text-sm font-bold text-gray-500 uppercase mb-2">Stripe Payment Intent ID</p>
                <p className="text-sm font-mono text-gray-900">{transaction.stripePaymentIntentId}</p>
              </div>
            )}
          </div>

          {transaction.status === 'completed' && (
            <div className="mt-8 p-4 bg-green-50 border border-green-100 rounded-lg">
              <p className="text-sm text-green-900 font-medium">
                This transaction was completed successfully
              </p>
            </div>
          )}

          {transaction.status === 'failed' && (
            <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-sm text-red-900 font-medium">
                This transaction failed. Please try again or contact support.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default TransactionDetailPage;
