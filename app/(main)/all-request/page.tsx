"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { REQUESTS_KEY, loadRequests as loadSaved } from "@/data/request";
import { addRequestsToBudget } from "@/data/budget";
import { getHomePath } from "@/utils/login";
import type { Credential } from "@/data/credential";
import {
  ArrowRight,
  Check,
  CheckCircle1,
  ClockThree,
  Wallet2,
} from "@tailgrids/icons";

/* ------------------------------------------------------------------
   ตั้งค่า
------------------------------------------------------------------- */
// หน้า Home ใช้ getHomePath(role) จาก utils/login.ts
// หน้าตรวจสอบแยกตาม role (หน้านี้ใช้ได้ทั้งหัวหน้าและฝ่ายบัญชี)
const APPROVE_PATHS: Record<string, string> = {
  HEAD: "/home-department-head/approve",
  ACCOUNTANT_ADMIN: "/home-account/approve",
};
const DEFAULT_APPROVE_PATH = "/home-department-head/approve";
const ROW_H = 72; // ความสูงแถว (px) ต้องตรงกับ min-h-[72px] ใน ROW_GRID
const MIN_ROWS = 5; // เว้นพื้นที่อย่างน้อยกี่แถว (ว่าง/น้อยก็ไม่ยุบ)

// คอลัมน์แถวรายการ: ชื่อ | เวลารอ | หมวดค่าใช้จ่าย | ยอดเงิน | ปุ่มตรวจสอบ
// ใช้สัดส่วนคงที่ ให้ตำแหน่งตรงกับแบบ และคงที่ทุกขนาดจอ
// ความสูงแถว "ขั้นต่ำ" 72px ถ้าชื่อหมวดยาวจนขึ้นหลายบรรทัด แถวจะสูงขึ้นเอง
const ROW_GRID =
  "grid min-h-[72px] grid-cols-[2.7fr_2fr_2.5fr_1.5fr_1.3fr] items-center";

/* ------------------------------------------------------------------
   ชนิดข้อมูล
------------------------------------------------------------------- */
interface ApprovalStep {
  role: string;
  label: string;
  status: string; // "รอ" | "อนุมัติ" | "ตีกลับ"
  by: string | null;
  at: string | null;
}
interface ExpenseRequest {
  id: string;
  createdAt: string;
  status: string; // "ร่าง" | "รออนุมัติ" | "อนุมัติแล้ว" | "ตีกลับ"
  title: string;
  total: number;
  items?: { categoryName?: string }[];
  requester: {
    id: string | number;
    fullName: string;
    headId: string | number | null;
    directorId: string | number | null;
  } | null;
  approvalSteps: ApprovalStep[];
  currentStep: number;
}
interface CurrentUser {
  id: string | number;
  fullName: string;
  role: string;
  departmentInfo?: { department?: string };
}

