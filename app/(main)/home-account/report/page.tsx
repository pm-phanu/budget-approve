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
import {
  FileText,
  Wallet2,
  Search1,
  ClockThree,
  TrendUp2,
} from "@tailgrids/icons";
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
const YEAR = new Date().getFullYear(); // ปีงบประมาณปัจจุบัน (ค.ศ. แบบเดียวกับหน้าตั้งงบ)

// แท็บช่วงเวลา: days = ย้อนหลังกี่วัน
const periods = [
  { label: "รายสัปดาห์", days: 7 },
  { label: "รายเดือน", days: 30 },
  { label: "รายไตรมาส", days: 90 },
  { label: "รายปี", days: 365 },
];


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
  const checked = r.approvalSteps.find((s) => s.role === "ACCOUNTANT_ADMIN" && s.status === "อนุมัติ");
  const approveDays = checked?.at
    ? Math.max(0.1, (new Date(checked.at).getTime() - created.getTime()) / oneDay) // ภายในวันเดียว = 0.1 วัน
    : 0;

  return {
    doc: r.id,
    daysAgo,
    date: created.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
    }), // เช่น "14 พ.ย."
    monthKey: created.toISOString().slice(0, 7), // "2026-11"
    dept: r.project ? r.project.dept : "ไม่ระบุแผนก", // แผนกเจ้าของโครงการ
    title: r.title,
    requester: r.requester ? r.requester.fullName : "-",
    amount: r.total,
    approveDays,
  };
}

