import { api } from './api';

export const getFlatProperties = async () => {
  const { data } = await api.get('/flat-projects');
  return data;
};

export const openFlatProject = async (propertyId) => {
  const { data } = await api.post(`/flat-units/open/${propertyId}`);
  return data;
};

export const getFlatLayout = (propertyId) =>
  api.get(`/flat-units/${propertyId}`);

export const saveFlatLayout = async (propertyId, elements) => {
  const { data } = await api.post(`/flat-units/${propertyId}`, { elements });
  return data;
};