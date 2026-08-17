import { NextResponse } from "next/server";
import { requireAuthUser, isAdminEmail } from "@/lib/auth";
import { getConnectionStatus } from "@/lib/googleSheets";

export async function GET(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;
  if (!isAdminEmail(auth.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const connection = await getConnectionStatus();
  return NextResponse.json({
    connected: !!connection,
    email: connection?.connectedEmail ?? null,
  });
}
