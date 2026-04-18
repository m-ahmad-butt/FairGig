import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../../services/api/authService';
import earningsService from '../../services/api/earningsService';
import Navbar from '../../components/Navigation/Navbar';

const formatCurrency = (value) => `PKR ${Number(value || 0).toLocaleString()}`;

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePlatform(value) {
  return String(value || '').trim().toLowerCase();
}

function toDateISO(value) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toISOString().split('T')[0];
}

function isNumericMatch(observed, expected, toleranceRatio = 0.1) {
  const observedNumber = toNumber(observed);
  const expectedNumber = toNumber(expected);
  const denominator = Math.max(Math.abs(expectedNumber), 1);
  return Math.abs(observedNumber - expectedNumber) / denominator <= toleranceRatio;
}

function formatDisplayDate(value) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString('en-PK');
}

export default function VerificationDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('logged');
  const [submitting, setSubmitting] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState('');

  const [session, setSession] = useState(null);
  const [earning, setEarning] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const profile = await authService.getMe();
      setUser(profile);

      if (profile.role !== 'verifier') {
        navigate('/');
        return;
      }

      const evidenceData = await earningsService.getEvidenceById(id);

      const sessionId = evidenceData?.session_id;
      if (!sessionId) {
        throw new Error('Evidence is missing a linked session_id');
      }

      const [sessionData, earningResponse] = await Promise.all([
        earningsService.getWorkSessionById(sessionId).catch(() => null),
        earningsService.getEarningBySession(sessionId).catch(() => [])
      ]);

      const earningData = Array.isArray(earningResponse)
        ? (earningResponse[0] || null)
        : earningResponse;

      setEvidence(evidenceData);
      setSession(sessionData);
      setEarning(earningData);

      loadAiAnalysis({ evidenceData, sessionData, earningData });
    } catch (error) {
      console.error('Failed to load verification detail:', error);
      toast.error('Failed to load verification details');
    } finally {
      setLoading(false);
    }
  };

  const loadAiAnalysis = async ({ evidenceData, sessionData, earningData }) => {
    setAiLoading(true);
    setAiError(false);
    try {
      const workerId = evidenceData?.worker_id;
      const sessionId = evidenceData?.session_id || sessionData?.id;

      if (!workerId || !sessionId) {
        throw new Error('Missing worker/session linkage for AI verification');
      }

      const agentResult = await earningsService.verifyScreenshotWithAI(workerId, sessionId);

      const detectedGross = toNumber(agentResult?.data_from_picture?.gross_amount);
      const detectedDeductions = toNumber(agentResult?.data_from_picture?.platform_deduction);
      const detectedNet = toNumber(agentResult?.data_from_picture?.net_amount);
      const detectedPlatform = agentResult?.data_from_picture?.platform_name || sessionData?.platform || 'Unknown';
      const loggedGross = toNumber(agentResult?.actual_data?.gross_amount ?? earningData?.gross_earned);
      const loggedDeductions = toNumber(agentResult?.actual_data?.platform_deduction ?? earningData?.platform_deductions);
      const loggedNet = toNumber(agentResult?.actual_data?.net_amount ?? earningData?.net_received);
      const loggedPlatform = agentResult?.actual_data?.platform_name || sessionData?.platform || 'Unknown';
      const loggedDate = sessionData?.session_date || new Date().toISOString().split('T')[0];
      const anomalyTypes = Array.isArray(agentResult?.anomaly_types) ? agentResult.anomaly_types : [];
      const anomalyDetected = Boolean(agentResult?.anomaly_detected);
      const confidenceScore = toNumber(agentResult?.confidence_score);
      const confidenceThreshold = toNumber(agentResult?.anomaly_confidence_threshold || 80);

      const mappedAnalysis = {
        extraction_summary: {
          detected_gross: detectedGross,
          detected_deductions: detectedDeductions,
          detected_net: detectedNet,
          detected_platform: detectedPlatform,
          detected_date: toDateISO(loggedDate)
        },
        discrepancies: [
          {
            field: 'gross',
            logged: loggedGross,
            detected: detectedGross,
            match: isNumericMatch(detectedGross, loggedGross)
          },
          {
            field: 'deductions',
            logged: loggedDeductions,
            detected: detectedDeductions,
            match: isNumericMatch(detectedDeductions, loggedDeductions)
          },
          {
            field: 'net',
            logged: loggedNet,
            detected: detectedNet,
            match: isNumericMatch(detectedNet, loggedNet)
          },
          {
            field: 'platform',
            logged: loggedPlatform,
            detected: detectedPlatform,
            match: normalizePlatform(detectedPlatform) === normalizePlatform(loggedPlatform)
          },
          {
            field: 'date',
            logged: toDateISO(loggedDate),
            detected: toDateISO(loggedDate),
            match: true
          }
        ],
        verdict: anomalyDetected ? 'discrepancy_found' : 'likely_valid',
        explanation: anomalyDetected
          ? `AI flagged this submission (${anomalyTypes.join(', ') || 'mismatch detected'}) at ${confidenceScore}% confidence, below threshold ${confidenceThreshold}%.`
          : `AI found no major mismatch at ${confidenceScore}% confidence (threshold ${confidenceThreshold}%).`,
        confidence: confidenceScore,
        anomaly_types: anomalyTypes,
        cached: Boolean(agentResult?.cached),
        evaluated_at: agentResult?.evaluated_at || null
      };

      setAiAnalysis(mappedAnalysis);
    } catch (error) {
      console.error('AI analysis failed:', error);
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await earningsService.updateEvidence(id, { verified: true });
      toast.success('Evidence verified successfully');
      navigate('/verifier/dashboard');
    } catch (error) {
      toast.error('Failed to verify evidence');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFlag = async () => {
    if (!reviewerNotes.trim()) {
      toast.error('Reviewer notes are required when flagging');
      return;
    }
    setSubmitting(true);
    try {
      await earningsService.updateEvidence(id, { verified: false });
      toast.success('Evidence flagged');
      navigate('/verifier/dashboard');
    } catch (error) {
      toast.error('Failed to flag evidence');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnverifiable = async () => {
    if (!reviewerNotes.trim()) {
      toast.error('Reviewer notes are required when marking unverifiable');
      return;
    }

    setSubmitting(true);
    try {
      // Backend currently supports boolean verified only, so unverifiable is stored as flagged.
      await earningsService.updateEvidence(id, { verified: false });
      toast.success('Marked as unverifiable (saved as flagged)');
      navigate('/verifier/dashboard');
    } catch (error) {
      toast.error('Failed to update evidence');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusPill = () => {
    if (!evidence) return null;
    if (evidence.verified === true) {
      return <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">VERIFIED</span>;
    }
    if (evidence.verified === false) {
      return <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">FLAGGED</span>;
    }
    return <span className="px-3 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">PENDING REVIEW</span>;
  };

  const getVerdictStyle = (verdict) => {
    switch (verdict) {
      case 'likely_valid':
        return 'border-green-500 bg-green-50';
      case 'discrepancy_found':
        return 'border-red-500 bg-red-50';
      default:
        return 'border-gray-400 bg-gray-50';
    }
  };

  const getVerdictLabel = (verdict) => {
    switch (verdict) {
      case 'likely_valid':
        return 'Likely Valid';
      case 'discrepancy_found':
        return 'Discrepancy Found';
      default:
        return 'Inconclusive';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link to="/verifier/dashboard" className="hover:text-gray-900">Review Queue</Link>
            <span>›</span>
            <span>Item #{id?.slice(0, 8)}</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Verification Detail</h1>
            {getStatusPill()}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900">Source Evidence</h2>
              </div>
              
              <div className="text-sm text-gray-500 mb-3">
                USER UPLOAD: {evidence?.image_url?.split('/').pop() || 'EVIDENCE.PNG'}
              </div>

              <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                <img 
                  src={evidence?.image_url || 'https://placehold.co/600x400?text=No+Image'} 
                  alt="Evidence"
                  className="w-full h-auto max-h-96 object-contain"
                />
                <button 
                  onClick={() => setShowImageModal(true)}
                  className="absolute top-3 right-3 p-2 bg-white rounded-lg shadow-md hover:bg-gray-50"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="relative flex bg-gray-100 rounded-lg p-1">
                  <div 
                    className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gray-900 rounded-md transition-all duration-200 ease-out"
                    style={{ 
                      transform: activeTab === 'logged' ? 'translateX(0)' : 'translateX(100%)' 
                    }}
                  />
                  <button
                    onClick={() => setActiveTab('logged')}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md relative z-10 ${
                      activeTab === 'logged' ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    Logged Data
                  </button>
                  <button
                    onClick={() => setActiveTab('ai')}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md relative z-10 ${
                      activeTab === 'ai' ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    AI Analysis
                  </button>
                </div>
              </div>

              <div className="p-4">
                {activeTab === 'logged' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-500 text-sm">Claimed Gross</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">
                          {formatCurrency(earning?.gross_earned || 0)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-500 text-sm">Platform Fees</p>
                        <p className="text-xl font-bold text-red-600 mt-1">
                          -{formatCurrency(earning?.platform_deductions || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-900 rounded-xl p-4">
                      <p className="text-gray-400 text-sm">Net Earnings Calculated</p>
                      <p className="text-3xl font-bold text-white mt-1">
                        {formatCurrency(earning?.net_received || 0)}
                      </p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date</span>
                        <span className="text-gray-900">{formatDisplayDate(session?.session_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Platform</span>
                        <span className="text-gray-900">{session?.platform || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Session ID</span>
                        <span className="text-gray-900 font-mono text-xs">
                          {session?.id || evidence?.session_id
                            ? `${(session?.id || evidence?.session_id).slice(0, 8)}...`
                            : '-'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        REVIEWER NOTES <span className="text-gray-400">(REQUIRED FOR FLAGS)</span>
                      </label>
                      <textarea
                        value={reviewerNotes}
                        onChange={(e) => setReviewerNotes(e.target.value)}
                        placeholder="Add notes about your verification decision..."
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        rows={3}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {aiLoading ? (
                      <div className="space-y-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                        <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ) : aiError ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">AI analysis unavailable</p>
                        <button 
                          onClick={() => loadAiAnalysis({ evidenceData: evidence, sessionData: session, earningData: earning })}
                          className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
                        >
                          Retry
                        </button>
                      </div>
                    ) : aiAnalysis ? (
                      <>
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-3">Extraction Summary</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Gross</span>
                              <span className={aiAnalysis.extraction_summary.detected_gross ? 'text-gray-900' : 'text-gray-400 italic'}>
                                {aiAnalysis.extraction_summary.detected_gross ? formatCurrency(aiAnalysis.extraction_summary.detected_gross) : '— not detected'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Deductions</span>
                              <span className={aiAnalysis.extraction_summary.detected_deductions ? 'text-gray-900' : 'text-gray-400 italic'}>
                                {aiAnalysis.extraction_summary.detected_deductions ? `-${formatCurrency(aiAnalysis.extraction_summary.detected_deductions)}` : '— not detected'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Net</span>
                              <span className={aiAnalysis.extraction_summary.detected_net ? 'text-gray-900 font-medium' : 'text-gray-400 italic'}>
                                {aiAnalysis.extraction_summary.detected_net ? formatCurrency(aiAnalysis.extraction_summary.detected_net) : '— not detected'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Platform</span>
                              <span className={aiAnalysis.extraction_summary.detected_platform ? 'text-gray-900' : 'text-gray-400 italic'}>
                                {aiAnalysis.extraction_summary.detected_platform || '— not detected'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Date</span>
                              <span className={aiAnalysis.extraction_summary.detected_date ? 'text-gray-900' : 'text-gray-400 italic'}>
                                {aiAnalysis.extraction_summary.detected_date || '— not detected'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-3">Discrepancy Indicators</h3>
                          <div className="space-y-2">
                            {aiAnalysis.discrepancies.map((item, i) => {
                              const loggedDisplay = item.logged !== undefined && item.logged !== null 
                                ? (item.field === 'platform' || item.field === 'date' ? item.logged : formatCurrency(item.logged))
                                : '— not detected';
                              const detectedDisplay = item.detected !== undefined && item.detected !== null
                                ? (item.field === 'platform' || item.field === 'date' ? item.detected : formatCurrency(item.detected))
                                : '— not detected';
                              const hasLogged = item.logged !== undefined && item.logged !== null;
                              const hasDetected = item.detected !== undefined && item.detected !== null;
                              const isMatch = item.match === true;
                              const isMismatch = item.match === false;
                              const notDetected = !hasLogged || !hasDetected;
                              
                              return (
                                <div key={i} className={`flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0 ${isMismatch ? 'bg-red-50 -mx-2 px-2 rounded' : ''}`}>
                                  <div className="flex-1">
                                    <span className="text-gray-900 capitalize">{item.field}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-gray-500 w-20 text-right">{loggedDisplay}</span>
                                    <span className="text-gray-400">|</span>
                                    <span className={`w-20 ${hasDetected ? 'text-gray-900' : 'text-gray-400 italic'}`}>{detectedDisplay}</span>
                                    <span className="w-8 text-center">
                                      {isMatch && '✅'}
                                      {isMismatch && '⚠️'}
                                      {notDetected && !isMatch && !isMismatch && '—'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className={`border-2 rounded-xl p-4 ${getVerdictStyle(aiAnalysis.verdict)}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-medium ${
                              aiAnalysis.verdict === 'likely_valid' ? 'text-green-700' : 
                              aiAnalysis.verdict === 'discrepancy_found' ? 'text-red-700' : 'text-gray-600'
                            }`}>
                              {getVerdictLabel(aiAnalysis.verdict)}
                            </span>
                            {aiAnalysis.confidence && (
                              <span className="px-2 py-1 bg-white rounded text-xs font-medium text-gray-600">
                                {aiAnalysis.confidence}% confident
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{aiAnalysis.explanation}</p>
                        </div>

                        <p className="text-xs text-gray-400 italic">
                          AI analysis is advisory only. Final verification decision rests with the reviewer.
                        </p>

                        {aiAnalysis.cached && (
                          <p className="text-xs text-gray-400">
                            Showing cached agent result{aiAnalysis.evaluated_at ? ` from ${new Date(aiAnalysis.evaluated_at).toLocaleString('en-PK')}` : ''}.
                          </p>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3">
                <button
                  onClick={handleUnverifiable}
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
                >
                  Unverifiable
                </button>
                <button
                  onClick={handleFlag}
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                >
                  Flag Discrepancy
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
                >
                  Confirm Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showImageModal && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button 
              onClick={() => setShowImageModal(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img 
              src={evidence?.image_url || 'https://placehold.co/600x400?text=No+Image'} 
              alt="Evidence Full"
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}