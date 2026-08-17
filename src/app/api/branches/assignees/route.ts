import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Distinct RM/AM assignee values (e.g. "RMX002 ปุ๋ย") for the cascading
// RM -> AM -> branch selector in BranchSearch.tsx. AM values can be scoped to
// a specific RM's team via ?rmAssignee=... (see Store Master sheet columns R
// and V, where every branch has exactly one RM and one AM).
export async function GET(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const rmAssignee = searchParams.get("rmAssignee")?.trim() || undefined;

  if (type !== "RM" && type !== "AM") {
    return NextResponse.json({ error: "type must be RM or AM" }, { status: 400 });
  }

  const rows =
    type === "RM"
      ? await prisma.branch.findMany({
          where: { rmAssignee: { not: null } },
          select: { rmAssignee: true },
          distinct: ["rmAssignee"],
          orderBy: { rmAssignee: "asc" },
        })
      : await prisma.branch.findMany({
          where: { amAssignee: { not: null }, rmAssignee },
          select: { amAssignee: true },
          distinct: ["amAssignee"],
          orderBy: { amAssignee: "asc" },
        });

  const assignees = rows
    .map((r) => (type === "RM" ? (r as { rmAssignee: string | null }).rmAssignee : (r as { amAssignee: string | null }).amAssignee))
    .filter((v): v is string => !!v);

  return NextResponse.json({ assignees });
}
