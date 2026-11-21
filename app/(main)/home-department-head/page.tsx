"use client";

import { UserAffiliation } from "@/components/user-affiliation";
import { BudgetCard } from "@/components/budget-card";
import { useEffect, useState } from "react";
import Link from "next/link";
import { REQUESTS_KEY, getActedRequests, historyType, loadRequests, type SavedRequest, sentAt } from "@/data/request";
import { getDepartmentBudget, getSharedBudget } from "@/data/budget";
import { loadOrganization } from "@/data/organization";
import { canApproveStep } from "@/data/approval";
import type { Credential } from "@/data/credential";
import { getCurrentUser } from "@/utils/login";
import MyRequestsCard from "@/components/my-requests-card";
import NotificationsCard from "@/components/notifications-card";
import {
  ArrowRight,
  Check,
  CheckCircle1,
  ClockThree,
} from "@tailgrids/icons";
import { bkkYear } from "@/utils/date";
import { baht, timeAgo, waitLabel } from "@/utils/format";

/* ------------------------------------------------------------------
   ชนิดข้อมูล: ใช้ของกลางใน data/ (คำขอ = SavedRequest · ผู้ใช้ = Credential)
------------------------------------------------------------------- */
type ExpenseRequest = SavedRequest;
type CurrentUser = Credential;

const APPROVED_PATH = "/home-department-head/approve"; // ← path หน้าตรวจสอบ ต้องตรงกับชื่อโฟลเดอร์

// แสดงสูงสุดกี่รายการ ทั้ง "รอคุณตรวจสอบ" และ "อนุมัติล่าสุด"
// ความสูงการ์ดเป็น auto ตามจำนวนรายการ (1 รายการ = เตี้ย · มากสุด 5) เริ่มจากบนสุดเสมอ
const LIST_LIMIT = 5;

// ความกว้างคอลัมน์ของแถวรายการ ใช้ร่วมกันทั้ง "รอคุณตรวจสอบ" และ "อนุมัติล่าสุด"
// (ชื่อ | ป้ายรอ | ยอดเงิน | ปุ่ม/สถานะ) ถ้าจะปรับความกว้าง แก้ที่นี่ที่เดียว
// ชื่อคำขอยืดเต็มที่เหลือ (ตัด … ถ้ายาว) · ป้ายรอ / ยอดเงิน / ปุ่ม กว้างตามเนื้อหา ไม่ตัดบรรทัด
const ROW_GRID =
  "grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 border-b border-[#F1F5F9] py-3 last:border-b-0";

/* ------------------------------------------------------------------
   อ่านข้อมูลจาก localStorage (ผ่านฟังก์ชันกลางใน data/ และ utils/login)
------------------------------------------------------------------- */
// ข้ามข้อมูลรูปแบบเก่าที่ไม่มีเส้นทางอนุมัติ

// งบของแผนกตัวเองปีนี้ (งบที่บัญชีแบ่งให้แผนก · data/budget.ts)
function readBudget(user: CurrentUser | null) {
  const requests = loadRequests();
  const year = bkkYear();
  const { limit, used } = getDepartmentBudget(user?.departmentId, requests, year);
  // งบร่วมที่แผนกอื่นแชร์มา (แสดงแยก ไม่รวมในวงเงินแผนก)
  const shared = getSharedBudget(user?.departmentId, requests, loadOrganization(), year);
  return { limit, used, shared: shared.remaining, sharedCount: shared.projects.length };
}

/* ------------------------------------------------------------------
   ฟังก์ชันช่วย
------------------------------------------------------------------- */

// "เมื่อ 2 ชั่วโมงที่แล้ว"

