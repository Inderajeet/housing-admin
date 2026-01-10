import {api} from './api';

export const getBuyers = async () => {
  const res = await api.get('/buyers');
  return res.data;
};

export const createBuyer = async (data) => {
  const res = await api.post('/buyers', data);
  return res.data;
};

export const updateBuyer = async (id, data) => {
  const res = await api.put(`/buyers/${id}`, data);
  return res.data;
};

export const getBuyerEnquiries = async (id) => {
  const res = await api.get(`/buyers/${id}/enquiries`);
  return res.data;
};
