import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import toast from 'react-hot-toast';

function PaymentFailed() {
  const navigate = useNavigate();
  const location = useLocation();
  const { error } = location.state || {};

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-black selection:text-white">
      <Navbar />

      <main className="px-8 lg:px-20 py-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-2">Payment Failed</h1>
          <p className="text-gray-500 font-medium">Your payment could not be processed</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-black mb-2">Payment Declined</h2>
            <p className="text-gray-600">We were unable to process your payment</p>
          </div>

          {error && (
            <div className="mb-8 pb-8 border-b border-gray-100">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-900 font-medium">
                  <span className="font-bold">Error: </span>
                  {error}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3 mb-8">
            <button
              onClick={() => navigate('/checkout', { state: { retry: true } })}
              className="w-full bg-black text-white py-3 rounded-lg font-black uppercase tracking-wider hover:bg-gray-800 transition-all"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/payments')}
              className="w-full bg-gray-100 text-black py-3 rounded-lg font-black uppercase tracking-wider hover:bg-gray-200 transition-all"
            >
              Back to Payments
            </button>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-xs text-blue-900 font-medium mb-2">
              <span className="font-bold">Troubleshooting:</span>
            </p>
            <ul className="text-xs text-blue-900 space-y-1 list-disc list-inside">
              <li>Check your card details and try again</li>
              <li>Ensure your card is not expired</li>
              <li>Contact your bank if the issue persists</li>
              <li>Try a different payment method</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PaymentFailed;
