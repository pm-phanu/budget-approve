"use client";

import { UserAffiliation } from "@/components/user-affiliation";
import { BudgetCard } from "@/components/budget-card";
import { useEffect, useState } from "react";
import Link from "next/link";
import { REQUESTS_KEY, getActedRequests, loadRequests, type SavedRequest, sentAt, arrivedAt } from "@/data/request";
import { getDepartmentBudget } from "@/data/budget";
import { canApproveStep } from "@/data/approval";
import type { Credential } from "@/data/credential";
import { getCurrentUser } from "@/utils/login";
import MyRequestsCard from "@/components/my-requests-card";
import NotificationsCard from "@/components/notifications-card";
import { ArrowRight, Check, CheckCircle1, ClockThree } from "@tailgrids/icons";
import { bkkYear } from "@/utils/date";
import { baht, timeAgo, waitLabel } from "@/utils/format";

/* ------------------------------------------------------------------
   ชนิดข้อมูล: ใช้ของกลางใน data/ (คำขอ = SavedRequest · ผู้ใช้ = Credential)
------------------------------------------------------------------- */
type ExpenseRequest = SavedRequest;
type CurrentUser = Credential;

const APPROVED_PATH = "/home-director/approve"; // ← path หน้าตรวจสอบ ปรับให้ตรงชื่อโฟลเดอร์ของผอ.
const DIRECTOR_ROLE = "DIRECTOR"; // role ของขั้นผอ.ฝ่ายในเส้นทางอนุมัติ (data/approval.ts)

// แสดงสูงสุดกี่รายการ ทั้ง "รอคุณตรวจสอบ" และ "อนุมัติล่าสุด"
// ความสูงการ์ดเป็น auto ตามจำนวนรายการ (1 รายการ = เตี้ย · มากสุด 5) เริ่มจากบนสุดเสมอ
const LIST_LIMIT = 5;

// ความกว้างคอลัมน์ของแถวรายการ ใช้ร่วมกันทั้ง "รอคุณตรวจสอบ" และ "อนุมัติล่าสุด"
// (ชื่อ | ป้ายรอ | ยอดเงิน | ปุ่ม/สถานะ)
const ROW_GRID =
  "grid h-[93px] grid-cols-[260px_90px_110px_1fr] items-center gap-3";

/* ------------------------------------------------------------------
   อ่านข้อมูลจาก localStorage (ผ่านฟังก์ชันกลางใน data/ และ utils/login)
------------------------------------------------------------------- */
// ข้ามข้อมูลรูปแบบเก่าที่ไม่มีเส้นทางอนุมัติ

// งบของแผนก/ฝ่ายตัวเองปีนี้ (data/budget.ts)
function readBudget(user: CurrentUser | null) {
  const { limit, used } = getDepartmentBudget(
    user?.departmentId,
    loadRequests(),
    bkkYear(),
  );
  return { limit, used };
}

/* ------------------------------------------------------------------
   ฟังก์ชันช่วย
------------------------------------------------------------------- */

// "เมื่อ 2 ชั่วโมงที่แล้ว"

