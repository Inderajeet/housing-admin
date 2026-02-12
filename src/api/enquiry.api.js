// api/enquiry.api.js
import { api } from './api';

export const getEnquiries = async (type = null, enquiryType = null) => {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (enquiryType) params.append('enquiryType', enquiryType);
  
  const queryString = params.toString();
  const response = await api.get(`/enquiries${queryString ? `?${queryString}` : ''}`);
  return response.data; // Make sure we return response.data
};

export const createEnquiry = (data) => api.post('/enquiries', data);

export const updateEnquiry = (enquiryId, data) => api.put(`/enquiries/${enquiryId}`, data);

export const getBuyerJourney = (propertyId, buyerId) => api.get(`/enquiries/journey/${propertyId}/${buyerId}`);

export const getPropertyBuyerEnquiries = (propertyId) => api.get(`/enquiries/property/${propertyId}/buyers`);

export const getSellerEnquiries = (sellerId) => api.get(`/enquiries/seller/${sellerId}`);