"use client";
// หน้าสร้างคำขอเบิก
//
// [1]  ชนิดข้อมูล
// [2]  ข้อมูลสมมติ: รายการงบ
// [3]  ฟังก์ชันช่วย: ใส่ลูกน้ำ, หาผู้อนุมัติตามยอดเงิน
// [4]  หน้าหลัก (ส่วนคิด)
//   [4.1] state: ค่าที่ผู้ใช้กรอก
//   [4.2] ยอดรวม (reduce) + งบที่เลือก
//   [4.3] เพิ่ม / ลบ / แก้ รายการค่าใช้จ่าย
//   [4.4] แนบไฟล์ / ลบไฟล์
//   [4.5] บันทึกลง localStorage
//   [4.6] ตรวจก่อนส่ง + ส่งคำขอ
//   [4.7] บันทึกร่าง
// [5]  หน้าจอ (ส่วนแสดงผล)
//   [5.1] เมนูซ้าย
//   [5.2] หัวข้อหน้า
//   [5.3] ประเภทคำขอ (ปุ่มสลับ)
//   [5.4] ชื่อคำขอ
//   [5.5] เลือกงบ + วันที่ใช้จ่าย
//   [5.6] เหตุผลการเบิก
//   [5.7] รายการค่าใช้จ่าย (แต่ละแถว + ปุ่มถังขยะ)
//   [5.8] ปุ่มเพิ่มรายการ + กล่องยอดรวม
//   [5.9] แนบไฟล์
//   [5.10] การ์ดสรุปยอด (คอลัมน์ขวา)
//   [5.11] เส้นทางการอนุมัติ
//   [5.12] บัญชีรับเงิน + ข้อความแจ้ง + ปุ่มส่ง/ร่าง
// [6]  ชิ้นส่วนเล็กที่ใช้ซ้ำ: MenuItem, Label, TypeButton, Step

import { useState } from "react";
import {
  DashboardSquare1,
  Plus,
  FileText,
  ClockThree,
  Gear1,
  Exit,
  Wallet2,
  Calendar,
  Trash1,
  Upload1,
  Send1,
  User2,
} from "@tailgrids/icons";

// ===== [1] ชนิดข้อมูล (TypeScript) =====
// บอกว่า "รายการค่าใช้จ่าย 1 แถว" ต้องมีอะไรบ้าง
type Item = { name: string; amount: string };

// ===== [2] ข้อมูลสมมติ (ตอนนี้ยังไม่มี backend) =====
const budgets = [
  { id: 1, name: "การตลาด › สัมมนาประจำปี › ค่าเดินทาง", remaining: 42000 },
  { id: 2, name: "การตลาด › สัมมนาประจำปี › ค่าที่พัก", remaining: 22000 },
  { id: 3, name: "การตลาด › เปิดตัวสินค้า › ค่าออกแบบ", remaining: 15000 },
];

// สไตล์ช่องกรอก ใช้ซ้ำทุกช่อง
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#059669] focus:bg-white focus:ring-0";

// ===== [3] ฟังก์ชันช่วย =====

// ใส่ลูกน้ำให้ตัวเลข เช่น 12500 → "12,500"
function money(n: number) {
  return n.toLocaleString("th-TH");
}

// หาผู้อนุมัติตามยอดเงิน
function getApprover(total: number) {
  if (total <= 5000) return "ไม่ต้องผ่านหัวหน้า";
  if (total <= 10000) return "หัวหน้าแผนก";
  return "หัวหน้าสายงาน";
}

