"use client";

// ════════════════════════════════════════════════════════════
//  แดชบอร์ดการเงิน (/home-finance)
//  ภาพรวม: ยอดรอทำจ่าย + จ่ายแล้ววันนี้/เดือนนี้ → คิวที่ต้องทำก่อน (5 รายการ) → คำขอของฉัน
//  รายการเต็มอยู่ที่ "คำขอทำจ่าย" (/pay-request) · ที่ทำไปแล้วอยู่ "ประวัติการทำจ่าย" (/pay-history)
// ════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import { REQUESTS_KEY, loadRequests, type SavedRequest } from "@/data/request";
import { getCurrentUser } from "@/utils/login";
import { bkkDay, bkkMonth } from "@/utils/date";
import type { Credential } from "@/data/credential";
import MyRequestsCard from "@/components/my-requests-card";
import { HeroCard } from "@/components/budget-card";
import { DUE_DAYS, PayQueueTable, baht, getPayQueue, paidAt, waitingDays } from "@/components/pay-queue";
import { ArrowRight, Bank1, CheckCircle1, ClockThree } from "@tailgrids/icons";

const QUEUE_LIMIT = 5;

export default function FinancePage() {
  const [me, setMe] = useState<Credential | null>(null);
  const [all, setAll] = useState<SavedRequest[]>([]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- อ่าน localStorage ได้หลังเปิดหน้าเท่านั้น */
    setMe(getCurrentUser());
    setAll(loadRequests());
    /* eslint-enable react-hooks/set-state-in-effect */
    const onStorage = (e: StorageEvent) => {
      if (e.key === REQUESTS_KEY) setAll(loadRequests());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const pending = getPayQueue(all, me);
  const pendingTotal = pending.reduce((s, r) => s + r.total, 0);
  const overdue = pending.filter((r) => waitingDays(r) > DUE_DAYS).length;

  // วัน/เดือนตามเวลาไทย (utils/date.ts) ไม่ขึ้นกับ Time Zone ของเครื่อง
  const paid = all.filter((r) => r.status === "จ่ายแล้ว");
  const today = bkkDay();
  const thisMonth = bkkMonth();
  const paidToday = paid.filter((r) => bkkDay(paidAt(r)) === today);
  const paidMonth = paid.filter((r) => bkkMonth(paidAt(r)) === thisMonth);
  const sum = (list: SavedRequest[]) => list.reduce((s, r) => s + r.total, 0);

  const mine = me ? all.filter((r) => r.requester && String(r.requester.id) === String(me.id)) : [];

  const todayLabel = new Date().toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="text-[#0F172A]">
      <header className="mb-9">
        <h1 className="text-[32px] font-bold">สวัสดี {me ? me.fullName : "-"}</h1>
        <p className="mt-3 text-sm text-[#64748B]">
          {todayLabel} · คำขอรอคุณทำจ่าย{" "}
          <span className="font-semibold text-[#047857]">{pending.length} รายการ</span>
        </p>
      </header>

      <div className="flex flex-col gap-9">
        {/* การ์ดสรุป: การ์ดหลักแบบเดียวกับการ์ดงบของหัวหน้า + ตัวเลข 2 ใบ */}
        <div className="grid grid-cols-4 gap-5">
          <HeroCard
            className="col-span-2 justify-between"
            label="ยอดรอทำจ่าย"
            icon={<Bank1 className="h-5 w-5 text-emerald-300" aria-hidden="true" />}
          >
            <p className="money text-3xl font-bold tracking-tight">{baht(pendingTotal)}</p>
            <p className="mt-1 text-xs text-emerald-300/80">
              {pending.length} รายการ · โอนภายใน {DUE_DAYS} วันทำการหลังบัญชีตรวจ
            </p>
            <p className="mt-auto pt-3 text-xs">
              {overdue > 0 ? (
                <span className="rounded-full bg-rose-500/90 px-2.5 py-1 font-semibold text-white">
                  เลยกำหนด {overdue} รายการ
                </span>
              ) : (
                <span className="text-emerald-200">ไม่มีรายการเลยกำหนด</span>
              )}
            </p>
          </HeroCard>

          <Stat icon={<ClockThree />} tone="bg-amber-50 text-amber-600" label="จ่ายแล้ววันนี้" value={baht(sum(paidToday))} sub={`${paidToday.length} รายการ`} />
          <Stat icon={<CheckCircle1 />} tone="bg-emerald-100 text-emerald-700" label="จ่ายแล้วเดือนนี้" value={baht(sum(paidMonth))} sub={`${paidMonth.length} รายการ`} />
        </div>

        {/* คิวที่ต้องทำก่อน */}
        <section aria-labelledby="queue-title" className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 id="queue-title" className="text-lg font-bold">
              รอคุณทำจ่าย{" "}
              {pending.length > 0 && (
                <span className="ml-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-xs font-semibold text-[#92400E]">{pending.length}</span>
              )}
            </h2>
            {pending.length > 0 && (
              <Link href="/pay-request" className="flex items-center gap-1 text-sm font-semibold text-[#047857] hover:underline">
                ดูทั้งหมด <ArrowRight size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
          <PayQueueTable rows={pending.slice(0, QUEUE_LIMIT)} empty="ไม่มีคำขอรอทำจ่าย" />
          {pending.length > QUEUE_LIMIT && (
            <p className="border-t border-[#E2E8F0] px-6 py-3 text-sm text-[#64748B]">
              แสดง {QUEUE_LIMIT} รายการที่รอนานที่สุด จากทั้งหมด {pending.length} รายการ
            </p>
          )}
        </section>

        <MyRequestsCard mine={mine} />
      </div>
    </div>
  );
}

function Stat({ icon, tone, label, value, sub }: { icon: React.ReactNode; tone: string; label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`} aria-hidden="true">
        {icon}
      </div>
      <div className="mt-4">
        <div className="text-sm text-[#64748B]">{label}</div>
        <div className="money mt-1 text-3xl font-bold text-[#0F172A]">{value}</div>
        <div className="text-sm text-[#64748B]">{sub}</div>
      </div>
    </div>
  );
}
