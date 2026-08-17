import { NextResponse } from "next/server";
import { STATE_COOKIE, saveConnectionFromCode } from "@/lib/googleSheets";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.slice(STATE_COOKIE.length + 1);

  const adminUrl = new URL("/admin", url.origin);

  if (!state || !cookieState || state !== cookieState) {
    adminUrl.searchParams.set("sheetsError", "invalid or expired state — try connecting again");
  } else if (!code) {
    adminUrl.searchParams.set("sheetsError", "Google did not return an authorization code");
  } else {
    try {
      const email = await saveConnectionFromCode(code);
      adminUrl.searchParams.set("sheetsConnected", email);
    } catch (err) {
      adminUrl.searchParams.set("sheetsError", err instanceof Error ? err.message : "connection failed");
    }
  }

  const response = NextResponse.redirect(adminUrl);
  response.cookies.delete(STATE_COOKIE);
  return response;
}
