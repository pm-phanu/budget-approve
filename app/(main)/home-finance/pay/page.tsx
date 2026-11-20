"use client";

// ════════════════════════════════════════════════════════════
//  หน้า "รายละเอียด + บันทึกการจ่าย" ของการเงิน (/home-finance/pay?id=...)
//  ขั้นตอน: ดูรายละเอียด → กรอกเลขที่อ้างอิง → ป๊อปอัพยืนยัน → ป๊อปอัพสำเร็จ
//  หรือกด "ตีกลับ" → พิมพ์เหตุผล → คำขอกลับไปหาพนักงาน
// ════════════════════════════════════════════════════════════

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loadRequests, type SavedRequest } from "@/data/request";
import { actOnRequest, canApproveStep } from "@/data/approval";
import { useReviewLock } from "@/components/use-review-lock";
import { getCurrentUser } from "@/utils/login";
import { bkkDay } from "@/utils/date";
import type { Credential } from "@/data/credential";

const LIST_PATH = "/home-finance";

// ---------- ฟังก์ชันช่วย ----------
const baht = (n: number) => "฿" + n.toLocaleString("en-US");

function thaiDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" });
}

// ชื่อผู้รับเงิน: สำรองจ่าย = ผู้ขอ (โอนคืน) · ใบแจ้งหนี้ = ผู้ขายตามใบแจ้งหนี้
function payee(r: SavedRequest) {
  return r.type === "advance" ? (r.requester?.fullName ?? "-") : "ผู้ขายตามใบแจ้งหนี้";
}

// วันนี้ (เวลาไทย) รูปแบบ "2026-11-19" ใช้เป็นค่าเริ่มต้นของช่องวันที่
const todayInput = () => bkkDay();

