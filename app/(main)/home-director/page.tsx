"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  REQUESTS_KEY,
  getActedRequests,
  historyType,
  loadRequests,
  type SavedRequest,
} from "@/data/request";
import { getDepartmentBudget } from "@/data/budget";
import { canApproveStep } from "@/data/approval";
import type { Credential } from "@/data/credential";
import { getCurrentUser } from "@/utils/login";
import {
  ArrowRight,
  Check,
  CheckCircle1,
  ClockThree,
} from "@tailgrids/icons";

/* ------------------------------------------------------------------
   ชนิดข้อมูล: ใช้ของกลางใน data/ (คำขอ = SavedRequest · ผู้ใช้ = Credential)
------------------------------------------------------------------- */
type ExpenseRequest = SavedRequest;
type CurrentUser = Credential;

// ← path หน้าตรวจสอบของ Director ต้องตรงกับชื่อโฟลเดอร์จริงในโปรเจกต์
const APPROVED_PATH = "/home-director/approve";

// ช่วงยอดเงินที่ Director เห็น (30,001 – 300,000)
// ถ้าอยากให้ไม่จำกัดเพดาน ให้ตั้ง DIR_MAX = Infinity
const DIR_MIN = 30001;
const DIR_MAX = 300000;

// แสดงสูงสุดกี่รายการ ทั้ง "รอคุณตรวจสอบ" และ "อนุมัติล่าสุด"
// ความสูงการ์ดเป็น auto ตามจำนวนรายการ (1 รายการ = เตี้ย · มากสุด 5) เริ่มจากบนสุดเสมอ
const LIST_LIMIT = 5;

// ความกว้างคอลัมน์ของแถวรายการ ใช้ร่วมกันทั้ง "รอคุณตรวจสอบ" และ "อนุมัติล่าสุด"
// (ชื่อ | ป้ายรอ | ยอดเงิน | ปุ่ม/สถานะ) ถ้าจะปรับความกว้าง แก้ที่นี่ที่เดียว
const ROW_GRID =
  "grid h-[93px] grid-cols-[260px_90px_110px_1fr] items-center gap-3";

/* ------------------------------------------------------------------
   อ่านข้อมูลจาก localStorage (ผ่านฟังก์ชันกลางใน data/ และ utils/login)
------------------------------------------------------------------- */
// ข้ามข้อมูลรูปแบบเก่าที่ไม่มีเส้นทางอนุมัติ
function readRequests(): ExpenseRequest[] {
  try {
    return loadRequests().filter((r) => r && Array.isArray(r.approvalSteps));
  } catch {
    return [];
  }
}

// งบของแผนกตัวเองปีนี้ (งบที่บัญชีแบ่งให้แผนก · data/budget.ts)
function readBudget(user: CurrentUser | null) {
  const { limit, used } = getDepartmentBudget(user?.departmentId, readRequests(), new Date().getFullYear());
  return { limit, used };
}

/* ------------------------------------------------------------------
   ฟังก์ชันช่วย
------------------------------------------------------------------- */
const baht = (n: number) => "฿" + n.toLocaleString("en-US");

