"use client";

import { useEffect, useMemo, useState } from "react";
import AdminGate from "@/components/AdminGate";
import { useAuth } from "@/lib/useAuth";
import { apiFetch } from "@/lib/apiFetch";
import { downloadWorkbook } from "@/lib/spreadsheetXml";

interface ReportRequest {
  id: string;
  requestCode: string;
  requestDate: string;
  pricePerNight: number | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  statusFlag: "GREEN" | "YELLOW" | "RED" | null;
  approverAction: "PENDING" | "APPROVED" | "REJECTED";
  employee: { id: string; code: string; name: string; department: string };
  destinationBranch: { code: string; name: string };
  selectedHotel: { name: string } | null;
  otherHotelName: string | null;
  bookingReason: string;
}

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function AdminReportsPage() {
  return (
    <AdminGate>
      <div className="container">
        <ReportsView />
      </div>
    </AdminGate>
  );
}

function ReportsView() {
  const { idToken } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [department, setDepartment] = useState("");
  const [rm, setRm] = useState("");
  const [am, setAm] = useState("");
  const [rmOptions, setRmOptions] = useState<string[]>([]);
  const [amOptions, setAmOptions] = useState<string[]>([]);

  const [requests, setRequests] = useState<ReportRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(idToken, "/api/branches/assignees?type=RM")
      .then((r) => r.json())
      .then((d) => setRmOptions(d.assignees ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAm("");
    setAmOptions([]);
    if (!rm) return;
    apiFetch(idToken, `/api/branches/assignees?type=AM&rmAssignee=${encodeURIComponent(rm)}`)
      .then((r) => r.json())
      .then((d) => setAmOptions(d.assignees ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rm]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (department) params.set("department", department);
    if (rm) params.set("rmAssignee", rm);
    if (am) params.set("amAssignee", am);
    const res = await apiFetch(idToken, `/api/admin/reports/requests?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setRequests(data.requests);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken, from, to, department, rm, am]);

  function setThisMonth() {
    const now = new Date();
    setFrom(toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)));
    setTo(toDateInput(now));
  }

  function setThisQuarter() {
    const now = new Date();
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    setFrom(toDateInput(new Date(now.getFullYear(), quarterStartMonth, 1)));
    setTo(toDateInput(now));
  }

  function clearFilters() {
    setFrom("");
    setTo("");
    setDepartment("");
    setRm("");
    setAm("");
  }

  const summary = useMemo(() => {
    const byEmployee = new Map<string, { employee: ReportRequest["employee"]; count: number }>();
    for (const r of requests) {
      const existing = byEmployee.get(r.employee.id);
      if (existing) existing.count++;
      else byEmployee.set(r.employee.id, { employee: r.employee, count: 1 });
    }
    return Array.from(byEmployee.values()).sort((a, b) => b.count - a.count);
  }, [requests]);

  function exportExcel() {
    downloadWorkbook(
      [
        {
          name: "สรุปรายคน",
          headers: ["รหัสพนักงาน", "ชื่อ", "หน่วยงาน", "จำนวนคำขอ"],
          rows: summary.map((s) => [s.employee.code, s.employee.name, s.employee.department, s.count]),
        },
        {
          name: "เหตุผลการจอง",
          headers: [
            "รหัสพนักงาน",
            "ชื่อ",
            "หน่วยงาน",
            "เลขที่คำขอ",
            "วันที่ยื่น",
            "สาขาปลายทาง",
            "โรงแรม",
            "เหตุผลการจอง",
            "ราคา/คืน",
            "วันที่เข้าพัก",
            "วันที่ออก",
            "สถานะ",
            "ผลอนุมัติ",
          ],
          rows: requests.map((r) => [
            r.employee.code,
            r.employee.name,
            r.employee.department,
            r.requestCode,
            r.requestDate.slice(0, 10),
            r.destinationBranch.name,
            r.selectedHotel?.name ?? r.otherHotelName ?? "-",
            r.bookingReason,
            r.pricePerNight,
            r.checkInDate?.slice(0, 10) ?? "-",
            r.checkOutDate?.slice(0, 10) ?? "-",
            r.statusFlag ?? "-",
            r.approverAction,
          ]),
        },
      ],
      `booking-frequency-${toDateInput(new Date())}.xls`
    );
  }

  return (
    <div>
      <h1>รายงานความถี่การจอง</h1>

      <div className="card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label>ตั้งแต่วันที่</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label>ถึงวันที่</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label>หน่วยงานผู้ขอ</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">ทั้งหมด</option>
              <option value="AM">AM</option>
              <option value="RM">RM</option>
              <option value="TN">TN</option>
              <option value="Audit">Audit</option>
            </select>
          </div>
          <div>
            <label>RM ปลายทาง</label>
            <select value={rm} onChange={(e) => setRm(e.target.value)}>
              <option value="">ทั้งหมด</option>
              {rmOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>AM ปลายทาง</label>
            <select value={am} onChange={(e) => setAm(e.target.value)} disabled={!rm}>
              <option value="">ทั้งหมด</option>
              {amOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button className="btn secondary" onClick={setThisMonth}>เดือนนี้</button>
          <button className="btn secondary" onClick={setThisQuarter}>ไตรมาสนี้</button>
          <button className="btn secondary" onClick={clearFilters}>ล้างตัวกรอง</button>
          <button className="btn" onClick={exportExcel} disabled={summary.length === 0}>ส่งออก Excel (2 แท็บ)</button>
        </div>
      </div>

      <div className="stat-row" style={{ marginBottom: 16 }}>
        <div className="stat-tile">
          <div className="num">{requests.length}</div>
          <div className="field-hint">คำขอทั้งหมดในช่วงที่เลือก</div>
        </div>
        <div className="stat-tile">
          <div className="num">{summary.length}</div>
          <div className="field-hint">จำนวนพนักงานที่มีคำขอ</div>
        </div>
      </div>

      {loading && <p className="field-hint">กำลังโหลด...</p>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>รหัส</th>
              <th>ชื่อ</th>
              <th>หน่วยงาน</th>
              <th>จำนวนคำขอ</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s) => (
              <RowWithDrilldown
                key={s.employee.id}
                row={s}
                expanded={expandedEmployeeId === s.employee.id}
                onToggle={() =>
                  setExpandedEmployeeId(expandedEmployeeId === s.employee.id ? null : s.employee.id)
                }
                requests={requests.filter((r) => r.employee.id === s.employee.id)}
              />
            ))}
          </tbody>
        </table>
        {summary.length === 0 && !loading && <p className="field-hint">ไม่มีข้อมูลในช่วงที่เลือก</p>}
      </div>
    </div>
  );
}

function RowWithDrilldown({
  row,
  expanded,
  onToggle,
  requests,
}: {
  row: { employee: ReportRequest["employee"]; count: number };
  expanded: boolean;
  onToggle: () => void;
  requests: ReportRequest[];
}) {
  return (
    <>
      <tr style={{ cursor: "pointer" }} onClick={onToggle}>
        <td>{row.employee.code}</td>
        <td>{row.employee.name}</td>
        <td>{row.employee.department}</td>
        <td>{row.count}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={4} style={{ background: "var(--bg)" }}>
            <table>
              <thead>
                <tr>
                  <th>เลขที่คำขอ</th>
                  <th>วันที่ยื่น</th>
                  <th>สาขาปลายทาง</th>
                  <th>โรงแรม</th>
                  <th>เหตุผลการจอง</th>
                  <th>ราคา/คืน</th>
                  <th>เข้าพัก</th>
                  <th>สถานะ</th>
                  <th>ผลอนุมัติ</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>{r.requestCode}</td>
                    <td>{r.requestDate.slice(0, 10)}</td>
                    <td>{r.destinationBranch.name}</td>
                    <td>{r.selectedHotel?.name ?? r.otherHotelName ?? "-"}</td>
                    <td>{r.bookingReason}</td>
                    <td>{r.pricePerNight ?? "-"}</td>
                    <td>
                      {r.checkInDate?.slice(0, 10)} — {r.checkOutDate?.slice(0, 10)}
                    </td>
                    <td>{r.statusFlag && <span className={`badge ${r.statusFlag}`}>{r.statusFlag}</span>}</td>
                    <td>{r.approverAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}
