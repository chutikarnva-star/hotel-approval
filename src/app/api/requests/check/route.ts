import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployee } from "@/lib/currentEmployee";
import { haversineKm } from "@/lib/distance";
import { computeEligibility } from "@/lib/eligibility";

export async function POST(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;

  const employee = await getCurrentEmployee(auth);
  if (!employee) {
    return NextResponse.json({ error: "บัญชีนี้ยังไม่ได้ผูกกับรหัสพนักงาน" }, { status: 409 });
  }
  if (!employee.storeCenterBranch) {
    return NextResponse.json({ error: "ไม่พบ Store Center ของพนักงานนี้ กรุณาติดต่อ admin" }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const destinationBranchCode = body?.destinationBranchCode?.trim();
  if (!destinationBranchCode) {
    return NextResponse.json({ error: "destinationBranchCode is required" }, { status: 400 });
  }

  const destinationBranch = await prisma.branch.findUnique({ where: { code: destinationBranchCode } });
  if (!destinationBranch) {
    return NextResponse.json({ error: "ไม่พบสาขาปลายทางนี้" }, { status: 400 });
  }

  const distanceKm = haversineKm(
    employee.storeCenterBranch.lat,
    employee.storeCenterBranch.lng,
    destinationBranch.lat,
    destinationBranch.lng
  );

  const eligibility = computeEligibility({
    department: employee.department,
    hasCompanyCar: employee.hasCompanyCar,
    distanceKm,
    isAmTnTwoShift: body?.isAmTnTwoShift,
    isAmTwoBranchesSimultaneous: body?.isAmTwoBranchesSimultaneous,
    hasOtherReason: body?.hasOtherReason,
  });

  return NextResponse.json({
    employee: {
      department: employee.department,
      hasCompanyCar: employee.hasCompanyCar,
      storeCenter: { code: employee.storeCenterBranch.code, name: employee.storeCenterBranch.name },
    },
    destinationBranch: { code: destinationBranch.code, name: destinationBranch.name, budgetPerNight: destinationBranch.budgetPerNight },
    distanceKm,
    eligibility,
  });
}
