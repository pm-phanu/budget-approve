"use client";

// ════════════════════════════════════════════════════════════
//  ประวัติการเบิก (/withdraw-history)
//  คำขอของตัวเองที่จบแล้ว: จ่ายแล้ว / อนุมัติแล้ว (รอจ่าย) / ถูกตีกลับ
//  ข้อมูลจาก getMyFinishedRequests() · ไทม์ไลน์จาก getTimeline() (data/request.ts)
//  ※ คำขอที่ยังอยู่ระหว่างอนุมัติ ดูที่หน้า "คำขอของฉัน"
// ════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  REQUESTS_KEY,
  getMyFinishedRequests,
  getTimeline,
  historyType,
  loadRequests,
  type SavedRequest,
} from "@/data/request";
import { getCurrentUser } from "@/utils/login";
import type { Credential } from "@/data/credential";
import { ArrowRight, ChevronRight, ClockThree, InfoCircle, Search1 } from "@tailgrids/icons";

const DETAIL_PATH = "/my-request/detail";
const NEW_REQUEST_PATH = "/request";

type Filter = "all" | "paid" | "approved" | "rejected";

const baht = (n: number) => "฿" + Number(n || 0).toLocaleString("en-US");

function thaiDate(iso: string | null, withTime = false) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

// หัวกลุ่มรายเดือน เช่น "พฤศจิกายน 2569"
function monthLabel(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "ไม่ระบุวันที่";
  return d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", month: "long", year: "numeric" });
}

function filterOf(r: SavedRequest): Exclude<Filter, "all"> {
  if (r.status === "จ่ายแล้ว") return "paid";
  if (r.status === "อนุมัติแล้ว") return "approved";
  return "rejected";
}

function badgeOf(r: SavedRequest) {
  const f = filterOf(r);
  if (f === "paid") return { text: "จ่ายแล้ว", cls: "status-paid" };
  if (f === "approved") return { text: "อนุมัติแล้ว รอจ่าย", cls: "status-approved" };
  return { text: "ถูกตีกลับ", cls: "status-rejected" };
}

// เหตุผลที่ถูกตีกลับ (ขั้นที่ตีกลับล่าสุด)
function rejectNote(r: SavedRequest) {
  const step = [...r.approvalSteps].reverse().find((s) => s.status === "ตีกลับ");
  return step ? `${step.label}: ${step.note || "ไม่ระบุเหตุผล"}` : "ไม่ระบุเหตุผล";
}

// สีจุดบนไทม์ไลน์ตามประเภทการกระทำ
function dotOf(type: string | null) {
  if (type === "ตีกลับ") return "bg-[#BE123C]";
  if (type === "อนุมัติ" || type === "ทำจ่าย") return "bg-[#059669]";
  return "bg-[#CBD5E1]";
}

