"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { REQUESTS_KEY, getActedRequests, loadRequests, type SavedRequest } from "@/data/request";
import { getDepartmentBudget } from "@/data/budget";
import { canApproveStep } from "@/data/approval";
import { getCurrentUser } from "@/utils/login";
import type { Credential } from "@/data/credential";
import {
  ArrowRight,
  Check,
  CheckCircle1,
  ClockThree,
  Search1,
  Wallet2,
} from "@tailgrids/icons";
import { bkkYear } from "@/utils/date";

/* ------------------------------------------------------------------
   ตั้งค่า
------------------------------------------------------------------- */
// หน้า Home ใช้ getHomePath(role) จาก utils/login.ts
// หน้าตรวจสอบแยกตาม role (หน้านี้ใช้ได้ทั้งหัวหน้าและฝ่ายบัญชี)
const APPROVE_PATHS: Record<string, string> = {
  HEAD: "/home-department-head/approve",
  ACCOUNTANT: "/home-account/approve",
};
const DEFAULT_APPROVE_PATH = "/home-department-head/approve";
const ROW_H = 72; // ความสูงแถว (px) ต้องตรงกับ min-h-[72px] ใน ROW_GRID
const MIN_ROWS = 5; // เว้นพื้นที่อย่างน้อยกี่แถว (ว่าง/น้อยก็ไม่ยุบ)

// คอลัมน์แถวรายการ: ชื่อ | เวลารอ | หมวดค่าใช้จ่าย | ยอดเงิน | ปุ่มตรวจสอบ
// ใช้สัดส่วนคงที่ ให้ตำแหน่งตรงกับแบบ และคงที่ทุกขนาดจอ
// ความสูงแถว "ขั้นต่ำ" 72px ถ้าชื่อหมวดยาวจนขึ้นหลายบรรทัด แถวจะสูงขึ้นเอง
const ROW_GRID =
  "grid min-h-[72px] grid-cols-[minmax(0,2.5fr)_auto_minmax(0,2fr)_auto_auto] items-center gap-4";
const OVERDUE_DAYS = 3; // รอเกินกี่วันถือว่าล่าช้า (ป้ายเวลารอเป็นสีแดง)

/* ------------------------------------------------------------------
   ชนิดข้อมูล: ใช้ของกลางใน data/ (คำขอ = SavedRequest · ผู้ใช้ = Credential)
------------------------------------------------------------------- */
type ExpenseRequest = SavedRequest;
type CurrentUser = Credential;

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
  const { limit, used } = getDepartmentBudget(user?.departmentId, readRequests(), bkkYear());
  return { limit, used };
}

/* ------------------------------------------------------------------
   ฟังก์ชันช่วย
------------------------------------------------------------------- */
const baht = (n: number) => "฿" + n.toLocaleString("en-US");

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

// ป้ายเวลารอ: รอสักครู่ / รอ X นาที / รอ X ชม. / รอ X วัน
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


// รอเกิน OVERDUE_DAYS วันแล้วหรือยัง (ใช้ทำป้ายเวลารอเป็นสีแดง)
function isOverdue(iso: string) {
  return Date.now() - new Date(iso).getTime() >= OVERDUE_DAYS * 24 * 3600 * 1000;
}

// หมวดค่าใช้จ่ายของคำขอ: แสดงชื่อหมวดทั้งหมด คั่นด้วย " + "
// เช่น "ค่าที่พัก + ค่าเดินทาง" (ชื่อหมวดซ้ำกันแสดงครั้งเดียว)
function categoryLabel(r: ExpenseRequest) {
  const names = Array.from(
    new Set(
      (r.items ?? [])
        .map((it) => it.categoryName)
        .filter((n): n is string => !!n),
    ),
  );
  return names.length > 0 ? names.join(" + ") : "-";
}

// สีวงกลมตัวอักษร (วนไปตามลำดับแถว)
const AVATARS = [
  "bg-emerald-100 text-green-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-600",
  "bg-sky-100 text-sky-700",
];

