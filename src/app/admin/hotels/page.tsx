"use client";

import { useEffect, useState } from "react";
import AdminGate from "@/components/AdminGate";
import CsvImport from "@/components/CsvImport";
import { useAuth } from "@/lib/useAuth";
import { apiFetch } from "@/lib/apiFetch";

interface HotelRow {
  id: string;
  name: string;
  distanceKm: number | null;
  pricePerNight: number | null;
  recommendLevel: number;
  branch: { code: string; name: string };
}

export default function HotelsAdminPage() {
  return (
    <AdminGate>
      <div className="container">
        <HotelsTable />
      </div>
    </AdminGate>
  );
}

function HotelsTable() {
  const { idToken } = useAuth();
  const [hotels, setHotels] = useState<HotelRow[] | null>(null);

  async function load() {
    const res = await apiFetch(idToken, "/api/hotels");
    const data = await res.json();
    setHotels(data.hotels);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idToken]);

  return (
    <div>
      <h1>Master List โรงแรม</h1>
      <CsvImport
        importUrl="/api/hotels/import"
        expectedHeaders="branchCode,name,lat,lng,distanceKm,pricePerNight,note"
        onImported={load}
      />
      <div className="card" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>สาขา</th>
              <th>ชื่อโรงแรม</th>
              <th>ระยะทาง (กม.)</th>
              <th>ราคา/คืน</th>
              <th>ระดับ</th>
            </tr>
          </thead>
          <tbody>
            {hotels?.map((h) => (
              <tr key={h.id}>
                <td>{h.branch.code} - {h.branch.name}</td>
                <td>{h.name}</td>
                <td>{h.distanceKm ?? "-"}</td>
                <td>{h.pricePerNight ?? "-"}</td>
                <td>{h.recommendLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
