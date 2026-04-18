export const WORKER_ROLE = 'worker';

export const CATEGORY_OPTIONS = [
  { value: 'rider', label: 'Rider' },
  { value: 'freelance', label: 'Freelancer' }
];

export const RIDER_PLATFORM_OPTIONS = [
  { value: 'careem', label: 'Careem' },
  { value: 'uber', label: 'Uber' },
  { value: 'indrive', label: 'InDrive' },
  { value: 'bykea', label: 'Bykea' },
  { value: 'jeeny', label: 'Jeeny' },
  { value: 'yango', label: 'Yango' },
  { value: 'swvl', label: 'Swvl' },
  { value: 'airlift', label: 'Airlift' },
  { value: 'iride', label: 'iRide' }
];

export const FREELANCER_PLATFORM_OPTIONS = [
  { value: 'upwork', label: 'Upwork' },
  { value: 'fiverr', label: 'Fiverr' },
  { value: 'freelancer_com', label: 'Freelancer.com' },
  { value: 'people_per_hour', label: 'PeoplePerHour' },
  { value: 'guru', label: 'Guru' },
  { value: 'truelancer', label: 'Truelancer' },
  { value: 'workana', label: 'Workana' },
  { value: 'hubstaff_talent', label: 'Hubstaff Talent' },
  { value: 'contra', label: 'Contra' },
  { value: 'toptal', label: 'Toptal' }
];

export const DEFAULT_PLATFORM_CATALOG = {
  rider: RIDER_PLATFORM_OPTIONS,
  freelance: FREELANCER_PLATFORM_OPTIONS
};

function isOption(option) {
  return Boolean(option && typeof option.value === 'string' && typeof option.label === 'string');
}

function isCategoryOptionList(options) {
  return Array.isArray(options) && options.length > 0 && options.every(isOption);
}

export function normalizePlatformCatalog(payload) {
  const fallback = DEFAULT_PLATFORM_CATALOG;

  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  if (isCategoryOptionList(payload?.platforms?.rider) && isCategoryOptionList(payload?.platforms?.freelance)) {
    return {
      rider: payload.platforms.rider,
      freelance: payload.platforms.freelance
    };
  }

  if (isCategoryOptionList(payload.platforms) && (payload.category === 'rider' || payload.category === 'freelance')) {
    return {
      ...fallback,
      [payload.category]: payload.platforms
    };
  }

  return fallback;
}

export const RIDER_TYPE_OPTIONS = [
  { value: 'bike', label: 'Bike' },
  { value: 'car', label: 'Car' },
  { value: 'rickshaw', label: 'Rickshaw' }
];

export const FREELANCER_TYPE_OPTIONS = [
  { value: 'ui_ux', label: 'UI/UX' },
  { value: 'web_development', label: 'Web Development' },
  { value: 'graphic_design', label: 'Graphic Design' },
  { value: 'content_writing', label: 'Content Writing' },
  { value: 'digital_marketing', label: 'Digital Marketing' }
];

export function getPlatformOptions(category, platformCatalog = DEFAULT_PLATFORM_CATALOG) {
  if (category === 'freelance') {
    return platformCatalog.freelance || FREELANCER_PLATFORM_OPTIONS;
  }

  return platformCatalog.rider || RIDER_PLATFORM_OPTIONS;
}

export function getTypeOptions(category) {
  if (category === 'freelance') {
    return FREELANCER_TYPE_OPTIONS;
  }

  return RIDER_TYPE_OPTIONS;
}

export function getDefaultPlatform(category, platformCatalog = DEFAULT_PLATFORM_CATALOG) {
  return getPlatformOptions(category, platformCatalog)[0]?.value || '';
}

export function getDefaultTypeValue(category) {
  return getTypeOptions(category)[0].value;
}

export function getCategoryLabel(category) {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label || 'Not set';
}

export function getPlatformLabel(category, platform, platformCatalog = DEFAULT_PLATFORM_CATALOG) {
  if (!platform) {
    return 'Not set';
  }

  return getPlatformOptions(category, platformCatalog).find((option) => option.value === platform)?.label || platform;
}

export function getTypeLabel(category, value) {
  if (!value) {
    return 'Not set';
  }

  return getTypeOptions(category).find((option) => option.value === value)?.label || value;
}

export function isWorkerProfileComplete(user) {
  if (!user || user.role !== WORKER_ROLE) {
    return true;
  }

  if (!user.category || !user.platform) {
    return false;
  }

  if (user.category === 'rider') {
    return Boolean(user.vehicleType);
  }

  if (user.category === 'freelance') {
    return Boolean(user.freelancerType);
  }

  return false;
}
