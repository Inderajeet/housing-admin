const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API;

/**
 * Reverse geocode: lat + lng → formatted address string.
 * Returns null on failure.
 */
export const reverseGeocode = async (lat, lng) => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === 'OK' && data.results.length > 0) {
    return data.results[0].formatted_address;
  }
  return null;
};

/**
 * Forward geocode: address string → { lat, lng }.
 * Returns null on failure.
 */
export const forwardGeocode = async (address) => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === 'OK' && data.results.length > 0) {
    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  }
  return null;
};
