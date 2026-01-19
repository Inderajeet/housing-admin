import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDistricts, getTaluks, getVillages } from '../api/location.api'; // Adjust based on your API file names

const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [districts, setDistricts] = useState([]);
  const [taluks, setTaluks] = useState([]);
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const [d, t, v] = await Promise.all([
        getDistricts(),
        // getTaluks(),
        // getVillages()
      ]);
      setDistricts(Array.isArray(d) ? d : []);
      setTaluks(Array.isArray(t) ? t : []);
      setVillages(Array.isArray(v) ? v : []);
    } catch (error) {
      console.error("Error fetching location masters:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  return (
    <LocationContext.Provider value={{ districts, taluks, villages, loading, refreshLocations: fetchLocations }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocations = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocations must be used within a LocationProvider");
  }
  return context;
};