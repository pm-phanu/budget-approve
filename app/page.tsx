"use client";

import { Link } from "@/components/tailgrids/core/link";
import { DashboardSquare1, FileText, Gear1, Plus } from "@tailgrids/icons";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHistory } from "@fortawesome/free-solid-svg-icons/faHistory";
import { faArrowRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/tailgrids/core/button";

export default function Home() {
  return (
    <aside className="w-65 bg-[#0F172A] text-white h-screen p-9">
      {/* container */}
      <div className="flex gap-1 mb-10">
        {/* icon */}
        <div className="border-[#059669] border-2 rounded-md"></div>
        {/* title */}
        <h1 className="font-bold text-2xl">BudgetFlow</h1>
      </div>

      <nav className="">
        {/* nav title */}
        <div className="text-[#64748B] font-semibold mb-4">เมนูหลัก</div>
        <div className="flex flex-col gap-4">
          <ul>
            <Link
              href="/"
              className="bg-[#059669] rounded-md w-full text-white p-3.5 text-[16px] font-semibold"
            >
              <DashboardSquare1 />
              แดชบอร์ด
            </Link>
          </ul>
          <ul>
            <Link
              href="/"
              className="w-full text-white p-3.5 text-[16px] font-semibold"
            >
              <Plus />
              สร้างคำขอ
            </Link>
          </ul>
          <ul>
            <Link
              href="/"
              className="w-full text-white p-3.5 text-[16px] font-semibold"
            >
              <FileText />
              คำขอของฉัน
            </Link>
          </ul>
          <ul>
            <Link
              href="/"
              className="w-full text-white p-3.5 text-[16px] font-semibold"
            >
              <FontAwesomeIcon icon={faHistory} />
              ประวัติการเบิก
            </Link>
          </ul>
        </div>

        <div className="text-[#64748B] font-semibold mb-4">บัญชี</div>
        <div className="flex flex-col gap-4">
          <ul>
            <Link
              href="/"
              className="w-full text-white p-3.5 text-[16px] font-semibold"
            >
              <Gear1 />
              ตั้งค่า
            </Link>
          </ul>
          <ul>
            <Link
              href="/"
              className="w-full text-white p-3.5 text-[16px] font-semibold"
            >
              <FontAwesomeIcon icon={faArrowRightFromBracket} />
              ออจากระบบ
            </Link>
          </ul>
        </div>
      </nav>

      {/* user profile */}
      <div>
        {/* container */}
        <div>
          <Link href="/" className="bg-white/7 text-white w-full p-2 rounded-xl border border-white/17">
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
                <h1 className="text-[14px] font-bold">ขื่อผู้ใช้</h1>
                <p className="text-[12px]">พนักงาน : การตลาด</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
}
