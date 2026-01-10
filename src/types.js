// ==========================
// Enums → Frozen Objects
// ==========================

export const PropertyStatus = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  CLOSED: 'closed',
});

export const PropertyType = Object.freeze({
  RENT: 'rent',
  SALE: 'sale',
  PLOT: 'plot',
});

export const RentStatus = Object.freeze({
  ACTIVE: 'active',
  RENTED: 'rented',
});

export const SaleStatus = Object.freeze({
  AVAILABLE: 'available',
  BOOKED: 'booked',
  NEGOTIATION: 'negotiation',
  CONFIRMED: 'confirmed',
  FINALIZED: 'finalised',
});

export const SaleType = Object.freeze({
  LAND: 'land',
  PLOT: 'plot',
  HOUSE: 'house',
  FLAT: 'flat',
});

export const PlotUnitStatus = Object.freeze({
  ACTIVE: 'active',
  BOOKED: 'booked',
  CLOSED: 'closed',
});

export const ElementType = Object.freeze({
  PLOT: 'plot',
  ROAD: 'road',
  TEXT: 'text',
});


// ==========================
// Interfaces → JSDoc Typedefs
// ==========================

/**
 * @typedef {Object} Seller
 * @property {string} seller_id
 * @property {string} name
 * @property {string} phone_number
 * @property {string=} alternate_phone
 * @property {string=} email
 * @property {string=} address
 * @property {string} created_at
 */

/**
 * @typedef {Object} Buyer
 * @property {string} buyer_id
 * @property {string=} name
 * @property {string} phone_number
 * @property {string=} email
 * @property {string} created_at
 */

/**
 * @typedef {Object} PropertyMaster
 * @property {string} property_id
 * @property {string} property_type
 * @property {string} seller_id
 * @property {string} title
 * @property {string} description
 * @property {string} district_id
 * @property {string} taluk_id
 * @property {string} village_id
 * @property {string} area_id
 * @property {number=} latitude
 * @property {number=} longitude
 * @property {string} contact_phone
 * @property {string} status
 * @property {string} created_at
 */

/**
 * @typedef {Object} RentPropertyExtension
 * @property {string} property_id
 * @property {number} bhk
 * @property {number} rent_amount
 * @property {number} advance_amount
 * @property {'residential' | 'commercial'} property_use
 * @property {string} furnished_status
 * @property {string} rent_status
 * @property {string} landmark
 * @property {string} street_name
 * @property {string[]} images
 * @property {string[]=} videos
 */

/**
 * @typedef {Object} SalePropertyExtension
 * @property {string} property_id
 * @property {string} sale_type
 * @property {number} price
 * @property {string} area_size
 * @property {string} extension
 * @property {string} street_name_or_road_name
 * @property {string} survey_number
 * @property {string} boundary_east
 * @property {string} boundary_west
 * @property {string} boundary_north
 * @property {string} boundary_south
 * @property {string} sale_status
 * @property {string[]} images
 * @property {string[]=} videos
 * @property {string=} documents
 * @property {string=} brochure
 * @property {string=} drawings
 */

/**
 * @typedef {Object} PlotProject
 * @property {string} plot_project_id
 * @property {string} property_id
 * @property {string} layout_name
 * @property {number} total_plots
 * @property {string=} layout_base_image
 * @property {string} created_at
 */

/**
 * @typedef {Object} PlotUnit
 * @property {string} plot_unit_id
 * @property {string} plot_project_id
 * @property {string} plot_number
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {string} status
 * @property {string=} assigned_buyer_id
 */

/**
 * @typedef {Object} Enquiry
 * @property {string} enquiry_id
 * @property {string} property_id
 * @property {string} phone_number
 * @property {string=} buyer_id
 * @property {string=} message
 * @property {string} enquiry_date
 */

/**
 * @typedef {Object} BuyerPropertyStatus
 * @property {string} id
 * @property {string} buyer_id
 * @property {string} property_id
 * @property {'visited' | 'booked' | 'confirmed'} status
 * @property {string} created_at
 */

/**
 * @typedef {Object} PremiumProperty
 * @property {string} id
 * @property {string} property_id
 * @property {string} start_date
 * @property {string} end_date
 * @property {number} priority_order
 */

/**
 * @typedef {Object} CanvasElement
 * @property {string} plot_unit_id
 * @property {string} plot_project_id
 * @property {string} plot_number
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {string} status
 * @property {string=} assigned_buyer_id
 * @property {string} type
 * @property {string=} name
 * @property {number=} rotation
 * @property {number=} fontSize
 * @property {string=} fontWeight
 * @property {string=} color
 * @property {boolean=} visible
 */
