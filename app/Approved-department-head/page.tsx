"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Bell1, Check, CheckCircle1, Search1 } from "@tailgrids/icons";

/* ------------------------------------------------------------------
   ตั้งค่า
------------------------------------------------------------------- */
const STORAGE_KEY = "requests";
const HOME_PATH = "/home-department-head";
const APPROVE_LIMIT = 50000; // วงเงินที่ผู้ใช้คนนี้อนุมัติได้

// ข้อมูลงบ (คัดลอกจากหน้าสร้างคำขอ ควรย้ายไปไฟล์กลาง เช่น lib/budgets.ts)
const budgets = [
  { id: 1, name: "การตลาด › สัมมนาประจำปี › ค่าเดินทาง", remaining: 42000 },
  { id: 2, name: "การตลาด › สัมมนาประจำปี › ค่าที่พัก", remaining: 22000 },
  { id: 3, name: "การตลาด › เปิดตัวสินค้า › ค่าออกแบบ", remaining: 15000 },
];

/* ------------------------------------------------------------------
   ชนิดข้อมูล (ตรงกับที่หน้าสร้างคำขอบันทึกไว้)
------------------------------------------------------------------- */
interface Item {
  name: string;
  amount: string;
}
interface ExpenseRequest {
  id: number;
  type: "advance" | "invoice";
  title: string;
  budgetId: string;
  useDate: string;
  reason: string;
  items: Item[];
  files: string[];
  total: number;
  approver: string;
  status: string; // "รออนุมัติ" | "ร่าง" | "อนุมัติแล้ว" | "ตีกลับ"
  requesterName?: string;
  createdAt?: string;
  reviewComment?: string;
  reviewedAt?: string;
}

