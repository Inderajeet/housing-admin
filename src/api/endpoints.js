export const ENDPOINTS = {
  // RENT
  RENT: {
    LIST: '/rent',
    CREATE: '/rent',
    UPDATE: (id) => `/rent/${id}`,
    DELETE: (id) => `/rent/${id}`,
  },

  // SALE
  SALE: {
    LIST: '/sale',
    CREATE: '/sale',
    UPDATE: (id) => `/sale/${id}`,
    DELETE: (id) => `/sale/${id}`,
  },

  // LOCATIONS
  DISTRICTS: '/locations/districts',
  TALUKS: (districtId) => `/locations/taluks/${districtId}`,
  VILLAGES: (talukId) => `/locations/villages/${talukId}`,

  // SELLERS
  SELLERS: '/sellers',
};
