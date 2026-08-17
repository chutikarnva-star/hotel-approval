import { NextResponse } from "next/server";
import { requireAuthUser, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Department, Prisma } from "@prisma/client";

const VALID_DEPARTMENTS: Department[] = ["AM", "RM", "TN", "Audit"];

export async function GET(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;
  if (!isAdminEmail(auth.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const departmentParam = searchParams.get("department") as Department | null;
  const department = departmentParam && VALID_DEPARTMENTS.includes(departmentParam) ? departmentParam : undefined;
  const rmAssignee = searchParams.get("rmAssignee")?.trim() || undefined;
  const amAssignee = searchParams.get("amAssignee")?.trim() || undefined;

  const where: Prisma.RequestWhereInput = {};
  if (from || to) {
    where.requestDate = {
      gte: from ? new Date(from) : undefined,
      lte: to ? new Date(`${to}T23:59:59.999Z`) : undefined,
    };
  }
  if (department) {
    where.employee = { department };
  }
  if (rmAssignee || amAssignee) {
    where.destinationBranch = { rmAssignee, amAssignee };
  }

  const requests = await prisma.request.findMany({
    where,
    select: {
      id: true,
      requestCode: true,
      requestDate: true,
      pricePerNight: true,
      checkInDate: true,
      checkOutDate: true,
      statusFlag: true,
      approverAction: true,
      employee: { select: { id: true, code: true, name: true, department: true } },
      destinationBranch: { select: { code: true, name: true } },
      selectedHotel: { select: { name: true } },
      otherHotelName: true,
      distanceCheckPassed: true,
      isTravelTimeOverOneHour: true,
      travelTimeEvidenceUrl: true,
      isAmTnTwoShift: true,
      isAmTwoBranchesSimultaneous: true,
      hasOtherReason: true,
      otherReasonText: true,
    },
    orderBy: { requestDate: "desc" },
  });

  const withReason = requests.map((r) => ({ ...r, bookingReason: describeReason(r) }));

  return NextResponse.json({ requests: withReason });
}

function describeReason(r: {
  distanceCheckPassed: boolean | null;
  isTravelTimeOverOneHour: boolean | null;
  isAmTnTwoShift: boolean | null;
  isAmTwoBranchesSimultaneous: boolean | null;
  hasOtherReason: boolean | null;
  otherReasonText: string | null;
}): string {
  if (r.distanceCheckPassed) return "ระยะทางเกินเกณฑ์";
  if (r.isTravelTimeOverOneHour) return "เดินทางเกิน 1 ชั่วโมง";
  if (r.isAmTnTwoShift) return "ทีม AM/TN ทำงานคนละกะกัน";
  if (r.isAmTwoBranchesSimultaneous) return "เปิด 2 สาขาพร้อมกัน";
  if (r.hasOtherReason) return `เหตุผลอื่น: ${r.otherReasonText ?? "-"}`;
  return "-";
}