// "เมื่อ 2 ชั่วโมงที่แล้ว"
function timeAgo(iso: string) {
  const mins = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 60000),
  );
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `เมื่อ ${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `เมื่อ ${hours} ชั่วโมงที่แล้ว`;
  return `เมื่อ ${Math.floor(hours / 24)} วันที่แล้ว`;
}

// ป้ายเวลารอ: ละเอียดตามช่วงเวลา ไม่บังคับขั้นต่ำ 1 วัน
//   < 1 นาที  → "รอสักครู่"
//   < 1 ชม.   → "รอ X นาที"
//   < 24 ชม.  → "รอ X ชม."
//   ตั้งแต่ 24 ชม. → "รอ X วัน"
function waitLabel(iso: string) {
  const mins = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 60000),
  );
  if (mins < 1) return "รอสักครู่";
  if (mins < 60) return `รอ ${mins} นาที`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `รอ ${hours} ชม.`;
  return `รอ ${Math.floor(hours / 24)} วัน`;
}

// เวลาที่คำขอ "ถึงคิวรอตรวจ" ล่าสุด = ส่งคำขอ / ส่งใหม่ ครั้งล่าสุดในประวัติ
// ถูกตีกลับแล้วส่งใหม่ → เวลานี้เปลี่ยน ป้ายรอจึงนับใหม่จาก 0
// (คำขอเก่าที่ไม่มีประวัติ ใช้ createdAt)
// ※ ไม่ใช้ updatedAt เพราะ updatedAt เปลี่ยนทุกครั้งที่มีคนกดอนุมัติ
function sentAt(r: ExpenseRequest) {
  let latest = r.createdAt;
  for (const h of r.history ?? []) {
    const t = historyType(h);
    if ((t === "ส่งคำขอ" || t === "ส่งใหม่") && h.at > latest) latest = h.at;
  }
  return latest;
}

// ป้ายสถานะของคำขอที่คุณอนุมัติไปแล้ว
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
   หน้า Home ของ Director
------------------------------------------------------------------- */
export default function Dir() {
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
    setRequests(readRequests());
    setMe(user);
    setBudget(readBudget(user));
    setCurrentYear(new Date().getFullYear());
    setToday(
      new Date().toLocaleDateString("th-TH", {
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
        setRequests(readRequests());
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

  // รอคุณตรวจสอบ: คำขอที่ขั้นปัจจุบันเป็นของคุณ และยอดรวมอยู่ในช่วงของ Director (30,001 – 300,000)
  const pending = requests.filter(
    (r) =>
      canApproveStep(r, me) &&
      Number(r.total || 0) >= DIR_MIN &&
      Number(r.total || 0) <= DIR_MAX,
  );

  // คำขอที่คุณอนุมัติไปแล้ว (ล่าสุดอยู่บนสุด) พร้อมเวลาที่คุณอนุมัติ
  // ※ ใช้เวลาของขั้นที่คุณอนุมัติเอง ไม่ใช่สถานะรวมของคำขอ
  //   เพราะ ผอ. อนุมัติแล้ว คำขอยังต้องไปต่อที่บัญชี/การเงิน
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
        currentYear === null || new Date(m.at).getFullYear() === currentYear,
    )
    .reduce((sum, m) => sum + Number(m.r.total || 0), 0);

  // งบประมาณคงเหลือ + เปอร์เซ็นต์ที่ใช้ไป
  const remaining = Math.max(0, budget.limit - budget.used);
  const usedPct =
    budget.limit > 0 ? Math.round((budget.used / budget.limit) * 100) : 0;
  const barWidth = Math.min(100, Math.max(0, usedPct)); // หลอดไม่เกิน 100%
  const overBudget = budget.limit > 0 && budget.used > budget.limit;

  return (
    <div>
      <div>
        <header className="mb-9 flex justify-between gap-4 relative">
          <div>
            <h1 className="text-[32px] font-bold text-[#111]">
              สวัสดี {me ? me.fullName : "-"}
            </h1>
            <p className="text-sm text-gray-500 mt-3">
              {today} · คำขอรอคุณอนุมัติ{" "}
              <span className="font-semibold text-[#00a86b]">
                {pending.length} รายการ
              </span>
            </p>
          </div>
        </header>

        {/* แต่ละส่วนห่างกัน 36px เหมือนหน้า employee */}
        <div className="flex flex-col gap-9">
        {/* card1 */}
        <div className="grid grid-cols-4 gap-5">
          {/* งบประมาณคงเหลือ (ข้อมูลงบรายปีจริง + หลอด progress) */}
          <div className="bg-[#0e4b3e] text-white relative flex justify-between p-6 overflow-hidden flex-col col-span-2 rounded-xl shadow-2xl">
            <div>
              <div className="items-center flex justify-between mb-1">
                <div>
                  <span>งบประมาณคงเหลือ</span>
                </div>
                <span>
                  {currentYear !== null ? `ปี ${currentYear + 543}` : ""}
                </span>
              </div>
              <div>
                <div className="text-3xl font-bold tracking-tight">
                  {baht(remaining)}
                </div>
                <div className="text-xs text-emerald-300/80 mt-1">
                  จากงบทั้งปี {baht(budget.limit)}
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex justify-between text-xs text-emerald-200 mb-1.5">
                  <span>{overBudget ? "ใช้งบเกินวงเงิน" : ""}</span>
                  <span>ใช้ไปแล้ว {usedPct}%</span>
                </div>
                <div className="w-full bg-emerald-950/60 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      overBudget ? "bg-rose-400" : "bg-[#00e699]"
                    }`}
                    style={{ width: `${barWidth}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* card2 */}
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

        {/* รอคุณตรวจสอบ */}
        <div className="grid grid-cols-4 gap-5">
          <div className="bg-white relative flex self-start p-6 flex-col col-span-4 rounded-xl border border-[#E2E8F0] shadow-2xl">
            <div className="items-center flex justify-between mb-1">
              <div>
                <span className="font-bold text-md">รอคุณตรวจสอบ</span>
                <span className="bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-full border border-amber-200 ml-2">
                  {pending.length}
                </span>
              </div>
              <div>
                <button className="text-green-700 font-bold flex text-xs items-center gap-1">
                  ดูทั้งหมด <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* รายการรอตรวจสอบ: grid คอลัมน์คงที่ / สูงตามจำนวนรายการ มากสุด LIST_LIMIT */}
            <div>
              {pending.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-gray-400">
                  <CheckCircle1 />
                  <span className="text-sm">ไม่มีคำขอ</span>
                </div>
              ) : (
                pending.slice(0, LIST_LIMIT).map((r) => {
                  const name = r.requester?.fullName ?? "-";
                  const sent = sentAt(r); // เวลาส่ง/ส่งใหม่ล่าสุด
                  // เคยถูกตีกลับแล้วส่งใหม่ = มีประวัติ "ส่งใหม่"
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
                          <div className="truncate text-xs text-gray-400">
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
                            อนุมัติ{timeAgo(at)}
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
        </div>
        </div>
      </div>
    </div>
  );
}