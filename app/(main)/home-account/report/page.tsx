"use client";
// ════════════════════════════════════════════════════════════
//  หน้ารายงานงบประมาณ  (/home-account/report · เมนูเห็นเฉพาะฝ่ายบัญชี)
// ════════════════════════════════════════════════════════════

//   [1] ชนิดข้อมูล
//   [2] ค่าคงที่: แท็บช่วงเวลา   (งบอ่านจาก data/budget.ts · คำขอจาก data/request.ts)
//   [3] ฟังก์ชันช่วย (ใส่ลูกน้ำ, แปลงคำขอเป็นแถวรายงาน, 6 เดือนล่าสุด)
//   [4] หน้าหลัก (ส่วนคิด)
//       [4.1] state + อ่านคำขอจริง   [4.2] กรองตามช่วงเวลา
//       [4.3] ตัวเลขบนการ์ด   [4.4] เบิกสูงสุด 4 อันดับ
//       [4.5] ตารางรายฝ่าย    [4.6] กราฟ 6 เดือน
//       [4.7] สรุปงบตามโครงการ / หมวด
//   [5] หน้าจอ
//       [5.1] หัวข้อ          [5.2] แท็บช่วงเวลา   [5.3] การ์ด 4 ใบ
//       [5.4] กราฟ 6 เดือน    [5.5] เบิกสูงสุด      [5.6] งบตามโครงการ / หมวด
//       [5.7] ตารางรายฝ่าย
//   [6] ชิ้นส่วนที่ใช้ซ้ำ
//
// ════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { bkkMonth, bkkYear, monthLabel, shiftMonth } from "@/utils/date";
import {
  FileText,
  Search1,
  ClockThree,
  ErrorCircle,
} from "@tailgrids/icons";
import { BudgetCard } from "@/components/budget-card";
import {
  projectLimit,
  projectUsed,
  addRequestsToBudget,
  loadAllocations,
  type Project,
} from "@/data/budget";
import { loadRequests, type SavedRequest } from "@/data/request";
import { getCurrentUser } from "@/utils/login";

// ════════════════════════════════════════
//  [1] ชนิดข้อมูล
// ════════════════════════════════════════
// คำขอ 1 ใบ ในรูปที่หน้ารายงานใช้ (แปลงมาจาก SavedRequest ด้วย toReportRow)
type ReportRow = {
  doc: string; // เลขที่เอกสาร เช่น REQ-1794659
  daysAgo: number; // สร้างมาแล้วกี่วัน (ใช้กรองตามแท็บ)
  date: string; // วันที่แบบอ่านง่าย เช่น "14 พ.ย."
  monthKey: string; // ปี-เดือน เช่น "2026-11" (ใช้รวมยอดในกราฟ)
  dept: string; // แผนกเจ้าของโครงการ
  title: string;
  requester: string;
  amount: number;
  approveDays: number; // ส่ง → บัญชีตรวจเสร็จ ใช้กี่วัน (0 = ยังไม่มีข้อมูล)
};

// ════════════════════════════════════════
//  [2] ค่าคงที่
// ════════════════════════════════════════
const YEAR = bkkYear(); // ปีงบประมาณปัจจุบัน (ค.ศ. ตามเวลาไทย แบบเดียวกับหน้าตั้งงบ)

// แท็บช่วงเวลา: days = ย้อนหลังกี่วัน
const periods = [
  { label: "รายสัปดาห์", days: 7 },
  { label: "รายเดือน", days: 30 },
  { label: "รายไตรมาส", days: 90 },
  { label: "รายปี", days: 365 },
];


// ใช้งบถึงกี่ % ถือว่าใกล้หมด (หลอดเป็นสีแดง + นับในการ์ด)
const WARN_PERCENT = 80;

// ════════════════════════════════════════
//  [3] ฟังก์ชันช่วย
// ════════════════════════════════════════

// ใส่ลูกน้ำให้ตัวเลข เช่น 12500 → "12,500"
function money(n: number) {
  return n.toLocaleString("th-TH"); // toLocaleString = ใส่ลูกน้ำแบบไทย
}

