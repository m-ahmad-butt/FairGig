import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import earningsService from '../../services/api/earningsService';
import authService from '../../services/api/authService';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { getPlatformOptions } from '../../utils/workerProfileOptions';

const CSV_TEMPLATE = 'platform,session_date,start_time,end_time,trips_completed,gross_earned,platform_deductions,net_received';

const TABLE_FIELD_CLASS = 'h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900';

function normalizePlatformToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s/g, '');
}

function resolvePlatformValue(rawPlatform, platformOptions = [], userCategory = 'rider') {
  const token = normalizePlatformToken(rawPlatform);
  if (!token) {
    return '';
  }

  const platformLookup = new Map();
  platformOptions.forEach((option) => {
    platformLookup.set(normalizePlatformToken(option.value), option.value);
    platformLookup.set(normalizePlatformToken(option.label), option.value);
  });

  const defaultPlatform = platformOptions[0]?.value || '';
  if (userCategory === 'rider') {
    platformLookup.set('rider', defaultPlatform);
  } else {
    platformLookup.set('freelance', defaultPlatform);
    platformLookup.set('freelancer', defaultPlatform);
  }

  return platformLookup.get(token) || '';
}

function validateRow(
  row,
  index,
  existingDates,
  platformOptions = [],
  invalidPlatformMessage = 'Invalid platform value',
  userCategory = 'rider'
) {
  const errors = [];
  const warnings = [];
  const rawPlatform = String(row.platform || '').trim();
  const resolvedPlatform = resolvePlatformValue(rawPlatform, platformOptions, userCategory);

  if (!rawPlatform) {
    errors.push('Platform is required');
  } else if (!resolvedPlatform) {
    errors.push(invalidPlatformMessage);
  } else if (rawPlatform.toLowerCase() !== resolvedPlatform.toLowerCase()) {
    warnings.push(`Platform normalized to ${resolvedPlatform}`);
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

  const gross = parseFloat(row.gross_earned) || 0;
  const deductions = parseFloat(row.platform_deductions) || 0;
  if (deductions > gross) {
    errors.push('Net amount cannot be negative (deductions exceed gross earned)');
  }

  if (row.net_received !== undefined && row.net_received !== '') {
    const expectedNet = gross - deductions;
    const actualNet = parseFloat(row.net_received);
    if (!Number.isFinite(actualNet) || actualNet < 0) {
      errors.push('net_received must be a non-negative number');
    }
    if (Math.abs(expectedNet - actualNet) > 1) {
      warnings.push(`Net mismatch: expected ${expectedNet}, got ${actualNet}`);
    }
  }

  return {
    ...row,
    platform: resolvedPlatform || rawPlatform,
    _rowIndex: index,
    _errors: errors,
    _warnings: warnings,
    _status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid'
  };
}

function getStatusMeta(row) {
  if (row._status === 'error') {
    return {
      label: 'Error',
      variant: 'destructive',
      className: '',
      title: row._errors.join(', ')
    };
  }

  if (row._status === 'warning') {
    return {
      label: 'Warning',
      variant: 'secondary',
      className: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
      title: row._warnings.join(', ')
    };
  }

  return {
    label: 'Valid',
    variant: 'success',
    className: '',
    title: ''
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
  const userCategory = String(user?.category || '').toLowerCase() === 'rider' ? 'rider' : 'freelance';
  const categoryLabel = userCategory === 'rider' ? 'Rider' : 'Freelancer';
  const allowedPlatformOptions = getPlatformOptions(userCategory);
  const invalidPlatformMessage = `Invalid platform for ${categoryLabel} category`;

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
      transformHeader: (header) => String(header || '').replace(/^\uFEFF/, '').trim().toLowerCase(),
      transform: (value) => (typeof value === 'string' ? value.trim() : value),
      complete: (results) => {
        const dates = new Set();
        const validated = results.data.map((row, index) => {
          const rowWithDate = validateRow(
            row,
            index,
            dates,
            allowedPlatformOptions,
            invalidPlatformMessage,
            userCategory
          );
          if (rowWithDate.session_date && !rowWithDate._errors.some(e => e.includes('Duplicate'))) {
            dates.add(rowWithDate.session_date.trim());
          }
          return rowWithDate;
        });
        setRows(validated);
        setFiles({});
        setResults(null);
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
        const dateSet = new Set(
          prev
            .filter((_, rowIndex) => rowIndex !== index)
            .map((r) => String(r.session_date || '').trim())
            .filter(Boolean)
        );

        return validateRow(
          { ...row, [field]: value },
          index,
          dateSet,
          allowedPlatformOptions,
          invalidPlatformMessage,
          userCategory
        );
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
    if (!workerId) {
      toast.error('Unable to identify worker. Please login again.');
      return;
    }

    const validRows = rows.filter(r => r._status !== 'error');
    setUploading(true);
    const resultsArr = [];

    try {
      const sessionsData = validRows.map(row => {
        const sessionDate = new Date(`${row.session_date}T00:00:00`);
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
          session_id: crypto.randomUUID(),
          worker_id: workerId,
          platform: row.platform.trim(),
          session_date: row.session_date.trim(),
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
          worker_id: workerId,
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
            const uploadResult = await earningsService.uploadEvidenceFile(session.id, file, workerId);
            
            await earningsService.createEvidence({
              worker_id: workerId,
              session_id: session.id,
              image_url: uploadResult.imageUrl
            });
            
            resultsArr.push({ row: i + 1, status: 'created', platform: row.platform, date: row.session_date });
          } catch (err) {
            resultsArr.push({
              row: i + 1,
              status: 'created',
              platform: row.platform,
              date: row.session_date,
              noEvidence: true
            });
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
  const reviewRows = rows.filter((row) => row._status !== 'error');

  return (
    <div className="space-y-6">
      {phase === 1 && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Upload CSV</CardTitle>
                <CardDescription>
                  Import multiple sessions using the provided template format. Allowed platforms are based on your {categoryLabel} category.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={downloadTemplate} className="shrink-0">
                Download Template
              </Button>
            </CardHeader>

            <CardContent>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-12 text-center transition-colors hover:border-zinc-400"
              >
                <p className="font-medium text-zinc-700">Click to select CSV file</p>
                <p className="mt-1 text-sm text-zinc-500">CSV with headers and one row per session</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </CardContent>
          </Card>

          {rows.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="success">{validCount} valid</Badge>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200">
                      {warningCount} warnings
                    </Badge>
                    <Badge variant="destructive">{errorCount} errors</Badge>
                  </div>
                  {validCount + warningCount > 0 && (
                    <Button onClick={() => setPhase(2)}>
                      Continue ({validCount + warningCount} rows)
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-500">
                        <th className="px-2 py-2 text-left font-medium">Status</th>
                        <th className="px-2 py-2 text-left font-medium">Platform</th>
                        <th className="px-2 py-2 text-left font-medium">Date</th>
                        <th className="px-2 py-2 text-left font-medium">Start</th>
                        <th className="px-2 py-2 text-left font-medium">End</th>
                        <th className="px-2 py-2 text-left font-medium">Trips</th>
                        <th className="px-2 py-2 text-left font-medium">Gross</th>
                        <th className="px-2 py-2 text-left font-medium">Deduction</th>
                        <th className="px-2 py-2 text-left font-medium">Net</th>
                        <th className="px-2 py-2 text-left font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => {
                        const status = getStatusMeta(row);

                        return (
                          <tr key={idx} className="border-b border-zinc-100 align-top">
                            <td className="px-2 py-2">
                              <Badge variant={status.variant} className={status.className} title={status.title}>
                                {status.label}
                              </Badge>
                            </td>
                            <td className="px-2 py-2">
                              <select
                                value={row.platform || ''}
                                onChange={(e) => updateRow(idx, 'platform', e.target.value)}
                                className={`${TABLE_FIELD_CLASS} w-28`}
                              >
                                <option value="">Select</option>
                                {allowedPlatformOptions.map((platformOption) => (
                                  <option key={platformOption.value} value={platformOption.value}>
                                    {platformOption.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="date"
                                value={row.session_date || ''}
                                onChange={(e) => updateRow(idx, 'session_date', e.target.value)}
                                className={`${TABLE_FIELD_CLASS} w-32`}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="time"
                                value={row.start_time || ''}
                                onChange={(e) => updateRow(idx, 'start_time', e.target.value)}
                                className={`${TABLE_FIELD_CLASS} w-24`}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="time"
                                value={row.end_time || ''}
                                onChange={(e) => updateRow(idx, 'end_time', e.target.value)}
                                className={`${TABLE_FIELD_CLASS} w-24`}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={row.trips_completed || ''}
                                onChange={(e) => updateRow(idx, 'trips_completed', e.target.value)}
                                className={`${TABLE_FIELD_CLASS} w-16`}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={row.gross_earned || ''}
                                onChange={(e) => updateRow(idx, 'gross_earned', e.target.value)}
                                className={`${TABLE_FIELD_CLASS} w-24`}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={row.platform_deductions || '0'}
                                onChange={(e) => updateRow(idx, 'platform_deductions', e.target.value)}
                                className={`${TABLE_FIELD_CLASS} w-24`}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={row.net_received || ''}
                                onChange={(e) => updateRow(idx, 'net_received', e.target.value)}
                                className={`${TABLE_FIELD_CLASS} w-24`}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <Button variant="ghost" size="sm" onClick={() => deleteRow(idx)} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                                Remove
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {phase === 2 && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Review & Submit</CardTitle>
                <CardDescription>
                  Optional evidence can be attached per row before final submission.
                </CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setPhase(1)}>
                Back to Edit
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              {reviewRows.length === 0 ? (
                <p className="text-sm text-zinc-500">No rows available for submission.</p>
              ) : (
                <div className="space-y-3">
                  {reviewRows.map((row, idx) => (
                    <div key={`${row._rowIndex}-${idx}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{row.platform}</p>
                        <p className="text-xs text-zinc-500">{row.session_date}</p>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => handleFileSelect(idx, e)}
                        className="block text-xs text-zinc-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
                      />
                    </div>
                  ))}
                </div>
              )}

              {uploading && Object.keys(progress).length > 0 && (
                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <p className="mb-2 text-sm font-medium text-zinc-700">Uploading evidence files...</p>
                  <div className="space-y-2">
                    {Object.entries(progress).map(([name, value]) => (
                      <div key={name}>
                        <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                          <span className="truncate pr-2">{name}</span>
                          <span>{value}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                          <div className="h-full bg-zinc-900 transition-all" style={{ width: `${value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Button onClick={handleSubmit} disabled={uploading || reviewRows.length === 0} className="h-11 w-full">
            {uploading ? 'Submitting...' : `Submit ${reviewRows.length} Sessions`}
          </Button>
        </>
      )}

      {phase === 3 && results && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>Review created and failed rows before finishing.</CardDescription>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">{results.filter((result) => result.status === 'created').length} created</Badge>
              <Badge variant="destructive">{results.filter((result) => result.status === 'failed').length} failed</Badge>
            </div>
          </CardHeader>

          <CardContent>
            <div className="max-h-72 overflow-auto rounded-lg border border-zinc-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-50 text-zinc-500">
                  <tr className="border-b border-zinc-200">
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Platform</th>
                    <th className="px-3 py-2 text-left font-medium">Date</th>
                    <th className="px-3 py-2 text-left font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} className="border-b border-zinc-100">
                      <td className="px-3 py-2">
                        <Badge variant={result.status === 'created' ? 'success' : 'destructive'}>
                          {result.status === 'created' ? 'Created' : 'Failed'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-zinc-900">{result.platform}</td>
                      <td className="px-3 py-2 text-zinc-900">{result.date}</td>
                      <td className="px-3 py-2 text-zinc-600">
                        {result.noEvidence ? 'No evidence attached' : result.error || 'OK'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button onClick={downloadResults} variant="outline" className="h-11">
                Download Results CSV
              </Button>
              <Button onClick={() => onComplete?.('bulk-import')} className="h-11">
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}