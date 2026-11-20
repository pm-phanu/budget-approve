import { useEffect, useMemo, useState } from "react";

/* ---------- Types ---------- */
type BudgetItem = { id: string; name: string; remaining: number };
type Transfer = {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  reason: string;
  createdAt: string; // ISO
  status: "pending" | "approved";
};
type Store = { budgets: BudgetItem[]; transfers: Transfer[] };

/* ---------- localStorage ----------
   ปรับ key และรูปแบบข้อมูลตรงนี้ให้ตรงกับของเพื่อน (แก้ที่นี่ที่เดียว) */
const BUDGETS_KEY = "budgetflow:budgets"; // งบแต่ละรายการ
const TRANSFERS_KEY = "budgetflow:transfers"; // ประวัติการโยกงบ

// อ่านจาก localStorage -> BudgetItem (ถ้าเพื่อนใช้ชื่อฟิลด์อื่น เช่น title/balance ให้แก้ตรงนี้)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromStorage = (raw: any[]): BudgetItem[] =>
  raw.map((r) => ({ id: String(r.id), name: String(r.name), remaining: Number(r.remaining) }));

// เขียนกลับ: อัปเดตเฉพาะยอดคงเหลือ และคงฟิลด์อื่น ๆ ของเพื่อนไว้
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const writeBack = (raw: any[], budgets: BudgetItem[]) =>
  raw.map((r) => {
    const b = budgets.find((x) => x.id === String(r.id));
    return b ? { ...r, remaining: b.remaining } : r;
  });

const readJSON = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

// อ่านข้อมูลจริงจาก localStorage (ถ้ายังไม่มี จะเป็นรายการว่าง)
const loadStore = (): Store => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = readJSON<any[]>(BUDGETS_KEY);
  const t = readJSON<Transfer[]>(TRANSFERS_KEY);
  return { budgets: b ? fromStorage(b) : [], transfers: t ?? [] };
};

const saveStore = (s: Store) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = readJSON<any[]>(BUDGETS_KEY) ?? [];
    localStorage.setItem(BUDGETS_KEY, JSON.stringify(writeBack(raw, s.budgets)));
    localStorage.setItem(TRANSFERS_KEY, JSON.stringify(s.transfers));
  } catch {
    /* ignore */
  }
};

