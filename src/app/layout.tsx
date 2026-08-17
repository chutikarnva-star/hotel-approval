import type { Metadata } from "next";
import { AuthProvider } from "@/lib/useAuth";
import { MeProvider } from "@/lib/useMe";
import "./globals.css";

export const metadata: Metadata = {
  title: "จองที่พัก - สาขาใกล้บ้าน",
  description: "ระบบขออนุมัติที่พักสำหรับพนักงานที่ไปทำงานสาขาไกล",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <AuthProvider>
          <MeProvider>{children}</MeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