function loadAll(): ExpenseRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function updateRequest(id: number, patch: Partial<ExpenseRequest>) {
  const all = loadAll().map((r) => (r.id === id ? { ...r, ...patch } : r));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/* ------------------------------------------------------------------
   ฟังก์ชันช่วย
------------------------------------------------------------------- */
const baht = (n: number) => "฿" + n.toLocaleString("en-US");

function thaiDate(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function thaiDateTime(iso?: string) {
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

function refNo(r: ExpenseRequest) {
  const year =
    (r.createdAt ? new Date(r.createdAt) : new Date()).getFullYear() + 543;
  return `BF-${year}-${String(r.id).padStart(4, "0")}`;
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
    className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
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

/* ------------------------------------------------------------------
   หน้าหลัก
------------------------------------------------------------------- */
function ReviewContent() {
  const router = useRouter();
  const id = Number(useSearchParams().get("id"));

  const [request, setRequest] = useState<ExpenseRequest | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [checked, setChecked] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setRequest(loadAll().find((r) => r.id === id) ?? null);
    setLoaded(true);
  }, [id]);

  if (!loaded) return null;

  if (!request) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 text-slate-500">
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
  const name = r.requesterName ?? "เนส";
  const budget = budgets.find((b) => b.id === Number(r.budgetId));
  const isPending = r.status === "รออนุมัติ";
  const overLimit = r.total > APPROVE_LIMIT;

  // ---- การกระทำ ----
  const approve = () => {
    if (!checked) {
      setError("กรุณาติ๊กยืนยันว่าตรวจเอกสารและยอดเงินครบแล้ว");
      return;
    }
    updateRequest(r.id, {
      status: "อนุมัติแล้ว",
      reviewComment: comment,
      reviewedAt: new Date().toISOString(),
    });
    router.push(HOME_PATH);
  };

  const reject = () => {
    if (!comment.trim()) {
      setError("กรุณาใส่ความเห็นเพื่อบอกเหตุผลที่ตีกลับ");
      return;
    }
    updateRequest(r.id, {
      status: "ตีกลับ",
      reviewComment: comment,
      reviewedAt: new Date().toISOString(),
    });
    router.push(HOME_PATH);
  };

  // ---- timeline สร้างจากสถานะจริง ----
  const approved = r.status === "อนุมัติแล้ว";
  const rejected = r.status === "ตีกลับ";
  const steps: {
    status: StepStatus;
    title: string;
    meta: string;
    note?: string;
  }[] = [
    {
      status: "done",
      title: "ส่งคำขอ",
      meta: `คุณ${name} ${thaiDateTime(r.createdAt)}`,
    },
    {
      status: approved ? "done" : rejected ? "rejected" : "current",
      title: approved
        ? `${r.approver}อนุมัติแล้ว`
        : rejected
          ? `${r.approver}ตีกลับ`
          : `${r.approver}อนุมัติ`,
      meta:
        approved || rejected ? thaiDateTime(r.reviewedAt) : "รอคุณดำเนินการ",
      note: rejected && r.reviewComment ? `“${r.reviewComment}”` : undefined,
    },
    {
      status: approved ? "current" : "pending",
      title: "ฝ่ายบัญชีตรวจและจ่ายเงิน",
      meta: approved ? "รอฝ่ายบัญชีดำเนินการ" : "รอขั้นถัดไป",
    },
  ];

  const statusBadge = approved
    ? { text: "อนุมัติแล้ว", cls: "bg-emerald-100 text-emerald-700" }
    : rejected
      ? { text: "ตีกลับแล้ว", cls: "bg-red-100 text-red-600" }
      : { text: "รอคุณอนุมัติ", cls: "bg-amber-100 text-amber-700" };

  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans text-slate-800">
      <div className="mx-auto max-w-[1200px]">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <nav className="flex items-center gap-1 text-sm text-slate-500">
              <ArrowRight className="h-4 w-4 rotate-180" />
              <Link href={HOME_PATH} className="hover:underline">
                รอตรวจจ่ายเงิน
              </Link>
              <span>/</span>
              <span className="font-semibold text-emerald-700">
                {refNo(r)}
              </span>
            </nav>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">{r.title}</h1>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadge.cls}`}
              >
                {statusBadge.text}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex w-72 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-400 focus-within:ring-2 focus-within:ring-emerald-500/30">
              <Search1 />
              <input
                type="text"
                placeholder="ค้นหาคำขอ..."
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>
            <button
              type="button"
              aria-label="การแจ้งเตือน"
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              <Bell1 />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* ===== ซ้าย ===== */}
          <div className="space-y-6">
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
                        {name.slice(0, 2)}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">
                          คุณ{name}
                        </p>
                        <p className="text-xs text-slate-400">
                          พนักงาน · การตลาด
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-slate-500">งบที่ใช้</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {budget?.name ?? "-"}
                    </p>
                    {budget && (
                      <p className="text-xs text-slate-400">
                        คงเหลือหลังจ่าย{" "}
                        <span className="font-semibold text-emerald-600">
                          {baht(budget.remaining - r.total)}
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
                        {r.type === "advance"
                          ? "สำรองจ่าย"
                          : "จ่ายตามใบแจ้งหนี้"}
                      </span>{" "}
                      · วันที่ใช้จ่าย {thaiDate(r.useDate)}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-slate-500">การโอนเงิน</p>
                    <p className="text-sm font-semibold text-slate-900">
                      โอนทันทีเมื่อฝ่ายบัญชีอนุมัติ
                    </p>
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
                    className="flex items-center justify-between py-4 text-sm"
                  >
                    <span className="text-slate-800">{it.name || "-"}</span>
                    <span className="font-semibold tabular-nums text-slate-800">
                      {baht(Number(it.amount || 0))}
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
                เอกสารแนบ
              </h3>
              {r.files.length === 0 ? (
                <p className="text-sm text-slate-400">ไม่มีเอกสารแนบ</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {r.files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-500">
                        <FileIcon />
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                        {f}
                      </p>
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
          <div className="space-y-6 self-start">
            {/* สถานะคำขอ */}
            <Card>
              <h2 className="mb-5 text-lg font-bold text-slate-900">
                สถานะคำขอ
              </h2>
              <ol>
                {steps.map((s, i) => {
                  const color =
                    s.status === "rejected"
                      ? "text-red-600"
                      : s.status === "current"
                        ? "text-emerald-700"
                        : "text-slate-900";
                  return (
                    <li key={s.title} className="relative flex gap-3 pb-5">
                      {i < steps.length - 1 && (
                        <span className="absolute left-[9.5px] top-5 h-full w-px bg-slate-200" />
                      )}
                      <Dot status={s.status} />
                      <div className="-mt-0.5 min-w-0 flex-1">
                        <p className={`text-xs font-semibold ${color}`}>
                          {s.title}
                        </p>
                        <p className="text-[11px] text-slate-400">{s.meta}</p>
                        {s.note && (
                          <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                            {s.note}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>

            {/* การอนุมัติของคุณ (แสดงเมื่อยังรออนุมัติเท่านั้น) */}
            {isPending && (
              <Card>
                <h2 className="mb-4 text-lg font-bold text-slate-900">
                  การอนุมัติของคุณ
                </h2>

                <div
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${
                    overLimit
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <CheckCircle1 className="h-5 w-5 shrink-0" />
                  <span>
                    {overLimit
                      ? "ยอดเกินวงเงินที่คุณอนุมัติได้ "
                      : "คุณมีสิทธิ์อนุมัติ วงเงินไม่เกิน "}
                    <b className="font-bold">{baht(APPROVE_LIMIT)}</b>
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
                    ความเห็น (ไม่บังคับ เว้นแต่ตีกลับ)
                  </label>
                  <textarea
                    id="comment"
                    rows={3}
                    value={comment}
                    onChange={(e) => {
                      setComment(e.target.value);
                      setError("");
                    }}
                    placeholder="เพิ่มความเห็นถึงผู้ขอหรือฝ่ายบัญชี..."
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
                  disabled={overLimit}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check /> อนุมัติคำขอ
                </button>
                <button
                  type="button"
                  onClick={reject}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-3.5 text-base font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  <ArrowRight className="rotate-180" /> ตีกลับให้แก้ไข
                </button>
              </Card>
            )}
          </div>
        </div>
      </div>
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