// ป้ายเวลารอ: ละเอียดตามช่วงเวลา ไม่บังคับขั้นต่ำ 1 วัน
//   < 1 นาที  → "รอสักครู่"
//   < 1 ชม.   → "รอ X นาที"
//   < 24 ชม.  → "รอ X ชม."
//   ตั้งแต่ 24 ชม. → "รอ X วัน"
// เวลาที่คำขอ "ถึงคิวรอตรวจ" ล่าสุด = ส่งคำขอ / ส่งใหม่ ครั้งล่าสุดในประวัติ
// ถูกตีกลับแล้วส่งใหม่ → เวลานี้เปลี่ยน ป้ายรอจึงนับใหม่จาก 0
// (คำขอเก่าที่ไม่มีประวัติ ใช้ createdAt)
// ※ ไม่ใช้ updatedAt เพราะ updatedAt เปลี่ยนทุกครั้งที่มีคนกดอนุมัติ
// ป้ายสถานะของคำขอที่คุณอนุมัติไปแล้ว
// ป้ายสถานะ: class ร่วมใน globals.css (status-*)
function statusBadge(r: ExpenseRequest) {
  if (r.status === "จ่ายแล้ว") return { text: "จ่ายแล้ว", cls: "status status-paid" };
  if (r.status === "อนุมัติแล้ว") return { text: "อนุมัติแล้ว", cls: "status status-approved" };
  if (r.status === "ตีกลับ") return { text: "ตีกลับ", cls: "status status-rejected" };
  const next = r.approvalSteps[r.currentStep];
  return { text: next ? `รอ${next.label}` : "กำลังดำเนินการ", cls: "status status-pending" };
}

