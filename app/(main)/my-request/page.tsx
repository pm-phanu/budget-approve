"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { REQUESTS_KEY, loadRequests, type SavedRequest } from "@/data/request";
import type { Credential } from "@/data/credential";
import { getCurrentUser } from "@/utils/login";
import { onHeaderSearch, readSearchParam } from "@/utils/search";
import { ArrowRight, Check, Close, InfoCircle } from "@tailgrids/icons";
import { baht } from "@/utils/format";
import { SearchField } from "@/components/search-field";

/* ------------------------------------------------------------------
   ตั้งค่า
------------------------------------------------------------------- */
const NEW_REQUEST_PATH = "/request"; // หน้าสร้างคำขอ 
const DETAIL_PATH = "/my-request/detail"; // หน้าดูรายละเอียดคำขอของตัวเอง (ทุก role · ไม่ใช่หน้าอนุมัติ)

/* ------------------------------------------------------------------
   ชนิดข้อมูล: ใช้ของกลางใน data/ (คำขอ = SavedRequest · ผู้ใช้ = Credential)
------------------------------------------------------------------- */
// + ผลตรวจที่หน้าอนุมัติบันทึกเพิ่ม (actOnRequest → extra)
type ExpenseRequest = SavedRequest & {
  reviewComment?: string;
  reject?: { status: string; comment: string };
};
type CurrentUser = Credential;

type Group = "draft" | "progress" | "done" | "rejected";
type Filter = "all" | Group;
type StepState = "done" | "rejected" | "current" | "pending";

/* ------------------------------------------------------------------
   อ่านข้อมูลจาก localStorage (ผ่านฟังก์ชันกลางใน data/ และ utils/login)
------------------------------------------------------------------- */
// ข้ามข้อมูลรูปแบบเก่าที่ไม่มีเส้นทางอนุมัติ

/* ------------------------------------------------------------------
   ฟังก์ชันช่วย
------------------------------------------------------------------- */

// "14 ต.ค. 2569"
function thaiDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// จัดคำขอเข้ากลุ่ม: ร่าง / ถูกตีกลับ / จ่ายเงินแล้ว (ผ่านครบทุกขั้น) / กำลังดำเนินการ
function groupOf(r: ExpenseRequest): Group {
  if (r.status === "ร่าง") return "draft";
  if (r.status === "ตีกลับ" || r.approvalSteps.some((s) => s.status === "ตีกลับ")) {
    return "rejected";
  }
  if (r.status === "อนุมัติแล้ว" || r.status === "จ่ายแล้ว") return "done";
  return "progress";
}

