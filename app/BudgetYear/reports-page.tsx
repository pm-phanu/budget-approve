"use client";

/**
 * หน้า "รายงานงบประมาณ"
 * - ใช้ Header และ formatBaht ที่ทำไว้แล้วจากหน้าจัดการงบประมาณ
import { useMemo, useState } from "react";
import { Header } from "@/components/budget/Header";
import { formatBaht } from "@/lib/format";

/* ============================== Types ============================== */

type DeptKey = "marketing" | "sales" | "it" | "other";
type Period = "week" | "month" | "quarter" | "year";

interface Expense {
  id: string;
  dept: DeptKey;
  /** ISO date: YYYY-MM-DD (ค.ศ.) */
  date: string;
  title: string;
  docNo: string;
  requester: string;
  amount: number;
}

/* ============================ Mock data ============================ */
// TODO: ภายหลังย้ายไปดึงผ่าน src/lib (เช่น getExpenses()) เหมือนหน้าจัดการงบประมาณ

const FOCUS_DEPT: DeptKey = "sales";
const CURRENT_MONTH = "2026-10";
const MONTHLY_DEPT_BUDGET = 200_000;
const ANNUAL_BUDGET = 10_000_000;
const ANNUAL_USED = 4_100_000;
const REQUESTS = { approved: 37, pending: 5 };
const APPROVAL = { avgDays: 1.4, targetDays: 2 };

/** ยอดเบิกจ่ายฝ่ายขายย้อนหลัง 5 เดือนก่อนหน้า (เดือนปัจจุบันคำนวณจาก EXPENSES) */
const SALES_HISTORY: { label: string; value: number }[] = [
  { label: "พ.ค.", value: 8_250 },
  { label: "มิ.ย.", value: 11_000 },
  { label: "ก.ค.", value: 6_900 },
  { label: "ส.ค.", value: 13_200 },
  { label: "ก.ย.", value: 10_100 },
];

const EXPENSES: Expense[] = [
  { id: "1", dept: "sales", date: "2026-10-28", title: "ค่าเดินทางสัมมนา", docNo: "EXP-6910-042", requester: "คุณ เนส", amount: 4_800 },
  { id: "2", dept: "sales", date: "2026-10-24", title: "ค่ารับรองลูกค้า", docNo: "EXP-6910-038", requester: "คุณพลอย", amount: 3_600 },
  { id: "3", dept: "sales", date: "2026-10-21", title: "ค่าอุปกรณ์สำนักงาน", docNo: "EXP-6910-035", requester: "คุณเมย์", amount: 3_200 },
  { id: "4", dept: "sales", date: "2026-10-18", title: "ค่าขนส่งเอกสาร", docNo: "EXP-6910-031", requester: "คุณต้น", amount: 2_000 },
  { id: "5", dept: "marketing", date: "2026-10-27", title: "ค่าโฆษณา Facebook Ads", docNo: "EXP-6910-041", requester: "คุณมุก", amount: 12_000 },
  { id: "6", dept: "marketing", date: "2026-10-15", title: "ค่าถ่ายทำวิดีโอสินค้า", docNo: "EXP-6910-028", requester: "คุณบีม", amount: 8_500 },
  { id: "7", dept: "it", date: "2026-10-26", title: "ค่าต่อโดเมนและโฮสติ้ง", docNo: "EXP-6910-040", requester: "คุณก้อง", amount: 6_400 },
  { id: "8", dept: "it", date: "2026-10-12", title: "ค่าลิขสิทธิ์ซอฟต์แวร์", docNo: "EXP-6910-024", requester: "คุณอาร์ม", amount: 9_900 },
  { id: "9", dept: "other", date: "2026-10-22", title: "ค่าน้ำมันรถบริษัท", docNo: "EXP-6910-036", requester: "คุณหนุ่ม", amount: 2_700 },
  { id: "10", dept: "other", date: "2026-10-09", title: "ค่าอบรมพนักงาน", docNo: "EXP-6910-019", requester: "คุณฝน", amount: 5_500 },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "รายสัปดาห์" },
  { key: "month", label: "รายเดือน" },
  { key: "quarter", label: "รายไตรมาส" },
  { key: "year", label: "รายปี" },
];

const DEPT_TABS: { key: DeptKey; label: string }[] = [
  { key: "marketing", label: "การตลาด" },
  { key: "sales", label: "ขาย" },
  { key: "it", label: "ไอที" },
  { key: "other", label: "อื่นๆ" },
];

const DEPT_NAME: Record<DeptKey, string> = {
  marketing: "ฝ่ายการตลาด",
  sales: "ฝ่ายขาย",
  it: "ฝ่ายไอที",
  other: "ฝ่ายอื่น ๆ",
};

/* ============================ Helpers ============================= */

const sum = (nums: number[]): number => nums.reduce((a, b) => a + b, 0);

