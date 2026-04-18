import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../../services/api/authService';
import Navbar from '../../components/Navigation/Navbar';
import LocationPickerMap from '../../components/Map/LocationPickerMap';
import { DEFAULT_LAHORE_LOCATION, reverseGeocode } from '../../utils/location';
import {
  CATEGORY_OPTIONS,
  WORKER_ROLE,
  DEFAULT_PLATFORM_CATALOG,
  getCategoryLabel,
  getDefaultPlatform,
  getDefaultTypeValue,
  getPlatformLabel,
  getPlatformOptions,
  getTypeLabel,
  getTypeOptions,
  normalizePlatformCatalog
} from '../../utils/workerProfileOptions';

function formatDate(dateString) {
  if (!dateString) {
    return 'N/A';
  }

  return new Date(dateString).toLocaleDateString();
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [platformCatalog, setPlatformCatalog] = useState(DEFAULT_PLATFORM_CATALOG);

  const [formData, setFormData] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    city: '',
    zone: '',
    latitude: null,
    longitude: null,
    category: CATEGORY_OPTIONS[0].value,
    platform: getDefaultPlatform(CATEGORY_OPTIONS[0].value),
    vehicleType: getDefaultTypeValue('rider'),
    freelancerType: getDefaultTypeValue('freelance')
  });

  const isWorker = user?.role === WORKER_ROLE;
  const categoryLocked = Boolean(user?.category);
  const selectedCategory = formData.category || CATEGORY_OPTIONS[0].value;

  const platformOptions = useMemo(
    () => getPlatformOptions(selectedCategory, platformCatalog),
    [selectedCategory, platformCatalog]
  );
  const typeOptions = useMemo(() => getTypeOptions(selectedCategory), [selectedCategory]);

  const mapPosition = useMemo(
    () => ({
      lat: formData.latitude ?? DEFAULT_LAHORE_LOCATION.lat,
      lng: formData.longitude ?? DEFAULT_LAHORE_LOCATION.lng
    }),
    [formData.latitude, formData.longitude]
  );

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPlatformCatalog() {
      try {
        const response = await authService.getPlatforms();

        if (!isMounted) {
          return;
        }

        setPlatformCatalog(normalizePlatformCatalog(response));
      } catch (error) {
        console.error('Failed to fetch platform options, using fallback:', error);
      }
    }

    loadPlatformCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isWorker) {
      return;
    }

    if (platformOptions.some((option) => option.value === formData.platform)) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      platform: platformOptions[0]?.value || ''
    }));
  }, [formData.platform, isWorker, platformOptions]);

  const loadProfile = async () => {
    try {
      const profile = await authService.getMe();
      const initialCategory = profile.category || CATEGORY_OPTIONS[0].value;

      setUser(profile);
      setFormData({
        name: profile.name || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        city: profile.city || '',
        zone: profile.zone || '',
        latitude: typeof profile.latitude === 'number' ? profile.latitude : null,
        longitude: typeof profile.longitude === 'number' ? profile.longitude : null,
        category: initialCategory,
        platform: profile.platform || getDefaultPlatform(initialCategory, platformCatalog),
        vehicleType: profile.vehicleType || getDefaultTypeValue('rider'),
        freelancerType: profile.freelancerType || getDefaultTypeValue('freelance')
      });
    } catch (error) {
      toast.error(`Failed to load profile: ${error.message}`);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoryChange = (category) => {
    if (categoryLocked) {
      return;
    }

    const nextPlatformOptions = getPlatformOptions(category, platformCatalog);

    setFormData((prev) => ({
      ...prev,
      category,
      platform: nextPlatformOptions[0]?.value || getDefaultPlatform(category, platformCatalog),
      vehicleType: getDefaultTypeValue('rider'),
      freelancerType: getDefaultTypeValue('freelance')
    }));
  };

  const handleMapPositionChange = async (position) => {
    setFormData((prev) => ({
      ...prev,
      latitude: position.lat,
      longitude: position.lng
    }));

    try {
      const geoData = await reverseGeocode(position.lat, position.lng);
      setFormData((prev) => ({
        ...prev,
        city: geoData.city || prev.city,
        zone: geoData.zone || prev.zone
      }));
    } catch (error) {
      toast.error('Unable to resolve city and zone for selected location');
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this device');
      return;
    }

    setDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setFormData((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));

        try {
          const geoData = await reverseGeocode(lat, lng);
          setFormData((prev) => ({
            ...prev,
            city: geoData.city || prev.city,
            zone: geoData.zone || prev.zone
          }));
        } catch (error) {
          toast.error('Unable to resolve city and zone from current location');
        } finally {
          setDetectingLocation(false);
        }
      },
      () => {
        toast.error('Location permission denied');
        setDetectingLocation(false);
      }
    );
  };

  const resetEditState = () => {
    if (!user) {
      return;
    }

    const initialCategory = user.category || CATEGORY_OPTIONS[0].value;

    setFormData({
      name: user.name || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      city: user.city || '',
      zone: user.zone || '',
      latitude: typeof user.latitude === 'number' ? user.latitude : null,
      longitude: typeof user.longitude === 'number' ? user.longitude : null,
      category: initialCategory,
      platform: user.platform || getDefaultPlatform(initialCategory, platformCatalog),
      vehicleType: user.vehicleType || getDefaultTypeValue('rider'),
      freelancerType: user.freelancerType || getDefaultTypeValue('freelance')
    });
  };

  const validateWorkerSelection = () => {
    if (!formData.category) {
      return 'Please select worker category';
    }

    if (!formData.platform) {
      return 'Please select platform';
    }

    if (formData.category === 'rider' && !formData.vehicleType) {
      return 'Please select vehicle type';
    }

    if (formData.category === 'freelance' && !formData.freelancerType) {
      return 'Please select freelancer type';
    }

    return null;
  };

  const handleUpdateProfile = async (event) => {
    event.preventDefault();

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (isWorker) {
      const workerValidationError = validateWorkerSelection();
      if (workerValidationError) {
        toast.error(workerValidationError);
        return;
      }

      if (!formData.city.trim() || !formData.zone.trim()) {
        toast.error('City and zone are required for workers');
        return;
      }
    }

    const updateData = {
      name: formData.name.trim()
    };

    if (formData.newPassword) {
      updateData.currentPassword = formData.currentPassword;
      updateData.newPassword = formData.newPassword;
    }

    if (isWorker) {
      updateData.city = formData.city.trim();
      updateData.zone = formData.zone.trim();

      if (typeof formData.latitude === 'number' && typeof formData.longitude === 'number') {
        updateData.latitude = formData.latitude;
        updateData.longitude = formData.longitude;
      }

      if (!categoryLocked) {
        updateData.category = formData.category;
      }

      updateData.platform = formData.platform;

      if (formData.category === 'rider') {
        updateData.vehicleType = formData.vehicleType;
      }

      if (formData.category === 'freelance') {
        updateData.freelancerType = formData.freelancerType;
      }
    }

    setUpdating(true);

    try {
      await authService.updateProfile(updateData);
      toast.success('Profile updated successfully');
      setEditing(false);
      await loadProfile();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">User Profile</h2>
              <div className="flex items-center space-x-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    user?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {user?.status}
                </span>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {!editing ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                    <p className="text-lg text-gray-900">{user?.name}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Email Address</label>
                    <p className="text-lg text-gray-900">{user?.email}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
                    <p className="text-lg text-gray-900 capitalize">{user?.role}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Email Verified</label>
                    <p className="text-lg text-gray-900">{user?.emailVerified ? 'Yes' : 'No'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Account Status</label>
                    <p className="text-lg text-gray-900 capitalize">{user?.status}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Member Since</label>
                    <p className="text-lg text-gray-900">{formatDate(user?.createdAt)}</p>
                  </div>
                </div>

                {isWorker && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">City</label>
                      <p className="text-lg text-gray-900">{user?.city || 'Not set'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Zone</label>
                      <p className="text-lg text-gray-900">{user?.zone || 'Not set'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Category</label>
                      <p className="text-lg text-gray-900">{getCategoryLabel(user?.category)}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Platform</label>
                      <p className="text-lg text-gray-900">{getPlatformLabel(user?.category, user?.platform, platformCatalog)}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        {user?.category === 'rider' ? 'Vehicle Type' : 'Freelancer Type'}
                      </label>
                      <p className="text-lg text-gray-900">
                        {user?.category === 'rider'
                          ? getTypeLabel('rider', user?.vehicleType)
                          : getTypeLabel('freelance', user?.freelancerType)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">User ID</h4>
                  <p className="text-xs text-gray-700 font-mono break-all">{user?.id}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
                  />
                </div>

                {isWorker && (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Worker Profile</h3>

                    <div className="h-72 rounded-lg overflow-hidden border border-gray-200">
                      <LocationPickerMap position={mapPosition} onPositionChange={handleMapPositionChange} />
                    </div>

                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={detectingLocation}
                      className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-60"
                    >
                      {detectingLocation ? 'Detecting location...' : 'Use Current Location'}
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="city">
                          City
                        </label>
                        <input
                          id="city"
                          name="city"
                          type="text"
                          value={formData.city}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="zone">
                          Zone / Area
                        </label>
                        <input
                          id="zone"
                          name="zone"
                          type="text"
                          value={formData.zone}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      {categoryLocked ? (
                        <div className="px-3 py-2 rounded-md border border-gray-200 bg-gray-50 text-gray-700">
                          {getCategoryLabel(formData.category)}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {CATEGORY_OPTIONS.map((categoryOption) => (
                            <button
                              key={categoryOption.value}
                              type="button"
                              onClick={() => handleCategoryChange(categoryOption.value)}
                              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                formData.category === categoryOption.value
                                  ? 'border-black bg-black text-white'
                                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              {categoryOption.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="platform">
                        Platform
                      </label>
                      <select
                        id="platform"
                        name="platform"
                        value={formData.platform}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black bg-white"
                      >
                        {platformOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="workerType">
                        {formData.category === 'rider' ? 'Vehicle Type' : 'Freelancer Type'}
                      </label>

                      {formData.category === 'rider' ? (
                        <select
                          id="workerType"
                          name="vehicleType"
                          value={formData.vehicleType}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black bg-white"
                        >
                          {typeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          id="workerType"
                          name="freelancerType"
                          value={formData.freelancerType}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black bg-white"
                        >
                          {typeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password (Optional)</h3>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                        Current Password
                      </label>
                      <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
                      />
                    </div>

                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                        New Password
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
                      />
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={updating}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-50"
                  >
                    {updating ? 'Updating...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      resetEditState();
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
