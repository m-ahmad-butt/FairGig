import { useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import earningsService from '../../services/api/earningsService';
import authService from '../../services/api/authService';

const PLATFORM_NAMES = ['Bykea', 'Careem', 'inDrive', 'Airlift', 'Foodpanda', 'Cheetay', 'Upwork', 'Fiverr', 'Freelancer.com', 'PeoplePerHour', 'TaskRobin', 'Rozgar'];

const CSV_TEMPLATE = 'platform,session_date,start_time,end_time,trips_completed,gross_earned,platform_deductions,net_received';

function validateRow(row, index, existingDates) {
  const errors = [];
  const warnings = [];

  if (!row.platform || row.platform.trim() === '') {
    errors.push('Platform is required');
  } else if (!PLATFORM_NAMES.map(p => p.toLowerCase()).includes(row.platform.toLowerCase().trim())) {
    errors.push('Invalid platform');
  }

  if (!row.session_date || row.session_date.trim() === '') {
    errors.push('Session date is required');
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(row.session_date)) {
      errors.push('Invalid date format (use YYYY-MM-DD)');
    } else {
      const date = new Date(row.session_date);
      if (isNaN(date.getTime())) {
        errors.push('Invalid date');
      } else if (date > new Date()) {
        errors.push('Date cannot be in the future');
      } else if (existingDates.has(row.session_date.trim())) {
        errors.push('Duplicate date in CSV');
      }
    }
  }

  if (!row.start_time || row.start_time.trim() === '') {
    errors.push('Start time is required');
  } else {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(row.start_time)) {
      errors.push('Invalid start time format (use HH:MM)');
    }
  }

  if (!row.end_time || row.end_time.trim() === '') {
    errors.push('End time is required');
  } else {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(row.end_time)) {
      errors.push('Invalid end time format (use HH:MM)');
    } else if (row.start_time && row.start_time >= row.end_time) {
      errors.push('End time must be after start time');
    }
  }

  if (row.trips_completed === undefined || row.trips_completed === '' || parseInt(row.trips_completed) < 0) {
    errors.push('Invalid trips completed');
  }

  if (row.gross_earned === undefined || row.gross_earned === '' || parseFloat(row.gross_earned) < 0) {
    errors.push('Invalid gross earned');
  }

  if (row.platform_deductions === undefined || row.platform_deductions === '' || parseFloat(row.platform_deductions) < 0) {
    // Default to 0
  }

  if (row.net_received !== undefined && row.net_received !== '') {
    const gross = parseFloat(row.gross_earned) || 0;
    const deductions = parseFloat(row.platform_deductions) || 0;
    const expectedNet = gross - deductions;
    const actualNet = parseFloat(row.net_received);
    if (Math.abs(expectedNet - actualNet) > 1) {
      warnings.push(`Net mismatch: expected ${expectedNet}, got ${actualNet}`);
    }
  }

  return {
    ...row,
    _rowIndex: index,
    _errors: errors,
    _warnings: warnings,
    _status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid'
  };
}