const nf = new Intl.NumberFormat("th-TH");

/** 2026-10-28 -> 28/10/69 (พ.ศ. 2 หลัก) */
function formatThaiShortDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${String((Number(y) + 543) % 100).padStart(2, "0")}`;
}

/** 2026-10-28 -> ต.ค. 2569 */
function formatThaiMonthYear(iso: string): string {
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const [y, m] = iso.split("-");
  return `${months[Number(m) - 1]} ${Number(y) + 543}`;
}

/* ============================== Page =============================== */

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [dept, setDept] = useState<DeptKey>("sales");
  const [query, setQuery] = useState("");

  // รายการเบิกจ่ายของเดือนปัจจุบัน
  const monthExpenses = useMemo(
    () => EXPENSES.filter((e) => e.date.startsWith(CURRENT_MONTH)),
    [],
  );

  const focusMonth = useMemo(
    () => monthExpenses.filter((e) => e.dept === FOCUS_DEPT),
    [monthExpenses],
  );
  const focusMonthTotal = sum(focusMonth.map((e) => e.amount));
  const remaining = MONTHLY_DEPT_BUDGET - focusMonthTotal;
  const remainingPct = (remaining / MONTHLY_DEPT_BUDGET) * 100;

  const requestsTotal = REQUESTS.approved + REQUESTS.pending;
  const annualPct = (ANNUAL_USED / ANNUAL_BUDGET) * 100;

  const chartData = [
    ...SALES_HISTORY,
    { label: "ต.ค.", value: focusMonthTotal },
  ];
  const chartMax = Math.max(...chartData.map((d) => d.value), 1);

  const topExpenses = [...focusMonth].sort((a, b) => b.amount - a.amount).slice(0, 4);

  const tableRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return monthExpenses
      .filter((e) => e.dept === dept)
      .filter((e) => (q ? e.docNo.toLowerCase().includes(q) : true))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [monthExpenses, dept, query]);
  const deptMonthTotal = sum(
    monthExpenses.filter((e) => e.dept === dept).map((e) => e.amount),
  );
  const deptMonthCount = monthExpenses.filter((e) => e.dept === dept).length;

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* TODO: วาง Sidebar ของเพื่อนตรงนี้ (กว้างประมาณ 260px) */}
      <aside className="hidden w-[260px] shrink-0 bg-[#0f172a] lg:block" aria-hidden />

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-[1400px] space-y-6">
          <Header
            title="รายงานงบประมาณ"
            subtitle={`ข้อมูลตัวอย่าง · ตุลาคม 2569 · สรุป ณ 31 ต.ค. 2569`}
          />

          {/* ---------- แท็บช่วงเวลา ---------- */}
          <Segmented
            ariaLabel="ช่วงเวลา"
            options={PERIODS}
            value={period}
            onChange={setPeriod}
          />

          {/* ---------- KPI 4 การ์ด ---------- */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* งบเดือนนี้คงเหลือ (การ์ดเข้ม) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#0f2a2e] to-emerald-700 p-6 text-white shadow-sm">
              <span className="pointer-events-none absolute -right-16 -top-12 h-56 w-56 rounded-full border border-emerald-400/20" />
              <span className="pointer-events-none absolute -right-6 -top-4 h-40 w-40 rounded-full border border-emerald-400/20" />
              <div className="relative">
                <div className="flex items-center gap-2 text-sm text-slate-200">
                  <IconWallet className="text-emerald-300" />
                  งบเดือนนี้คงเหลือ
                </div>
                <p className="mt-3 text-4xl font-bold">{nf.format(remaining)}</p>
                <p className="mt-1 text-xs text-slate-300">
                  งบ{DEPT_NAME[FOCUS_DEPT]} {formatBaht(MONTHLY_DEPT_BUDGET)}
                </p>
                <Progress percent={remainingPct} className="mt-4 bg-white/20" barClassName="bg-emerald-400" />
              </div>
            </div>

            <KpiCard icon={<IconDoc />} label="คำขอเบิกทั้งหมด">
              <p className="text-4xl font-bold">
                {requestsTotal} <span className="text-base font-medium text-slate-500">รายการ</span>
              </p>
              <p className="mt-3 text-sm text-slate-500">
                อนุมัติ {REQUESTS.approved} · รอตรวจ {REQUESTS.pending}
              </p>
            </KpiCard>

            <KpiCard icon={<IconClock />} label="ระยะเวลาอนุมัติเฉลี่ย">
              <p className="text-4xl font-bold">
                {APPROVAL.avgDays} <span className="text-base font-medium text-slate-500">วัน</span>
              </p>
              <p className="mt-3 text-sm text-slate-500">เป้าหมายไม่เกิน {APPROVAL.targetDays} วัน</p>
            </KpiCard>

            <KpiCard icon={<IconTrend />} label="ใช้งบประจำปีแล้ว">
              <p className="text-4xl font-bold">{Math.round(annualPct)}%</p>
              <Progress percent={annualPct} className="mt-5 bg-slate-200" barClassName="bg-emerald-600" />
            </KpiCard>
          </section>

          {/* ---------- กราฟ + รายการสูงสุด ---------- */}
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">ยอดเบิกจ่าย{DEPT_NAME[FOCUS_DEPT]}ย้อนหลัง 6 เดือน</h2>
              <p className="mt-1 text-xs text-slate-500">{DEPT_NAME[FOCUS_DEPT]} · หน่วย: บาท</p>

              <div
                className="mt-8 flex h-64 items-end gap-3 border-b border-slate-200 sm:gap-6"
                role="img"
                aria-label="กราฟแท่งยอดเบิกจ่ายย้อนหลัง 6 เดือน"
              >
                {chartData.map((d, i) => {
                  const latest = i === chartData.length - 1;
                  return (
                    <div key={d.label} className="flex h-full flex-1 flex-col justify-end">
                      <span
                        className={`mb-2 text-center text-xs ${
                          latest ? "font-semibold text-emerald-600" : "text-slate-500"
                        }`}
                      >
                        {nf.format(d.value)}
                      </span>
                      <div
                        className={`mx-auto w-full max-w-[88px] rounded-t-lg ${
                          latest ? "bg-emerald-600" : "bg-slate-300"
                        }`}
                        style={{ height: `${(d.value / chartMax) * 82}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-3 sm:gap-6">
                {chartData.map((d, i) => (
                  <span
                    key={d.label}
                    className={`flex-1 text-center text-sm ${
                      i === chartData.length - 1 ? "font-semibold text-emerald-600" : "text-slate-500"
                    }`}
                  >
                    {d.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">รายการเบิกจ่ายสูงสุด</h2>
              <ol className="mt-4">
                {topExpenses.map((e, i) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-4 border-b border-slate-200 py-4 last:border-b-0"
                  >
                    <span className="w-4 text-center text-sm font-bold">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{e.title}</p>
                      <p className="text-xs text-slate-500">
                        {DEPT_NAME[e.dept]} · {formatThaiMonthYear(e.date)}
                      </p>
                    </div>
                    <span className="font-bold text-emerald-600">{formatBaht(e.amount)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* ---------- สรุปการใช้งบรายฝ่าย ---------- */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-xl font-bold">สรุปการใช้งบรายฝ่าย</h2>
              <label className="flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-slate-400 sm:w-80 focus-within:border-emerald-500">
                <IconSearch />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาเลขที่เอกสาร"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Segmented ariaLabel="ฝ่าย" options={DEPT_TABS} value={dept} onChange={setDept} />
              <p className="text-sm text-slate-500">
                ยอดเดือนนี้ {formatBaht(deptMonthTotal)} · {deptMonthCount} รายการที่เบิกจ่ายแล้ว
              </p>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-3 pr-4 font-normal">วันที่</th>
                    <th className="py-3 pr-4 font-normal">รายการ</th>
                    <th className="py-3 pr-4 font-normal">เลขที่เอกสาร</th>
                    <th className="py-3 pr-4 font-normal">ผู้ขอ</th>
                    <th className="py-3 font-normal">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((e) => (
                    <tr key={e.id} className="border-t border-slate-200">
                      <td className="py-3.5 pr-4">{formatThaiShortDate(e.date)}</td>
                      <td className="py-3.5 pr-4 font-bold">{e.title}</td>
                      <td className="py-3.5 pr-4">{e.docNo}</td>
                      <td className="py-3.5 pr-4">{e.requester}</td>
                      <td className="py-3.5 font-bold text-emerald-600">{formatBaht(e.amount)}</td>
                    </tr>
                  ))}
                  {tableRows.length === 0 && (
                    <tr className="border-t border-slate-200">
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        ไม่พบรายการ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

/* ========================= Small components ========================= */

interface SegmentedProps<T extends string> {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
  ariaLabel: string;
}

function Segmented<T extends string>({ options, value, onChange, ariaLabel }: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap rounded-2xl border border-slate-200 bg-white p-1"
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-colors ${
              active ? "bg-[#0f172a] text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Progress({
  percent,
  className = "",
  barClassName = "bg-emerald-600",
}: {
  percent: number;
  className?: string;
  barClassName?: string;
}) {
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(p)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full ${barClassName}`} style={{ width: `${p}%` }} />
    </div>
  );
}

/* ============================== Icons =============================== */

const svgProps = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconWallet({ className = "" }: { className?: string }) {
  return (
    <svg {...svgProps} width={20} height={20} className={className}>
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
      <path d="M21 12h-5a2 2 0 0 0 0 4h5z" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg {...svgProps}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IconTrend() {
  return (
    <svg {...svgProps}>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 5-6" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg {...svgProps} width={20} height={20}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
