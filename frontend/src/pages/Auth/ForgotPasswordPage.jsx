import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import authService from "../../services/api/authService";

function ForgotPasswordPage() {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [email, setEmail] = useState("");
    const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [buttonText, setButtonText] = useState("Verify Email");
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleCheckEmail = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setButtonText("Verifying Email...");

        try {
            await authService.sendOtp(email);
            toast.success("OTP sent to your email!");
            setStep(2);
            setButtonText("Verify Email");
        } catch (err) {
            console.error("Error:", err);
            toast.error(err.response?.data?.message || "Failed to send OTP. Please try again.");
            setButtonText("Verify Email");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const code = otpCode.join("");
        if (code.length < 6) {
            toast.error("Please enter the complete 6-digit code.");
            return;
        }

        setIsLoading(true);
        try {
            await authService.verifyOtp({ email, otp: code });
            toast.success("OTP verified successfully!");
            setStep(3);
        } catch (err) {
            toast.error("Invalid OTP code. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpChange = (element, index) => {
        if (isNaN(element.value)) return;
        const newOtp = [...otpCode.map((d, idx) => (idx === index ? element.value : d))];
        setOtpCode(newOtp);
        if (element.value && element.nextSibling) element.nextSibling.focus();
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        if (newPassword.length < 10) {
            toast.error("Password must be at least 10 characters.");
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,}$/;
        if (!passwordRegex.test(newPassword)) {
            toast.error("Password must contain at least 1 uppercase, 1 lowercase, 1 digit, and 1 special character.");
            return;
        }

        setIsLoading(true);
        try {
            await authService.changePassword({ email, password: newPassword });
            toast.success("Password changed successfully!");
            navigate("/login");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to change password.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
            <div className="w-full lg:w-[48%] flex flex-col justify-center px-12 lg:px-20 py-12">
                <div className="max-w-[340px] w-full mx-auto">
                    <div className="mb-10 -ml-0.5">
                        <h1 className="text-4xl font-extrabold tracking-tighter text-black flex items-baseline">
                            FAST<span className="text-gray-300 font-bold ml-0.5">-Ex</span>
                        </h1>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-2xl font-bold tracking-tight mb-1">
                            {step === 1 ? "Forgot Password?" : step === 2 ? "Enter OTP Code" : "Set new password"}
                        </h2>
                        <p className="text-sm text-gray-400 leading-relaxed font-medium">
                            {step === 1 ? "Enter your email to receive OTP" : 
                             step === 2 ? `We sent a 6-digit code to ${email}` :
                             "Create a new strong password"}
                        </p>
                    </div>

                    {step === 1 && (
                        <form onSubmit={handleCheckEmail} className="space-y-5">
                            <div>
                                <label className="block text-[12px] font-bold text-gray-800 mb-2">University Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm placeholder-gray-300"
                                    placeholder="l233067@lhr.nu.edu.pk"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full bg-black text-white py-2.5 rounded-lg text-sm font-black uppercase tracking-widest transition-all hover:bg-gray-900 ${isLoading ? "opacity-50" : ""}`}
                            >
                                {isLoading ? buttonText : "Verify Email"}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div className="flex justify-between gap-2">
                                {otpCode.map((data, index) => (
                                    <input
                                        key={index}
                                        type="text"
                                        maxLength="1"
                                        value={data}
                                        onChange={(e) => handleOtpChange(e.target, index)}
                                        onFocus={(e) => e.target.select()}
                                        className="w-11 h-11 text-center bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-lg font-black"
                                    />
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full bg-black text-white py-2.5 rounded-lg text-sm font-black uppercase tracking-widest transition-all hover:bg-gray-900 ${isLoading ? "opacity-50" : ""}`}
                            >
                                {isLoading ? "Verifying..." : "Verify OTP"}
                            </button>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleChangePassword} className="space-y-5">
                            <div>
                                <label className="block text-[12px] font-bold text-gray-800 mb-2">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm placeholder-gray-300"
                                        placeholder="New password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-extrabold uppercase text-gray-400"
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                                <div className="mt-2 space-y-1">
                                    <p className={`text-[10px] font-medium ${newPassword.length >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
                                        ✓ At least 10 characters
                                    </p>
                                    <p className={`text-[10px] font-medium ${/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                                        ✓ One uppercase letter
                                    </p>
                                    <p className={`text-[10px] font-medium ${/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                                        ✓ One lowercase letter
                                    </p>
                                    <p className={`text-[10px] font-medium ${/\d/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                                        ✓ One digit
                                    </p>
                                    <p className={`text-[10px] font-medium ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                                        ✓ One special character (!@#$%^&*)
                                    </p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[12px] font-bold text-gray-800 mb-2">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm placeholder-gray-300"
                                        placeholder="Confirm password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-extrabold uppercase text-gray-400"
                                    >
                                        {showConfirmPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full bg-black text-white py-2.5 rounded-lg text-sm font-black uppercase tracking-widest transition-all hover:bg-gray-900 ${isLoading ? "opacity-50" : ""}`}
                            >
                                {isLoading ? "..." : "Change Password"}
                            </button>
                        </form>
                    )}

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => navigate("/login")}
                            className="text-[12px] font-bold text-gray-400 uppercase tracking-tight hover:text-black transition-colors"
                        >
                            ← Back to login
                        </button>
                    </div>
                </div>
            </div>

            <div className="hidden lg:block lg:w-[52%] bg-black relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/40 to-transparent flex flex-col justify-center px-20">
                    <div className="max-w-lg">
                        <h3 className="text-white text-6xl font-black italic tracking-tighter leading-[0.9] mb-8">
                            RESET <br />
                            <span className="text-white/40">PASSWORD</span>
                        </h3>
                        <div className="space-y-2">
                            <p className="text-white/80 text-2xl font-bold tracking-tight uppercase">
                                Secure your account
                            </p>
                            <p className="text-white/50 text-xl font-medium leading-relaxed italic">
                                We'll help you get back <br />
                                to trading safely..
                            </p>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-16 left-20 z-10 pointer-events-none">
                    <h3 className="text-white/5 text-[8rem] font-black italic tracking-[1.5rem] uppercase select-none leading-none">SAFE</h3>
                </div>
            </div>
        </div>
    );
}

export default ForgotPasswordPage;
