import type { EligibilityPath } from "./eligibility";

export type StatusFlag = "GREEN" | "YELLOW" | "RED";

export interface StatusFlagInput {
  eligible: boolean;
  eligibilityPath: EligibilityPath;
  isHotelInMasterList: boolean | null;
  priceDiff: number | null;
}

export interface StatusFlagOutput {
  flag: StatusFlag;
  reason: string;
}

/**
 * Mirrors the sheet's "สรุปสถานะคำขอที่พัก" summary buckets:
 * green = clean pass, yellow = needs a human look, red = missing/failed data.
 */
export function computeStatusFlag(input: StatusFlagInput): StatusFlagOutput {
  if (!input.eligible) {
    return { flag: "RED", reason: "ไม่เข้าเกณฑ์การจองที่พัก (ไม่มีเหตุผลรองรับ)" };
  }
  if (input.isHotelInMasterList === false) {
    return { flag: "RED", reason: "โรงแรมที่เลือกไม่อยู่ใน Master List" };
  }
  if (input.eligibilityPath === "other_reason") {
    return { flag: "YELLOW", reason: "ผ่านเกณฑ์ด้วยเหตุผลอื่น ต้องตรวจสอบเหตุผล" };
  }
  if (input.priceDiff != null && input.priceDiff > 0) {
    return { flag: "YELLOW", reason: `ราคาเกินงบ ${input.priceDiff} บาท/คืน` };
  }
  return { flag: "GREEN", reason: "ผ่านเกณฑ์ อนุมัติได้ทันที" };
}
