"use client";

import { Link } from "@/components/tailgrids/core/link";
import {
  DashboardSquare1,
  FileText,
  Gear1,
  MenuHamburger1,
  Plus,
  Xmark,
} from "@tailgrids/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHistory } from "@fortawesome/free-solid-svg-icons/faHistory";
import { faArrowRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <html lang="th">
      <body className="flex min-h-screen bg-gray-100 text-gray-800">
        {!isAuthPage && (
          <aside className="flex flex-col bg-[#0F172A] text-white h-screen fixed overflow-hidden transition-all duration-300">
            <div className="flex min-h-12 gap-1 mb-10">
              <div className="border-[#059669] border-2 rounded-md"></div>
              <div className="flex items-center gap-6">
                <h1 className="font-bold text-2xl whitespace-nowrap">
                  BudgetFlow
                </h1>
                <button type="button">
                  <MenuHamburger1 />
                </button>
              </div>
            </div>

            <nav className="mb-10">
              <div className="text-[#64748B] font-semibold mb-4">เมนูหลัก</div>

              <div className="flex flex-col gap-4">
                <ul>
                  <Link
                    href="/"
                    title="แดชบอร์ด"
                    className="bg-[#059669] rounded-xl w-full text-white p-3.5 text-[16px] font-semibold flex items-center gap-3 "
                  >
                    <DashboardSquare1 />
                    <span>แดชบอร์ด</span>
                  </Link>
                </ul>
                <ul>
                  <Link
                    href="/"
                    title="สร้างคำขอ"
                    className="w-full text-white py-3 text-[16px] font-semibold flex items-center gap-3"
                  >
                    <Plus />
                    <span>สร้างคำขอ</span>
                  </Link>
                </ul>
                <ul>
                  <Link
                    href="/"
                    title="คำขอของฉัน"
                    className="w-full text-white py-3 text-[16px] font-semibold flex items-center gap-3"
                  >
                    <FileText />
                    <span>คำขอของฉัน</span>
                  </Link>
                </ul>
                <ul>
                  <Link
                    href="/"
                    title="ประวัติการเบิก"
                    className="w-full text-white py-3 text-[16px] font-semibold flex items-center gap-3"
                  >
                    <FontAwesomeIcon icon={faHistory} />
                    <span>ประวัติการเบิก</span>
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
                    title="ตั้งค่า"
                    className="w-full text-white py-3 text-[16px] font-semibold flex items-center gap-3"
                  >
                    <Gear1 />
                    <span>ตั้งค่า</span>
                  </Link>
                </ul>
                <ul>
                  <button
                    type="button"
                    title="ออกจากระบบ"
                    className="w-full cursor-pointer text-left text-white py-3 text-[16px] font-semibold flex items-center gap-3"
                  >
                    <FontAwesomeIcon icon={faArrowRightFromBracket} />
                    <span>ออกจากระบบ</span>
                  </button>
                </ul>
              </div>
            </nav>

            <div className="mt-auto">
              <div>
                <Link
                  href="/"
                  className="bg-white/7 text-white w-full rounded-xl border border-white/17 block"
                >
                  <div className="flex items-center gap-2">
                    <div>
                      <img
                        className="rounded-full w-10 h-10 object-cover border border-white"
                        src="https://plus.unsplash.com/premium_photo-1671656349322-41de944d259b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
                        alt="profile"
                      />
                    </div>
                    <div className="text-left whitespace-nowrap">
                      <h1 className="text-[14px] font-bold">ชื่อผู้ใช้</h1>
                      <p className="text-[12px]">พนักงาน : การตลาด</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </aside>
        )}

        <main className={isAuthPage ? "w-full" : ""}>{children}</main>
      </body>
    </html>
  );
}
