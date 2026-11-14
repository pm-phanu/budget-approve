"use client";
// ════════════════════════════════════════════════════════════
//  หน้ารายงานงบประมาณ  (/report)
// ════════════════════════════════════════════════════════════

//   [1] ชนิดข้อมูล
//   [2] ข้อมูลสมมติ: คำขอเบิก, เดือนในกราฟ, แท็บ   (งบโครงการอยู่ data/budget.ts)
//   [3] ฟังก์ชันช่วย (ใส่ลูกน้ำ, แปลงคำขอจริงจาก localStorage)
//   [4] หน้าหลัก (ส่วนคิด)
//       [4.1] state + อ่านคำขอจริง   [4.2] กรองตามช่วงเวลา
//       [4.3] ตัวเลขบนการ์ด   [4.4] เบิกสูงสุด 4 อันดับ
//       [4.5] ตารางรายฝ่าย    [4.6] กราฟ 6 เดือน
//       [4.7] สรุปงบตามโครงการ / หมวด
//   [5] หน้าจอ
//       [5.1] หัวข้อ + ค้นหา   [5.2] แท็บช่วงเวลา   [5.3] การ์ด 4 ใบ
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
  Bell1,
  ClockThree,
  TrendUp2,
  FileFormatPdf,
} from "@tailgrids/icons";
import {
  projects,
  projectLimit,
  projectUsed,
  addRequestsToBudget,
  type Project,
} from "@/data/budget";
import { loadRequests, type SavedRequest } from "@/data/request";

// ════════════════════════════════════════
//  [1] ชนิดข้อมูล
// ════════════════════════════════════════
// บอกว่า "คำขอเบิก 1 ใบ" ต้องมีอะไรบ้าง
type Request = {
  doc: string; // เลขที่เอกสาร
  daysAgo: number; // เบิกเมื่อกี่วันก่อน
  date: string; // วันที่ (ไว้โชว์)
  dept: string; // ฝ่าย
  title: string; // รายการ
  requester: string; // ผู้ขอ
  amount: number; // จำนวนเงิน
  approveDays: number; // ใช้เวลาอนุมัติกี่วัน
};

// ════════════════════════════════════════
//  [2] ข้อมูลสมมติ (ยังไม่มี backend)
// ════════════════════════════════════════
// งบทั้งปี = รวมวงเงินทุกโครงการ (ไม่ตั้งตัวเลขเอง)
const BUDGET = projects.reduce((sum, p) => sum + projectLimit(p), 0);

