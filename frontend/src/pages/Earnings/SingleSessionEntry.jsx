import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import earningsService from '../../services/api/earningsService';
import authService from '../../services/api/authService';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { getPlatformOptions } from '../../utils/workerProfileOptions';

const ERROR_FIELD_CLASS = 'border-red-300 focus-visible:ring-red-600';

export default function SingleSessionEntry({ onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    platform: '',
    sessionDate: '',
    startTime: '',
    endTime: '',
    tripsCompleted: '',
    grossEarned: '',
    platformDeductions: '0',
    netReceived: ''
  });

  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidencePreview, setEvidencePreview] = useState(null);
  const fileInputRef = useRef(null);

  const user = authService.getUser();
  const workerId = user?.id || user?._id;
  const userCategory = String(user?.category || '').toLowerCase() === 'rider' ? 'rider' : 'freelance';
  const categoryLabel = userCategory === 'rider' ? 'Rider' : 'Freelancer';
  const platformOptions = useMemo(() => getPlatformOptions(userCategory), [userCategory]);

  useEffect(() => {
    setFormData((prev) => {
      if (platformOptions.some((option) => option.value === prev.platform)) {
        return prev;
      }

      return {
        ...prev,
        platform: platformOptions[0]?.value || ''
      };
    });
  }, [platformOptions]);

  useEffect(() => {
    const gross = parseFloat(formData.grossEarned) || 0;
    const deductions = parseFloat(formData.platformDeductions) || 0;
    const net = gross - deductions;
    setFormData(prev => ({ ...prev, netReceived: net >= 0 ? net.toString() : '0' }));
  }, [formData.grossEarned, formData.platformDeductions]);

  const validateCard1 = () => {
    const errs = {};
    if (!formData.platform) {
      errs.platform = 'Select a platform';
    } else if (!platformOptions.some((option) => option.value === formData.platform)) {
      errs.platform = 'Select a valid platform for your category';
    }
    if (!formData.sessionDate) errs.sessionDate = 'Select a date';
    if (!formData.startTime) errs.startTime = 'Select start time';
    if (!formData.endTime) errs.endTime = 'Select end time';
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      errs.endTime = 'End time must be after start time';
    }
    if (!formData.tripsCompleted || parseInt(formData.tripsCompleted) < 0) errs.tripsCompleted = 'Enter trips completed';
    if (!formData.grossEarned || parseFloat(formData.grossEarned) < 0) errs.grossEarned = 'Enter gross earned';
    if (parseFloat(formData.platformDeductions) < 0) errs.platformDeductions = 'Deductions cannot be negative';
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const calculateHours = () => {
    if (!formData.startTime || !formData.endTime) return '0';
    const [sh, sm] = formData.startTime.split(':').map(Number);
    const [eh, em] = formData.endTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const diff = (endMins - startMins) / 60;
    return diff > 0 ? diff.toFixed(2) : '0';
  };

  const handleSubmitCard1 = async () => {
    if (!validateCard1()) return;

    if (!workerId) {
      toast.error('Unable to identify worker. Please login again.');
      return;
    }
    
    setLoading(true);
    try {
      const platform = formData.platform;
      const sessionDate = new Date(formData.sessionDate);
      const [startH, startM] = formData.startTime.split(':').map(Number);
      const [endH, endM] = formData.endTime.split(':').map(Number);
      
      const startTime = new Date(sessionDate);
      startTime.setHours(startH, startM, 0, 0);
      
      const endTime = new Date(sessionDate);
      endTime.setHours(endH, endM, 0, 0);

      const hoursWorked = parseFloat(calculateHours());
      const grossEarned = parseFloat(formData.grossEarned);
      const platformDeductions = parseFloat(formData.platformDeductions) || 0;
      const netReceived = grossEarned - platformDeductions;

      const sessionResult = await earningsService.createWorkSession({
        worker_id: workerId,
        platform,
        session_date: sessionDate.toISOString(),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        hours_worked: hoursWorked,
        trips_completed: parseInt(formData.tripsCompleted)
      });

      await earningsService.createEarning({
        session_id: sessionResult.id,
        gross_earned: grossEarned,
        platform_deductions: platformDeductions,
        net_received: netReceived
      });

      setSessionId(sessionResult.id);
      setStep(2);
    } catch (error) {
      if (error.message.includes('already have a session')) {
        toast.error(`You already have a session logged for ${formData.sessionDate}`);
      } else {
        toast.error(error.message || 'Failed to create session');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG, or WebP images allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB');
      return;
    }
    
    setEvidenceFile(file);
    setEvidencePreview(URL.createObjectURL(file));
  };

  const uploadToS3 = async (uploadUrl, file) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
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

  const handleSubmitCard2 = async () => {
    if (!workerId) {
      toast.error('Unable to identify worker. Please login again.');
      return;
    }

    if (!evidenceFile) {
      await earningsService.createEvidence({
        worker_id: workerId,
        session_id: sessionId,
        image_url: ''
      });
      onComplete?.(sessionId);
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    
    try {
      const { uploadUrl, imageUrl } = await earningsService.getPresignedUrl(sessionId, evidenceFile.type);
      await uploadToS3(uploadUrl, evidenceFile);
      
      await earningsService.createEvidence({
        worker_id: workerId,
        session_id: sessionId,
        image_url: imageUrl
      });
      
      onComplete?.(sessionId);
    } catch (error) {
      if (error.message.includes('presigned')) {
        await earningsService.createEvidence({
          worker_id: workerId,
          session_id: sessionId,
          image_url: ''
        });
        onComplete?.(sessionId);
      } else {
        toast.error(error.message || 'Upload failed');
      }
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Work Session & Earnings</CardTitle>
                <CardDescription>Add one session with platform, timing, and earning details.</CardDescription>
              </div>
              <Badge variant="secondary">Step 1 of 2</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Platform</label>
              <select
                value={formData.platform}
                onChange={(event) => setFormData({ ...formData, platform: event.target.value })}
                className={`flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 ${errors.platform ? ERROR_FIELD_CLASS : ''}`}
              >
                <option value="">Select platform</option>
                {platformOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500">Showing {categoryLabel} platforms from your profile category.</p>
              {errors.platform && <p className="text-xs text-red-600">{errors.platform}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Session Date</label>
              <Input
                type="date"
                max={today}
                value={formData.sessionDate}
                onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                className={errors.sessionDate ? ERROR_FIELD_CLASS : ''}
              />
              {errors.sessionDate && <p className="text-xs text-red-600">{errors.sessionDate}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Start Time</label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className={errors.startTime ? ERROR_FIELD_CLASS : ''}
                />
                {errors.startTime && <p className="text-xs text-red-600">{errors.startTime}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">End Time</label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className={errors.endTime ? ERROR_FIELD_CLASS : ''}
                />
                {errors.endTime && <p className="text-xs text-red-600">{errors.endTime}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Hours Worked</label>
              <Input type="text" value={calculateHours()} readOnly className="bg-zinc-100 text-zinc-600" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Trips Completed</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.tripsCompleted}
                  onChange={(e) => setFormData({ ...formData, tripsCompleted: e.target.value })}
                  className={errors.tripsCompleted ? ERROR_FIELD_CLASS : ''}
                  placeholder="0"
                />
                {errors.tripsCompleted && <p className="text-xs text-red-600">{errors.tripsCompleted}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Gross Earned (PKR)</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.grossEarned}
                  onChange={(e) => setFormData({ ...formData, grossEarned: e.target.value })}
                  className={errors.grossEarned ? ERROR_FIELD_CLASS : ''}
                  placeholder="0"
                />
                {errors.grossEarned && <p className="text-xs text-red-600">{errors.grossEarned}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Deductions (PKR)</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.platformDeductions}
                  onChange={(e) => setFormData({ ...formData, platformDeductions: e.target.value })}
                  className={errors.platformDeductions ? ERROR_FIELD_CLASS : ''}
                  placeholder="0"
                />
                {errors.platformDeductions && <p className="text-xs text-red-600">{errors.platformDeductions}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Net Received (PKR)</label>
              <Input type="text" value={formData.netReceived} readOnly className="border-emerald-200 bg-emerald-50 text-emerald-700 font-medium" />
            </div>

            <Button onClick={handleSubmitCard1} disabled={loading} className="h-11 w-full">
              {loading ? 'Creating Session...' : 'Continue to Evidence'}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Evidence Upload</CardTitle>
                <CardDescription>
                  Attach an optional screenshot for this session.
                </CardDescription>
              </div>
              <Badge variant="secondary">Step 2 of 2</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-8 text-center transition-colors hover:border-zinc-400"
            >
              {evidencePreview ? (
                <img src={evidencePreview} alt="Preview" className="mx-auto max-h-60 rounded-md border border-zinc-200 object-contain" />
              ) : (
                <div className="text-zinc-600">
                  <p className="font-medium">Click to upload image</p>
                  <p className="mt-1 text-sm">JPG, PNG, WebP up to 10MB</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            {evidenceFile && (
              <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                <span className="truncate">{evidenceFile.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setEvidenceFile(null);
                    setEvidencePreview(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="ml-3 font-medium text-zinc-900 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}

            {uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                  <div className="h-full bg-zinc-900 transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-center text-xs text-zinc-500">{uploadProgress}% uploaded</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} disabled={loading} className="h-11 flex-1">
                Back
              </Button>
              <Button onClick={handleSubmitCard2} disabled={loading} className="h-11 flex-1">
                {loading ? 'Uploading...' : 'Complete Session'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}