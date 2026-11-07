"use client";
// หน้ารายงานงบประมาณ
//

// [1]  ชนิดข้อมูล
// [2]  ข้อมูลสมมติ: งบ, คำขอเบิก, กราฟ, แท็บ
// [3]  ฟังก์ชันช่วย: ใส่ลูกน้ำ
// [4]  หน้าหลัก (ส่วนคิด)
//   [4.1] state: แท็บช่วงเวลา, ฝ่าย, คำค้น
//   [4.2] กรองคำขอตามช่วงเวลา (filter)
//   [4.3] ตัวเลขบนการ์ด 4 ใบ (reduce, length)
//   [4.4] รายการเบิกสูงสุด 4 อันดับ (sort, slice)
//   [4.5] ตารางรายฝ่าย: กรองตามฝ่าย + คำค้น (filter)
//   [4.6] ความสูงแท่งกราฟ (Math.max)
// [5]  หน้าจอ (ส่วนแสดงผล)
//   [5.1] เมนูซ้าย
//   [5.2] หัวข้อหน้า + ช่องค้นหา + กระดิ่ง
//   [5.3] แท็บเลือกช่วงเวลา
//   [5.4] การ์ดสรุป 4 ใบ
//   [5.5] กราฟแท่งย้อนหลัง 6 เดือน
//   [5.6] รายการเบิกจ่ายสูงสุด
//   [5.7] ตารางสรุปการใช้งบรายฝ่าย
// [6]  ชิ้นส่วนเล็กที่ใช้ซ้ำ: MenuItem, Card

import { useState } from "react";
import {
  DashboardSquare1,
  FileText,
  Dollar,
  Wallet2,
  BarChart2,
  Gear1,
  Exit,
  Search1,
  Bell1,
  ClockThree,
  TrendUp2,
  FileFormatPdf,
} from "@tailgrids/icons";

// ===== [1] ชนิดข้อมูล (TypeScript) =====
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

// ===== [2] ข้อมูลสมมติ (ตอนนี้ยังไม่มี backend) =====
const BUDGET = 500000; // งบทั้งปีของแผนก

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

// แต่ละเดือน: กรองคำขอที่วันที่มีชื่อเดือนนั้น → บวกยอด
const chart = months.map((m) => ({
  month: m,
  amount: requests
    .filter((r) => r.date.includes(m))
    .reduce((sum, r) => sum + r.amount, 0),
}));

// แท็บช่วงเวลา: days = ย้อนหลังกี่วัน
const periods = [
  { label: "รายสัปดาห์", days: 7 },
  { label: "รายเดือน", days: 30 },
  { label: "รายไตรมาส", days: 90 },
  { label: "รายปี", days: 365 },
];

const depts = ["การตลาด", "ขาย", "ไอที", "อื่นๆ"];

// ===== [3] ฟังก์ชันช่วย =====

// ใส่ลูกน้ำให้ตัวเลข เช่น 12500 → "12,500"
function money(n: number) {
  return n.toLocaleString("th-TH");
}

