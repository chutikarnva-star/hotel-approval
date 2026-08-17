import { NextResponse } from "next/server";
import { requireAuthUser, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeRecommendLevel } from "@/lib/hotelLevel";
import {
  fetchSheetTabs,
  mapApprovers,
  mapBranches,
  mapEmployees,
  mapHotels,
} from "@/lib/googleSheets";

interface ImportSummary {
  created: number;
  updated: number;
  errors: string[];
}

export async function POST(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;
  if (!isAdminEmail(auth.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let tabs;
  try {
    tabs = await fetchSheetTabs();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read Google Sheet" },
      { status: 400 }
    );
  }

  const branches = await syncBranches(tabs);
  const branchByCode = new Map((await prisma.branch.findMany()).map((b) => [b.code, b.id]));
  const employees = await syncEmployees(tabs, branchByCode);
  const hotels = await syncHotels(tabs, branchByCode);
  const approvers = await syncApprovers(tabs);

  return NextResponse.json({ branches, employees, hotels, approvers });
}

async function syncBranches(tabs: Awaited<ReturnType<typeof fetchSheetTabs>>): Promise<ImportSummary> {
  const { rows, errors } = mapBranches(tabs);
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const existing = await prisma.branch.findUnique({ where: { code: row.code } });
    await prisma.branch.upsert({
      where: { code: row.code },
      create: {
        code: row.code,
        name: row.name,
        lat: row.lat,
        lng: row.lng,
        budgetPerNight: row.budgetPerNight,
        isNewBranch: row.isNewBranch,
        openDate: row.openDate,
        rmAssignee: row.rmAssignee,
        amAssignee: row.amAssignee,
      },
      update: {
        name: row.name,
        lat: row.lat,
        lng: row.lng,
        budgetPerNight: row.budgetPerNight,
        isNewBranch: row.isNewBranch,
        openDate: row.openDate,
        rmAssignee: row.rmAssignee,
        amAssignee: row.amAssignee,
      },
    });
    if (existing) updated++;
    else created++;
  }

  return { created, updated, errors };
}

async function syncEmployees(
  tabs: Awaited<ReturnType<typeof fetchSheetTabs>>,
  branchByCode: Map<string, string>
): Promise<ImportSummary> {
  const { rows, errors } = mapEmployees(tabs);
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    let storeCenterBranchId: string | undefined;
    if (row.storeCenterBranchCode) {
      storeCenterBranchId = branchByCode.get(row.storeCenterBranchCode);
      if (!storeCenterBranchId) {
        errors.push(`Employee ${row.code}: storeCenterBranchCode "${row.storeCenterBranchCode}" not found`);
        continue;
      }
    }

    const existing = await prisma.employee.findUnique({ where: { code: row.code } });
    await prisma.employee.upsert({
      where: { code: row.code },
      create: {
        code: row.code,
        name: row.name,
        department: row.department,
        amTeam: row.amTeam,
        codeNickname: row.codeNickname,
        storeCenterBranchId,
        hasCompanyCar: row.hasCompanyCar,
      },
      update: {
        name: row.name,
        department: row.department,
        amTeam: row.amTeam,
        codeNickname: row.codeNickname,
        storeCenterBranchId,
        hasCompanyCar: row.hasCompanyCar,
      },
    });
    if (existing) updated++;
    else created++;
  }

  return { created, updated, errors };
}

async function syncHotels(
  tabs: Awaited<ReturnType<typeof fetchSheetTabs>>,
  branchByCode: Map<string, string>
): Promise<ImportSummary> {
  const { rows, errors } = mapHotels(tabs);
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const branchId = branchByCode.get(row.branchCode);
    if (!branchId) {
      errors.push(`Hotel "${row.name}": unknown branchCode "${row.branchCode}"`);
      continue;
    }

    const existing = await prisma.hotel.findUnique({
      where: { branchId_name: { branchId, name: row.name } },
    });
    await prisma.hotel.upsert({
      where: { branchId_name: { branchId, name: row.name } },
      create: {
        branchId,
        name: row.name,
        lat: row.lat,
        lng: row.lng,
        distanceKm: row.distanceKm,
        pricePerNight: row.pricePerNight,
        recommendLevel: computeRecommendLevel(row.distanceKm, row.pricePerNight),
        note: row.note,
      },
      update: {
        lat: row.lat,
        lng: row.lng,
        distanceKm: row.distanceKm,
        pricePerNight: row.pricePerNight,
        recommendLevel: computeRecommendLevel(row.distanceKm, row.pricePerNight),
        note: row.note,
      },
    });
    if (existing) updated++;
    else created++;
  }

  return { created, updated, errors };
}

async function syncApprovers(tabs: Awaited<ReturnType<typeof fetchSheetTabs>>): Promise<ImportSummary> {
  const { rows, errors } = mapApprovers(tabs);
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const existing = await prisma.approver.findUnique({ where: { department: row.department } });
    // The sheet's email column is still blank for every row (per the original
    // rollout notes) — never let a blank sheet value clobber an email entered
    // manually via /admin/approvers.
    const email = row.email ?? existing?.email ?? null;

    await prisma.approver.upsert({
      where: { department: row.department },
      create: {
        department: row.department,
        nickname: row.nickname,
        fullName: row.fullName,
        email,
      },
      update: {
        nickname: row.nickname,
        fullName: row.fullName,
        email,
      },
    });
    if (existing) updated++;
    else created++;
  }

  return { created, updated, errors };
}
