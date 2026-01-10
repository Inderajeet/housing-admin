import {api} from './api';

export const getEnquiries = () =>
  api.get('/enquiries').then(r => r.data);

export const createEnquiry = (data) =>
  api.post('/enquiries', data).then(r => r.data);

export const updateEnquiry = (id, data) =>
  api.put(`/enquiries/${id}`, data).then(r => r.data);
