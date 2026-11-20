"use client";

// ════════════════════════════════════════════════════════════
//  แดชบอร์ดการเงิน (/home-finance)
//  grid 4 คอลัมน์แบบ home ของ role อื่น:
//    แถวบน  = ยอดรอทำจ่าย (2) + จ่ายแล้ววันนี้ + จ่ายแล้วเดือนนี้
//    แถวล่าง = ซ้าย (2): รอคุณทำจ่าย + ทำจ่ายล่าสุด · ขวา (2): คำขอของฉัน
//  รายการเต็มอยู่ที่ "คำขอทำจ่าย" (/pay-request) · ที่ทำไปแล้วอยู่ "ประวัติการทำจ่าย" (/pay-history)
// ════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import { REQUESTS_KEY, getActedRequests, loadRequests, type SavedRequest } from "@/data/request";
import { getCurrentUser } from "@/utils/login";
import { bkkDay, bkkMonth } from "@/utils/date";
import type { Credential } from "@/data/credential";
import MyRequestsCard from "@/components/my-requests-card";
import { HeroCard } from "@/components/budget-card";
import { DUE_DAYS, PAY_DETAIL_PATH, baht, getPayQueue, paidAt, payee, waitingDays } from "@/components/pay-queue";
import { ArrowRight, Bank1, CheckCircle1, ClockThree } from "@tailgrids/icons";

const QUEUE_LIMIT = 5; // แถวสูงสุดใน "รอคุณทำจ่าย"
const RECENT_LIMIT = 5; // แถวสูงสุดใน "ทำจ่ายล่าสุด"

// แถวรายการ (เหมือนแดชบอร์ดบัญชี): ชื่อ | ป้าย | ยอดเงิน | ปุ่ม/สถานะ
const ROW_GRID =
  "grid min-h-[72px] grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 border-b border-[#F1F5F9] py-3 last:border-b-0";

// "เมื่อ 2 ชั่วโมงที่แล้ว"
function timeAgo(iso: string | null) {
  if (!iso) return "";
  const mins = Math.floor(Math.max(0, Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `เมื่อ ${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `เมื่อ ${hours} ชั่วโมงที่แล้ว`;
  return `เมื่อ ${Math.floor(hours / 24)} วันที่แล้ว`;
}

// ป้ายรอกี่วัน: เกินกำหนด = แดง · อื่น ๆ = เหลือง
function WaitBadge({ days }: { days: number }) {
  const late = days > DUE_DAYS;
  return (
    <span
      className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs ${
        late ? "border-rose-200 bg-rose-50 font-semibold text-rose-600" : "border-amber-200 bg-amber-50 text-amber-600"
      }`}
    >
      {days === 0 ? "วันนี้" : `รอ ${days} วัน`}
      {late && " · เลยกำหนด"}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-green-700"
      aria-hidden="true"
    >
      {name.slice(0, 2)}
    </div>
  );
}

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

  // ทำจ่ายล่าสุด: ที่คุณบันทึกจ่าย / ตีกลับ (ใหม่ → เก่า) แบบเดียวกับประวัติการทำจ่าย
  const recent = me ? getActedRequests(all, me).slice(0, RECENT_LIMIT) : [];

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

        {/* แถวล่าง: grid 4 คอลัมน์เหมือน home อื่น · ซ้าย 2 = งานของการเงิน · ขวา 2 = คำขอของฉัน */}
        <div className="grid grid-cols-4 gap-5">
          {/* self-start: สูงตามจำนวนรายการ ไม่ยืดตามการ์ดขวา */}
          <section
            aria-labelledby="queue-title"
            className="col-span-2 flex flex-col self-start rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl"
          >
            {/* ---------- รอคุณทำจ่าย (รอนานสุดขึ้นก่อน) ---------- */}
            <div className="mb-1 flex items-center justify-between">
              <h2 id="queue-title" className="font-bold">
                รอคุณทำจ่าย
                <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-normal text-amber-600">
                  {pending.length}
                </span>
              </h2>
              <Link href="/pay-request" className="flex items-center gap-1 text-xs font-semibold text-[#047857] hover:underline">
                ดูทั้งหมด <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-[#64748B]">
                <CheckCircle1 aria-hidden="true" />
                <span className="text-sm">ไม่มีคำขอรอทำจ่าย</span>
              </div>
            ) : (
              pending.slice(0, QUEUE_LIMIT).map((r) => (
                <div key={r.id} className={ROW_GRID}>
                  <div className="flex min-w-0 items-center">
                    <Avatar name={payee(r)} />
                    <div className="ml-3 flex min-w-0 flex-col">
                      <div className="truncate font-bold">{r.title}</div>
                      <div className="truncate text-xs text-[#64748B]">
                        {payee(r)} · {r.typeLabel}
                      </div>
                    </div>
                  </div>
                  <WaitBadge days={waitingDays(r)} />
                  <span className="money text-right font-bold">{baht(r.total)}</span>
                  <Link
                    href={`${PAY_DETAIL_PATH}?id=${encodeURIComponent(r.id)}`}
                    className="flex items-center gap-1 whitespace-nowrap rounded-lg bg-[#ECFDF5] px-3 py-1.5 text-xs font-bold text-[#047857] hover:bg-[#D1FAE5]"
                  >
                    ดูและจ่าย <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              ))
            )}
            {pending.length > QUEUE_LIMIT && (
              <p className="pt-2 text-xs text-[#64748B]">
                แสดง {QUEUE_LIMIT} รายการที่รอนานที่สุด จากทั้งหมด {pending.length} รายการ
              </p>
            )}

            {/* ---------- ทำจ่ายล่าสุด ---------- */}
            <div className="mb-1 mt-6 flex items-center justify-between border-t border-[#E2E8F0] pt-5">
              <h2 className="font-bold">ทำจ่ายล่าสุด</h2>
              <Link href="/pay-history" className="flex items-center gap-1 text-xs font-semibold text-[#047857] hover:underline">
                ดูประวัติ <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-[#64748B]">
                <CheckCircle1 aria-hidden="true" />
                <span className="text-sm">ยังไม่มีรายการที่คุณทำจ่าย</span>
              </div>
            ) : (
              recent.map(({ request: r, step }, i) => {
                const rejected = step.status === "ตีกลับ";
                return (
                  <div key={`${r.id}-${step.at}-${i}`} className={ROW_GRID}>
                    <div className="flex min-w-0 items-center">
                      <Avatar name={payee(r)} />
                      <div className="ml-3 flex min-w-0 flex-col">
                        <div className="truncate font-bold">{r.title}</div>
                        <div className="truncate text-xs text-[#64748B]">
                          {payee(r)} · {rejected ? "ตีกลับ" : "จ่าย"}
                          {timeAgo(step.at)}
                        </div>
                      </div>
                    </div>
                    <div />
                    <span className="money text-right font-bold">{baht(r.total)}</span>
                    <span className={`status ${rejected ? "status-rejected" : "status-paid"}`}>
                      {rejected ? "ตีกลับ" : "จ่ายแล้ว"}
                    </span>
                  </div>
                );
              })
            )}
          </section>

          {/* ขวา: คำขอของฉัน (การ์ดเดียวกับทุกหน้า) */}
          <div className="col-span-2 self-start">
            <MyRequestsCard mine={mine} />
          </div>
        </div>
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
