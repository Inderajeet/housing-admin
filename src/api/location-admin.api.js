import { api } from './api';
import { ENDPOINTS } from './endpoints';

const EP = ENDPOINTS.LOCATION_ADMIN;

// ── Districts ────────────────────────────────────────────────────────────────

export const getAllDistricts = async () => {
  const res = await api.get(EP.DISTRICTS.LIST);
  return res.data;
};

export const updateDistrict = async (id, data) => {
  const res = await api.put(EP.DISTRICTS.UPDATE(id), data);
  return res.data;
};

/**
 * Bulk update coordinates for multiple districts in one request.
 * @param {Array<{ district_id: number, latitude: string, longitude: string }>} items
 */
export const bulkUpdateDistrictCoords = async (items) => {
  const res = await api.put(EP.DISTRICTS.BULK_COORDS, items);
  return res.data;
};

/**
 * Upload an Excel file (.xlsx / .xls) for districts.
 * Expected columns: district_name, district_code
 */
export const uploadDistricts = async (file) => {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.post(EP.DISTRICTS.UPLOAD, fd);
  return res.data;
};

// ── Taluks ───────────────────────────────────────────────────────────────────

export const getTaluksByDistrict = async (districtId) => {
  if (!districtId) return [];
  const res = await api.get(EP.TALUKS.LIST(districtId));
  return res.data;
};

export const updateTaluk = async (id, data) => {
  const res = await api.put(EP.TALUKS.UPDATE(id), data);
  return res.data;
};

/**
 * Bulk update coordinates for multiple taluks in one request.
 * @param {Array<{ taluk_id: number, latitude: string, longitude: string }>} items
 */
export const bulkUpdateTalukCoords = async (items) => {
  const res = await api.put(EP.TALUKS.BULK_COORDS, items);
  return res.data;
};

/**
 * Upload an Excel file for taluks.
 * Expected columns: taluk_name, district_name
 * Backend resolves district_name → district_id automatically.
 */
export const uploadTaluks = async (file) => {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.post(EP.TALUKS.UPLOAD, fd);
  return res.data;
};

// ── Villages ─────────────────────────────────────────────────────────────────

export const getVillagesByTaluk = async (talukId) => {
  if (!talukId) return [];
  const res = await api.get(EP.VILLAGES.LIST(talukId));
  return res.data;
};

export const updateVillage = async (id, data) => {
  const res = await api.put(EP.VILLAGES.UPDATE(id), data);
  return res.data;
};

/**
 * Bulk update coordinates for multiple villages in one request.
 * @param {Array<{ village_id: number, latitude: string, longitude: string }>} items
 */
export const bulkUpdateVillageCoords = async (items) => {
  const res = await api.put(EP.VILLAGES.BULK_COORDS, items);
  return res.data;
};

/**
 * Upload an Excel file for villages.
 * Expected columns: village_name, taluk_name
 * Backend resolves taluk_name → taluk_id automatically.
 */
export const uploadVillages = async (file) => {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.post(EP.VILLAGES.UPLOAD, fd);
  return res.data;
};