// แปลงคำขอ (ที่หน้าสร้างคำขอบันทึกไว้) → แถวของรายงาน
function toReportRow(r: SavedRequest, today: Date): ReportRow {
  const created = new Date(r.createdAt);
  const oneDay = 24 * 60 * 60 * 1000; // 1 วัน เป็นมิลลิวินาที
  const daysAgo = Math.floor((today.getTime() - created.getTime()) / oneDay);

  // ระยะเวลาอนุมัติ = ส่งคำขอ → ขั้นบัญชีกดผ่าน (ขั้นสุดท้ายก่อนการเงิน)
  const checked = r.approvalSteps.find((s) => s.role === "ACCOUNTANT" && s.status === "อนุมัติ");
  const approveDays = checked?.at
    ? Math.max(0.1, (new Date(checked.at).getTime() - created.getTime()) / oneDay) // ภายในวันเดียว = 0.1 วัน
    : 0;

  return {
    doc: r.id,
    daysAgo,
    date: created.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok",
      day: "2-digit",
      month: "short",
    }), // เช่น "14 พ.ย."
    monthKey: bkkMonth(created), // "2026-11" ตามเวลาไทย (utils/date.ts)
    dept: r.project ? r.project.dept : "ไม่ระบุแผนก", // แผนกเจ้าของโครงการ
    title: r.title,
    requester: r.requester ? r.requester.fullName : "-",
    amount: r.total,
    approveDays,
  };
}

// 6 เดือนล่าสุด (รวมเดือนนี้ ตามเวลาไทย) → [{ key: "2026-06", label: "มิ.ย." }, ...]
function lastSixMonths(today: Date) {
  const list = [];
  for (let i = 5; i >= 0; i--) {
    const key = shiftMonth(bkkMonth(today), -i); // ย้อนทีละเดือน
    list.push({ key, label: monthLabel(key) });
  }
  return list;
}

