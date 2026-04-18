import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import earningsService from '../../services/api/earningsService';
import authService from '../../services/api/authService';

const PLATFORMS = {
  'Ride-hailing': ['Bykea', 'Careem', 'inDrive', 'Airlift'],
  'Food delivery': ['Foodpanda', 'Cheetay'],
  'Freelance': ['Upwork', 'Fiverr', 'Freelancer.com', 'PeoplePerHour'],
  'Domestic/other': ['TaskRobin', 'Rozgar']
};

const PLATFORM_OPTIONS = Object.entries(PLATFORMS).flatMap(([category, apps]) => 
  apps.map(app => ({ category, name: app }))
);

export default function SingleSessionEntry({ onComplete }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    platform: '',
    otherPlatform: '',
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

  useEffect(() => {
    const gross = parseFloat(formData.grossEarned) || 0;
    const deductions = parseFloat(formData.platformDeductions) || 0;
    const net = gross - deductions;
    setFormData(prev => ({ ...prev, netReceived: net >= 0 ? net.toString() : '0' }));
  }, [formData.grossEarned, formData.platformDeductions]);

  const validateCard1 = () => {
    const errs = {};
    if (!formData.platform && !formData.otherPlatform) errs.platform = 'Select a platform';
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
    
    setLoading(true);
    try {
      const platform = formData.otherPlatform || formData.platform;
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

      const earningResult = await earningsService.createEarning({
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

  const resetForm = () => {
    setStep(1);
    setSessionId(null);
    setFormData({
      platform: '',
      otherPlatform: '',
      sessionDate: '',
      startTime: '',
      endTime: '',
      tripsCompleted: '',
      grossEarned: '',
      platformDeductions: '0',
      netReceived: ''
    });
    setEvidenceFile(null);
    setEvidencePreview(null);
    setErrors({});
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {step === 1 && (
        <div className="bg-[#1e1e1e] rounded-2xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-white">Work Session & Earnings</h3>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">Platform</label>
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value, otherPlatform: '' })}
              className={`w-full bg-[#111] border ${errors.platform ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-500`}
            >
              <option value="">Select platform</option>
              {PLATFORM_OPTIONS.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
              <option value="Other">Other</option>
            </select>
            {errors.platform && <p className="text-red-400 text-sm mt-1">{errors.platform}</p>}
          </div>

          {formData.platform === 'Other' && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">Other Platform Name</label>
              <input
                type="text"
                value={formData.otherPlatform}
                onChange={(e) => setFormData({ ...formData, otherPlatform: e.target.value })}
                className="w-full bg-[#111] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-500"
                placeholder="Enter platform name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-2">Session Date</label>
            <input
              type="date"
              max={today}
              value={formData.sessionDate}
              onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
              className={`w-full bg-[#111] border ${errors.sessionDate ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-500`}
            />
            {errors.sessionDate && <p className="text-red-400 text-sm mt-1">{errors.sessionDate}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Start Time</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className={`w-full bg-[#111] border ${errors.startTime ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-500`}
              />
              {errors.startTime && <p className="text-red-400 text-sm mt-1">{errors.startTime}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">End Time</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className={`w-full bg-[#111] border ${errors.endTime ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-500`}
              />
              {errors.endTime && <p className="text-red-400 text-sm mt-1">{errors.endTime}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Hours Worked</label>
            <input
              type="text"
              value={calculateHours()}
              readOnly
              className="w-full bg-[#111] border border-gray-700 rounded-lg px-4 py-3 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Trips Completed</label>
            <input
              type="number"
              min="0"
              value={formData.tripsCompleted}
              onChange={(e) => setFormData({ ...formData, tripsCompleted: e.target.value })}
              className={`w-full bg-[#111] border ${errors.tripsCompleted ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-500`}
              placeholder="0"
            />
            {errors.tripsCompleted && <p className="text-red-400 text-sm mt-1">{errors.tripsCompleted}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Gross Earned (PKR)</label>
            <input
              type="number"
              min="0"
              value={formData.grossEarned}
              onChange={(e) => setFormData({ ...formData, grossEarned: e.target.value })}
              className={`w-full bg-[#111] border ${errors.grossEarned ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-500`}
              placeholder="0"
            />
            {errors.grossEarned && <p className="text-red-400 text-sm mt-1">{errors.grossEarned}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Platform Deductions (PKR)</label>
            <input
              type="number"
              min="0"
              value={formData.platformDeductions}
              onChange={(e) => setFormData({ ...formData, platformDeductions: e.target.value })}
              className={`w-full bg-[#111] border ${errors.platformDeductions ? 'border-red-500' : 'border-gray-700'} rounded-lg px-4 py-3 text-white focus:outline-none focus:border-gray-500`}
              placeholder="0"
            />
            {errors.platformDeductions && <p className="text-red-400 text-sm mt-1">{errors.platformDeductions}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Net Received (PKR)</label>
            <input
              type="text"
              value={formData.netReceived}
              readOnly
              className="w-full bg-amber-900/20 border border-amber-500/50 rounded-lg px-4 py-3 text-amber-400 font-medium"
            />
          </div>

          <button
            onClick={handleSubmitCard1}
            disabled={loading}
            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Continue'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-[#1e1e1e] rounded-2xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-white">Evidence Upload</h3>
          
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
          >
            {evidencePreview ? (
              <img src={evidencePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
            ) : (
              <div className="text-gray-400">
                <p className="mb-2">Click or drag to upload image</p>
                <p className="text-sm">JPG, PNG, WebP (max 10MB)</p>
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

          {uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-center text-sm text-gray-400">{uploadProgress}% uploaded</p>
            </div>
          )}

          <button
            onClick={handleSubmitCard2}
            disabled={loading}
            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 disabled:opacity-50"
          >
            {loading ? 'Uploading...' : 'Complete'}
          </button>
        </div>
      )}
    </div>
  );
}