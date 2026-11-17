"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { REQUESTS_KEY } from "@/data/request";
import {
  ArrowRight,
  Bell1,
  Check,
  CheckCircle1,
  ClockThree,
  Plus,
  Search1,
} from "@tailgrids/icons";

/* ------------------------------------------------------------------
   ชนิดข้อมูล (ตรงกับที่หน้า request/new บันทึกไว้)
------------------------------------------------------------------- */
interface ApprovalStep {
  role: string; // "HEAD" | "DIRECTOR" | "MANAGING_DIRECTOR" | "ACCOUNTANT_ADMIN" | "FINANCE"
  label: string;
  status: string; // "รอ" | "อนุมัติ" | "ตีกลับ"
  by: string | null;
  at: string | null;
  note: string;
}

interface ExpenseRequest {
  id: string; // "REQ-xxxxxxxx"
  createdAt: string;
  status: string; // "ร่าง" | "รออนุมัติ" | "อนุมัติแล้ว" | "ตีกลับ"
  title: string;
  total: number;
  requester: {
    id: string | number;
    fullName: string;
    headId: string | number | null;
    directorId: string | number | null;
  } | null;
  approvalSteps: ApprovalStep[];
  currentStep: number;
}

// คนที่ล็อกอินอยู่ (หน้าล็อกอินบันทึกไว้ที่ localStorage "current_user")
interface CurrentUser {
  id: string | number;
  fullName: string;
  role: string;
}

const APPROVED_PATH = "/Approved-department-head"; // ← path หน้าตรวจสอบ ต้องตรงกับชื่อโฟลเดอร์
const RECENT_LIMIT = 3; // จำนวนรายการที่แสดงใน "อนุมัติล่าสุด"

// ความกว้างคอลัมน์ของแถวรายการ ใช้ร่วมกันทั้ง "รอคุณตรวจสอบ" และ "อนุมัติล่าสุด"
// (ชื่อ | ป้ายรอ | ยอดเงิน | ปุ่ม/สถานะ) ถ้าจะปรับความกว้าง แก้ที่นี่ที่เดียว
const ROW_GRID =
  "grid h-[93px] grid-cols-[260px_90px_110px_1fr] items-center gap-3";

