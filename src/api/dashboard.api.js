import { api } from './api';
 
/**
 * Fetches all aggregate stats for the admin dashboard.
 * GET /api/admin/dashboard/stats
 */
export const getDashboardStats = async () => {
  const { data } = await api.get('/dashboard/stats');
  return data;
};
 
/**
 * Fetches the 5 most recent enquiries with property & contact info.
 * GET /api/admin/dashboard/recent-enquiries
 */
export const getRecentEnquiries = async () => {
  const { data } = await api.get('/dashboard/recent-enquiries');
  return data;
};
 
/**
 * Fetches rent property breakdown by rent_status.
 * GET /api/admin/dashboard/rent-status
 */
export const getRentStatusBreakdown = async () => {
  const { data } = await api.get('/dashboard/rent-status');
  return data;
};
 
/**
 * Fetches sale property breakdown by sale_status.
 * GET /api/admin/dashboard/sale-status
 */
export const getSaleStatusBreakdown = async () => {
  const { data } = await api.get('/dashboard/sale-status');
  return data;
};
