"use client";

import {
  Search1,
  Bell1,
  Plus,
  Wallet2,
  ClockThree,
  CheckCircle1,
  ArrowRight,
  InfoCircle,
  Check,
} from "@tailgrids/icons";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Link } from "@/components/tailgrids/core/link";
import { Badge } from "@/components/tailgrids/core/badge";
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
function statusBadge(r: SavedRequest): {
  text: string;
  color: "warning" | "success" | "error" | "gray";
} {
  if (r.status === "ร่าง") return { text: "ร่าง", color: "gray" };
  if (r.status === "ตีกลับ") return { text: "ถูกตีกลับ", color: "error" };
  if (r.status === "อนุมัติแล้ว") return { text: "อนุมัติแล้ว", color: "success" };
  if (r.status === "จ่ายแล้ว") return { text: "จ่ายแล้ว", color: "success" };

  const cur = r.approvalSteps[r.currentStep];
  if (!cur) return { text: "รออนุมัติ", color: "warning" };
  const verb =
    cur.role === "ACCOUNTANT_ADMIN" ? "ตรวจสอบ" : cur.role === "FINANCE" ? "ทำจ่าย" : "อนุมัติ";
  return { text: `รอ${cur.label}${verb}`, color: "warning" };
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
  done: "bg-success-500 text-white",
  current: "border-2 border-dotted border-success-500 bg-white",
  rejected: "bg-red-500 text-white",
  pending: "border-2 border-slate-300 bg-white",
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
        <header className="text-[#111] flex items-center justify-between mx-auto mb-9">
          <div>
            <h1 className="text-[32px] font-bold">
              สวัสดี <span>{me ? me.fullName : "-"}</span>
            </h1>
          </div>
        </header>

        <main className="flex flex-col gap-9">
          <div className="grid grid-cols-4 gap-5">
            <div className="card shadow-2xl col-span-2 rounded-xl bg-[linear-gradient(160deg,#0F172A_0%,#0F172A_55%,#0C3136_70%,#047857_100%)]">
              <div className="p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-success-500">
                      <Wallet2 size={32} />
                    </span>
                    <h1 className="text-2xl font-bold">งบแผนกคงเหลือ</h1>
                  </div>
                  <p className="text-[14px] border border-white/20 bg-white/12 rounded-full px-2 py-1">
                    ปี {year !== null ? year + 543 : "-"}
                  </p>
                </div>
                <div className="text-[64px] font-bold">
                  <h1>
                    ฿ <span>{money(remaining)}</span>
                  </h1>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2 text-[#CBD5E1]">
                    <p>
                      จากงบทั้งปี ฿ <span>{money(budget.limit)}</span>
                    </p>
                    <p className="flex gap-1">
                      ใช้ไปแล้ว<span>{usedPct}</span>%
                    </p>
                  </div>
                  {/* หลอด: ความยาวสีเขียว = % ที่ใช้ไปแล้ว */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                    <div
                      className="h-full rounded-full bg-success-500"
                      style={{ width: `${Math.min(usedPct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="card shadow-2xl">
              <div className="h-full p-6 flex flex-col justify-between bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl">
                <div className="text-alert-warning-title flex flex-col gap-3 text-2xl font-semibold">
                  <p className="bg-[#FEF3C7] w-fit rounded-xl p-2">
                    <ClockThree size={32} />
                  </p>
                  <p>กำลังดำเนินการ</p>
                </div>
                <div>
                  <p className="flex gap-1 items-center font-bold text-2xl">
                    <span className="text-alert-warning-title">{inProgress}</span>
                    รายการ
                  </p>
                </div>
              </div>
            </div>
            <div className="card shadow-2xl">
              <div className="h-full p-6 flex flex-col justify-between bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl">
                <div className=" text-alert-success-title flex flex-col gap-3 text-2xl font-semibold">
                  <p className="bg-[#D1FAE5] w-fit rounded-xl p-2">
                    <CheckCircle1 size={32} />
                  </p>
                  <p>อนุมัติแล้วปีนี้</p>
                </div>
                <div>
                  <p className="flex gap-1 items-center font-bold text-2xl">
                    ฿<span className="text-alert-success-title">{money(approvedThisYear)}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* grid 4 คอลัมน์: คำขอของฉัน 2 คอลัมน์ / แจ้งเตือนล่าสุด 2 คอลัมน์ */}
          <div className="grid grid-cols-4 gap-5">
            {/* self-start: สูงตามจำนวนรายการ (มากสุด MY_REQUEST_LIMIT) ไม่ยืดตามการ์ดข้างๆ */}
            <div className="col-span-2 self-start bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-2xl">
              <div className="text-2xl font-bold text-black flex items-center justify-between mb-4">
                <h1>คำขอของฉัน</h1>
                <Link
                  href={MY_REQUEST_PATH}
                  className="font-bold text-alert-success-title hover:text-success-500"
                >
                  ดูทั้งหมด <ArrowRight />
                </Link>
              </div>

              {/* กรณีไม่มีข้อมูล */}
              {latest.length === 0 && (
                <div className="no-data text-xl text-center">
                  <h1>ยังไม่มีคำขอที่คุณขอ</h1>
                </div>
              )}

              {/* คำขอล่าสุด สูงสุด MY_REQUEST_LIMIT รายการ */}
              <div className="flex flex-col divide-y divide-[#E2E8F0]">
                {latest.map((r) => {
                  const badge = statusBadge(r);
                  const nodes = progressNodes(r);
                  return (
                    <div key={r.id} className="py-6 first:pt-0 last:pb-0">
                      <div className="text-2xl font-bold flex items-center justify-between mb-4">
                        <span>{r.title}</span>
                        <Badge size={"lg"} color={badge.color} className="font-semibold">
                          {badge.text}
                        </Badge>
                      </div>

                      <div className="w-full space-y-2">
                        <div className="flex items-center w-full px-3">
                          {nodes.map((n, i) => (
                            <Fragment key={i}>
                              {/* เส้นเชื่อม: เขียวเมื่อจุดถัดไปถึงคิวแล้ว */}
                              {i > 0 && (
                                <div
                                  className={`flex-1 h-0.5 ${
                                    n.state === "pending" ? "bg-slate-200" : "bg-success-500"
                                  }`}
                                ></div>
                              )}
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${NODE_STYLE[n.state]}`}
                              >
                                {n.state === "done" && <Check />}
                                {n.state === "rejected" && <span className="font-bold">!</span>}
                              </div>
                            </Fragment>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          {nodes.map((n, i) => (
                            <span key={i}>{n.label}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* แจ้งเตือนล่าสุด (ข้อมูลตัวอย่าง) */}
            <div className="col-span-2 flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
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
        </main>
      </div>
    </div>
  );
}
