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
    LIST:           '/sale',
    CREATE:         '/sale',
    UPDATE:         (id) => `/sale/${id}`,
    DELETE:         (id) => `/sale/${id}`,
    DRAWING_IMAGE:  (id) => `/sale/${id}/drawing-image`,
  },

  // LOCATIONS (read - used by LocationSelector)
  DISTRICTS: '/locations/districts',
  TALUKS: (districtId) => `/locations/taluks/${districtId}`,
  VILLAGES: (talukId) => `/locations/villages/${talukId}`,

  // LOCATION ADMIN (CRUD + bulk upload + bulk coords)
  LOCATION_ADMIN: {
    DISTRICTS: {
      LIST:         '/locations/districts',
      UPLOAD:       '/locations/districts/upload',
      UPDATE:       (id) => `/locations/districts/${id}`,
      BULK_COORDS:  '/locations/districts/bulk-coords',
    },
    TALUKS: {
      LIST:         (districtId) => `/locations/taluks/${districtId}`,
      UPLOAD:       '/locations/taluks/upload',
      UPDATE:       (id) => `/locations/taluks/${id}`,
      BULK_COORDS:  '/locations/taluks/bulk-coords',
    },
    VILLAGES: {
      LIST:         (talukId) => `/locations/villages/${talukId}`,
      UPLOAD:       '/locations/villages/upload',
      UPDATE:       (id) => `/locations/villages/${id}`,
      BULK_COORDS:  '/locations/villages/bulk-coords',
    },
  },

  // SELLERS
  SELLERS: '/sellers',
};
