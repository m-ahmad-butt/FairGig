import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import transactionService from '../services/api/transactionService';
import Navbar from '../components/Navbar/Navbar';
import toast from 'react-hot-toast';

function CheckoutForm({ amount, description }) {
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      const response = await transactionService.createPaymentIntent(
        amount,
        description,
        token
      );

      if (response.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = response.checkoutUrl;
      } else {
        toast.error('Failed to create checkout session');
      }
    } catch (error) {
      toast.error('Payment failed: ' + error.message);
      navigate('/payments/failed', { state: { error: error.message } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900 font-medium">
          You will be redirected to Stripe's secure checkout page to complete your payment.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-black text-white py-3 rounded-lg font-black uppercase tracking-wider hover:bg-gray-800 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {loading ? 'Redirecting...' : `Pay $${amount}`}
      </button>
    </form>
  );
}

function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { amount, description } = location.state || {};

  useEffect(() => {
    if (!amount) {
      navigate('/payments');
    }
  }, [amount, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-black selection:text-white">
      <Navbar />

      <main className="px-8 lg:px-20 py-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-2">Checkout</h1>
          <p className="text-gray-500 font-medium">Complete your payment</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8">
          <div className="mb-8 pb-8 border-b border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-gray-500 uppercase">Amount</span>
              <span className="text-3xl font-black">${amount}</span>
            </div>
            <p className="text-sm text-gray-600">{description}</p>
          </div>

          <CheckoutForm amount={amount} description={description} />

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/payments')}
              className="text-sm font-bold text-gray-600 hover:text-black transition-colors"
            >
              Cancel Payment
            </button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-xs text-blue-900 font-medium">
            Your payment is secured by Stripe. We do not store your card details.
          </p>
        </div>
      </main>
    </div>
  );
}

export default CheckoutPage;
