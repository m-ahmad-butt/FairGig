import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../store/slices/authSlice";

function LandingPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isAuthenticated } = useSelector((state) => state.auth);

    const handleSignOut = () => {
        dispatch(logout());
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white overflow-x-hidden">
            <nav className="flex justify-between items-center px-6 lg:px-20 py-3 fixed top-0 w-full bg-white z-50 shadow-sm">
                <div className="flex items-baseline">
                    <h1 className="text-3xl font-black tracking-tighter">
                        FAST<span className="text-gray-300 font-bold italic ml-0.5">-Ex</span>
                    </h1>
                </div>
                <div className="flex gap-6 items-center">
                    {!isAuthenticated ? (
                        <>
                            <button onClick={() => navigate("/login")} className="text-sm font-black uppercase tracking-widest hover:text-gray-500 transition-colors">Sign In</button>
                            <button onClick={() => navigate("/register")} className="bg-black text-white px-6 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-black/10">Join Now</button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => navigate("/")} className="bg-black text-white px-6 py-2.5 rounded-lg text-sm font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-black/10">Go Home</button>
                            <button onClick={handleSignOut} className="text-sm font-black uppercase tracking-widest hover:text-gray-500 transition-colors">Sign Out</button>
                        </>
                    )}
                </div>
            </nav>

            <main className="pt-8 lg:pt-24 pb-20 px-8 lg:px-20 overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                    <div className="w-full lg:w-3/5 space-y-4 relative z-10">
                        <div className="space-y-6">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-400 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                Exclusive for FAST-NUCES Students
                            </h2>
                            <h3 className="text-6xl lg:text-8xl font-black italic tracking-tighter leading-[0.85] animate-in fade-in slide-in-from-bottom-4 duration-700">
                                BUY. SELL. <br />
                                EXCHANGE. <br />
                                <span className="text-gray-200">RENT IT ALL!</span>
                            </h3>
                        </div>

                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                            <p className="text-2xl lg:text-3xl font-bold tracking-tight text-gray-800 leading-snug">
                                Your campus marketplace. <br />
                                <span className="italic font-black text-black underline decoration-gray-200 underline-offset-8">Safe. Verified. Trusted.</span>
                            </p>
                            <p className="text-gray-400 max-w-md font-medium leading-relaxed">
                                Join the FASTest growing student marketplace.
                                Buy textbooks, sell gadgets, rent equipment, or exchange items.
                                Simple, secure, and made specifically for NUCES students.
                            </p>
                        </div>

                        <div className="flex gap-4 pt-2 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                            <button onClick={() => navigate("/register")} className="bg-black text-white px-10 py-4 rounded-xl text-md font-black uppercase tracking-[0.2em] hover:bg-gray-900 transition-all shadow-2xl shadow-black/20">
                                Get Started
                            </button>
                            <button onClick={() => navigate("/login")} className="border-2 border-gray-100 px-10 py-4 rounded-xl text-md font-black uppercase tracking-[0.2em] hover:bg-gray-50 transition-all">
                                Login
                            </button>
                        </div>
                    </div>

                    <div className="hidden lg:block lg:w-2/5 relative animate-in fade-in slide-in-from-right-12 duration-1000">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full aspect-square bg-gray-50 rounded-full -z-10 animate-pulse duration-[5000ms]"></div>

                        <div className="relative grid grid-cols-2 gap-4">
                            <div className="space-y-4 pt-20">
                                <div className="bg-white border-2 border-gray-100 p-4 rounded-3xl transform -rotate-6 hover:rotate-0 transition-transform cursor-pointer group">
                                    <img src="/open_peeps/experiments.png" alt="Student" className="w-full transition-transform" />
                                    <p className="text-[10px] font-black uppercase text-center mt-2 tracking-widest">Sell Items</p>
                                </div>
                                <div className="bg-white border-2 border-gray-100 p-4 rounded-3xl transform rotate-3 hover:translate-y-[-10px] transition-transform cursor-pointer group">
                                    <img src="/open_peeps/consumer.png" alt="Student" className="w-full transition-transform" />
                                    <p className="text-[10px] font-black uppercase text-center mt-2 tracking-widest text-black">Buy Stuff</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-white border-2 border-gray-100 p-4 rounded-3xl transform rotate-6 hover:rotate-0 transition-transform cursor-pointer group">
                                    <img src="/open_peeps/growth.png" alt="Student" className="w-full transition-transform" />
                                    <p className="text-[10px] font-black uppercase text-center mt-2 tracking-widest text-black">Exchange</p>
                                </div>
                                <div className="bg-white border-2 border-gray-100 p-4 rounded-3xl transform -rotate-3 hover:rotate-2 transition-transform cursor-pointer group">
                                    <img src="/open_peeps/entertainment.png" alt="Student" className="w-full transition-transform" />
                                    <p className="text-[10px] font-black uppercase text-center mt-2 tracking-widest">Rent Out</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <section className="bg-black py-24 text-white">
                <div className="max-w-7xl mx-auto px-8 lg:px-20 grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="space-y-4 group">
                        <h4 className="text-5xl font-black italic tracking-tighter group-hover:text-gray-400 transition-colors italic uppercase">VERIFIED</h4>
                        <p className="text-gray-500 font-medium">Built specifically for FAST NUCES students across all campuses. Only verified university accounts can access.</p>
                    </div>
                    <div className="space-y-4 group">
                        <h4 className="text-5xl font-black italic tracking-tighter group-hover:text-gray-400 transition-colors italic uppercase">SECURE</h4>
                        <p className="text-gray-500 font-medium">Reputation-based system. Rate buyers and sellers. Build trust within the community.</p>
                    </div>
                    <div className="space-y-4 group">
                        <h4 className="text-5xl font-black italic tracking-tighter group-hover:text-gray-400 transition-colors italic uppercase">SIMPLE</h4>
                        <p className="text-gray-500 font-medium">List items in seconds. Chat with buyers. Complete transactions safely on campus.</p>
                    </div>
                </div>
            </section>

            <section className="py-24 px-8 lg:px-20">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h3 className="text-5xl lg:text-6xl font-black tracking-tighter mb-4">How It Works</h3>
                        <p className="text-gray-400 font-medium text-lg">Three simple steps to start trading</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center text-2xl font-black mb-6">1</div>
                            <h4 className="text-2xl font-black mb-3 uppercase tracking-tight">Create Listing</h4>
                            <p className="text-gray-500 font-medium">Post what you want to sell, rent, or exchange. Add photos, set your price, and describe your item.</p>
                        </div>
                        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center text-2xl font-black mb-6">2</div>
                            <h4 className="text-2xl font-black mb-3 uppercase tracking-tight">Connect</h4>
                            <p className="text-gray-500 font-medium">Chat with interested buyers or sellers. Negotiate prices. Arrange meetups on campus.</p>
                        </div>
                        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center text-2xl font-black mb-6">3</div>
                            <h4 className="text-2xl font-black mb-3 uppercase tracking-tight">Complete Deal</h4>
                            <p className="text-gray-500 font-medium">Meet safely on campus. Complete the transaction. Rate each other to build reputation.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default LandingPage;