/* ------------------------------------------------------------------
   หน้า คำขอรอตรวจทั้งหมด (หัวหน้า)
------------------------------------------------------------------- */
export default function AllRequestDH() {
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [budget, setBudget] = useState({ limit: 0, used: 0 });
  // ปีปัจจุบัน: ตั้งค่าใน useEffect เท่านั้น (เลี่ยง new Date() ตอน prerender)
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- อ่านได้หลังเปิดหน้าเท่านั้น */
    const user = getCurrentUser();
    setRequests(readRequests());
    setMe(user);
    setBudget(readBudget(user));
    setCurrentYear(bkkYear());
    /* eslint-enable react-hooks/set-state-in-effect */

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

  // path ตาม role ของคนที่ login: หัวหน้า → หน้าของหัวหน้า / ฝ่ายบัญชี → หน้าของบัญชี
  const approvePath = (me && APPROVE_PATHS[me.role]) || DEFAULT_APPROVE_PATH;

  // รอคุณตรวจสอบทั้งหมด (รอนานสุดขึ้นก่อน ถ้าอยากให้ล่าสุดขึ้นก่อน สลับ a/b)
  const pending = requests
    .filter((r) => canApproveStep(r, me))
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  // อนุมัติแล้วปีนี้: รวมยอดของคำขอที่คุณอนุมัติในปีปัจจุบัน
  // ※ นับคำขอละครั้ง (อนุมัติหลายรอบหลังส่งใหม่ ไม่นับซ้ำ)
  const approvedIds = new Set(
    !me
      ? []
      : getActedRequests(requests, me)
          .filter(
            ({ step }) =>
              step.status === "อนุมัติ" &&
              !!step.at &&
              (currentYear === null || bkkYear(step.at) === currentYear),
          )
          .map(({ request }) => request.id),
  );
  const approvedTotal = requests
    .filter((r) => approvedIds.has(r.id))
    .reduce((sum, r) => sum + Number(r.total || 0), 0);

  // ค้นหา: ชื่อคำขอ / ผู้ขอ / เลขที่
  const q = query.trim().toLowerCase();
  const shown = pending.filter(
    (r) =>
      !q ||
      r.title.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      (r.requester?.fullName ?? "").toLowerCase().includes(q),
  );

  // งบประมาณคงเหลือ + เปอร์เซ็นต์ที่ใช้ไป
  const remaining = Math.max(0, budget.limit - budget.used);
  const usedPct =
    budget.limit > 0 ? Math.round((budget.used / budget.limit) * 100) : 0;
  const barWidth = Math.min(100, Math.max(0, usedPct));
  const overBudget = budget.limit > 0 && budget.used > budget.limit;

  return (
    <div>
      <header className="mb-9">
        <h1 className="text-[32px] font-bold text-[#0F172A]">คำขอรออนุมัติทั้งหมด</h1>
      </header>
      <div>
        {/* ===== แบนเนอร์ข้อมูล (เหมือนหน้าหลัก) ===== */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[3fr_1.5fr_1.5fr]">
          {/* งบประมาณคงเหลือ */}
          <div className="relative overflow-hidden rounded-xl shadow-2xl bg-gradient-to-br from-[#0b1f2a] via-[#0e4b3e] to-[#0a8f5f] p-6 text-white">
            {/* ลวดลายวงกลมตกแต่ง */}
            <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-4 -top-8 h-40 w-40 rounded-full border border-white/10" />

            <div className="relative z-10">
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm">
                  <Wallet2 className="h-5 w-5 text-emerald-300" />
                  งบแผนกคงเหลือ
                </span>
                <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs">
                  {currentYear !== null ? `ปี ${currentYear + 543}` : ""}
                </span>
              </div>
              <div className="money text-3xl font-bold tracking-tight">
                {baht(remaining)}
              </div>
              <div className="mt-1 text-xs text-emerald-300/80">
                จากงบทั้งปี {baht(budget.limit)}
              </div>

              <div className="mt-3">
                <div className="mb-1.5 flex justify-between text-xs text-emerald-200">
                  <span>{overBudget ? "ใช้งบเกินวงเงิน" : ""}</span>
                  <span>ใช้ไปแล้ว {usedPct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      overBudget ? "bg-rose-400" : "bg-[#34e0a1]"
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* กำลังดำเนินการ */}
          <div className="flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ClockThree />
            </div>
            <div>
              <div className="text-sm text-[#64748B]">รอคุณตรวจสอบ</div>
              <div className="money mt-1 text-3xl font-bold text-[#0F172A]">
                {pending.length}{" "}
                <span className="text-base font-normal text-[#64748B]">
                  รายการ
                </span>
              </div>
            </div>
          </div>

          {/* อนุมัติแล้วปีนี้ */}
          <div className="flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <Check />
            </div>
            <div>
              <div className="text-sm text-[#64748B]">คุณอนุมัติแล้วปีนี้</div>
              <div className="money mt-1 text-3xl font-bold text-[#0F172A]">
                {baht(approvedTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* ===== รายการคำขอรอตรวจทั้งหมด (เต็มความกว้าง) ===== */}
        <section
          aria-labelledby="pending-title"
          className="mt-9 w-full rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h2 id="pending-title" className="text-lg font-bold">
              รอคุณตรวจสอบ{" "}
              <span className="text-sm font-normal text-[#64748B]">
                {q ? `${shown.length} จาก ${pending.length}` : pending.length} รายการ, รอนานสุดอยู่บน
              </span>
            </h2>
            <label className="flex w-full items-center gap-2 rounded-xl border border-[#E2E8F0] px-3 py-2 focus-within:border-[#059669] sm:w-72">
              <Search1 size={18} className="shrink-0 text-[#94A3B8]" aria-hidden="true" />
              <span className="sr-only">ค้นหาคำขอ</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อคำขอ ผู้ขอ หรือเลขที่"
                className="w-full border-0 bg-transparent p-0 text-sm outline-none focus:ring-0"
              />
            </label>
          </div>

          {/* หัวตาราง: ใช้ grid เดียวกับแถว */}
          {shown.length > 0 && (
            <div className={`${ROW_GRID} min-h-0 border-b border-[#E2E8F0] py-2 text-xs font-semibold text-[#64748B]`} aria-hidden="true">
              <span>คำขอ</span>
              <span>รอมาแล้ว</span>
              <span>หมวดค่าใช้จ่าย</span>
              <span className="text-right">ยอดเงิน</span>
              <span />
            </div>
          )}

          <div style={{ minHeight: MIN_ROWS * ROW_H }}>
            {shown.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center gap-2 text-sm text-[#64748B]"
                style={{ height: MIN_ROWS * ROW_H }}
              >
                <CheckCircle1 aria-hidden="true" />
                {q ? (
                  <>
                    <span>ไม่พบคำขอที่ตรงกับ “{query.trim()}”</span>
                    <button type="button" onClick={() => setQuery("")} className="font-semibold text-[#047857] hover:underline">
                      ล้างคำค้นหา
                    </button>
                  </>
                ) : (
                  <span>ไม่มีคำขอรอคุณตรวจสอบ</span>
                )}
              </div>
            ) : (
              <ul>
                {shown.map((r, i) => {
                  const name = r.requester?.fullName ?? "-";
                  const categories = categoryLabel(r);
                  const late = isOverdue(r.createdAt);
                  return (
                    <li key={r.id} className={`${ROW_GRID} border-b border-[#F1F5F9] last:border-b-0`}>
                      {/* ผู้ขอ + ชื่อคำขอ */}
                      <div className="flex min-w-0 items-center gap-3 py-3">
                        <span
                          aria-hidden="true"
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${AVATARS[i % AVATARS.length]}`}
                        >
                          {name.slice(0, 2)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{r.title}</p>
                          <p className="truncate text-xs text-[#64748B]">
                            {name} ส่ง{timeAgo(r.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* เวลารอ: เกิน OVERDUE_DAYS วัน = แดง */}
                      <span
                        className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs ${
                          late
                            ? "border-[#FECDD3] bg-[#FFF1F2] font-semibold text-[#BE123C]"
                            : "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]"
                        }`}
                      >
                        {waitLabel(r.createdAt)}
                      </span>

                      {/* หมวดค่าใช้จ่ายทั้งหมด */}
                      <p className="py-3 text-sm leading-snug text-[#475569]" title={categories}>
                        {categories}
                      </p>

                      {/* ยอดเงิน (ชิดขวา) */}
                      <span className="money text-right font-semibold">{baht(r.total)}</span>

                      {/* ปุ่มตรวจสอบ */}
                      <Link
                        href={`${approvePath}?id=${encodeURIComponent(r.id)}`}
                        className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-[#ECFDF5] px-3 py-1.5 text-xs font-bold text-[#047857] hover:bg-[#D1FAE5]"
                      >
                        ตรวจสอบ <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}