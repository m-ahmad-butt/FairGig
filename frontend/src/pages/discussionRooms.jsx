import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setRooms, setLoading, setError } from '../store/slices/discussionsSlice';
import Navbar from '../components/Navbar/Navbar';
import discussionService from '../services/api/discussionService';
import toast from 'react-hot-toast';

function DiscussionRoomsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  const { rooms, loading } = useSelector((state) => state.discussions);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    isPublic: true,
  });
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      dispatch(setLoading(true));
      const response = await discussionService.getAllPublicRooms();
      dispatch(setRooms(response));
    } catch (error) {
      toast.error('Failed to load rooms');
      dispatch(setError(error.message));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const code = generateCode();
      const response = await discussionService.createRoom({ ...formData, code });
      
      if (!formData.isPublic) {
        toast.success(`Room created! Code: ${response.code}`, { duration: 5000 });
      } else {
        toast.success('Room created successfully!');
      }
      
      setShowCreateModal(false);
      setFormData({ name: '', isPublic: true });
      fetchRooms();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create room');
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      await discussionService.joinPrivateRoom(roomId, '');
      toast.success('Joined room successfully!');
      fetchRooms();
    } catch (error) {
      toast.error('Failed to join room');
    }
  };

  const handleJoinPrivateRoom = async (e) => {
    e.preventDefault();
    try {
      const response = await discussionService.joinPrivateRoom(joinCode);
      toast.success('Joined room successfully!');
      setShowJoinModal(false);
      setJoinCode('');
      navigate(`/discussions/rooms/${response.id}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Invalid room code');
    }
  };

  const filteredRooms = useMemo(() => {
    if (!searchQuery) return rooms;
    return rooms.filter(room =>
      room.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rooms, searchQuery]);

  const roomsByCategory = useMemo(() => {
    const created = filteredRooms.filter(r => r.createdBy === user?.email);
    const joined = filteredRooms.filter(r => r.isMember && r.createdBy !== user?.email);
    const available = filteredRooms.filter(r => r.isPublic && !r.isMember && r.createdBy !== user?.email);
    
    return { created, joined, available };
  }, [filteredRooms, user]);

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-black selection:text-white">
      <Navbar />

      <main className="px-8 lg:px-20 py-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Discussion Rooms</h1>
            <p className="text-gray-500 font-medium">Join conversations with your peers</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="bg-gray-100 text-black px-6 py-2 rounded-lg text-sm font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
            >
              Join Private
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-black text-white px-6 py-2 rounded-lg text-sm font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
            >
              Create Room
            </button>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rooms..."
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400 font-medium">Loading rooms...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Created Rooms */}
            {roomsByCategory.created.length > 0 && (
              <div>
                <h2 className="text-xl font-black mb-4">My Rooms</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {roomsByCategory.created.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => navigate(`/discussions/rooms/${room.id}`)}
                      className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-black">{room.name}</h3>
                        {!room.isPublic && (
                          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">OWNER</span>
                      </div>
                      {!room.isPublic && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-400 mb-1">Code</p>
                          <p className="text-sm font-mono font-bold bg-gray-100 px-3 py-1 rounded inline-block">{room.code}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{room._count?.topics || 0} topics</span>
                        <span>{room._count?.members || 0} members</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Joined Rooms */}
            {roomsByCategory.joined.length > 0 && (
              <div>
                <h2 className="text-xl font-black mb-4">Joined Rooms</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {roomsByCategory.joined.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => navigate(`/discussions/rooms/${room.id}`)}
                      className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-black">{room.name}</h3>
                        {!room.isPublic && (
                          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{room._count?.topics || 0} topics</span>
                        <span>{room._count?.members || 0} members</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Public Rooms */}
            <div>
              <h2 className="text-xl font-black mb-4">Available Public Rooms</h2>
              {roomsByCategory.available.length === 0 ? (
                <div className="text-center py-12 bg-white border border-gray-100 rounded-2xl">
                  <p className="text-gray-400 font-medium">No available rooms found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {roomsByCategory.available.map((room) => (
                    <div
                      key={room.id}
                      className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-all"
                    >
                      <h3 className="text-lg font-black mb-2">{room.name}</h3>
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                        <span>{room._count?.topics || 0} topics</span>
                        <span>{room._count?.members || 0} members</span>
                      </div>
                      <button
                        onClick={() => handleJoinRoom(room.id)}
                        className="w-full bg-black text-white py-2 rounded-lg text-sm font-black uppercase hover:bg-gray-800 transition-all"
                      >
                        Join Room
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-black mb-6">Create Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Room Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: !e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm font-bold">Private Room</label>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-100 text-black py-2 rounded-lg text-sm font-black uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-black uppercase"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-black mb-6">Join Private Room</h2>
            <form onSubmit={handleJoinPrivateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Room Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black uppercase tracking-widest"
                  placeholder="ABCD1234"
                  maxLength="8"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 bg-gray-100 text-black py-2 rounded-lg text-sm font-black uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-black uppercase"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiscussionRoomsPage;
