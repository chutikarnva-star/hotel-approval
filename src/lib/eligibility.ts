import type { Department } from "@prisma/client";

export const DISTANCE_THRESHOLD_KM_WITH_CAR = 60;
export const DISTANCE_THRESHOLD_KM_NO_CAR = 15;

export type EligibilityPath =
  | "distance"
  | "travel_time"
  | "two_shift"
  | "two_branch"
  | "other_reason"
  | "none";

export interface EligibilityInput {
  department: Department;
  hasCompanyCar: boolean;
  distanceKm: number;
  isTravelTimeOverOneHour?: boolean | null;
  isAmTnTwoShift?: boolean | null;
  isAmTwoBranchesSimultaneous?: boolean | null;
  hasOtherReason?: boolean | null;
}

export interface EligibilityOutput {
  distanceThresholdKm: number;
  distanceCheckPassed: boolean;
  eligible: boolean;
  path: EligibilityPath;
}

/**
 * Mirrors the approval-workflow flowchart: a distance (km) check first, then
 * a travel-time (>1hr) fallback, then (only if both fail) role-specific
 * fallbacks in a fixed order, ending in a free-text "other reason" catch-all.
 */
export function computeEligibility(input: EligibilityInput): EligibilityOutput {
  const distanceThresholdKm = input.hasCompanyCar
    ? DISTANCE_THRESHOLD_KM_WITH_CAR
    : DISTANCE_THRESHOLD_KM_NO_CAR;
  const distanceCheckPassed = input.distanceKm > distanceThresholdKm;

  if (distanceCheckPassed) {
    return { distanceThresholdKm, distanceCheckPassed, eligible: true, path: "distance" };
  }

  if (input.isTravelTimeOverOneHour === true) {
    return { distanceThresholdKm, distanceCheckPassed, eligible: true, path: "travel_time" };
  }

  if (
    (input.department === "AM" || input.department === "TN") &&
    input.isAmTnTwoShift === true
  ) {
    return { distanceThresholdKm, distanceCheckPassed, eligible: true, path: "two_shift" };
  }

  if (input.department === "AM" && input.isAmTwoBranchesSimultaneous === true) {
    return { distanceThresholdKm, distanceCheckPassed, eligible: true, path: "two_branch" };
  }

  if (input.hasOtherReason === true) {
    return { distanceThresholdKm, distanceCheckPassed, eligible: true, path: "other_reason" };
  }

  return { distanceThresholdKm, distanceCheckPassed, eligible: false, path: "none" };
}