// ---------- หน้าหลัก ----------
function PayContent() {
  const router = useRouter();
  const id = useSearchParams().get("id") ?? "";

  const [request, setRequest] = useState<SavedRequest | null>(null);
  const [me, setMe] = useState<Credential | null>(null);
  const [openedStep, setOpenedStep] = useState(0); // ขั้นที่เห็นตอนเปิดหน้า (กันกดซ้อน)
  const [loaded, setLoaded] = useState(false);

  // ฟอร์มบันทึกการจ่าย
  const [payDate, setPayDate] = useState(todayInput());
  const [ref, setRef] = useState("");
  const [error, setError] = useState("");

  // ป๊อปอัพที่เปิดอยู่: ไม่มี / ยืนยัน / สำเร็จ / ตีกลับ
  const [popup, setPopup] = useState<"none" | "confirm" | "done" | "reject">("none");
  const [rejectNote, setRejectNote] = useState("");

  // โหลดคำขอตอนเปิดหน้า
  useEffect(() => {
    const found = loadRequests().find((r) => r.id === id) ?? null;
    /* eslint-disable react-hooks/set-state-in-effect -- อ่าน localStorage ได้หลังเปิดหน้าเท่านั้น */
    setRequest(found);
    setMe(getCurrentUser());
    if (found) setOpenedStep(found.currentStep);
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [id]);

  // ล็อก "มีคนกำลังตรวจสอบอยู่" (components/use-review-lock.ts) · ต้องอยู่ก่อน return ด้านล่าง
  const lockedBy = useReviewLock(request, me);

  if (!loaded) return null;

  if (!request) {
    return (
      <div className="py-24 text-center text-slate-500">
        <p className="text-lg font-semibold">ไม่พบคำขอนี้</p>
        <Link href={LIST_PATH} className="text-sm text-emerald-700 hover:underline">
          กลับไปรายการรอทำจ่าย
        </Link>
      </div>
    );
  }

  const r = request;
  const canPay = canApproveStep(r, me); // คนที่ login จ่ายใบนี้ได้ไหม

  // ---- กด "บันทึกการจ่ายเงิน" → เช็คฟอร์มก่อน แล้วเปิดป๊อปอัพยืนยัน ----
  function openConfirm() {
    if (!ref.trim()) {
      setError("กรุณากรอกเลขที่อ้างอิงการโอน");
      return;
    }
    setError("");
    setPopup("confirm");
  }

  // ---- กด "ยืนยัน" ในป๊อปอัพ → บันทึกจริง ----
  function confirmPay() {
    const result = actOnRequest(r.id, me, "approve", {
      expectedStep: openedStep,
      historyNote: `เลขที่อ้างอิง ${ref}`,
      extra: () => ({ payment: { ref: ref.trim(), date: payDate } }), // เก็บเลขอ้างอิง + วันที่โอนไว้ในคำขอ
    });
    if (!result.ok) {
      setPopup("none");
      setError(result.reason);
      return;
    }
    setRequest(result.request);
    setPopup("done");
    setTimeout(() => router.push(LIST_PATH), 1200); // โชว์สำเร็จแป๊บนึงแล้วกลับหน้าหลัก (แบบเดียวกับหน้าส่งคำขอ)
  }

  // ---- กด "ยืนยันตีกลับ" → ส่งคำขอกลับไปหาพนักงาน ----
  function confirmReject() {
    if (!rejectNote.trim()) return;
    const result = actOnRequest(r.id, me, "reject", { expectedStep: openedStep, note: rejectNote.trim() });
    if (!result.ok) {
      setPopup("none");
      setError(result.reason);
      return;
    }
    router.push(LIST_PATH);
  }

  return (
    <div className="font-sans text-slate-800">
      {/* breadcrumb + หัวข้อ */}
      <p className="text-sm text-slate-500">
        <Link href={LIST_PATH} className="hover:underline">‹ รายการรอทำจ่าย</Link> /{" "}
        <b className="text-emerald-700">{r.id}</b>
      </p>
      <div className="mt-3 flex items-center gap-3">
        <h1 className="text-[28px] font-bold">{r.title}</h1>
        {/* ป้ายสถานะตามคำขอจริง (เปิดใบที่จ่ายแล้ว/ถูกตีกลับ ต้องไม่ขึ้นว่ารอ) */}
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            r.status === "จ่ายแล้ว"
              ? "bg-emerald-100 text-emerald-700"
              : r.status === "ตีกลับ"
                ? "bg-rose-100 text-rose-700"
                : "bg-indigo-100 text-indigo-700"
          }`}
        >
          {r.status === "รออนุมัติ" && r.approvalSteps[r.currentStep]?.role === "FINANCE"
            ? "รอการเงิน"
            : r.status === "ตีกลับ"
              ? "ถูกตีกลับ"
              : r.status}
        </span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{r.typeLabel}</span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr_1.2fr]">
        {/* ===== ช่อง 1: รายการค่าใช้จ่าย + ใบเสร็จ ===== */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex justify-between">
            <b>รายการค่าใช้จ่าย + ใบเสร็จ</b>
            <span className="text-sm text-slate-500">
              {r.items.length} รายการ {r.fileCount} ไฟล์
            </span>
          </div>
          {r.items.map((item, i) => (
            <div key={i} className="flex gap-4 border-b border-slate-100 py-4">
              <span className="w-4 text-sm text-slate-400">{i + 1}</span>
              <div className="flex-1">
                <p className="text-sm">
                  {item.name} <span className="text-slate-400">{item.categoryName}</span>
                </p>
                {/* ไฟล์ของแถวนี้ (ยังเปิดดูไม่ได้ เพราะยังไม่มีที่เก็บไฟล์) */}
                {item.files.map((f) => (
                  <div key={f} className="mt-2 flex w-fit items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">PDF</span>
                    <span className="text-xs">{f}</span>
                    <span title="ยังไม่มีที่เก็บไฟล์ (รอเชื่อมระบบหลังบ้าน)" className="cursor-not-allowed opacity-40">👁</span>
                  </div>
                ))}
              </div>
              <span className="text-sm font-semibold tabular-nums">{baht(item.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-4">
            <b>รวม</b>
            <b className="text-emerald-700 tabular-nums">{baht(r.total)}</b>
          </div>
        </div>

        {/* ===== ช่อง 2: ขั้นตอนอนุมัติ ===== */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <b>ขั้นตอนอนุมัติ</b>
          <ul className="mt-4 space-y-4">
            <Step state="done" title="ส่งคำขอ" sub={`${r.requester?.fullName ?? "-"} ${thaiDate(r.createdAt)}`} />
            {r.approvalSteps.map((s, i) => (
              <Step
                key={i}
                state={s.status === "อนุมัติ" ? "done" : s.status === "ตีกลับ" ? "rejected" : i === r.currentStep ? "now" : "wait"}
                title={s.label}
                sub={s.by ? `${s.by} ${thaiDate(s.at)}` : i === r.currentStep ? "กำลังรอ (คุณ)" : "รอ"}
              />
            ))}
          </ul>
        </div>

        {/* ===== ช่อง 3: ยอดที่ต้องโอน + ฟอร์ม ===== */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#047857] p-6 text-white">
            <p className="text-sm text-emerald-200">ยอดที่ต้องโอน</p>
            <p className="mt-1 text-4xl font-bold tabular-nums">{baht(r.total)}</p>
            <div className="mt-4 space-y-2 text-sm">
              <Row label="โอนเข้า" value={r.bankAccount ?? "ดูในใบแจ้งหนี้"} />
              <Row label="ชื่อบัญชี" value={payee(r)} />
              <Row label="ฝ่าย" value={r.requester?.department ?? "-"} />
            </div>
          </div>

          {canPay && lockedBy ? (
            // มีคนอื่นกำลังตรวจสอบใบนี้อยู่ → กดไม่ได้
            <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-[#B45309]">
              <p className="font-bold">{lockedBy.userName} กำลังตรวจสอบคำขอนี้อยู่</p>
              <p className="mt-1 text-[#92400E]">
                คุณจะบันทึกการจ่ายหรือตีกลับได้เมื่อ {lockedBy.userName} ปิดหน้านี้
                หรือไม่มีการใช้งานเกิน 2 นาที หน้านี้จะอัปเดตให้เอง
              </p>
            </div>
          ) : canPay ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <b>บันทึกการจ่ายเงิน</b>
              <label className="mt-4 block text-sm font-semibold">วันที่โอน</label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
              <label className="mt-3 block text-sm font-semibold">
                เลขที่อ้างอิงการโอน <span className="text-rose-500">*</span>
              </label>
              <input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="เช่น 2569111900123"
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
              <p className="mt-2 text-xs text-slate-500">โอนเงินในแอปธนาคารของบริษัทก่อน แล้วจึงกดบันทึก</p>
              {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
              <button type="button" onClick={openConfirm} className="mt-4 h-11 w-full cursor-pointer rounded-lg bg-emerald-700 font-semibold text-white hover:bg-emerald-800">
                บันทึกการจ่ายเงิน
              </button>
              <button type="button" onClick={() => setPopup("reject")} className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-slate-300 font-semibold hover:bg-slate-50">
                ตีกลับ
              </button>
            </div>
          ) : (
            popup !== "done" && (
              <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
                {error || "คำขอนี้ไม่อยู่ในขั้นทำจ่ายของคุณแล้ว"}
              </p>
            )
          )}
        </div>
      </div>

      {/* ===== ป๊อปอัพยืนยัน ===== */}
      {popup === "confirm" && (
        <Popup>
          <b className="text-lg">ยืนยันการบันทึกการจ่ายเงิน</b>
          <p className="text-xs text-slate-500">ตรวจข้อมูลให้ตรงกับที่โอนในแอปธนาคาร</p>
          <div className="my-4 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
            <Row label="ผู้รับเงิน" value={payee(r)} dark />
            <Row label="บัญชี" value={r.bankAccount ?? "ดูในใบแจ้งหนี้"} dark />
            <Row label="เลขที่อ้างอิง" value={ref} dark />
            <Row label="ยอดโอน" value={baht(r.total)} dark />
          </div>
          <p className="text-xs text-slate-500">บันทึกแล้วสถานะจะเปลี่ยนเป็น &quot;จ่ายแล้ว&quot; และแก้ไขไม่ได้</p>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => setPopup("none")} className="h-10 flex-1 cursor-pointer rounded-lg border border-slate-300 font-semibold">ยกเลิก</button>
            <button type="button" onClick={confirmPay} className="h-10 flex-1 cursor-pointer rounded-lg bg-emerald-700 font-semibold text-white">บันทึกการจ่ายเงิน</button>
          </div>
        </Popup>
      )}

      {/* ===== ป๊อปอัพสำเร็จ ===== */}
      {popup === "done" && (
        <Popup>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
          <p className="mt-3 text-center text-lg font-bold">บันทึกการจ่ายเงินแล้ว</p>
          <p className="text-center text-xs text-slate-500">สถานะคำขอเปลี่ยนเป็น &quot;จ่ายแล้ว&quot;</p>
          <p className="mt-2 text-center text-3xl font-bold tabular-nums">{baht(r.total)}</p>
          <div className="my-4 space-y-3 rounded-xl border border-slate-200 p-4 text-sm">
            <Row label="เลขที่คำขอ" value={r.id} dark />
            <Row label="ผู้รับเงิน" value={payee(r)} dark />
            <Row label="เลขที่อ้างอิง" value={ref} dark />
            <Row label="วันที่โอน" value={thaiDate(payDate)} dark />
          </div>
          <p className="text-center text-sm text-slate-500" role="status">กำลังพาไปหน้าหลัก…</p>
        </Popup>
      )}

      {/* ===== ป๊อปอัพตีกลับ ===== */}
      {popup === "reject" && (
        <Popup>
          <b className="text-lg">ตีกลับคำขอ</b>
          <p className="text-xs text-slate-500">คำขอจะกลับไปหาพนักงานให้แก้ไข เช่น เลขบัญชีผิด ชื่อไม่ตรง โอนไม่สำเร็จ</p>
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="เหตุผลที่ตีกลับ"
            rows={4}
            className="mt-4 w-full rounded-lg border border-slate-300 p-3 text-sm"
          />
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => setPopup("none")} className="h-10 flex-1 cursor-pointer rounded-lg border border-slate-300 font-semibold">ยกเลิก</button>
            <button
              type="button"
              onClick={confirmReject}
              disabled={!rejectNote.trim()}
              className="h-10 flex-1 cursor-pointer rounded-lg bg-rose-600 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              ยืนยันตีกลับ
            </button>
          </div>
        </Popup>
      )}
    </div>
  );
}

// ---------- ชิ้นส่วนเล็กๆ ที่ใช้ซ้ำ ----------

// 1 แถว ซ้าย-ขวา (dark = ตัวหนังสือสีเข้ม ใช้บนพื้นขาว)
function Row({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className={dark ? "text-slate-500" : "text-slate-300"}>{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

// 1 ขั้นในขั้นตอนอนุมัติ: done = ✓ เขียว · now = วงเส้นประเขียว · rejected = ✕ แดง · wait = วงเทา
function Step({ state, title, sub }: { state: "done" | "now" | "rejected" | "wait"; title: string; sub: string }) {
  const circle = {
    done: "bg-emerald-600 text-white",
    now: "border-2 border-dashed border-emerald-500 bg-white",
    rejected: "border border-rose-500 text-rose-500",
    wait: "border border-slate-300 bg-white",
  }[state];
  return (
    <li className="flex gap-3">
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${circle}`}>
        {state === "done" ? "✓" : state === "rejected" ? "✕" : ""}
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
    </li>
  );
}

// กรอบป๊อปอัพ (พื้นหลังมืด + กล่องขาวตรงกลาง)
function Popup({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6">{children}</div>
    </div>
  );
}

// useSearchParams ต้องอยู่ใน Suspense ไม่งั้น build ของ Next.js จะ error
export default function PayPage() {
  return (
    <Suspense fallback={null}>
      <PayContent />
    </Suspense>
  );
}
