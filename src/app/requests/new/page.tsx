"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import BranchSearch from "@/components/BranchSearch";
import { ThaiDateSelect, ThaiDateTimeSelect } from "@/components/ThaiDatePicker";
import { useAuth } from "@/lib/useAuth";
import { useMe } from "@/lib/useMe";
import { apiFetch } from "@/lib/apiFetch";
import type { BranchLite, EligibilityResponse, HotelLite } from "@/lib/types";

export default function NewRequestPage() {
  return (
    <AuthGate>
      <div className="container">
        <NewRequestForm />
      </div>
    </AuthGate>
  );
}

function NewRequestForm() {
  const { idToken } = useAuth();
  const { employee } = useMe();
  const router = useRouter();

  const [branch, setBranch] = useState<BranchLite | null>(null);
  const [isTravelTimeOverOneHour, setIsTravelTimeOverOneHour] = useState<boolean | null>(null);
  const [travelTimeEvidenceUrl, setTravelTimeEvidenceUrl] = useState("");
  const [isAmTnTwoShift, setIsAmTnTwoShift] = useState<boolean | null>(null);
  const [isAmTwoBranchesSimultaneous, setIsAmTwoBranchesSimultaneous] = useState<boolean | null>(null);
  const [hasOtherReason, setHasOtherReason] = useState<boolean | null>(null);
  const [otherReasonText, setOtherReasonText] = useState("");

  const [checkResult, setCheckResult] = useState<EligibilityResponse | null>(null);
  const [checking, setChecking] = useState(false);

  const [hotels, setHotels] = useState<HotelLite[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [useOtherHotel, setUseOtherHotel] = useState(false);
  const [otherHotelName, setOtherHotelName] = useState("");
  const [hotelNameCopied, setHotelNameCopied] = useState(false);

  const [choowapBookedAt, setChoowapBookedAt] = useState("");
  const [pricePerNight, setPricePerNight] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [roomCount, setRoomCount] = useState("");
  const [soloGuestReason, setSoloGuestReason] = useState("");
  const [guestWillingToPayDiff, setGuestWillingToPayDiff] = useState<boolean | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const department = employee?.department;
  const needsTwoShiftQuestion = department === "AM" || department === "TN";
  const needsTwoBranchQuestion = department === "AM";

  useEffect(() => {
    if (!branch) {
      setCheckResult(null);
      return;
    }
    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, isTravelTimeOverOneHour, isAmTnTwoShift, isAmTwoBranchesSimultaneous, hasOtherReason]);

  useEffect(() => {
    if (checkResult?.eligibility.eligible && branch) {
      apiFetch(idToken, `/api/hotels?branchCode=${branch.code}`)
        .then((r) => r.json())
        .then((d) => setHotels(d.hotels));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkResult?.eligibility.eligible, branch]);

  async function runCheck() {
    if (!branch) return;
    setChecking(true);
    const res = await apiFetch(idToken, "/api/requests/check", {
      method: "POST",
      body: JSON.stringify({
        destinationBranchCode: branch.code,
        isTravelTimeOverOneHour,
        isAmTnTwoShift,
        isAmTwoBranchesSimultaneous,
        hasOtherReason,
      }),
    });
    setChecking(false);
    if (res.ok) {
      setCheckResult(await res.json());
    }
  }

  const priceDiff =
    pricePerNight && checkResult
      ? Math.max(0, Number(pricePerNight) - checkResult.destinationBranch.budgetPerNight)
      : 0;

  const budgetCap = checkResult?.destinationBranch.budgetPerNight;
  const sortedHotels = useMemo(() => {
    if (budgetCap == null) return hotels;
    const withinBudget = (h: HotelLite) => h.pricePerNight != null && h.pricePerNight <= budgetCap;
    return [...hotels].sort((a, b) => {
      const aWithin = withinBudget(a);
      const bWithin = withinBudget(b);
      if (aWithin !== bWithin) return aWithin ? -1 : 1;
      if (aWithin) {
        return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
      }
      const priceDiff = (a.pricePerNight ?? Infinity) - (b.pricePerNight ?? Infinity);
      if (priceDiff !== 0) return priceDiff;
      return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
    });
  }, [hotels, budgetCap]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await apiFetch(idToken, "/api/requests", {
      method: "POST",
      body: JSON.stringify({
        destinationBranchCode: branch?.code,
        isTravelTimeOverOneHour,
        travelTimeEvidenceUrl,
        isAmTnTwoShift,
        isAmTwoBranchesSimultaneous,
        hasOtherReason,
        otherReasonText,
        selectedHotelId: useOtherHotel ? null : selectedHotelId,
        otherHotelName: useOtherHotel ? otherHotelName : null,
        choowapBookedAt,
        pricePerNight: pricePerNight ? Number(pricePerNight) : null,
        checkInDate,
        checkOutDate,
        guestCount: guestCount ? Number(guestCount) : null,
        roomCount: roomCount ? Number(roomCount) : null,
        soloGuestReason,
        guestWillingToPayDiff,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "เกิดข้อผิดพลาด");
      return;
    }
    router.push("/requests");
  }

  const eligibility = checkResult?.eligibility;
  const showQuestions = eligibility && !eligibility.distanceCheckPassed;
  const noReasonGivenYet =
    showQuestions &&
    isTravelTimeOverOneHour == null &&
    isAmTnTwoShift == null &&
    isAmTwoBranchesSimultaneous == null &&
    hasOtherReason == null;

  const canProceedToHotel = eligibility?.eligible === true;
  const canSubmit =
    canProceedToHotel &&
    (!isTravelTimeOverOneHour || travelTimeEvidenceUrl.trim()) &&
    (selectedHotelId || (useOtherHotel && otherHotelName.trim())) &&
    choowapBookedAt &&
    pricePerNight &&
    checkInDate &&
    checkOutDate &&
    guestCount &&
    roomCount &&
    (Number(guestCount) !== 1 || soloGuestReason.trim()) &&
    (priceDiff === 0 || guestWillingToPayDiff != null);

  return (
    <div>
      <h1>ฟอร์มขออนุมัติจองที่พัก</h1>

      <div className="card">
        <label>สาขาที่จะไปทำงาน</label>
        <BranchSearch onSelect={setBranch} />
      </div>

      {checking && <p className="field-hint">กำลังตรวจสอบระยะทาง...</p>}

      {checkResult && (
        <div className="card">
          <p>
            <strong>สาขาใกล้บ้าน:</strong> {checkResult.employee.storeCenter.code} - {checkResult.employee.storeCenter.name}
            <br />
            <strong>มีรถบริษัท:</strong> {checkResult.employee.hasCompanyCar ? "มี" : "ไม่มี"}
            <br />
            <strong>ระยะทาง:</strong> {checkResult.distanceKm.toFixed(1)} กม. (เกณฑ์ &gt;{" "}
            {checkResult.eligibility.distanceThresholdKm} กม.)
          </p>
          <p className={`badge ${eligibility?.distanceCheckPassed ? "GREEN" : "RED"}`}>
            {eligibility?.distanceCheckPassed ? "ผ่านเกณฑ์ระยะทาง" : "ไม่ผ่านเกณฑ์ระยะทาง"}
          </p>
        </div>
      )}

      {showQuestions && (
        <div className="card">
          <p className="field-hint">ระยะทางไม่ถึงเกณฑ์ กรุณาตอบคำถามเพิ่มเติมเพื่อตรวจสอบสิทธิ์</p>

          <label>เดินทางจากสาขาใกล้บ้าน ไปสาขาที่จะไปทำงาน ใช้เวลาเกิน 1 ชั่วโมงหรือไม่?</label>
          <YesNo value={isTravelTimeOverOneHour} onChange={setIsTravelTimeOverOneHour} />
          {isTravelTimeOverOneHour && (
            <>
              <label>แนบลิงก์ Google Maps ประกอบการตรวจสอบ</label>
              <input
                value={travelTimeEvidenceUrl}
                onChange={(e) => setTravelTimeEvidenceUrl(e.target.value)}
                placeholder="https://www.google.com/maps/dir/..."
              />
              <p className="field-hint">
                ลิงก์ต้องแสดงต้นทางเป็นสาขาใกล้บ้านของคุณ ปลายทางเป็นสาขาที่จะไปทำงาน
                และเวลาเดินทางเกิน 60 นาที — ผู้อนุมัติจะเปิดตรวจสอบก่อนอนุมัติ
              </p>
            </>
          )}

          {isTravelTimeOverOneHour === false && needsTwoShiftQuestion && (
            <>
              <label>{department === "AM" ? "ทีม AM 2 คนทำงานคนละกะกันหรือไม่" : "ทีม TN ทำงานคนละกะกันหรือไม่"}</label>
              <YesNo value={isAmTnTwoShift} onChange={setIsAmTnTwoShift} />
            </>
          )}

          {isTravelTimeOverOneHour === false && needsTwoBranchQuestion && isAmTnTwoShift === false && (
            <>
              <label>เปิด 2 สาขาพร้อมกันหรือไม่?</label>
              <YesNo value={isAmTwoBranchesSimultaneous} onChange={setIsAmTwoBranchesSimultaneous} />
            </>
          )}

          {isTravelTimeOverOneHour === false &&
            (!needsTwoShiftQuestion || isAmTnTwoShift === false) &&
            (!needsTwoBranchQuestion || isAmTwoBranchesSimultaneous === false) && (
              <>
                <label>มีเหตุผลอื่นที่จำเป็นไหม?</label>
                <YesNo value={hasOtherReason} onChange={setHasOtherReason} />
                {hasOtherReason && (
                  <>
                    <label>ระบุเหตุผล</label>
                    <textarea value={otherReasonText} onChange={(e) => setOtherReasonText(e.target.value)} />
                  </>
                )}
              </>
            )}

          {!noReasonGivenYet && eligibility && !eligibility.eligible && (
            <p className="badge RED" style={{ marginTop: 12 }}>
              ไม่เข้าเกณฑ์การจองที่พัก - ไม่สามารถส่งคำขอได้
            </p>
          )}
        </div>
      )}

      {canProceedToHotel && (
        <div className="card">
          <h3>ตัวเลือกโรงแรมที่ CJX เคยใช้งาน</h3>
          <p className="field-hint">
            ราคาที่พนักงานจองได้โดยไม่ต้องจ่ายส่วนต่างเพิ่มคือ {checkResult?.destinationBranch.budgetPerNight ?? "?"}{" "}
            บาท/คืน (ไม่รวม Vat)
          </p>
          {hotels.length === 0 && <p className="field-hint">ไม่มีโรงแรมใน Master List สำหรับสาขานี้</p>}
          {sortedHotels.map((h) => (
            <label
              key={h.id}
              className={`option-row${!useOtherHotel && selectedHotelId === h.id ? " selected" : ""}`}
            >
              <input
                type="radio"
                checked={!useOtherHotel && selectedHotelId === h.id}
                onChange={() => {
                  setUseOtherHotel(false);
                  setSelectedHotelId(h.id);
                  if (h.pricePerNight) setPricePerNight(String(h.pricePerNight));
                }}
              />
              <span>
                <span style={{ fontWeight: 700 }}>
                  {h.name} · ระยะห่างจากสาขา {h.distanceKm ?? "?"} กม. · {h.pricePerNight ?? "?"} บาท/คืน (ราคาไม่รวม Vat)
                </span>
                {h.note && (
                  <>
                    <br />
                    <span style={{ fontWeight: 300, color: "var(--muted)", fontSize: 13 }}>หมายเหตุ : {h.note}</span>
                  </>
                )}
              </span>
            </label>
          ))}
          <label className={`option-row${useOtherHotel ? " selected" : ""}`}>
            <input type="radio" checked={useOtherHotel} onChange={() => setUseOtherHotel(true)} />
            <span>โรงแรมอื่นที่ไม่อยู่ใน Master List</span>
          </label>
          {useOtherHotel && (
            <input
              placeholder="ชื่อโรงแรม"
              value={otherHotelName}
              onChange={(e) => setOtherHotelName(e.target.value)}
            />
          )}
        </div>
      )}

      {canProceedToHotel && (
        <div className="card">
          <h3>จองที่พักจริงใน Choowap</h3>
          <p>นำชื่อโรงแรมด้านล่างไปค้นหาในเว็บ Choowap</p>
          {(() => {
            const hotelName = useOtherHotel ? otherHotelName : hotels.find((h) => h.id === selectedHotelId)?.name;
            if (!hotelName) return null;
            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "var(--yellow-bg)",
                  border: "1px solid var(--yellow)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 14,
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 700, flex: 1 }}>{hotelName}</span>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(hotelName);
                      setHotelNameCopied(true);
                      setTimeout(() => setHotelNameCopied(false), 1500);
                    } catch {
                      setHotelNameCopied(false);
                    }
                  }}
                >
                  {hotelNameCopied ? "คัดลอกแล้ว" : "คัดลอกชื่อโรงแรม"}
                </button>
              </div>
            );
          })()}
          <a href="https://corp.choowap.com/cjmart" target="_blank" rel="noreferrer" className="btn secondary">
            เปิดเว็บ Choowap เพื่อจอง
          </a>
          <p className="field-hint" style={{ marginTop: 10 }}>
            ตัวอย่าง: ก็อปปี้ชื่อโรงแรมมาใส่ในช่องค้นหา แล้วกด &quot;ค้นหา&quot;
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/choowap-search-guide.jpg"
            alt="ตัวอย่างการค้นหาโรงแรมในเว็บ Choowap"
            style={{ maxWidth: "100%", borderRadius: 8, marginTop: 6 }}
          />
          <p style={{ marginTop: 12 }}>
            <a href="/choowap-booking-guide.pdf" target="_blank" rel="noreferrer">
              วิธีการจองที่พักผ่าน Choowap ดูได้ที่นี่
            </a>
          </p>
        </div>
      )}

      {canProceedToHotel && (
        <div className="card">
          <h3>ข้อมูลการจองใน Choowap</h3>
          <label>วันที่-เวลาที่จองใน Choowap</label>
          <ThaiDateTimeSelect value={choowapBookedAt} onChange={setChoowapBookedAt} />
          <p className="field-hint">ดูจากคอลัมน์ &quot;วันที่จอง&quot; ในหน้ารายการจองของ Choowap</p>
          <img
            src="/choowap-booking-guide.jpg"
            alt="ตัวอย่างคอลัมน์วันที่จองในหน้ารายการจองของ Choowap"
            style={{ maxWidth: "100%", borderRadius: 8, marginTop: 6, marginBottom: 16 }}
          />

          <label>ราคา/คืน (บาท)</label>
          <input type="number" value={pricePerNight} onChange={(e) => setPricePerNight(e.target.value)} />

          <label>วันที่เข้าพัก</label>
          <ThaiDateSelect value={checkInDate} onChange={setCheckInDate} />

          <label>วันที่ออก</label>
          <ThaiDateSelect value={checkOutDate} onChange={setCheckOutDate} />

          <label>จำนวนผู้เข้าพัก</label>
          <input
            type="number"
            min={1}
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
          />
          {Number(guestCount) === 1 && (
            <>
              <label>เหตุผลที่พักคนเดียว</label>
              <input value={soloGuestReason} onChange={(e) => setSoloGuestReason(e.target.value)} />
            </>
          )}

          <label>จำนวนห้องที่จอง</label>
          <input
            type="number"
            min={1}
            value={roomCount}
            onChange={(e) => setRoomCount(e.target.value)}
          />

          {priceDiff > 0 && (
            <>
              <p className="badge YELLOW" style={{ marginTop: 12 }}>
                ราคาเกินงบ {priceDiff} บาท/คืน (งบ {checkResult?.destinationBranch.budgetPerNight} บาท)
              </p>
              <label>ยินดีจ่ายส่วนต่างหรือไม่?</label>
              <YesNo value={guestWillingToPayDiff} onChange={setGuestWillingToPayDiff} />
            </>
          )}
        </div>
      )}

      {error && <p style={{ color: "var(--red)" }}>{error}</p>}

      {canProceedToHotel && (
        <button className="btn" disabled={!canSubmit || submitting} onClick={submit}>
          {submitting ? "กำลังส่ง..." : "ส่งคำขอ"}
        </button>
      )}
    </div>
  );
}

function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
      <button
        type="button"
        className={value === true ? "btn" : "btn secondary"}
        onClick={() => onChange(true)}
      >
        ใช่
      </button>
      <button
        type="button"
        className={value === false ? "btn" : "btn secondary"}
        onClick={() => onChange(false)}
      >
        ไม่
      </button>
    </div>
  );
}
