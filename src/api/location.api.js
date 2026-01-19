import { api } from "./api";

export const getDistricts = async () => {
    const res = await api.get(`locations/districts`);
    return res.data;
};

// Change from query params (?) to path params (/)
export const getTaluks = async (districtId) => {
    if (!districtId) return []; 
    const res = await api.get(`locations/taluks/${districtId}`);
    return res.data;
};

export const getVillages = async (talukId) => {
    if (!talukId) return [];
    const res = await api.get(`locations/villages/${talukId}`);
    return res.data;
};