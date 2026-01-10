import { api } from './api';
import { ENDPOINTS } from './endpoints';

/**
 * Get all sale properties
 * (JOIN: properties + sale_properties)
 */
export const getSaleProperties = async () => {
  const { data } = await api.get(ENDPOINTS.SALE.LIST);
  return data;
};

/**
 * Create sale property
 * (TRANSACTION BACKEND)
 */
export const createSaleProperty = async (payload) => {
  const { data } = await api.post(
    ENDPOINTS.SALE.CREATE,
    payload
  );
  return data;
};

/**
 * Update sale property
 */
export const updateSaleProperty = async (propertyId, payload) => {
  const { data } = await api.put(
    ENDPOINTS.SALE.UPDATE(propertyId),
    payload
  );
  return data;
};

/**
 * Delete sale property
 */
export const deleteSaleProperty = async (propertyId) => {
  return api.delete(
    ENDPOINTS.SALE.DELETE(propertyId)
  );
};
