"use client";

import { Link } from "@/components/tailgrids/core/link";
import { DashboardSquare1, FileText, Gear1, Plus } from "@tailgrids/icons";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHistory } from "@fortawesome/free-solid-svg-icons/faHistory";
import { faArrowRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { usePathname } from "next/navigation";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // เช็คว่าตอนนี้อยู่หน้า Login หรือ Register หรือไม่
  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <html lang="th">
      <body className="flex min-h-screen bg-gray-100 text-gray-800">
        {/* ถ้าไม่ใช่หน้า Auth (Login/Register) ถึงจะแสดง Sidebar */}
        {!isAuthPage && (
          <aside className="flex flex-col w-65 bg-[#0F172A] text-white h-screen p-9 fixed">
            {/* container */}
            <div className="flex gap-1 mb-10">
              {/* icon */}
              <div className="border-[#059669] border-2 rounded-md"></div>
              {/* title */}
              <h1 className="font-bold text-2xl">BudgetFlow</h1>
            </div>

            <nav className="mb-10">
              {/* nav title */}
              <div className="text-[#64748B] font-semibold mb-4">เมนูหลัก</div>
              <div className="flex flex-col gap-4">
                <ul>
                  <Link
                    href="/"
                    className="bg-[#059669] rounded-xl w-full text-white p-3.5 text-[16px] font-semibold flex items-center gap-3"
                  >
                    <DashboardSquare1 />
                    แดชบอร์ด
                  </Link>
                </ul>
                <ul>
                  <Link
                    href="/"
                    className="w-full text-white py-3 text-[16px] font-semibold flex items-center gap-3"
                  >
                    <Plus />
                    สร้างคำขอ
                  </Link>
                </ul>
                <ul>
                  <Link
                    href="/"
                    className="w-full text-white py-3 text-[16px] font-semibold flex items-center gap-3"
                  >
                    <FileText />
                    คำขอของฉัน
                  </Link>
                </ul>
                <ul>
                  <Link
                    href="/"
                    className="w-full text-white py-3 text-[16px] font-semibold flex items-center gap-3"
                  >
                    <FontAwesomeIcon icon={faHistory} />
                    ประวัติการเบิก
                  </Link>
                </ul>
              </div>
            </nav>

            <nav className="mb-10">
              <div className="text-[#64748B] font-semibold mb-4">บัญชี</div>
              <div className="flex flex-col gap-4">
                <ul>
                  <Link
                    href="/"
                    className="w-full text-white py-3 text-[16px] font-semibold flex items-center gap-3"
                  >
                    <Gear1 />
                    ตั้งค่า
                  </Link>
                </ul>
                <ul>
                  <Link
                    href="/"
                    className="w-full text-white py-3 text-[16px] font-semibold flex items-center gap-3"
                  >
                    <FontAwesomeIcon icon={faArrowRightFromBracket} />
                    ออกจากระบบ
                  </Link>
                </ul>
              </div>
            </nav>

            {/* user profile */}
            <div className="mt-auto">
              {/* container */}
              <div>
                <Link
                  href="/"
                  className="bg-white/7 text-white w-full p-2 rounded-xl border border-white/17 block"
                >
                  <div className="flex items-center gap-2">
                    <div>
                      {/* img user */}
                      <img
                        className="rounded-full w-10 h-10 object-cover border border-white"
                        src="https://plus.unsplash.com/premium_photo-1671656349322-41de944d259b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
                        alt="profile"
                      />
                    </div>
                    <div className="text-left">
                      <h1 className="text-[14px] font-bold">ชื่อผู้ใช้</h1>
                      <p className="text-[12px]">พนักงาน : การตลาด</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </aside>
        )}

        {/* พื้นที่แสดงเนื้อหาหลัก: ถ้าเป็นหน้า Login จะแสดงเต็มจอ / ถ้าไม่ใช่จะเว้นซ้าย ml-65 ให้ Sidebar */}
        <main className={`flex-1 p-8 ${!isAuthPage ? "ml-65" : ""}`}>
          {children}
        </main>
      </body>
    </html>
  );
}