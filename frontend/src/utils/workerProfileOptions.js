export const WORKER_ROLE = 'worker';

export const CATEGORY_OPTIONS = [
  { value: 'rider', label: 'Rider' },
  { value: 'freelance', label: 'Freelancer' }
];

export const RIDER_PLATFORM_OPTIONS = [
  { value: 'uber', label: 'Uber' },
  { value: 'careem', label: 'Careem' }
];

export const FREELANCER_PLATFORM_OPTIONS = [
  { value: 'fiverr', label: 'Fiverr' },
  { value: 'upwork', label: 'Upwork' }
];

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

export function getPlatformOptions(category) {
  if (category === 'freelance') {
    return FREELANCER_PLATFORM_OPTIONS;
  }

  return RIDER_PLATFORM_OPTIONS;
}

export function getTypeOptions(category) {
  if (category === 'freelance') {
    return FREELANCER_TYPE_OPTIONS;
  }

  return RIDER_TYPE_OPTIONS;
}

export function getDefaultPlatform(category) {
  return getPlatformOptions(category)[0].value;
}

export function getDefaultTypeValue(category) {
  return getTypeOptions(category)[0].value;
}

export function getCategoryLabel(category) {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label || 'Not set';
}

export function getPlatformLabel(category, platform) {
  if (!platform) {
    return 'Not set';
  }

  return getPlatformOptions(category).find((option) => option.value === platform)?.label || platform;
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
