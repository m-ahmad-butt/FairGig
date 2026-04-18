import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import userService from '../services/api/userService';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar/Navbar';

function OtherProfilePage() {
  const { email } = useParams();
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  const [user, setUser] = useState(null);
  const [reputation, setReputation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [email]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [userRes, reputationRes] = await Promise.all([
        userService.getPublicProfile(email),
        userService.getReputation(email),
      ]);
      
      setUser(userRes.user);
      setReputation(reputationRes.reputation);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const reputationColor = useMemo(() => {
    if (!reputation) return 'gray';
    const score = reputation.reputationScore || 0;
    if (score >= 80) return 'green';
    if (score >= 50) return 'blue';
    if (score >= 20) return 'yellow';
    return 'red';
  }, [reputation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <p className="text-xl font-bold text-gray-400">User not found</p>
            <button
              onClick={() => navigate('/profile')}
              className="mt-4 px-6 py-2 bg-black text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
            >
              Back to Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-black selection:text-white">
      <Navbar />
      
      <main className="px-8 lg:px-20 py-8 max-w-5xl mx-auto">
        <div className="bg-white border border-gray-100 rounded-2xl p-8">
          <div className="flex flex-col lg:flex-row items-start gap-8">
            <div className="w-32 h-32 rounded-full bg-black flex items-center justify-center overflow-hidden flex-shrink-0">
              {user.imageUrl ? (
                <img src={user.imageUrl} className="w-full h-full object-cover" alt={user.name} />
              ) : (
                <span className="text-white text-4xl font-black">{user.name.charAt(0)}</span>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-black tracking-tight mb-2">{user.name}</h1>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">{user.rollNo}</p>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Reputation Score</p>
                  <p className={`text-3xl font-black text-${reputationColor}-600`}>
                    {reputation?.reputationScore || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Member Since</p>
                  <p className="text-sm font-bold">{new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <button
                onClick={() => navigate(`/messages?email=${email}`)}
                className="mt-6 px-6 py-3 bg-black text-white rounded-lg font-black uppercase tracking-wider hover:bg-gray-800 transition-all"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default OtherProfilePage;
