import { api } from './api';

// Get all bookings with optional filters
export const getBookings = async (type = null, status = null) => {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (status) params.append('status', status);
  
  const queryString = params.toString();
  const response = await api.get(`/bookings${queryString ? `?${queryString}` : ''}`);
  return response.data;
};

// Get booking by ID
export const getBookingById = (bookingId) => api.get(`/bookings/${bookingId}`);

// Create new booking
export const createBooking = (data) => api.post('/bookings', data);

// Update booking
export const updateBooking = (bookingId, data) => api.put(`/bookings/${bookingId}`, data);

// Delete booking
export const deleteBooking = (bookingId) => api.delete(`/bookings/${bookingId}`);

// Get booking stages
export const getBookingStages = (transactionType) => 
  api.get(`/bookings/stages/${transactionType}`);

// Get buyer details
export const getBuyerDetails = (buyerId) => api.get(`/buyers/${buyerId}`);

// Get property details by type
export const getPropertyDetails = (propertyId, unitType, unitId) => {
  let endpoint = '';
  if (unitType === 'rent') {
    endpoint = `/rent/${propertyId}`;
  } else if (unitType === 'sale') {
    endpoint = `/sale/${propertyId}`;
  } else if (unitType === 'plot' && unitId) {
    endpoint = `/plots/unit/${unitId}`;
  }
  return api.get(endpoint);
};

// Get all buyers (for dropdown)
export const getBuyers = async (search = '') => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  const response = await api.get(`/buyers${params.toString() ? `?${params}` : ''}`);
  return response.data;
};

// Create new buyer
export const createBuyer = (data) => api.post('/buyers', data);