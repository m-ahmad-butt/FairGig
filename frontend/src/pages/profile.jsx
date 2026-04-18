import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setProfile, setReputationHistory, setLoading, setError } from '../store/slices/userSlice';
import Navbar from '../components/Navbar/Navbar';
import userService from '../services/api/userService';
import toast from 'react-hot-toast';

function ProfilePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const { profile, reputationHistory, loading } = useSelector((state) => state.user);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    rollNo: '',
  });

  useEffect(() => {
    if (user && token) {
      fetchProfile();
    }
  }, [user, token]);

  useEffect(() => {
    if (profile && token) {
      setFormData({
        name: profile.name || '',
        rollNo: profile.rollNo || '',
      });
      fetchReputationHistory();
    }
  }, [profile, token]);

  const fetchProfile = async () => {
    try {
      dispatch(setLoading(true));
      const response = await userService.getMyProfile();
      dispatch(setProfile(response));
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (error.response?.status !== 401) {
        toast.error('Failed to load profile');
      }
    } finally {
      dispatch(setLoading(false));
    }
  };

  const fetchReputationHistory = async () => {
    if (!profile?.email) return;
    try {
      const response = await userService.getReputationHistory(profile.email);
      dispatch(setReputationHistory(response));
    } catch (error) {
      console.error('Error fetching reputation history:', error);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await userService.updateProfile(formData);
      await fetchProfile();
      setEditing(false);
      toast.success('Profile updated!');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      await userService.uploadImage(file);
      await fetchProfile();
      toast.success('Profile image updated!');
    } catch (error) {
      toast.error('Failed to upload image');
    }
  };

  const reputationColor = useMemo(() => {
    const score = profile?.reputationScore || 0;
    if (score >= 100) return 'from-green-400 to-emerald-500';
    if (score >= 50) return 'from-blue-400 to-cyan-500';
    if (score >= 0) return 'from-yellow-400 to-orange-500';
    return 'from-red-400 to-pink-500';
  }, [profile?.reputationScore]);

  const sortedHistory = useMemo(() => {
    return [...reputationHistory].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [reputationHistory]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Please log in to view your profile</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-black font-sans">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 text-black font-sans">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-black selection:text-white">
      <Navbar />

      <main className="px-8 lg:px-20 py-8 max-w-7xl mx-auto">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-black flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                  {profile.imageUrl ? (
                    <img src={profile.imageUrl} className="w-full h-full object-cover" alt="profile" />
                  ) : (
                    <span className="text-white text-4xl font-black">{profile.name?.charAt(0)}</span>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-800 transition-all shadow-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
              <div className="mt-4 text-center">
                <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${reputationColor} px-4 py-2 rounded-full`}>
                  <span className="text-white font-black text-lg">★</span>
                  <span className="text-sm font-bold text-white">{profile.reputationScore || 0}</span>
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Reputation</p>
              </div>
            </div>

            <div className="flex-1">
              {editing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black/5 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Roll Number</label>
                    <input
                      type="text"
                      value={formData.rollNo}
                      onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-black/5 outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="flex-1 bg-gray-100 text-black py-2 rounded-lg text-sm font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
                    >
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="mb-6">
                    <h1 className="text-3xl font-black tracking-tight mb-2">{profile.name}</h1>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{profile.rollNo}</p>
                    <p className="text-sm text-gray-500 font-medium mt-1">{profile.email}</p>
                  </div>
                  <button
                    onClick={() => setEditing(true)}
                    className="bg-black text-white px-6 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
                  >
                    Edit Profile
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8">
          <h2 className="text-2xl font-black tracking-tight mb-6">Reputation History</h2>
          {sortedHistory.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 font-medium">No reputation history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedHistory.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.change > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      <span className={`text-lg font-black ${item.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.change > 0 ? '+' : ''}{item.change}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold">{item.reason}</p>
                      <p className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
