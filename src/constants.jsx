import React from 'react';

export const LOCATIONS = {
  "Chennai": {
    "Mylapore": ["Mandaveli", "San Thome", "Alwarpet", "Abiramapuram"],
    "Guindy": ["Adyar", "Velachery", "Saidapet", "Kotturpuram"],
    "Ambattur": ["Padi", "Mogappair", "Avadi", "Korattur"],
    "T-Nagar": ["West Mambalam", "Kodambakkam", "Pondy Bazaar"]
  },
  "Coimbatore": {
    "Pollachi": ["Zamin Uthukuli", "Suleeswaranpatti", "Akkaraipalayam"],
    "Mettupalayam": ["Sirumugai", "Karamadai", "Bhavanisagar"],
    "Sulur": ["Kalangal", "Arasur", "Kaniyur"],
    "Perur": ["Vadavalli", "Thondamuthur", "Vedapatti"]
  },
  "Madurai": {
    "Melur": ["Therkutheru", "Keezhayur", "Narasingampatti"],
    "Vadipatti": ["Alanganallur", "Palamedu", "Sholavandan"],
    "Thirumangalam": ["Kalligudi", "Sindhupatti", "Checkanurani"]
  },
  "Trichy": {
    "Srirangam": ["Thiruvanaikoil", "Tiruverumbur", "Kallanai"],
    "Lalgudi": ["Anbil", "Pullambadi", "Manachanallur"],
    "Musiri": ["Thottiyam", "Kattuputhur", "Kulithalai"]
  }
};

export const DISTRICTS = Object.keys(LOCATIONS);

export const STATUS_COLORS = {
  Active: 'bg-green-100 text-green-800 border border-green-200',
  Available: 'bg-green-100 text-green-800 border border-green-200',
  Rented: 'bg-blue-100 text-blue-800 border border-blue-200',
  Inactive: 'bg-gray-100 text-gray-800 border border-gray-200',
  Booked: 'bg-orange-100 text-orange-800 border border-orange-200',
  Negotiation: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  Confirmed: 'bg-purple-100 text-purple-800 border border-purple-200',
  Finalized: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  Closed: 'bg-red-100 text-red-800 border border-red-200',
};

export const ICONS = {
  Dashboard: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  Rent: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  Sale: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Plots: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>,
  Sellers: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Buyers: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Enquiries: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
};