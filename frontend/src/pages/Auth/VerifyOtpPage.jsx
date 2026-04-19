import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import toast from "react-hot-toast";
import authService from "../../services/api/authService";

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const email = location.state?.email;
  const role = location.state?.role;

  useEffect(() => {
    if (!email) {
      toast.error("Email not found. Please register again.");
      navigate("/register");
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error("OTP must be 6 digits");
      return;
    }

    setLoading(true);

    try {
      const result = await authService.verifyOTP(email, otp);

      toast.success(result.message);

      if (result.status === "active") {
        // Worker - auto approved, redirect to login
        setTimeout(() => navigate("/login"), 2000);
      } else {
        // Verifier/Advocate - pending approval
        navigate("/pending-approval", { state: { email, role } });
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);

    try {
      const result = await authService.resendOTP(email);
      toast.success(result.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 11c0 1.657-1.343 3-3 3S6 12.657 6 11s1.343-3 3-3 3 1.343 3 3zm6 0v2a9 9 0 11-18 0v-2m18 0V9a6 6 0 00-12 0v2m12 0H6"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Verify your email
          </h2>
          <p className="mt-2 text-gray-600">
            We sent a 6-digit code to <strong>{email}</strong>
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Enter OTP
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-center text-lg tracking-[0.35em] font-semibold text-gray-900"
              placeholder="000000"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-black text-white font-medium rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </div>

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resending}
              className="text-black font-medium hover:underline disabled:opacity-50"
            >
              {resending ? "Resending..." : "Resend OTP"}
            </button>

            <div>
              <Link
                to="/register"
                className="text-gray-600 hover:text-black transition-colors"
              >
                Back to registration
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
