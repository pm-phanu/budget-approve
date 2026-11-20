"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
// ไอคอนทั้งหมดจาก @tailgrids/icons (https://tailgrids.com/icons)
import { ArrowRight, Check, Close, Eye, FileText } from "@tailgrids/icons";
// component จาก TailGrids (https://tailgrids.com/docs/components)
import { ModalOverlay } from "react-aria-components";
import { Button } from "@/components/tailgrids/core/button";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { TextArea } from "@/components/tailgrids/core/text-area";
import { addRequestsToBudget } from "@/data/budget";
import { loadRequests, type SavedRequest, type SavedStep } from "@/data/request";
import { actOnRequest, canApproveStep } from "@/data/approval";
import { useReviewLock } from "@/components/use-review-lock";
import { getCurrentUser } from "@/utils/login";
import type { Credential } from "@/data/credential";

/* ------------------------------------------------------------------
   ตั้งค่า
------------------------------------------------------------------- */
const HOME_PATH = "/home-account";

// เหตุผลที่ตีกลับ (ปุ่มเลือกในป๊อบอัพ) ค่าที่เลือกจะถูกเก็บใน reject.status
const REJECT_REASONS = ["เอกสารไม่ครบ", "ยอดเงินไม่ถูกต้อง", "อื่นๆ"];
const REJECT_COMMENT_MAX = 300;

/* ------------------------------------------------------------------
   ชนิดข้อมูล: ใช้ SavedRequest ของกลาง (data/request.ts)
   + ผลตรวจที่หน้านี้บันทึกเพิ่ม (actOnRequest → extra)
------------------------------------------------------------------- */
// ข้อมูลการตีกลับ (key ใหม่ชื่อ reject)
interface RejectInfo {
  status: string; // ตีกลับเรื่องอะไร เช่น "เอกสารไม่ครบ"
  comment: string; // ความเห็นที่พิมพ์ไว้
  by: string; // ใครตีกลับ
  at: string; // ตีกลับเมื่อไหร่ (ISO)
}
type Req = SavedRequest & {
  reviewedAt?: string; // ให้หน้า Home ใช้เรียง "อนุมัติล่าสุด"
  reviewComment?: string;
  reject?: RejectInfo; // มีเมื่อคำขอถูกตีกลับ
};

