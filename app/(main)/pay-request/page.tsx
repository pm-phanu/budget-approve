"use client";

// ════════════════════════════════════════════════════════════
//  คำขอทำจ่าย (/pay-request) · เฉพาะการเงิน
//  คำขอที่บัญชีตรวจผ่านแล้ว รอโอน ทั้งหมด (เหมือน "คำขอรออนุมัติทั้งหมด" ของผู้อนุมัติ)
//  เก่าสุดขึ้นก่อน · กรองตามประเภท + ค้นหา
// ════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import { REQUESTS_KEY, loadRequests, type SavedRequest } from "@/data/request";
import { getCurrentUser } from "@/utils/login";
import { onHeaderSearch, readSearchParam } from "@/utils/search";
import { DUE_DAYS, PayQueueTable, baht, getPayQueue, payee, waitingDays } from "@/components/pay-queue";
import { ArrowRight } from "@tailgrids/icons";
import { SearchField } from "@/components/search-field";

type Tab = "all" | "advance" | "invoice";

export default function PayRequestPage() {
  const [queue, setQueue] = useState<SavedRequest[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");

  // คำค้นจากช่องค้นหาบน header (?q= ตอนเปิดหน้า · event ตอนอยู่หน้านี้อยู่แล้ว) utils/search.ts
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- ?q= อ่านได้หลังเปิดหน้าเท่านั้น */
    setQuery(readSearchParam());
    return onHeaderSearch(setQuery);
  }, []);

  useEffect(() => {
    const read = () => setQueue(getPayQueue(loadRequests(), getCurrentUser()));
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === REQUESTS_KEY) read();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const total = queue.reduce((s, r) => s + r.total, 0);
  const overdue = queue.filter((r) => waitingDays(r) > DUE_DAYS).length;

  const q = query.trim().toLowerCase();
  const rows = queue.filter(
    (r) => (tab === "all" || r.type === tab) && (!q || (r.id + r.title + payee(r)).toLowerCase().includes(q)),
  );

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "ทั้งหมด", count: queue.length },
    { key: "advance", label: "สำรองจ่าย", count: queue.filter((r) => r.type === "advance").length },
    { key: "invoice", label: "ใบแจ้งหนี้", count: queue.filter((r) => r.type === "invoice").length },
  ];

  return (
    <div className="text-[#0F172A]">
      <header className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold">คำขอทำจ่าย</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            บัญชีตรวจแล้ว โอนให้เสร็จภายใน {DUE_DAYS} วันทำการ แล้วบันทึกเลขที่อ้างอิงการโอน · รอนานสุดอยู่บน
          </p>
        </div>
        <Link href="/pay-history" className="flex items-center gap-1 text-sm font-semibold text-[#047857] hover:underline">
          ประวัติการทำจ่าย <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </header>

      {/* สรุปสั้น: ตัวเลขบนพื้นหน้า ไม่ทำการ์ดซ้อน */}
      <dl className="mb-5 flex flex-wrap gap-x-10 gap-y-2 text-sm">
        <div className="flex items-baseline gap-2">
          <dt className="text-[#64748B]">รอโอน</dt>
          <dd className="money text-xl font-bold">{queue.length} รายการ</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="text-[#64748B]">ยอดรวม</dt>
          <dd className="money text-xl font-bold text-[#047857]">{baht(total)}</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="text-[#64748B]">เลยกำหนด</dt>
          <dd className={`money text-xl font-bold ${overdue > 0 ? "text-[#BE123C]" : ""}`}>{overdue} รายการ</dd>
        </div>
      </dl>

      <section aria-label="รายการรอทำจ่าย" className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-2xl">
        <div className="flex flex-wrap items-center gap-2 px-6 py-4">
          <div role="group" aria-label="กรองตามประเภท" className="flex gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-pressed={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                  tab === t.key ? "bg-[#059669] text-white" : "bg-[#F1F5F9] text-[#475569] hover:bg-[#ECFDF5] hover:text-[#047857]"
                }`}
              >
                {t.label} {t.count}
              </button>
            ))}
          </div>
          <SearchField
            label="ค้นหา"
            value={query}
            onChange={setQuery}
            placeholder="ค้นหาเลขที่เอกสาร / ผู้รับเงิน"
            className="ml-auto w-72"
          />
        </div>

        <PayQueueTable
          rows={rows}
          empty={queue.length === 0 ? "ไม่มีคำขอรอทำจ่าย" : q ? `ไม่พบรายการที่ตรงกับ “${query.trim()}”` : "ไม่มีรายการในประเภทนี้"}
        />
      </section>
    </div>
  );
}
