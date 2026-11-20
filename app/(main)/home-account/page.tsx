"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { REQUESTS_KEY, historyType, loadRequests, type SavedRequest } from "@/data/request";
import { getDepartmentBudget } from "@/data/budget";
import { canApproveStep } from "@/data/approval";
import type { Credential } from "@/data/credential";
import { loadOrganization } from "@/data/organization";
import { getCurrentUser } from "@/utils/login";
import { bkkMonth, bkkYear, shiftMonth } from "@/utils/date";
import MyRequestsCard from "@/components/my-requests-card";
import NotificationsCard from "@/components/notifications-card";
import { BudgetCard } from "@/components/budget-card";
import {
  ArrowRight,
  Check,
  CheckCircle1,
  ChevronDown,
  ClockThree,
} from "@tailgrids/icons";

/* ------------------------------------------------------------------
   ตั้งค่า
------------------------------------------------------------------- */
const REVIEW_PATH = "/home-account/approve"; // ← หน้าตรวจสอบคำขอ ปรับให้ตรงชื่อโฟลเดอร์
const PENDING_LIMIT = 5; // จำนวนแถวสูงสุดใน "รอคุณตรวจสอบ"
const RECENT_LIMIT = 5; // จำนวนแถวสูงสุดใน "อนุมัติล่าสุด"
const OVERDUE_DAYS = 3; // รอเกินกี่วันถือว่าล่าช้า
const DEPT_PREVIEW = 4; // การ์ดงบแยกตามแผนก: แสดงก่อนกี่แผนก (ที่เหลือกดกางดู)

// role ของขั้นฝ่ายบัญชีในเส้นทางอนุมัติ (ตรงกับ data/approval.ts)
// หน้านี้ตัดสินจาก "ขั้นของคำขอ" ไม่ใช่จากชื่อ/role ของคนที่ล็อกอิน
const ACCOUNTANT_ROLE = "ACCOUNTANT";

// ความกว้างคอลัมน์ของแถวรายการ (เท่ากับหน้า Home ของหัวหน้า)
// ใช้ร่วมกันทั้ง "รอคุณตรวจสอบ" และ "อนุมัติล่าสุด" ถ้าจะปรับ แก้ที่นี่ที่เดียว
// (ชื่อ | ป้ายรอ | ยอดเงิน | ปุ่ม/สถานะ)
// ชื่อคำขอยืดเต็มที่เหลือ (ตัด … ถ้ายาว) · ป้ายรอ / ยอดเงิน / ปุ่ม กว้างตามเนื้อหา ไม่ตัดบรรทัด
const ROW_GRID =
  "grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 border-b border-[#F1F5F9] py-3 last:border-b-0";

/* ------------------------------------------------------------------
   ชนิดข้อมูล: ใช้ของกลางใน data/ (คำขอ = SavedRequest · ผู้ใช้ = Credential)
------------------------------------------------------------------- */
type ExpenseRequest = SavedRequest;
type CurrentUser = Credential;

// งบของ 1 ฝ่าย (รวมทุกโครงการ/หมวดในฝ่ายนั้น)
interface DeptBudget {
  dept: string;
  limit: number;
  used: number;
  pct: number;
  top: { name: string; used: number }[]; // หมวดที่ใช้มากสุด
}

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

// อยู่ในเดือน key ("2026-11") ตามเวลาไทย
function inMonth(iso: string | null, key: string) {
  return !!iso && bkkMonth(iso) === key;
}


// เวลา "ส่งใหม่" ครั้งล่าสุด (ไม่เคยถูกตีกลับ = null)
function resentAt(r: ExpenseRequest) {
  let latest: string | null = null;
  for (const h of r.history ?? []) {
    if (historyType(h) === "ส่งใหม่" && (!latest || h.at > latest)) latest = h.at;
  }
  return latest;
}

// เวลาที่คำขอ "มาถึงบัญชี" = เวลาที่ขั้นก่อนหน้าอนุมัติ (ไม่มีขั้นก่อนหน้า = เวลาที่ส่ง)
// บัญชี/การเงินตีกลับแล้วส่งใหม่ตรงมาที่บัญชี → ขั้นก่อนหน้ายังเป็นเวลาเก่า จึงใช้เวลาส่งใหม่แทน
function arrivedAt(r: ExpenseRequest) {
  const prev = r.approvalSteps[r.currentStep - 1];
  const base = prev?.at ?? r.createdAt;
  const resent = resentAt(r);
  return resent && resent > base ? resent : base;
}