// ป้ายสถานะ: class ร่วมใน globals.css (status-*) · ข้อความเหมือนหน้าอื่น
function badgeOf(r: ExpenseRequest) {
  const g = groupOf(r);
  if (g === "draft") return { text: "ร่าง", cls: "status-draft" };
  if (g === "rejected") return { text: "ถูกตีกลับ", cls: "status-rejected" };
  if (r.status === "จ่ายแล้ว") return { text: "จ่ายแล้ว", cls: "status-paid" };
  if (g === "done") return { text: "อนุมัติแล้ว", cls: "status-approved" };
  const step = r.approvalSteps[r.currentStep];
  return { text: step ? `รอ${step.label}` : "กำลังดำเนินการ", cls: "status-pending" };
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
    { label: "ส่งคำขอ", state: r.status === "ร่าง" ? "current" : "done" },
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
                    leftGreen ? "bg-[#059669]" : "bg-[#E2E8F0]"
                  }`}
                />
              )}
              {i < n - 1 && (
                <span
                  className={`absolute left-1/2 right-0 top-1/2 h-0.5 -translate-y-1/2 ${
                    rightGreen ? "bg-[#059669]" : "bg-[#E2E8F0]"
                  }`}
                />
              )}

              <span
                className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  node.state === "done"
                    ? "bg-[#059669] text-white"
                    : node.state === "rejected"
                      ? "bg-[#BE123C] text-white"
                      : node.state === "current"
                        ? "border-2 border-[#059669] bg-[#ECFDF5]"
                        : "border border-[#CBD5E1] bg-white"
                }`}
              >
                {node.state === "done" && <Check className="h-3 w-3" aria-hidden="true" />}
                {node.state === "rejected" && <Close className="h-3 w-3" aria-hidden="true" />}
              </span>
            </div>
            <span
              className={`mt-1 text-center text-xs ${
                node.state === "current"
                  ? "font-semibold text-[#047857]"
                  : node.state === "rejected"
                    ? "font-semibold text-[#BE123C]"
                    : "text-[#64748B]"
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

  // คำค้นจากช่องค้นหาบน header (?q= ตอนเปิดหน้า · event ตอนอยู่หน้านี้อยู่แล้ว) utils/search.ts
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- ?q= อ่านได้หลังเปิดหน้าเท่านั้น */
    setQuery(readSearchParam());
    return onHeaderSearch(setQuery);
  }, []);

  // โหลดใน useEffect เท่านั้น (ฝั่งเซิร์ฟเวอร์ไม่มี localStorage)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- อ่านได้หลังเปิดหน้าเท่านั้น */
    setRequests(loadRequests());
    setMe(getCurrentUser());
    /* eslint-enable react-hooks/set-state-in-effect */

    const onStorage = (e: StorageEvent) => {
      if (e.key === REQUESTS_KEY) setRequests(loadRequests());
      if (e.key === "current_user") setMe(getCurrentUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // เฉพาะคำขอที่ตัวเองสร้าง (รวมร่าง เหมือนการ์ดบนแดชบอร์ด) ใหม่สุดอยู่บนสุด
  const mine = !me
    ? []
    : requests
        .filter((r) => r.requester != null && String(r.requester.id) === String(me.id))
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

  // ตัวเลขการ์ดสรุป
  const count = (g: Group) => mine.filter((r) => groupOf(r) === g).length;
  const counts = {
    all: mine.length,
    draft: count("draft"),
    progress: count("progress"),
    done: count("done"),
    rejected: count("rejected"),
  };

  // ยอดเงินรวมต่อกลุ่ม (ใต้ตัวเลขบนการ์ด)
  const sumOf = (g: Filter) =>
    mine.filter((r) => g === "all" || groupOf(r) === g).reduce((s, r) => s + Number(r.total || 0), 0);

  // กรองตามแท็บ + ค้นหา · แท็บ "ทั้งหมด": ถูกตีกลับขึ้นก่อน (ต้องแก้) แล้วค่อยใหม่ → เก่า
  const q = query.trim().toLowerCase();
  const shown = mine
    .filter((r) => filter === "all" || groupOf(r) === filter)
    .filter(
      (r) =>
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q),
    )
    // sort คงลำดับเดิมเมื่อเท่ากัน → ภายในกลุ่มยังใหม่ → เก่า
    .sort((a, b) => Number(groupOf(b) === "rejected") - Number(groupOf(a) === "rejected"));

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "ทั้งหมด" },
    { key: "progress", label: "กำลังดำเนินการ" },
    { key: "done", label: "อนุมัติ/จ่ายแล้ว" },
    { key: "rejected", label: "ถูกตีกลับ" },
    { key: "draft", label: "ร่าง" },
  ];

  return (
    <div className="text-[#0F172A]">
      {/* ปุ่ม "สร้างคำขอ" อยู่บน header ของ layout ทุกหน้าแล้ว → หน้านี้ไม่ใส่ซ้ำ */}
      <header className="mb-9">
        <h1 className="text-[32px] font-bold">คำขอของฉัน</h1>
        <p className="mt-1 text-sm text-[#64748B]">ทุกคำขอที่คุณสร้าง ติดตามได้ว่าตอนนี้อยู่ขั้นไหน</p>
      </header>

      {/* ถูกตีกลับ = ต้องทำอะไรต่อ → เตือนบนสุด กดแล้วกรองเฉพาะกลุ่มนี้ */}
      {counts.rejected > 0 && filter !== "rejected" && (
        <div
          role="status"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#FECDD3] bg-[#FFF1F2] px-4 py-3 text-sm text-[#9F1239]"
        >
          <p className="flex items-center gap-2">
            <InfoCircle size={18} className="shrink-0" aria-hidden="true" />
            <span>
              มี <strong>{counts.rejected} คำขอ</strong>ถูกตีกลับ แก้ไขแล้วส่งใหม่เพื่อให้อนุมัติต่อ
            </span>
          </p>
          <button
            type="button"
            onClick={() => setFilter("rejected")}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#BE123C] hover:bg-[#FFE4E6]"
          >
            ดูคำขอที่ถูกตีกลับ
          </button>
        </div>
      )}

      {/* การ์ดสรุป = ตัวกรอง (กดแล้วกรองรายการด้านล่าง · การ์ดที่เลือกมีขอบเขียว) */}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-5" role="group" aria-label="กรองตามสถานะ">
        {tabs.map((t) => {
          const active = filter === t.key;
          const tone =
            t.key === "progress"
              ? "text-[#B45309]"
              : t.key === "done"
                ? "text-[#047857]"
                : t.key === "rejected"
                  ? "text-[#BE123C]"
                  : "text-[#0F172A]";
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
              <span className={`money mt-1 block text-3xl font-bold ${tone}`}>{counts[t.key]}</span>
              <span className="money mt-0.5 block text-xs text-[#64748B]">{baht(sumOf(t.key))}</span>
            </button>
          );
        })}
      </div>

      {/* รายการคำขอ */}
      <section
        aria-labelledby="list-title"
        className="mt-9 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 id="list-title" className="text-lg font-bold">
            {tabs.find((t) => t.key === filter)?.label}{" "}
            <span className="text-sm font-normal text-[#64748B]">{shown.length} รายการ</span>
          </h2>
          <SearchField
            label="ค้นหาคำขอ"
            value={query}
            onChange={setQuery}
            placeholder="ค้นหาชื่อคำขอหรือเลขที่"
            className="sm:w-72"
          />
        </div>

        {shown.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3 text-center text-sm text-[#64748B]">
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
                <p>ยังไม่มีคำขอเบิก</p>
                <Link href={NEW_REQUEST_PATH} className="font-semibold text-[#047857] hover:underline">
                  สร้างคำขอแรก
                </Link>
              </>
            ) : (
              "ไม่มีคำขอในสถานะนี้"
            )}
          </div>
        ) : (
          <ul className="divide-y divide-[#E2E8F0]">
            {shown.map((r) => {
              const badge = badgeOf(r);
              const rejected = groupOf(r) === "rejected";
              const draft = r.status === "ร่าง";
              // ร่างยังไม่มีหน้ารายละเอียด → เปิดฟอร์มแก้ต่อ (แบบเดียวกับการ์ดบนแดชบอร์ด)
              const detail = draft
                ? `${NEW_REQUEST_PATH}?id=${encodeURIComponent(r.id)}`
                : `${DETAIL_PATH}?id=${encodeURIComponent(r.id)}`;
              return (
                <li key={r.id} className="py-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* ซ้าย: ชื่อ (กดดูรายละเอียด) + เลขที่ + stepper */}
                    <div className="min-w-0 flex-1">
                      <Link href={detail} className="block truncate font-semibold hover:text-[#047857] hover:underline">
                        {r.title}
                      </Link>
                      <p className="text-xs text-[#64748B]">
                        {r.id}, {draft ? `บันทึกร่างเมื่อ ${thaiDate(r.updatedAt ?? r.createdAt)}` : `ส่งเมื่อ ${thaiDate(r.createdAt)}`}
                      </p>
                      <Stepper r={r} />
                    </div>

                    {/* ขวา: ยอดเงิน + สถานะ */}
                    <div className="flex flex-col items-end gap-2">
                      <span className="money text-xl font-bold">{baht(r.total)}</span>
                      <span className={`status ${badge.cls}`}>{badge.text}</span>
                      <Link
                        href={detail}
                        className="flex items-center gap-1 text-xs font-semibold text-[#047857] hover:underline"
                      >
                        {draft ? "แก้ไขต่อ" : "ดูรายละเอียด"} <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>

                  {/* เหตุผลที่ถูกตีกลับ + ทางแก้ */}
                  {rejected && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#FFF1F2] px-3.5 py-2.5 text-sm">
                      <p className="flex min-w-0 items-start gap-2 text-[#9F1239]">
                        <InfoCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>
                          <strong>เหตุผล:</strong> {rejectReason(r)}
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
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
