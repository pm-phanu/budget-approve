"use client";

// ════════════════════════════════════════════════════════════
//  ประวัติการอนุมัติ (/approval-history)
//  ทุกครั้งที่ผู้ใช้คนนี้อนุมัติ / ตีกลับ (ใหม่ → เก่า)
//  ข้อมูลจาก getActedRequests() อ่านจาก history ไม่ใช่ approvalSteps
//    → การกระทำรอบก่อนไม่หายแม้คำขอถูกส่งใหม่ (data/request.ts)
// ════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  REQUESTS_KEY,
  getActedRequests,
  loadRequests,
  type SavedRequest,
} from "@/data/request";
import { getCurrentUser } from "@/utils/login";
import type { Credential } from "@/data/credential";
import { ArrowRight, CheckCircle1, Search1 } from "@tailgrids/icons";

// หน้ารายละเอียดแยกตาม role (เหมือนหน้า "คำขอรออนุมัติทั้งหมด")
const APPROVE_PATHS: Record<string, string> = {
  HEAD: "/home-department-head/approve",
  ACCOUNTANT: "/home-account/approve",
};
const DEFAULT_APPROVE_PATH = "/home-department-head/approve";

type Filter = "all" | "อนุมัติ" | "ตีกลับ";

const baht = (n: number) => "฿" + Number(n || 0).toLocaleString("en-US");

