"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { REQUESTS_KEY, loadRequests as loadSaved } from "@/data/request";
import { addRequestsToBudget } from "@/data/budget";
import {
  ArrowRight,
  Bell1,
  Calendar,
  Check,
  CheckCircle1,
  ClockThree,
  Search1,
  Wallet2,
} from "@tailgrids/icons";

/* ------------------------------------------------------------------
   ตั้งค่า
------------------------------------------------------------------- */
const REVIEW_PATH = "/home-account/approve"; // ← หน้าตรวจสอบคำขอ ปรับให้ตรงชื่อโฟลเดอร์
const PENDING_LIMIT = 5; // จำนวนแถวสูงสุดใน "รอคุณตรวจสอบ"
const RECENT_LIMIT = 5; // จำนวนแถวสูงสุดใน "อนุมัติล่าสุด"
const OVERDUE_DAYS = 3; // รอเกินกี่วันถือว่าล่าช้า

// role ของขั้นฝ่ายบัญชีในเส้นทางอนุมัติ (ตรงกับ data/approval.ts)
// หน้านี้ตัดสินจาก "ขั้นของคำขอ" ไม่ใช่จากชื่อ/role ของคนที่ล็อกอิน
const ACCOUNTANT_ROLE = "ACCOUNTANT_ADMIN";

// ความกว้างคอลัมน์ของแถวรายการ (เท่ากับหน้า Home ของหัวหน้า)
// ใช้ร่วมกันทั้ง "รอคุณตรวจสอบ" และ "อนุมัติล่าสุด" ถ้าจะปรับ แก้ที่นี่ที่เดียว
// (ชื่อ | ป้ายรอ | ยอดเงิน | ปุ่ม/สถานะ)
const ROW_GRID =
  "grid h-[93px] grid-cols-[260px_90px_110px_1fr] items-center gap-3";
const ROW_H = 93; // ความสูงแถว (px) ต้องตรงกับ h-[93px] ด้านบน

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
  requester: { fullName: string } | null;
  approvalSteps: ApprovalStep[];
  currentStep: number;
}
interface CurrentUser {
  id: string | number;
  fullName: string;
  role: string;
}
type Projects = ReturnType<typeof addRequestsToBudget>;