// ป้ายสถานะของคำขอที่บัญชีดำเนินการไปแล้ว
// ป้ายสถานะ: class ร่วมใน globals.css (status-*)
function statusBadge(r: ExpenseRequest) {
  if (r.status === "จ่ายแล้ว") return { text: "จ่ายแล้ว", cls: "status status-paid" };
  if (r.status === "อนุมัติแล้ว") return { text: "อนุมัติแล้ว", cls: "status status-approved" };
  if (r.status === "ตีกลับ") return { text: "ตีกลับ", cls: "status status-rejected" };
  const next = r.approvalSteps[r.currentStep];
  return { text: next ? `รอ${next.label}` : "กำลังดำเนินการ", cls: "status status-pending" };
}

// งบรายแผนกของปีนั้น: วงเงิน = งบที่บัญชีแบ่งให้แผนก (getDepartmentBudget)
// เรียงจากใช้เยอะสุด · ซ่อนแผนกที่ไม่มีงบและไม่มีการใช้
function readDeptBudgets(requests: SavedRequest[], year: number): DeptBudget[] {
  return loadOrganization()
    .departments.map((d) => {
      const b = getDepartmentBudget(d.id, requests, year);
      const cats = new Map<string, number>();
      for (const p of b.projects)
        for (const c of p.categories) cats.set(c.name, (cats.get(c.name) ?? 0) + c.used);
      return {
        dept: d.name,
        limit: b.limit,
        used: b.used,
        pct: b.limit > 0 ? Math.round((b.used / b.limit) * 100) : 0,
        top: Array.from(cats.entries())
          .map(([name, used]) => ({ name, used }))
          .filter((c) => c.used > 0)
          .sort((a, b) => b.used - a.used)
          .slice(0, 2),
      };
    })
    .filter((x) => x.limit > 0 || x.used > 0)
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
  tone,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  tone: string; // สีกล่องไอคอน
  label: string;
  value: string;
  sub: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`} aria-hidden="true">
        {icon}
      </div>
      <div className="mt-4">
        <div className="text-sm text-[#64748B]">{label}</div>
        <div className="money mt-1 text-3xl font-bold text-[#0F172A]">{value}</div>
        <div className="mt-1 text-xs text-[#64748B]">{sub}</div>
      </div>
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
  // วันที่/เวลาปัจจุบัน: ตั้งค่าใน useEffect เท่านั้น (เลี่ยง new Date() ตอน prerender)
  const [today, setToday] = useState("");
  const [now, setNow] = useState<number | null>(null);
  // การใช้งบแยกตามแผนก: ย่อไว้ก่อน (แสดง DEPT_PREVIEW แผนกที่ใช้มากสุด) กดแล้วกางที่เหลือ
  const [showAllDepts, setShowAllDepts] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- อ่านได้หลังเปิดหน้าเท่านั้น */
    setRequests(readRequests());
    setMe(getCurrentUser());
    setNow(Date.now());
    setToday(
      new Date().toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    );
    /* eslint-enable react-hooks/set-state-in-effect */

    const onStorage = (e: StorageEvent) => {
      if (e.key === REQUESTS_KEY) {
        setRequests(readRequests());
          }
      if (e.key === "current_user") setMe(getCurrentUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* ---------- รอคุณตรวจสอบ: หัวหน้าอนุมัติแล้ว (หรือยอด ≤ 3,000) ถึงคิวบัญชี ---------- */
  // รอนานสุดขึ้นก่อน (นับจากเวลาที่มาถึงบัญชี)
  const pending = requests
    .filter((r) => canApproveStep(r, me))
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
  // วัน/เดือน/ปีตามเวลาไทย (utils/date.ts)
  const year = now === null ? -1 : bkkYear(now);
  const month = now === null ? "" : bkkMonth(now);

  // ตรวจแล้วเดือนนี้
  const doneThisMonth = mine.filter((m) => inMonth(m.at, month));
  const passed = doneThisMonth.filter((m) => m.result === "อนุมัติ").length;
  const rejected = doneThisMonth.filter((m) => m.result === "ตีกลับ").length;

  // ยอดเบิกเดือนนี้ vs เดือนก่อน (นับคำขอที่ส่งแล้ว ไม่รวมร่าง)
  const sent = requests.filter((r) => r.status !== "ร่าง");
  const sumOf = (key: string) =>
    sent
      .filter((r) => inMonth(r.createdAt, key))
      .reduce((s, r) => s + Number(r.total || 0), 0);
  const monthTotal = month ? sumOf(month) : 0;
  const prevTotal = month ? sumOf(shiftMonth(month, -1)) : 0;

  // งบคงเหลือทั้งปี (รวมทุกฝ่าย)
  const depts = year > 0 ? readDeptBudgets(requests, year) : [];
  const totalLimit = depts.reduce((s, x) => s + x.limit, 0);
  const totalUsed = depts.reduce((s, x) => s + x.used, 0);

  // คำขอที่คนที่ login เป็นผู้ขอเอง → การ์ด "คำขอของฉัน"
  const myRequests = me
    ? requests.filter((r) => r.requester && String(r.requester.id) === String(me.id))
    : [];

  return (
    <div className="text-[#0F172A]">
      <div>
        {/* ===== หัวหน้า ===== */}
        <header className="mb-9 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-bold">
              สวัสดี {me ? me.fullName : "-"}
            </h1>
            <p className="mt-3 text-sm text-[#64748B]">
              {today} · คำขอรอคุณตรวจ{" "}
              <span className="font-semibold text-[#047857]">{pending.length} รายการ</span>
            </p>
          </div>
        </header>

        {/* แต่ละส่วนห่างกัน 36px เหมือนหน้า employee */}
        <div className="flex flex-col gap-9">
        {/* ===== การ์ดสรุป: งบทั้งปี (การ์ดเดียวกับทุกหน้า) + รอตรวจ + ตรวจแล้วเดือนนี้ ===== */}
        <div className="grid grid-cols-4 gap-5">
          <BudgetCard
            className="col-span-2"
            label="งบคงเหลือทั้งปี (ทุกแผนก)"
            limit={totalLimit}
            used={totalUsed}
            year={year > 0 ? year : null}
            note={`ยอดเบิกเดือนนี้ ${baht(monthTotal)} · เดือนก่อน ${baht(prevTotal)}`}
          />
          <StatCard
            icon={<ClockThree className="h-5 w-5" />}
            tone="bg-amber-50 text-amber-600"
            label="คำขอรอตรวจ"
            value={`${pending.length} คำขอ`}
            sub={
              <>
                ยอดรวม <span className="money">{baht(pendingTotal)}</span>
                {overdueCount > 0 && (
                  <span className="mt-0.5 block font-semibold text-[#BE123C]">
                    รอเกิน {OVERDUE_DAYS} วัน {overdueCount} คำขอ
                  </span>
                )}
              </>
            }
          />
          <StatCard
            icon={<Check className="h-5 w-5" />}
            tone="bg-emerald-100 text-emerald-700"
            label="ตรวจแล้วเดือนนี้"
            value={`${doneThisMonth.length} คำขอ`}
            sub={`ผ่าน ${passed} · ตีกลับ ${rejected}`}
          />
        </div>

        {/* ===== ซ้าย: รอคุณตรวจสอบ + อนุมัติล่าสุด / ขวา: การใช้งบแยกตามแผนก ===== */}
        {/* grid 4 คอลัมน์เหมือนหน้า employee: ซ้าย 2 คอลัมน์ / ขวา 2 คอลัมน์ */}
        <div className="grid grid-cols-4 gap-5">
          {/* ---------- การ์ดซ้าย ---------- */}
          {/* self-start: สูงตามจำนวนรายการ (มากสุด 5 ต่อส่วน) เริ่มจากบนสุด ไม่ยืดตามการ์ดขวา */}
          <div className="relative col-span-2 flex flex-col self-start rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            {/* รอคุณตรวจสอบ */}
            <div className="mb-1 flex items-center justify-between">
              <div>
                <span className="text-md font-bold">รอคุณตรวจสอบ</span>
                <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-600">
                  {pending.length}
                </span>
              </div>
              <Link href="/all-request" className="flex items-center gap-1 text-xs font-semibold text-[#047857] hover:underline">
                ดูทั้งหมด <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            {/* สูงตามจำนวนรายการ มากสุด PENDING_LIMIT */}
            <div>
              {pending.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-[#64748B]">
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
                          <div className="truncate text-xs text-[#64748B]">
                            {name} ·{" "}
                            {arrived === resentAt(r)
                              ? `ส่งใหม่${timeAgo(arrived)}`
                              : before
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
                        <span className="money font-bold">
                          {baht(r.total)}
                        </span>
                      </div>

                      {/* คอลัมน์ 4: ปุ่มตรวจสอบ */}
                      <div className="flex justify-end">
                        <Link
                          href={`${REVIEW_PATH}?id=${encodeURIComponent(r.id)}`}
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

            {/* แจ้งเตือน */}
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-xs text-[#64748B]">
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
                <span className="text-md font-bold">ตรวจล่าสุด</span>
                <Link href="/approval-history" className="flex items-center gap-1 text-xs font-semibold text-[#047857] hover:underline">
                  ดูประวัติ <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* สูงตามจำนวนรายการ มากสุด RECENT_LIMIT */}
            <div>
              {recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-[#64748B]">
                  <CheckCircle1 />
                  <span className="text-sm">ยังไม่มีคำขอที่คุณตรวจ</span>
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
                          <div className="truncate text-xs text-[#64748B]">
                            {name} ·{" "}
                            {result === "ตีกลับ" ? "ตีกลับ" : "ตรวจผ่าน"}
                            {timeAgo(at)}
                          </div>
                        </div>
                      </div>

                      {/* คอลัมน์ 2 เว้นว่างให้ตรงกับด้านบน */}
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

          {/* ---------- การ์ดขวา: การใช้งบแยกตามแผนก ---------- */}
          {/* ฝั่งขวา: การใช้งบแยกตามแผนก + คำขอของฉัน เรียงลงมา */}
          <div className="col-span-2 flex flex-col gap-5 self-start">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0F172A]">
                การใช้งบแยกตามแผนก
              </h2>
              <span className="text-xs text-[#64748B]">
                {year > 0 ? `ปี ${year + 543}` : ""}
              </span>
            </div>

            {depts.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-[#64748B]">
                <CheckCircle1 />
                <span className="text-sm">ยังไม่มีข้อมูลงบประมาณ</span>
              </div>
            ) : (
              <ul>
                {(showAllDepts ? depts : depts.slice(0, DEPT_PREVIEW)).map((x, i) => {
                  const c = barColor(x.pct);
                  return (
                    <li
                      key={x.dept}
                      className={`py-4 ${i > 0 ? "border-t border-[#F1F5F9]" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#0F172A]">
                          {x.dept}
                        </span>
                        <span className={`text-xs font-bold ${c.text}`}>
                          {x.pct}%
                        </span>
                      </div>

                      {/* แถบความคืบหน้า (เกิน 100% ก็แสดงเต็มหลอด) */}
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
                          style={{ width: `${Math.min(100, x.pct)}%` }}
                        />
                      </div>

                      <div className="mt-2 text-xs">
                        <span className="font-bold text-[#0F172A]">
                          {baht(x.used)}
                        </span>
                        <span className="text-[#64748B]">
                          {" "}
                          / {baht(x.limit)}
                        </span>
                      </div>

                      {x.top.length > 0 && (
                        <div className="mt-0.5 text-xs text-[#64748B]">
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

            {/* กาง / ย่อ: เรียงจากใช้งบมากสุดแล้ว → แผนกที่ต้องจับตาอยู่บนเสมอ */}
            {depts.length > DEPT_PREVIEW && (
              <button
                type="button"
                aria-expanded={showAllDepts}
                onClick={() => setShowAllDepts((v) => !v)}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border-t border-[#F1F5F9] py-2.5 text-sm font-semibold text-[#047857] hover:bg-[#ECFDF5]"
              >
                {showAllDepts ? "ย่อรายการ" : `แสดงอีก ${depts.length - DEPT_PREVIEW} แผนก`}
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`transition-transform ${showAllDepts ? "rotate-180" : ""}`}
                />
              </button>
            )}

            <p className="mt-1 border-t border-[#F1F5F9] pt-3 text-xs text-[#64748B]">
              แสดงเฉพาะแผนกที่มีงบหรือมีการใช้จ่ายในปีนี้ · เรียงจากใช้งบมากสุด
            </p>
          </div>

          <NotificationsCard me={me} />
          <MyRequestsCard mine={myRequests} />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}