const requests: Request[] = [
  {
    doc: "EX-0021",
    daysAgo: 1,
    date: "06 พ.ย.",
    dept: "ไอที",
    title: "ค่าบริการคลาวด์",
    requester: "คุณวิชัย",
    amount: 6800,
    approveDays: 1,
  },
  {
    doc: "EX-0012",
    daysAgo: 2,
    date: "05 พ.ย.",
    dept: "การตลาด",
    title: "ค่าเดินทางสัมมนา",
    requester: "คุณสมชาย",
    amount: 12500,
    approveDays: 1,
  },
  {
    doc: "EX-0020",
    daysAgo: 3,
    date: "04 พ.ย.",
    dept: "อื่นๆ",
    title: "ค่าส่งเอกสารด่วน",
    requester: "คุณปรีชา",
    amount: 950,
    approveDays: 1,
  },
  {
    doc: "EX-0011",
    daysAgo: 5,
    date: "02 พ.ย.",
    dept: "ขาย",
    title: "ค่ารับรองลูกค้า",
    requester: "คุณมานี",
    amount: 8200,
    approveDays: 2,
  },
  {
    doc: "EX-0019",
    daysAgo: 6,
    date: "01 พ.ย.",
    dept: "การตลาด",
    title: "ค่าพิมพ์แผ่นพับ",
    requester: "คุณสุดา",
    amount: 4300,
    approveDays: 2,
  },
  {
    doc: "EX-0018",
    daysAgo: 9,
    date: "29 ต.ค.",
    dept: "ขาย",
    title: "ค่าตัวอย่างสินค้าให้ลูกค้า",
    requester: "คุณมานี",
    amount: 3900,
    approveDays: 1,
  },
  {
    doc: "EX-0010",
    daysAgo: 12,
    date: "26 ต.ค.",
    dept: "ไอที",
    title: "ค่าซื้อเมาส์และคีย์บอร์ด",
    requester: "คุณวิชัย",
    amount: 4600,
    approveDays: 1,
  },
  {
    doc: "EX-0017",
    daysAgo: 14,
    date: "24 ต.ค.",
    dept: "อื่นๆ",
    title: "ค่าซ่อมเครื่องถ่ายเอกสาร",
    requester: "คุณปรีชา",
    amount: 2800,
    approveDays: 2,
  },
  {
    doc: "EX-0016",
    daysAgo: 16,
    date: "22 ต.ค.",
    dept: "ไอที",
    title: "ค่าอุปกรณ์เครือข่าย",
    requester: "คุณวิชัย",
    amount: 3500,
    approveDays: 1,
  },
  {
    doc: "EX-0009",
    daysAgo: 20,
    date: "18 ต.ค.",
    dept: "การตลาด",
    title: "ค่าที่พักสัมมนา",
    requester: "คุณสุดา",
    amount: 9800,
    approveDays: 2,
  },
  {
    doc: "EX-0015",
    daysAgo: 22,
    date: "16 ต.ค.",
    dept: "ขาย",
    title: "ค่าเดินทางพบลูกค้า",
    requester: "คุณสมศักดิ์",
    amount: 6100,
    approveDays: 2,
  },
  {
    doc: "EX-0014",
    daysAgo: 25,
    date: "13 ต.ค.",
    dept: "การตลาด",
    title: "ค่าโฆษณาเฟซบุ๊ก",
    requester: "คุณสมชาย",
    amount: 8000,
    approveDays: 1,
  },
  {
    doc: "EX-0013",
    daysAgo: 27,
    date: "11 ต.ค.",
    dept: "ไอที",
    title: "ค่าหมึกพิมพ์",
    requester: "คุณวิชัย",
    amount: 1900,
    approveDays: 1,
  },
  {
    doc: "EX-0008",
    daysAgo: 28,
    date: "10 ต.ค.",
    dept: "อื่นๆ",
    title: "ค่าอาหารประชุม",
    requester: "คุณปรีชา",
    amount: 3200,
    approveDays: 1,
  },
  {
    doc: "EX-0007",
    daysAgo: 45,
    date: "23 ก.ย.",
    dept: "ขาย",
    title: "ค่าน้ำมันเยี่ยมลูกค้า",
    requester: "คุณมานี",
    amount: 5400,
    approveDays: 2,
  },
  {
    doc: "EX-0006",
    daysAgo: 60,
    date: "08 ก.ย.",
    dept: "การตลาด",
    title: "ค่าออกแบบโปสเตอร์",
    requester: "คุณสมชาย",
    amount: 15000,
    approveDays: 3,
  },
  {
    doc: "EX-0005",
    daysAgo: 80,
    date: "19 ส.ค.",
    dept: "ไอที",
    title: "ค่าต่ออายุโปรแกรม",
    requester: "คุณวิชัย",
    amount: 18900,
    approveDays: 1,
  },
  {
    doc: "EX-0004",
    daysAgo: 120,
    date: "10 ก.ค.",
    dept: "การตลาด",
    title: "ค่าเช่าบูธงานแสดงสินค้า",
    requester: "คุณสุดา",
    amount: 42000,
    approveDays: 2,
  },
  {
    doc: "EX-0003",
    daysAgo: 145,
    date: "15 มิ.ย.",
    dept: "ขาย",
    title: "ค่าเดินทางต่างจังหวัด",
    requester: "คุณมานี",
    amount: 7600,
    approveDays: 1,
  },
  {
    doc: "EX-0002",
    daysAgo: 220,
    date: "01 เม.ย.",
    dept: "อื่นๆ",
    title: "ค่าอุปกรณ์สำนักงาน",
    requester: "คุณปรีชา",
    amount: 6300,
    approveDays: 2,
  },
  {
    doc: "EX-0001",
    daysAgo: 300,
    date: "12 ม.ค.",
    dept: "การตลาด",
    title: "ค่าโฆษณาออนไลน์",
    requester: "คุณสมชาย",
    amount: 30000,
    approveDays: 1,
  },
];