function loadAll(): Req[] {
  try {
    return loadRequests() as Req[];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------
   ฟังก์ชันช่วย
------------------------------------------------------------------- */
const baht = (n: number) => "฿" + n.toLocaleString("en-US");

function thaiDate(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function thaiDateTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return (
    d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" }) +
    " " +
    d.toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" }) +
    " น."
  );
}

/* ------------------------------------------------------------------
   ชิ้นส่วนเล็ก
------------------------------------------------------------------- */
const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <section
    className={`rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl ${className}`}
  >
    {children}
  </section>
);

type StepStatus = "done" | "rejected" | "current" | "pending";

const Dot = ({ status }: { status: StepStatus }) => {
  const styles: Record<StepStatus, string> = {
    done: "bg-[#059669] text-white",
    rejected: "bg-[#BE123C] text-white",
    current: "border-2 border-[#059669] bg-[#ECFDF5]",
    pending: "border border-[#CBD5E1] bg-white",
  };
  return (
    <span
      className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${styles[status]}`}
    >
      {status === "done" && <Check className="h-3 w-3" />}
      {status === "rejected" && <Close className="h-3 w-3" />}
    </span>
  );
};

// สถานะของแต่ละขั้นในเส้นทางอนุมัติ
function stepState(
  s: SavedStep,
  index: number,
  current: number,
  reqStatus: string,
): StepStatus {
  if (s.status.includes("ตีกลับ")) return "rejected";
  if (s.status !== "รอ") return "done";
  return index === current && reqStatus === "รออนุมัติ" ? "current" : "pending";
}

/* ------------------------------------------------------------------
   หน้าหลัก
------------------------------------------------------------------- */
function ReviewContent() {
  const router = useRouter();
  const id = useSearchParams().get("id") ?? "";

  const [request, setRequest] = useState<Req | null>(null);
  const [projectRemaining, setProjectRemaining] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [checked, setChecked] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  // ป๊อบอัพตีกลับ
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState(""); // เหตุผลที่เลือก
  const [rejectComment, setRejectComment] = useState(""); // ความเห็นที่พิมพ์
  const [rejectError, setRejectError] = useState("");

  // คนที่ login (ใช้เช็คสิทธิ์อนุมัติ) · ขั้นที่เห็นตอนเปิดหน้า (ใช้กันกดซ้อน ดู actOnRequest)
  const [me, setMe] = useState<Credential | null>(null);
  const [openedStep, setOpenedStep] = useState(0);
  const [notice, setNotice] = useState(""); // บันทึกไม่สำเร็จ (มีคนกดไปก่อน) → แสดงด้านบน

  useEffect(() => {
    const found = loadAll().find((x) => x.id === id) ?? null;
    /* eslint-disable react-hooks/set-state-in-effect -- อ่านได้หลังเปิดหน้าเท่านั้น */
    setRequest(found);
    setMe(getCurrentUser());
    if (found) setOpenedStep(found.currentStep);

    // งบคงเหลือของโครงการ (นับรวมคำขอที่ส่งแล้ว ตามที่ addRequestsToBudget คิด)
    if (found?.project) {
      const p = addRequestsToBudget(loadRequests()).find(
        (x) => x.id === found.project!.id,
      );
      if (p) {
        let left = 0;
        for (const c of p.categories) left += c.limit - c.used;
        setProjectRemaining(left);
      }
    }
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [id]);

  // ล็อก "มีคนกำลังตรวจสอบอยู่" (components/use-review-lock.ts) · ต้องอยู่ก่อน return ด้านล่าง (กฎของ hooks)
  const lockedBy = useReviewLock(request, me);

  if (!loaded) return null;

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
        <p className="text-lg font-semibold">ไม่พบคำขอนี้</p>
        <Link
          href={HOME_PATH}
          className="text-sm text-emerald-700 hover:underline"
        >
          กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  const r = request;
  const requesterName = r.requester?.fullName ?? "-";
  const curStep = r.approvalSteps[r.currentStep];
  // แสดงกล่องอนุมัติเมื่อคนที่ login เป็นผู้อนุมัติของขั้นปัจจุบันจริง (data/approval.ts canApproveStep)
  // ※ ผู้ขออนุมัติคำขอตัวเองไม่ได้ · ขั้นที่ระบุตัวไว้ต้องเป็นคนนั้น · ขั้น "ใครก็ได้" ต้อง role ตรง
  const canAct = canApproveStep(r, me);

  // บันทึกไม่สำเร็จ (มีคนกดไปก่อน / ไม่มีสิทธิ์) → โหลดสถานะล่าสุดมาแสดง
  const reloadLatest = () => {
    const latest = loadAll().find((x) => x.id === r.id) ?? null;
    setRequest(latest);
    if (latest) setOpenedStep(latest.currentStep);
  };

  // ---- อนุมัติ ----
  const approve = () => {
    if (!checked) {
      setError("กรุณาติ๊กยืนยันว่าตรวจเอกสารและยอดเงินครบแล้ว");
      return;
    }

    // อ่านคำขอล่าสุดก่อนบันทึก: ถ้ามีคนกดขั้นนี้ไปแล้ว (เปิดหน้าค้างไว้) จะไม่บันทึกซ้ำ
    // บันทึก byId / ประวัติ / แจ้งเตือนให้ในครั้งเดียว (data/approval.ts actOnRequest)
    const result = actOnRequest(r.id, me, "approve", {
      expectedStep: openedStep,
      note: comment,
      extra: (now) => ({ reviewedAt: now, reviewComment: comment }), // ให้หน้า Home ใช้เรียงลำดับ
    });
    if (!result.ok) {
      setNotice(result.reason);
      reloadLatest();
      return;
    }
    router.push(HOME_PATH);
  };

  // ---- ป๊อบอัพตีกลับ: เปิด / ปิด / ยืนยัน ----
  const openReject = () => {
    setRejectReason("");
    setRejectComment("");
    setRejectError("");
    setShowReject(true);
  };
  const closeReject = () => setShowReject(false);

  const confirmReject = () => {
    if (!rejectReason) {
      setRejectError("กรุณาเลือกเหตุผลที่ตีกลับ");
      return;
    }
    // เลือก "อื่นๆ" ต้องพิมพ์รายละเอียดด้วย
    if (rejectReason === "อื่นๆ" && !rejectComment.trim()) {
      setRejectError("กรุณาระบุรายละเอียดเหตุผล");
      return;
    }

    const text = rejectComment.trim();
    // อ่านคำขอล่าสุดก่อนบันทึก (กันกดซ้อน) · บันทึก byId / ประวัติ / แจ้งเตือนผู้ขอให้ในครั้งเดียว
    const result = actOnRequest(r.id, me, "reject", {
      expectedStep: openedStep,
      note: text || rejectReason,
      historyNote: rejectReason,
      // key เดิม: เก็บว่าตีกลับเรื่องอะไร + ความเห็นที่พิมพ์ (หน้าคำขอของฉันใช้แสดงเหตุผล)
      extra: (now, by) => ({
        reviewedAt: now,
        reviewComment: text,
        reject: { status: rejectReason, comment: text, by, at: now },
      }),
    });
    if (!result.ok) {
      setNotice(result.reason);
      setShowReject(false);
      reloadLatest();
      return;
    }
    router.push(HOME_PATH);
  };

  // ---- timeline: ส่งคำขอ + ทุกขั้นในเส้นทางอนุมัติ ----
  const timeline = [
    {
      status: "done" as StepStatus,
      title: "ส่งคำขอ",
      meta: `${requesterName} ${thaiDateTime(r.createdAt)}`,
      note: undefined as string | undefined,
    },
    ...r.approvalSteps.map((s, i) => {
      const st = stepState(s, i, r.currentStep, r.status);
      // ขั้นที่ตีกลับ: แสดง "เหตุผล — ความเห็น" จาก reject
      let note: string | undefined;
      if (st === "rejected" && r.reject) {
        note = r.reject.comment
          ? `${r.reject.status} — “${r.reject.comment}”`
          : r.reject.status;
      } else if ((st === "done" || st === "rejected") && s.note) {
        note = `“${s.note}”`;
      }
      return {
        status: st,
        title: s.label,
        meta:
          st === "done" || st === "rejected"
            ? `${s.by ?? ""} ${thaiDateTime(s.at)}`
            : st === "current"
              ? canAct
                ? "รอคุณดำเนินการ"
                : `รอ${s.label}ดำเนินการ`
              : "รอขั้นถัดไป",
        note,
      };
    }),
  ];

  // ป้ายสถานะ (class ร่วมใน globals.css)
  // "รอคุณอนุมัติ" เฉพาะคนที่กดอนุมัติขั้นนี้ได้จริง · คนอื่น (เช่น ผู้ขอดูของตัวเอง) = "รอ<ชื่อขั้น>"
  const waitingStep = r.approvalSteps[r.currentStep];
  const badge =
    r.status === "จ่ายแล้ว"
      ? { text: "จ่ายแล้ว", cls: "status-paid" }
      : r.status === "อนุมัติแล้ว"
        ? { text: "อนุมัติแล้ว", cls: "status-approved" }
        : r.status === "ตีกลับ"
          ? { text: "ตีกลับแล้ว", cls: "status-rejected" }
          : r.status === "ร่าง"
            ? { text: "ร่าง", cls: "status-draft" }
            : {
                text: canAct ? "รอคุณอนุมัติ" : waitingStep ? `รอ${waitingStep.label}` : "กำลังดำเนินการ",
                cls: "status-pending",
              };

  // ตัวช่วยตัดสินใจ: หลักฐานครบไหม · งบโครงการพอไหม (projectRemaining นับรวมคำขอนี้แล้ว)
  const rowsWithFile = r.items.filter((it) => it.files.length > 0).length;
  const filesComplete = rowsWithFile === r.items.length;
  const budgetOk = projectRemaining === null || projectRemaining >= 0;

  return (
    <div className="text-[#0F172A]">
      {/* Header: ชื่อคำขอ + สถานะ · บรรทัดรอง = เลขที่ / ผู้ขอ / วันที่ส่ง */}
      <header className="mb-9">
        {/* breadcrumb (แดชบอร์ด / รหัสคำขอ) อยู่บน header ของ layout */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[32px] font-bold text-[#0F172A]">{r.title}</h1>
          <span className={`status ${badge.cls}`}>{badge.text}</span>
        </div>
        <p className="mt-1 text-sm text-[#64748B]">
          {r.id} ส่งโดย {requesterName} เมื่อ {thaiDateTime(r.createdAt)}
        </p>
      </header>

      {notice && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4 text-sm font-semibold text-[#B45309]"
        >
          {notice}
        </div>
      )}

      {/* จอกว้าง (≥1280px) = รายละเอียด 3 : ตัดสินใจ 1 · จอแคบ = ต่อกันลงมา */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        {/* ===== ซ้าย: รายละเอียดคำขอ ===== */}
        <div className="flex min-w-0 flex-col gap-5 xl:col-span-3">
          <Card>
            <h2 className="mb-5 text-lg font-bold">ข้อมูลคำขอ</h2>

            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <div>
                <dt className="mb-2 text-xs text-[#64748B]">ผู้ขอเบิก</dt>
                <dd className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#059669] text-sm font-semibold text-white"
                    aria-hidden="true"
                  >
                    {requesterName.slice(0, 2)}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{requesterName}</span>
                    <span className="block text-xs text-[#64748B]">
                      {r.requester
                        ? [r.requester.department, r.requester.lineOfWork].filter(Boolean).join(", ") || "-"
                        : "-"}
                    </span>
                  </span>
                </dd>
              </div>

              <div>
                <dt className="mb-1 text-xs text-[#64748B]">ยอดเงินที่ขอเบิก</dt>
                <dd>
                  <span className="money block text-4xl font-bold">{baht(r.total)}</span>
                  <span className="mt-1 block text-xs text-[#64748B]">
                    <span className="font-semibold text-[#475569]">{r.typeLabel}</span>, ใช้จ่ายวันที่{" "}
                    {thaiDate(r.useDate)}
                  </span>
                </dd>
              </div>

              <div>
                <dt className="mb-1 text-xs text-[#64748B]">โครงการ</dt>
                <dd>
                  <span className="block text-sm font-semibold">{r.project ? r.project.name : "-"}</span>
                  {r.project && <span className="block text-xs text-[#64748B]">{r.project.dept}</span>}
                </dd>
              </div>

              <div>
                <dt className="mb-1 text-xs text-[#64748B]">การโอนเงิน</dt>
                <dd>
                  <span className="block text-sm font-semibold">{r.payTo || "-"}</span>
                  {r.bankAccount && <span className="block text-xs text-[#64748B]">{r.bankAccount}</span>}
                </dd>
              </div>
            </dl>

            <div className="mt-6 border-t border-[#E2E8F0] pt-4">
              <p className="mb-1 text-xs text-[#64748B]">เหตุผลการเบิก</p>
              <p className="max-w-prose text-sm text-[#334155]">{r.reason || "ไม่ได้ระบุ"}</p>
            </div>
          </Card>

          {/* รายการค่าใช้จ่าย: ทุกแถวแสดงหลักฐานของแถวนั้นเอง → ตรวจทีละรายการได้ */}
          <Card>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-lg font-bold">รายการค่าใช้จ่าย</h2>
              <span className="text-sm text-[#64748B]">{r.items.length} รายการ</span>
            </div>

            <ul className="divide-y divide-[#E2E8F0]">
              {r.items.map((it, i) => (
                <li key={i} className="py-4">
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold">{it.name || "-"}</p>
                      <p className="mt-0.5 text-xs text-[#64748B]">{it.categoryName || "ไม่ระบุหมวด"}</p>
                    </div>
                    <span className="money shrink-0 font-semibold">{baht(it.amount)}</span>
                  </div>
                  {it.files.length === 0 ? (
                    <p className="mt-2 text-xs font-semibold text-[#BE123C]">ไม่มีหลักฐานแนบ</p>
                  ) : (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {it.files.map((file, f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] py-1.5 pl-2 pr-1 text-xs"
                        >
                          <FileText size={16} className="shrink-0 text-[#64748B]" aria-hidden="true" />
                          <span className="max-w-[16rem] truncate">{file}</span>
                          <button
                            type="button"
                            aria-label={`ดูเอกสาร ${file}`}
                            className="rounded p-1 text-[#94A3B8] hover:text-[#047857]"
                          >
                            <Eye size={16} aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>

            <div className="flex items-baseline justify-between border-t border-[#CBD5E1] pt-4">
              <span className="font-bold">รวมทั้งหมด</span>
              <span className="money text-xl font-bold text-[#047857]">{baht(r.total)}</span>
            </div>
          </Card>
        </div>

        {/* ===== ขวา: ตัดสินใจ → สถานะ → ประวัติ ===== */}
        <div className="flex min-w-0 flex-col gap-5 self-start xl:col-span-1">
          {/* มีคนอื่นกำลังตรวจสอบขั้นนี้อยู่ → กดไม่ได้ */}
          {canAct && lockedBy && (
            <Card>
              <div role="status" className="text-sm text-[#B45309]">
                <p className="font-bold">{lockedBy.userName} กำลังตรวจสอบคำขอนี้อยู่</p>
                <p className="mt-1 text-[#92400E]">
                  คุณจะกดอนุมัติหรือตีกลับได้เมื่อ {lockedBy.userName} ปิดหน้านี้
                  หรือไม่มีการใช้งานเกิน 2 นาที หน้านี้จะอัปเดตให้เอง
                </p>
              </div>
            </Card>
          )}

          {/* การตัดสินใจ: ขึ้นบนสุด เพราะเป็นงานหลักของคนที่เปิดหน้านี้ */}
          {canAct && !lockedBy && (
            <section
              aria-labelledby="decision-title"
              className="rounded-xl border-2 border-[#059669] bg-white p-6 shadow-2xl"
            >
              <h2 id="decision-title" className="text-lg font-bold">
                การอนุมัติของคุณ
              </h2>
              <p className="mt-0.5 text-sm text-[#64748B]">ขั้น{curStep.label}</p>

              {/* ตรวจให้อัตโนมัติ: ข้อมูลจากคำขอ ไม่ใช่ปุ่มให้กด */}
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckMark ok={filesComplete} />
                  <span className={filesComplete ? "" : "text-[#BE123C]"}>
                    แนบหลักฐาน {rowsWithFile} จาก {r.items.length} รายการ
                  </span>
                </li>
                {projectRemaining !== null && (
                  <li className="flex items-start gap-2">
                    <CheckMark ok={budgetOk} />
                    <span className={budgetOk ? "" : "text-[#BE123C]"}>
                      งบโครงการหลังคำขอนี้{" "}
                      <b className="money">{baht(projectRemaining)}</b>
                    </span>
                  </li>
                )}
              </ul>

              {/* TailGrids Checkbox · ข้อความใช้ label htmlFor (ห้ามครอบ Checkbox ด้วย label → คลิกแล้วติ๊ก 2 รอบ) */}
              <div className="mt-5 flex items-start gap-2.5 text-sm">
                <Checkbox
                  id="review-checked"
                  size="md"
                  className="mt-0.5"
                  checked={checked}
                  onChange={(e) => {
                    setChecked(e.target.checked);
                    setError("");
                  }}
                />
                <label htmlFor="review-checked" className="cursor-pointer">
                  ตรวจเอกสารและยอดเงินครบแล้ว
                </label>
              </div>

              <label htmlFor="comment" className="mb-1.5 mt-4 block text-sm font-semibold">
                ความเห็น <span className="font-normal text-[#94A3B8]">ไม่บังคับ</span>
              </label>
              <TextArea
                id="comment"
                rows={3}
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  setError("");
                }}
                placeholder="ถึงผู้ขอหรือขั้นถัดไป"
                className="resize-y text-sm"
              />

              {error && (
                <p role="alert" className="mt-3 text-sm font-semibold text-[#BE123C]">
                  {error}
                </p>
              )}

              {/* TailGrids Button: อนุมัติ = primary (เขียวทึบ) · ตีกลับ = danger outline (รองลงมา) */}
              <Button variant="primary" size="lg" className="mt-4 w-full font-bold" onPress={approve}>
                <Check aria-hidden="true" /> อนุมัติคำขอ
              </Button>
              <Button variant="danger" appearance="outline" className="mt-2 w-full" onPress={openReject}>
                <ArrowRight className="rotate-180" aria-hidden="true" /> ตีกลับให้แก้ไข
              </Button>
            </section>
          )}

          {/* สถานะคำขอ: ลำดับขั้นจริง */}
          <Card>
            <h2 className="mb-5 text-lg font-bold">สถานะคำขอ</h2>
            <ol>
              {timeline.map((s, i) => {
                const color =
                  s.status === "rejected"
                    ? "text-[#BE123C]"
                    : s.status === "current"
                      ? "text-[#047857]"
                      : s.status === "pending"
                        ? "text-[#64748B]"
                        : "text-[#0F172A]";
                return (
                  <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < timeline.length - 1 && (
                      <span className="absolute left-[9.5px] top-5 h-full w-px bg-[#E2E8F0]" aria-hidden="true" />
                    )}
                    <Dot status={s.status} />
                    <div className="-mt-0.5 min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${color}`}>{s.title}</p>
                      <p className="text-xs text-[#64748B]">{s.meta}</p>
                      {s.note && (
                        <p
                          className={`mt-2 rounded-lg px-3 py-2 text-xs ${
                            s.status === "rejected"
                              ? "bg-[#FFF1F2] text-[#9F1239]"
                              : "bg-[#F1F5F9] text-[#475569]"
                          }`}
                        >
                          {s.note}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>

          {/* ประวัติการดำเนินการ (ใหม่ → เก่า) */}
          {r.history.length > 0 && (
            <Card>
              <h2 className="mb-4 text-lg font-bold">ประวัติ</h2>
              <ul className="space-y-3">
                {[...r.history].reverse().map((h, i) => (
                  <li key={i} className="text-xs">
                    <p className="font-semibold text-[#334155]">{h.action}</p>
                    <p className="text-[#64748B]">
                      {h.by}, {thaiDateTime(h.at)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* ===== ป๊อบอัพตีกลับคำขอ: TailGrids Dialog ===== */}
      {/* ModalOverlay = พื้นหลังมืด · Dialog ข้างในใช้ overlay นี้แทนของตัวเอง */}
      <ModalOverlay
        isOpen={showReject}
        onOpenChange={setShowReject}
        isDismissable
        className="fixed inset-0 z-50 bg-[#0F172A]/40"
      >
        <Dialog className="max-w-md">
          <DialogHeader>
            <DialogTitle>ตีกลับคำขอ</DialogTitle>
            <DialogDescription>{requesterName} จะได้รับแจ้งเตือน แล้วแก้ไขส่งใหม่ได้</DialogDescription>
          </DialogHeader>

          <DialogBody className="text-[#0F172A]">
            <div className="rounded-xl bg-[#F8FAFC] p-3">
              <p className="truncate text-sm font-semibold">{r.title}</p>
              <p className="money text-xs text-[#64748B]">
                {baht(r.total)}, ส่งเมื่อ {thaiDateTime(r.createdAt)}
              </p>
            </div>

            <p id="reject-reason-label" className="mb-2 mt-5 text-sm font-semibold">
              เหตุผลที่ตีกลับ
            </p>
            <div role="group" aria-labelledby="reject-reason-label" className="flex flex-wrap gap-2">
              {REJECT_REASONS.map((reason) => {
                const active = rejectReason === reason;
                return (
                  <button
                    key={reason}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setRejectReason(reason);
                      setRejectError("");
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                      active
                        ? "border-[#FDA4AF] bg-[#FFF1F2] text-[#BE123C]"
                        : "border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>

            <label htmlFor="reject-comment" className="mb-1.5 mt-4 block text-sm font-semibold">
              สิ่งที่ผู้ขอต้องแก้{" "}
              <span className="font-normal text-[#94A3B8]">
                {rejectReason === "อื่นๆ" ? "จำเป็นเมื่อเลือกอื่นๆ" : "ไม่บังคับ"}
              </span>
            </label>
            <div className="relative">
              <TextArea
                id="reject-comment"
                rows={4}
                maxLength={REJECT_COMMENT_MAX}
                value={rejectComment}
                onChange={(e) => {
                  setRejectComment(e.target.value);
                  setRejectError("");
                }}
                placeholder="เช่น ใบเสร็จรายการที่ 2 ไม่ชัด ขอไฟล์ใหม่"
                className="resize-none pb-8 text-sm"
              />
              <span className="money absolute bottom-2.5 right-3 text-xs text-[#94A3B8]" aria-hidden="true">
                {rejectComment.length}/{REJECT_COMMENT_MAX}
              </span>
            </div>

            {rejectError && (
              <p role="alert" className="mt-3 text-sm font-semibold text-[#BE123C]">
                {rejectError}
              </p>
            )}
          </DialogBody>

          <DialogFooter>
            <Button variant="primary" appearance="outline" onPress={closeReject}>
              ยกเลิก
            </Button>
            <Button variant="danger" className="font-bold" onPress={confirmReject}>
              ตีกลับคำขอ
            </Button>
          </DialogFooter>
        </Dialog>
      </ModalOverlay>
    </div>
  );
}

// ✓ / ! สำหรับรายการตรวจอัตโนมัติในกล่องตัดสินใจ
function CheckMark({ ok }: { ok: boolean }) {
  return (
    <span
      aria-label={ok ? "ผ่าน" : "ต้องตรวจ"}
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        ok ? "bg-[#ECFDF5] text-[#047857]" : "bg-[#FFF1F2] text-[#BE123C]"
      }`}
    >
      {ok ? <Check className="h-3 w-3" /> : "!"}
    </span>
  );
}


// useSearchParams ต้องอยู่ใน Suspense ไม่งั้น build ของ Next.js จะ error
export default function ApprovedDH() {
  return (
    <Suspense fallback={null}>
      <ReviewContent />
    </Suspense>
  );
}