// ป้ายเวลารอ: รอสักครู่ / รอ X นาที / รอ X ชม. / รอ X วัน
// เวลาที่คำขอ "ส่งคำขอ / ส่งใหม่" ครั้งล่าสุด (ถูกตีกลับแล้วส่งใหม่ → เวลานี้เปลี่ยน)
// เวลาที่คำขอ "มาถึงผอ." = เวลาที่ขั้นก่อนหน้า (หัวหน้า) อนุมัติ
// ถ้าส่งใหม่หลังจากนั้น ให้นับจากเวลาส่งใหม่แทน
// ป้ายสถานะของคำขอที่คุณอนุมัติไปแล้ว (บอกว่าตอนนี้ไปถึงขั้นไหน)
function statusBadge(r: ExpenseRequest) {
  if (r.status === "อนุมัติแล้ว")
    return {
      text: "อนุมัติแล้ว",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  if (r.status === "ตีกลับ")
    return {
      text: "ถูกตีกลับ",
      cls: "bg-rose-50 text-rose-600 border-rose-200",
    };
  const next = r.approvalSteps[r.currentStep];
  return {
    text: next ? `รอ${next.label}` : "กำลังดำเนินการ",
    cls: "bg-amber-50 text-amber-600 border-amber-200",
  };
}

/* ------------------------------------------------------------------
   หน้า Home ผอ.ฝ่าย
------------------------------------------------------------------- */
export default function DirectorHome() {
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [budget, setBudget] = useState({ limit: 0, used: 0 });
  // ปีและวันที่ปัจจุบัน: ตั้งค่าใน useEffect เท่านั้น (เลี่ยง new Date() ตอน prerender)
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [today, setToday] = useState("");

  // โหลดใน useEffect เท่านั้น (ฝั่งเซิร์ฟเวอร์ไม่มี localStorage)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- อ่านได้หลังเปิดหน้าเท่านั้น */
    const user = getCurrentUser();
    setRequests(loadRequests());
    setMe(user);
    setBudget(readBudget(user));
    setCurrentYear(bkkYear());
    setToday(
      new Date().toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    );
    /* eslint-enable react-hooks/set-state-in-effect */

    // อัปเดตอัตโนมัติถ้าแท็บอื่นแก้ข้อมูล
    const onStorage = (e: StorageEvent) => {
      if (e.key === REQUESTS_KEY) {
        setRequests(loadRequests());
        setBudget(readBudget(getCurrentUser()));
      }
      if (e.key === "current_user") {
        const u = getCurrentUser();
        setMe(u);
        setBudget(readBudget(u));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // รอคุณตรวจสอบ: คำขอที่ "ถึงคิวผอ.ฝ่ายของคุณ"
  // - ขั้นปัจจุบันต้องเป็นขั้น DIRECTOR (เส้นทางที่มีขั้นผอ. คือยอดช่วง 30,001 ขึ้นไป)
  // - หัวหน้าต้องอนุมัติมาก่อนแล้ว (ขั้นปัจจุบันขยับมาถึงผอ.) และผู้อนุมัติต้องเป็นคุณ (canApproveStep)
  // รอนานสุดขึ้นก่อน (นับจากเวลาที่หัวหน้าอนุมัติ)
  const pending = requests
    .filter(
      (r) =>
        r.approvalSteps[r.currentStep]?.role === DIRECTOR_ROLE &&
        canApproveStep(r, me),
    )
    .sort(
      (a, b) =>
        new Date(arrivedAt(a)).getTime() - new Date(arrivedAt(b)).getTime(),
    );

  // คำขอที่คุณ (ในฐานะผอ.) อนุมัติไปแล้ว ล่าสุดอยู่บนสุด พร้อมเวลาที่คุณอนุมัติ
  // ※ ดูเฉพาะขั้น DIRECTOR ที่คุณกดเอง ไม่ใช่ขั้นของหัวหน้า/บัญชี
  const mine = !me
    ? []
    : getActedRequests(requests, me).flatMap(({ request, step }) =>
        step.role === DIRECTOR_ROLE && step.status === "อนุมัติ" && step.at
          ? [{ r: request, at: step.at }]
          : [],
      );

  // อนุมัติล่าสุด: แสดงสูงสุด 5 รายการ
  const recentApproved = mine.slice(0, LIST_LIMIT);

  // อนุมัติแล้วปีนี้: รวมยอดของคำขอที่คุณอนุมัติในปีปัจจุบัน
  const approvedTotal = mine
    .filter(
      (m) =>
        currentYear === null || bkkYear(m.at) === currentYear,
    )
    .reduce((sum, m) => sum + Number(m.r.total || 0), 0);


  // คำขอที่ผอ.เป็นผู้ขอเอง → การ์ด "คำขอของฉัน"
  const myRequests = me
    ? requests.filter((r) => r.requester && String(r.requester.id) === String(me.id))
    : [];

  return (
    <div>
      <div>
        <header className="mb-9 flex justify-between gap-4 relative">
          <div>
            <h1 className="text-[32px] font-bold text-[#111]">
              สวัสดี {me ? me.fullName : "-"}
            </h1>
            <UserAffiliation user={me} />
            <p className="text-sm text-gray-500 mt-3">
              {today} · คำขอรอคุณอนุมัติ{" "}
              <span className="font-semibold text-[#047857]">
                {pending.length} รายการ
              </span>
            </p>
          </div>
        </header>

        {/* แต่ละส่วนห่างกัน 36px เหมือนหน้าหัวหน้าแผนก */}
        <div className="flex flex-col gap-9">
          {/* card1 */}
          <div className="grid grid-cols-4 gap-5">
            {/* งบประมาณคงเหลือ */}
            <BudgetCard className="col-span-2" label="งบประมาณคงเหลือ" limit={budget.limit} used={budget.used} year={currentYear} />

            {/* card2: กำลังดำเนินการ */}
            <div className="bg-white relative flex justify-between p-6 flex-col rounded-xl border border-[#E2E8F0] shadow-2xl">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <ClockThree />
              </div>
              <div>
                <div className="text-xs font-medium text-gray-400">
                  กำลังดำเนินการ
                </div>
                <div className="text-3xl font-bold mt-1 text-gray-800">
                  {pending.length}{" "}
                  <span className="text-base font-normal text-gray-500">
                    รายการ
                  </span>
                </div>
              </div>
            </div>

            {/* card3: อนุมัติแล้วปีนี้ (รวมยอดที่คุณอนุมัติ) */}
            <div className="bg-white relative flex justify-between p-6 flex-col rounded-xl border border-[#E2E8F0] shadow-2xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Check />
              </div>
              <div>
                <div className="text-xs font-medium text-gray-400">
                  อนุมัติแล้วปีนี้
                </div>
                <div className="text-3xl font-bold mt-1 text-gray-800">
                  {baht(approvedTotal)}
                </div>
              </div>
            </div>
          </div>

          {/* รอคุณตรวจสอบ + คำขอของฉัน */}
          <div className="grid grid-cols-4 gap-5">
            {/* ✅ แก้: กลับมาเป็นคอลัมน์ซ้าย (col-span-2 + self-start) เหมือนหน้าหัวหน้าแผนก */}
            <div className="bg-white relative flex self-start p-6 flex-col col-span-2 rounded-xl border border-[#E2E8F0] shadow-2xl">
              <div className="items-center flex justify-between mb-1">
                <div>
                  <span className="font-bold text-md">รอคุณตรวจสอบ</span>
                  <span className="bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-full border border-amber-200 ml-2">
                    {pending.length}
                  </span>
                </div>
                <div>
                  <Link
                    href="/all-request"
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    ดูทั้งหมด →
                  </Link>
                </div>
              </div>

              {/* รายการรอตรวจสอบ: สูงตามจำนวนรายการ มากสุด LIST_LIMIT */}
              <div>
                {pending.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-gray-400">
                    <CheckCircle1 />
                    <span className="text-sm">ไม่มีคำขอ</span>
                  </div>
                ) : (
                  pending.slice(0, LIST_LIMIT).map((r) => {
                    const name = r.requester?.fullName ?? "-";
                    const arrived = arrivedAt(r);
                    const before = r.approvalSteps[r.currentStep - 1]; // ขั้นก่อนหน้า (หัวหน้า)
                    const resent = sentAt(r) !== r.createdAt; // เคยถูกตีกลับแล้วส่งใหม่
                    return (
                      <div key={r.id} className={ROW_GRID}>
                        {/* คอลัมน์ 1: ผู้ขอ + ชื่อคำขอ + ใครอนุมัติมาก่อน */}
                        <div className="flex min-w-0 items-center">
                          <div className="w-10 h-10 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-green-700 font-bold">
                            {name.slice(0, 2)}
                          </div>
                          <div className="flex min-w-0 flex-col ml-3">
                            <div className="truncate font-bold">{r.title}</div>
                            <div className="truncate text-xs text-gray-400">
                              {name} ·{" "}
                              {before
                                ? `${before.label}อนุมัติ${timeAgo(arrived)}`
                                : `${resent ? "ส่งใหม่" : "ส่ง"}${timeAgo(arrived)}`}
                            </div>
                          </div>
                        </div>

                        {/* คอลัมน์ 2: เวลารอ (นับจากที่หัวหน้าอนุมัติ / ส่งใหม่) */}
                        <div className="flex justify-center">
                          <span className="whitespace-nowrap bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-full border border-amber-200">
                            {waitLabel(arrived)}
                          </span>
                        </div>

                        {/* คอลัมน์ 3: ยอดเงิน (ชิดขวา) */}
                        <div className="text-right">
                          <span className="font-bold tabular-nums">
                            {baht(r.total)}
                          </span>
                        </div>

                        {/* คอลัมน์ 4: ปุ่มตรวจสอบ */}
                        <div className="flex justify-end">
                          <Link
                            href={`${APPROVED_PATH}?id=${encodeURIComponent(r.id)}`}
                            className="text-green-700 font-bold flex text-xs items-center gap-1 hover:underline"
                          >
                            ตรวจสอบ <ArrowRight size={15} />
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* report */}
              <div className="mt-4 bg-gray-50 border border-gray-200/60 rounded-xl p-3.5 flex items-center gap-2 text-xs text-gray-500">
                <div className="w-5 h-5 rounded-xl flex items-center justify-center">
                  <CheckCircle1 />
                </div>
                <span>คำขอที่รอเกิน 3 วันระบบจะแจ้งเตือนคุณอีกครั้ง</span>
              </div>

              {/* อนุมัติล่าสุด */}
              <div className="mt-5">
                <div className="items-center flex justify-between mb-1">
                  <div>
                    <span className="font-bold text-md">อนุมัติล่าสุด</span>
                    <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full border border-emerald-200 ml-2">
                      {mine.length}
                    </span>
                  </div>
                  <div>
                    <button className="text-green-700 font-bold flex text-xs items-center gap-1">
                      ดูประวัติ <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* อนุมัติล่าสุด: ล่าสุดอยู่บนสุด / ใช้ grid เดียวกับด้านบน */}
              <div>
                {recentApproved.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-gray-400">
                    <CheckCircle1 />
                    <span className="text-sm">ยังไม่มีรายการที่อนุมัติ</span>
                  </div>
                ) : (
                  recentApproved.map(({ r, at }) => {
                    const name = r.requester?.fullName ?? "-";
                    const badge = statusBadge(r);
                    return (
                      <div key={r.id} className={ROW_GRID}>
                        <div className="flex min-w-0 items-center">
                          <div className="w-10 h-10 shrink-0 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-bold border-amber-200">
                            {name.slice(0, 2)}
                          </div>
                          <div className="flex min-w-0 flex-col ml-3">
                            <div className="truncate font-bold">{r.title}</div>
                            <div className="truncate text-xs text-gray-400">
                              {name} · อนุมัติ{timeAgo(at)}
                            </div>
                          </div>
                        </div>

                        {/* คอลัมน์ 2 เว้นว่างไว้ให้ตรงกับด้านบน */}
                        <div />

                        <div className="text-right">
                          <span className="font-bold tabular-nums">
                            {baht(r.total)}
                          </span>
                        </div>

                        <div className="flex justify-end">
                          <span
                            className={`whitespace-nowrap text-xs px-2.5 py-1 rounded-full border ${badge.cls}`}
                          >
                            {badge.text}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ขวา: แจ้งเตือนล่าสุด แล้วต่อด้วยคำขอของฉัน */}
            <div className="col-span-2 flex flex-col gap-5 self-start">
              <NotificationsCard me={me} />
              <MyRequestsCard mine={myRequests} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}