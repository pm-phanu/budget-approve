"use client";

import { UserAffiliation } from "@/components/user-affiliation";
import { BudgetCard, SharedBudgetNote } from "@/components/budget-card";
import {
  ClockThree,
  CheckCircle1,
} from "@tailgrids/icons";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import MyRequestsCard from "@/components/my-requests-card";
import NotificationsCard from "@/components/notifications-card";
import { getCurrentUser } from "@/utils/login";
import type { Credential } from "@/data/credential";
import { loadRequests, type SavedRequest } from "@/data/request";
import { getDepartmentBudget, getSharedBudget, type Project } from "@/data/budget";
import { loadOrganization } from "@/data/organization";
import { bkkYear } from "@/utils/date";
import { money } from "@/utils/format";

/* ------------------------------------------------------------------
   ตั้งค่า
------------------------------------------------------------------- */
const MY_REQUEST_PATH = "/my-request"; // ปุ่ม "ดูทั้งหมด"

/* ------------------------------------------------------------------
   ฟังก์ชันช่วย
------------------------------------------------------------------- */


export default function Home() {
  const [me, setMe] = useState<Credential | null>(null);
  const [requests, setRequests] = useState<SavedRequest[]>([]);
  // ปีปัจจุบัน: ตั้งค่าใน useEffect (เลี่ยง new Date() ตอน prerender)
  const [year, setYear] = useState<number | null>(null);

  // localStorage อ่านได้เฉพาะฝั่ง browser จึงต้องโหลดใน useEffect
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- อ่านได้หลังเปิดหน้าเท่านั้น */
    setMe(getCurrentUser());
    try {
      setRequests(loadRequests());
    } catch {
      setRequests([]);
    }
    setYear(bkkYear());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // คำขอของฉัน (ผู้ขอ = คนที่ login)
  const mine = me
    ? requests.filter((r) => r.requester && String(r.requester.id) === String(me.id))
    : [];

  // การ์ด: กำลังดำเนินการ / อนุมัติแล้วปีนี้
  const inProgress = mine.filter((r) => r.status === "รออนุมัติ").length;
  const approvedThisYear = mine
    .filter(
      (r) =>
        (r.status === "อนุมัติแล้ว" || r.status === "จ่ายแล้ว") &&
        year !== null &&
        // ปีที่อนุมัติ = ตอนบัญชีกดผ่าน · ข้อมูลเก่าที่ไม่มีเวลาขั้นบัญชี ใช้วันสร้างแทน
        bkkYear(r.approvalSteps.find((s) => s.role === "ACCOUNTANT" && s.status === "อนุมัติ")?.at ?? r.createdAt) === year,
    )
    .reduce((sum, r) => sum + r.total, 0);

  // การ์ด: งบแผนกคงเหลือ
  // งบของแผนกผู้ใช้ (data/budget.ts) · คำนวณหลังรู้ว่าใคร login (me) เท่านั้น
  // เพราะ getDepartmentBudget อ่าน localStorage ซึ่งไม่มีตอน render ฝั่งเซิร์ฟเวอร์
  const budget = me
    ? getDepartmentBudget(me.departmentId, requests, year ?? undefined)
    : { limit: 0, used: 0, remaining: 0 };
  // งบร่วมที่แผนกอื่นแชร์มา (แสดงแยก ไม่รวมในวงเงินแผนก)
  const shared = me
    ? getSharedBudget(me.departmentId, requests, loadOrganization(), year ?? undefined)
    : { remaining: 0, projects: [] as Project[] };

  return (
    <div>
      <div>
        <header className="mb-9">
          <h1 className="text-[32px] font-bold text-[#0F172A]">
            สวัสดี {me ? me.fullName : "-"}
          </h1>
          <UserAffiliation user={me} />
        </header>

        {/* <main> มีอยู่แล้วใน layout → ตรงนี้ใช้ div */}
        <div className="flex flex-col gap-9">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {/* การ์ดหลักของหน้า: งบแผนกคงเหลือ */}
            <BudgetCard
              className="md:col-span-2"
              limit={budget.limit}
              used={budget.used}
              year={year}
              note={<SharedBudgetNote projects={shared.projects} org={loadOrganization()} />}
            />

            {/* ตัวเลขสรุป: ตัวเลขเด่น ป้ายเล็ก */}
            <StatCard
              icon={<ClockThree size={20} aria-hidden="true" />}
              tone="amber"
              label="กำลังดำเนินการ"
              value={`${inProgress} รายการ`}
              href={MY_REQUEST_PATH}
            />
            <StatCard
              icon={<CheckCircle1 size={20} aria-hidden="true" />}
              tone="emerald"
              label="อนุมัติแล้วปีนี้"
              value={`฿${money(approvedThisYear)}`}
            />
          </div>

          {/* คำขอของฉัน 2 คอลัมน์ / แจ้งเตือนล่าสุด 2 คอลัมน์ */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
            <MyRequestsCard mine={mine} className="xl:col-span-2" />

            {/* แจ้งเตือนล่าสุด (การ์ดตัวกลาง components/notifications-card.tsx) · employee วางข้างคำขอของฉัน */}
            <NotificationsCard me={me} className="xl:col-span-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

// การ์ดตัวเลขสรุป: ป้ายเล็กด้านบน ตัวเลขใหญ่ด้านล่าง · มี href = กดไปดูรายการได้
function StatCard({
  icon,
  tone,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  tone: "amber" | "emerald";
  label: string;
  value: string;
  href?: string;
}) {
  const toneCls = tone === "amber" ? "bg-[#FEF3C7] text-[#B45309]" : "bg-[#D1FAE5] text-[#047857]";
  const body = (
    <>
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneCls}`}>{icon}</span>
      <p className="mt-4 text-sm text-[#64748B]">{label}</p>
      <p className="money mt-0.5 text-3xl font-bold text-[#0F172A]">{value}</p>
    </>
  );
  const cls = "flex flex-col rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl";
  return href ? (
    <NextLink href={href} className={`${cls} hover:border-[#A7F3D0]`}>
      {body}
    </NextLink>
  ) : (
    <div className={cls}>{body}</div>
  );
}
