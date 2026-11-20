"use client";
// ════════════════════════════════════════════════════════════
//  การ์ด "คำขอของฉัน" ใช้ร่วมกันทุกแดชบอร์ด (พนักงาน · หัวหน้า · ผอ. · บัญชี · การเงิน)
//  รับคำขอของคนที่ login (mine) → แสดงล่าสุด MY_REQUEST_LIMIT ใบ + stepper + เหตุผลที่ถูกตีกลับ
// ════════════════════════════════════════════════════════════
import { Plus, CheckCircle1 } from "@tailgrids/icons";
import { Link } from "@/components/tailgrids/core/link";
import type { SavedRequest } from "@/data/request";

const MY_REQUEST_PATH = "/my-request"; // ปุ่ม "ดูทั้งหมด"
const MY_REQUEST_LIMIT = 3; // แสดงคำขอล่าสุดกี่รายการ

const money = (n: number) => n.toLocaleString("en-US");

// "14 ต.ค." (เวลาไทย)
function shortDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" });
}

// ป้ายสถานะของคำขอ (ป้ายเม็ดยาใหญ่)
function statusBadge(r: SavedRequest): { text: string; cls: string } {
  if (r.status === "ร่าง") return { text: "ร่าง", cls: "bg-slate-100 text-slate-600" };
  if (r.status === "ตีกลับ") return { text: "ถูกตีกลับ", cls: "bg-rose-100 text-rose-600" };
  if (r.status === "อนุมัติแล้ว") return { text: "อนุมัติแล้ว", cls: "bg-emerald-100 text-emerald-700" };
  if (r.status === "จ่ายแล้ว") return { text: "จ่ายแล้ว", cls: "bg-emerald-100 text-emerald-700" };

  const cur = r.approvalSteps[r.currentStep];
  if (!cur) return { text: "รออนุมัติ", cls: "bg-amber-100 text-amber-700" };
  const verb =
    cur.role === "ACCOUNTANT_ADMIN" ? "ตรวจสอบ" : cur.role === "FINANCE" ? "ทำจ่าย" : "อนุมัติ";
  return { text: `รอ${cur.label}${verb}`, cls: "bg-amber-100 text-amber-700" };
}

// เหตุผลที่ถูกตีกลับ: หน้าอนุมัติเก็บไว้ใน reject (ถ้ามี) ไม่งั้นใช้หมายเหตุของขั้นที่ตีกลับ
function rejectReason(r: SavedRequest) {
  const extra = r as SavedRequest & { reject?: { status: string; comment: string }; reviewComment?: string };
  if (extra.reject) return extra.reject.comment ? `${extra.reject.status} — ${extra.reject.comment}` : extra.reject.status;
  return r.approvalSteps.find((s) => s.status === "ตีกลับ")?.note || extra.reviewComment || "-";
}

type NodeState = "done" | "current" | "rejected" | "pending";

// จุดใน stepper: [ส่งคำขอ, ...ขั้นอนุมัติ]
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
  done: "bg-emerald-600 text-white",
  rejected: "border-2 border-red-500 bg-white text-red-500",
  current: "border-2 border-dashed border-emerald-500 bg-white",
  pending: "border-2 border-gray-300 bg-white",
};
const LABEL_STYLE: Record<NodeState, string> = {
  done: "text-gray-400",
  rejected: "font-bold text-red-600",
  current: "font-bold text-slate-800",
  pending: "text-gray-400",
};
const STATE_TEXT: Record<NodeState, string> = {
  done: "เสร็จแล้ว",
  rejected: "ตีกลับ",
  current: "อยู่ขั้นนี้",
  pending: "ยังไม่ถึง",
};

// stepper: เส้นซ้ายเขียวเมื่อขั้นก่อนหน้าผ่าน · เส้นขวาเขียวเมื่อขั้นนี้ผ่าน
function Stepper({ nodes }: { nodes: { label: string; state: NodeState }[] }) {
  const n = nodes.length;
  return (
    <ol
      className="mt-3 grid w-full"
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      aria-label="ความคืบหน้า"
    >
      {nodes.map((node, i) => (
        <li key={i} className="flex flex-col items-center" aria-label={`${node.label}: ${STATE_TEXT[node.state]}`}>
          <div className="relative flex h-6 w-full items-center justify-center" aria-hidden="true">
            {i > 0 && (
              <span
                className={`absolute left-0 right-1/2 top-1/2 h-0.5 -translate-y-1/2 ${
                  nodes[i - 1].state === "done" ? "bg-emerald-600" : "bg-gray-200"
                }`}
              />
            )}
            {i < n - 1 && (
              <span
                className={`absolute left-1/2 right-0 top-1/2 h-0.5 -translate-y-1/2 ${
                  node.state === "done" ? "bg-emerald-600" : "bg-gray-200"
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${NODE_STYLE[node.state]}`}
            >
              {node.state === "done" && "✓"}
              {node.state === "rejected" && "✕"}
            </span>
          </div>
          <span className={`mt-1 text-center text-xs ${LABEL_STYLE[node.state]}`} aria-hidden="true">
            {node.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

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
      className={`flex w-full flex-col self-start rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl ${className}`}
    >
      <div className="mb-1 flex items-center justify-between">
        <h2 id="my-requests-title" className="text-base font-bold text-gray-800">
          คำขอของฉัน
        </h2>
        <Link href={MY_REQUEST_PATH} className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">
          ดูทั้งหมด →
        </Link>
      </div>

      {/* ยังไม่มีคำขอ: ชวนให้สร้าง */}
      {latest.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-[#64748B]">
          <span>ยังไม่มีคำขอเบิก</span>
          <Link
            href="/request"
            className="flex items-center gap-2 rounded-xl bg-[#059669] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#047857]"
          >
            <Plus size={16} aria-hidden="true" /> สร้างคำขอ
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {latest.map((r) => {
            const badge = statusBadge(r);
            const draft = r.status === "ร่าง";
            // ร่าง / ถูกตีกลับ → หน้าแก้ไข · อื่น ๆ → หน้ารายละเอียด
            const href =
              draft || r.status === "ตีกลับ"
                ? `/request?id=${encodeURIComponent(r.id)}`
                : `/my-request/detail?id=${encodeURIComponent(r.id)}`;
            return (
              <li key={r.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={href} className="block truncate text-sm font-bold text-gray-900 hover:text-[#047857] hover:underline">
                      {r.title}
                    </Link>
                    <div className="mt-0.5 text-xs text-[#64748B]">
                      {draft ? "บันทึกร่างเมื่อ" : "ส่งเมื่อ"} {shortDate(draft ? r.updatedAt : r.createdAt)}{" "}
                      <span className="money font-bold text-gray-800">฿{money(r.total)}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${badge.cls}`}>
                    {badge.text}
                  </span>
                </div>

                <Stepper nodes={progressNodes(r)} />

                {/* ถูกตีกลับ: เหตุผล + ไปแก้ไขส่งใหม่ */}
                {r.status === "ตีกลับ" && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs">
                    <span className="min-w-0 truncate text-rose-700">
                      <strong>เหตุผล:</strong> {rejectReason(r)}
                    </span>
                    <Link href={href} className="shrink-0 font-bold text-rose-700 hover:underline">
                      แก้ไขแล้วส่งใหม่ →
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {latest.length > 0 && (
        <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-xs text-[#64748B]">
          <CheckCircle1 className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>คำขอของคุณจะถูกส่งให้ผู้อนุมัติตามลำดับขั้นอนุมัติ</span>
        </div>
      )}
    </section>
  );
}
