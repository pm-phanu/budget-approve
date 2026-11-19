"use client";
// ════════════════════════════════════════════════════════════
//  การ์ด "คำขอของฉัน" ใช้ร่วมกันทุกแดชบอร์ด (พนักงาน · หัวหน้า · บัญชี)
//  รับคำขอของคนที่ login (mine) → แสดงล่าสุด MY_REQUEST_LIMIT ใบ + เส้นสถานะ
// ════════════════════════════════════════════════════════════
import { Fragment } from "react";
import { Plus, ArrowRight, Check } from "@tailgrids/icons";
import { Link } from "@/components/tailgrids/core/link";
import type { SavedRequest } from "@/data/request";

const MY_REQUEST_PATH = "/my-request"; // ปุ่ม "ดูทั้งหมด"
const MY_REQUEST_LIMIT = 5; // แสดงคำขอล่าสุดกี่รายการ

const money = (n: number) => n.toLocaleString("en-US");

// ป้ายสถานะของคำขอ
function statusBadge(r: SavedRequest): { text: string; cls: string } {
  if (r.status === "ร่าง") return { text: "ร่าง", cls: "status-draft" };
  if (r.status === "ตีกลับ") return { text: "ถูกตีกลับ", cls: "status-rejected" };
  if (r.status === "อนุมัติแล้ว") return { text: "อนุมัติแล้ว", cls: "status-approved" };
  if (r.status === "จ่ายแล้ว") return { text: "จ่ายแล้ว", cls: "status-paid" };

  const cur = r.approvalSteps[r.currentStep];
  if (!cur) return { text: "รออนุมัติ", cls: "status-pending" };
  const verb =
    cur.role === "ACCOUNTANT_ADMIN" ? "ตรวจสอบ" : cur.role === "FINANCE" ? "ทำจ่าย" : "อนุมัติ";
  return { text: `รอ${cur.label}${verb}`, cls: "status-pending" };
}

type NodeState = "done" | "current" | "rejected" | "pending";

// จุดในแถบความคืบหน้า: [ส่งคำขอ, ...ขั้นอนุมัติ]
function progressNodes(r: SavedRequest): { label: string; state: NodeState }[] {
  const submit: { label: string; state: NodeState } = {
    label: "ส่งคำขอ",
    state: r.status === "ร่าง" ? "current" : "done",
  };
  const steps = r.approvalSteps.map((s, i) => {
    let state: NodeState = "pending";
    if (s.status === "อนุมัติ") state = "done";
    else if (s.status === "ตีกลับ") state = "rejected";
    else if (r.status === "รออนุมัติ" && i === r.currentStep) state = "current";
    return { label: s.label, state };
  });
  return [submit, ...steps];
}

const NODE_STYLE: Record<NodeState, string> = {
  done: "bg-[#059669] text-white",
  current: "border-2 border-[#059669] bg-[#ECFDF5]",
  rejected: "bg-[#BE123C] text-white",
  pending: "border border-[#CBD5E1] bg-white",
};

export default function MyRequestsCard({
  mine,
  className = "",
}: {
  mine: SavedRequest[];
  className?: string;
}) {
  // คำขอล่าสุด (ใหม่สุดอยู่บน)
  const latest = [...mine]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MY_REQUEST_LIMIT);

  return (
    <section
      aria-labelledby="my-requests-title"
      className={`self-start rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl ${className}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 id="my-requests-title" className="text-lg font-bold">
          คำขอของฉัน
        </h2>
        <Link href={MY_REQUEST_PATH} className="flex items-center gap-1 text-sm font-semibold text-[#047857] hover:underline">
          ดูทั้งหมด <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      {/* ยังไม่มีคำขอ: ชวนให้สร้าง */}
      {latest.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-[#64748B]">ยังไม่มีคำขอเบิก</p>
          <Link
            href="/request"
            className="flex items-center gap-1.5 rounded-xl bg-[#059669] px-4 py-2 text-sm font-semibold text-white hover:bg-[#047857]"
          >
            <Plus size={16} aria-hidden="true" /> สร้างคำขอ
          </Link>
        </div>
      )}

      {/* คำขอล่าสุด สูงสุด MY_REQUEST_LIMIT รายการ · กดชื่อเพื่อดูรายละเอียด */}
      <ul className="divide-y divide-[#E2E8F0]">
        {latest.map((r) => {
          const badge = statusBadge(r);
          const nodes = progressNodes(r);
          const href =
            r.status === "ร่าง" || r.status === "ตีกลับ"
              ? `/request?id=${encodeURIComponent(r.id)}`
              : `/my-request/detail?id=${encodeURIComponent(r.id)}`;
          return (
            <li key={r.id} className="py-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={href} className="block truncate font-semibold text-[#0F172A] hover:text-[#047857] hover:underline">
                    {r.title}
                  </Link>
                  <p className="money text-xs text-[#64748B]">
                    {r.id}, ฿{money(r.total)}
                  </p>
                </div>
                <span className={`status ${badge.cls}`}>{badge.text}</span>
              </div>

              {/* เส้นสถานะ: ส่งคำขอ → ทุกขั้นอนุมัติ */}
              <ol className="flex items-center px-3" aria-label="ความคืบหน้า">
                {nodes.map((n, i) => (
                  <Fragment key={i}>
                    {i > 0 && (
                      <span
                        aria-hidden="true"
                        className={`h-0.5 flex-1 ${n.state === "pending" ? "bg-[#E2E8F0]" : "bg-[#059669]"}`}
                      />
                    )}
                    <li
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${NODE_STYLE[n.state]}`}
                      aria-label={`${n.label}: ${n.state === "done" ? "เสร็จแล้ว" : n.state === "rejected" ? "ตีกลับ" : n.state === "current" ? "อยู่ขั้นนี้" : "ยังไม่ถึง"}`}
                    >
                      {n.state === "done" && <Check size={14} aria-hidden="true" />}
                      {n.state === "rejected" && <span aria-hidden="true" className="font-bold">!</span>}
                    </li>
                  </Fragment>
                ))}
              </ol>
              <div className="mt-2 flex items-center justify-between text-xs text-[#64748B]" aria-hidden="true">
                {nodes.map((n, i) => (
                  <span key={i} className={n.state === "current" ? "font-semibold text-[#047857]" : n.state === "rejected" ? "font-semibold text-[#BE123C]" : ""}>
                    {n.label}
                  </span>
                ))}
              </div>

              {r.status === "ตีกลับ" && (
                <Link
                  href={href}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#BE123C] hover:underline"
                >
                  แก้ไขแล้วส่งใหม่ <ArrowRight size={14} aria-hidden="true" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
