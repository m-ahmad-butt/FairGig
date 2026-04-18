import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setCredentials, setLoading, setError } from "../../store/slices/authSlice";
import toast from "react-hot-toast";
import authService from "../../services/api/authService";

function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({ email: "", password: "" });

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isAuthenticated, token } = useSelector((state) => state.auth);

    useEffect(() => {
        if (isAuthenticated) {
            navigate("/");
        }
    }, [isAuthenticated, navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        dispatch(setLoading(true));

        try {
            const response = await authService.login({
                email: formData.email,
                password: formData.password,
            });

            if (response.token && response.user) {
                dispatch(setCredentials({ 
                    token: response.token, 
                    user: response.user 
                }));
                toast.success("Login successful!");
                navigate("/");
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Invalid email or password.";
            toast.error(msg);
            dispatch(setError(msg));
        } finally {
            setIsLoading(false);
            dispatch(setLoading(false));
        }
    };

    return (
        <div className="flex min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
            <div className="w-full lg:w-[48%] flex flex-col justify-center px-12 lg:px-20 py-12">
                <div className="max-w-[340px] w-full mx-auto">
                    <div className="mb-12 -ml-0.5">
                        <h1 className="text-4xl font-black tracking-tighter text-black flex items-baseline">
                            FAST<span className="text-gray-300 font-bold italic ml-0.5">-Ex</span>
                        </h1>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold tracking-tight mb-1">Welcome back</h2>
                        <p className="text-sm text-gray-400 leading-relaxed font-medium">
                            Enter your credentials to access your account
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-[12px] font-bold text-gray-800 mb-2">University Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm placeholder-gray-300"
                                placeholder="l23XXX@lhr.nu.edu.pk"
                                required
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-[12px] font-bold text-gray-800">Password</label>
                                <button
                                    type="button"
                                    onClick={() => navigate("/forgot-password")}
                                    className="text-[11px] font-bold text-gray-400 hover:text-black transition-colors"
                                >
                                    Forgot password?
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm placeholder-gray-300"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-gray-400 hover:text-black"
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full bg-black text-white py-2.5 rounded-lg text-sm font-black uppercase tracking-widest transition-all hover:bg-gray-900 ${isLoading ? "opacity-50" : ""}`}
                            >
                                {isLoading ? "..." : "Sign In"}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center text-[12px] font-bold text-gray-400 uppercase tracking-tight">
                        New here? <button onClick={() => navigate("/register")} className="text-black font-black hover:underline underline-offset-4">Create account</button>
                    </div>
                </div>
            </div>

            <div className="hidden lg:block lg:w-[52%] bg-black relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/40 to-transparent flex flex-col justify-center px-20">
                    <div className="max-w-lg">
                        <h3 className="text-white text-6xl font-black italic tracking-tighter leading-[0.9] mb-8 animate-in slide-in-from-left-8 duration-700">
                            CAMPUS <br />
                            <span className="text-white/40">MARKETPLACE</span>
                        </h3>
                        <div className="space-y-2 animate-in slide-in-from-left-12 duration-1000">
                            <p className="text-white/80 text-2xl font-bold tracking-tight uppercase">
                                Buy, Sell, Exchange
                            </p>
                            <p className="text-white/50 text-xl font-medium leading-relaxed italic">
                                Your trusted student <br />
                                marketplace awaits..
                            </p>
                        </div>
                    </div>
                </div>
                <div className="absolute bottom-16 left-20 z-10 pointer-events-none">
                    <h3 className="text-white/5 text-[8rem] font-black italic tracking-[1.5rem] uppercase select-none leading-none">TRADE</h3>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
