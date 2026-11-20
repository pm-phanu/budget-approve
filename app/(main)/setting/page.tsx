"use client";

// ════════════════════════════════════════════════════════════
//  การตั้งค่าบัญชีของผู้ใช้ทุก role (/setting · ปุ่ม "การตั้งค่า" ใน sidebar)
//  1) ข้อมูลพนักงาน (ดูอย่างเดียว · แก้ได้ที่หน้า "จัดการผู้ใช้และสิทธิ์" ของผู้ดูแลระบบ)
//  2) เปลี่ยนรหัสผ่าน → ป็อปอัพถามยืนยัน
//  3) บัญชีรับเงินคืน (คำขอแบบสำรองจ่าย) → ป็อปอัพให้ตรวจเลขบัญชีอีกรอบก่อนบันทึก
// ════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { Eye, EyeDisabled, InfoCircle } from "@tailgrids/icons";
import { Button } from "@/components/tailgrids/core/button";
import { ActionPopup } from "@/components/action-popup";
import { useVisitKey } from "@/components/use-visit-key";
import {
  THAI_BANKS,
  changePassword,
  normalizeBankAccount,
  passwordChangeError,
  updateBankAccount,
  type BankAccount,
  type Credential,
} from "@/data/credential";
import { getCurrentUser } from "@/utils/login";

// ช่องกรอก: แบบเดียวกับหน้าเข้าสู่ระบบ
const FIELD =
  "mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-[15px] text-[#0F172A] placeholder:text-sm placeholder:text-[#94A3B8] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20";
const CARD = "rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl";

// 1234567890 → 123-4-56789-0 (รูปแบบเลขบัญชี 10 หลักที่คนไทยคุ้น) · 12 หลักแสดงตามเดิม
const formatAccount = (n: string) => (/^\d{10}$/.test(n) ? `${n.slice(0, 3)}-${n.slice(3, 4)}-${n.slice(4, 9)}-${n.slice(9)}` : n);

