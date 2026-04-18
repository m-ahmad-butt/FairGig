import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentTopic, setMessages, addMessage, setLoading, setError } from '../store/slices/discussionsSlice';
import Navbar from '../components/Navbar/Navbar';
import discussionService from '../services/api/discussionService';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

function DiscussionMessagesPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  const { currentTopic, messages, loading } = useSelector((state) => state.discussions);
  const [messageText, setMessageText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchTopicDetails();
    fetchMessages();

    return () => {};
  }, [topicId]);

  useEffect(() => {
    const newSocket = initializeSocket();

    return () => {
      if (newSocket) {
        newSocket.off('new_discussion_message');
        newSocket.off('messages_updated');
        newSocket.off('connect');
        newSocket.off('disconnect');
        newSocket.off('connect_error');
        newSocket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (topicId && socket) {
      socket.emit('join_topic', topicId);
    }
  }, [topicId, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSocket = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const newSocket = io(API_URL, {
      path: '/socket.io/messages',
      auth: { token },
    });

    newSocket.on('connect', () => {
      if (topicId) {
        newSocket.emit('join_topic', topicId);
      }
    });

    newSocket.on('new_discussion_message', (message) => {
      dispatch(addMessage(message));
    });

    newSocket.on('messages_updated', () => {
      fetchMessages();
    });

    newSocket.on('disconnect', () => {
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    setSocket(newSocket);

    return newSocket;
  };

  const fetchTopicDetails = async () => {
    try {
      const response = await discussionService.getTopicDetails(topicId);
      dispatch(setCurrentTopic(response));
    } catch (error) {
      toast.error('Failed to load topic details');
      navigate('/discussions');
    }
  };

  const fetchMessages = async () => {
    try {
      dispatch(setLoading(true));
      const response = await discussionService.getDiscussionMessages(topicId);
      dispatch(setMessages(response));
    } catch (error) {
      toast.error('Failed to load messages');
      dispatch(setError(error.message));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    try {
      await discussionService.sendDiscussionMessage(
        topicId,
        messageText,
        isAnonymous
      );

      setMessageText('');
    } catch (error) {
      if (error.response?.data?.abuseDetected) {
        toast.error('Message contains abusive content and was not sent');
      } else {
        toast.error('Failed to send message');
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [messages]);

  const messagesByDate = useMemo(() => {
    const grouped = {};
    sortedMessages.forEach(message => {
      const date = new Date(message.createdAt).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(message);
    });
    return grouped;
  }, [sortedMessages]);

  const isMyMessage = (message) => {
    return message.senderEmail === user?.email;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-black selection:text-white flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col px-8 lg:px-20 py-8 max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/discussions/rooms/${currentTopic?.roomId}`)}
            className="flex items-center gap-2 text-gray-500 hover:text-black mb-4 font-bold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Topics
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight mb-2">{currentTopic?.name}</h1>
              {!currentTopic?.isPublic && currentTopic?.code && (
                <div className="mt-2">
                  <p className="text-xs text-gray-400 mb-1">Topic Code (share this to invite others)</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-mono font-bold bg-gray-100 px-4 py-2 rounded-lg inline-block">{currentTopic.code}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentTopic.code);
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
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-6 mb-6 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-400 font-medium">Loading messages...</p>
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 font-medium">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(messagesByDate).map(([date, msgs]) => (
                <div key={date}>
                  <div className="flex items-center justify-center mb-4">
                    <span className="bg-gray-100 px-4 py-1 rounded-full text-xs font-bold text-gray-500 uppercase">
                      {date}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {msgs.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${isMyMessage(message) ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] ${isMyMessage(message) ? 'order-2' : 'order-1'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            {!isMyMessage(message) && (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-sm font-black">
                                  {message.isAnonymous ? '?' : message.senderName?.charAt(0)}
                                </span>
                              </div>
                            )}
                            <span className="text-xs font-bold text-gray-500">
                              {message.isAnonymous ? 'Anonymous' : message.senderName}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div
                            className={`px-4 py-3 rounded-2xl ${
                              isMyMessage(message)
                                ? 'bg-black text-white'
                                : 'bg-gray-100 text-black'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            {message.isAbusive && (
                              <div className="mt-2 pt-2 border-t border-white/20">
                                <p className="text-xs text-red-300">Warning: Abusive content detected</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-bold">Send Anonymously</span>
            </label>
          </div>
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 bg-gray-50 border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
            />
            <button
              type="submit"
              disabled={!messageText.trim()}
              className="bg-black text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default DiscussionMessagesPage;
