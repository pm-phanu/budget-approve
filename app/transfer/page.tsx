"use client";

import { useState } from "react";

type Budget = { id: string; name: string; left: number };
type Result = { id: string; createdAt: Date; from: Budget; to: Budget; amount: number; reason: string };


const BUDGETS: Budget[] = [
  { id: "mkt", name: "ค่าใช้จ่ายการตลาด (Marketing)", left: 50000 },
  { id: "dev", name: "ค่าใช้จ่ายพัฒนาโปรเจกต์ (Development)", left: 120000 },
  { id: "sale", name: "ค่าเดินทางฝ่ายขาย (Sales)", left: 16400 },
];

const STEPS = ["เลือกงบต้นทาง", "เลือกปลายทาง", "ตรวจสอบและยืนยัน"];
const baht = (n: number) => n.toLocaleString("th-TH");


async function submitTransfer(data: { fromId: string; toId: string; amount: number; reason: string }) {
  await new Promise((r) => setTimeout(r, 600));
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return { id: `TRF${d}-001`, createdAt: new Date(), ...data };
}

export default function Transfer() {
  const [step, setStep] = useState(1);
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const from = BUDGETS.find((b) => b.id === fromId);
  const to = BUDGETS.find((b) => b.id === toId);
  const amt = Number(amount);
  const total = BUDGETS.reduce((s, b) => s + b.left, 0);

  function validate() {
    if (step === 1 && !from) return "กรุณาเลือกงบต้นทาง";
    if (step === 2) {
      if (!to) return "กรุณาเลือกงบปลายทาง";
      if (!Number.isInteger(amt) || amt <= 0) return "กรุณากรอกจำนวนเงินเป็นจำนวนเต็มบาทที่มากกว่า 0";
      if (from && amt > from.left) return `จำนวนเกินงบคงเหลือ (${baht(from.left)} บาท)`;
      if (!reason.trim()) return "กรุณาระบุเหตุผลในการโยกงบ";
    }
    return "";
  }

  async function next() {
    const e = validate();
    setError(e);
    if (e) return;
    if (step < 3) return setStep(step + 1);
    if (!from || !to) return;
    setLoading(true);
    try {
      const r = await submitTransfer({ fromId: from.id, toId: to.id, amount: amt, reason: reason.trim() });
      setResult({ id: r.id, createdAt: r.createdAt, from, to, amount: amt, reason: reason.trim() });
    } catch {
      setError("ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  function back() {
    setError("");
    if (step === 1) { setFromId(null); return; }
    setStep(step - 1);
  }

  function reset() {
    setStep(1); setFromId(null); setToId(null); setAmount(""); setReason(""); setError(""); setResult(null);
  }

  const option = (b: Budget, selected: boolean, onClick: () => void) => (
    <button
      key={b.id}
      type="button"
      onClick={onClick}
      className={`mb-2 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
        selected ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-400"
      }`}
    >
      <span>{b.name}</span>
      <span className="font-semibold text-emerald-600">คงเหลือ {baht(b.left)} บาท</span>
    </button>
  );

  
  if (result) {
    const timeline = [
      { t: "ส่งคำขอแล้ว", s: result.createdAt.toLocaleString("th-TH"), state: "done" },
      { t: "รออนุมัติจากผู้จัดการฝ่าย", s: "กำลังรอพิจารณา...", state: "current" },
      { t: "รออนุมัติจากฝ่ายการเงิน", s: "หลังจากได้รับอนุมัติจากผู้จัดการฝ่ายแล้ว", state: "todo" },
      { t: "ดำเนินการโอนงบ", s: "ระบบจะโยกงบให้โดยอัตโนมัติ", state: "todo" },
    ];
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-3xl font-bold">สรุปและติดตามสถานะ</h1>
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-emerald-600 text-2xl text-white">✓</div>
          <div>
            <h2 className="text-xl font-bold">ส่งคำขอโยกงบประมาณเรียบร้อยแล้ว</h2>
            <p>เลขที่รายการ: {result.id}</p>
          </div>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold">รายละเอียดการโยกงบ</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><p className="text-sm text-slate-500">งบจาก</p><b>{result.from.name}</b></div>
            <div><p className="text-sm text-slate-500">โอนไปยัง</p><b>{result.to.name}</b></div>
            <div><p className="text-sm text-slate-500">จำนวนที่โยก</p><p className="text-3xl font-bold">{baht(result.amount)} <span className="text-base font-normal">บาท</span></p></div>
            <div className="rounded-xl bg-emerald-50 p-4"><b>เหตุผล</b><p>{result.reason}</p></div>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold">สถานะปัจจุบัน</h2>
          <ul>
            {timeline.map((x) => (
              <li key={x.t} className="flex gap-3 pb-5">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm ${
                  x.state === "done" ? "bg-emerald-600 text-white" : x.state === "current" ? "border-4 border-emerald-600 bg-white" : "bg-slate-200 text-slate-500"}`}>
                  {x.state === "done" ? "✓" : ""}
                </span>
                <div className="flex-1"><b>{x.t}</b><p className="text-sm text-slate-500">{x.s}</p></div>
                {x.state === "done" && <span className="h-fit rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">เสร็จสิ้น</span>}
                {x.state === "current" && <span className="h-fit rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">รอดำเนินการ</span>}
              </li>
            ))}
          </ul>
        </section>
        <button onClick={reset} className="w-full rounded-xl border border-slate-200 bg-white py-3 font-semibold hover:bg-slate-50">
          ‹ ทำรายการใหม่
        </button>
      </main>
    );
  }

  
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <header>
        <h1 className="text-3xl font-bold">โยกงบประมาณ</h1>
        <p className="text-slate-500">โอนย้ายงบประมาณจากแผนกหรือหมวดที่มี ไปยังหมวดที่ต้องการ</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {[["งบประมาณคงเหลือทั้งหมด", `${baht(total)} บาท`], ["รายการโยกงบทั้งหมด", "12 รายการ"], ["รออนุมัติ", "2 รายการ"]].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">{k}</p>
            <p className="mt-1 text-2xl font-bold">{v}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold">ทำรายการโยกงบ</h2>

        <ol className="mb-6 flex">
          {STEPS.map((s, i) => {
            const n = i + 1;
            return (
              <li key={s} className={`relative flex-1 text-center text-sm ${step >= n ? "font-semibold" : "text-slate-500"}`}>
                {i > 0 && <span className={`absolute left-[-50%] top-4 h-0.5 w-full ${step >= n ? "bg-emerald-600" : "bg-slate-200"}`} />}
                <span className={`relative mx-auto mb-1 grid h-8 w-8 place-items-center rounded-full text-white ${step >= n ? "bg-emerald-600" : "bg-slate-300"}`}>
                  {step > n ? "✓" : n}
                </span>
                {s}
              </li>
            );
          })}
        </ol>

        {step === 1 && (
          <div>
            <p className="mb-2 font-semibold">งบจาก</p>
            {BUDGETS.map((b) => option(b, fromId === b.id, () => { setFromId(b.id); if (toId === b.id) setToId(null); setError(""); }))}
          </div>
        )}

        {step === 2 && from && (
          <div>
            <p className="mb-2 font-semibold">โอนไปยัง</p>
            {BUDGETS.filter((b) => b.id !== fromId).map((b) => option(b, toId === b.id, () => { setToId(b.id); setError(""); }))}

            <label htmlFor="amount" className="mb-2 mt-5 block font-semibold">จำนวนที่ต้องการโยก (บาท)</label>
            <input id="amount" type="number" min={1} step={1} inputMode="numeric" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600" />
            {amt > 0 && amt <= from.left && (
              <p className="mt-1 text-sm text-emerald-600">ยอดคงเหลือหลังโยก: {baht(from.left - amt)} บาท</p>
            )}

            <label htmlFor="reason" className="mb-2 mt-5 block font-semibold">เหตุผลในการโยกงบ <span className="font-normal text-slate-500">(จำเป็นต้องระบุ)</span></label>
            <textarea id="reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-600" />
            <p className="text-right text-xs text-slate-500">{reason.length} / 500</p>
          </div>
        )}

        {step === 3 && from && to && (
          <dl className="divide-y divide-slate-200">
            {[["จาก", from.name], ["ไปยัง", to.name], ["จำนวน", `${baht(amt)} บาท`], ["เหตุผล", reason]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-3"><dt className="text-slate-500">{k}</dt><dd className="font-semibold">{v}</dd></div>
            ))}
          </dl>
        )}

        <p role="alert" className="mt-3 min-h-5 text-sm text-red-600">{error}</p>

        <div className="mt-2 flex gap-3">
          <button type="button" onClick={back} className="rounded-xl border border-slate-200 px-6 py-3 font-semibold hover:bg-slate-50">
            {step === 1 ? "ยกเลิก" : "ย้อนกลับ"}
          </button>
          <button type="button" onClick={next} disabled={loading}
            className="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            {loading ? "กำลังส่ง..." : step === 3 ? "ส่งคำขอโยกงบ" : step === 2 ? "ตรวจสอบข้อมูล" : "ถัดไป"}
          </button>
        </div>
      </section>
    </main>
  );
}
