import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setChats, setCurrentChat, setMessages, addMessage, setLoading, setError } from '../store/slices/directMessagesSlice';
import Navbar from '../components/Navbar/Navbar';
import directMessageService from '../services/api/directMessageService';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../utils/api';

function MessagesPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  const { chats, currentChat, messages, loading } = useSelector((state) => state.directMessages);
  const [messageText, setMessageText] = useState('');
  const [socket, setSocket] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatEmail, setNewChatEmail] = useState('');
  const [activeTab, setActiveTab] = useState('chats');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [sendingRequest, setSendingRequest] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const newSocket = initializeSocket();

    return () => {
      if (newSocket) {
        newSocket.off('new_message');
        newSocket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (chatId) {
      fetchChatDetails();
      fetchMessages();
      
      if (socket) {
        socket.emit('join_chat', chatId);
      }
    }
  }, [chatId, socket]);

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (activeTab === 'find-users') {
      fetchUsers();
    }
  }, [activeTab]);

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
      if (chatId) {
        newSocket.emit('join_chat', chatId);
      }
    });

    newSocket.on('new_message', (message) => {
      dispatch(addMessage(message));
    });

    setSocket(newSocket);

    return newSocket;
  };

  const fetchChats = async () => {
    try {
      dispatch(setLoading(true));
      const response = await directMessageService.getAllChats();
      dispatch(setChats(response));
    } catch (error) {
      toast.error('Failed to load chats');
      dispatch(setError(error.message));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await api.get('/api/users/chat-users');
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSendRequest = async (userEmail) => {
    setSendingRequest(prev => ({ ...prev, [userEmail]: true }));
    try {
      const response = await api.post('/api/messages/chat-requests', { to: userEmail });
      toast.success('Chat request sent!');
      await fetchChats();
      if (response.data?.chat?.id) {
        navigate(`/messages/${response.data.chat.id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    } finally {
      setSendingRequest(prev => ({ ...prev, [userEmail]: false }));
    }
  };

  const fetchChatDetails = async () => {
    try {
      const response = await directMessageService.getChatById(chatId);
      dispatch(setCurrentChat(response));
    } catch (error) {
      toast.error('Failed to load chat details');
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await directMessageService.getChatById(chatId);
      dispatch(setMessages(response.messages || []));
    } catch (error) {
      toast.error('Failed to load messages');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !chatId) return;

    try {
      await directMessageService.sendMessage(chatId, messageText);
      setMessageText('');
    } catch (error) {
      if (error.response?.data?.abuseDetected) {
        toast.error('Message contains abusive content and was not sent');
      } else {
        toast.error('Failed to send message');
      }
    }
  };

  const handleCreateChat = async (e) => {
    e.preventDefault();
    try {
      const response = await directMessageService.createOrGetChat(newChatEmail);
      setShowNewChatModal(false);
      setNewChatEmail('');
      fetchChats();
      navigate(`/messages/${response.id}`);
    } catch (error) {
      toast.error('Failed to create chat');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredChats = useMemo(() => {
    if (!Array.isArray(chats)) return [];
    if (!searchQuery) return chats;
    return chats.filter(chat => {
      const otherUser = chat.participants?.find(p => p.email !== user?.email);
      return otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             otherUser?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [chats, searchQuery, user]);

  const sortedChats = useMemo(() => {
    if (!Array.isArray(filteredChats)) return [];
    return [...filteredChats].sort((a, b) => {
      const aDate = a.lastMessage?.createdAt || a.createdAt;
      const bDate = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bDate) - new Date(aDate);
    });
  }, [filteredChats]);

  const sortedMessages = useMemo(() => {
    if (!Array.isArray(messages)) return [];
    return [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [messages]);

  const getOtherUser = (chat) => {
    const otherUserEmail = chat.user1 === user?.email ? chat.user2 : chat.user1;
    return {
      email: otherUserEmail,
      name: chat.otherUserName || otherUserEmail,
      imageUrl: chat.profileImageUrl || null
    };
  };

  const isMyMessage = (message) => {
    return message.sender === user?.email;
  };

  const filteredFindUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    
    const existingChatEmails = new Set(
      chats.map(chat => {
        const otherUserEmail = chat.user1 === user?.email ? chat.user2 : chat.user1;
        return otherUserEmail;
      })
    );
    
    let filtered = users.filter(u => 
      u.email !== user?.email && !existingChatEmails.has(u.email)
    );
    
    if (userSearchTerm) {
      filtered = filtered.filter(u =>
        u.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [users, userSearchTerm, chats, user]);

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-black selection:text-white flex flex-col">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 bg-white border-r border-gray-100 flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black">Messages</h2>
              {activeTab === 'chats' && (
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab('chats')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-black uppercase tracking-wider transition-all ${
                  activeTab === 'chats'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Chats
              </button>
              <button
                onClick={() => setActiveTab('find-users')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-black uppercase tracking-wider transition-all ${
                  activeTab === 'find-users'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Find Users
              </button>
            </div>

            <input
              type="text"
              value={activeTab === 'chats' ? searchQuery : userSearchTerm}
              onChange={(e) => activeTab === 'chats' ? setSearchQuery(e.target.value) : setUserSearchTerm(e.target.value)}
              placeholder={activeTab === 'chats' ? 'Search chats...' : 'Search users...'}
              className="w-full px-4 py-2 bg-gray-50 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'chats' ? (
              loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm font-medium">Loading chats...</p>
                </div>
              ) : sortedChats.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <p className="text-gray-400 text-sm font-medium">No chats yet</p>
                </div>
              ) : (
                sortedChats.map((chat) => {
                  const otherUser = getOtherUser(chat);
                  return (
                    <div
                      key={chat.id}
                      onClick={() => navigate(`/messages/${chat.id}`)}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-all ${
                        chatId === chat.id ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                          {otherUser?.imageUrl ? (
                            <img src={otherUser.imageUrl} className="w-full h-full rounded-full object-cover" alt="" />
                          ) : (
                            <span className="text-white text-sm font-black">{otherUser?.name?.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-black truncate">{otherUser?.name}</h3>
                          <p className="text-xs text-gray-500 truncate">
                            {chat.lastMessage?.content || 'No messages yet'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              usersLoading ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm font-medium">Loading users...</p>
                </div>
              ) : filteredFindUsers.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <p className="text-gray-400 text-sm font-medium">No users found</p>
                </div>
              ) : (
                filteredFindUsers.map((u) => (
                  <div
                    key={u.email}
                    className="p-4 border-b border-gray-100"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        {u.imageUrl ? (
                          <img src={u.imageUrl} className="w-full h-full rounded-full object-cover" alt="" />
                        ) : (
                          <span className="text-white text-sm font-black">
                            {u.name?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black truncate">{u.name || 'Anonymous'}</h3>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-xs font-medium text-gray-600">{u.reputationScore || 0}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSendRequest(u.email)}
                      disabled={sendingRequest[u.email]}
                      className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white font-black py-2 px-4 rounded-lg text-xs uppercase tracking-wider transition-all"
                    >
                      {sendingRequest[u.email] ? 'Sending...' : 'Send Request'}
                    </button>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {chatId && currentChat ? (
            <>
              <div className="p-6 bg-white border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                    {getOtherUser(currentChat)?.imageUrl ? (
                      <img src={getOtherUser(currentChat).imageUrl} className="w-full h-full rounded-full object-cover" alt="" />
                    ) : (
                      <span className="text-white text-sm font-black">{getOtherUser(currentChat)?.name?.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-black">{getOtherUser(currentChat)?.name}</h2>
                    <p className="text-xs text-gray-500">{getOtherUser(currentChat)?.email}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {sortedMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400 font-medium">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sortedMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${isMyMessage(message) ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%]`}>
                          <div
                            className={`px-4 py-3 rounded-2xl ${
                              isMyMessage(message)
                                ? 'bg-black text-white'
                                : 'bg-white text-black border border-gray-100'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            {message.isAbusive && (
                              <div className="mt-2 pt-2 border-t border-white/20">
                                <p className="text-xs text-red-300">Warning: Abusive content detected</p>
                              </div>
                            )}
                          </div>
                          <p className={`text-xs text-gray-400 mt-1 ${isMyMessage(message) ? 'text-right' : 'text-left'}`}>
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="p-6 bg-white border-t border-gray-100">
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
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <svg className="w-20 h-20 text-gray-200 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3.293 3.293 3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
                <h3 className="text-2xl font-black mb-2">Select a chat</h3>
                <p className="text-gray-400 font-medium">Choose a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-black mb-6">New Chat</h2>
            <form onSubmit={handleCreateChat} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">User Email</label>
                <input
                  type="email"
                  value={newChatEmail}
                  onChange={(e) => setNewChatEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black"
                  placeholder="user@lhr.nu.edu.pk"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="flex-1 bg-gray-100 text-black py-2 rounded-lg text-sm font-black uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-black text-white py-2 rounded-lg text-sm font-black uppercase"
                >
                  Start Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MessagesPage;