// งบของ 1 ฝ่าย (รวมทุกโครงการ/หมวดในฝ่ายนั้น)
interface DeptBudget {
  dept: string;
  limit: number;
  used: number;
  pct: number;
  top: { name: string; used: number }[]; // หมวดที่ใช้มากสุด
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

// งบทุกโครงการ (หักคำขอที่ส่งแล้ว)
function loadProjects(): Projects {
  return addRequestsToBudget(loadSaved());
}

/* ------------------------------------------------------------------
   ฟังก์ชันช่วย
------------------------------------------------------------------- */
const baht = (n: number) => "฿" + n.toLocaleString("en-US");

function ageMs(iso: string) {
  return Math.max(0, Date.now() - new Date(iso).getTime());
}

// "เมื่อ 2 ชั่วโมงที่แล้ว"
function timeAgo(iso: string) {
  const mins = Math.floor(ageMs(iso) / 60000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `เมื่อ ${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `เมื่อ ${hours} ชั่วโมงที่แล้ว`;
  return `เมื่อ ${Math.floor(hours / 24)} วันที่แล้ว`;
}

// "รอ 2 ชม." / "รอ 1 วัน"
function waitLabel(iso: string) {
  const mins = Math.floor(ageMs(iso) / 60000);
  if (mins < 60) return "รอสักครู่";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `รอ ${hours} ชม.`;
  return `รอ ${Math.floor(hours / 24)} วัน`;
}

function waitDays(iso: string) {
  return Math.floor(ageMs(iso) / 86400000);
}

function inMonth(iso: string | null, year: number, month: number) {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() === month;
}

// คำขอนี้ "ถึงคิวของฝ่ายบัญชี" หรือไม่
// - คำขอต้องยังรออนุมัติ (ถ้าหัวหน้าตีกลับ สถานะเป็น "ตีกลับ" จะไม่ขึ้นหน้านี้)
// - ขั้นปัจจุบันต้องเป็นขั้นฝ่ายบัญชีที่ยังเป็น "รอ"
// - ทุกขั้นก่อนหน้าต้องอนุมัติครบแล้ว
//   ยอด ≤ 3,000: ไม่มีขั้นก่อนหน้า ส่งมาบัญชีทันที
//   ยอดเกิน 3,000: หัวหน้า (และผอ. ถ้ามีในกฎ) ต้องกดอนุมัติก่อน
function isWaitingForAccountant(r: ExpenseRequest) {
  if (r.status !== "รออนุมัติ") return false;
  const step = r.approvalSteps[r.currentStep];
  if (!step || step.role !== ACCOUNTANT_ROLE || step.status !== "รอ") {
    return false;
  }
  return r.approvalSteps
    .slice(0, r.currentStep)
    .every((s) => s.status === "อนุมัติ");
}

// เวลาที่คำขอ "มาถึงบัญชี" = เวลาที่ขั้นก่อนหน้าอนุมัติ (ไม่มีขั้นก่อนหน้า = เวลาที่ส่ง)
function arrivedAt(r: ExpenseRequest) {
  const prev = r.approvalSteps[r.currentStep - 1];
  return prev?.at ?? r.createdAt;
}

// ป้ายสถานะของคำขอที่บัญชีดำเนินการไปแล้ว
function statusBadge(r: ExpenseRequest) {
  if (r.status === "อนุมัติแล้ว")
    return {
      text: "อนุมัติแล้ว",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  if (r.status === "ตีกลับ")
    return {
      text: "ตีกลับ",
      cls: "bg-rose-50 text-rose-600 border-rose-200",
    };
  const next = r.approvalSteps[r.currentStep];
  return {
    text: next ? `รอ${next.label}` : "กำลังดำเนินการ",
    cls: "bg-amber-50 text-amber-600 border-amber-200",
  };
}

// รวมงบรายโครงการให้เป็นรายฝ่าย (เรียงจากใช้เปอร์เซ็นต์มากไปน้อย)
function groupByDept(projects: Projects): DeptBudget[] {
  const map = new Map<
    string,
    { limit: number; used: number; cats: Map<string, number> }
  >();

  for (const p of projects) {
    const key = p.dept || "ไม่ระบุฝ่าย";
    const row = map.get(key) ?? { limit: 0, used: 0, cats: new Map() };
    for (const c of p.categories) {
      row.limit += c.limit;
      row.used += c.used;
      row.cats.set(c.name, (row.cats.get(c.name) ?? 0) + c.used);
    }
    map.set(key, row);
  }

  return Array.from(map.entries())
    .map(([dept, v]) => ({
      dept,
      limit: v.limit,
      used: v.used,
      pct: v.limit > 0 ? Math.round((v.used / v.limit) * 100) : 0,
      top: Array.from(v.cats.entries())
        .map(([name, used]) => ({ name, used }))
        .filter((c) => c.used > 0)
        .sort((a, b) => b.used - a.used)
        .slice(0, 2),
    }))
    .sort((a, b) => b.pct - a.pct);
}

// สีแถบงบ: ใช้เกือบหมดเป็นแดง ค่อนข้างมากเป็นเหลือง ปกติเป็นเขียว
function barColor(pct: number) {
  if (pct >= 90) return { bar: "bg-rose-500", text: "text-rose-600" };
  if (pct >= 70) return { bar: "bg-amber-500", text: "text-amber-600" };
  return { bar: "bg-emerald-500", text: "text-emerald-600" };
}

// สีวงกลมตัวอักษร (วนไปตามลำดับแถว)
const AVATARS = [
  "bg-emerald-100 text-green-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-600",
  "bg-sky-100 text-sky-700",
];

/* ------------------------------------------------------------------
   ชิ้นส่วนเล็ก
------------------------------------------------------------------- */
function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="text-gray-400">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-gray-900">{value}</div>
      <div className="mt-1 text-xs text-gray-400">{sub}</div>
    </div>
  );
}

function Avatar({ name, index }: { name: string; index: number }) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${AVATARS[index % AVATARS.length]}`}
    >
      {name.slice(0, 2)}
    </div>
  );
}

