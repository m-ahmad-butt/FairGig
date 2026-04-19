import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import authService from "../../services/api/authService";
import LocationPickerMap from "../../components/Map/LocationPickerMap";
import { DEFAULT_LAHORE_LOCATION, reverseGeocode } from "../../utils/location";
import {
  CATEGORY_OPTIONS,
  WORKER_ROLE,
  DEFAULT_PLATFORM_CATALOG,
  getCategoryLabel,
  getDefaultPlatform,
  getDefaultTypeValue,
  getPlatformOptions,
  getTypeOptions,
  normalizePlatformCatalog,
} from "../../utils/workerProfileOptions";

function getDashboardPath(role) {
  const normalizedRole = String(role || "").toLowerCase();

  if (normalizedRole === "worker") {
    return "/worker/dashboard";
  }

  if (normalizedRole === "verifier") {
    return "/verifier/dashboard";
  }

  if (normalizedRole === "advocate") {
    return "/advocate/dashboard";
  }

  if (normalizedRole === "admin") {
    return "/admin/dashboard";
  }

  return "/dashboard";
}

function getInitialWorkerCategory(profile) {
  return profile.category || CATEGORY_OPTIONS[0].value;
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [platformCatalog, setPlatformCatalog] = useState(
    DEFAULT_PLATFORM_CATALOG,
  );
  const [formData, setFormData] = useState({
    city: "",
    zone: "",
    latitude: null,
    longitude: null,
    category: CATEGORY_OPTIONS[0].value,
    platform: getDefaultPlatform(CATEGORY_OPTIONS[0].value),
    vehicleType: getDefaultTypeValue("rider"),
    freelancerType: getDefaultTypeValue("freelance"),
  });

  const isWorker = user?.role === WORKER_ROLE;
  const categoryLocked = Boolean(user?.category);
  const selectedCategory = formData.category || CATEGORY_OPTIONS[0].value;

  const platformOptions = useMemo(
    () => getPlatformOptions(selectedCategory, platformCatalog),
    [selectedCategory, platformCatalog],
  );
  const typeOptions = useMemo(
    () => getTypeOptions(selectedCategory),
    [selectedCategory],
  );

  const mapPosition = useMemo(
    () => ({
      lat: formData.latitude ?? DEFAULT_LAHORE_LOCATION.lat,
      lng: formData.longitude ?? DEFAULT_LAHORE_LOCATION.lng,
    }),
    [formData.latitude, formData.longitude],
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
        console.error(
          "Failed to fetch platform options, using fallback:",
          error,
        );
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
      platform: platformOptions[0]?.value || "",
    }));
  }, [formData.platform, isWorker, platformOptions]);

  const loadProfile = async () => {
    try {
      const profile = await authService.getMe();
      const initialCategory = getInitialWorkerCategory(profile);

      setUser(profile);
      setFormData({
        city: profile.city || "",
        zone: profile.zone || "",
        latitude:
          typeof profile.latitude === "number" ? profile.latitude : null,
        longitude:
          typeof profile.longitude === "number" ? profile.longitude : null,
        category: initialCategory,
        platform: profile.platform || getDefaultPlatform(initialCategory),
        vehicleType: profile.vehicleType || getDefaultTypeValue("rider"),
        freelancerType:
          profile.freelancerType || getDefaultTypeValue("freelance"),
      });
    } catch (error) {
      toast.error(`Failed to load profile: ${error.message}`);
      navigate("/login");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported on this device");
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
          longitude: lng,
        }));

        try {
          const geoData = await reverseGeocode(lat, lng);
          setFormData((prev) => ({
            ...prev,
            city: geoData.city || prev.city,
            zone: geoData.zone || prev.zone,
          }));
        } catch (error) {
          toast.error("Unable to resolve city and zone from current location");
        } finally {
          setDetectingLocation(false);
        }
      },
      () => {
        toast.error("Location permission denied");
        setDetectingLocation(false);
      },
    );
  };

  const handleMapPositionChange = async (position) => {
    setFormData((prev) => ({
      ...prev,
      latitude: position.lat,
      longitude: position.lng,
    }));

    try {
      const geoData = await reverseGeocode(position.lat, position.lng);
      setFormData((prev) => ({
        ...prev,
        city: geoData.city || prev.city,
        zone: geoData.zone || prev.zone,
      }));
    } catch (error) {
      toast.error("Unable to resolve city and zone for selected location");
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
      platform: nextPlatformOptions[0]?.value || getDefaultPlatform(category),
      vehicleType: getDefaultTypeValue("rider"),
      freelancerType: getDefaultTypeValue("freelance"),
    }));
  };

  const validateWorkerSelection = () => {
    if (!formData.category) {
      return "Please select worker category";
    }

    if (!formData.platform) {
      return "Please select platform";
    }

    if (formData.category === "rider" && !formData.vehicleType) {
      return "Please select vehicle type";
    }

    if (formData.category === "freelance" && !formData.freelancerType) {
      return "Please select freelancer type";
    }

    return null;
  };

  const submitOnboarding = async () => {
    if (!isWorker) {
      setSaving(true);

      try {
        await authService.updateProfile({
          city: null,
          zone: null,
          latitude: null,
          longitude: null,
          category: null,
          platform: null,
          vehicleType: null,
          freelancerType: null,
        });

        toast.success("Onboarding completed successfully");
        navigate(getDashboardPath(user.role));
      } catch (error) {
        toast.error(error.message);
      } finally {
        setSaving(false);
      }

      return;
    }

    if (!formData.city.trim() || !formData.zone.trim()) {
      toast.error("City and zone are required");
      return;
    }

    if (isWorker) {
      const workerValidationError = validateWorkerSelection();
      if (workerValidationError) {
        toast.error(workerValidationError);
        return;
      }
    }

    const payload = {
      city: formData.city.trim(),
      zone: formData.zone.trim(),
    };

    if (
      typeof formData.latitude === "number" &&
      typeof formData.longitude === "number"
    ) {
      payload.latitude = formData.latitude;
      payload.longitude = formData.longitude;
    }

    if (isWorker) {
      if (!categoryLocked) {
        payload.category = formData.category;
      }

      payload.platform = formData.platform;

      if (formData.category === "rider") {
        payload.vehicleType = formData.vehicleType;
      }

      if (formData.category === "freelance") {
        payload.freelancerType = formData.freelancerType;
      }
    }

    setSaving(true);

    try {
      await authService.updateProfile(payload);
      toast.success("Onboarding completed successfully");
      navigate(getDashboardPath(user.role));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading onboarding...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow border border-gray-100 p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Complete your profile
            </h1>
            <p className="text-gray-600 mt-1">
              {isWorker
                ? "Set your location and worker details to continue."
                : "No additional profile fields are required for your role."}
            </p>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div
              className={`h-2 flex-1 rounded-full ${step >= 1 ? "bg-black" : "bg-gray-200"}`}
            />
            <div
              className={`h-2 flex-1 rounded-full ${step >= 2 ? "bg-black" : "bg-gray-200"}`}
            />
          </div>

          {step === 1 && (
            <div className="space-y-6">
              {!isWorker ? (
                <>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Role setup
                    </h2>
                    <p className="text-sm text-gray-600">
                      Location and platform are not required for verifier and
                      advocate accounts.
                    </p>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                    We will keep location, category, platform, and worker-type
                    fields as null for your role.
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={submitOnboarding}
                      disabled={saving}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Continue"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Location
                    </h2>
                    <p className="text-sm text-gray-600">
                      Default map center is Pakistan, Lahore.
                    </p>
                  </div>

                  <div className="h-72 rounded-lg overflow-hidden border border-gray-200">
                    <LocationPickerMap
                      position={mapPosition}
                      onPositionChange={handleMapPositionChange}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={detectingLocation}
                    className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-60"
                  >
                    {detectingLocation
                      ? "Detecting location..."
                      : "Use Current Location"}
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        className="block text-sm font-medium text-gray-700 mb-1"
                        htmlFor="city"
                      >
                        City
                      </label>
                      <input
                        id="city"
                        name="city"
                        type="text"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="Lahore"
                      />
                    </div>

                    <div>
                      <label
                        className="block text-sm font-medium text-gray-700 mb-1"
                        htmlFor="zone"
                      >
                        Zone / Area
                      </label>
                      <input
                        id="zone"
                        name="zone"
                        type="text"
                        value={formData.zone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="Gulberg"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!formData.city.trim() || !formData.zone.trim()) {
                          toast.error("City and zone are required");
                          return;
                        }
                        setStep(2);
                      }}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800"
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 2 && isWorker && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Worker details
                </h2>
                <p className="text-sm text-gray-600">
                  Category cannot be changed after it is set.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
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
                        onClick={() =>
                          handleCategoryChange(categoryOption.value)
                        }
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          formData.category === categoryOption.value
                            ? "border-black bg-black text-white"
                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {categoryOption.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="platform"
                >
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
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="workerType"
                >
                  {formData.category === "rider"
                    ? "Vehicle Type"
                    : "Freelancer Type"}
                </label>

                {formData.category === "rider" ? (
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

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={submitOnboarding}
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Finish"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