export default function BulkCSVImport({ onComplete }) {
  const [phase, setPhase] = useState(1);
  const [rows, setRows] = useState([]);
  const [files, setFiles] = useState({});
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);
  const user = authService.getUser();
  const workerId = user?.id || user?._id;

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'earnings_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const dates = new Set();
        const validated = results.data.map((row, index) => {
          const rowWithDate = validateRow(row, index, dates);
          if (rowWithDate.session_date && !rowWithDate._errors.some(e => e.includes('Duplicate'))) {
            dates.add(rowWithDate.session_date.trim());
          }
          return rowWithDate;
        });
        setRows(validated);
        setPhase(1);
      },
      error: () => {
        toast.error('Failed to parse CSV');
      }
    });
  };

  const updateRow = (index, field, value) => {
    setRows(prev => prev.map((row, i) => {
      if (i === index) {
        return validateRow({ ...row, [field]: value }, index, new Set(prev.map(r => r.session_date)));
      }
      return row;
    }));
  };

  const deleteRow = (index) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = (index, e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFiles(prev => ({ ...prev, [index]: file }));
    }
  };

  const uploadToS3 = async (uploadUrl, file) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(p => ({ ...p, [file.name]: Math.round((e.loaded / e.total) * 100) }));
        }
      };
      
      xhr.onload = () => {
        if (xhr.status === 200) resolve();
        else reject(new Error('S3 upload failed'));
      };
      
      xhr.onerror = () => reject(new Error('S3 upload failed'));
      xhr.send(file);
    });
  };

  const handleSubmit = async () => {
    const validRows = rows.filter(r => r._status !== 'error');
    setUploading(true);
    const resultsArr = [];

    try {
      const sessionsData = validRows.map(row => {
        const sessionDate = new Date(row.session_date);
        const [sh, sm] = row.start_time.split(':').map(Number);
        const [eh, em] = row.end_time.split(':').map(Number);
        
        const startTime = new Date(sessionDate);
        startTime.setHours(sh, sm, 0, 0);
        
        const endTime = new Date(sessionDate);
        endTime.setHours(eh, em, 0, 0);
        
        const startMins = sh * 60 + sm;
        const endMins = eh * 60 + em;
        const hoursWorked = (endMins - startMins) / 60;
        
        return {
          worker_id: workerId,
          platform: row.platform.trim(),
          session_date: sessionDate.toISOString(),
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          hours_worked: hoursWorked,
          trips_completed: parseInt(row.trips_completed)
        };
      });

      const sessionsResult = await earningsService.bulkCreateWorkSessions(sessionsData);
      const createdSessions = sessionsResult.sessions || [];
      
      const earningsData = validRows.map((row, idx) => {
        const session = createdSessions[idx];
        if (!session) return null;
        
        const grossEarned = parseFloat(row.gross_earned);
        const platformDeductions = parseFloat(row.platform_deductions) || 0;
        
        return {
          session_id: session.id,
          gross_earned: grossEarned,
          platform_deductions: platformDeductions,
          net_received: grossEarned - platformDeductions
        };
      }).filter(Boolean);

      await earningsService.bulkCreateEarnings(earningsData);

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const file = files[i];
        const session = createdSessions[i];
        
        if (file && session) {
          try {
            const { uploadUrl, imageUrl } = await earningsService.getPresignedUrl(session.id, file.type);
            await uploadToS3(uploadUrl, file);
            
            await earningsService.createEvidence({
              worker_id: workerId,
              session_id: session.id,
              image_url: imageUrl
            });
            
            resultsArr.push({ row: i + 1, status: 'created', platform: row.platform, date: row.session_date });
          } catch (err) {
            resultsArr.push({ row: i + 1, status: 'failed', platform: row.platform, date: row.session_date, error: err.message });
          }
        } else {
          resultsArr.push({ row: i + 1, status: 'created', platform: row.platform, date: row.session_date, noEvidence: true });
        }
      }

      setResults(resultsArr);
      setPhase(3);
    } catch (error) {
      if (error.message.includes('already have a session')) {
        toast.error('Duplicate session date found. Please check your CSV.');
      } else {
        toast.error(error.message || 'Bulk upload failed');
      }
    } finally {
      setUploading(false);
      setProgress({});
    }
  };

  const downloadResults = () => {
    const csv = results.map(r => 
      `${r.platform},${r.date},${r.status}${r.noEvidence ? ',no evidence' : ''}${r.error ? ',' + r.error : ''}`
    ).join('\n');
    
    const blob = new Blob([`platform,date,status,notes\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'upload_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = rows.filter(r => r._status === 'valid').length;
  const warningCount = rows.filter(r => r._status === 'warning').length;
  const errorCount = rows.filter(r => r._status === 'error').length;

  return (
    <div className="space-y-6">
      {phase === 1 && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Upload CSV</h3>
            <button onClick={downloadTemplate} className="text-sm text-gray-400 hover:text-white">
              Download template
            </button>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 rounded-xl p-12 text-center cursor-pointer hover:border-gray-500 transition-colors"
          >
            <div className="text-gray-400">
              <p className="mb-2">Click or drag CSV file here</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          {rows.length > 0 && (
            <div className="bg-[#1e1e1e] rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-400">
                  {validCount} valid, {warningCount} warnings, {errorCount} errors
                </div>
                {validCount + warningCount > 0 && (
                  <button
                    onClick={() => setPhase(2)}
                    className="bg-white text-black px-4 py-2 rounded-lg font-medium"
                  >
                    Continue ({validCount + warningCount} rows)
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2 px-2">Status</th>
                      <th className="text-left py-2 px-2">Platform</th>
                      <th className="text-left py-2 px-2">Date</th>
                      <th className="text-left py-2 px-2">Start</th>
                      <th className="text-left py-2 px-2">End</th>
                      <th className="text-left py-2 px-2">Trips</th>
                      <th className="text-left py-2 px-2">Gross</th>
                      <th className="text-left py-2 px-2">Deductions</th>
                      <th className="text-left py-2 px-2">Net</th>
                      <th className="text-left py-2 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-800">
                        <td className="py-2 px-2">
                          {row._status === 'valid' && <span className="text-green-400">✅</span>}
                          {row._status === 'warning' && <span className="text-yellow-400" title={row._warnings.join(', ')}>⚠️</span>}
                          {row._status === 'error' && <span className="text-red-400" title={row._errors.join(', ')}>❌</span>}
                        </td>
                        <td className="py-2 px-2">
                          <select
                            value={row.platform || ''}
                            onChange={(e) => updateRow(idx, 'platform', e.target.value)}
                            className="bg-[#111] text-white text-xs px-2 py-1 rounded border border-gray-700"
                          >
                            <option value="">Select</option>
                            {PLATFORM_NAMES.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="date"
                            value={row.session_date || ''}
                            onChange={(e) => updateRow(idx, 'session_date', e.target.value)}
                            className="bg-[#111] text-white text-xs px-2 py-1 rounded border border-gray-700"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="time"
                            value={row.start_time || ''}
                            onChange={(e) => updateRow(idx, 'start_time', e.target.value)}
                            className="bg-[#111] text-white text-xs px-2 py-1 rounded border border-gray-700"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="time"
                            value={row.end_time || ''}
                            onChange={(e) => updateRow(idx, 'end_time', e.target.value)}
                            className="bg-[#111] text-white text-xs px-2 py-1 rounded border border-gray-700"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={row.trips_completed || ''}
                            onChange={(e) => updateRow(idx, 'trips_completed', e.target.value)}
                            className="bg-[#111] text-white text-xs px-2 py-1 rounded border border-gray-700 w-16"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={row.gross_earned || ''}
                            onChange={(e) => updateRow(idx, 'gross_earned', e.target.value)}
                            className="bg-[#111] text-white text-xs px-2 py-1 rounded border border-gray-700 w-20"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={row.platform_deductions || '0'}
                            onChange={(e) => updateRow(idx, 'platform_deductions', e.target.value)}
                            className="bg-[#111] text-white text-xs px-2 py-1 rounded border border-gray-700 w-20"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            value={row.net_received || ''}
                            onChange={(e) => updateRow(idx, 'net_received', e.target.value)}
                            className="bg-[#111] text-white text-xs px-2 py-1 rounded border border-gray-700 w-20"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <button onClick={() => deleteRow(idx)} className="text-red-400 hover:text-red-300">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {phase === 2 && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Review & Submit</h3>
            <button onClick={() => setPhase(1)} className="text-sm text-gray-400 hover:text-white">
              Back to edit
            </button>
          </div>

          <div className="bg-[#1e1e1e] rounded-2xl p-6">
            <h4 className="text-white font-medium mb-4">Upload Evidence Images (Optional)</h4>
            
            {rows.filter(r => r._status !== 'error').map((row, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-800">
                <div>
                  <span className="text-white">{row.platform}</span>
                  <span className="text-gray-400 ml-2">{row.session_date}</span>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFileSelect(idx, e)}
                  className="text-sm text-gray-400"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : `Submit ${rows.filter(r => r._status !== 'error').length} Sessions`}
          </button>
        </>
      )}

      {phase === 3 && results && (
        <div className="bg-[#1e1e1e] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Results</h3>
          
          <div className="text-sm text-gray-400 mb-4">
            {results.filter(r => r.status === 'created').length} created, {results.filter(r => r.status === 'failed').length} failed
          </div>

          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Platform</th>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="py-2">
                      {r.status === 'created' ? <span className="text-green-400">✅</span> : <span className="text-red-400">❌</span>}
                    </td>
                    <td className="py-2 text-white">{r.platform}</td>
                    <td className="py-2 text-white">{r.date}</td>
                    <td className="py-2 text-gray-400">
                      {r.noEvidence ? 'No evidence' : r.error || 'OK'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-4 mt-6">
            <button onClick={downloadResults} className="flex-1 bg-white text-black font-bold py-3 rounded-xl">
              Download Results
            </button>
            <button onClick={onComplete} className="flex-1 bg-gray-700 text-white font-bold py-3 rounded-xl">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}