function Settings() {
  const [me, setMe] = useState<Credential | null>(null);

  // รหัสผ่าน
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwPopup, setPwPopup] = useState<"ask" | "done" | null>(null);

  // บัญชีธนาคาร
  const [bank, setBank] = useState<BankAccount>({ bank: "", number: "", name: "" });
  const [bankError, setBankError] = useState("");
  const [bankPopup, setBankPopup] = useState<{ step: "ask" | "done"; account: BankAccount } | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    /* eslint-disable react-hooks/set-state-in-effect -- อ่าน localStorage ได้หลังเปิดหน้าเท่านั้น */
    setMe(user);
    // บัญชีเดิมเป็นข้อมูลตัวอย่างที่ปิดเลขไว้ (xxx-x-x4521-x) → ให้กรอกเลขจริงใหม่ · ชื่อบัญชีตั้งต้น = ชื่อผู้ใช้
    if (user) setBank({ bank: user.bankAccount?.bank ?? "", number: "", name: user.bankAccount?.name ?? user.fullName });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  if (!me) return null;

  const onPw = (key: keyof typeof pw) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPw((p) => ({ ...p, [key]: e.target.value }));
    setPwError("");
  };

  // ตรวจก่อน แล้วค่อยถามยืนยัน (ไม่ให้ป็อปอัพพาไปเจอ error)
  function askPassword(e: React.FormEvent) {
    e.preventDefault();
    const error = passwordChangeError(me!.id, pw.current, pw.next, pw.confirm);
    if (error) return setPwError(error);
    setPwPopup("ask");
  }

  function savePassword() {
    try {
      changePassword(me!.id, pw.current, pw.next, pw.confirm);
      setPw({ current: "", next: "", confirm: "" });
      setPwPopup("done");
    } catch (error) {
      setPwPopup(null);
      setPwError(error instanceof Error ? error.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    }
  }

  function askBank(e: React.FormEvent) {
    e.preventDefault();
    try {
      setBankPopup({ step: "ask", account: normalizeBankAccount(bank) });
    } catch (error) {
      setBankError(error instanceof Error ? error.message : "ข้อมูลบัญชีไม่ถูกต้อง");
    }
  }

  function saveBank(account: BankAccount) {
    updateBankAccount(me!.id, account);
    setMe(getCurrentUser());
    setBank((b) => ({ ...b, number: "" }));
    setBankPopup({ step: "done", account });
  }

  const current = me.bankAccount;

  return (
    <div className="text-[#0F172A]">
      <h1 className="text-[32px] font-bold">การตั้งค่า</h1>
      <p className="mt-1 text-sm text-[#64748B]">ข้อมูลบัญชีผู้ใช้ รหัสผ่าน และบัญชีรับเงินคืน</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* ---------- 1) ข้อมูลพนักงาน ---------- */}
        <section aria-labelledby="profile-title" className={`${CARD} lg:col-span-2`}>
          <h2 id="profile-title" className="text-lg font-bold">ข้อมูลพนักงาน</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
            {[
              ["รหัสพนักงาน", me.id],
              ["ชื่อ-นามสกุล", me.fullName],
              ["อีเมล", me.email || "-"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-[#F8FAFC] p-4">
                <dt className="text-[#64748B]">{label}</dt>
                <dd className="mt-1 break-all font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-[#64748B]">ข้อมูลไม่ถูกต้อง แจ้งผู้ดูแลระบบให้แก้ไข</p>
        </section>

        {/* ---------- 2) เปลี่ยนรหัสผ่าน ---------- */}
        <section aria-labelledby="password-title" className={CARD}>
          <div className="flex items-center justify-between gap-2">
            <h2 id="password-title" className="text-lg font-bold">เปลี่ยนรหัสผ่าน</h2>
            <button
              type="button"
              aria-pressed={showPw}
              onClick={() => setShowPw((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            >
              {showPw ? <EyeDisabled size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              {showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            </button>
          </div>
          <form onSubmit={askPassword} className="mt-4 space-y-4">
            {(
              [
                ["current", "รหัสผ่านปัจจุบัน", "current-password"],
                ["next", "รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)", "new-password"],
                ["confirm", "ยืนยันรหัสผ่านใหม่", "new-password"],
              ] as const
            ).map(([key, label, auto]) => (
              <div key={key}>
                <label htmlFor={`pw-${key}`} className="text-sm font-medium">{label}</label>
                <input
                  id={`pw-${key}`}
                  type={showPw ? "text" : "password"}
                  autoComplete={auto}
                  required
                  value={pw[key]}
                  onChange={onPw(key)}
                  aria-invalid={!!pwError}
                  aria-describedby={pwError ? "pw-error" : undefined}
                  className={FIELD}
                />
              </div>
            ))}
            {pwError && <ErrorText id="pw-error" text={pwError} />}
            <Button type="submit" variant="success" className="w-full">
              เปลี่ยนรหัสผ่าน
            </Button>
          </form>
        </section>

        {/* ---------- 3) บัญชีรับเงินคืน ---------- */}
        <section aria-labelledby="bank-title" className={CARD}>
          <h2 id="bank-title" className="text-lg font-bold">บัญชีรับเงินคืน</h2>
          <p className="mt-1 text-sm text-[#64748B]">ใช้กับคำขอแบบสำรองจ่าย การเงินจะโอนเงินคืนเข้าบัญชีนี้</p>
          <div className="mt-4 rounded-xl bg-[#F8FAFC] p-4 text-sm">
            <p className="text-[#64748B]">บัญชีปัจจุบัน</p>
            <p className={`mt-1 font-semibold ${current ? "" : "text-[#B45309]"}`}>
              {current ? `${current.bank} ${formatAccount(current.number)} · ${current.name}` : "ยังไม่ได้ตั้งค่าบัญชีรับเงิน"}
            </p>
          </div>
          <form onSubmit={askBank} className="mt-4 space-y-4">
            <div>
              <label htmlFor="bank-name" className="text-sm font-medium">ธนาคาร</label>
              <select
                id="bank-name"
                required
                value={bank.bank}
                onChange={(e) => {
                  setBank((b) => ({ ...b, bank: e.target.value }));
                  setBankError("");
                }}
                className={FIELD}
              >
                <option value="">เลือกธนาคาร</option>
                {THAI_BANKS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="bank-number" className="text-sm font-medium">เลขบัญชี (10–12 หลัก)</label>
              <input
                id="bank-number"
                inputMode="numeric"
                autoComplete="off"
                required
                placeholder="เช่น 123-4-56789-0"
                value={bank.number}
                onChange={(e) => {
                  setBank((b) => ({ ...b, number: e.target.value.replace(/[^\d-\s]/g, "") }));
                  setBankError("");
                }}
                aria-invalid={!!bankError}
                aria-describedby={bankError ? "bank-error" : undefined}
                className={`${FIELD} tabular-nums`}
              />
            </div>
            <div>
              <label htmlFor="bank-holder" className="text-sm font-medium">ชื่อบัญชี</label>
              <input
                id="bank-holder"
                required
                value={bank.name}
                onChange={(e) => {
                  setBank((b) => ({ ...b, name: e.target.value }));
                  setBankError("");
                }}
                className={FIELD}
              />
            </div>
            {bankError && <ErrorText id="bank-error" text={bankError} />}
            <Button type="submit" variant="success" className="w-full">
              บันทึกบัญชีธนาคาร
            </Button>
          </form>
        </section>
      </div>

      {/* ---------- ป็อปอัพ ---------- */}
      <ActionPopup
        open={pwPopup === "ask"}
        tone="warning"
        title="ยืนยันเปลี่ยนรหัสผ่าน?"
        message="ครั้งต่อไปต้องเข้าสู่ระบบด้วยรหัสผ่านใหม่"
        confirmLabel="เปลี่ยนรหัสผ่าน"
        onConfirm={savePassword}
        onCancel={() => setPwPopup(null)}
      />
      <ActionPopup
        open={pwPopup === "done"}
        title="เปลี่ยนรหัสผ่านแล้ว"
        message="ใช้รหัสผ่านใหม่ตั้งแต่การเข้าสู่ระบบครั้งถัดไป"
        onConfirm={() => setPwPopup(null)}
      />
      <ActionPopup
        open={bankPopup?.step === "ask"}
        tone="warning"
        title="ตรวจบัญชีให้ถูกต้องก่อนบันทึก"
        message="การเงินจะโอนเงินคืนเข้าบัญชีนี้ ถ้าเลขผิดเงินจะโอนไม่สำเร็จหรือเข้าบัญชีคนอื่น"
        confirmLabel="ถูกต้อง บันทึก"
        cancelLabel="กลับไปแก้"
        onConfirm={() => bankPopup && saveBank(bankPopup.account)}
        onCancel={() => setBankPopup(null)}
      >
        {bankPopup && (
          <dl className="space-y-2 rounded-xl bg-[#F8FAFC] p-4 text-sm">
            {[
              ["ธนาคาร", bankPopup.account.bank],
              ["เลขบัญชี", formatAccount(bankPopup.account.number)],
              ["ชื่อบัญชี", bankPopup.account.name],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-[#64748B]">{label}</dt>
                <dd className="text-right font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
            <p className="pt-1 text-xs text-[#64748B]">คำขอที่ส่งไปแล้วยังใช้บัญชีเดิม · มีผลกับคำขอใหม่</p>
          </dl>
        )}
      </ActionPopup>
      <ActionPopup
        open={bankPopup?.step === "done"}
        title="บันทึกบัญชีธนาคารแล้ว"
        message={bankPopup ? `${bankPopup.account.bank} ${formatAccount(bankPopup.account.number)}` : undefined}
        onConfirm={() => setBankPopup(null)}
      />
    </div>
  );
}

function ErrorText({ id, text }: { id: string; text: string }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-2 rounded-xl bg-[#FFF1F2] px-3.5 py-2.5 text-sm text-[#9F1239]">
      <InfoCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      {text}
    </p>
  );
}

// ฟอร์มใหม่ทุกครั้งที่เปิดหน้า (Next เก็บหน้าไว้ → รหัสผ่านที่พิมพ์ค้างจะยังอยู่)
export default function SettingPage() {
  return <Settings key={useVisitKey(null)} />;
}
