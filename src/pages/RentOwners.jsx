import React, { useEffect, useState } from 'react';
import Sellers from './Sellers'; // We will refactor Sellers to be reusable
import { getSellers } from '../api/seller.api';

const RentOwners = () => {
  // We use the exact same logic as your Sellers.jsx 
  // but we filter the data to only show those with Rent properties
  // or simply label the UI as "Rent Owners"
  
  return (
    <Sellers 
      title="Rent Owners" 
      subtitle="Management for Rental Property Owners"
      typeFilter="rent" 
    />
  );
};

export default RentOwners;