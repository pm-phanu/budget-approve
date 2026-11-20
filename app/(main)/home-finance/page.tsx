"use client";

// ════════════════════════════════════════════════════════════
//  หน้า "รายการรอทำจ่าย" ของฝ่ายการเงิน (/home-finance)
//  แสดงคำขอที่บัญชีตรวจผ่านแล้ว รอการเงินโอนเงิน
// ════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadRequests, type SavedRequest } from "@/data/request";
import { canApproveStep } from "@/data/approval";
import { getCurrentUser } from "@/utils/login";

// โอนเกินกี่วันถือว่า "เลยกำหนด"
const DUE_DAYS = 3;

// ---------- ฟังก์ชันช่วย ----------
const baht = (n: number) => "฿" + n.toLocaleString("en-US");

// นับว่าผ่านมากี่วันแล้ว (นับเป็นวัน ไม่สนชั่วโมง)
function daysAgo(iso: string | null) {
  if (!iso) return 0;
  const start = new Date(iso);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - start.getTime()) / 86400000);
}

// วันที่บัญชีตรวจผ่าน = เวลาของขั้นก่อนหน้าขั้นการเงิน
function checkedAt(r: SavedRequest) {
  return r.approvalSteps[r.currentStep - 1]?.at ?? null;
}

// วันที่การเงินจ่าย = เวลาของขั้นการเงิน
function paidAt(r: SavedRequest) {
  return r.approvalSteps.find((s) => s.role === "FINANCE")?.at ?? "";
}

// ชื่อผู้รับเงิน: สำรองจ่าย = ผู้ขอ (โอนคืน) · ใบแจ้งหนี้ = ผู้ขายตามใบแจ้งหนี้
function payee(r: SavedRequest) {
  return r.type === "advance" ? (r.requester?.fullName ?? "-") : "ผู้ขายตามใบแจ้งหนี้";
}

// ป้าย "x วันก่อน": 0–1 วัน เทา · 2–3 วัน เหลือง · เกิน 3 วัน แดง
function DaysBadge({ days }: { days: number }) {
  if (days > DUE_DAYS) {
    return (
      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
        ⚠ {days} วันก่อน เลยกำหนด
      </span>
    );
  }
  const color = days >= 2 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
      {days === 0 ? "วันนี้" : `${days} วันก่อน`}
    </span>
  );
}

