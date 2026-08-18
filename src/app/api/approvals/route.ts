import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeEligibility } from "@/lib/eligibility";
import { computeStatusFlag } from "@/lib/statusFlag";

export async function GET(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;

  const approver = await prisma.approver.findFirst({ where: { email: auth.email } });
  if (!approver) {
    return NextResponse.json({ error: "บัญชีนี้ไม่ได้ถูกกำหนดให้เป็นผู้อนุมัติ" }, { status: 403 });
  }

  const requests = await prisma.request.findMany({
    where: { approverId: approver.id },
    include: { destinationBranch: true, selectedHotel: true, employee: true },
    orderBy: { createdAt: "desc" },
  });

  const requestsWithReason = requests.map((r) => {
    const eligibility = computeEligibility({
      department: r.department,
      hasCompanyCar: r.hasCompanyCar,
      distanceKm: r.distanceKm ?? 0,
      isTravelTimeOverOneHour: r.isTravelTimeOverOneHour,
      isAmTnTwoShift: r.isAmTnTwoShift,
      isAmTwoBranchesSimultaneous: r.isAmTwoBranchesSimultaneous,
      hasOtherReason: r.hasOtherReason,
    });
    const { flag: statusFlag, reason: checkReason } = computeStatusFlag({
      eligible: eligibility.eligible,
      eligibilityPath: eligibility.path,
      isHotelInMasterList: r.isHotelInMasterList,
      priceDiff: r.priceDiff,
      guestCount: r.guestCount,
      roomCount: r.roomCount,
      soloGuestReason: r.soloGuestReason,
    });
    return { ...r, statusFlag, checkReason };
  });

  const summary = {
    total: requestsWithReason.length,
    green: requestsWithReason.filter((r) => r.statusFlag === "GREEN").length,
    yellow: requestsWithReason.filter((r) => r.statusFlag === "YELLOW").length,
    red: requestsWithReason.filter((r) => r.statusFlag === "RED").length,
    pending: requestsWithReason.filter((r) => r.approverAction === "PENDING").length,
  };

  return NextResponse.json({ approver, requests: requestsWithReason, summary });
}