// ===== [4] หน้าหลัก =====
export default function Report() {
  // ---- [4.1] state = ตัวแปรที่เปลี่ยนแล้วหน้าจอเปลี่ยนตาม ----
  const [days, setDays] = useState(30); // แท็บที่เลือก (เริ่มที่รายเดือน)
  const [dept, setDept] = useState("การตลาด"); // ฝ่ายที่เลือกในตาราง
  const [search, setSearch] = useState(""); // คำค้นเลขที่เอกสาร

  // ---- [4.2] เก็บเฉพาะคำขอที่อยู่ในช่วงเวลาที่เลือก ----
  const list = requests.filter((r) => r.daysAgo <= days);

  // ---- [4.3] ตัวเลขบนการ์ด ----
  const total = list.reduce((sum, r) => sum + r.amount, 0); // รวมยอดเบิก
  const remaining = BUDGET - total; // งบคงเหลือ
  const count = list.length; // จำนวนคำขอ
  const sumDays = list.reduce((sum, r) => sum + r.approveDays, 0);
  const avgDays = count > 0 ? (sumDays / count).toFixed(1) : "0"; // เวลาอนุมัติเฉลี่ย
  const usedPercent = Math.round((total / BUDGET) * 100); // ใช้งบไปกี่ %

  // ---- [4.4] 4 อันดับที่เบิกเยอะสุด ----
  const top = [...list].sort((a, b) => b.amount - a.amount).slice(0, 4); // ก๊อป → เรียงมากไปน้อย → ตัด 4 อันแรก

  // ---- [4.5] ตาราง: เก็บเฉพาะฝ่ายที่เลือก และเลขที่เอกสารมีคำที่ค้น ----
  const rows = list.filter(
    (r) =>
      r.dept === dept && r.doc.toLowerCase().includes(search.toLowerCase()),
  );

  // ---- [4.6] กราฟ: แท่งที่สูงสุด = 100% ----
  const maxAmount = Math.max(...chart.map((c) => c.amount));

  // ===== [5] หน้าจอ =====
  return (
    <div className="flex min-h-screen bg-[#F5F7FA] text-[#0F172A]">
      {/* ---------- [5.1] เมนูซ้าย (ถ้าทีมทำเมนูกลางแล้ว ลบส่วนนี้ได้) ---------- */}
      <aside className="flex w-64 shrink-0 flex-col bg-[#0F172A] p-4 text-[#94A3B8]">
        <div className="mb-8 flex items-center gap-2 px-2 text-xl font-bold text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#059669] text-base">
            B
          </div>
          BudgetFlow
        </div>
        <p className="mb-2 px-3 text-xs">เมนูหลัก</p>
        <MenuItem icon={<DashboardSquare1 size={20} />} text="แดชบอร์ด" />
        <MenuItem
          icon={<FileText size={20} />}
          text="รอตรวจและจ่ายเงิน"
          badge={5}
        />
        <MenuItem icon={<Dollar size={20} />} text="ประวัติการจ่าย" />
        <MenuItem icon={<Wallet2 size={20} />} text="จัดการงบประมาณ" />
        <MenuItem icon={<BarChart2 size={20} />} text="รายงาน" active />
        <p className="mb-2 mt-6 px-3 text-xs">บัญชี</p>
        <MenuItem icon={<Gear1 size={20} />} text="ตั้งค่า" />
        <MenuItem icon={<Exit size={20} />} text="ออกจากระบบ" />

        {/* ผู้ใช้ */}
        <div className="mt-auto flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E0E7FF] text-sm font-bold text-[#3730A3]">
            เอ
          </div>
          <div>
            <p className="text-sm font-bold text-white">คุณเอ</p>
            <p className="text-xs">ฝ่ายบัญชี</p>
          </div>
        </div>
      </aside>

      {/* ---------- เนื้อหา ---------- */}
      <main className="flex-1 p-10">
        {/* ---------- [5.2] หัวข้อหน้า + ช่องค้นหา + กระดิ่ง ---------- */}
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

        {/* ---------- [5.3] แท็บเลือกช่วงเวลา ---------- */}
        <div className="mb-6 inline-flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
          {periods.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${days === p.days ? "bg-[#0F172A] text-white" : "text-[#64748B] hover:bg-gray-100"}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* ---------- [5.4] การ์ดสรุป 4 ใบ ---------- */}
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
                style={{ width: `${100 - usedPercent}%` }}
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
          {/* ---------- [5.5] กราฟแท่งย้อนหลัง 6 เดือน ---------- */}
          <section className="flex-1 rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">
              ยอดเบิกจ่ายย้อนหลัง 6 เดือน
            </h2>
            <div className="flex h-56 items-end gap-6 border-b border-gray-200 px-4">
              {chart.map((c, i) => (
                <div
                  key={c.month}
                  className="flex h-full flex-1 flex-col items-center justify-end"
                >
                  <span className="mb-1 text-xs text-[#64748B]">
                    {money(c.amount)}
                  </span>
                  <div
                    className={`w-full rounded-t-lg ${i === chart.length - 1 ? "bg-[#059669]" : "bg-[#CBD5E1]"}`}
                    style={{ height: `${(c.amount / maxAmount) * 85}%` }}
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

          {/* ---------- [5.6] รายการเบิกจ่ายสูงสุด ---------- */}
          <section className="w-80 shrink-0 rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="mb-2 text-lg font-bold">รายการเบิกจ่ายสูงสุด</h2>
            {top.length === 0 && (
              <p className="py-6 text-center text-sm text-[#94A3B8]">
                ไม่มีรายการในช่วงนี้
              </p>
            )}
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

        {/* ---------- [5.7] ตารางสรุปการใช้งบรายฝ่าย ---------- */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">สรุปการใช้งบรายฝ่าย</h2>
            <div className="flex w-64 items-center gap-2 rounded-xl border border-gray-200 px-3">
              <Search1 size={18} className="text-[#94A3B8]" />
              <input
                className="w-full border-0 bg-transparent py-2 text-sm outline-none focus:ring-0"
                placeholder="ค้นหาเลขที่เอกสาร"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* แท็บฝ่าย */}
          <div className="mb-4 inline-flex gap-1 rounded-xl border border-gray-200 p-1">
            {depts.map((d) => (
              <button
                key={d}
                onClick={() => setDept(d)}
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
              {rows.map((r) => (
                <tr key={r.doc} className="border-b border-gray-100">
                  <td className="py-3 text-[#64748B]">{r.date}</td>
                  <td className="py-3 font-semibold">{r.title}</td>
                  <td className="py-3">
                    <span className="flex items-center gap-1">
                      <FileFormatPdf size={16} className="text-red-600" />{" "}
                      {r.doc}
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
          {rows.length === 0 && (
            <p className="py-6 text-center text-sm text-[#94A3B8]">
              ไม่พบรายการ
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

// ===== [6] ชิ้นส่วนเล็ก ๆ ที่ใช้ซ้ำ (component) =====

// [6.1] MenuItem = ปุ่มเมนูซ้าย 1 อัน
function MenuItem({
  icon,
  text,
  active,
  badge,
}: {
  icon: React.ReactNode;
  text: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <div
      className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${active ? "bg-[#059669] font-semibold text-white" : "hover:bg-white/5"}`}
    >
      {icon} <span className="flex-1">{text}</span>
      {badge && (
        <span className="rounded-full bg-[#059669] px-2 text-xs font-bold text-white">
          {badge}
        </span>
      )}
    </div>
  );
}

// [6.2] Card = การ์ดสรุปตัวเลข 1 ใบ (สีขาว)
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
