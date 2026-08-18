export interface ListingQualityRules {
  minPhotos: number;
  requireTitle: boolean;
  requireDescription: boolean;
  minDescriptionLength: number;
  requireLocation: boolean;
  requireCategory: boolean;
  requireFarmType: boolean;
  requireAmenities: boolean;
  minAmenities: number;
}
