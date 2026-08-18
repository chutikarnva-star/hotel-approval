import { NextResponse } from "next/server";
import { requireAuthUser, isAdminEmail } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";

export async function POST(request: Request) {
  const auth = await requireAuthUser(request);
  if (auth instanceof Response) return auth;
  if (!isAdminEmail(auth.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await sendMail(
      auth.email,
      "ทดสอบอีเมลระบบขออนุมัติที่พัก",
      `<p>นี่คืออีเมลทดสอบจากระบบขออนุมัติที่พัก ส่งไปยัง ${auth.email}</p><p>ถ้าคุณได้รับอีเมลนี้ แปลว่าตั้งค่า SMTP สำเร็จแล้ว</p>`
    );
    return NextResponse.json({ ok: true, sentTo: auth.email });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "ส่งอีเมลไม่สำเร็จ" }, { status: 500 });
  }
}
