import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../../services/api/authService';

// Leaflet loaded via CDN in index.html
export default function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get initial data from location state or auth context
  const initialEmail = location.state?.email || 'a***@gmail.com';
  const initialRole = location.state?.role || 'worker';
  // If role is worker, we treat them as a rider for this onboarding flow
  const category = initialRole === 'worker' ? 'RIDER' : initialRole;

  const [userEmail, setUserEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // Location State
  const [locationMethod, setLocationMethod] = useState(null); // 'auto' or 'manual'
  const [city, setCity] = useState('');
  const [zone, setZone] = useState('');
  const [coords, setCoords] = useState(null);
  
  // Vehicle State
  const [vehicleType, setVehicleType] = useState(null);
  
  // Map Reference
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  // Resend Timer Logic
  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const initMap = () => {
    if (!window.L || !mapRef.current || mapInstance.current) return;
    
    // Pakistan center
    const defaultCenter = [30.3753, 69.3451];
    
    mapInstance.current = window.L.map(mapRef.current).setView(defaultCenter, 5);
    
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance.current);

    markerRef.current = window.L.marker(defaultCenter, { draggable: true }).addTo(mapInstance.current);

    markerRef.current.on('dragend', function (e) {
      const position = e.target.getLatLng();
      handleReverseGeocode(position.lat, position.lng);
    });
  };

  // Leaflet map init when step 2 + manual location selected
  useEffect(() => {
    if (step === 2 && locationMethod === 'manual' && window.L) {
      setTimeout(initMap, 100);
    }
  }, [step, locationMethod]);

  const handleReverseGeocode = async (lat, lon) => {
    setLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const data = await response.json();
      
      const cityName = data.address.city || data.address.town || data.address.village || '';
      const zoneName = data.address.suburb || data.address.city_district || data.address.neighbourhood || '';
      
      setCity(cityName);
      setZone(zoneName);
      setCoords({ lat, lon });
    } catch (error) {
      toast.error('Failed to get location details');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoLocation = () => {
    setLocationMethod('auto');
    setLoading(true);
    
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleReverseGeocode(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        toast.error('Geolocation permission denied');
        setLoading(false);
      }
    );
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Enter 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      await authService.verifyOTP(userEmail, otp);
      toast.success('Email verified');
      setStep(2);
    } catch (error) {
      toast.error(error.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    
    setLoading(true);
    try {
      await authService.resendOTP(userEmail);
      setResendTimer(60);
      toast.success('OTP Resent');
    } catch (error) {
      toast.error(error.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    const payload = {
      emailVerified: true,
      city,
      zone,
      vehicleType: category === 'RIDER' ? vehicleType : undefined
    };

    try {
      const token = localStorage.getItem('accessToken');
      // Using /api/users/me as requested
      const baseUrl = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8080';
      const response = await fetch(`${baseUrl}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Update failed');
      
      setStep(4); // Finish screen
      setTimeout(() => navigate('/worker/dashboard'), 2000);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderProgress = () => {
    const totalSteps = category === 'RIDER' ? 3 : 2;
    const progress = (step / (totalSteps + 1)) * 100;
    return (
      <div className="w-full bg-gray-200 h-1 mb-8 rounded-full overflow-hidden">
        <div 
          className="bg-black h-full transition-all duration-500 ease-out" 
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        {step < 4 && renderProgress()}

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Verify Email</h2>
              <p className="text-gray-500">Code sent to <span className="text-black font-medium">{userEmail}</span></p>
            </div>
            
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-gray-100 border-none text-center text-3xl tracking-[1em] py-4 rounded-xl focus:ring-2 focus:ring-black font-mono"
                placeholder="000000"
              />
              
              <button
                type="submit"
                className="w-full bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors"
              >
                Continue
              </button>
            </form>

            <div className="text-center">
              <button
                onClick={handleResendOTP}
                disabled={resendTimer > 0}
                className="text-gray-500 hover:text-black disabled:opacity-50 transition-colors"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <h2 className="text-2xl font-bold text-center">Where do you work?</h2>
            
            {!locationMethod ? (
              <div className="grid gap-4">
                <button
                  onClick={handleAutoLocation}
                  className="bg-gray-100 p-6 rounded-2xl border border-gray-200 hover:border-black transition-all text-left flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold">Use my location</h3>
                    <p className="text-sm text-gray-500">Auto-detect city & zone</p>
                  </div>
                </button>

                <button
                  onClick={() => setLocationMethod('manual')}
                  className="bg-gray-100 p-6 rounded-2xl border border-gray-200 hover:border-black transition-all text-left flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-black/5 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7l5-2.5 5.553 2.776a1 1 0 01.447.894v10.764a1 1 0 01-1.447.894L15 17l-6 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold">Drop a pin manually</h3>
                    <p className="text-sm text-gray-500">Select from map</p>
                  </div>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {locationMethod === 'manual' && (
                  <div className="h-64 bg-gray-100 rounded-2xl overflow-hidden relative border border-gray-300">
                    <div ref={mapRef} className="h-full w-full" />
                  </div>
                )}
                
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block">City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-gray-100 border-none py-3 px-4 rounded-xl focus:ring-1 focus:ring-black"
                        placeholder="e.g. Lahore"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 uppercase tracking-widest mb-1 block">Zone / Area</label>
                      <input
                        type="text"
                        value={zone}
                        onChange={(e) => setZone(e.target.value)}
                        className="w-full bg-gray-100 border-none py-3 px-4 rounded-xl focus:ring-1 focus:ring-black"
                        placeholder="e.g. Gulberg"
                      />
                    </div>
                    <button
                      onClick={() => category === 'RIDER' ? setStep(3) : handleFinish()}
                      disabled={!city}
                      className="w-full bg-black text-white font-bold py-4 rounded-xl mt-4 hover:bg-gray-800 disabled:opacity-50 transition-all"
                    >
                      Next Step
                    </button>
                    <button 
                      onClick={() => setLocationMethod(null)}
                      className="text-gray-400 text-sm hover:text-black"
                    >
                      Change method
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 3 && category === 'RIDER' && (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <h2 className="text-2xl font-bold text-center">What do you ride?</h2>
            
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'motorcycle', label: 'Motorcycle', icon: '🏍️' },
                { id: 'rickshaw', label: 'Rickshaw', icon: '🛺' },
                { id: 'car', label: 'Car', icon: '🚗' },
                { id: 'van', label: 'Van / Pickup', icon: '🚚' },
                { id: 'bicycle', label: 'Bicycle', icon: '🚲' }
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVehicleType(v.id)}
                  className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${
                    vehicleType === v.id 
                      ? 'bg-black text-white border-black' 
                      : 'bg-gray-100 text-black border-gray-200 hover:border-black'
                  }`}
                >
                  <span className="text-4xl">{v.icon}</span>
                  <span className="font-medium text-sm text-center">{v.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleFinish}
              disabled={!vehicleType || loading}
              className="w-full bg-black text-white font-bold py-4 rounded-xl mt-4 hover:bg-gray-800 disabled:opacity-50 transition-all"
            >
              {loading ? 'Saving...' : 'Complete Profile'}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/20">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-2">You're all set!</h2>
            <p className="text-gray-500">Redirecting to your dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
}
