import { api } from './api';

export const getSellerDropdown = async (search = '') => {
  const { data } = await api.get(`/sellers/dropdown`, {
    params: { search }
  });
  return data;
};

export const getSellers = async (type) => {  
  const response = await api.get(`/sellers`, { params: { type } });
  return response.data;
};

export const createSeller = async (payload) => {
  const { data } = await api.post('/sellers', payload);
  return data;
};

export const updateSeller = async (id, payload) => {
  const { data } = await api.put(`/sellers/${id}`, payload);
  return data;
};

export const getSellerProperties = async (id) => {
  const response = await api.get(`/sellers/${id}/properties`);
  return response.data;
};