/* ------------------------------------------------------------------
   อ่านข้อมูล
------------------------------------------------------------------- */
function loadRequests(): ExpenseRequest[] {
  try {
    const raw = localStorage.getItem(REQUESTS_KEY);
    const data = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) return [];
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

// งบรายปี: รวมวงเงินและยอดที่ใช้ไปของทุกหมวด (ฝ่ายของผู้ล็อกอิน ถ้าไม่มีรวมทุกฝ่าย)
function loadBudget(user: CurrentUser | null) {
  const projects = addRequestsToBudget(loadSaved());
  const dept = user?.departmentInfo?.department;
  const own = dept ? projects.filter((p) => p.dept === dept) : [];
  const list = own.length > 0 ? own : projects;

  let limit = 0;
  let used = 0;
  for (const p of list) {
    for (const c of p.categories) {
      limit += c.limit;
      used += c.used;
    }
  }
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

// คำขอนี้ "ถึงคิวของคุณ" หรือไม่ (เหมือนหน้า Home)
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

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- อ่านได้หลังเปิดหน้าเท่านั้น */
    const user = loadUser();
    setRequests(loadRequests());
    setMe(user);
    setBudget(loadBudget(user));
    setCurrentYear(new Date().getFullYear());
    /* eslint-enable react-hooks/set-state-in-effect */

    const onStorage = (e: StorageEvent) => {
      if (e.key === REQUESTS_KEY) {
        setRequests(loadRequests());
        setBudget(loadBudget(loadUser()));
      }
      if (e.key === "current_user") {
        const u = loadUser();
        setMe(u);
        setBudget(loadBudget(u));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // path ตาม role ของคนที่ login: หัวหน้า → หน้าของหัวหน้า / ฝ่ายบัญชี → หน้าของบัญชี
  const homePath = me ? getHomePath(me.role as Credential["role"]) : "/";
  const approvePath = (me && APPROVE_PATHS[me.role]) || DEFAULT_APPROVE_PATH;

  // รอคุณตรวจสอบทั้งหมด (รอนานสุดขึ้นก่อน ถ้าอยากให้ล่าสุดขึ้นก่อน สลับ a/b)
  const pending = requests
    .filter((r) => isMyTurn(r, me))
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  // อนุมัติแล้วปีนี้: รวมยอดของคำขอที่คุณอนุมัติในปีปัจจุบัน
  const approvedTotal = !me
    ? 0
    : requests.reduce((sum, r) => {
        const step = [...r.approvalSteps]
          .reverse()
          .find((s) => s.status === "อนุมัติ" && s.by === me.fullName);
        if (!step || !step.at) return sum;
        if (
          currentYear !== null &&
          new Date(step.at).getFullYear() !== currentYear
        ) {
          return sum;
        }
        return sum + Number(r.total || 0);
      }, 0);

  // งบประมาณคงเหลือ + เปอร์เซ็นต์ที่ใช้ไป
  const remaining = Math.max(0, budget.limit - budget.used);
  const usedPct =
    budget.limit > 0 ? Math.round((budget.used / budget.limit) * 100) : 0;
  const barWidth = Math.min(100, Math.max(0, usedPct));
  const overBudget = budget.limit > 0 && budget.used > budget.limit;

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <div className="mx-auto max-w-7xl">
        {/* ===== แบนเนอร์ข้อมูล (เหมือนหน้าหลัก) ===== */}
        <div className="grid grid-cols-1 gap-5 pt-5 lg:grid-cols-[3fr_1.5fr_1.5fr]">
          {/* งบประมาณคงเหลือ */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b1f2a] via-[#0e4b3e] to-[#0a8f5f] p-6 text-white">
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
              <div className="text-3xl font-bold tracking-tight">
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
          <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ClockThree />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400">
                กำลังดำเนินการ
              </div>
              <div className="mt-1 text-3xl font-bold text-gray-800">
                {pending.length}{" "}
                <span className="text-base font-normal text-gray-500">
                  รายการ
                </span>
              </div>
            </div>
          </div>

          {/* อนุมัติแล้วปีนี้ */}
          <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <Check />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400">
                อนุมัติแล้วปีนี้
              </div>
              <div className="mt-1 text-3xl font-bold text-gray-800">
                {baht(approvedTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* ===== รายการคำขอรอตรวจทั้งหมด (เต็มความกว้าง) ===== */}
        <section className="mt-5 w-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <span className="text-base font-bold">รอคุณตรวจสอบ</span>
              <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-600">
                {pending.length}
              </span>
            </div>
            <Link
              href={homePath}
              className="flex items-center gap-1 text-xs font-bold text-green-700 hover:underline"
            >
              <ArrowRight size={15} className="rotate-180" /> กลับหน้าหลัก
            </Link>
          </div>

          <div style={{ minHeight: MIN_ROWS * ROW_H }}>
            {pending.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center gap-2 text-gray-400"
                style={{ height: MIN_ROWS * ROW_H }}
              >
                <CheckCircle1 />
                <span className="text-sm">ไม่มีคำขอรอตรวจ</span>
              </div>
            ) : (
              pending.map((r, i) => {
                const name = r.requester?.fullName ?? "-";
                const categories = categoryLabel(r);
                return (
                  <div
                    key={r.id}
                    className={`${ROW_GRID} ${i > 0 ? "border-t border-gray-100" : ""}`}
                  >
                    {/* คอลัมน์ 1: ผู้ขอ + ชื่อคำขอ */}
                    <div className="flex min-w-0 items-center gap-3 py-3 pr-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${AVATARS[i % AVATARS.length]}`}
                      >
                        {name.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-bold">{r.title}</div>
                        <div className="truncate text-xs text-gray-400">
                          {name} ส่ง{timeAgo(r.createdAt)}
                        </div>
                      </div>
                    </div>

                    {/* คอลัมน์ 2: เวลารอ (ชิดซ้าย) */}
                    <div className="flex justify-start">
                      <span className="whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-600">
                        {waitLabel(r.createdAt)}
                      </span>
                    </div>

                    {/* คอลัมน์ 3: หมวดค่าใช้จ่ายทั้งหมด (ชิดซ้าย ยาวแล้วขึ้นบรรทัดใหม่) */}
                    <div
                      className="py-3 pr-4 text-sm leading-snug text-gray-600"
                      title={categories}
                    >
                      {categories}
                    </div>

                    {/* คอลัมน์ 4: ยอดเงิน (ชิดซ้าย) */}
                    <div className="font-bold tabular-nums">
                      {baht(r.total)}
                    </div>

                    {/* คอลัมน์ 5: ปุ่มตรวจสอบ (ชิดขวา) */}
                    <div className="flex justify-end">
                      <Link
                        href={`${approvePath}?id=${encodeURIComponent(r.id)}`}
                        className="flex items-center gap-1 text-xs font-bold text-green-700 hover:underline"
                      >
                        ตรวจสอบ <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}