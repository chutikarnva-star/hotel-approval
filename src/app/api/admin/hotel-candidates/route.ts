import { NextResponse } from "next/server";
import { requireAuthUser, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;
  if (!isAdminEmail(auth.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const grouped = await prisma.request.groupBy({
    by: ["destinationBranchId", "otherHotelName"],
    where: { isHotelInMasterList: false, otherHotelName: { not: null } },
    _count: true,
    _max: { requestDate: true, pricePerNight: true },
  });

  const branchIds = [...new Set(grouped.map((g) => g.destinationBranchId))];
  const branches = await prisma.branch.findMany({ where: { id: { in: branchIds } } });
  const branchById = new Map(branches.map((b) => [b.id, b]));

  const dismissed = await prisma.hotelCandidateReview.findMany({
    where: { branchId: { in: branchIds }, dismissed: true },
  });
  const dismissedKeys = new Set(dismissed.map((d) => `${d.branchId}::${d.hotelName}`));

  const candidates = grouped
    .filter((g) => !dismissedKeys.has(`${g.destinationBranchId}::${g.otherHotelName}`))
    .map((g) => {
      const branch = branchById.get(g.destinationBranchId);
      return {
        branchId: g.destinationBranchId,
        branchCode: branch?.code ?? "-",
        branchName: branch?.name ?? "-",
        hotelName: g.otherHotelName as string,
        requestCount: g._count,
        latestPricePerNight: g._max.pricePerNight,
        latestRequestDate: g._max.requestDate,
      };
    })
    .sort((a, b) => new Date(b.latestRequestDate ?? 0).getTime() - new Date(a.latestRequestDate ?? 0).getTime());

  return NextResponse.json({ candidates });
}
