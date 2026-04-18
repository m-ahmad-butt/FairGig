import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentRoom, setTopics, setLoading, setError } from '../store/slices/discussionsSlice';
import Navbar from '../components/Navbar/Navbar';
import discussionService from '../services/api/discussionService';
import toast from 'react-hot-toast';

function DiscussionTopicsPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  const { currentRoom, topics, loading } = useSelector((state) => state.discussions);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    isPublic: true,
  });
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    fetchRoomDetails();
    fetchTopics();
  }, [roomId]);

  const fetchRoomDetails = async () => {
    try {
      const response = await discussionService.getRoomDetails(roomId);
      dispatch(setCurrentRoom(response));
    } catch (error) {
      toast.error('Failed to load room details');
      navigate('/discussions');
    }
  };

  const fetchTopics = async () => {
    try {
      dispatch(setLoading(true));
      const response = await discussionService.getTopicsInRoom(roomId);
      dispatch(setTopics(response));
    } catch (error) {
      toast.error('Failed to load topics');
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

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    try {
      const code = generateCode();
      const response = await discussionService.createTopic({ roomId, ...formData, code });
      
      if (!formData.isPublic) {
        toast.success(`Topic created! Code: ${response.code}`, { duration: 5000 });
      } else {
        toast.success('Topic created successfully!');
      }
      
      setShowCreateModal(false);
      setFormData({ name: '', isPublic: true });
      fetchTopics();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create topic');
    }
  };

  const handleJoinTopic = async (topicId) => {
    try {
      await discussionService.joinPrivateTopic(topicId, '');
      toast.success('Joined topic successfully!');
      fetchTopics();
    } catch (error) {
      toast.error('Failed to join topic');
    }
  };

  const handleJoinPrivateTopic = async (e) => {
    e.preventDefault();
    try {
      const response = await discussionService.joinPrivateTopic(null, joinCode);
      toast.success('Joined topic successfully!');
      setShowJoinModal(false);
      setJoinCode('');
      navigate(`/discussions/topics/${response.id}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Invalid topic code');
    }
  };

  const filteredTopics = useMemo(() => {
    if (!searchQuery) return topics;
    return topics.filter(topic =>
      topic.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [topics, searchQuery]);

  const topicsByCategory = useMemo(() => {
    const created = filteredTopics.filter(t => t.createdBy === user?.email);
    const joined = filteredTopics.filter(t => t.isMember && t.createdBy !== user?.email);
    const available = filteredTopics.filter(t => t.isPublic && !t.isMember && t.createdBy !== user?.email);
    
    return { created, joined, available };
  }, [filteredTopics, user]);

  const topicStats = useMemo(() => {
    return {
      total: topics.length,
      created: topics.filter(t => t.createdBy === user?.email).length,
      joined: topics.filter(t => t.isMember && t.createdBy !== user?.email).length,
    };
  }, [topics, user]);

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-black selection:text-white">
      <Navbar />

      <main className="px-8 lg:px-20 py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/discussions')}
            className="flex items-center gap-2 text-gray-500 hover:text-black mb-4 font-bold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Rooms
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight mb-2">{currentRoom?.name}</h1>
              {!currentRoom?.isPublic && currentRoom?.code && (
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-1">Room Code (share this to invite others)</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-mono font-bold bg-gray-100 px-4 py-2 rounded-lg inline-block">{currentRoom.code}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentRoom.code);
                        toast.success('Code copied to clipboard!');
                      }}
                      className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-all"
                      title="Copy code"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                <span>{topicStats.total} topics</span>
              </div>
            </div>
            <div className="flex gap-3">
              {currentRoom?.isPrivate && (
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="bg-gray-100 text-black px-6 py-2 rounded-lg text-sm font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Join Private
                </button>
              )}
              {currentRoom?.createdBy === user?.email && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-black text-white px-6 py-2 rounded-lg text-sm font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
                >
                  Create Topic
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topics..."
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400 font-medium">Loading topics...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* My Topics */}
            {topicsByCategory.created.length > 0 && (
              <div>
                <h2 className="text-xl font-black mb-4">My Topics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {topicsByCategory.created.map((topic) => (
                    <div
                      key={topic.id}
                      onClick={() => navigate(`/discussions/topics/${topic.id}`)}
                      className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-black">{topic.name}</h3>
                        {!topic.isPublic && (
                          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">OWNER</span>
                      </div>
                      {!topic.isPublic && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-400 mb-1">Code</p>
                          <p className="text-sm font-mono font-bold bg-gray-100 px-3 py-1 rounded inline-block">{topic.code}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{topic._count?.discussionMessages || 0} messages</span>
                        <span>{topic._count?.members || 0} members</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Joined Topics */}
            {topicsByCategory.joined.length > 0 && (
              <div>
                <h2 className="text-xl font-black mb-4">Joined Topics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {topicsByCategory.joined.map((topic) => (
                    <div
                      key={topic.id}
                      onClick={() => navigate(`/discussions/topics/${topic.id}`)}
                      className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-black">{topic.name}</h3>
                        {!topic.isPublic && (
                          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{topic._count?.discussionMessages || 0} messages</span>
                        <span>{topic._count?.members || 0} members</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Public Topics */}
            <div>
              <h2 className="text-xl font-black mb-4">Available Public Topics</h2>
              {topicsByCategory.available.length === 0 ? (
                <div className="text-center py-12 bg-white border border-gray-100 rounded-2xl">
                  <p className="text-gray-400 font-medium">No available topics found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {topicsByCategory.available.map((topic) => (
                    <div
                      key={topic.id}
                      className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-all"
                    >
                      <h3 className="text-lg font-black mb-2">{topic.name}</h3>
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                        <span>{topic._count?.discussionMessages || 0} messages</span>
                        <span>{topic._count?.members || 0} members</span>
                      </div>
                      <button
                        onClick={() => handleJoinTopic(topic.id)}
                        className="w-full bg-black text-white py-2 rounded-lg text-sm font-black uppercase hover:bg-gray-800 transition-all"
                      >
                        Join Topic
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
            <h2 className="text-2xl font-black mb-6">Create Topic</h2>
            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Topic Name</label>
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
                <label className="text-sm font-bold">Private Topic</label>
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
            <h2 className="text-2xl font-black mb-6">Join Private Topic</h2>
            <form onSubmit={handleJoinPrivateTopic} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Topic Code</label>
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

export default DiscussionTopicsPage;
