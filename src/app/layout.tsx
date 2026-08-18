import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { AuthProvider } from "@/lib/useAuth";
import { MeProvider } from "@/lib/useMe";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "จองที่พัก - สาขาใกล้บ้าน",
  description: "ระบบขออนุมัติที่พักสำหรับพนักงานที่ไปทำงานสาขาไกล",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={notoSansThai.variable}>
      <body>
        <AuthProvider>
          <MeProvider>{children}</MeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