/* ------------------------------------------------------------------
   หน้า Home
------------------------------------------------------------------- */
export default function DH() {
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [budget, setBudget] = useState({ limit: 0, used: 0, shared: 0, sharedCount: 0 });
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

  // รอคุณตรวจสอบ: คำขอที่ขั้นปัจจุบันเป็นของคุณ
  const pending = requests.filter((r) => canApproveStep(r, me));

  // คำขอที่คุณอนุมัติไปแล้ว (ล่าสุดอยู่บนสุด) พร้อมเวลาที่คุณอนุมัติ
  // ※ ใช้เวลาของขั้นที่คุณอนุมัติเอง ไม่ใช่สถานะรวมของคำขอ
  //   เพราะหัวหน้าอนุมัติแล้ว คำขอยังต้องไปต่อที่ผอ./บัญชี/การเงิน
  //   (getActedRequests เทียบด้วย id ก่อน · คำขอเก่าไม่มี id → เทียบชื่อ)
  const mine = !me
    ? []
    : getActedRequests(requests, me).flatMap(({ request, step }) =>
        step.status === "อนุมัติ" && step.at ? [{ r: request, at: step.at }] : [],
      );

  // อนุมัติล่าสุด: แสดงสูงสุด 5 รายการ (ล่าสุดอยู่บนสุด)
  const recentApproved = mine.slice(0, LIST_LIMIT);

  // อนุมัติแล้วปีนี้: รวมยอดของคำขอที่คุณอนุมัติในปีปัจจุบัน
  const approvedTotal = mine
    .filter(
      (m) =>
        currentYear === null || bkkYear(m.at) === currentYear,
    )
    .reduce((sum, m) => sum + Number(m.r.total || 0), 0);


  // คำขอที่คนที่ login เป็นผู้ขอเอง → การ์ด "คำขอของฉัน"
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
            <p className="text-sm text-[#64748B] mt-3">
              {today} · คำขอรอคุณอนุมัติ{" "}
              <span className="font-semibold text-[#047857]">
                {pending.length} รายการ
              </span>
            </p>
          </div>
        </header>

        {/* แต่ละส่วนห่างกัน 36px เหมือนหน้า employee */}
        <div className="flex flex-col gap-9">
        {/* card1 */}
        <div className="grid grid-cols-4 gap-5">
          {/* งบแผนกคงเหลือ (components/budget-card.tsx · ต้นแบบของทุกหน้า) */}
          <BudgetCard
            className="col-span-2"
            limit={budget.limit}
            used={budget.used}
            year={currentYear}
            note={
              budget.sharedCount > 0
                ? `+ งบร่วมจากแผนกอื่น ${baht(budget.shared)} (${budget.sharedCount} โครงการ)`
                : undefined
            }
          />

          {/* card2 */}
          <div className="bg-white relative flex justify-between p-6 flex-col rounded-xl border border-[#E2E8F0] shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <ClockThree />
            </div>
            <div>
              <div className="text-xs font-medium text-[#64748B]">
                กำลังดำเนินการ
              </div>
              <div className="text-3xl font-bold mt-1 text-[#0F172A]">
                {pending.length}{" "}
                <span className="text-base font-normal text-[#64748B]">
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
              <div className="text-xs font-medium text-[#64748B]">
                อนุมัติแล้วปีนี้
              </div>
              <div className="text-3xl font-bold mt-1 text-[#0F172A]">
                {baht(approvedTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* รอคุณตรวจสอบ */}
        <div className="grid grid-cols-4 gap-5">
          <div className="bg-white relative flex self-start p-6 flex-col col-span-2 rounded-xl border border-[#E2E8F0] shadow-2xl">
            <div className="items-center flex justify-between mb-1">
              <div>
                <span className="font-bold text-md">รอคุณตรวจสอบ</span>
                <span className="bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-full border border-amber-200 ml-2">
                  {pending.length}
                </span>
              </div>
              <div>
                <Link href="/all-request" className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">
                  ดูทั้งหมด →
                </Link>
              </div>
            </div>

            {/* รายการรอตรวจสอบ: grid คอลัมน์คงที่ / สูงตามจำนวนรายการ มากสุด LIST_LIMIT */}
            <div>
              {pending.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-[#64748B]">
                  <CheckCircle1 />
                  <span className="text-sm">ไม่มีคำขอ</span>
                </div>
              ) : (
                pending.slice(0, LIST_LIMIT).map((r) => {
                  const name = r.requester?.fullName ?? "-";
                  const sent = sentAt(r); // เวลาส่ง/ส่งใหม่ล่าสุด
                  // เคยถูกตีกลับแล้วส่งใหม่ = มีประวัติ "ส่งใหม่"
                  // ※ ห้ามเทียบ sent กับ createdAt: บันทึกร่างไว้ก่อนแล้วค่อยส่ง createdAt = เวลาบันทึกร่าง
                  //   จะไม่เท่ากับเวลาส่งเสมอ → ติดป้าย "ส่งใหม่" ผิด
                  const resent = (r.history ?? []).some((h) => historyType(h) === "ส่งใหม่");
                  return (
                    <div key={r.id} className={ROW_GRID}>
                      {/* คอลัมน์ 1: ผู้ขอ + ชื่อคำขอ */}
                      <div className="flex min-w-0 items-center">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-green-700 font-bold">
                          {name.slice(0, 2)}
                        </div>
                        <div className="flex min-w-0 flex-col ml-3">
                          <div className="truncate font-bold">{r.title}</div>
                          <div className="truncate text-xs text-[#64748B]">
                            {name} {resent ? "ส่งใหม่" : ""}
                            {timeAgo(sent)}
                          </div>
                        </div>
                      </div>

                      {/* คอลัมน์ 2: เวลารอ (นับใหม่ทุกครั้งที่ส่งใหม่) */}
                      <div className="flex justify-center">
                        <span className="whitespace-nowrap bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-full border border-amber-200">
                          {waitLabel(sent)}
                        </span>
                      </div>

                      {/* คอลัมน์ 3: ยอดเงิน (ชิดขวา) */}
                      <div className="text-right">
                        <span className="money font-bold">
                          {baht(r.total)}
                        </span>
                      </div>

                      {/* คอลัมน์ 4: ปุ่มตรวจสอบ */}
                      <div className="flex justify-end">
                        <Link
                          href={`${APPROVED_PATH}?id=${encodeURIComponent(r.id)}`}
                          className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-[#ECFDF5] px-3 py-1.5 text-xs font-bold text-[#047857] hover:bg-[#D1FAE5]"
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
            <div className="mt-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 flex items-center gap-2 text-xs text-[#64748B]">
              <div className="w-5 h-5 rounded-xl flex items-center justify-center">
                <CheckCircle1 />
              </div>
              <span>คำขอที่รอเกิน 3 วันระบบจะแจ้งเตือนคุณอีกครั้ง</span>
            </div>

            {/* อนุมัติแล้ว */}
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

            {/* อนุมัติล่าสุด: แสดงสูงสุด LIST_LIMIT รายการ ล่าสุดอยู่บนสุด / ใช้ grid เดียวกับด้านบน
                สูงตามจำนวนรายการ */}
            <div>
              {recentApproved.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-[#64748B]">
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
                          <div className="truncate text-xs text-[#64748B]">
                            อนุมัติ{timeAgo(at)}
                          </div>
                        </div>
                      </div>

                      {/* คอลัมน์ 2 เว้นว่างไว้ให้ตรงกับด้านบน */}
                      <div />

                      <div className="text-right">
                        <span className="money font-bold">
                          {baht(r.total)}
                        </span>
                      </div>

                      <div className="flex justify-end">
                        <span
                          className={badge.cls}
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