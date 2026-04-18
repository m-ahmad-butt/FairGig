import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPaymentIntent, setLoading, setError } from '../store/slices/transactionsSlice';
import Navbar from '../components/Navbar/Navbar';
import transactionService from '../services/api/transactionService';
import toast from 'react-hot-toast';

function PaymentsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const plans = useMemo(() => [
    {
      id: 1,
      amount: 10,
      name: 'Starter',
      description: 'Perfect for getting started',
      features: ['Basic features', 'Email support', '1 month access'],
      popular: false,
    },
    {
      id: 2,
      amount: 50,
      name: 'Pro',
      description: 'Most popular choice',
      features: ['All features', 'Priority support', '6 months access', 'Bonus credits'],
      popular: true,
    },
    {
      id: 3,
      amount: 100,
      name: 'Premium',
      description: 'Best value for money',
      features: ['All features', '24/7 support', '1 year access', 'Extra bonus credits', 'Early access'],
      popular: false,
    },
  ], []);

  const handleSelectPlan = async (plan) => {
    try {
      dispatch(setLoading(true));
      const response = await transactionService.createPaymentIntent(
        plan.amount,
        `${plan.name} Plan - ${plan.description}`,
        token
      );
      
      // Redirect to Stripe's hosted checkout page
      if (response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
      } else {
        toast.error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Payment intent error:', error);
      toast.error('Failed to initiate payment');
      dispatch(setError(error.message));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const savings = useMemo(() => {
    return {
      50: Math.round(((10 * 6 - 50) / (10 * 6)) * 100),
      100: Math.round(((10 * 12 - 100) / (10 * 12)) * 100),
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-black selection:text-white">
      <Navbar />

      <main className="px-8 lg:px-20 py-12 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black tracking-tight mb-4">Choose Your Plan</h1>
          <p className="text-lg text-gray-500 font-medium">Select the perfect plan for your needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white border-2 rounded-2xl p-8 transition-all hover:shadow-xl ${
                plan.popular ? 'border-black' : 'border-gray-100'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-black text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-black mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-500 font-medium mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-black">${plan.amount}</span>
                  {plan.amount > 10 && (
                    <span className="text-sm font-bold text-green-600">Save {savings[plan.amount]}%</span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan)}
                className={`w-full py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
                  plan.popular
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-100 text-black hover:bg-gray-200'
                }`}
              >
                Select Plan
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8">
          <h2 className="text-2xl font-black mb-6">Payment Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-black mb-4">Secure Payment</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">SSL encrypted payment</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">PCI DSS compliant</span>
                </li>
                <li className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Powered by Stripe</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-black mb-4">Accepted Payment Methods</h3>
              <div className="flex flex-wrap gap-4">
                <div className="bg-gray-50 px-4 py-2 rounded-lg">
                  <span className="text-sm font-black">VISA</span>
                </div>
                <div className="bg-gray-50 px-4 py-2 rounded-lg">
                  <span className="text-sm font-black">Mastercard</span>
                </div>
                <div className="bg-gray-50 px-4 py-2 rounded-lg">
                  <span className="text-sm font-black">AMEX</span>
                </div>
                <div className="bg-gray-50 px-4 py-2 rounded-lg">
                  <span className="text-sm font-black">Discover</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PaymentsPage;
