"use client";

// ════════════════════════════════════════════════════════════
//  ป๊อปอัพ "โยกงบประมาณ" 3 ขั้น (ดีไซน์จาก PR #24)
//  ใช้ข้อมูลจริงของหน้าตั้งงบ: รายการ = หมวดของโครงการในปีที่เลือก
//  การโอนจริง (เช็คยอด / งบแผนก / บันทึก projects / ลงประวัติการแก้งบ) ทำที่ onSubmit
//  → app/(main)/home-account/budget/page.tsx ผ่าน transferBudget() ใน data/budget.ts
// ════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from "react";

export type TransferItem = {
  key: string; // "projectId/categoryId"
  name: string; // "แผนก › โครงการ › หมวด"
  remaining: number; // วงเงินที่ยังไม่ได้ใช้ (โอนออกได้สูงสุด)
};

type Done = { fromName: string; toName: string; amount: number; reason: string };

const fmt = (n: number) => n.toLocaleString("th-TH");
const STEPS = ["เลือกงบต้นทาง", "เลือกปลายทาง", "ตรวจสอบและยืนยัน"];
const MAX_REASON = 500;

export function TransferModal({
  open,
  onClose,
  items,
  transferCount,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  items: TransferItem[];
  transferCount: number; // จำนวนครั้งที่โอนงบในปีนี้ (จากประวัติการแก้งบ)
  onSubmit: (fromKey: string, toKey: string, amount: number, reason: string) => string | null; // คืนข้อความผิด หรือ null = สำเร็จ
}) {
  const [step, setStep] = useState(1);
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState<Done | null>(null);

  const reset = () => {
    setStep(1);
    setFromId(null);
    setToId(null);
    setAmount("");
    setReason("");
    setTouched(false);
    setSubmitError("");
    setDone(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const totalRemaining = items.reduce((s, b) => s + b.remaining, 0);
  const from = items.find((b) => b.key === fromId);
  const to = items.find((b) => b.key === toId);
  const amt = Number(amount);

  const amountError = useMemo(() => {
    if (!from) return "";
    if (!amount || !Number.isFinite(amt) || amt <= 0) return "กรุณาระบุจำนวนเงินมากกว่า 0";
    if (!Number.isInteger(amt)) return "กรุณาระบุจำนวนเต็ม";
    if (amt > from.remaining) return `จำนวนเงินต้องไม่เกิน ${fmt(from.remaining)} บาท`;
    return "";
  }, [amount, amt, from]);
  const reasonError = reason.trim() ? "" : "กรุณาระบุเหตุผลในการโยกงบ";

  const goReview = () => {
    setTouched(true);
    if (!to || amountError || reasonError) return;
    setSubmitError("");
    setStep(3);
  };

  const submit = () => {
    if (!from || !to) return;
    const error = onSubmit(from.key, to.key, amt, reason.trim());
    if (error) return setSubmitError(error); // เช่น งบแผนกปลายทางไม่พอ
    setDone({ fromName: from.name, toName: to.name, amount: amt, reason: reason.trim() });
  };

  if (!open) return null;

  return (
    <div className="bf-overlay" role="dialog" aria-modal="true" aria-label="โยกงบประมาณ" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <style>{CSS}</style>
      <div className="bf-modal">
        {done ? (
          /* ---------- ผลลัพธ์ ---------- */
          <>
            <h2 className="bf-title">โยกงบประมาณ · สรุป</h2>
            <div className="bf-success" role="status">
              <div className="bf-check">✓</div>
              <div>
                <strong>โอนงบประมาณเรียบร้อยแล้ว</strong>
                <div className="bf-muted-dark">ปรับวงเงินทั้งสองหมวดแล้ว และบันทึกในประวัติการแก้งบ</div>
              </div>
            </div>

            <div className="bf-panel">
              <h3>รายละเอียดการโยกงบ</h3>
              <div className="bf-grid2">
                <div>
                  <small>งบจาก</small>
                  <b>{done.fromName}</b>
                </div>
                <div>
                  <small>โอนไปยัง</small>
                  <b>{done.toName}</b>
                </div>
                <div>
                  <small>จำนวนที่โยก</small>
                  <div className="bf-big">
                    {fmt(done.amount)}
                    <span>บาท</span>
                  </div>
                </div>
                <div className="bf-reason">
                  <b>เหตุผล</b>
                  <div>{done.reason}</div>
                </div>
              </div>
            </div>

            <div className="bf-actions">
              <button className="bf-btn" onClick={close}>
                ปิด
              </button>
              <button className="bf-btn primary grow" onClick={reset}>
                ‹ ทำรายการใหม่
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="bf-title">
              โยกงบประมาณ · {step === 1 ? "เลือกงบต้นทาง" : step === 2 ? "ระบุรายละเอียด" : "ตรวจสอบและยืนยัน"}
            </h2>
            <p className="bf-sub">
              ขั้นตอนที่ {step} จาก 3 ·{" "}
              {step === 1 ? "เลือกงบประมาณที่ต้องการโอนออก" : `จาก ${from?.name} · คงเหลือ ${fmt(from?.remaining ?? 0)} บาท`}
            </p>

            <div className="bf-stats">
              <div className="bf-stat">
                <small>งบคงเหลือที่โอนได้ทั้งหมด</small>
                <b>{fmt(totalRemaining)} บาท</b>
              </div>
              <div className="bf-stat">
                <small>โอนงบไปแล้วปีนี้</small>
                <b>{fmt(transferCount)} รายการ</b>
              </div>
            </div>

            <div className="bf-panel">
              <h3>ทำรายการโยกงบ</h3>

              {/* Stepper */}
              <div className="bf-stepper">
                {STEPS.map((label, i) => {
                  const n = i + 1;
                  const state = n < step ? "done" : n === step ? "active" : "";
                  return (
                    <div key={label} className={`bf-step ${state}`} aria-current={n === step ? "step" : undefined}>
                      <span className="circle">{n < step ? "✓" : n}</span>
                      <span className="lbl">{label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Step 1 */}
              {step === 1 && (
                <>
                  <h4>งบจาก</h4>
                  {items.length === 0 && <p className="bf-err">ไม่พบข้อมูลงบประมาณของปีนี้</p>}
                  <div className="bf-list">
                    {items.map((b) => (
                      <button
                        key={b.key}
                        className={`bf-opt ${fromId === b.key ? "sel" : ""}`}
                        aria-pressed={fromId === b.key}
                        disabled={b.remaining <= 0}
                        onClick={() => {
                          setFromId(b.key);
                          if (toId === b.key) setToId(null);
                        }}
                      >
                        <span>{b.name}</span>
                        <em>คงเหลือ {fmt(b.remaining)} บาท</em>
                      </button>
                    ))}
                  </div>
                  <div className="bf-actions">
                    <button className="bf-btn" onClick={close}>
                      ยกเลิก
                    </button>
                    <button className="bf-btn primary grow" disabled={!fromId} onClick={() => setStep(2)}>
                      ถัดไป
                    </button>
                  </div>
                </>
              )}

              {/* Step 2 */}
              {step === 2 && from && (
                <>
                  <h4>โอนไปยัง</h4>
                  <div className="bf-list">
                    {items
                      .filter((b) => b.key !== from.key)
                      .map((b) => (
                        <button
                          key={b.key}
                          className={`bf-opt ${toId === b.key ? "sel" : ""}`}
                          aria-pressed={toId === b.key}
                          onClick={() => setToId(b.key)}
                        >
                          <span>{b.name}</span>
                          <em>คงเหลือ {fmt(b.remaining)} บาท</em>
                        </button>
                      ))}
                  </div>
                  {touched && !to && <p className="bf-err">กรุณาเลือกงบปลายทาง</p>}

                  <h4>
                    <label htmlFor="bf-amount">จำนวนที่ต้องการโยก (บาท)</label>
                  </h4>
                  <input
                    id="bf-amount"
                    className="bf-input"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="0"
                  />
                  {amount && !amountError ? (
                    <p className="bf-hint">ยอดคงเหลือหลังโยก: {fmt(from.remaining - amt)} บาท</p>
                  ) : touched && amountError ? (
                    <p className="bf-err">{amountError}</p>
                  ) : null}

                  <h4>
                    <label htmlFor="bf-reason">เหตุผลในการโยกงบ</label> <span className="req">(จำเป็นต้องระบุ)</span>
                  </h4>
                  <textarea
                    id="bf-reason"
                    className="bf-input"
                    rows={3}
                    maxLength={MAX_REASON}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <div className="bf-count">
                    {reason.length} / {MAX_REASON}
                  </div>
                  {touched && reasonError && <p className="bf-err">{reasonError}</p>}

                  <div className="bf-actions">
                    <button className="bf-btn" onClick={() => setStep(1)}>
                      ย้อนกลับ
                    </button>
                    <button className="bf-btn primary grow" onClick={goReview}>
                      ตรวจสอบข้อมูล
                    </button>
                  </div>
                </>
              )}

              {/* Step 3 */}
              {step === 3 && from && to && (
                <>
                  <div className="bf-grid2 review">
                    <div>
                      <small>งบจาก</small>
                      <b>{from.name}</b>
                      <small className="after">คงเหลือหลังโยก {fmt(from.remaining - amt)} บาท</small>
                    </div>
                    <div>
                      <small>โอนไปยัง</small>
                      <b>{to.name}</b>
                      <small className="after">คงเหลือหลังรับโอน {fmt(to.remaining + amt)} บาท</small>
                    </div>
                    <div>
                      <small>จำนวนที่โยก</small>
                      <div className="bf-big">
                        {fmt(amt)}
                        <span>บาท</span>
                      </div>
                    </div>
                    <div className="bf-reason">
                      <b>เหตุผล</b>
                      <div>{reason.trim()}</div>
                    </div>
                  </div>
                  {submitError && (
                    <p role="alert" className="bf-err">
                      {submitError}
                    </p>
                  )}
                  <div className="bf-actions">
                    <button className="bf-btn" onClick={() => setStep(2)}>
                      ย้อนกลับ
                    </button>
                    <button className="bf-btn primary grow" onClick={submit}>
                      ยืนยันโอนงบ
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Styles (จาก PR #24 · ใช้ฟอนต์ของแอป) ---------- */
const G = "#00a46f";
const CSS = `
.bf-overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:32px 16px;z-index:50;color:#0f172a}
.bf-modal{background:#fff;border-radius:28px;padding:32px;width:100%;max-width:820px;box-shadow:0 24px 60px rgba(0,0,0,.25);margin:auto}
.bf-title{font-size:26px;font-weight:700;margin:0 0 4px}
.bf-sub{color:#64748b;margin:0 0 20px;font-size:14px}
.bf-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px}
.bf-stat{border:1px solid #e2e8f0;border-radius:16px;padding:12px 16px}
.bf-stat small{display:block;color:#64748b;font-size:12px}
.bf-stat b{font-size:22px}
.bf-panel{border:1px solid #e2e8f0;border-radius:20px;padding:24px;margin-bottom:16px}
.bf-panel h3{margin:0 0 16px;font-size:16px}
.bf-panel h4{margin:20px 0 10px;font-size:14px}
.req{font-weight:400;color:#64748b}
.bf-stepper{display:flex;justify-content:space-between;position:relative;margin-bottom:8px}
.bf-stepper::before{content:"";position:absolute;top:16px;left:16%;right:16%;height:3px;background:#e2e8f0}
.bf-step{position:relative;flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:13px;color:#64748b}
.circle{width:32px;height:32px;border-radius:50%;background:#cbd5e1;color:#475569;display:grid;place-items:center;font-size:14px;z-index:1}
.bf-step.active .circle,.bf-step.done .circle{background:${G};color:#fff}
.bf-step.active .lbl,.bf-step.done .lbl{color:#0f172a;font-weight:700}
.bf-list{display:flex;flex-direction:column;gap:10px;max-height:320px;overflow-y:auto}
.bf-opt{display:flex;justify-content:space-between;gap:12px;align-items:center;text-align:left;font:inherit;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 18px;cursor:pointer}
.bf-opt em{font-style:normal;color:${G};font-weight:700;white-space:nowrap}
.bf-opt:hover{border-color:${G}}
.bf-opt:disabled{opacity:.5;cursor:not-allowed}
.bf-opt.sel{background:#ecfdf5;border-color:${G}}
.bf-input{width:100%;box-sizing:border-box;font:inherit;border:1px solid #e2e8f0;border-radius:14px;padding:14px 16px;resize:vertical}
.bf-input:focus,.bf-opt:focus-visible,.bf-btn:focus-visible{outline:2px solid ${G};outline-offset:2px}
.bf-hint{color:${G};font-size:13px;margin:6px 0 0}
.bf-err{color:#dc2626;font-size:13px;margin:6px 0 0}
.bf-count{text-align:right;color:#64748b;font-size:12px;margin-top:4px}
.bf-actions{display:flex;gap:12px;margin-top:28px}
.bf-btn{font:inherit;font-weight:700;border:1px solid #e2e8f0;background:#fff;border-radius:14px;padding:14px 22px;cursor:pointer}
.bf-btn.primary{background:${G};border-color:${G};color:#fff}
.bf-btn.primary:disabled{opacity:.45;cursor:not-allowed}
.bf-btn.grow{flex:1}
.bf-success{display:flex;gap:16px;align-items:center;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:20px;padding:18px 22px;margin:20px 0 16px}
.bf-success strong{font-size:18px}
.bf-muted-dark{color:#334155;font-size:14px}
.bf-check{width:52px;height:52px;border-radius:50%;background:${G};color:#fff;font-size:28px;display:grid;place-items:center;flex:none}
.bf-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px 24px}
.bf-grid2 small{display:block;color:#64748b;font-size:12px;margin-bottom:2px}
.bf-grid2 .after{color:${G};margin-top:4px}
.bf-big{font-size:34px;font-weight:700}.bf-big span{font-size:14px;font-weight:400;margin-left:4px}
.bf-reason{background:#ecfdf5;border-radius:14px;padding:14px 18px}
@media(max-width:640px){.bf-modal{padding:20px;border-radius:20px}.bf-stats,.bf-grid2{grid-template-columns:1fr}.bf-opt{flex-direction:column;align-items:flex-start}}
`;