// ---------- หน้าหลัก ----------
export default function FinancePage() {
  const [pending, setPending] = useState<SavedRequest[]>([]); // รอทำจ่าย
  const [paid, setPaid] = useState<SavedRequest[]>([]); // จ่ายแล้ว
  const [tab, setTab] = useState<"all" | "advance" | "invoice">("all");
  const [search, setSearch] = useState("");

  // โหลดข้อมูลตอนเปิดหน้า
  useEffect(() => {
    const me = getCurrentUser();
    const all = loadRequests();

    // รอทำจ่าย = ขั้นปัจจุบันเป็นการเงิน และคนที่ login มีสิทธิ์กด
    const waiting = all
      .filter((r) => r.approvalSteps[r.currentStep]?.role === "FINANCE" && canApproveStep(r, me))
      .sort((a, b) => (checkedAt(a) ?? "").localeCompare(checkedAt(b) ?? "")); // เก่าสุดขึ้นก่อน

    /* eslint-disable react-hooks/set-state-in-effect -- อ่าน localStorage ได้หลังเปิดหน้าเท่านั้น */
    setPending(waiting);
    setPaid(all.filter((r) => r.status === "จ่ายแล้ว"));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // ---------- ตัวเลขบนการ์ด ----------
  const pendingTotal = pending.reduce((sum, r) => sum + r.total, 0);
  const overdueCount = pending.filter((r) => daysAgo(checkedAt(r)) > DUE_DAYS).length;

  const today = new Date().toDateString();
  const thisMonth = new Date().toISOString().slice(0, 7); // เช่น "2026-11"
  const paidToday = paid.filter((r) => new Date(paidAt(r)).toDateString() === today);
  const paidMonth = paid.filter((r) => paidAt(r).startsWith(thisMonth));
  const sum = (list: SavedRequest[]) => list.reduce((s, r) => s + r.total, 0);

  // ---------- กรองตามแท็บ + ช่องค้นหา ----------
  const keyword = search.trim().toLowerCase();
  const rows = pending.filter((r) => {
    if (tab !== "all" && r.type !== tab) return false;
    if (!keyword) return true;
    return (r.id + r.title + payee(r)).toLowerCase().includes(keyword);
  });

  const tabs = [
    { key: "all", label: "ทั้งหมด", count: pending.length },
    { key: "advance", label: "สำรองจ่าย", count: pending.filter((r) => r.type === "advance").length },
    { key: "invoice", label: "ใบแจ้งหนี้", count: pending.filter((r) => r.type === "invoice").length },
  ] as const;

  return (
    <div className="font-sans text-slate-800">
      {/* หัวข้อ */}
      <h1 className="text-[28px] font-bold">รายการรอทำจ่าย</h1>
      <p className="mt-1 text-sm text-slate-500">
        บัญชีตรวจแล้ว ให้โอนเงินภายใน {DUE_DAYS} วันทำการ แล้วบันทึกการจ่ายที่นี่
      </p>

      {/* การ์ดสรุป 3 ใบ */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[2fr_1fr_1fr]">
        <div className="rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#047857] p-7 text-white">
          <p className="text-sm text-emerald-200">ยอดรอทำจ่าย</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">{baht(pendingTotal)}</p>
          <p className="mt-2 text-sm text-slate-300">
            {pending.length} รายการ
            {overdueCount > 0 && <span className="ml-3 text-rose-300">เลยกำหนด {overdueCount} รายการ</span>}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">จ่ายแล้ววันนี้</p>
          <p className="mt-2 text-[28px] font-bold tabular-nums">{baht(sum(paidToday))}</p>
          <p className="mt-1 text-sm text-slate-500">{paidToday.length} รายการ</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">จ่ายแล้วเดือนนี้</p>
          <p className="mt-2 text-[28px] font-bold tabular-nums">{baht(sum(paidMonth))}</p>
          <p className="mt-1 text-sm text-slate-500">{paidMonth.length} รายการ</p>
        </div>
      </div>

      {/* ตาราง */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {/* แท็บ + ค้นหา */}
        <div className="flex flex-wrap items-center gap-2 px-6 py-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold ${
                tab === t.key ? "bg-[#0F172A] text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {t.label} {t.count}
            </button>
          ))}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเลขที่เอกสาร / ผู้รับเงิน"
            className="ml-auto h-10 w-64 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600"
          />
        </div>

        {/* หัวตาราง */}
        <div className="grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr] border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs font-semibold text-slate-500">
          <span>คำขอ</span>
          <span>ผู้รับเงิน / บัญชี</span>
          <span>บัญชีตรวจเมื่อ</span>
          <span>ยอดโอน</span>
          <span />
        </div>

        {/* แถวข้อมูล */}
        {rows.length === 0 && (
          <p className="border-t border-slate-100 py-12 text-center text-sm text-slate-400">ไม่มีรายการรอทำจ่าย</p>
        )}
        {rows.map((r) => {
          const days = daysAgo(checkedAt(r));
          return (
            <div
              key={r.id}
              className={`grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr] items-center border-t border-slate-100 px-6 py-3 ${
                days > DUE_DAYS ? "bg-rose-50" : ""
              }`}
            >
              <div>
                <p className="font-semibold">{r.title}</p>
                <p className="text-xs text-slate-500">
                  {r.id}{" "}
                  <b className={r.type === "advance" ? "text-emerald-700" : "text-blue-700"}>{r.typeLabel}</b>
                </p>
              </div>
              <div>
                <p className="text-sm">{payee(r)}</p>
                <p className="text-xs text-slate-500">{r.bankAccount ?? "ดูในใบแจ้งหนี้"}</p>
              </div>
              <div>
                <DaysBadge days={days} />
              </div>
              <p className="font-bold tabular-nums">{baht(r.total)}</p>
              <div className="text-right">
                <Link
                  href={`/home-finance/pay?id=${r.id}`}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  ดูและจ่าย
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
