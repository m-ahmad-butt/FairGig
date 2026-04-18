import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import transactionService from '../services/api/transactionService';
import toast from 'react-hot-toast';

function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const sessionId = searchParams.get('session_id');
        
        if (!sessionId) {
          toast.error('Invalid session');
          navigate('/payments');
          return;
        }

        // Verify the payment with backend
        const response = await transactionService.verifyPayment(sessionId);
        setTransaction(response);
        toast.success('Payment successful!');
      } catch (error) {
        console.error('Payment verification failed:', error);
        toast.error('Failed to verify payment');
        navigate('/payments');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-black font-sans">
        <Navbar />
        <main className="px-8 lg:px-20 py-8 max-w-2xl mx-auto">
          <div className="text-center">
            <p className="text-gray-600">Verifying payment...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-black selection:text-white">
      <Navbar />

      <main className="px-8 lg:px-20 py-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-2">Payment Successful</h1>
          <p className="text-gray-500 font-medium">Thank you for your payment</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-black mb-2">Payment Confirmed</h2>
            <p className="text-gray-600">Your payment has been processed successfully</p>
          </div>

          {transaction && (
            <div className="space-y-4 mb-8 pb-8 border-b border-gray-100">
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction ID</span>
                <span className="font-bold">{transaction.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount</span>
                <span className="font-bold">${transaction.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status</span>
                <span className="font-bold text-green-600">{transaction.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date</span>
                <span className="font-bold">{new Date(transaction.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-black text-white py-3 rounded-lg font-black uppercase tracking-wider hover:bg-gray-800 transition-all"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate('/payments')}
              className="w-full bg-gray-100 text-black py-3 rounded-lg font-black uppercase tracking-wider hover:bg-gray-200 transition-all"
            >
              Back to Payments
            </button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded-lg">
          <p className="text-xs text-green-900 font-medium">
            A confirmation email has been sent to your registered email address.
          </p>
        </div>
      </main>
    </div>
  );
}

export default PaymentSuccess;
