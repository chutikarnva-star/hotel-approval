import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cjx-hotel-approval.netlify.app";

function formatDate(d: Date | null) {
  if (!d) return "-";
  return new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium" }).format(d);
}

export interface DigestResult {
  approver: string;
  email: string | null;
  pendingCount: number;
  sent: boolean;
  skippedReason?: string;
}

export async function sendPendingDigest(): Promise<DigestResult[]> {
  const approvers = await prisma.approver.findMany();
  const results: DigestResult[] = [];

  for (const approver of approvers) {
    const pending = await prisma.request.findMany({
      where: { approverId: approver.id, approverAction: "PENDING" },
      include: { employee: true, destinationBranch: true, selectedHotel: true },
      orderBy: { requestDate: "asc" },
    });

    if (pending.length === 0) {
      results.push({ approver: approver.department, email: approver.email, pendingCount: 0, sent: false });
      continue;
    }

    if (!approver.email) {
      results.push({
        approver: approver.department,
        email: null,
        pendingCount: pending.length,
        sent: false,
        skippedReason: "ผู้อนุมัติแผนกนี้ยังไม่มีอีเมล",
      });
      continue;
    }

    const rows = pending
      .map(
        (r) => `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${r.requestCode}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${r.employee.name}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${r.destinationBranch.name}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${r.selectedHotel?.name ?? r.otherHotelName ?? "-"}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;">${formatDate(r.requestDate)}</td>
        </tr>`
      )
      .join("");

    const html = `
      <div style="font-family:sans-serif;color:#16182c;">
        <h2>สรุปคำขอที่พักรออนุมัติ (${approver.department})</h2>
        <p>มีคำขอค้างอนุมัติทั้งหมด <strong>${pending.length}</strong> รายการ ณ วันที่ ${formatDate(new Date())}</p>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <thead>
            <tr style="background:#f4f6fb;text-align:left;">
              <th style="padding:6px 10px;">รหัสคำขอ</th>
              <th style="padding:6px 10px;">พนักงาน</th>
              <th style="padding:6px 10px;">สาขา</th>
              <th style="padding:6px 10px;">โรงแรม</th>
              <th style="padding:6px 10px;">วันที่ขอ</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:16px;">
          <a href="${APP_URL}/approvals" style="color:#3457e6;">เข้าไปอนุมัติที่นี่</a>
        </p>
      </div>
    `;

    await sendMail(approver.email, `สรุปคำขอที่พักรออนุมัติ (${approver.department}) - ${pending.length} รายการ`, html);
    results.push({ approver: approver.department, email: approver.email, pendingCount: pending.length, sent: true });
  }

  return results;
}