function thaiDateTime(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function monthLabel(iso: string | null) {
  const d = new Date(iso ?? "");
  if (isNaN(d.getTime())) return "ไม่ระบุวันที่";
  return d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", month: "long", year: "numeric" });
}

// สถานะล่าสุดของคำขอ (ตอนนี้ไปถึงไหนแล้ว)
function currentStatus(r: SavedRequest) {
  if (r.status === "จ่ายแล้ว") return { text: "จ่ายแล้ว", cls: "status-paid" };
  if (r.status === "อนุมัติแล้ว") return { text: "อนุมัติแล้ว", cls: "status-approved" };
  if (r.status === "ตีกลับ") return { text: "ถูกตีกลับ", cls: "status-rejected" };
  if (r.status === "ร่าง") return { text: "ผู้ขอกำลังแก้ไข", cls: "status-draft" };
  const step = r.approvalSteps[r.currentStep];
  return { text: step ? `รอ${step.label}` : "กำลังดำเนินการ", cls: "status-pending" };
}

export default function ApprovalHistory() {
  const [me, setMe] = useState<Credential | null>(null);
  const [requests, setRequests] = useState<SavedRequest[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- อ่านได้หลังเปิดหน้าเท่านั้น */
    setMe(getCurrentUser());
    setRequests(loadRequests());
    /* eslint-enable react-hooks/set-state-in-effect */
    const onStorage = (e: StorageEvent) => {
      if (e.key === REQUESTS_KEY) setRequests(loadRequests());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const acted = me ? getActedRequests(requests, me) : [];
  const approvedRows = acted.filter((a) => a.step.status === "อนุมัติ");
  const rejectedRows = acted.filter((a) => a.step.status === "ตีกลับ");
  // ยอดที่อนุมัติ: นับคำขอละครั้ง (อนุมัติหลายรอบหลังส่งใหม่ ไม่นับซ้ำ)
  const approvedIds = new Set(approvedRows.map((a) => a.request.id));
  const approvedTotal = requests
    .filter((r) => approvedIds.has(r.id))
    .reduce((s, r) => s + Number(r.total || 0), 0);

  const q = query.trim().toLowerCase();
  const shown = acted.filter(
    ({ request: r, step }) =>
      (filter === "all" || step.status === filter) &&
      (!q ||
        r.title.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.requester?.fullName ?? "").toLowerCase().includes(q)),
  );

  // จัดกลุ่มตามเดือนที่กด (ใหม่ → เก่า มาจาก getActedRequests แล้ว)
  const groups: { month: string; list: typeof shown }[] = [];
  for (const row of shown) {
    const month = monthLabel(row.step.at);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.list.push(row);
    else groups.push({ month, list: [row] });
  }

  const approvePath = (me && APPROVE_PATHS[me.role]) || DEFAULT_APPROVE_PATH;

  const cards: { key: Filter; label: string; value: string; sub?: string; tone: string }[] = [
    { key: "all", label: "ทั้งหมด", value: String(acted.length), sub: "ครั้ง", tone: "text-[#0F172A]" },
    {
      key: "อนุมัติ",
      label: "อนุมัติ",
      value: String(approvedRows.length),
      sub: `ครั้ง · ${baht(approvedTotal)}`,
      tone: "text-[#047857]",
    },
    { key: "ตีกลับ", label: "ตีกลับ", value: String(rejectedRows.length), sub: "ครั้ง", tone: "text-[#BE123C]" },
  ];

  return (
    <div className="text-[#0F172A]">
      <header className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold">ประวัติการอนุมัติ</h1>
          <p className="mt-1 text-sm text-[#64748B]">ทุกครั้งที่คุณอนุมัติหรือตีกลับคำขอ ล่าสุดอยู่บน</p>
        </div>
        <Link href="/all-request" className="flex items-center gap-1 text-sm font-semibold text-[#047857] hover:underline">
          คำขอที่รอคุณตรวจสอบ <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </header>

      {/* การ์ดสรุป = ตัวกรอง */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3" role="group" aria-label="กรองตามการกระทำ">
        {cards.map((c) => {
          const active = filter === c.key;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(c.key)}
              className={`rounded-xl border bg-white p-6 text-left shadow-2xl ${
                active ? "border-[#059669] ring-1 ring-[#059669]" : "border-[#E2E8F0] hover:border-[#A7F3D0]"
              }`}
            >
              <span className="block text-sm text-[#64748B]">{c.label}</span>
              <span className={`money mt-1 block text-3xl font-bold ${c.tone}`}>
                {c.value} <span className="text-sm font-normal text-[#64748B]">{c.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      <section
        aria-labelledby="acted-title"
        className="mt-9 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 id="acted-title" className="text-lg font-bold">
            {filter === "all" ? "ทั้งหมด" : filter}{" "}
            <span className="text-sm font-normal text-[#64748B]">{shown.length} ครั้ง</span>
          </h2>
          <label className="flex w-full items-center gap-2 rounded-xl border border-[#E2E8F0] px-3 py-2 focus-within:border-[#059669] sm:w-72">
            <Search1 size={18} className="shrink-0 text-[#94A3B8]" aria-hidden="true" />
            <span className="sr-only">ค้นหา</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อคำขอ ผู้ขอ หรือเลขที่"
              className="w-full border-0 bg-transparent p-0 text-sm outline-none focus:ring-0"
            />
          </label>
        </div>

        {shown.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3 text-center text-sm text-[#64748B]">
            <CheckCircle1 size={28} aria-hidden="true" />
            {!me ? (
              "กรุณาเข้าสู่ระบบ"
            ) : q ? (
              <>
                <p>ไม่พบรายการที่ตรงกับ “{query.trim()}”</p>
                <button type="button" onClick={() => setQuery("")} className="font-semibold text-[#047857] hover:underline">
                  ล้างคำค้นหา
                </button>
              </>
            ) : acted.length === 0 ? (
              <>
                <p>คุณยังไม่เคยอนุมัติหรือตีกลับคำขอ</p>
                <Link href="/all-request" className="font-semibold text-[#047857] hover:underline">
                  ไปที่คำขอที่รอคุณตรวจสอบ
                </Link>
              </>
            ) : (
              "ไม่มีรายการในตัวกรองนี้"
            )}
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.month} className="mt-4 first:mt-2">
              <h3 className="py-2 text-xs font-semibold text-[#64748B]">{g.month}</h3>
              <ul className="divide-y divide-[#E2E8F0] border-t border-[#E2E8F0]">
                {g.list.map(({ request: r, step }, i) => {
                  const rejected = step.status === "ตีกลับ";
                  const now = currentStatus(r);
                  return (
                    <li key={`${r.id}-${step.at}-${i}`} className="flex flex-wrap items-start gap-4 py-4">
                      {/* การกระทำของคุณ */}
                      <span
                        className={`status shrink-0 ${rejected ? "status-rejected" : "status-approved"}`}
                        title={`คุณ${step.status}ในขั้น ${step.label}`}
                      >
                        {rejected ? "ตีกลับ" : "อนุมัติ"}
                      </span>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`${approvePath}?id=${encodeURIComponent(r.id)}`}
                          className="block truncate font-semibold hover:text-[#047857] hover:underline"
                        >
                          {r.title}
                        </Link>
                        <p className="text-xs text-[#64748B]">
                          {r.requester?.fullName ?? "-"} · {r.id} · ขั้น {step.label} · {thaiDateTime(step.at)}
                        </p>
                        {step.note && (
                          <p className={`mt-1 text-sm ${rejected ? "text-[#9F1239]" : "text-[#475569]"}`}>
                            {rejected ? "เหตุผล: " : "ความเห็น: "}“{step.note}”
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <span className="money font-bold">{baht(r.total)}</span>
                        <span className="text-xs text-[#64748B]">
                          ตอนนี้: <span className={`status ${now.cls}`}>{now.text}</span>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