// ===== [4] หน้าหลัก =====
export default function NewRequest() {
  // ---- [4.1] state = ตัวแปรที่เปลี่ยนแล้วหน้าจอเปลี่ยนตาม ----
  const [type, setType] = useState("advance"); // advance = สำรองจ่าย, invoice = ใบแจ้งหนี้
  const [title, setTitle] = useState("");
  const [budgetId, setBudgetId] = useState("");
  const [useDate, setUseDate] = useState("");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<Item[]>([{ name: "", amount: "" }]); // เริ่มที่ 1 แถว
  const [files, setFiles] = useState<string[]>([]); // ชื่อไฟล์ที่แนบ
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  // ---- [4.2] ค่าที่คำนวณจาก state ----
  const total = items.reduce((sum, it) => sum + Number(it.amount || 0), 0); // รวมยอดทุกแถว
  const budget = budgets.find((b) => b.id === Number(budgetId));
  const fileLabel = type === "advance" ? "ใบเสร็จ" : "ใบแจ้งหนี้";

  // ---- [4.3] รายการค่าใช้จ่าย ----
  function addItem() {
    setItems([...items, { name: "", amount: "" }]); // ก๊อปของเดิม + เพิ่มแถวว่าง
  }
  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index)); // เก็บทุกแถว ยกเว้นแถวที่กดลบ
  }
  function changeName(index: number, value: string) {
    const copy = [...items]; // ก๊อปรายการทั้งหมด
    copy[index] = { name: value, amount: copy[index].amount }; // แถวนี้: เปลี่ยนชื่อ จำนวนเงินเหมือนเดิม
    setItems(copy);
  }
  function changeAmount(index: number, value: string) {
    const copy = [...items]; // ก๊อปรายการทั้งหมด
    copy[index] = { name: copy[index].name, amount: value }; // แถวนี้: ชื่อเหมือนเดิม เปลี่ยนจำนวนเงิน
    setItems(copy);
  }

  // ---- [4.4] แนบไฟล์ ----
  function addFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const names = Array.from(e.target.files ?? []).map((f) => f.name);
    setFiles([...files, ...names]);
  }
  function removeFile(index: number) {
    setFiles(files.filter((_, i) => i !== index));
  }

  // ---- [4.5] บันทึกลง localStorage ----
  function saveRequest(status: string) {
    const stored = localStorage.getItem("requests");
    const requests = stored ? JSON.parse(stored) : [];
    const newRequest = {
      id: requests.length + 1, // เลขที่คำขอ = จำนวนที่มีอยู่ + 1
      type,
      title,
      budgetId,
      useDate,
      reason,
      items,
      files,
      total,
      approver: getApprover(total),
      status,
    };
    localStorage.setItem("requests", JSON.stringify([...requests, newRequest]));
  }

  // ---- [4.6] ตรวจก่อนส่ง ----
  function submit() {
    const list: string[] = [];
    if (!title) list.push("กรุณากรอกชื่อคำขอ");
    if (!budget) list.push("กรุณาเลือกงบที่ใช้");
    if (total <= 0) list.push("กรุณากรอกจำนวนเงินอย่างน้อย 1 รายการ");
    if (files.length === 0) list.push("กรุณาแนบ" + fileLabel);
    if (budget && total > budget.remaining) list.push("ยอดเงินเกินงบคงเหลือ");

    setErrors(list);
    if (list.length > 0) {
      setMessage("");
      return;
    }
    saveRequest("รออนุมัติ");
    setMessage("ส่งคำขอเรียบร้อย ระบบส่งต่อให้ " + getApprover(total));
  }

  // ---- [4.7] บันทึกร่าง ----
  function saveDraft() {
    saveRequest("ร่าง");
    setErrors([]);
    setMessage("บันทึกร่างแล้ว");
  }

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
        <MenuItem icon={<Plus size={20} />} text="สร้างคำขอ" active />
        <MenuItem icon={<FileText size={20} />} text="คำขอของฉัน" badge={2} />
        <MenuItem icon={<ClockThree size={20} />} text="ประวัติการเบิก" />
        <p className="mb-2 mt-6 px-3 text-xs">บัญชี</p>
        <MenuItem icon={<Gear1 size={20} />} text="ตั้งค่า" />
        <MenuItem icon={<Exit size={20} />} text="ออกจากระบบ" />

        {/* ผู้ใช้ */}
        <div className="mt-auto flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#34D399] text-sm font-bold text-[#0F172A]">
            เน
          </div>
          <div>
            <p className="text-sm font-bold text-white">คุณเนส</p>
            <p className="text-xs">พนักงาน · การตลาด</p>
          </div>
        </div>
      </aside>

      {/* ---------- เนื้อหา ---------- */}
      <main className="flex-1 p-10">
        {/* ---------- [5.2] หัวข้อหน้า ---------- */}
        <p className="text-sm text-[#64748B]">
          ‹ แดชบอร์ด /{" "}
          <span className="font-semibold text-[#047857]">สร้างคำขอ</span>
        </p>
        <h1 className="mb-6 text-3xl font-bold">สร้างคำขอเบิก</h1>

        <div className="flex gap-6">
          {/* ===== คอลัมน์ซ้าย: ฟอร์ม ===== */}
          <section className="flex-1 rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold">ข้อมูลคำขอ</h2>

            {/* ---------- [5.3] ประเภทคำขอ (ปุ่มสลับ) ---------- */}
            <Label text="ประเภทคำขอ" />
            <div className="mb-4 flex gap-2 rounded-xl bg-gray-100 p-1">
              <TypeButton
                active={type === "invoice"}
                onClick={() => setType("invoice")}
                icon={<ClockThree size={16} />}
                text="ให้บัญชีจ่ายตามใบแจ้งหนี้"
              />
              <TypeButton
                active={type === "advance"}
                onClick={() => setType("advance")}
                text="สำรองจ่ายแล้ว (ขอเบิกคืน)"
              />
            </div>

            {/* ---------- [5.4] ชื่อคำขอ ---------- */}
            <Label text="ชื่อคำขอ" />
            <input
              className={`${inputClass} mb-4`}
              placeholder="เช่น ค่าเดินทางสัมมนา เชียงใหม่"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            {/* ---------- [5.5] เลือกงบ + วันที่ใช้จ่าย ---------- */}
            <div className="mb-4 flex gap-4">
              <div className="flex-[2]">
                <Label text="งบที่ใช้" />
                <select
                  className={inputClass}
                  value={budgetId}
                  onChange={(e) => setBudgetId(e.target.value)}
                >
                  <option value="">-- เลือกงบ --</option>
                  {budgets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {budget && (
                  <p className="mt-1 text-xs text-[#64748B]">
                    คงเหลือในรายการนี้{" "}
                    <b className="text-[#047857]">฿{money(budget.remaining)}</b>
                  </p>
                )}
              </div>
              <div className="flex-1">
                <Label text="วันที่ใช้จ่าย" />
                <input
                  type="date"
                  className={inputClass}
                  value={useDate}
                  onChange={(e) => setUseDate(e.target.value)}
                />
              </div>
            </div>

            {/* ---------- [5.6] เหตุผลการเบิก ---------- */}
            <Label text="เหตุผลการเบิก" />
            <textarea
              className={`${inputClass} mb-6 h-20`}
              placeholder="เช่น เดินทางไปสัมมนาที่เชียงใหม่ ใช้เงินส่วนตัวสำรองจ่ายไปก่อน"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            {/* ---------- [5.7] รายการค่าใช้จ่าย ---------- */}
            <div className="mb-3 flex items-center justify-between border-t border-gray-100 pt-4">
              <h2 className="text-base font-bold">รายการค่าใช้จ่าย</h2>
              <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs text-[#64748B]">
                {items.length} รายการ
              </span>
            </div>

            {/* หัวคอลัมน์ */}
            <div className="mb-1.5 flex gap-2 px-1 text-xs font-semibold text-[#64748B]">
              <span className="flex-1">รายการ</span>
              <span className="w-40">จำนวนเงิน</span>
              <span className="w-11" />
            </div>

            {/* แถวรายการ */}
            {items.map((it, i) => (
              <div key={i} className="mb-2.5 flex gap-2">
                <input
                  className={`${inputClass} flex-1 bg-white`}
                  placeholder="เช่น ค่าตั๋วเครื่องบิน"
                  value={it.name}
                  onChange={(e) => changeName(i, e.target.value)}
                />
                <div className="flex w-40 items-center rounded-xl border border-gray-200 bg-white px-3 focus-within:border-[#059669]">
                  <span className="text-sm text-[#94A3B8]">฿</span>
                  <input
                    type="number"
                    className="w-full border-0 bg-transparent px-1 py-2.5 text-right text-sm font-bold outline-none focus:ring-0"
                    placeholder="0"
                    value={it.amount}
                    onChange={(e) => changeAmount(i, e.target.value)}
                  />
                </div>
                <button
                  onClick={() => removeItem(i)}
                  disabled={items.length === 1}
                  className="flex w-11 items-center justify-center rounded-xl border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FECACA] disabled:opacity-30"
                >
                  <Trash1 size={18} />
                </button>
              </div>
            ))}

            {/* ---------- [5.8] ปุ่มเพิ่มรายการ + ยอดรวม ---------- */}
            <button
              onClick={addItem}
              className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-[#059669] py-2.5 text-sm font-semibold text-[#047857] hover:bg-[#ECFDF5]"
            >
              <Plus size={16} /> เพิ่มรายการ
            </button>

            {/* ยอดรวม */}
            <div className="mb-6 mt-3 flex items-center justify-between rounded-xl bg-[#ECFDF5] px-4 py-3.5 text-[#047857]">
              <span className="text-sm">ยอดรวม</span>
              <b className="text-2xl">฿{money(total)}</b>
            </div>

            {/* ---------- [5.9] แนบไฟล์ ---------- */}
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">
                {type === "advance" ? "ใบเสร็จรับเงิน" : "ใบแจ้งหนี้"}
                <span className="ml-2 rounded-md bg-red-100 px-2 py-0.5 text-xs text-red-700">
                  จำเป็น
                </span>
              </h2>
              <span className="text-xs text-[#94A3B8]">
                PDF, JPG ไม่เกิน 10 MB
              </span>
            </div>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 py-4 text-sm text-[#64748B] hover:bg-gray-100">
              <Upload1 size={20} className="text-[#059669]" />
              ลากไฟล์มาวาง หรือ <b className="text-[#047857]">เลือกไฟล์</b>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={addFiles}
              />
            </label>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {files.map((name, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 p-2 text-sm"
                >
                  <div className="rounded-lg bg-red-100 p-1.5">
                    <FileText size={16} className="text-red-600" />
                  </div>
                  <span className="flex-1 truncate">{name}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash1 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* ===== คอลัมน์ขวา: สรุป ===== */}
          <section className="w-96 shrink-0 space-y-6">
            {/* ---------- [5.10] การ์ดสรุปยอด ---------- */}
            <div className="rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#047857] p-6 text-white">
              <p className="flex items-center gap-2 text-sm text-gray-300">
                <Wallet2 size={18} className="text-[#34D399]" /> ยอดรวมที่ขอเบิก
              </p>
              <p className="my-1 text-4xl font-bold">฿{money(total)}</p>
              <p className="text-sm text-[#A7F3D0]">
                {items.length} รายการ · {fileLabel} {files.length} ไฟล์
              </p>
              <hr className="my-4 border-white/15" />
              <div className="flex items-center justify-between text-sm text-gray-300">
                <span className="flex items-center gap-2">
                  <Calendar size={16} className="text-[#34D399]" />{" "}
                  งบคงเหลือหลังอนุมัติ
                </span>
                <b className="text-lg text-white">
                  {budget ? "฿" + money(budget.remaining - total) : "-"}
                </b>
              </div>
              <p className="mt-2 rounded-lg bg-white/10 px-3 py-2 text-xs text-[#D1FAE5]">
                ได้รับเงินทันทีเมื่อฝ่ายบัญชีอนุมัติ
              </p>
            </div>

            {/* ---------- [5.11] เส้นทางการอนุมัติ (เปลี่ยนตามยอดเงิน) ---------- */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-bold">เส้นทางการอนุมัติ</h2>
              <Step
                avatar={
                  <span className="text-xs font-bold text-[#0F172A]">เน</span>
                }
                color="bg-[#34D399]"
                text="คุณ (ผู้ขอ)"
                sub="ส่งคำขอ"
              />
              <Step
                avatar={<User2 size={18} className="text-[#047857]" />}
                color="bg-[#D1FAE5]"
                text={getApprover(total)}
                sub="อนุมัติขั้นที่ 1"
              />
              <Step
                avatar={<User2 size={18} className="text-[#3730A3]" />}
                color="bg-[#E0E7FF]"
                text="ฝ่ายบัญชี"
                sub="ตรวจและจ่ายเงิน · ขั้นสุดท้าย"
                last
              />
            </div>

            {/* ---------- [5.12] บัญชีรับเงิน + ข้อความแจ้ง + ปุ่ม ---------- */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <Label text="โอนเงินคืนเข้าบัญชี" />
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                <div className="h-9 w-9 rounded-full bg-[#D1FAE5]" />
                <div className="flex-1">
                  <p className="text-sm font-bold">กสิกรไทย ••• 4521</p>
                  <p className="text-xs text-[#64748B]">คุณเนส</p>
                </div>
              </div>

              {/* ข้อความผิดพลาด / สำเร็จ */}
              {errors.length > 0 && (
                <ul className="mb-3 list-disc rounded-xl bg-red-50 py-2 pl-8 pr-3 text-sm text-red-700">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
              {message && (
                <p className="mb-3 rounded-xl bg-[#ECFDF5] p-3 text-sm text-[#047857]">
                  {message}
                </p>
              )}

              <button
                onClick={submit}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#059669] py-3 font-bold text-white hover:bg-[#047857]"
              >
                <Send1 size={18} /> ส่งคำขอ
              </button>
              <button
                onClick={saveDraft}
                className="mt-2 w-full rounded-xl bg-gray-100 py-3 font-semibold text-gray-600 hover:bg-gray-200"
              >
                บันทึกร่าง
              </button>
            </div>
          </section>
        </div>
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

// [6.2] Label = ข้อความหัวช่องกรอก
function Label({ text }: { text: string }) {
  return <p className="mb-1.5 mt-3 text-sm font-semibold">{text}</p>;
}

// [6.3] TypeButton = ปุ่มเลือกประเภทคำขอ
function TypeButton({
  active,
  onClick,
  icon,
  text,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  text: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold ${active ? "border-2 border-[#059669] bg-white text-[#047857]" : "text-[#64748B]"}`}
    >
      {icon} {text}
    </button>
  );
}

// [6.4] Step = 1 ขั้นในเส้นทางการอนุมัติ
function Step({
  avatar,
  color,
  text,
  sub,
  last,
}: {
  avatar: React.ReactNode;
  color: string;
  text: string;
  sub: string;
  last?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full ${color}`}
        >
          {avatar}
        </div>
        {!last && <div className="my-1 w-0.5 flex-1 bg-gray-300" />}
      </div>
      <div className="pb-4">
        <p className="text-sm font-bold">{text}</p>
        <p className="text-xs text-[#64748B]">{sub}</p>
      </div>
    </div>
  );
}