// ยอดเบิกรายเดือน ย้อนหลัง 6 เดือน (ไว้วาดกราฟ)
const months = ["มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย."];

// แท็บช่วงเวลา: days = ย้อนหลังกี่วัน
const periods = [
  { label: "รายสัปดาห์", days: 7 },
  { label: "รายเดือน", days: 30 },
  { label: "รายไตรมาส", days: 90 },
  { label: "รายปี", days: 365 },
];

const depts = ["การตลาด", "ขาย", "ไอที", "อื่นๆ"];

// ════════════════════════════════════════
//  [3] ฟังก์ชันช่วย
// ════════════════════════════════════════

// ใส่ลูกน้ำให้ตัวเลข เช่น 12500 → "12,500"
function money(n: number) {
  return n.toLocaleString("th-TH"); // toLocaleString = ใส่ลูกน้ำแบบไทย
}

// แปลงคำขอจริง (ที่หน้าสร้างคำขอบันทึกไว้) → แถวแบบเดียวกับข้อมูลสมมติ
// จะได้ใช้คำนวณ / โชว์รวมกันได้เลย
function toReportRow(r: SavedRequest, today: Date): Request {
  const created = new Date(r.createdAt);
  const oneDay = 24 * 60 * 60 * 1000; // 1 วัน เป็นมิลลิวินาที
  const daysAgo = Math.floor((today.getTime() - created.getTime()) / oneDay);

  // ฝ่ายเอาจากโครงการ · ไม่ตรงกับแท็บในตาราง = "อื่นๆ"
  let dept = r.project ? r.project.dept : "อื่นๆ";
  if (!depts.includes(dept)) dept = "อื่นๆ";

  return {
    doc: r.id,
    daysAgo,
    date: created.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
    }), // เช่น "14 พ.ย."
    dept,
    title: r.title,
    requester: r.requester ? r.requester.fullName : "-",
    amount: r.total,
    approveDays: 0, // ยังอนุมัติไม่เสร็จ (0 = ไม่นับในค่าเฉลี่ย)
  };
}

