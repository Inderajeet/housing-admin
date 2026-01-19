import {api} from './api';

export const getPlotProperties = async () => {
  const { data } = await api.get('/plot-properties');
  return data;
};

export const openPlotProject = async (propertyId) => {
  const { data } = await api.get(`/plot-units/${propertyId}`);
  return data;
};


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
  const { data } = await api.get(`/plot-units/${id}/units`);
  return data;
};

export const getPlotLayout = (projectId) =>
  api.get(`/plot-units/${projectId}`);

export const savePlotLayout = async (projectId, elements) => {
  const { data } = await api.post(
    `/plot-units/${projectId}`,
    { elements }
  );
  return data;
};
