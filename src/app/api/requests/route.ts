import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentEmployee } from "@/lib/currentEmployee";
import { haversineKm } from "@/lib/distance";
import { computeEligibility } from "@/lib/eligibility";
import { computeStatusFlag } from "@/lib/statusFlag";
import { nextRequestCode } from "@/lib/requestCode";

export async function GET(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;

  const employee = await getCurrentEmployee(auth);
  if (!employee) {
    return NextResponse.json({ requests: [] });
  }

  const requests = await prisma.request.findMany({
    where: { employeeId: employee.id },
    include: { destinationBranch: true, selectedHotel: true, approver: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}

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
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const destinationBranch = await prisma.branch.findUnique({
    where: { code: body.destinationBranchCode?.trim() },
  });
  if (!destinationBranch) {
    return NextResponse.json({ error: "ไม่พบสาขาปลายทางนี้" }, { status: 400 });
  }

  if (body.hasOtherReason && !body.otherReasonText?.trim()) {
    return NextResponse.json({ error: "กรุณาระบุเหตุผลอื่น" }, { status: 400 });
  }

  if (!body.selectedHotelId && !body.otherHotelName?.trim()) {
    return NextResponse.json({ error: "กรุณาเลือกโรงแรมหรือระบุชื่อโรงแรม" }, { status: 400 });
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
    isAmTnTwoShift: body.isAmTnTwoShift,
    isAmTwoBranchesSimultaneous: body.isAmTwoBranchesSimultaneous,
    hasOtherReason: body.hasOtherReason,
  });

  if (!eligibility.eligible) {
    return NextResponse.json(
      { error: "ไม่เข้าเกณฑ์การจองที่พักตามระยะทางและเงื่อนไข ไม่สามารถส่งคำขอได้", eligibility },
      { status: 422 }
    );
  }

  let selectedHotel = null;
  if (body.selectedHotelId) {
    selectedHotel = await prisma.hotel.findUnique({ where: { id: body.selectedHotelId } });
    if (!selectedHotel || selectedHotel.branchId !== destinationBranch.id) {
      return NextResponse.json({ error: "โรงแรมที่เลือกไม่ตรงกับสาขาปลายทาง" }, { status: 400 });
    }
  }

  const isHotelInMasterList = Boolean(selectedHotel);
  const pricePerNight = body.pricePerNight != null ? Number(body.pricePerNight) : selectedHotel?.pricePerNight ?? null;
  const budgetPerNight = destinationBranch.budgetPerNight;
  const priceDiff = pricePerNight != null ? Math.max(0, pricePerNight - budgetPerNight) : null;

  const { flag: statusFlag } = computeStatusFlag({
    eligible: eligibility.eligible,
    eligibilityPath: eligibility.path,
    isHotelInMasterList,
    priceDiff,
  });

  const approver = await prisma.approver.findUnique({ where: { department: employee.department } });
  const requestCode = await nextRequestCode();

  const created = await prisma.request.create({
    data: {
      requestCode,
      employeeId: employee.id,
      department: employee.department,
      destinationBranchId: destinationBranch.id,
      hasCompanyCar: employee.hasCompanyCar,
      storeCenterBranchId: employee.storeCenterBranch.id,
      distanceKm,
      distanceCheckPassed: eligibility.distanceCheckPassed,
      isAmTnTwoShift: body.isAmTnTwoShift ?? null,
      isAmTwoBranchesSimultaneous: body.isAmTwoBranchesSimultaneous ?? null,
      hasOtherReason: body.hasOtherReason ?? null,
      otherReasonText: body.otherReasonText?.trim() || null,
      eligibilityResult: "ELIGIBLE",
      selectedHotelId: selectedHotel?.id ?? null,
      otherHotelName: selectedHotel ? null : body.otherHotelName?.trim() || null,
      bookingLink: body.bookingLink?.trim() || null,
      pricePerNight,
      checkInDate: body.checkInDate ? new Date(body.checkInDate) : null,
      checkOutDate: body.checkOutDate ? new Date(body.checkOutDate) : null,
      isHotelInMasterList,
      budgetPerNight,
      priceDiff,
      guestWillingToPayDiff: body.guestWillingToPayDiff ?? null,
      statusFlag,
      approverId: approver?.id ?? null,
    },
    include: { destinationBranch: true, selectedHotel: true, approver: true },
  });

  return NextResponse.json({ request: created }, { status: 201 });
}
