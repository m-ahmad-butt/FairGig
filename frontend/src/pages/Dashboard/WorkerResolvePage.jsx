import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { AlertTriangle, UploadCloud, Wrench } from "lucide-react";
import authService from "../../services/api/authService";
import earningsService from "../../services/api/earningsService";
import Navbar from "../../components/Navigation/Navbar";
import { getPlatformOptions } from "../../utils/workerProfileOptions";

const ALLOWED_UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-PK")}`;
}

function formatPlatformLabel(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toDateInput(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().split("T")[0];
}

function toTimeInput(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
}

function combineDateAndTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) {
    return null;
  }

  const [hours, minutes] = timeValue.split(":").map(Number);
  const date = new Date(`${dateValue}T00:00:00`);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function calculateHoursWorked(startDate, endDate) {
  if (!startDate || !endDate) {
    return 0;
  }

  const milliseconds = endDate.getTime() - startDate.getTime();
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return 0;
  }

  return Number((milliseconds / (1000 * 60 * 60)).toFixed(2));
}

export default function WorkerResolvePage() {
  const navigate = useNavigate();
  const { session_id } = useParams();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeOption, setActiveOption] = useState("upload");
  const [completed, setCompleted] = useState(false);

  const [session, setSession] = useState(null);
  const [earning, setEarning] = useState(null);
  const [evidence, setEvidence] = useState(null);

  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidencePreview, setEvidencePreview] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    platform: "",
    sessionDate: "",
    startTime: "",
    endTime: "",
    tripsCompleted: "",
    grossEarned: "",
    platformDeductions: "",
  });

  const workerId = user?.id || user?._id;
  const workerCategory =
    String(user?.category || "").toLowerCase() === "freelance"
      ? "freelance"
      : "rider";

  const platformOptions = useMemo(() => {
    const options = getPlatformOptions(workerCategory);
    if (
      !formData.platform ||
      options.some((option) => option.value === formData.platform)
    ) {
      return options;
    }

    return [
      ...options,
      {
        value: formData.platform,
        label: formatPlatformLabel(formData.platform),
      },
    ];
  }, [workerCategory, formData.platform]);

  const calculatedNet = useMemo(() => {
    const gross = Number(formData.grossEarned || 0);
    const deductions = Number(formData.platformDeductions || 0);
    return Math.max(0, gross - deductions);
  }, [formData.grossEarned, formData.platformDeductions]);

  useEffect(() => {
    loadData();
  }, [session_id]);

  const loadData = async () => {
    setLoading(true);

    try {
      const profile = await authService.getMe();
      setUser(profile);

      if (profile.role !== "worker") {
        navigate("/");
        return;
      }

      const currentWorkerId = profile.id || profile._id;

      const [sessionData, earningResponse, evidenceResponse] =
        await Promise.all([
          earningsService.getWorkSessionById(session_id),
          earningsService.getEarningBySession(session_id),
          earningsService.getEvidenceBySession(session_id),
        ]);

      const earningData = Array.isArray(earningResponse)
        ? earningResponse[0] || null
        : earningResponse;
      const evidenceData = Array.isArray(evidenceResponse)
        ? evidenceResponse[0] || null
        : evidenceResponse;

      if (!sessionData || !earningData || !evidenceData) {
        throw new Error(
          "Missing session, earning, or evidence data for this resolve flow.",
        );
      }

      if (
        sessionData.worker_id &&
        currentWorkerId &&
        sessionData.worker_id !== currentWorkerId
      ) {
        toast.error("You can only resolve your own evidence.");
        navigate("/worker/dashboard");
        return;
      }

      setSession(sessionData);
      setEarning(earningData);
      setEvidence(evidenceData);

      setFormData({
        platform: sessionData.platform || "",
        sessionDate: toDateInput(sessionData.session_date),
        startTime: toTimeInput(sessionData.start_time),
        endTime: toTimeInput(sessionData.end_time),
        tripsCompleted: String(sessionData.trips_completed ?? ""),
        grossEarned: String(earningData.gross_earned ?? ""),
        platformDeductions: String(earningData.platform_deductions ?? ""),
      });
    } catch (error) {
      console.error("Failed to load resolve page data:", error);
      toast.error("Failed to load resolve details");
      navigate("/worker/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      toast.error("Only JPG, PNG, or WebP images are allowed");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }

    setEvidenceFile(file);
    setEvidencePreview(URL.createObjectURL(file));
  };

  const handleReuploadEvidence = async () => {
    if (!evidenceFile) {
      toast.error("Please select a replacement image first");
      return;
    }

    if (!workerId || !evidence?.id) {
      toast.error("Missing worker or evidence context");
      return;
    }

    setSubmitting(true);
    try {
      const uploadResult = await earningsService.uploadEvidenceFile(
        session_id,
        evidenceFile,
        workerId,
      );

      await earningsService.updateEvidence(evidence.id, {
        image_url: uploadResult.imageUrl,
        status: "pending",
        verified: false,
      });

      setCompleted(true);
    } catch (error) {
      console.error("Failed to re-upload evidence:", error);
      toast.error(error.message || "Failed to re-upload evidence");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCorrectData = async () => {
    if (!session?.id || !earning?.id || !evidence?.id) {
      toast.error("Missing session, earning, or evidence reference");
      return;
    }

    if (
      !formData.platform ||
      !formData.sessionDate ||
      !formData.startTime ||
      !formData.endTime
    ) {
      toast.error("Please complete platform, date, and time fields");
      return;
    }

    const startDate = combineDateAndTime(
      formData.sessionDate,
      formData.startTime,
    );
    const endDate = combineDateAndTime(formData.sessionDate, formData.endTime);
    if (!startDate || !endDate || endDate <= startDate) {
      toast.error("End time must be after start time");
      return;
    }

    const tripsCompleted = Number(formData.tripsCompleted);
    const grossEarned = Number(formData.grossEarned);
    const platformDeductions = Number(formData.platformDeductions);

    if (!Number.isInteger(tripsCompleted) || tripsCompleted < 0) {
      toast.error("Trips completed must be a non-negative integer");
      return;
    }

    if (!Number.isFinite(grossEarned) || grossEarned < 0) {
      toast.error("Gross earned must be a non-negative number");
      return;
    }

    if (!Number.isFinite(platformDeductions) || platformDeductions < 0) {
      toast.error("Platform deductions must be a non-negative number");
      return;
    }

    if (platformDeductions > grossEarned) {
      toast.error("Deductions cannot exceed gross earned");
      return;
    }

    const hoursWorked = calculateHoursWorked(startDate, endDate);
    const netReceived = Math.max(0, grossEarned - platformDeductions);

    setSubmitting(true);
    try {
      await Promise.all([
        earningsService.updateWorkSession(session.id, {
          platform: formData.platform,
          session_date: formData.sessionDate,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          hours_worked: hoursWorked,
          trips_completed: tripsCompleted,
        }),
        earningsService.updateEarning(earning.id, {
          gross_earned: grossEarned,
          platform_deductions: platformDeductions,
          net_received: netReceived,
        }),
      ]);

      await earningsService.updateEvidence(evidence.id, {
        status: "pending",
        verified: false,
      });

      setCompleted(true);
    } catch (error) {
      console.error("Failed to save corrected data:", error);
      toast.error(error.message || "Failed to save corrected data");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <div className="text-zinc-600">Loading resolve flow...</div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-zinc-100">
        <Navbar user={user} />

        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <svg
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-emerald-900">
              Your submission has been requeued for review.
            </h1>
            <p className="mt-2 text-sm text-emerald-700">
              A verifier will review your updated evidence and corrected data in
              the next queue cycle.
            </p>
            <button
              type="button"
              onClick={() => navigate("/worker/dashboard")}
              className="mt-6 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
            >
              Back to Worker Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 pb-8">
      <Navbar user={user} />

      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mb-5">
          <Link
            to="/worker/dashboard"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl">
            Resolve Verification Issue
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Session #{String(session_id || "").slice(0, 8)}...
          </p>
        </div>

        <div
          className={`mb-6 rounded-xl border p-4 shadow-sm ${
            evidence?.status === "unverifiable"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Reviewer note:</p>
              <p className="mt-1 text-sm">
                {evidence?.reviewer_notes ||
                  "No reviewer notes were provided. Please review your evidence and session details before re-submitting."}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveOption("upload")}
            className={`rounded-xl border p-4 text-left shadow-sm transition-colors ${
              activeOption === "upload"
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5" />
              <p className="font-semibold">Option A - Re-upload evidence</p>
            </div>
            <p
              className={`mt-2 text-sm ${activeOption === "upload" ? "text-zinc-200" : "text-zinc-600"}`}
            >
              Upload a clearer screenshot and send this session back for review.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveOption("correct")}
            className={`rounded-xl border p-4 text-left shadow-sm transition-colors ${
              activeOption === "correct"
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              <p className="font-semibold">Option B - Correct logged data</p>
            </div>
            <p
              className={`mt-2 text-sm ${activeOption === "correct" ? "text-zinc-200" : "text-zinc-600"}`}
            >
              Fix your session and earnings values, then requeue the submission.
            </p>
          </button>
        </div>

        {activeOption === "upload" ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Re-upload Evidence
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Current net for this session:{" "}
              {formatCurrency(earning?.net_received || 0)}
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 cursor-pointer rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 text-center transition-colors hover:border-zinc-400"
            >
              {evidencePreview ? (
                <img
                  src={evidencePreview}
                  alt="New evidence preview"
                  className="mx-auto max-h-72 rounded-md border border-zinc-200 object-contain"
                />
              ) : (
                <div className="text-zinc-600">
                  <p className="font-medium">
                    Click to upload replacement screenshot
                  </p>
                  <p className="mt-1 text-sm">JPG, PNG, WebP up to 10MB</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleSelectFile}
            />

            {evidenceFile && (
              <div className="mt-3 flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                <span className="truncate">{evidenceFile.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEvidenceFile(null);
                    setEvidencePreview(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="ml-3 font-medium text-zinc-900 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleReuploadEvidence}
              disabled={submitting}
              className="mt-5 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Re-upload and Requeue"}
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Correct Logged Data
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Update the details below, then requeue your submission.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Platform
                </label>
                <select
                  value={formData.platform}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      platform: event.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                >
                  {platformOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Session Date
                </label>
                <input
                  type="date"
                  value={formData.sessionDate}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      sessionDate: event.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      startTime: event.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      endTime: event.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Trips Completed
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.tripsCompleted}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      tripsCompleted: event.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Gross Earned (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.grossEarned}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      grossEarned: event.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Platform Deductions (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.platformDeductions}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      platformDeductions: event.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">
                  Net Received (auto)
                </label>
                <input
                  type="text"
                  readOnly
                  value={calculatedNet.toFixed(2)}
                  className="flex h-10 w-full rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleCorrectData}
              disabled={submitting}
              className="mt-5 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Corrections and Requeue"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
