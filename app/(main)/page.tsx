"use client";

import {
  Wallet2,
  ClockThree,
  CheckCircle1,
} from "@tailgrids/icons";
import NextLink from "next/link";
import { KIND_STYLE, formatTime, getNotificationHref, useNotifications } from "@/components/notification-bell";
import { markAsRead } from "@/data/notification";
import { useEffect, useState } from "react";
import MyRequestsCard from "@/components/my-requests-card";
import { getCurrentUser } from "@/utils/login";
import type { Credential } from "@/data/credential";
import { loadRequests, type SavedRequest } from "@/data/request";
import { getDepartmentBudget, getSharedBudget } from "@/data/budget";
import { loadOrganization } from "@/data/organization";
import { bkkYear } from "@/utils/date";

/* ------------------------------------------------------------------
   ตั้งค่า
------------------------------------------------------------------- */
const MY_REQUEST_PATH = "/my-request"; // ปุ่ม "ดูทั้งหมด"

/* ------------------------------------------------------------------
   ฟังก์ชันช่วย
------------------------------------------------------------------- */
const money = (n: number) => n.toLocaleString("en-US");


export default function Home() {
  const [me, setMe] = useState<Credential | null>(null);
  const [requests, setRequests] = useState<SavedRequest[]>([]);
  // ปีปัจจุบัน: ตั้งค่าใน useEffect (เลี่ยง new Date() ตอน prerender)
  const [year, setYear] = useState<number | null>(null);
  const [now, setNow] = useState(0); // เวลาตอนเปิดหน้า สำหรับ "x นาทีที่แล้ว"
  const notifications = useNotifications(me?.id ?? "");

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
    setNow(Date.now());
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
        bkkYear(r.createdAt) === year,
    )
    .reduce((sum, r) => sum + r.total, 0);

  // การ์ด: งบแผนกคงเหลือ
  // งบของแผนกผู้ใช้ (data/budget.ts) · คำนวณหลังรู้ว่าใคร login (me) เท่านั้น
  // เพราะ getDepartmentBudget อ่าน localStorage ซึ่งไม่มีตอน render ฝั่งเซิร์ฟเวอร์
  const budget = me
    ? getDepartmentBudget(me.departmentId, requests, year ?? undefined)
    : { limit: 0, used: 0, remaining: 0 };
  const remaining = budget.remaining;
  // งบร่วมที่แผนกอื่นแชร์มา (แสดงแยก ไม่รวมในวงเงินแผนก)
  const shared = me
    ? getSharedBudget(me.departmentId, requests, loadOrganization(), year ?? undefined)
    : { remaining: 0, projects: [] };
  const usedPct = budget.limit > 0 ? Math.round((budget.used / budget.limit) * 100) : 0;

  return (
    <div>
      <div>
        <header className="mb-9">
          <h1 className="text-[32px] font-bold text-[#0F172A]">
            สวัสดี {me ? me.fullName : "-"}
          </h1>
        </header>

        {/* <main> มีอยู่แล้วใน layout → ตรงนี้ใช้ div */}
        <div className="flex flex-col gap-9">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {/* การ์ดหลักของหน้า: งบแผนกคงเหลือ */}
            <section
              aria-labelledby="budget-title"
              className="rounded-xl bg-[linear-gradient(160deg,#0F172A_0%,#0F172A_55%,#0C3136_70%,#047857_100%)] p-6 text-white shadow-2xl md:col-span-2"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 id="budget-title" className="flex items-center gap-2 text-lg font-semibold">
                  <Wallet2 size={24} className="text-[#34D399]" aria-hidden="true" />
                  งบแผนกคงเหลือ
                </h2>
                <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-sm">
                  ปี {year !== null ? year + 543 : "-"}
                </span>
              </div>
              <p className="money mt-2 text-[clamp(2.5rem,4.5vw,4rem)] font-bold leading-tight">
                ฿{money(remaining)}
              </p>
              <div className="mt-3 flex items-center justify-between text-sm text-[#CBD5E1]">
                <span>
                  จากงบทั้งปี <span className="money">฿{money(budget.limit)}</span>
                </span>
                <span>ใช้ไปแล้ว {usedPct}%</span>
              </div>
              {shared.projects.length > 0 && (
                <p className="mt-1 text-sm text-[#A7F3D0]">
                  + งบร่วมจากแผนกอื่น <span className="money">฿{money(shared.remaining)}</span> ({shared.projects.length} โครงการ)
                </p>
              )}
              {/* หลอด: ความยาวสีเขียว = % ที่ใช้ไปแล้ว */}
              <div
                className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15"
                role="img"
                aria-label={`ใช้งบไปแล้ว ${usedPct}%`}
              >
                <div
                  className={`h-full rounded-full ${usedPct > 90 ? "bg-[#FB7185]" : "bg-[#34D399]"}`}
                  style={{ width: `${Math.min(usedPct, 100)}%` }}
                />
              </div>
            </section>

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

            {/* แจ้งเตือนล่าสุด 4 รายการ (ทั้งหมดดูที่กระดิ่งบน header) */}
            <div className="flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl xl:col-span-2">
              <div>
                <h2 className="mb-2 text-base font-bold text-[#0F172A]">แจ้งเตือนล่าสุด</h2>

                {notifications.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#94A3B8]">ยังไม่มีการแจ้งเตือน</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {notifications.slice(0, 4).map((n) => {
                      const { bg, Icon } = KIND_STYLE[n.kind] ?? KIND_STYLE.progress;
                      return (
                        <li key={n.id}>
                          <NextLink
                            href={me ? getNotificationHref(n, me.role) : "#"}
                            onClick={() => !n.read && markAsRead(n.id)}
                            className="flex items-start gap-3 py-4 hover:bg-[#F8FAFC]"
                          >
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                              <Icon size={18} aria-hidden={true} />
                            </span>
                            <div className="text-sm text-[#334155]">
                              <p>
                                <strong className="text-[#0F172A]">{n.requestTitle}</strong> {n.message}
                              </p>
                              <p className="mt-0.5 text-xs text-[#64748B]">{formatTime(n.createdAt, now)}</p>
                            </div>
                          </NextLink>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-xs text-[#64748B]">
                <span>✓</span>
                <span>ระบบจะแจ้งเตือนทุกครั้งที่สถานะคำขอเปลี่ยน</span>
              </div>
            </div>
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