// ════════════════════════════════════════
//  [4] หน้าหลัก (ส่วนคิด)
// ════════════════════════════════════════
export default function Report() {
  // ---------- [4.1] state ----------
  // [ของ, setของ] = useState(ค่าเริ่มต้น) · ค่าในกล่องเปลี่ยน → หน้าจอวาดใหม่ → ตัวเลขทุกอย่างข้างล่างคิดใหม่เอง
  const [days, setDays] = useState(30); // แท็บที่เลือก (เริ่มที่รายเดือน)
  const [dept, setDept] = useState(""); // แผนกที่เลือกในตาราง ("" = ทุกแผนก)
  const [search, setSearch] = useState(""); // คำค้นเลขที่เอกสาร
  const [all, setAll] = useState<ReportRow[]>([]); // คำขอที่จ่ายแล้ว (แปลงเป็นแถวรายงานแล้ว)
  const [budget, setBudget] = useState<Project[]>([]); // โครงการปีนี้ + ยอดใช้ไป
  const [boardTotal, setBoardTotal] = useState(0); // งบทั้งปีที่บัญชีตั้งไว้
  const [printedBy, setPrintedBy] = useState("-"); // ชื่อคนที่ล็อกอิน (ไว้บอกบนกระดาษว่าใครพิมพ์)

  // อ่านคำขอจริงครั้งเดียวตอนเปิดหน้า ([] = ทำครั้งเดียว)
  // ※ นับเฉพาะ "จ่ายแล้ว" (บัญชีตรวจ + การเงินจ่ายเสร็จ) เพราะเป็นเงินที่ออกไปจริง
  useEffect(() => {
    const today = new Date();
    const paid = loadRequests().filter((r) => r.status === "จ่ายแล้ว");
    const yearProjects = addRequestsToBudget(paid).filter((p) => p.year === YEAR); // โครงการปีนี้
    // งบทั้งปี = งบบอร์ดที่บัญชีกรอกในหน้า "ตั้งงบประมาณ" · ยังไม่กรอก = รวมวงเงินโครงการปีนี้แทน
    const allocation = loadAllocations().find((a) => a.year === YEAR);
    const fromProjects = yearProjects.reduce((sum, p) => sum + projectLimit(p), 0);
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage อ่านได้หลังเปิดหน้าเท่านั้น */
    setAll(paid.map((r) => toReportRow(r, today)));
    setBudget(yearProjects);
    setBoardTotal(allocation?.boardTotal ?? fromProjects);
    const me = getCurrentUser(); // ห้ามอ่าน localStorage เอง → ใช้ฟังก์ชันกลางของทีม
    if (me) setPrintedBy(me.fullName);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // ---------- [4.2] กรองตามช่วงเวลา ----------
  const list = all.filter((r) => r.daysAgo <= days); // filter = เก็บเฉพาะที่ผ่านเงื่อนไข: เบิกไม่เกินจำนวนวันของแท็บที่เลือก

  // ---------- [4.3] ตัวเลขบนการ์ด ----------
  // reduce = บวกทีละใบ · sum = ยอดสะสม · 0 ท้ายสุด = เริ่มนับจาก 0
  const total = list.reduce((sum, r) => sum + r.amount, 0); // รวมยอดเบิก (ตามแท็บ)
  // งบเป็นของทั้งปี → งบคงเหลือ กับ % ที่ใช้ ต้องคิดจากยอดทั้งปีเสมอ (ไม่เปลี่ยนตามแท็บ)
  const yearTotal = all
    .filter((r) => r.monthKey.startsWith(`${YEAR}-`)) // ปีงบเดียวกับงบบอร์ด (ไม่ใช่ย้อน 365 วัน)
    .reduce((sum, r) => sum + r.amount, 0);
  const count = list.length; // จำนวนคำขอ
  // เวลาอนุมัติเฉลี่ย: นับเฉพาะใบที่อนุมัติเสร็จแล้ว (approveDays > 0)
  const finished = list.filter((r) => r.approveDays > 0);
  const sumDays = finished.reduce((sum, r) => sum + r.approveDays, 0); // รวมจำนวนวันที่ใช้อนุมัติ
  // ทางแยก ? : → มีใบที่เสร็จ = รวมวัน ÷ จำนวนใบ (toFixed(1) = ทศนิยม 1 ตำแหน่ง) · ไม่มี = "0" (กันหารด้วย 0)
  const avgDays =
    finished.length > 0 ? (sumDays / finished.length).toFixed(1) : "0";

  // ---------- [4.4] เบิกสูงสุด 4 อันดับ ----------
  // ต้อง [...list] ก๊อปก่อน เพราะ sort จะไปเปลี่ยนลิสต์เดิม · b.amount - a.amount = เรียงมากไปน้อย
  const top = [...list].sort((a, b) => b.amount - a.amount).slice(0, 4); // ก๊อป → เรียงมากไปน้อย → ตัด 4 อันแรก

  // ---------- [4.5] ตารางรายแผนก: แผนกที่เลือก + คำค้น ----------
  // แท็บ = แผนกที่มีคำขอในช่วงนี้ (new Set = ตัดชื่อซ้ำ)
  const depts = [...new Set(list.map((r) => r.dept))];
  const currentDept = depts.includes(dept) ? dept : ""; // "" = ทุกแผนก (แผนกที่เลือกไม่มีในช่วงนี้ → กลับเป็นทุกแผนก)
  const rows = list
    .filter(
      (r) =>
        // แผนกตรงกับแท็บ (ทุกแผนก = ผ่านหมด) · และเลขเอกสาร/ชื่อรายการมีคำที่ค้น (ไม่สนตัวพิมพ์ใหญ่/เล็ก)
        (!currentDept || r.dept === currentDept) &&
        (r.doc + r.title).toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => a.daysAgo - b.daysAgo); // ใหม่ → เก่า
  const rowsTotal = rows.reduce((sum, r) => sum + r.amount, 0);

  // ---------- [4.6] กราฟ 6 เดือน ----------
  // แต่ละเดือน: เก็บคำขอที่ปี-เดือนตรงกัน → บวกยอด
  const chart = lastSixMonths(new Date()).map((m) => ({
    month: m.label,
    amount: all
      .filter((r) => r.monthKey === m.key) // เก็บคำขอของเดือนนี้
      .reduce((sum, r) => sum + r.amount, 0), // บวกยอดเงินของเดือนนั้น
  }));
  // ความสูงแท่ง: เทียบกับเดือนที่ยอดมากที่สุด
  const maxAmount = Math.max(1, ...chart.map((c) => c.amount)); // อย่างน้อย 1 กันหารด้วย 0 ตอนยังไม่มีข้อมูล // ... แตกลิสต์ออกเป็นตัวเลขทีละตัว ให้ Math.max หาค่าที่มากที่สุด

  // ---------- [4.7] สรุปงบตามโครงการ / หมวด ----------
  // ※ % ใช้ = used ÷ limit · ปัดเป็นจำนวนเต็ม
  // ※ ใช้ budget (รวมคำขอจริงแล้ว) ไม่ใช่ projects ตรง ๆ
  const projectRows = budget
    .map((p) => {
      const limit = projectLimit(p);
      const used = projectUsed(p);
      return { ...p, limit, used, percent: limit > 0 ? Math.round((used / limit) * 100) : used > 0 ? 100 : 0 };
    })
    .sort((a, b) => b.percent - a.percent); // ใช้มากสุดขึ้นก่อน → เห็นโครงการที่ใกล้หมดทันที
  const warnCount = projectRows.filter((p) => p.percent >= WARN_PERCENT).length;

  // ════════════════════════════════════════
  //  [5] หน้าจอ
  // ════════════════════════════════════════
  return (
    <div id="report-print" className="text-[#0F172A]">
      {/* ตอนพิมพ์: พิมพ์เฉพาะรายงาน (ซ่อนเมนู/แถบบน) · กระดาษแนวนอน · พิมพ์สีพื้นด้วย (แท่งกราฟ/การ์ดเข้ม) */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body * { visibility: hidden; }
          #report-print, #report-print * { visibility: visible; }
          #report-print { position: absolute; left: 0; top: 0; width: 100%; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .grid > div, .grid > section, tr { break-inside: avoid; } /* การ์ด/กราฟ/แถวตาราง ไม่ถูกตัดครึ่ง */
          thead { display: table-header-group; } /* ตารางยาวข้ามหน้า → หัวตารางโผล่ซ้ำทุกหน้า */
        }
      `}</style>
      {/* ---------- [5.1] หัวข้อ (ค้นหา + กระดิ่งใช้ของ layout) ---------- */}
      {/* หัวข้อ + แท็บช่วงเวลาอยู่ก้อนเดียวกัน แล้วเว้น 36px ก่อนเนื้อหา (เหมือนหน้า employee) */}
      <header className="mb-9 print:mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[32px] font-bold print:text-2xl">รายงานงบประมาณ</h1>
            <p className="mt-1 text-sm text-[#64748B]">
              สรุปการเบิกจ่ายและงบประมาณปี {YEAR + 543} · นับเฉพาะคำขอที่จ่ายแล้ว
            </p>
          </div>
          {/* พิมพ์รายงาน = เปิดหน้าพิมพ์ของเบราว์เซอร์ (เลือกบันทึกเป็น PDF ได้) */}
          <button
            type="button"
            onClick={() => window.print()}
            className="cursor-pointer rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] print:hidden"
          >
            พิมพ์รายงาน
          </button>
        </div>
        {/* เงื่อนไขของรายงาน: โชว์เฉพาะตอนพิมพ์ (คนอ่านกระดาษไม่เห็นแท็บที่เลือก) */}
        <p className="mt-3 hidden text-sm text-[#334155] print:block">
          <b>ช่วงเวลา:</b> {periods.find((p) => p.days === days)?.label} ({days} วันล่าสุด)
          · <b>ตารางรายการ:</b> {currentDept || "ทุกแผนก"}
          {search && <> · <b>ค้นหา:</b> {search}</>}
          · <b>พิมพ์โดย:</b> {printedBy}
        </p>

      {/* ---------- [5.2] แท็บช่วงเวลา ---------- */}
      <div className="mt-4 inline-flex flex-wrap gap-1 rounded-xl border border-[#E2E8F0] bg-white p-1 print:hidden" role="group" aria-label="ช่วงเวลา">
        {/* map = สร้างปุ่มแท็บจาก periods ทีละอัน */}
        {periods.map((p) => (
          <button
            key={p.days}
            type="button"
            aria-pressed={days === p.days}
            onClick={() => setDays(p.days)} // กดแท็บ → เปลี่ยนจำนวนวันในกล่อง days → ตัวเลขทั้งหน้าคิดใหม่
            // แท็บที่เลือกอยู่ → พื้นสีเข้ม
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${days === p.days ? "bg-[#059669] text-white" : "text-[#64748B] hover:bg-[#ECFDF5] hover:text-[#047857]"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      </header>

      {/* แต่ละส่วนห่างกัน 36px เหมือนหน้า employee */}
      <div className="flex flex-col gap-9 print:gap-4">
      {/* ---------- [5.3] การ์ด 4 ใบ ---------- */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {/* การ์ดใบแรก: งบทั้งปี (การ์ดเดียวกับทุกหน้า components/budget-card.tsx) */}
        <BudgetCard label="งบคงเหลือทั้งหมด" limit={boardTotal} used={yearTotal} year={YEAR} />
        <Card
          icon={<FileText size={16} />}
          label="คำขอเบิกในช่วงนี้"
          value={String(count)}
          unit={"รายการ · ฿" + money(total)}
        />
        <Card
          icon={<ClockThree size={16} />}
          label="ระยะเวลาอนุมัติเฉลี่ย"
          value={avgDays}
          unit="วัน"
        />
        <Card
          icon={<ErrorCircle size={16} />}
          label={`โครงการใช้งบเกิน ${WARN_PERCENT}%`}
          value={String(warnCount)}
          unit={`จาก ${projectRows.length} โครงการ`}
          tone={warnCount > 0 ? "text-[#BE123C]" : undefined}
        />
      </div>

      {/* grid 4 คอลัมน์: กราฟ 3 คอลัมน์ / เบิกสูงสุด 1 คอลัมน์ */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        {/* ---------- [5.4] กราฟ 6 เดือน ---------- */}
        <section className="rounded-xl xl:col-span-3 border border-[#E2E8F0] bg-white p-6 shadow-2xl print:p-4 print:shadow-none">
          <h2 className="mb-4 text-lg font-bold">ยอดเบิกจ่ายย้อนหลัง 6 เดือน</h2>
          <div className="flex h-56 items-end gap-3 border-b border-[#E2E8F0] px-2 sm:gap-6 sm:px-4 print:h-40">
            {/* map = วาดแท่งกราฟทีละเดือน · i = ลำดับเดือน */}
            {chart.map((c, i) => (
              <div
                key={c.month}
                className="flex h-full flex-1 flex-col items-center justify-end"
              >
                <span className="money mb-1 text-xs text-[#64748B]">
                  {money(c.amount)}
                </span>
                <div
                  role="img"
                  aria-label={`${c.month} ฿${money(c.amount)}`}
                  className={`w-full rounded-t-lg ${i === chart.length - 1 ? "bg-[#059669]" : "bg-[#CBD5E1]"}`} // แท่งสุดท้าย (เดือนล่าสุด) = สีเขียว · อื่นๆ = สีเทา
                  style={{ height: `${(c.amount / maxAmount) * 85}%` }} // ความสูง = ยอดเดือนนี้ ÷ ยอดสูงสุด (แท่งสูงสุดสูง 85%)
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 px-2 pt-2 sm:gap-6 sm:px-4" aria-hidden="true">
            {chart.map((c, i) => (
              <span
                key={c.month}
                className={`flex-1 text-center text-sm ${i === chart.length - 1 ? "font-bold text-[#047857]" : "text-[#64748B]"}`}
              >
                {c.month}
              </span>
            ))}
          </div>
        </section>

        {/* ---------- [5.5] เบิกสูงสุด ---------- */}
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl print:p-4 print:shadow-none">
          <h2 className="mb-2 text-lg font-bold">รายการเบิกจ่ายสูงสุด</h2>
          {/* ไม่มีรายการ (length === 0) → โชว์ข้อความแทน */}
          {top.length === 0 && (
            <p className="py-6 text-center text-sm text-[#64748B]">
              ไม่มีรายการในช่วงนี้
            </p>
          )}
          {/* map = วาด 4 อันดับ · i + 1 = เลขอันดับ (i เริ่มนับ 0) */}
          {top.map((r, i) => (
            <div
              key={r.doc}
              className="flex items-center gap-3 border-b border-[#F1F5F9] py-3 last:border-0"
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-[#ECFDF5] text-[#047857]" : "bg-[#F1F5F9] text-[#475569]"}`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.title}</p>
                <p className="text-xs text-[#64748B]">{r.dept}</p>
              </div>
              <b className="money text-sm">฿{money(r.amount)}</b>
            </div>
          ))}
        </section>
      </div>

      {/* ---------- [5.6] งบตามโครงการ / หมวด ---------- */}
      <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl print:p-4 print:shadow-none">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">
            งบตามโครงการ / หมวดค่าใช้จ่าย (งบทั้งปี)
          </h2>
          <span className="money text-sm text-[#64748B]">
            {projectRows.length} โครงการ · งบรวม ฿{money(boardTotal)}
          </span>
        </div>
        {projectRows.length === 0 && (
          <p className="py-6 text-center text-sm text-[#64748B]">ยังไม่มีโครงการ · ตั้งได้ที่หน้า “ตั้งงบประมาณ”</p>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projectRows.map((p) => (
            <div key={p.id} className="rounded-xl border border-[#E2E8F0] p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-[#64748B]">{p.dept}</p>
                  <p className="font-bold">{p.name}</p>
                </div>
                <span
                  className={`money shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    p.percent >= WARN_PERCENT ? "bg-[#FFF1F2] text-[#BE123C]" : "bg-[#ECFDF5] text-[#047857]"
                  }`}
                >
                  ใช้ {p.percent}%
                </span>
              </div>
              <p className="money mb-3 mt-1 text-sm text-[#64748B]">
                ใช้ไป <b className="text-[#0F172A]">฿{money(p.used)}</b> จาก ฿
                {money(p.limit)}
              </p>
              {p.categories.map((c) => {
                // ยังไม่ตั้งวงเงิน: ไม่มีการใช้ = 0% · มีการใช้ = เต็ม (กันหารด้วย 0)
                const percent = c.limit > 0 ? Math.round((c.used / c.limit) * 100) : c.used > 0 ? 100 : 0;
                return (
                  <div key={c.id} className="mb-2.5">
                    <div className="flex justify-between text-xs">
                      <span>{c.name}</span>
                      <span className={`money ${c.limit - c.used < 0 ? "font-semibold text-[#BE123C]" : "text-[#64748B]"}`}>
                        {c.limit - c.used < 0 ? "เกิน" : "เหลือ"} ฿{money(Math.abs(c.limit - c.used))}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-[#F1F5F9]" role="img" aria-label={`${c.name} ใช้ไป ${percent}%`}>
                      <div
                        className={`h-1.5 rounded-full ${percent >= WARN_PERCENT ? "bg-[#E11D48]" : "bg-[#059669]"}`} // ใช้ถึงเกณฑ์ = แดง
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {/* ---------- [5.7] ตารางรายฝ่าย ---------- */}
      <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl print:p-4 print:shadow-none">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">รายการเบิกจ่าย</h2>
          <label className="flex w-full items-center gap-2 rounded-xl border border-[#E2E8F0] px-3 focus-within:border-[#059669] sm:w-64 print:hidden">
            <Search1 size={18} className="shrink-0 text-[#94A3B8]" aria-hidden="true" />
            <span className="sr-only">ค้นหาเลขที่เอกสารหรือรายการ</span>
            <input
              type="search"
              className="w-full border-0 bg-transparent py-2 text-sm outline-none focus:ring-0"
              placeholder="ค้นหาเลขที่หรือชื่อรายการ"
              value={search} // value = โชว์คำค้นในกล่อง search
              onChange={(e) => setSearch(e.target.value)} // พิมพ์ → เก็บคำค้น → ตาราง rows กรองใหม่เอง
            />
          </label>
        </div>

        {/* แท็บฝ่าย */}
        <div className="mb-4 inline-flex flex-wrap gap-1 rounded-xl border border-[#E2E8F0] p-1 print:hidden" role="group" aria-label="แผนก">
          {/* แท็บแรก "ทุกแผนก" (value "") ตามด้วยแผนกที่มีคำขอในช่วงนี้ */}
          {["", ...depts].map((d) => (
            <button
              key={d || "all"}
              type="button"
              aria-pressed={currentDept === d}
              onClick={() => setDept(d)} // กดแท็บ → เปลี่ยนแผนกในกล่อง dept
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${currentDept === d ? "bg-[#059669] text-white" : "text-[#64748B] hover:bg-[#ECFDF5] hover:text-[#047857]"}`}
            >
              {d || "ทุกแผนก"}
            </button>
          ))}
        </div>

        {/* ตาราง */}
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs text-[#64748B]">
              <th className="py-2 font-semibold">วันที่</th>
              <th className="py-2 font-semibold">รายการ</th>
              <th className="py-2 font-semibold">เลขที่เอกสาร</th>
              <th className="py-2 font-semibold">แผนก</th>
              <th className="py-2 font-semibold">ผู้ขอ</th>
              <th className="py-2 text-right font-semibold">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {/* map = วาดแถวตารางจาก rows ที่กรองแล้ว · key = เลขเอกสาร (ไม่ซ้ำกัน) */}
            {rows.map((r) => (
              <tr key={r.doc} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                <td className="whitespace-nowrap py-3 text-[#64748B]">{r.date}</td>
                <td className="py-3 font-semibold">{r.title}</td>
                <td className="py-3">
                  <span className="flex items-center gap-1">
                    <FileText size={16} className="shrink-0 text-[#94A3B8]" aria-hidden="true" /> {r.doc}
                  </span>
                </td>
                <td className="py-3 text-[#64748B]">{r.dept}</td>
                <td className="py-3">{r.requester}</td>
                <td className="money py-3 text-right font-bold">
                  ฿{money(r.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-[#E2E8F0]">
                <td colSpan={5} className="py-3 font-bold">
                  รวม {rows.length} รายการ
                </td>
                <td className="money py-3 text-right text-base font-bold text-[#047857]">฿{money(rowsTotal)}</td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
        {/* ค้นแล้วไม่เจอ → โชว์ "ไม่พบรายการ" */}
        {rows.length === 0 && (
          <p className="py-6 text-center text-sm text-[#64748B]">
            {search
              ? `ไม่พบ “${search}” ใน${currentDept ? `แผนก${currentDept}` : "ทุกแผนก"}`
              : currentDept
                ? `ไม่มีรายการของแผนก${currentDept}ในช่วงนี้`
                : "ไม่มีรายการที่จ่ายแล้วในช่วงนี้"}
          </p>
        )}
      </section>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
//  [6] ชิ้นส่วนที่ใช้ซ้ำ
// ════════════════════════════════════════

// [6.1] Card = การ์ดสรุปตัวเลข 1 ใบ (สีขาว)
function Card({
  icon,
  label,
  value,
  unit,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  tone?: string; // สีตัวเลข (เช่น แดงเมื่อมีเรื่องต้องดู)
}) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl print:p-4 print:shadow-none">
      <p className="flex items-center gap-2 text-sm text-[#64748B]">
        {icon} {label}
      </p>
      <p className={`money mt-2 text-3xl font-bold ${tone ?? ""}`}>
        {value}{" "}
        <span className="text-sm font-normal text-[#64748B]">{unit}</span>
      </p>
    </div>
  );
}
