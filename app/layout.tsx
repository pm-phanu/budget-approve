"use client";

// todo for pat
// เขียนฟังก์ชั่่นไว้เช็ค current user จาก localstorage

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
import {
  CURRENT_USER_KEY,
  hasCurrentUserSession,
  notifyAuthSessionChange,
  subscribeToAuthSession,
} from "@/utils/auth-session";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const isAuthenticated = useSyncExternalStore(
    subscribeToAuthSession,
    hasCurrentUserSession,
    () => null,
  );

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const canAccessPage = isAuthPage || isAuthenticated === true;

  useEffect(() => {
    if (!isAuthPage && isAuthenticated === false) {
      localStorage.removeItem(CURRENT_USER_KEY);
      router.replace("/login");
    }
  }, [isAuthenticated, isAuthPage, pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    notifyAuthSessionChange();
    router.replace("/login");
  };

  return (
    <html lang="th">
      <body className="flex min-h-screen bg-gray-100 text-gray-800">
        {!isAuthPage && isAuthenticated === true && (
          <aside
            className={`flex flex-col bg-[#0F172A] text-white h-screen fixed overflow-hidden transition-all duration-300 ${
              isOpen ? "w-65 p-9" : "w-20 p-4"
            }`}
          >
            <div
              className={`flex gap-1 mb-10 ${!isOpen ? "justify-center" : ""}`}
            >
              <div className="border-[#059669] border-2 rounded-md"></div>
              <div className="flex items-center gap-6">
                {isOpen && (
                  <h1 className="font-bold text-2xl whitespace-nowrap">
                    BudgetFlow
                  </h1>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  aria-label={isOpen ? "หุบเมนู" : "ขยายเมนู"}
                  aria-expanded={isOpen}
                >
                  {isOpen ? <Xmark /> : <MenuHamburger1 />}
                </button>
              </div>
            </div>

            <nav className="mb-10">
              {isOpen && (
                <div className="text-[#64748B] font-semibold mb-4">
                  เมนูหลัก
                </div>
              )}
              <div className="flex flex-col gap-4">
                <ul>
                  <Link
                    href="/"
                    title="แดชบอร์ด"
                    className={`bg-[#059669] rounded-xl w-full text-white p-3.5 text-[16px] font-semibold flex items-center gap-3 ${
                      !isOpen ? "justify-center" : ""
                    }`}
                  >
                    <DashboardSquare1 />
                    {isOpen && <span>แดชบอร์ด</span>}
                  </Link>
                </ul>
                <ul>
                  <Link
                    href="/"
                    title="สร้างคำขอ"
                    className={`w-full text-white py-3 text-[16px] font-semibold flex items-center gap-3 ${
                      !isOpen ? "justify-center" : ""
                    }`}
                  >
                    <Plus />
                    {isOpen && <span>สร้างคำขอ</span>}
                  </Link>
                </ul>
                <ul>
                  <Link
                    href="/"
                    title="คำขอของฉัน"
                    className={`w-full text-white py-3 text-[16px] font-semibold flex items-center gap-3 ${
                      !isOpen ? "justify-center" : ""
                    }`}
                  >
                    <FileText />
                    {isOpen && <span>คำขอของฉัน</span>}
                  </Link>
                </ul>
                <ul>
                  <Link
                    href="/"
                    title="ประวัติการเบิก"
                    className={`w-full text-white py-3 text-[16px] font-semibold flex items-center gap-3 ${
                      !isOpen ? "justify-center" : ""
                    }`}
                  >
                    <FontAwesomeIcon icon={faHistory} />
                    {isOpen && <span>ประวัติการเบิก</span>}
                  </Link>
                </ul>
              </div>
            </nav>

            <nav className="mb-10">
              {isOpen && (
                <div className="text-[#64748B] font-semibold mb-4">บัญชี</div>
              )}
              <div className="flex flex-col gap-4">
                <ul>
                  <Link
                    href="/"
                    title="ตั้งค่า"
                    className={`w-full text-white py-3 text-[16px] font-semibold flex items-center gap-3 ${
                      !isOpen ? "justify-center" : ""
                    }`}
                  >
                    <Gear1 />
                    {isOpen && <span>ตั้งค่า</span>}
                  </Link>
                </ul>
                <ul>
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="ออกจากระบบ"
                    className={`w-full cursor-pointer text-left text-white py-3 text-[16px] font-semibold flex items-center gap-3 ${
                      !isOpen ? "justify-center" : ""
                    }`}
                  >
                    <FontAwesomeIcon icon={faArrowRightFromBracket} />
                    {isOpen && <span>ออกจากระบบ</span>}
                  </button>
                </ul>
              </div>
            </nav>

            <div className="mt-auto">
              <div>
                <Link
                  href="/"
                  className={`bg-white/7 text-white w-full rounded-xl border border-white/17 block ${
                    isOpen ? "p-2" : "p-1"
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 ${
                      !isOpen ? "justify-center" : ""
                    }`}
                  >
                    <div>
                      <img
                        className="rounded-full w-10 h-10 object-cover border border-white"
                        src="https://plus.unsplash.com/premium_photo-1671656349322-41de944d259b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D"
                        alt="profile"
                      />
                    </div>
                    {isOpen && (
                      <div className="text-left whitespace-nowrap">
                        <h1 className="text-[14px] font-bold">ชื่อผู้ใช้</h1>
                        <p className="text-[12px]">พนักงาน : การตลาด</p>
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            </div>
          </aside>
        )}

        <main
          className={`flex-1 transition-all duration-300 ${
            !isAuthPage ? (isOpen ? "ml-65 p-9" : "ml-20 p-9") : ""
          }`}
        >
          <div
            aria-hidden={!canAccessPage}
            className={canAccessPage ? "" : "invisible"}
            inert={!canAccessPage}
          >
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
