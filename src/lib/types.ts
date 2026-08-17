export interface BranchLite {
  id: string;
  code: string;
  name: string;
  lat: number;
  lng: number;
  budgetPerNight: number;
}

export interface HotelLite {
  id: string;
  name: string;
  distanceKm: number | null;
  pricePerNight: number | null;
  recommendLevel: number;
  note: string | null;
}

export interface EligibilityResponse {
  employee: {
    department: string;
    hasCompanyCar: boolean;
    storeCenter: { code: string; name: string };
  };
  destinationBranch: { code: string; name: string; budgetPerNight: number };
  distanceKm: number;
  eligibility: {
    distanceThresholdKm: number;
    distanceCheckPassed: boolean;
    eligible: boolean;
    path: "distance" | "travel_time" | "two_shift" | "two_branch" | "other_reason" | "none";
  };
}