// 6 เดือนล่าสุด (รวมเดือนนี้) → [{ key: "2026-06", label: "มิ.ย." }, ...]
function lastSixMonths(today: Date) {
  const list = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1); // ย้อนทีละเดือน
    list.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("th-TH", { month: "short" }),
    });
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
  const [dept, setDept] = useState(""); // แผนกที่เลือกในตาราง ("" = ยังไม่เลือก → ใช้แผนกแรก)
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
    .filter((r) => r.daysAgo <= 365)
    .reduce((sum, r) => sum + r.amount, 0);
  const remaining = boardTotal - yearTotal; // งบคงเหลือทั้งหมด
  const count = list.length; // จำนวนคำขอ
  // เวลาอนุมัติเฉลี่ย: นับเฉพาะใบที่อนุมัติเสร็จแล้ว (approveDays > 0)
  const finished = list.filter((r) => r.approveDays > 0);
  const sumDays = finished.reduce((sum, r) => sum + r.approveDays, 0); // รวมจำนวนวันที่ใช้อนุมัติ
  // ทางแยก ? : → มีใบที่เสร็จ = รวมวัน ÷ จำนวนใบ (toFixed(1) = ทศนิยม 1 ตำแหน่ง) · ไม่มี = "0" (กันหารด้วย 0)
  const avgDays =
    finished.length > 0 ? (sumDays / finished.length).toFixed(1) : "0";
  // Math.round = ปัดเป็นจำนวนเต็ม
  const usedPercent = boardTotal > 0 ? Math.round((yearTotal / boardTotal) * 100) : 0; // ใช้งบทั้งปีไปกี่ % (ยังไม่ตั้งงบ = 0 กันหารด้วย 0)

  // ---------- [4.4] เบิกสูงสุด 4 อันดับ ----------
  // ต้อง [...list] ก๊อปก่อน เพราะ sort จะไปเปลี่ยนลิสต์เดิม · b.amount - a.amount = เรียงมากไปน้อย
  const top = [...list].sort((a, b) => b.amount - a.amount).slice(0, 4); // ก๊อป → เรียงมากไปน้อย → ตัด 4 อันแรก

  // ---------- [4.5] ตารางรายแผนก: แผนกที่เลือก + คำค้น ----------
  // แท็บ = แผนกที่มีคำขอในช่วงนี้ (new Set = ตัดชื่อซ้ำ)
  const depts = [...new Set(list.map((r) => r.dept))];
  const currentDept = depts.includes(dept) ? dept : (depts[0] ?? ""); // ยังไม่เลือก / แผนกนั้นไม่มีในช่วงนี้ → ใช้แผนกแรก
  const rows = list.filter(
    (r) =>
      // === dept = ฝ่ายตรงกับแท็บ · && = ต้องจริงทั้งคู่ · includes = มีคำที่ค้นอยู่ในเลขเอกสารไหม · toLowerCase = ทำเป็นตัวเล็กหมด จะได้ไม่สนตัวพิมพ์ใหญ่/เล็ก
      r.dept === currentDept && r.doc.toLowerCase().includes(search.toLowerCase()),
  );

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
  const projectRows = budget.map((p) => ({
    ...p,
    limit: projectLimit(p),
    used: projectUsed(p),
  }));

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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[32px] font-bold text-[#111] print:text-2xl">รายงานงบประมาณ</h1>
            <p className="mt-1 text-sm text-[#64748B]">
              สรุปการเบิกจ่ายและงบประมาณปี {YEAR + 543} · นับเฉพาะคำขอที่จ่ายแล้ว
            </p>
          </div>
          {/* พิมพ์รายงาน = เปิดหน้าพิมพ์ของเบราว์เซอร์ (เลือกบันทึกเป็น PDF ได้) */}
          <button
            onClick={() => window.print()}
            className="print:hidden rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#334155] hover:bg-gray-50"
          >
            พิมพ์รายงาน
          </button>
        </div>
        {/* เงื่อนไขของรายงาน: โชว์เฉพาะตอนพิมพ์ (คนอ่านกระดาษไม่เห็นแท็บที่เลือก) */}
        <p className="mt-3 hidden text-sm text-[#334155] print:block">
          <b>ช่วงเวลา:</b> {periods.find((p) => p.days === days)?.label} ({days} วันล่าสุด)
          · <b>ตารางรายการ:</b> {currentDept || "-"}
          {search && <> · <b>ค้นหา:</b> {search}</>}
          · <b>พิมพ์โดย:</b> {printedBy}
        </p>

      {/* ---------- [5.2] แท็บช่วงเวลา ---------- */}
      <div className="mt-4 inline-flex gap-1 rounded-lg border border-gray-200 bg-white p-1 print:hidden">
        {/* map = สร้างปุ่มแท็บจาก periods ทีละอัน */}
        {periods.map((p) => (
          <button
            key={p.days}
            onClick={() => setDays(p.days)} // กดแท็บ → เปลี่ยนจำนวนวันในกล่อง days → ตัวเลขทั้งหน้าคิดใหม่
            // แท็บที่เลือกอยู่ → พื้นสีเข้ม
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${days === p.days ? "bg-[#0F172A] text-white" : "text-[#64748B] hover:bg-gray-100"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      </header>

      {/* แต่ละส่วนห่างกัน 36px เหมือนหน้า employee */}
      <div className="flex flex-col gap-9 print:gap-4">
      {/* ---------- [5.3] การ์ด 4 ใบ ---------- */}
      <div className="grid grid-cols-4 gap-5">
        {/* การ์ดใบแรก สีเข้ม */}
        <div className="rounded-lg bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#047857] p-6 text-white print:p-4">
          <p className="flex items-center gap-2 text-sm text-gray-300">
            <Wallet2 size={16} className="text-[#34D399]" /> งบคงเหลือทั้งหมด
          </p>
          <p className="my-2 text-3xl font-bold tabular-nums">฿{money(remaining)}</p>
          <div className="h-1.5 rounded-full bg-white/15">
            <div
              className="h-1.5 rounded-full bg-[#34D399]"
              style={{ width: `${boardTotal > 0 ? 100 - usedPercent : 0}%` }} // ความยาวหลอด = % งบที่เหลือ · ยังไม่ตั้งงบ = หลอดว่าง
            />
          </div>
        </div>
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
          icon={<TrendUp2 size={16} />}
          label="ใช้งบไปแล้ว (ทั้งปี)"
          value={usedPercent + "%"}
          unit={"฿" + money(yearTotal)}
        />
      </div>

      {/* grid 4 คอลัมน์: กราฟ 3 คอลัมน์ / เบิกสูงสุด 1 คอลัมน์ */}
      <div className="grid grid-cols-4 gap-5">
        {/* ---------- [5.4] กราฟ 6 เดือน ---------- */}
        <section className="col-span-3 rounded-lg border border-[#E2E8F0] bg-white p-6 print:p-4">
          <h2 className="mb-4 text-lg font-bold">ยอดเบิกจ่ายย้อนหลัง 6 เดือน</h2>
          <div className="flex h-56 print:h-40 items-end gap-6 border-b border-gray-200 px-4">
            {/* map = วาดแท่งกราฟทีละเดือน · i = ลำดับเดือน */}
            {chart.map((c, i) => (
              <div
                key={c.month}
                className="flex h-full flex-1 flex-col items-center justify-end"
              >
                <span className="mb-1 text-xs text-[#64748B]">
                  {money(c.amount)}
                </span>
                <div
                  className={`w-full rounded-t-lg ${i === chart.length - 1 ? "bg-[#059669]" : "bg-[#CBD5E1]"}`} // แท่งสุดท้าย (เดือนล่าสุด) = สีเขียว · อื่นๆ = สีเทา
                  style={{ height: `${(c.amount / maxAmount) * 85}%` }} // ความสูง = ยอดเดือนนี้ ÷ ยอดสูงสุด (แท่งสูงสุดสูง 85%)
                />
              </div>
            ))}
          </div>
          <div className="flex gap-6 px-4 pt-2">
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
        <section className="col-span-1 rounded-lg border border-[#E2E8F0] bg-white p-6 print:p-4">
          <h2 className="mb-2 text-lg font-bold">รายการเบิกจ่ายสูงสุด</h2>
          {/* ไม่มีรายการ (length === 0) → โชว์ข้อความแทน */}
          {top.length === 0 && (
            <p className="py-6 text-center text-sm text-[#94A3B8]">
              ไม่มีรายการในช่วงนี้
            </p>
          )}
          {/* map = วาด 4 อันดับ · i + 1 = เลขอันดับ (i เริ่มนับ 0) */}
          {top.map((r, i) => (
            <div
              key={r.doc}
              className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-0"
            >
              <span className="w-5 font-bold">{i + 1}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{r.title}</p>
                <p className="text-xs text-[#64748B]">{r.dept}</p>
              </div>
              <b className="text-sm">฿{money(r.amount)}</b>
            </div>
          ))}
        </section>
      </div>

      {/* ---------- [5.6] งบตามโครงการ / หมวด ---------- */}
      <section className="rounded-lg border border-[#E2E8F0] bg-white p-6 print:p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            งบตามโครงการ / หมวดค่าใช้จ่าย (งบทั้งปี)
          </h2>
          <span className="text-sm text-[#64748B]">
            {projectRows.length} โครงการ · งบรวม ฿{money(boardTotal)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {projectRows.map((p) => (
            <div key={p.id} className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-[#64748B]">{p.dept}</p>
              <p className="font-bold">{p.name}</p>
              <p className="mb-3 mt-1 text-sm text-[#64748B]">
                ใช้ไป <b className="text-[#0F172A]">฿{money(p.used)}</b> จาก ฿
                {money(p.limit)}
              </p>
              {p.categories.map((c) => {
                const percent = c.limit > 0 ? Math.min(100, Math.round((c.used / c.limit) * 100)) : 0; // ยังไม่ตั้งวงเงิน = 0%
                return (
                  <div key={c.id} className="mb-2.5">
                    <div className="flex justify-between text-xs">
                      <span>{c.name}</span>
                      <span className="text-[#64748B]">
                        เหลือ ฿{money(c.limit - c.used)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-gray-100">
                      <div
                        className={`h-1.5 rounded-full ${percent >= 80 ? "bg-[#E11D48]" : "bg-[#059669]"}`} // ใช้เกิน 80% = แดง
                        style={{ width: `${percent}%` }}
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
      <section className="rounded-lg border border-[#E2E8F0] bg-white p-6 print:p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">รายการเบิกจ่าย</h2>
          <div className="flex w-64 items-center gap-2 rounded-lg border print:hidden border-gray-200 px-3">
            <Search1 size={18} className="text-[#94A3B8]" />
            <input
              className="w-full border-0 bg-transparent py-2 text-sm outline-none focus:ring-0"
              placeholder="ค้นหาเลขที่เอกสาร"
              value={search} // value = โชว์คำค้นในกล่อง search
              onChange={(e) => setSearch(e.target.value)} // พิมพ์ → เก็บคำค้น → ตาราง rows กรองใหม่เอง
            />
          </div>
        </div>

        {/* แท็บฝ่าย */}
        <div className="mb-4 inline-flex gap-1 rounded-lg border border-gray-200 p-1 print:hidden">
          {/* map = สร้างปุ่มแท็บฝ่ายทีละฝ่าย */}
          {depts.map((d) => (
            <button
              key={d}
              onClick={() => setDept(d)} // กดแท็บ → เปลี่ยนแผนกในกล่อง dept
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${currentDept === d ? "bg-[#0F172A] text-white" : "text-[#64748B] hover:bg-gray-100"}`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* ตาราง */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-[#64748B]">
              <th className="py-2 font-semibold">วันที่</th>
              <th className="py-2 font-semibold">รายการ</th>
              <th className="py-2 font-semibold">เลขที่เอกสาร</th>
              <th className="py-2 font-semibold">ผู้ขอ</th>
              <th className="py-2 text-right font-semibold">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {/* map = วาดแถวตารางจาก rows ที่กรองแล้ว · key = เลขเอกสาร (ไม่ซ้ำกัน) */}
            {rows.map((r) => (
              <tr key={r.doc} className="border-b border-gray-100">
                <td className="py-3 text-[#64748B]">{r.date}</td>
                <td className="py-3 font-semibold">{r.title}</td>
                <td className="py-3">
                  {r.doc}
                </td>
                <td className="py-3">{r.requester}</td>
                <td className="py-3 text-right font-bold tabular-nums">
                  ฿{money(r.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* ค้นแล้วไม่เจอ → โชว์ "ไม่พบรายการ" */}
        {rows.length === 0 && (
          <p className="py-6 text-center text-sm text-[#94A3B8]">ไม่พบรายการ</p>
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 print:p-4">
      <p className="flex items-center gap-2 text-sm text-[#64748B]">
        {icon} {label}
      </p>
      <p className="mt-2 text-3xl font-bold tabular-nums">
        {value}{" "}
        <span className="text-sm font-normal text-[#64748B]">{unit}</span>
      </p>
    </div>
  );
}
