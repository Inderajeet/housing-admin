import {api} from './api';

export const getEnquiries = async (type = null) => {
  const url = type ? `/enquiries?type=${type}` : '/enquiries';
  const response = await api.get(url);
  return response.data;
};

export const createEnquiry = (data) =>
  api.post('/enquiries', data).then(r => r.data);

export const updateEnquiry = (id, data) =>
  api.put(`/enquiries/${id}`, data).then(r => r.data);
