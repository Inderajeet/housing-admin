import { api } from './api';
import { ENDPOINTS } from './endpoints';

/**
 * Get all rent properties (JOIN of properties + rent_properties)
 */
export const getRentProperties = async () => {
  const { data } = await api.get(ENDPOINTS.RENT.LIST);
  return data;
};

/**
 * Create rent property (TRANSACTION BACKEND)
 */
export const createRentProperty = async (payload) => {
  const { data } = await api.post(ENDPOINTS.RENT.CREATE, payload);
  return data;
};

/**
 * Update rent property
 */
export const updateRentProperty = async (propertyId, payload) => {
  const { data } = await api.put(
    ENDPOINTS.RENT.UPDATE(propertyId),
    payload
  );
  return data;
};

/**
 * Delete rent property
 */
export const deleteRentProperty = async (propertyId) => {
  return api.delete(ENDPOINTS.RENT.DELETE(propertyId));
};
