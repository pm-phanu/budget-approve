"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, CheckCircle1 } from "@tailgrids/icons";
import { addRequestsToBudget } from "@/data/budget";
import { loadRequests, type SavedRequest, type SavedStep } from "@/data/request";
import { actOnRequest, canApproveStep } from "@/data/approval";
import { getCurrentUser } from "@/utils/login";
import type { Credential } from "@/data/credential";

/* ------------------------------------------------------------------
   ตั้งค่า
------------------------------------------------------------------- */
const HOME_PATH = "/home-director";

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
  return d.toLocaleDateString("th-TH", {
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
    d.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) +
    " " +
    d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) +
    " น."
  );
}

/* ------------------------------------------------------------------
   ไอคอนที่ไม่แน่ใจชื่อใน @tailgrids/icons จึงเขียนเป็น SVG เอง
------------------------------------------------------------------- */
type IconProps = React.SVGProps<SVGSVGElement>;
const svgBase = (p: IconProps) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});
const CloseIcon = (p: IconProps) => (
  <svg {...svgBase(p)}>
    <path d="m5 5 10 10M15 5 5 15" />
  </svg>
);
const EyeIcon = (p: IconProps) => (
  <svg {...svgBase(p)}>
    <path d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10Z" />
    <circle cx="10" cy="10" r="2.5" />
  </svg>
);
const FileIcon = (p: IconProps) => (
  <svg {...svgBase(p)}>
    <path d="M11.5 2.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 17.5h8a1.5 1.5 0 0 0 1.5-1.5V6.5l-4-4Z" />
    <path d="M11.5 2.5v4h4" />
  </svg>
);
const InfoIcon = (p: IconProps) => (
  <svg {...svgBase(p)}>
    <circle cx="10" cy="10" r="7.5" />
    <path d="M10 9v4.5M10 6.5v.01" />
  </svg>
);

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
    done: "bg-emerald-600 text-white",
    rejected: "border-2 border-red-500 bg-white text-red-500",
    current: "border-2 border-dashed border-emerald-500 bg-white",
    pending: "border border-slate-200 bg-white",
  };
  return (
    <span
      className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${styles[status]}`}
    >
      {status === "done" && <Check className="h-3 w-3" />}
      {status === "rejected" && <CloseIcon className="h-3 w-3" />}
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

  // กด Esc เพื่อปิดป๊อบอัพ (ต้องอยู่ก่อน return ด้านล่าง)
  useEffect(() => {
    if (!showReject) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowReject(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showReject]);

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

  // ไฟล์ทั้งหมด (แนบรายแถว → รวมเป็นลิสต์เดียว พร้อมบอกว่ามาจากรายการไหน)
  const allFiles = r.items.flatMap((it) =>
    it.files.map((f) => ({ file: f, from: it.name })),
  );

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

  // "รอคุณอนุมัติ" เฉพาะคนที่กดอนุมัติขั้นนี้ได้จริง · คนอื่น (เช่น ผู้ขอดูของตัวเอง) = "รอ<ชื่อขั้น>"
  const waitingStep = r.approvalSteps[r.currentStep];
  const badge =
    r.status === "จ่ายแล้ว"
      ? { text: "จ่ายแล้ว", cls: "bg-emerald-100 text-emerald-700" }
      : r.status === "อนุมัติแล้ว"
      ? { text: "อนุมัติแล้ว", cls: "bg-emerald-100 text-emerald-700" }
      : r.status === "ตีกลับ"
        ? { text: "ตีกลับแล้ว", cls: "bg-red-100 text-red-600" }
        : r.status === "ร่าง"
          ? { text: "ร่าง", cls: "bg-slate-200 text-slate-600" }
          : canAct
            ? { text: "รอคุณอนุมัติ", cls: "bg-amber-100 text-amber-700" }
            : {
                text: waitingStep ? `รอ${waitingStep.label}` : "กำลังดำเนินการ",
                cls: "bg-amber-100 text-amber-700",
              };

  return (
    <div className="font-sans text-slate-800">
      <div>
        {/* Header */}
        <header className="mb-9">
          {/* breadcrumb (แดชบอร์ด / รหัสคำขอ) ย้ายไปอยู่บน header ของ layout แล้ว */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[32px] font-bold text-[#111]">{r.title}</h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${badge.cls}`}
            >
              {badge.text}
            </span>
          </div>
        </header>

        {notice && (
          <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
            {notice}
          </div>
        )}

        <div className="grid grid-cols-4 gap-5">
          {/* ===== ซ้าย ===== */}
          <div className="col-span-3 flex flex-col gap-5">
            {/* ข้อมูลคำขอ */}
            <Card>
              <h2 className="mb-5 text-lg font-bold text-slate-900">
                ข้อมูลคำขอ
              </h2>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-xs text-slate-500">ผู้ขอเบิก</p>
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
                        {requesterName.slice(0, 2)}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {requesterName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {r.requester
                            ? `${r.requester.department} · ${r.requester.lineOfWork}`
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-slate-500">โครงการ</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {r.project ? `${r.project.dept} › ${r.project.name}` : "-"}
                    </p>
                    {projectRemaining !== null && (
                      <p className="text-xs text-slate-400">
                        งบโครงการคงเหลือ{" "}
                        <span className="font-semibold text-emerald-600">
                          {baht(projectRemaining)}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <p className="mb-1 text-xs text-slate-500">
                      ยอดเงินที่ขอเบิก
                    </p>
                    <p className="text-4xl font-bold text-slate-900">
                      {baht(r.total)}
                    </p>
                    <p className="text-xs text-slate-400">
                      <span className="font-semibold text-slate-600">
                        {r.typeLabel}
                      </span>{" "}
                      · วันที่ใช้จ่าย {thaiDate(r.useDate)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-slate-500">การโอนเงิน</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {r.payTo}
                    </p>
                    {r.bankAccount && (
                      <p className="text-xs text-slate-400">{r.bankAccount}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="mb-1 text-xs text-slate-500">เหตุผลการเบิก</p>
                <p className="text-sm text-slate-600">{r.reason || "-"}</p>
              </div>
            </Card>

            {/* รายการค่าใช้จ่าย + เอกสารแนบ */}
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  รายการค่าใช้จ่าย
                </h2>
                <span className="text-sm text-slate-500">
                  {r.items.length} รายการ
                </span>
              </div>

              <ul className="divide-y divide-slate-100">
                {r.items.map((it, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-4 py-4 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="text-slate-800">{it.name || "-"}</p>
                      <p className="text-xs text-slate-400">
                        {it.categoryName || "-"} · แนบ {it.files.length} ไฟล์
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-800">
                      {baht(it.amount)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-4">
                <span className="text-base font-bold text-slate-900">
                  รวมทั้งหมด
                </span>
                <span className="text-xl font-bold text-emerald-600">
                  {baht(r.total)}
                </span>
              </div>

              <h3 className="mb-3 mt-8 text-base font-bold text-slate-900">
                เอกสารแนบ{" "}
                <span className="text-sm font-normal text-slate-400">
                  ({allFiles.length} ไฟล์)
                </span>
              </h3>
              {allFiles.length === 0 ? (
                <p className="text-sm text-slate-400">ไม่มีเอกสารแนบ</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {allFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-500">
                        <FileIcon />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {f.file}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {f.from}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="ดูเอกสาร"
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <EyeIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ===== ขวา ===== */}
          <div className="col-span-1 flex flex-col gap-5 self-start">
            {/* สถานะคำขอ */}
            <Card>
              <h2 className="mb-5 text-lg font-bold text-slate-900">
                สถานะคำขอ
              </h2>
              <ol>
                {timeline.map((s, i) => {
                  const color =
                    s.status === "rejected"
                      ? "text-red-600"
                      : s.status === "current"
                        ? "text-emerald-700"
                        : "text-slate-900";
                  return (
                    <li key={i} className="relative flex gap-3 pb-5">
                      {i < timeline.length - 1 && (
                        <span className="absolute left-[9.5px] top-5 h-full w-px bg-slate-200" />
                      )}
                      <Dot status={s.status} />
                      <div className="-mt-0.5 min-w-0 flex-1">
                        <p className={`text-xs font-semibold ${color}`}>
                          {s.title}
                        </p>
                        <p className="text-[11px] text-slate-400">{s.meta}</p>
                        {s.note && (
                          <p
                            className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
                              s.status === "rejected"
                                ? "border-red-100 bg-red-50 text-red-600"
                                : "border-slate-200 bg-slate-50 text-slate-600"
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

            {/* การอนุมัติของคุณ */}
            {canAct && (
              <Card>
                <h2 className="mb-4 text-lg font-bold text-slate-900">
                  การอนุมัติของคุณ
                </h2>

                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                  <CheckCircle1 className="h-5 w-5 shrink-0" />
                  <span>
                    ขั้นที่รอดำเนินการ:{" "}
                    <b className="font-bold">{curStep.label}</b>
                  </span>
                </div>

                <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md ${
                      checked
                        ? "bg-emerald-600 text-white"
                        : "border border-slate-300 bg-white"
                    }`}
                  >
                    {checked && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => {
                      setChecked(e.target.checked);
                      setError("");
                    }}
                  />
                  ตรวจเอกสารและยอดเงินครบแล้ว
                </label>

                <div className="mt-4">
                  <label
                    htmlFor="comment"
                    className="mb-1.5 block text-xs text-slate-500"
                  >
                    ความเห็น (ไม่บังคับ)
                  </label>
                  <textarea
                    id="comment"
                    rows={3}
                    value={comment}
                    onChange={(e) => {
                      setComment(e.target.value);
                      setError("");
                    }}
                    placeholder="เพิ่มความเห็นถึงผู้ขอหรือขั้นถัดไป..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {error && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={approve}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white transition hover:bg-emerald-700"
                >
                  <Check /> อนุมัติคำขอ
                </button>
                <button
                  type="button"
                  onClick={openReject}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3.5 text-base font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  <ArrowRight className="rotate-180" /> ตีกลับให้แก้ไข
                </button>
              </Card>
            )}

            {/* ประวัติการดำเนินการ */}
            {r.history.length > 0 && (
              <Card>
                <h2 className="mb-4 text-lg font-bold text-slate-900">
                  ประวัติ
                </h2>
                <ul className="space-y-3">
                  {[...r.history].reverse().map((h, i) => (
                    <li key={i} className="text-xs">
                      <p className="font-semibold text-slate-800">{h.action}</p>
                      <p className="text-slate-400">
                        {h.by} · {thaiDateTime(h.at)}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* ===== ป๊อบอัพตีกลับคำขอ ===== */}
      {showReject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeReject}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="ตีกลับคำขอ"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* หัวข้อ */}
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-500">
                <ArrowRight className="rotate-180" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  ตีกลับคำขอ
                </h2>
                <p className="text-xs text-slate-500">
                  ผู้ขอจะได้รับแจ้งเตือน และแก้ไขแล้วส่งใหม่ได้
                </p>
              </div>
            </div>

            {/* สรุปคำขอ */}
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                {requesterName.slice(0, 2)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {r.title}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {requesterName} · ส่งเมื่อ {thaiDateTime(r.createdAt)}
                </p>
              </div>
            </div>

            {/* เหตุผลที่ตีกลับ */}
            <p className="mb-2 mt-5 text-sm font-semibold text-slate-800">
              เหตุผลที่ตีกลับ <span className="text-red-500">*</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {REJECT_REASONS.map((reason) => {
                const active = rejectReason === reason;
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      setRejectReason(reason);
                      setRejectError("");
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "border-red-200 bg-red-100 text-red-600"
                        : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>

            {/* ความเห็น */}
            <div className="relative mt-3">
              <textarea
                rows={4}
                maxLength={REJECT_COMMENT_MAX}
                value={rejectComment}
                onChange={(e) => {
                  setRejectComment(e.target.value);
                  setRejectError("");
                }}
                placeholder="อธิบายสิ่งที่ผู้ขอต้องแก้ไข..."
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 pb-7 text-sm outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
              />
              <span className="absolute bottom-2.5 right-3 text-xs text-slate-400">
                {rejectComment.length}/{REJECT_COMMENT_MAX}
              </span>
            </div>

            {/* ข้อความแจ้ง / error */}
            {rejectError ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {rejectError}
              </p>
            ) : (
              <p className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500">
                <InfoIcon className="h-4 w-4 shrink-0" />
                ต้องระบุเหตุผลก่อนจึงตีกลับได้
              </p>
            )}

            {/* ปุ่ม */}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={closeReject}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmReject}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600"
              >
                <ArrowRight className="h-4 w-4 rotate-180" /> ตีกลับคำขอ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
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