import { useState } from 'react';
import SingleSessionEntry from './SingleSessionEntry';
import BulkCSVImport from './BulkCSVImport';

export default function EarningsLogPage() {
  const [method, setMethod] = useState('single');
  const [completedSessionId, setCompletedSessionId] = useState(null);

  const handleComplete = (sessionId) => {
    setCompletedSessionId(sessionId);
  };

  const handleReset = () => {
    setCompletedSessionId(null);
  };

  if (completedSessionId) {
    return (
      <div className="min-h-screen bg-[#111] text-white flex items-center justify-center p-4">
        <div className="bg-[#1e1e1e] rounded-2xl p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Session Logged!</h2>
          <p className="text-gray-400 mb-6">Your work session has been recorded successfully.</p>
          <button
            onClick={handleReset}
            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200"
          >
            Log Another Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Log Earnings</h1>

        <div className="flex gap-2 mb-6 bg-[#1e1e1e] p-1 rounded-xl">
          <button
            onClick={() => setMethod('single')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              method === 'single' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Single Session
          </button>
          <button
            onClick={() => setMethod('bulk')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              method === 'bulk' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            Bulk CSV Import
          </button>
        </div>

        {method === 'single' && <SingleSessionEntry onComplete={handleComplete} />}
        {method === 'bulk' && <BulkCSVImport onComplete={handleComplete} />}
      </div>
    </div>
  );
}