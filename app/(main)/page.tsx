"use client";

import {
  Plus,
  Wallet2,
  ClockThree,
  CheckCircle1,
  ArrowRight,
  Check,
} from "@tailgrids/icons";
import { Link } from "@/components/tailgrids/core/link";
import NextLink from "next/link";
import { Fragment, useEffect, useState } from "react";
import { getCurrentUser } from "@/utils/login";
import type { Credential } from "@/data/credential";
import { loadRequests, type SavedRequest } from "@/data/request";
import { getDepartmentBudget } from "@/data/budget";

/* ------------------------------------------------------------------
   ตั้งค่า
------------------------------------------------------------------- */
const MY_REQUEST_PATH = "/my-request"; // ปุ่ม "ดูทั้งหมด"
const MY_REQUEST_LIMIT = 5; // แสดงคำขอล่าสุดกี่รายการ

/* ------------------------------------------------------------------
   ฟังก์ชันช่วย
------------------------------------------------------------------- */
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

export default function Home() {
  const [me, setMe] = useState<Credential | null>(null);
  const [requests, setRequests] = useState<SavedRequest[]>([]);
  // ปีปัจจุบัน: ตั้งค่าใน useEffect (เลี่ยง new Date() ตอน prerender)
  const [year, setYear] = useState<number | null>(null);

  // localStorage อ่านได้เฉพาะฝั่ง browser จึงต้องโหลดใน useEffect
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- อ่านได้หลังเปิดหน้าเท่านั้น */
    setMe(getCurrentUser());
    try {
      setRequests(loadRequests());
    } catch {
      setRequests([]);
    }
    setYear(new Date().getFullYear());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // คำขอของฉัน (ผู้ขอ = คนที่ login)
  const mine = me
    ? requests.filter((r) => r.requester && String(r.requester.id) === String(me.id))
    : [];

  // การ์ด: กำลังดำเนินการ / อนุมัติแล้วปีนี้
  const inProgress = mine.filter((r) => r.status === "รออนุมัติ").length;
  const approvedThisYear = mine
    .filter(
      (r) =>
        (r.status === "อนุมัติแล้ว" || r.status === "จ่ายแล้ว") &&
        year !== null &&
        new Date(r.createdAt).getFullYear() === year,
    )
    .reduce((sum, r) => sum + r.total, 0);

  // การ์ด: งบแผนกคงเหลือ
  // งบของแผนกผู้ใช้ (data/budget.ts) · คำนวณหลังรู้ว่าใคร login (me) เท่านั้น
  // เพราะ getDepartmentBudget อ่าน localStorage ซึ่งไม่มีตอน render ฝั่งเซิร์ฟเวอร์
  const budget = me
    ? getDepartmentBudget(me.departmentId, requests, year ?? undefined)
    : { limit: 0, used: 0, remaining: 0 };
  const remaining = budget.remaining;
  const usedPct = budget.limit > 0 ? Math.round((budget.used / budget.limit) * 100) : 0;

  // คำขอล่าสุด 5 รายการ (ใหม่สุดอยู่บน)
  const latest = [...mine]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MY_REQUEST_LIMIT);

  return (
    <div>
      <div>
        <header className="mb-9">
          <h1 className="text-[32px] font-bold text-[#0F172A]">
            สวัสดี {me ? me.fullName : "-"}
          </h1>
        </header>

        {/* <main> มีอยู่แล้วใน layout → ตรงนี้ใช้ div */}
        <div className="flex flex-col gap-9">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {/* การ์ดหลักของหน้า: งบแผนกคงเหลือ */}
            <section
              aria-labelledby="budget-title"
              className="rounded-xl bg-[linear-gradient(160deg,#0F172A_0%,#0F172A_55%,#0C3136_70%,#047857_100%)] p-6 text-white shadow-2xl md:col-span-2"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 id="budget-title" className="flex items-center gap-2 text-lg font-semibold">
                  <Wallet2 size={24} className="text-[#34D399]" aria-hidden="true" />
                  งบแผนกคงเหลือ
                </h2>
                <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-sm">
                  ปี {year !== null ? year + 543 : "-"}
                </span>
              </div>
              <p className="money mt-2 text-[clamp(2.5rem,4.5vw,4rem)] font-bold leading-tight">
                ฿{money(remaining)}
              </p>
              <div className="mt-3 flex items-center justify-between text-sm text-[#CBD5E1]">
                <span>
                  จากงบทั้งปี <span className="money">฿{money(budget.limit)}</span>
                </span>
                <span>ใช้ไปแล้ว {usedPct}%</span>
              </div>
              {/* หลอด: ความยาวสีเขียว = % ที่ใช้ไปแล้ว */}
              <div
                className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15"
                role="img"
                aria-label={`ใช้งบไปแล้ว ${usedPct}%`}
              >
                <div
                  className={`h-full rounded-full ${usedPct > 90 ? "bg-[#FB7185]" : "bg-[#34D399]"}`}
                  style={{ width: `${Math.min(usedPct, 100)}%` }}
                />
              </div>
            </section>

            {/* ตัวเลขสรุป: ตัวเลขเด่น ป้ายเล็ก */}
            <StatCard
              icon={<ClockThree size={20} aria-hidden="true" />}
              tone="amber"
              label="กำลังดำเนินการ"
              value={`${inProgress} รายการ`}
              href={MY_REQUEST_PATH}
            />
            <StatCard
              icon={<CheckCircle1 size={20} aria-hidden="true" />}
              tone="emerald"
              label="อนุมัติแล้วปีนี้"
              value={`฿${money(approvedThisYear)}`}
            />
          </div>

          {/* คำขอของฉัน 2 คอลัมน์ / แจ้งเตือนล่าสุด 2 คอลัมน์ */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
            {/* self-start: สูงตามจำนวนรายการ (มากสุด MY_REQUEST_LIMIT) ไม่ยืดตามการ์ดข้างๆ */}
            <section
              aria-labelledby="my-requests-title"
              className="self-start rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl xl:col-span-2"
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

            {/* แจ้งเตือนล่าสุด (ข้อมูลตัวอย่าง) */}
            <div className="flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl xl:col-span-2">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-800">แจ้งเตือนล่าสุด</h2>
                  <Link href="#" className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">
                    ดูทั้งหมด →
                  </Link>
                </div>

                <ul className="divide-y divide-gray-100">
                  {/* แจ้งเตือนที่ 1: ได้รับเงินแล้ว */}
                  <li className="flex items-start gap-3 py-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <Check size={18} />
                    </span>
                    <div className="text-sm text-gray-700">
                      <p>
                        คำขอ <strong className="text-gray-900">ค่าอบรมทีมการตลาด</strong> ได้รับเงินแล้ว
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">วันนี้ 09.00 น.</p>
                    </div>
                  </li>

                  {/* แจ้งเตือนที่ 2: รอขั้นถัดไป */}
                  <li className="flex items-start gap-3 py-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <ClockThree size={18} />
                    </span>
                    <div className="text-sm text-gray-700">
                      <p>
                        <strong className="text-gray-900">ซื้อหมึกพิมพ์สำนักงาน</strong> หัวหน้าแผนกอนุมัติแล้ว รอฝ่ายบัญชีตรวจ
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">12 ต.ค. 10:15</p>
                    </div>
                  </li>

                  {/* แจ้งเตือนที่ 3: ได้รับเงินแล้ว */}
                  <li className="flex items-start gap-3 py-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <Check size={18} />
                    </span>
                    <div className="text-sm text-gray-700">
                      <p>
                        คำขอ <strong className="text-gray-900">ค่าอบรมทีมการตลาด</strong> ได้รับเงินแล้ว
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">วันนี้ 09.00 น.</p>
                    </div>
                  </li>

                  {/* แจ้งเตือนที่ 4: ได้รับเงินแล้ว */}
                  <li className="flex items-start gap-3 py-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <Check size={18} />
                    </span>
                    <div className="text-sm text-gray-700">
                      <p>
                        คำขอ <strong className="text-gray-900">ค่าอบรมทีมการตลาด</strong> ได้รับเงินแล้ว
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">วันนี้ 09.00 น.</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-gray-200/60 bg-gray-50 p-3.5 text-xs text-gray-500">
                <span>✓</span>
                <span>ระบบจะแจ้งเตือนทุกครั้งที่สถานะคำขอเปลี่ยน</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// การ์ดตัวเลขสรุป: ป้ายเล็กด้านบน ตัวเลขใหญ่ด้านล่าง · มี href = กดไปดูรายการได้
function StatCard({
  icon,
  tone,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  tone: "amber" | "emerald";
  label: string;
  value: string;
  href?: string;
}) {
  const toneCls = tone === "amber" ? "bg-[#FEF3C7] text-[#B45309]" : "bg-[#D1FAE5] text-[#047857]";
  const body = (
    <>
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneCls}`}>{icon}</span>
      <p className="mt-4 text-sm text-[#64748B]">{label}</p>
      <p className="money mt-0.5 text-3xl font-bold text-[#0F172A]">{value}</p>
    </>
  );
  const cls = "flex flex-col rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl";
  return href ? (
    <NextLink href={href} className={`${cls} hover:border-[#A7F3D0]`}>
      {body}
    </NextLink>
  ) : (
    <div className={cls}>{body}</div>
  );
}
