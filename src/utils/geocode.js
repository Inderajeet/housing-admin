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
 * Reverse geocode with address components.
 * Returns { address, district, taluk, village } or null on failure.
 * district → administrative_area_level_3 (district in TN)
 * taluk    → administrative_area_level_4 (taluk/block)
 * village  → administrative_area_level_5 or locality or sublocality_level_1
 */
export const reverseGeocodeDetailed = async (lat, lng) => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === 'OK' && data.results.length > 0) {
    const result = data.results[0];
    const address = result.formatted_address;

    const getComp = (...types) => {
      for (const type of types) {
        const comp = result.address_components.find(c => c.types.includes(type));
        if (comp) return comp.long_name;
      }
      return null;
    };

    return {
      address,
      district: getComp('administrative_area_level_3'),
      taluk: getComp('administrative_area_level_4'),
      village: getComp('administrative_area_level_5', 'locality', 'sublocality_level_1'),
      // keep subdistrict for backward compat
      subdistrict: getComp('administrative_area_level_4') || getComp('administrative_area_level_5'),
    };
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