export default function WithdrawHistory() {
  const [me, setMe] = useState<Credential | null>(null);
  const [requests, setRequests] = useState<SavedRequest[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null); // คำขอที่เปิดไทม์ไลน์อยู่

  // localStorage อ่านได้หลังเปิดหน้าเท่านั้น · แท็บอื่นแก้คำขอ → อัปเดตตาม
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

  const mine = me ? getMyFinishedRequests(requests, me.id) : [];
  const count = (f: Filter) => (f === "all" ? mine.length : mine.filter((r) => filterOf(r) === f).length);
  const paidTotal = mine.filter((r) => filterOf(r) === "paid").reduce((s, r) => s + Number(r.total || 0), 0);

  const q = query.trim().toLowerCase();
  const shown = mine.filter(
    (r) =>
      (filter === "all" || filterOf(r) === filter) &&
      (!q || r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)),
  );

  // จัดกลุ่มตามเดือนที่จบ (updatedAt) · ลำดับใหม่ → เก่า มาจาก getMyFinishedRequests แล้ว
  const groups: { month: string; list: SavedRequest[] }[] = [];
  for (const r of shown) {
    const month = monthLabel(r.updatedAt);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.list.push(r);
    else groups.push({ month, list: [r] });
  }

  const tabs: { key: Filter; label: string; tone: string }[] = [
    { key: "all", label: "ทั้งหมด", tone: "text-[#0F172A]" },
    { key: "paid", label: "จ่ายแล้ว", tone: "text-[#047857]" },
    { key: "approved", label: "อนุมัติแล้ว รอจ่าย", tone: "text-[#047857]" },
    { key: "rejected", label: "ถูกตีกลับ", tone: "text-[#BE123C]" },
  ];

  return (
    <div className="text-[#0F172A]">
      <header className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold">ประวัติการเบิก</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            คำขอของคุณที่จบขั้นตอนแล้ว · ได้รับเงินแล้วรวม{" "}
            <strong className="money text-[#047857]">{baht(paidTotal)}</strong>
          </p>
        </div>
        <Link href="/my-request" className="flex items-center gap-1 text-sm font-semibold text-[#047857] hover:underline">
          คำขอที่กำลังดำเนินการ <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </header>

      {/* การ์ดสรุป = ตัวกรอง */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4" role="group" aria-label="กรองตามสถานะ">
        {tabs.map((t) => {
          const active = filter === t.key;
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(t.key)}
              className={`rounded-xl border bg-white p-6 text-left shadow-2xl ${
                active ? "border-[#059669] ring-1 ring-[#059669]" : "border-[#E2E8F0] hover:border-[#A7F3D0]"
              }`}
            >
              <span className="block text-sm text-[#64748B]">{t.label}</span>
              <span className={`money mt-1 block text-3xl font-bold ${t.tone}`}>{count(t.key)}</span>
            </button>
          );
        })}
      </div>

      <section
        aria-labelledby="history-title"
        className="mt-9 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 id="history-title" className="text-lg font-bold">
            {tabs.find((t) => t.key === filter)?.label}{" "}
            <span className="text-sm font-normal text-[#64748B]">{shown.length} รายการ</span>
          </h2>
          <label className="flex w-full items-center gap-2 rounded-xl border border-[#E2E8F0] px-3 py-2 focus-within:border-[#059669] sm:w-72">
            <Search1 size={18} className="shrink-0 text-[#94A3B8]" aria-hidden="true" />
            <span className="sr-only">ค้นหาคำขอ</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อคำขอหรือเลขที่"
              className="w-full border-0 bg-transparent p-0 text-sm outline-none focus:ring-0"
            />
          </label>
        </div>

        {shown.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3 text-center text-sm text-[#64748B]">
            <ClockThree size={28} aria-hidden="true" />
            {!me ? (
              "กรุณาเข้าสู่ระบบ"
            ) : q ? (
              <>
                <p>ไม่พบคำขอที่ตรงกับ “{query.trim()}”</p>
                <button type="button" onClick={() => setQuery("")} className="font-semibold text-[#047857] hover:underline">
                  ล้างคำค้นหา
                </button>
              </>
            ) : mine.length === 0 ? (
              <>
                <p>ยังไม่มีคำขอที่จบขั้นตอน · คำขอที่กำลังรออนุมัติอยู่ในหน้า “คำขอของฉัน”</p>
                <Link href={NEW_REQUEST_PATH} className="font-semibold text-[#047857] hover:underline">
                  สร้างคำขอ
                </Link>
              </>
            ) : (
              "ไม่มีคำขอในสถานะนี้"
            )}
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.month} className="mt-4 first:mt-2">
              <h3 className="sticky top-0 z-[1] bg-white py-2 text-xs font-semibold text-[#64748B]">{g.month}</h3>
              <ul className="divide-y divide-[#E2E8F0] border-t border-[#E2E8F0]">
                {g.list.map((r) => {
                  const badge = badgeOf(r);
                  const isOpen = open === r.id;
                  const detail = `${DETAIL_PATH}?id=${encodeURIComponent(r.id)}`;
                  return (
                    <li key={r.id} className="py-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <Link href={detail} className="block truncate font-semibold hover:text-[#047857] hover:underline">
                            {r.title}
                          </Link>
                          <p className="text-xs text-[#64748B]">
                            {r.id} · {r.project?.name ?? "ไม่ระบุโครงการ"} · จบเมื่อ {thaiDate(r.updatedAt)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="money text-lg font-bold">{baht(r.total)}</span>
                          <span className={`status ${badge.cls}`}>{badge.text}</span>
                        </div>
                      </div>

                      {filterOf(r) === "rejected" && (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FFF1F2] px-3.5 py-2.5 text-sm">
                          <p className="flex min-w-0 items-start gap-2 text-[#9F1239]">
                            <InfoCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                            <span>
                              <strong>เหตุผล:</strong> {rejectNote(r)}
                            </span>
                          </p>
                          <Link
                            href={`${NEW_REQUEST_PATH}?id=${encodeURIComponent(r.id)}`}
                            className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#BE123C] hover:bg-[#FFE4E6]"
                          >
                            แก้ไขแล้วส่งใหม่ <ArrowRight size={14} aria-hidden="true" />
                          </Link>
                        </div>
                      )}

                      {/* ไทม์ไลน์: เปิด / ปิดทีละคำขอ */}
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`timeline-${r.id}`}
                        onClick={() => setOpen(isOpen ? null : r.id)}
                        className="mt-2 flex items-center gap-1 rounded-lg px-1 py-0.5 text-xs font-semibold text-[#047857] hover:bg-[#ECFDF5]"
                      >
                        <ChevronRight
                          size={14}
                          aria-hidden="true"
                          className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
                        />
                        {isOpen ? "ซ่อนไทม์ไลน์" : "ดูไทม์ไลน์"}
                      </button>
                      {isOpen && (
                        <ol id={`timeline-${r.id}`} className="ml-2 mt-2 border-l-2 border-[#E2E8F0] pl-4">
                          {getTimeline(r).map((h, i) => (
                            <li key={i} className="relative pb-3 last:pb-0">
                              <span
                                aria-hidden="true"
                                className={`absolute -left-[23px] top-1.5 h-3 w-3 rounded-full ring-2 ring-white ${dotOf(historyType(h))}`}
                              />
                              <p className="text-sm font-medium">{h.action}</p>
                              <p className="text-xs text-[#64748B]">
                                {h.by} · {thaiDate(h.at, true)}
                              </p>
                              {h.note && <p className="mt-0.5 text-xs text-[#475569]">“{h.note}”</p>}
                            </li>
                          ))}
                          {getTimeline(r).length === 0 && (
                            <li className="text-xs text-[#64748B]">ไม่มีบันทึกประวัติ</li>
                          )}
                        </ol>
                      )}
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
