import { PropertyStatus, PropertyType, SaleStatus, RentStatus, SaleType } from './types';
 
export const SELLERS = [
  { 
    seller_id: 'SEL-101', name: 'Arun Kumar', phone_number: '9840012345', 
    email: 'arun@realty.com', created_at: '2023-01-10T10:00:00Z', address: '123 Realty Lane, Chennai'
  }
 ];
 
 export const BUYERS = [
   { buyer_id: 'BUY-201', name: 'Suresh Raina', phone_number: '9000011111', created_at: '2023-03-01T15:30:00Z' }
 ];
 
 export const PROPERTIES_MASTER = [
   {
     property_id: 'PROP-1', property_type: PropertyType.RENT, seller_id: 'SEL-101',
     title: 'Modern 3BHK Flat', description: 'Sea facing balcony, prime location',
     district_id: 'Chennai', taluk_id: 'Guindy', village_id: 'Velachery', area_id: 'A1',
     contact_phone: '9840012345', status: PropertyStatus.ACTIVE, created_at: '2023-04-01T09:00:00Z'
   },
   {
     property_id: 'PROP-2', property_type: PropertyType.SALE, seller_id: 'SEL-101',
     title: 'Suburban Villa', description: 'Gated community with amenities',
     district_id: 'Coimbatore', taluk_id: 'Pollachi', village_id: 'Zamin Uthukuli', area_id: 'A2',
     contact_phone: '9840012345', status: PropertyStatus.ACTIVE, created_at: '2023-04-10T11:00:00Z'
   },
   {
     property_id: 'PROP-3', property_type: PropertyType.PLOT, seller_id: 'SEL-101',
     title: 'Green Valley Layout', description: 'Prime residential plots',
     district_id: 'Chennai', taluk_id: 'Ambattur', village_id: 'Mogappair', area_id: 'A3',
     contact_phone: '9840012345', status: PropertyStatus.ACTIVE, created_at: '2023-04-15T10:00:00Z'
   }
 ];
 
 export const INITIAL_RENT_PROPERTIES = [
   {
     ...PROPERTIES_MASTER[0],
     bhk: 3, rent_amount: 45000, advance_amount: 250000,
     property_use: 'residential', furnished_status: 'Semi-furnished',
     rent_status: RentStatus.ACTIVE, landmark: 'Near Phoenix Mall',
     street_name: '10th Main Road', images: ['https://picsum.photos/seed/p1/400/300']
   }
 ];
 
 export const INITIAL_SALE_PROPERTIES = [
   {
     ...PROPERTIES_MASTER[1],
     sale_type: SaleType.HOUSE, price: 12500000,
     area_size: '2400 sqft', extension: 'South Facing',
     street_name_or_road_name: 'Greenway Road', survey_number: 'SN-402/1',
     boundary_east: 'Plot 403', boundary_west: 'Road',
     boundary_north: 'Park', boundary_south: 'Drainage',
     sale_status: SaleStatus.AVAILABLE, images: ['https://picsum.photos/seed/p2/400/300']
   }
 ];
 
 export const INITIAL_PLOT_PROJECTS = [
   {
     plot_project_id: 'PROJ-1', property_id: 'PROP-3',
     layout_name: 'Green Valley Estates', total_plots: 50,
     created_at: '2023-04-15T10:00:00Z', layout: []
   }
 ];
 
 export const INITIAL_ENQUIRIES = [
   { 
     enquiry_id: 'ENQ-001', property_id: 'PROP-1', phone_number: '9000011111', 
     buyer_id: 'BUY-201', message: 'Interested in visiting this weekend.', 
     enquiry_date: '2023-05-01T14:00:00Z' 
   }
 ];
 
 export const INITIAL_SELLERS = SELLERS;
 export const INITIAL_BUYERS = BUYERS;