/* ------------------------------------------------------------------
   อ่านข้อมูลจาก localStorage
------------------------------------------------------------------- */
function loadRequests(): ExpenseRequest[] {
  try {
    const raw = localStorage.getItem(REQUESTS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    // ข้ามข้อมูลรูปแบบเก่าที่ไม่มีเส้นทางอนุมัติ
    return data.filter((r) => r && Array.isArray(r.approvalSteps));
  } catch {
    return [];
  }
}

function loadUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem("current_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------
   ฟังก์ชันช่วย
------------------------------------------------------------------- */
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

// "รอ 2 วัน" (อย่างน้อย 1 วัน)
function waitDays(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return `รอ ${Math.max(1, days)} วัน`;
}

// คำขอนี้ "ถึงคิวของคุณ" หรือไม่
// - ขั้นปัจจุบันต้องยังเป็น "รอ" และ role ตรงกับของคุณ
// - หัวหน้า/ผอ.ฝ่าย ต้องเป็นผู้บังคับบัญชาของผู้ขอจริง (ถ้าข้อมูลมี headId / directorId)
function isMyTurn(r: ExpenseRequest, me: CurrentUser | null) {
  if (!me || r.status !== "รออนุมัติ") return false;
  const step = r.approvalSteps[r.currentStep];
  if (!step || step.status !== "รอ" || step.role !== me.role) return false;

  const owner =
    step.role === "HEAD"
      ? r.requester?.headId
      : step.role === "DIRECTOR"
        ? r.requester?.directorId
        : null;
  return !owner || owner === me.id;
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
   หน้า Home
------------------------------------------------------------------- */
export default function DH() {
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [me, setMe] = useState<CurrentUser | null>(null);
  // ปีและวันที่ปัจจุบัน: ตั้งค่าใน useEffect เท่านั้น (เลี่ยง new Date() ตอน prerender)
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [today, setToday] = useState("");

  // โหลดใน useEffect เท่านั้น (ฝั่งเซิร์ฟเวอร์ไม่มี localStorage)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- อ่านได้หลังเปิดหน้าเท่านั้น */
    setRequests(loadRequests());
    setMe(loadUser());
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
      if (e.key === REQUESTS_KEY) setRequests(loadRequests());
      if (e.key === "current_user") setMe(loadUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // รอคุณตรวจสอบ: คำขอที่ขั้นปัจจุบันเป็นของคุณ
  const pending = requests.filter((r) => isMyTurn(r, me));

  // คำขอที่คุณอนุมัติไปแล้ว (ล่าสุดอยู่บนสุด) พร้อมเวลาที่คุณอนุมัติ
  // ※ ใช้เวลาของขั้นที่คุณอนุมัติเอง ไม่ใช่สถานะรวมของคำขอ
  //   เพราะหัวหน้าอนุมัติแล้ว คำขอยังต้องไปต่อที่ผอ./บัญชี/การเงิน
  const mine = !me
    ? []
    : requests
        .flatMap((r) => {
          const step = [...r.approvalSteps]
            .reverse()
            .find((s) => s.status === "อนุมัติ" && s.by === me.fullName);
          return step && step.at ? [{ r, at: step.at }] : [];
        })
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  // อนุมัติล่าสุด
  const recentApproved = mine.slice(0, RECENT_LIMIT);

  // อนุมัติแล้วปีนี้: รวมยอดของคำขอที่คุณอนุมัติในปีปัจจุบัน
  const approvedTotal = mine
    .filter(
      (m) =>
        currentYear === null || new Date(m.at).getFullYear() === currentYear,
    )
    .reduce((sum, m) => sum + Number(m.r.total || 0), 0);

  return (
    <div className="bg-[#F1F5F9] min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between gap-4 relative">
          <div>
            <h1 className="text-2xl font-bold items-center justify-between mt-8">
              {me ? me.fullName : "-"}
            </h1>
            <p className="text-sm text-gray-500 mt-3">
              {today} · คำขอรอคุณอนุมัติ{" "}
              <span className="font-semibold text-[#00a86b]">
                {pending.length} รายการ
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              {/* <span><Search1 /></span> */}
              <input
                type="text"
                placeholder=" ค้นหาคำขอ..."
                className="w-full md:w-80 pl-10 pr-4 py-2.5 bg-white rounded-xl text-sm border border-gray-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              />
            </div>

            <button className="p-2.5 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 relative transition">
              <Bell1 />
            </button>
            <Link
              href="/request/new"
              className="flex items-center justify-center gap-2 bg-[#00875a] text-white px-5 py-2.5 rounded-xl hover:bg-[#00704a] text-md font-medium shadow-sm w-42.5"
            >
              <span>
                <Plus />
              </span>
              ยื่นคำขอ
            </Link>
          </div>
        </header>

        {/* card1 */}
        <div className="flex gap-5">
          <div className="bg-[#0e4b3e] text-white relative flex justify-between p-6 mt-5 overflow-hidden flex-col rounded-2xl w-150">
            <div>
              <div className="items-center flex justify-between mb-1">
                <div>
                  <span>งบประมาณคงเหลือ</span>
                </div>
                <span>ปี 2569</span>
              </div>
              <div>
                <div className="text-3xl font-bold tracking-tight">
                  ฿128,400
                </div>
                <div className="text-xs text-emerald-300/80 mt-1">
                  จากงบทั้งปี ฿300,000
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex justify-between text-xs text-emerald-200 mb-1.5">
                  <span></span>
                  <span>ใช้ไปแล้ว 57%</span>
                </div>
                <div className="w-full bg-emerald-950/60 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#00e699] h-full rounded-full transition-all duration-500"
                    style={{ width: "57%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* card2 */}
          <div className="bg-white relative flex justify-between p-6 mt-5 flex-col rounded-2xl w-80 border-gray-100 shadow-sm">
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
          <div className="bg-white relative flex justify-between p-6 mt-5 flex-col rounded-2xl w-80 border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Check />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400">
                อนุมัติแล้วปีนี้
              </div>
              <div className="text-3xl font-bold mt-1 text-gray-800">
                ฿{approvedTotal.toLocaleString("en-US")}
              </div>
            </div>
          </div>
        </div>

        {/* รอคุณตรวจสอบ */}
        <div className="flex gap-5">
          <div className="bg-white relative flex justify-between p-6 mt-5 flex-col rounded-2xl w-180 border-gray-100 shadow-sm">
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

            {/* รายการรอตรวจสอบ: grid คอลัมน์คงที่ / พื้นที่สูงเท่า 3 แถวเสมอ */}
            <div className="min-h-[279px]">
              {pending.length === 0 ? (
                <div className="flex h-[279px] flex-col items-center justify-center gap-2 text-gray-400">
                  <CheckCircle1 />
                  <span className="text-sm">ไม่มีคำขอ</span>
                </div>
              ) : (
                pending.map((r) => {
                  const name = r.requester?.fullName ?? "-";
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
                            {name} {timeAgo(r.createdAt)}
                          </div>
                        </div>
                      </div>

                      {/* คอลัมน์ 2: รอกี่วัน */}
                      <div className="flex justify-center">
                        <span className="whitespace-nowrap bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-full border border-amber-200">
                          {waitDays(r.createdAt)}
                        </span>
                      </div>

                      {/* คอลัมน์ 3: ยอดเงิน (ชิดขวา) */}
                      <div className="text-right">
                        <span className="font-bold tabular-nums">
                          ฿{r.total.toLocaleString("en-US")}
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
                </div>
                <div>
                  <button className="text-green-700 font-bold flex text-xs items-center gap-1">
                    ดูประวัติ <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* อนุมัติล่าสุด: ล่าสุดอยู่บนสุด / ใช้ grid เดียวกับด้านบน / ว่างก็เว้นที่ไว้ 3 แถว */}
            <div style={{ minHeight: RECENT_LIMIT * 93 }}>
              {recentApproved.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center gap-2 text-gray-400"
                  style={{ height: RECENT_LIMIT * 93 }}
                >
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
                          ฿{r.total.toLocaleString("en-US")}
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

          {/* คำขอของฉัน (self-start = ความสูงตามเนื้อหาตัวเอง ไม่ยืดตามฝั่งซ้าย) */}
          <div className="w-full lg:w-5/12 self-start bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 flex flex-col justify-between mt-5">
            <div>
              {/* Header: คำขอของฉัน */}
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-base text-gray-800">
                  คำขอของฉัน
                </h2>
                <button className="text-emerald-700 font-semibold text-xs flex items-center gap-1 hover:underline">
                  ดูทั้งหมด →
                </button>
              </div>

              <div className="space-y-6">
                {/* Item 1: รออนุมัติ */}
                <div className="pb-6 border-b border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-gray-800">
                        ซื้อคอมพิวเตอร์ให้ทีม 2 เครื่อง
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        ส่งเมื่อ 14 ต.ค.{" "}
                        <span className="font-bold text-gray-700">฿56,000</span>
                      </div>
                    </div>
                    <span className="bg-amber-50 text-amber-600 text-xs px-3 py-1 rounded-full border border-amber-200 font-medium">
                      รออนุมัติ
                    </span>
                  </div>

                  {/* Stepper Progress */}
                  <div className="relative px-2 py-2">
                    <div className="absolute left-5 right-5 top-5 -translate-y-1/2 h-1 bg-gray-200 z-0"></div>
                    <div className="absolute left-5 right-[50%] top-5 -translate-y-1/2 h-1 bg-emerald-500 z-0"></div>

                    <div className="relative z-10 flex justify-between items-center text-xs">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <span className="text-gray-600 font-medium">
                          ส่งคำขอ
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-white border-2 border-dashed border-emerald-500 flex items-center justify-center"></div>
                        <span className="text-emerald-700 font-bold">
                          หัวหน้าสายงาน
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-white border border-gray-300 text-gray-400 flex items-center justify-center"></div>
                        <span className="text-gray-400">ฝ่ายบัญชี</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Item 2: อนุมัติแล้ว */}
                <div className="pb-6 border-b border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-gray-800">
                        ค่าจัดงานเปิดตัวสินค้า
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        ส่งเมื่อ 12 ต.ค.{" "}
                        <span className="font-bold text-gray-700">฿48,000</span>
                      </div>
                    </div>
                    <span className="bg-emerald-50 text-emerald-600 text-xs px-3 py-1 rounded-full font-medium">
                      อนุมัติแล้ว
                    </span>
                  </div>

                  {/* Stepper Progress */}
                  <div className="relative px-2 py-2">
                    <div className="absolute left-5 right-6 top-5 -translate-y-1/2 h-1 bg-emerald-500 z-0"></div>

                    <div className="relative z-10 flex justify-between items-center text-xs">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <span className="text-gray-600 font-medium">
                          ส่งคำขอ
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <span className="text-emerald-700 font-bold">
                          หัวหน้าสายงาน
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <span className="text-emerald-700 font-medium">
                          ฝ่ายบัญชี
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Item 3: ถูกตีกลับ */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-gray-800">
                        ค่ารับรองลูกค้าองค์กร
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        ส่งเมื่อ 28 ก.ย.{" "}
                        <span className="font-bold text-gray-700">฿15,600</span>
                      </div>
                    </div>
                    <span className="bg-rose-50 text-rose-600 text-xs px-3 py-1 rounded-full border border-rose-200 font-medium">
                      ถูกตีกลับ
                    </span>
                  </div>

                  {/* Stepper Progress */}
                  <div className="relative px-2 py-2">
                    <div className="absolute left-5 right-5 top-5 -translate-y-1/2 h-1 bg-gray-200 z-0"></div>
                    <div className="absolute left-5 right-[50%] top-5 -translate-y-1/2 h-1 bg-emerald-500 z-0"></div>

                    <div className="relative z-10 flex justify-between items-center text-xs">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <span className="text-gray-600 font-medium">
                          ส่งคำขอ
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold">
                          ✕
                        </div>
                        <span className="text-rose-600 font-bold">
                          หัวหน้าสายงาน
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-white border border-gray-300 text-gray-400 flex items-center justify-center"></div>
                        <span className="text-gray-400">ฝ่ายบัญชี</span>
                      </div>
                    </div>
                  </div>

                  {/* Reason Box */}
                  <div className="bg-rose-50/60 border border-rose-200/60 rounded-xl p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 text-rose-700">
                      <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center shrink-0 font-bold text-[10px]">
                        !
                      </div>
                      <span>
                        <strong>เหตุผล:</strong> แนบใบเสร็จไม่ครบ
                        ขาดใบเสร็จค่าอาหาร...
                      </span>
                    </div>
                    <button className="text-rose-700 font-semibold hover:underline shrink-0">
                      ดูทั้งหมด →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Notice Banner */}
            <div className="mt-4 bg-gray-50 border border-gray-200/60 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-gray-500">
              <span>✓</span>
              <span>คำขอของคุณจะถูกส่งให้หัวหน้าสายงานอนุมัติ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}