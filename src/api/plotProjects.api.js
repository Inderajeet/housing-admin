import {api} from './api';

export const getPlotProjects = async () => {
  const { data } = await api.get('/plot-projects');
  return data;
};

export const createPlotProject = async (payload) => {
  const { data } = await api.post('/plot-projects', payload);
  return data;
};

export const updatePlotProject = async (id, payload) => {
  const { data } = await api.put(`/plot-projects/${id}`, payload);
  return data;
};

export const getPlotUnits = async (id) => {
  const { data } = await api.get(`/plot-projects/${id}/units`);
  return data;
};

export const getPlotLayout = (projectId) =>
  api.get(`/plot-units/${projectId}/layout`);

export const savePlotLayout = (projectId, elements) =>
  api.post(`/plot-units/${projectId}/layout`, { elements });
