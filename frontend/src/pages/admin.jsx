import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setUsers, setAdminNotifications, setPagination, updateUserBanStatus, setLoading, setError } from '../store/slices/adminSlice';
import Navbar from '../components/Navbar/Navbar';
import adminService from '../services/api/adminService';
import toast from 'react-hot-toast';

function AdminPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  const { users, adminNotifications, pagination, loading } = useSelector((state) => state.admin);
  const [activeTab, setActiveTab] = useState('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/profile');
      return;
    }
    fetchUsers();
    fetchAdminNotifications();
  }, [pagination.page]);

  const fetchUsers = async () => {
    try {
      dispatch(setLoading(true));
      const response = await adminService.getAllUsers(pagination.page, pagination.limit);
      dispatch(setUsers(response.users));
      dispatch(setPagination({ total: response.total }));
    } catch (error) {
      toast.error('Failed to load users');
      dispatch(setError(error.message));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const fetchAdminNotifications = async () => {
    try {
      const response = await adminService.getAdminNotifications();
      dispatch(setAdminNotifications(response.notifications));
    } catch (error) {
      console.error('Failed to load admin notifications:', error);
    }
  };

  const handleToggleBan = async (email, currentBanStatus) => {
    try {
      await adminService.toggleBanUser(email, !currentBanStatus);
      dispatch(updateUserBanStatus({ email, isBan: !currentBanStatus }));
      toast.success(`User ${!currentBanStatus ? 'banned' : 'unbanned'} successfully`);
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.rollNo?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus === 'banned') {
      filtered = filtered.filter(u => u.isBan);
    } else if (filterStatus === 'active') {
      filtered = filtered.filter(u => !u.isBan);
    }

    return filtered;
  }, [users, searchQuery, filterStatus]);

  const userStats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(u => !u.isBan).length,
      banned: users.filter(u => u.isBan).length,
      admins: users.filter(u => u.role === 'admin').length,
    };
  }, [users]);

  const sortedNotifications = useMemo(() => {
    return [...adminNotifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [adminNotifications]);

  const unreadNotifications = useMemo(() => {
    return adminNotifications.filter(n => !n.isRead).length;
  }, [adminNotifications]);

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-black selection:text-white">
      <Navbar />

      <main className="px-8 lg:px-20 py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight mb-2">Admin Dashboard</h1>
          <p className="text-gray-500 font-medium">Manage users and monitor abuse reports</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Total Users</p>
            <p className="text-3xl font-black">{userStats.total}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Active</p>
            <p className="text-3xl font-black text-green-600">{userStats.active}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Banned</p>
            <p className="text-3xl font-black text-red-600">{userStats.banned}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Abuse Reports</p>
            <p className="text-3xl font-black text-yellow-600">{unreadNotifications}</p>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-lg text-sm font-black uppercase tracking-wider transition-all ${
              activeTab === 'users' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Users ({userStats.total})
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-6 py-3 rounded-lg text-sm font-black uppercase tracking-wider transition-all ${
              activeTab === 'notifications' ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Abuse Reports ({unreadNotifications})
          </button>
        </div>

        {activeTab === 'users' ? (
          <>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black text-sm"
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black text-sm font-bold"
                >
                  <option value="all">All Users</option>
                  <option value="active">Active</option>
                  <option value="banned">Banned</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-400 font-medium">Loading users...</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Roll No</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Reputation</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredUsers.map((u) => (
                        <tr key={u.email} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
                                {u.imageUrl ? (
                                  <img src={u.imageUrl} className="w-full h-full rounded-full object-cover" alt="" />
                                ) : (
                                  <span className="text-white text-sm font-black">{u.name?.charAt(0)}</span>
                                )}
                              </div>
                              <span className="text-sm font-bold">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">{u.email}</td>
                          <td className="px-6 py-4 text-sm font-medium">{u.rollNo}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-black">{u.reputationScore || 0}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                              u.isBan ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {u.isBan ? 'Banned' : 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleBan(u.email, u.isBan)}
                              className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                                u.isBan
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              {u.isBan ? 'Unban' : 'Ban'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {sortedNotifications.length === 0 ? (
              <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl">
                <p className="text-gray-400 font-medium">No abuse reports</p>
              </div>
            ) : (
              sortedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-black mb-2">{notification.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{notification.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{new Date(notification.createdAt).toLocaleString()}</span>
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-bold uppercase">
                          Abuse Report
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminPage;