// ════════════════════════════════════════
//  [4] หน้าหลัก (ส่วนคิด)
// ════════════════════════════════════════
export default function Report() {
  // ---------- [4.1] state ----------
  // [ของ, setของ] = useState(ค่าเริ่มต้น) · ค่าในกล่องเปลี่ยน → หน้าจอวาดใหม่ → ตัวเลขทุกอย่างข้างล่างคิดใหม่เอง
  const [days, setDays] = useState(30); // แท็บที่เลือก (เริ่มที่รายเดือน)
  const [dept, setDept] = useState("การตลาด"); // ฝ่ายที่เลือกในตาราง
  const [search, setSearch] = useState(""); // คำค้นเลขที่เอกสาร
  const [saved, setSaved] = useState<Request[]>([]); // คำขอจริงจาก localStorage
  const [budget, setBudget] = useState<Project[]>(projects); // งบที่รวมคำขอจริงแล้ว

  // อ่านคำขอจริงครั้งเดียวตอนเปิดหน้า ([] = ทำครั้งเดียว)
  // ※ ไม่เอาร่าง กับที่ถูกตีกลับ เพราะยังไม่ได้ใช้เงินจริง
  useEffect(() => {
    const today = new Date();
    const real = loadRequests().filter(
      (r) => r.status !== "ร่าง" && r.status !== "ตีกลับ",
    );
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage อ่านได้หลังเปิดหน้าเท่านั้น */
    setSaved(real.map((r) => toReportRow(r, today)));
    setBudget(addRequestsToBudget(real));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // คำขอทั้งหมด = คำขอจริง + ข้อมูลสมมติ
  const all = [...saved, ...requests];

  // ---------- [4.2] กรองตามช่วงเวลา ----------
  const list = all.filter((r) => r.daysAgo <= days); // filter = เก็บเฉพาะที่ผ่านเงื่อนไข: เบิกไม่เกินจำนวนวันของแท็บที่เลือก

  // ---------- [4.3] ตัวเลขบนการ์ด ----------
  // reduce = บวกทีละใบ · sum = ยอดสะสม · 0 ท้ายสุด = เริ่มนับจาก 0
  const total = list.reduce((sum, r) => sum + r.amount, 0); // รวมยอดเบิก
  const remaining = BUDGET - total; // งบคงเหลือ
  const count = list.length; // จำนวนคำขอ
  // เวลาอนุมัติเฉลี่ย: นับเฉพาะใบที่อนุมัติเสร็จแล้ว (approveDays > 0)
  const finished = list.filter((r) => r.approveDays > 0);
  const sumDays = finished.reduce((sum, r) => sum + r.approveDays, 0); // รวมจำนวนวันที่ใช้อนุมัติ
  // ทางแยก ? : → มีใบที่เสร็จ = รวมวัน ÷ จำนวนใบ (toFixed(1) = ทศนิยม 1 ตำแหน่ง) · ไม่มี = "0" (กันหารด้วย 0)
  const avgDays =
    finished.length > 0 ? (sumDays / finished.length).toFixed(1) : "0";
  // Math.round = ปัดเป็นจำนวนเต็ม
  const usedPercent = Math.round((total / BUDGET) * 100); // ใช้งบไปกี่ %

  // ---------- [4.4] เบิกสูงสุด 4 อันดับ ----------
  // ต้อง [...list] ก๊อปก่อน เพราะ sort จะไปเปลี่ยนลิสต์เดิม · b.amount - a.amount = เรียงมากไปน้อย
  const top = [...list].sort((a, b) => b.amount - a.amount).slice(0, 4); // ก๊อป → เรียงมากไปน้อย → ตัด 4 อันแรก

  // ---------- [4.5] ตารางรายฝ่าย: ฝ่ายที่เลือก + คำค้น ----------
  const rows = list.filter(
    (r) =>
      // === dept = ฝ่ายตรงกับแท็บ · && = ต้องจริงทั้งคู่ · includes = มีคำที่ค้นอยู่ในเลขเอกสารไหม · toLowerCase = ทำเป็นตัวเล็กหมด จะได้ไม่สนตัวพิมพ์ใหญ่/เล็ก
      r.dept === dept && r.doc.toLowerCase().includes(search.toLowerCase()),
  );

  // ---------- [4.6] กราฟ 6 เดือน ----------
  // แต่ละเดือน: กรองคำขอที่วันที่มีชื่อเดือนนั้น → บวกยอด
  const chart = months.map((m) => ({
    month: m,
    amount: all
      .filter((r) => r.date.includes(m)) // เก็บคำขอที่วันที่มีชื่อเดือนนี้
      .reduce((sum, r) => sum + r.amount, 0), // บวกยอดเงินของเดือนนั้น
  }));
  // ความสูงแท่ง: เทียบกับเดือนที่ยอดมากที่สุด
  const maxAmount = Math.max(...chart.map((c) => c.amount)); // ... แตกลิสต์ออกเป็นตัวเลขทีละตัว ให้ Math.max หาค่าที่มากที่สุด

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
    <div className="min-h-screen bg-[#F5F7FA] p-10 text-[#0F172A]">
      {/* ---------- [5.1] หัวข้อ + ค้นหา ---------- */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">รายงานงบประมาณ</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            สรุปการเบิกจ่ายสำหรับผู้บริหารและผู้ตรวจสอบบัญชี
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex w-64 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3">
            <Search1 size={18} className="text-[#94A3B8]" />
            <input
              className="w-full border-0 bg-transparent py-2 text-sm outline-none focus:ring-0"
              placeholder="ค้นหา..."
            />
          </div>
          <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white">
            <Bell1 size={18} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </button>
        </div>
      </div>

      {/* ---------- [5.2] แท็บช่วงเวลา ---------- */}
      <div className="mb-6 inline-flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
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

      {/* ---------- [5.3] การ์ด 4 ใบ ---------- */}
      <div className="mb-6 grid grid-cols-4 gap-5">
        {/* การ์ดใบแรก สีเข้ม */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#047857] p-5 text-white">
          <p className="flex items-center gap-2 text-sm text-gray-300">
            <Wallet2 size={16} className="text-[#34D399]" /> งบแผนกคงเหลือ
          </p>
          <p className="my-2 text-3xl font-bold">฿{money(remaining)}</p>
          <div className="h-1.5 rounded-full bg-white/15">
            <div
              className="h-1.5 rounded-full bg-[#34D399]"
              style={{ width: `${100 - usedPercent}%` }} // ความยาวหลอด = % งบที่เหลือ
            />
          </div>
        </div>
        <Card
          icon={<FileText size={16} />}
          label="คำขอเบิกทั้งหมด"
          value={String(count)}
          unit="รายการ"
        />
        <Card
          icon={<ClockThree size={16} />}
          label="ระยะเวลาอนุมัติเฉลี่ย"
          value={avgDays}
          unit="วัน"
        />
        <Card
          icon={<TrendUp2 size={16} />}
          label="ใช้งบไปแล้ว"
          value={usedPercent + "%"}
          unit={"฿" + money(total)}
        />
      </div>

      <div className="mb-6 flex gap-6">
        {/* ---------- [5.4] กราฟ 6 เดือน ---------- */}
        <section className="flex-1 rounded-2xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold">ยอดเบิกจ่ายย้อนหลัง 6 เดือน</h2>
          <div className="flex h-56 items-end gap-6 border-b border-gray-200 px-4">
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
        <section className="w-80 shrink-0 rounded-2xl border border-gray-200 bg-white p-6">
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
      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            งบตามโครงการ / หมวดค่าใช้จ่าย (งบทั้งปี)
          </h2>
          <span className="text-sm text-[#64748B]">
            {projectRows.length} โครงการ · งบรวม ฿{money(BUDGET)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {projectRows.map((p) => (
            <div key={p.id} className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-[#64748B]">{p.dept}</p>
              <p className="font-bold">{p.name}</p>
              <p className="mb-3 mt-1 text-sm text-[#64748B]">
                ใช้ไป <b className="text-[#0F172A]">฿{money(p.used)}</b> จาก ฿
                {money(p.limit)}
              </p>
              {p.categories.map((c) => {
                const percent = Math.round((c.used / c.limit) * 100);
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
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">สรุปการใช้งบรายฝ่าย</h2>
          <div className="flex w-64 items-center gap-2 rounded-xl border border-gray-200 px-3">
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
        <div className="mb-4 inline-flex gap-1 rounded-xl border border-gray-200 p-1">
          {/* map = สร้างปุ่มแท็บฝ่ายทีละฝ่าย */}
          {depts.map((d) => (
            <button
              key={d}
              onClick={() => setDept(d)} // กดแท็บ → เปลี่ยนฝ่ายในกล่อง dept
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${dept === d ? "bg-[#0F172A] text-white" : "text-[#64748B] hover:bg-gray-100"}`}
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
                  <span className="flex items-center gap-1">
                    <FileFormatPdf size={16} className="text-red-600" /> {r.doc}
                  </span>
                </td>
                <td className="py-3">{r.requester}</td>
                <td className="py-3 text-right font-bold">
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
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <p className="flex items-center gap-2 text-sm text-[#64748B]">
        {icon} {label}
      </p>
      <p className="mt-2 text-3xl font-bold">
        {value}{" "}
        <span className="text-sm font-normal text-[#64748B]">{unit}</span>
      </p>
    </div>
  );
}