/* ---------- Helpers ---------- */
const fmt = (n: number) => n.toLocaleString("th-TH");
const p2 = (n: number) => String(n).padStart(2, "0");
const thDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear() + 543} ${p2(d.getHours())}:${p2(
    d.getMinutes()
  )}:${p2(d.getSeconds())}`;
};
const makeId = (list: Transfer[]) => {
  const d = new Date();
  const prefix = `TRF${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`;
  const n = list.filter((t) => t.id.startsWith(prefix + "-")).length + 1;
  return `${prefix}-${String(n).padStart(3, "0")}`;
};

const STEPS = ["เลือกงบต้นทาง", "เลือกปลายทาง", "ตรวจสอบและยืนยัน"];
const MAX_REASON = 500;

/* ---------- Modal ---------- */
export function TransferModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [store, setStore] = useState<Store>(loadStore);
  const [step, setStep] = useState(1);
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState<Transfer | null>(null);

  // อ่านข้อมูลใหม่จาก localStorage ทุกครั้งที่เปิดป๊อปอัพ และเมื่อแท็บอื่นแก้ข้อมูล
  useEffect(() => {
    if (open) setStore(loadStore());
  }, [open]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === BUDGETS_KEY || e.key === TRANSFERS_KEY) setStore(loadStore());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const reset = () => {
    setStep(1);
    setFromId(null);
    setToId(null);
    setAmount("");
    setReason("");
    setTouched(false);
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

  const { budgets, transfers } = store;
  const totalRemaining = budgets.reduce((s, b) => s + b.remaining, 0);
  const pendingCount = transfers.filter((t) => t.status === "pending").length;
  const from = budgets.find((b) => b.id === fromId);
  const to = budgets.find((b) => b.id === toId);
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
    setStep(3);
  };

  const submit = () => {
    if (!from || !to) return;
    const t: Transfer = {
      id: makeId(store.transfers),
      fromId: from.id,
      toId: to.id,
      amount: amt,
      reason: reason.trim(),
      createdAt: new Date().toISOString(),
      status: "pending",
    };
    const next: Store = {
      transfers: [t, ...store.transfers],
      // หักงบต้นทาง และเพิ่มงบปลายทางทันที
      budgets: store.budgets.map((b) =>
        b.id === from.id
          ? { ...b, remaining: b.remaining - amt }
          : b.id === to.id
          ? { ...b, remaining: b.remaining + amt }
          : b
      ),
    };
    saveStore(next);
    setStore(next);
    setDone(t);
  };

  if (!open) return null;

  const nameOf = (id: string) => budgets.find((b) => b.id === id)?.name ?? "-";

  return (
    <div className="bf-overlay" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <style>{CSS}</style>
      <div className="bf-modal">
        {done ? (
          /* ---------- ผลลัพธ์ / ติดตามสถานะ ---------- */
          <>
            <h2 className="bf-title">โยกงบประมาณ · สรุปและติดตามสถานะ</h2>
            <div className="bf-success">
              <div className="bf-check">✓</div>
              <div>
                <strong>ส่งคำขอโอนงบประมาณเรียบร้อยแล้ว</strong>
                <div className="bf-muted-dark">เลขที่รายการ: {done.id}</div>
              </div>
            </div>

            <div className="bf-panel">
              <h3>รายละเอียดการโยกงบ</h3>
              <div className="bf-grid2">
                <div>
                  <small>งบจาก</small>
                  <b>{nameOf(done.fromId)}</b>
                </div>
                <div>
                  <small>โอนไปยัง</small>
                  <b>{nameOf(done.toId)}</b>
                </div>
                <div>
                  <small>จำนวนที่โยก</small>
                  <div className="bf-big">
                    {done.amount}
                    <span>บาท</span>
                  </div>
                </div>
                <div className="bf-reason">
                  <b>เหตุผล</b>
                  <div>{done.reason}</div>
                </div>
              </div>
            </div>

            <div className="bf-panel">
              <h3>สถานะปัจจุบัน</h3>
              <ul className="bf-timeline">
                <li>
                  <span className="dot ok">✓</span>
                  <div>
                    <b>ส่งคำขอแล้ว</b>
                    <small>{thDateTime(done.createdAt)}</small>
                  </div>
                  <span className="badge ok">เสร็จสิ้น</span>
                </li>
                <li>
                  <span className="dot current" />
                  <div>
                    <b>รออนุมัติจากผู้จัดการฝ่าย</b>
                    <small>กำลังรอพิจารณา...</small>
                  </div>
                  <span className="badge wait">รอดำเนินการ</span>
                </li>
                <li>
                  <span className="dot" />
                  <div>
                    <b>รออนุมัติจากฝ่ายการเงิน</b>
                    <small>หลังจากได้รับอนุมัติจากผู้จัดการฝ่ายแล้ว</small>
                  </div>
                </li>
                <li>
                  <span className="dot" />
                  <div>
                    <b>ดำเนินการโอนงบ</b>
                    <small>ระบบจะโยกงบให้โดยอัตโนมัติ</small>
                  </div>
                </li>
              </ul>
            </div>

            <button className="bf-btn primary full" onClick={reset}>
              ‹ ทำรายการใหม่
            </button>
          </>
        ) : (
          <>
            <h2 className="bf-title">
              โยกงบประมาณ · {step === 1 ? "เลือกงบต้นทาง" : step === 2 ? "ระบุรายละเอียด" : "ตรวจสอบและยืนยัน"}
            </h2>
            <p className="bf-sub">
              ขั้นตอนที่ {step} จาก 3 ·{" "}
              {step === 1
                ? "เลือกงบประมาณที่ต้องการโอนออก"
                : `จาก ${from?.name.match(/\(([^)]+)\)/)?.[1] ?? from?.name} · คงเหลือ ${fmt(from?.remaining ?? 0)} บาท`}
            </p>

            <div className="bf-stats">
              <div className="bf-stat">
                <small>งบประมาณคงเหลือทั้งหมด</small>
                <b>{fmt(totalRemaining)} บาท</b>
              </div>
              <div className="bf-stat">
                <small>รายการโยกงบทั้งหมด</small>
                <b>{fmt(transfers.length)} รายการ</b>
              </div>
              <div className="bf-stat">
                <small>รออนุมัติ</small>
                <b>{fmt(pendingCount)} รายการ</b>
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
                    <div key={label} className={`bf-step ${state}`}>
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
                  {budgets.length === 0 && <p className="bf-err">ไม่พบข้อมูลงบประมาณ</p>}
                  <div className="bf-list">
                    {budgets.map((b) => (
                      <button
                        key={b.id}
                        className={`bf-opt ${fromId === b.id ? "sel" : ""}`}
                        onClick={() => {
                          setFromId(b.id);
                          if (toId === b.id) setToId(null);
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
                    {budgets
                      .filter((b) => b.id !== from.id)
                      .map((b) => (
                        <button
                          key={b.id}
                          className={`bf-opt ${toId === b.id ? "sel" : ""}`}
                          onClick={() => setToId(b.id)}
                        >
                          <span>{b.name}</span>
                          <em>คงเหลือ {fmt(b.remaining)} บาท</em>
                        </button>
                      ))}
                  </div>
                  {touched && !to && <p className="bf-err">กรุณาเลือกงบปลายทาง</p>}

                  <h4>จำนวนที่ต้องการโยก (บาท)</h4>
                  <input
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
                    เหตุผลในการโยกงบ <span className="req">(จำเป็นต้องระบุ)</span>
                  </h4>
                  <textarea
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
                  <div className="bf-actions">
                    <button className="bf-btn" onClick={() => setStep(2)}>
                      ย้อนกลับ
                    </button>
                    <button className="bf-btn primary grow" onClick={submit}>
                      ยืนยันส่งคำขอ
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

/* ---------- Page: พื้นหลังว่าง + ปุ่ม "โอนงบ" ---------- */
export default function BudgetTransferPage() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: FONT }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: 24 }}>
        <button className="bf-btn" style={{ padding: "10px 18px", cursor: "pointer" }} onClick={() => setOpen(true)}>
          ⇆ โอนงบ
        </button>
      </div>
      <TransferModal open={open} onClose={() => setOpen(false)} />
      <style>{CSS}</style>
    </div>
  );
}

/* ---------- Styles ---------- */
const FONT = `"Noto Sans Thai","Sarabun","Segoe UI",Tahoma,sans-serif`;
const G = "#00a46f";
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;700&display=swap');
.bf-overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:32px 16px;z-index:50;font-family:${FONT};color:#0f172a}
.bf-modal{background:#fff;border-radius:28px;padding:32px;width:100%;max-width:820px;box-shadow:0 24px 60px rgba(0,0,0,.25);margin:auto}
.bf-title{font-size:26px;font-weight:700;margin:0 0 4px}
.bf-sub{color:#64748b;margin:0 0 20px;font-size:14px}
.bf-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
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
.bf-list{display:flex;flex-direction:column;gap:10px}
.bf-opt{display:flex;justify-content:space-between;gap:12px;align-items:center;text-align:left;font:inherit;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 18px;cursor:pointer}
.bf-opt em{font-style:normal;color:${G};font-weight:700;white-space:nowrap}
.bf-opt:hover{border-color:${G}}
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
.bf-btn.grow{flex:1}.bf-btn.full{width:100%}
.bf-success{display:flex;gap:16px;align-items:center;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:20px;padding:18px 22px;margin:20px 0 16px}
.bf-success strong{font-size:18px}
.bf-muted-dark{color:#334155;font-size:14px}
.bf-check{width:52px;height:52px;border-radius:50%;background:${G};color:#fff;font-size:28px;display:grid;place-items:center;flex:none}
.bf-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px 24px}
.bf-grid2 small{display:block;color:#64748b;font-size:12px;margin-bottom:2px}
.bf-grid2 .after{color:${G};margin-top:4px}
.bf-big{font-size:34px;font-weight:700}.bf-big span{font-size:14px;font-weight:400;margin-left:4px}
.bf-reason{background:#ecfdf5;border-radius:14px;padding:14px 18px}
.bf-timeline{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:18px}
.bf-timeline li{display:flex;gap:14px;align-items:center}
.bf-timeline li>div{flex:1}
.bf-timeline small{display:block;color:#64748b;font-size:13px}
.dot{width:34px;height:34px;border-radius:50%;background:#e2e8f0;display:grid;place-items:center;color:#fff;flex:none}
.dot.ok{background:${G}}.dot.current{background:#fff;border:3px solid ${G}}
.badge{border-radius:999px;padding:4px 14px;font-size:13px;font-weight:700}
.badge.ok{background:#d1fae5;color:#047857}.badge.wait{background:#dbeafe;color:#1d4ed8}
@media(max-width:640px){.bf-modal{padding:20px;border-radius:20px}.bf-stats,.bf-grid2{grid-template-columns:1fr}.bf-opt{flex-direction:column;align-items:flex-start}}
`;
