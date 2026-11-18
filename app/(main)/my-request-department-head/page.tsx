"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { REQUESTS_KEY } from "@/data/request";
import { ArrowRight, Bell1, Plus, Search1 } from "@tailgrids/icons";

/* ------------------------------------------------------------------
   ตั้งค่า
------------------------------------------------------------------- */
const NEW_REQUEST_PATH = "/request"; // หน้าสร้างคำขอ 
const DETAIL_PATH = "/home-department-head/approve"; // ← หน้าดูรายละเอียดคำขอ 

/* ------------------------------------------------------------------
   ชนิดข้อมูล
------------------------------------------------------------------- */
interface ApprovalStep {
  role: string; // "HEAD" | "DIRECTOR" | "MANAGING_DIRECTOR" | "ACCOUNTANT_ADMIN" | "FINANCE"
  label: string;
  status: string; // "รอ" | "อนุมัติ" | "ตีกลับ"
  by: string | null;
  at: string | null;
  note?: string;
}
interface ExpenseRequest {
  id: string;
  createdAt: string;
  status: string; // "ร่าง" | "รออนุมัติ" | "อนุมัติแล้ว" | "ตีกลับ"
  title: string;
  total: number;
  requester: { id: string | number; fullName: string } | null;
  approvalSteps: ApprovalStep[];
  currentStep: number;
  reviewComment?: string;
  reject?: { status: string; comment: string };
}
interface CurrentUser {
  id: string | number;
  fullName: string;
  role: string;
}

type Group = "progress" | "done" | "rejected";
type Filter = "all" | Group;
type StepState = "done" | "rejected" | "current" | "pending";

/* ------------------------------------------------------------------
   อ่านข้อมูล
------------------------------------------------------------------- */
function loadRequests(): ExpenseRequest[] {
  try {
    const raw = localStorage.getItem(REQUESTS_KEY);
    const data = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) return [];
    return data.filter((r) => r && Array.isArray(r.approvalSteps));
  } catch {
    return [];
  }
}

function loadUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem("current_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------
   ฟังก์ชันช่วย
------------------------------------------------------------------- */
const baht = (n: number) => "฿" + n.toLocaleString("en-US");

// "14 ต.ค. 2569"
function thaiDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// จัดคำขอเข้ากลุ่ม: ถูกตีกลับ / จ่ายเงินแล้ว (ผ่านครบทุกขั้น) / กำลังดำเนินการ
function groupOf(r: ExpenseRequest): Group {
  if (r.status === "ตีกลับ" || r.approvalSteps.some((s) => s.status === "ตีกลับ")) {
    return "rejected";
  }
  if (r.status === "อนุมัติแล้ว") return "done";
  return "progress";
}

// ป้ายสถานะ (ตามขั้นที่กำลังรออยู่)
function badgeOf(r: ExpenseRequest) {
  const g = groupOf(r);
  if (g === "rejected")
    return { text: "ถูกตีกลับ", cls: "bg-rose-100 text-rose-600" };
  if (g === "done")
    return { text: "จ่ายเงินแล้ว", cls: "bg-emerald-100 text-emerald-700" };

  const role = r.approvalSteps[r.currentStep]?.role;
  if (role === "ACCOUNTANT_ADMIN")
    return { text: "รอบัญชีตรวจ", cls: "bg-blue-100 text-blue-700" };
  if (role === "FINANCE")
    return { text: "รอการเงิน", cls: "bg-indigo-100 text-indigo-700" };
  return { text: "รออนุมัติ", cls: "bg-amber-100 text-amber-700" };
}

// สถานะของแต่ละขั้นใน stepper
function stepState(r: ExpenseRequest, i: number): StepState {
  const s = r.approvalSteps[i];
  if (s.status === "ตีกลับ") return "rejected";
  if (s.status === "อนุมัติ") return "done";
  return i === r.currentStep && r.status === "รออนุมัติ" ? "current" : "pending";
}

// เหตุผลที่ถูกตีกลับ (จาก key reject ถ้าไม่มีใช้ความเห็นของขั้นที่ตีกลับ)
function rejectReason(r: ExpenseRequest) {
  if (r.reject) {
    return r.reject.comment
      ? `${r.reject.status} — ${r.reject.comment}`
      : r.reject.status;
  }
  const step = r.approvalSteps.find((s) => s.status === "ตีกลับ");
  return r.reviewComment || step?.note || "-";
}

/* ------------------------------------------------------------------
   Stepper: ส่งคำขอ → ขั้นอนุมัติทั้งหมด
------------------------------------------------------------------- */
function Stepper({ r }: { r: ExpenseRequest }) {
  const nodes: { label: string; state: StepState }[] = [
    { label: "ส่งคำขอ", state: "done" },
    ...r.approvalSteps.map((s, i) => ({
      label: s.label,
      state: stepState(r, i),
    })),
  ];
  const n = nodes.length;

  return (
    <div
      className="mt-3 grid w-full max-w-md"
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      {nodes.map((node, i) => {
        // เส้นซ้าย: เขียวเมื่อขั้นก่อนหน้าผ่านแล้ว / เส้นขวา: เขียวเมื่อขั้นนี้ผ่านแล้ว
        const leftGreen = i > 0 && nodes[i - 1].state === "done";
        const rightGreen = node.state === "done";
        return (
          <div key={i} className="flex flex-col items-center">
            <div className="relative flex h-6 w-full items-center justify-center">
              {i > 0 && (
                <span
                  className={`absolute left-0 right-1/2 top-1/2 h-0.5 -translate-y-1/2 ${
                    leftGreen ? "bg-emerald-600" : "bg-gray-200"
                  }`}
                />
              )}
              {i < n - 1 && (
                <span
                  className={`absolute left-1/2 right-0 top-1/2 h-0.5 -translate-y-1/2 ${
                    rightGreen ? "bg-emerald-600" : "bg-gray-200"
                  }`}
                />
              )}

              <span
                className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  node.state === "done"
                    ? "bg-emerald-600 text-white"
                    : node.state === "rejected"
                      ? "border-2 border-red-500 bg-white text-red-500"
                      : node.state === "current"
                        ? "border-2 border-dashed border-emerald-500 bg-white"
                        : "border-2 border-gray-300 bg-white"
                }`}
              >
                {node.state === "done" && "✓"}
                {node.state === "rejected" && "✕"}
              </span>
            </div>
            <span
              className={`mt-1 text-center text-xs ${
                node.state === "current"
                  ? "font-bold text-slate-800"
                  : node.state === "rejected"
                    ? "font-bold text-red-600"
                    : "text-gray-400"
              }`}
            >
              {node.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------
   หน้า คำขอของฉัน
------------------------------------------------------------------- */
export default function MyRequest() {
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  // โหลดใน useEffect เท่านั้น (ฝั่งเซิร์ฟเวอร์ไม่มี localStorage)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- อ่านได้หลังเปิดหน้าเท่านั้น */
    setRequests(loadRequests());
    setMe(loadUser());
    /* eslint-enable react-hooks/set-state-in-effect */

    const onStorage = (e: StorageEvent) => {
      if (e.key === REQUESTS_KEY) setRequests(loadRequests());
      if (e.key === "current_user") setMe(loadUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // เฉพาะคำขอที่ตัวเองสร้าง (ส่งแล้ว ไม่รวมร่าง) ใหม่สุดอยู่บนสุด
  const mine = !me
    ? []
    : requests
        .filter(
          (r) =>
            r.status !== "ร่าง" &&
            r.requester != null &&
            String(r.requester.id) === String(me.id),
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

  // ตัวเลขการ์ดสรุป
  const count = (g: Group) => mine.filter((r) => groupOf(r) === g).length;
  const counts = {
    all: mine.length,
    progress: count("progress"),
    done: count("done"),
    rejected: count("rejected"),
  };

  // กรองตามแท็บ + ค้นหา
  const q = query.trim().toLowerCase();
  const shown = mine
    .filter((r) => filter === "all" || groupOf(r) === filter)
    .filter(
      (r) =>
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q),
    );

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "ทั้งหมด" },
    { key: "progress", label: "กำลังดำเนินการ" },
    { key: "done", label: "จ่ายเงินแล้ว" },
    { key: "rejected", label: "ถูกตีกลับ" },
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-6 text-slate-800">
      <div className="mx-auto max-w-7xl">
        {/* ===== หัวหน้า ===== */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-slate-900">คำขอของฉัน</h1>
        </header>

        {/* ===== การ์ดสรุป 4 ใบ ===== */}
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "ทั้งหมด", value: counts.all, color: "text-slate-900" },
            { label: "กำลังดำเนินการ", value: counts.progress, color: "text-orange-500" },
            { label: "จ่ายเงินแล้ว", value: counts.done, color: "text-emerald-600" },
            { label: "ถูกตีกลับ", value: counts.rejected, color: "text-red-700" },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="text-sm text-gray-500">{c.label}</div>
              <div className={`mt-1 text-3xl font-bold ${c.color}`}>
                {c.value}
              </div>
            </div>
          ))}
        </div>

        {/* ===== รายการคำขอ ===== */}
        <section className="mt-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {/* แท็บกรอง */}
          <div className="mb-2 flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  filter === t.key
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-gray-400">
              {me ? "ไม่มีคำขอ" : "กรุณาเข้าสู่ระบบ"}
            </div>
          ) : (
            shown.map((r, i) => {
              const badge = badgeOf(r);
              const rejected = groupOf(r) === "rejected";
              return (
                <div
                  key={r.id}
                  className={`py-5 ${i > 0 ? "border-t border-gray-100" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* ซ้าย: ชื่อ + รหัส + stepper */}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-bold text-slate-900">
                        {r.title}
                      </div>
                      <div className="text-xs text-gray-400">
                        {r.id} · ส่งเมื่อ {thaiDate(r.createdAt)}
                      </div>
                      <Stepper r={r} />
                    </div>

                    {/* ขวา: ยอดเงิน + สถานะ + ดูรายละเอียด */}
                    <div className="flex flex-col items-end gap-3">
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-bold tabular-nums text-slate-900">
                          {baht(r.total)}
                        </span>
                        <span
                          className={`whitespace-nowrap rounded-full px-4 py-1 text-xs font-bold ${badge.cls}`}
                        >
                          {badge.text}
                        </span>
                      </div>
                      <Link
                        href={`${DETAIL_PATH}?id=${encodeURIComponent(r.id)}`}
                        className="flex items-center gap-1 text-xs font-bold text-green-700 hover:underline"
                      >
                        ดูรายละเอียด <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>

                  {/* เหตุผลที่ถูกตีกลับ */}
                  {rejected && (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs">
                      <div className="flex min-w-0 items-center gap-2.5 text-rose-700">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-rose-400 text-[10px] font-bold">
                          i
                        </span>
                        <span className="truncate">
                          <strong>เหตุผล:</strong> {rejectReason(r)}
                        </span>
                      </div>
                      <Link
                        href={`${NEW_REQUEST_PATH}?id=${encodeURIComponent(r.id)}`}
                        className="flex shrink-0 items-center gap-1 font-bold text-rose-700 hover:underline"
                      >
                        แก้ไขแล้วส่งใหม่ <ArrowRight size={14} />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}