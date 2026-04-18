export const DEFAULT_LAHORE_LOCATION = {
  lat: 31.5204,
  lng: 74.3587
};

function parseGoogleResult(result) {
  const components = result?.address_components || [];

  const findComponent = (allowedTypes) => {
    const matchedComponent = components.find((component) =>
      component.types?.some((type) => allowedTypes.includes(type))
    );

    return matchedComponent?.long_name || '';
  };

  return {
    city:
      findComponent(['locality']) ||
      findComponent(['administrative_area_level_2']) ||
      findComponent(['administrative_area_level_1']) ||
      '',
    zone:
      findComponent(['sublocality_level_1']) ||
      findComponent(['sublocality']) ||
      findComponent(['neighborhood']) ||
      findComponent(['administrative_area_level_3']) ||
      ''
  };
}

function parseNominatimResult(result) {
  const address = result?.address || {};

  return {
    city: address.city || address.town || address.village || address.state || '',
    zone:
      address.suburb ||
      address.city_district ||
      address.neighbourhood ||
      address.county ||
      address.state_district ||
      ''
  };
}

async function reverseGeocodeWithGoogle(lat, lng, apiUrl) {
  const query = new URLSearchParams({
    latlng: `${lat},${lng}`,
    language: 'en'
  });

  const response = await fetch(`${apiUrl}?${query.toString()}`);
  if (!response.ok) {
    throw new Error('Google reverse geocoding failed');
  }

  const result = await response.json();
  const firstResult = result?.results?.[0];

  if (result?.status !== 'OK' || !firstResult) {
    throw new Error('No reverse geocoding result found');
  }

  return parseGoogleResult(firstResult);
}

async function reverseGeocodeWithNominatim(lat, lng) {
  const query = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json'
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query.toString()}`);
  if (!response.ok) {
    throw new Error('Nominatim reverse geocoding failed');
  }

  const result = await response.json();
  return parseNominatimResult(result);
}

export async function reverseGeocode(lat, lng) {
  const apiUrl = import.meta.env.VITE_GEOCODING_API_URL || 'https://maps.googleapis.com/maps/api/geocode/json';

  try {
    return await reverseGeocodeWithGoogle(lat, lng, apiUrl);
  } catch {
    return reverseGeocodeWithNominatim(lat, lng);
  }
}
