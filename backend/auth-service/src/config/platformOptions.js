const PLATFORM_OPTIONS = {
  rider: [
    { value: 'careem', label: 'Careem' },
    { value: 'uber', label: 'Uber' },
    { value: 'indrive', label: 'InDrive' },
    { value: 'bykea', label: 'Bykea' },
    { value: 'jeeny', label: 'Jeeny' },
    { value: 'yango', label: 'Yango' },
    { value: 'swvl', label: 'Swvl' },
    { value: 'airlift', label: 'Airlift' },
    { value: 'iride', label: 'iRide' }
  ],
  freelance: [
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
  ]
};

const RIDER_PLATFORMS = PLATFORM_OPTIONS.rider.map((platform) => platform.value);
const FREELANCER_PLATFORMS = PLATFORM_OPTIONS.freelance.map((platform) => platform.value);
const ALL_WORKER_PLATFORMS = [...RIDER_PLATFORMS, ...FREELANCER_PLATFORMS];

function isWorkerCategory(category) {
  return category === 'rider' || category === 'freelance';
}

module.exports = {
  PLATFORM_OPTIONS,
  RIDER_PLATFORMS,
  FREELANCER_PLATFORMS,
  ALL_WORKER_PLATFORMS,
  isWorkerCategory
};
