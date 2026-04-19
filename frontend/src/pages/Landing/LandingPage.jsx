import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../store/slices/authSlice";
import FairGigLogo from "../../components/Brand/FairGigLogo";

const HERO_CARDS = [
  {
    title: "Log Work Sessions",
    image: "/open_peeps/runner.png",
  },
  {
    title: "Track Growth",
    image: "/open_peeps/growth.png",
  },
  {
    title: "Resolve Issues",
    image: "/open_peeps/pondering.png",
  },
];

const FEATURE_CARDS = [
  {
    title: "Daily Earnings Tracking",
    description:
      "Log shifts, trips, gross income, deductions, and net received in one flow.",
    image: "/open_peeps/chillin.png",
  },
  {
    title: "Evidence And Verification",
    description:
      "Attach proof for sessions so verifiers can review transparently and quickly.",
    image: "/open_peeps/waiting.png",
  },
  {
    title: "Worker-Focused Insights",
    description:
      "Understand your trend and export reports for certificate and support use cases.",
    image: "/open_peeps/new-beginnings.png",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "1",
    title: "Create Account",
    description:
      "Register, verify OTP, and complete profile with your worker category and location.",
  },
  {
    step: "2",
    title: "Log Earnings",
    description:
      "Add single sessions or bulk import CSV with clean, guided validation.",
  },
  {
    step: "3",
    title: "Review And Improve",
    description:
      "Use dashboards, community input, and insights to improve your weekly income.",
  },
];

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (error) {
    return null;
  }
}

function getDashboardPath(role) {
  const normalizedRole = String(role || "").toLowerCase();

  if (normalizedRole === "worker") {
    return "/worker/dashboard";
  }

  if (normalizedRole === "admin") {
    return "/admin/dashboard";
  }

  if (normalizedRole === "verifier") {
    return "/verifier/dashboard";
  }

  if (normalizedRole === "advocate") {
    return "/advocate/dashboard";
  }

  return "/dashboard";
}

function LandingPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const authState = useSelector((state) => state.auth);

  const isAuthenticated = Boolean(authState?.isAuthenticated);
  const user = authState?.user || getStoredUser();
  const dashboardPath = useMemo(
    () => getDashboardPath(user?.role),
    [user?.role],
  );

  const handleSignOut = () => {
    dispatch(logout());
    navigate("/");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-50 text-zinc-900 selection:bg-zinc-900 selection:text-white">
      <nav className="fixed top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <button onClick={() => navigate("/")} className="text-left">
            <FairGigLogo
              size={36}
              wordmarkClassName="text-2xl font-black tracking-tight text-zinc-900"
            />
          </button>

          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="rounded-md px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate("/register")}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
                >
                  Join FairGig
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate(dashboardPath)}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
                >
                  Open Dashboard
                </button>
                <button
                  onClick={handleSignOut}
                  className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-20">
        <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="space-y-8">
            <div className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Worker-first earnings management
            </div>

            <div className="space-y-4">
              <h2 className="text-4xl font-black tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
                Log smarter.
                <br />
                Verify faster.
                <br />
                Earn better.
              </h2>
              <p className="max-w-xl text-lg leading-relaxed text-zinc-600">
                FairGig helps workers track session earnings, upload evidence,
                and build financial credibility through a clean, reliable
                workflow.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!isAuthenticated ? (
                <>
                  <button
                    onClick={() => navigate("/register")}
                    className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
                  >
                    Create Account
                  </button>
                  <button
                    onClick={() => navigate("/login")}
                    className="rounded-lg border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <button
                  onClick={() => navigate(dashboardPath)}
                  className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
                >
                  Continue To Dashboard
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {HERO_CARDS.map((card, index) => (
              <div
                key={card.title}
                className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-transform duration-300 hover:-translate-y-1 ${
                  index === 0 ? "sm:col-span-2" : ""
                }`}
              >
                <img
                  src={card.image}
                  alt={card.title}
                  className={`mx-auto w-full object-contain ${index === 0 ? "max-h-44" : "max-h-36"}`}
                />
                <p className="mt-3 text-center text-sm font-semibold text-zinc-700">
                  {card.title}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {FEATURE_CARDS.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="mx-auto mb-4 h-28 w-full object-contain"
                />
                <h3 className="text-lg font-semibold text-zinc-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-zinc-900 px-6 py-12 text-white sm:px-10">
            <div className="mb-8">
              <h3 className="text-3xl font-black tracking-tight">
                How FairGig Works
              </h3>
              <p className="mt-2 text-zinc-300">
                A focused flow built for workers and support teams.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {WORKFLOW_STEPS.map((item) => (
                <div
                  key={item.step}
                  className="rounded-2xl border border-zinc-700 bg-zinc-800/70 p-5"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-base font-black text-zinc-900">
                    {item.step}
                  </div>
                  <h4 className="text-lg font-semibold text-white">
                    {item.title}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;