/* ------------------------------------------------------------------
   หน้า Home ฝ่ายบัญชี
------------------------------------------------------------------- */
export default function AccountantHome() {
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [projects, setProjects] = useState<Projects>([]);
  // วันที่/เวลาปัจจุบัน: ตั้งค่าใน useEffect เท่านั้น (เลี่ยง new Date() ตอน prerender)
  const [today, setToday] = useState("");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- อ่านได้หลังเปิดหน้าเท่านั้น */
    setRequests(loadRequests());
    setMe(loadUser());
    setProjects(loadProjects());
    setNow(Date.now());
    setToday(
      new Date().toLocaleDateString("th-TH", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    );
    /* eslint-enable react-hooks/set-state-in-effect */

    const onStorage = (e: StorageEvent) => {
      if (e.key === REQUESTS_KEY) {
        setRequests(loadRequests());
        setProjects(loadProjects());
      }
      if (e.key === "current_user") setMe(loadUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* ---------- รอคุณตรวจสอบ: หัวหน้าอนุมัติแล้ว (หรือยอด ≤ 3,000) ถึงคิวบัญชี ---------- */
  // รอนานสุดขึ้นก่อน (นับจากเวลาที่มาถึงบัญชี)
  const pending = requests
    .filter(isWaitingForAccountant)
    .sort(
      (a, b) =>
        new Date(arrivedAt(a)).getTime() - new Date(arrivedAt(b)).getTime(),
    );
  const pendingTotal = pending.reduce((s, r) => s + Number(r.total || 0), 0);
  const overdueCount = pending.filter(
    (r) => waitDays(arrivedAt(r)) >= OVERDUE_DAYS,
  ).length;

  /* ---------- สิ่งที่ "ฝ่ายบัญชี" ดำเนินการไปแล้ว (ล่าสุดอยู่บนสุด) ---------- */
  // ดูเฉพาะขั้นที่เป็นของบัญชี ไม่เอาที่หัวหน้า/ผอ. อนุมัติหรือตีกลับ
  const mine = requests
    .flatMap((r) => {
      const step = [...r.approvalSteps]
        .reverse()
        .find(
          (s) =>
            s.role === ACCOUNTANT_ROLE &&
            (s.status === "อนุมัติ" || s.status === "ตีกลับ"),
        );
      return step && step.at ? [{ r, at: step.at, result: step.status }] : [];
    })
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const recent = mine.slice(0, RECENT_LIMIT);

  /* ---------- ตัวเลขการ์ดสรุป ---------- */
  const d = now === null ? null : new Date(now);
  const year = d ? d.getFullYear() : -1;
  const month = d ? d.getMonth() : -1;
  const prev = d ? new Date(year, month - 1, 1) : null;

  // ตรวจแล้วเดือนนี้
  const doneThisMonth = mine.filter((m) => inMonth(m.at, year, month));
  const passed = doneThisMonth.filter((m) => m.result === "อนุมัติ").length;
  const rejected = doneThisMonth.filter((m) => m.result === "ตีกลับ").length;

  // ยอดเบิกเดือนนี้ vs เดือนก่อน (นับคำขอที่ส่งแล้ว ไม่รวมร่าง)
  const sent = requests.filter((r) => r.status !== "ร่าง");
  const sumOf = (y: number, m: number) =>
    sent
      .filter((r) => inMonth(r.createdAt, y, m))
      .reduce((s, r) => s + Number(r.total || 0), 0);
  const monthTotal = d ? sumOf(year, month) : 0;
  const prevTotal = prev ? sumOf(prev.getFullYear(), prev.getMonth()) : 0;

  // งบคงเหลือทั้งปี (รวมทุกฝ่าย)
  const depts = groupByDept(projects);
  const totalLimit = depts.reduce((s, x) => s + x.limit, 0);
  const totalUsed = depts.reduce((s, x) => s + x.used, 0);
  const remaining = totalLimit - totalUsed;
  const remainPct =
    totalLimit > 0 ? Math.round((remaining / totalLimit) * 100) : 0;

  return (
    <div className="bg-[#F1F5F9] p-6 text-slate-800">
      <div>
        {/* ===== หัวหน้า ===== */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              สวัสดี {me ? me.fullName : "-"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{today}</p>
          </div>
        </header>

        {/* ===== การ์ดสรุป 4 ใบ ===== */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<ClockThree className="h-4 w-4" />}
            label="คำขอรอตรวจ"
            value={`${pending.length} คำขอ`}
            sub={
              <>
                ยอดรวม {baht(pendingTotal)}
                {overdueCount > 0 && (
                  <span className="ml-2 font-semibold text-rose-600">
                    รอนาน {OVERDUE_DAYS} วัน {overdueCount} คำขอ
                  </span>
                )}
              </>
            }
          />
          <StatCard
            icon={<Check className="h-4 w-4" />}
            label="ตรวจแล้ว"
            value={`${doneThisMonth.length} คำขอ`}
            sub={`ผ่าน ${passed} ตีกลับ ${rejected}`}
          />
          <StatCard
            icon={<Wallet2 className="h-4 w-4" />}
            label="ยอดเบิกเดือนนี้"
            value={baht(monthTotal)}
            sub={`เดือนก่อน ${baht(prevTotal)}`}
          />
          <StatCard
            icon={<Calendar className="h-4 w-4" />}
            label="งบคงเหลือทั้งปี"
            value={baht(remaining)}
            sub={`${remainPct}% ของงบ ${baht(totalLimit)}`}
          />
        </div>

        {/* ===== ซ้าย: รอคุณตรวจสอบ + อนุมัติล่าสุด / ขวา: การใช้งบแยกตามฝ่าย ===== */}
        {/* ขนาดเท่าหน้า Home ของหัวหน้า (การ์ดซ้าย w-180, การ์ดขวา 5/12) */}
        <div className="flex gap-5">
          {/* ---------- การ์ดซ้าย ---------- */}
          <div className="relative mt-5 flex w-180 flex-col justify-between rounded-2xl border-gray-100 bg-white p-6 shadow-sm">
            {/* รอคุณตรวจสอบ */}
            <div className="mb-1 flex items-center justify-between">
              <div>
                <span className="text-md font-bold">รอคุณตรวจสอบ</span>
                <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-600">
                  {pending.length}
                </span>
              </div>
              <button className="flex items-center gap-1 text-xs font-bold text-green-700">
                ดูทั้งหมด <ArrowRight size={15} />
              </button>
            </div>

            {/* พื้นที่สูงเท่า 3 แถวเสมอ */}
            <div style={{ minHeight: 3 * ROW_H }}>
              {pending.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center gap-2 text-gray-400"
                  style={{ height: 3 * ROW_H }}
                >
                  <CheckCircle1 />
                  <span className="text-sm">ไม่มีคำขอรอตรวจ</span>
                </div>
              ) : (
                pending.slice(0, PENDING_LIMIT).map((r, i) => {
                  const name = r.requester?.fullName ?? "-";
                  const arrived = arrivedAt(r);
                  const before = r.approvalSteps[r.currentStep - 1];
                  const late = waitDays(arrived) >= OVERDUE_DAYS;
                  return (
                    <div key={r.id} className={ROW_GRID}>
                      {/* คอลัมน์ 1: ผู้ขอ + ชื่อคำขอ + ใครอนุมัติมาก่อน */}
                      <div className="flex min-w-0 items-center">
                        <Avatar name={name} index={i} />
                        <div className="ml-3 flex min-w-0 flex-col">
                          <div className="truncate font-bold">{r.title}</div>
                          <div className="truncate text-xs text-gray-400">
                            {name} ·{" "}
                            {before
                              ? `${before.label}อนุมัติ${timeAgo(arrived)}`
                              : `ส่ง${timeAgo(r.createdAt)}`}
                          </div>
                        </div>
                      </div>

                      {/* คอลัมน์ 2: เวลารอ (เกินกำหนดเป็นสีแดง) */}
                      <div className="flex justify-center">
                        <span
                          className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs ${
                            late
                              ? "border-rose-200 bg-rose-50 font-semibold text-rose-600"
                              : "border-amber-200 bg-amber-50 text-amber-600"
                          }`}
                        >
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
                          href={`${REVIEW_PATH}?id=${encodeURIComponent(r.id)}`}
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

            {/* แจ้งเตือน */}
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200/60 bg-gray-50 p-3.5 text-xs text-gray-500">
              <div className="flex h-5 w-5 items-center justify-center rounded-xl">
                <CheckCircle1 />
              </div>
              <span>
                คำขอที่รอเกิน {OVERDUE_DAYS} วันระบบจะแจ้งเตือนคุณอีกครั้ง
              </span>
            </div>

            {/* อนุมัติล่าสุด (เฉพาะที่ฝ่ายบัญชีดำเนินการ) */}
            <div className="mt-5">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-md font-bold">อนุมัติล่าสุด</span>
                <button className="flex items-center gap-1 text-xs font-bold text-green-700">
                  ดูประวัติ <ArrowRight size={16} />
                </button>
              </div>
            </div>

            <div style={{ minHeight: RECENT_LIMIT * ROW_H }}>
              {recent.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center gap-2 text-gray-400"
                  style={{ height: RECENT_LIMIT * ROW_H }}
                >
                  <CheckCircle1 />
                  <span className="text-sm">ยังไม่มีรายการที่ดำเนินการ</span>
                </div>
              ) : (
                recent.map(({ r, at, result }, i) => {
                  const name = r.requester?.fullName ?? "-";
                  const badge = statusBadge(r);
                  return (
                    <div key={r.id} className={ROW_GRID}>
                      <div className="flex min-w-0 items-center">
                        <Avatar name={name} index={i + 1} />
                        <div className="ml-3 flex min-w-0 flex-col">
                          <div className="truncate font-bold">{r.title}</div>
                          <div className="truncate text-xs text-gray-400">
                            {name} ·{" "}
                            {result === "ตีกลับ" ? "ตีกลับ" : "อนุมัติ"}
                            {timeAgo(at)}
                          </div>
                        </div>
                      </div>

                      {/* คอลัมน์ 2 เว้นว่างให้ตรงกับด้านบน */}
                      <div />

                      <div className="text-right">
                        <span className="font-bold tabular-nums">
                          {baht(r.total)}
                        </span>
                      </div>

                      <div className="flex justify-end">
                        <span
                          className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs ${badge.cls}`}
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

          {/* ---------- การ์ดขวา: การใช้งบแยกตามฝ่าย ---------- */}
          <div className="mt-5 w-full self-start rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:w-5/12">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800">
                การใช้งบแยกตามฝ่าย
              </h2>
              <span className="text-xs text-gray-400">
                {year > 0 ? `ปี ${year + 543}` : ""}
              </span>
            </div>

            {depts.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-gray-400">
                <CheckCircle1 />
                <span className="text-sm">ยังไม่มีข้อมูลงบประมาณ</span>
              </div>
            ) : (
              <ul>
                {depts.map((x, i) => {
                  const c = barColor(x.pct);
                  return (
                    <li
                      key={x.dept}
                      className={`py-4 ${i > 0 ? "border-t border-gray-100" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900">
                          {x.dept}
                        </span>
                        <span className={`text-xs font-bold ${c.text}`}>
                          {x.pct}%
                        </span>
                      </div>

                      {/* แถบความคืบหน้า (เกิน 100% ก็แสดงเต็มหลอด) */}
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
                          style={{ width: `${Math.min(100, x.pct)}%` }}
                        />
                      </div>

                      <div className="mt-2 text-xs">
                        <span className="font-bold text-gray-800">
                          {baht(x.used)}
                        </span>
                        <span className="text-gray-400">
                          {" "}
                          / {baht(x.limit)}
                        </span>
                      </div>

                      {x.top.length > 0 && (
                        <div className="mt-0.5 text-xs text-gray-400">
                          ใช้มากสุด:{" "}
                          {x.top
                            .map((t) => `${t.name} ${baht(t.used)}`)
                            .join("  ")}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="mt-1 border-t border-gray-100 pt-3 text-xs text-gray-400">
              กดที่ฝ่ายเพื่อดูรายละเอียดในหน้างบประมาณ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}