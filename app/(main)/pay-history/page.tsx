"use client";

// ════════════════════════════════════════════════════════════
//  ประวัติการทำจ่าย (/pay-history) · เฉพาะการเงิน
//  ทุกครั้งที่คุณบันทึกการจ่าย / ตีกลับ (ใหม่ → เก่า) เหมือน "ประวัติการอนุมัติ"
//  ข้อมูลจาก getActedRequests() (อ่านจาก history → ตีกลับรอบก่อนไม่หาย)
// ════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import Link from "next/link";
import { REQUESTS_KEY, getActedRequests, loadRequests, type SavedRequest } from "@/data/request";
import { getCurrentUser } from "@/utils/login";
import { bkkMonth, thaiDate } from "@/utils/date";
import type { Credential } from "@/data/credential";
import { PAY_DETAIL_PATH, baht, paidAt, payee } from "@/components/pay-queue";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/tailgrids/core/table";
import { ArrowRight, CheckCircle1 } from "@tailgrids/icons";
import { SearchField } from "@/components/search-field";

type Filter = "all" | "อนุมัติ" | "ตีกลับ";

export default function PayHistoryPage() {
  const [me, setMe] = useState<Credential | null>(null);
  const [requests, setRequests] = useState<SavedRequest[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- อ่าน localStorage ได้หลังเปิดหน้าเท่านั้น */
    setMe(getCurrentUser());
    setRequests(loadRequests());
    /* eslint-enable react-hooks/set-state-in-effect */
    const onStorage = (e: StorageEvent) => {
      if (e.key === REQUESTS_KEY) setRequests(loadRequests());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const acted = me ? getActedRequests(requests, me) : [];
  const paidRows = acted.filter((a) => a.step.status === "อนุมัติ");
  const rejectedRows = acted.filter((a) => a.step.status === "ตีกลับ");
  const thisMonth = bkkMonth();
  const paidMonth = paidRows.filter((a) => bkkMonth(paidAt(a.request)) === thisMonth);
  const sum = (list: typeof acted) => list.reduce((s, a) => s + Number(a.request.total || 0), 0);

  const q = query.trim().toLowerCase();
  const shown = acted.filter(
    ({ request: r, step }) =>
      (filter === "all" || step.status === filter) &&
      (!q || (r.id + r.title + payee(r) + (r.payment?.ref ?? "")).toLowerCase().includes(q)),
  );

  const cards: { key: Filter; label: string; value: string; sub: string; tone: string }[] = [
    { key: "all", label: "ทั้งหมด", value: String(acted.length), sub: "ครั้ง", tone: "text-[#0F172A]" },
    {
      key: "อนุมัติ",
      label: "จ่ายแล้ว",
      value: String(paidRows.length),
      sub: `ครั้ง · เดือนนี้ ${baht(sum(paidMonth))}`,
      tone: "text-[#047857]",
    },
    { key: "ตีกลับ", label: "ตีกลับ", value: String(rejectedRows.length), sub: "ครั้ง", tone: "text-[#BE123C]" },
  ];

  return (
    <div className="text-[#0F172A]">
      <header className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold">ประวัติการทำจ่าย</h1>
          <p className="mt-1 text-sm text-[#64748B]">ทุกครั้งที่คุณบันทึกการจ่ายหรือตีกลับคำขอ ล่าสุดอยู่บน</p>
        </div>
        <Link href="/pay-request" className="flex items-center gap-1 text-sm font-semibold text-[#047857] hover:underline">
          คำขอที่รอทำจ่าย <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </header>

      {/* การ์ดสรุป = ตัวกรอง (แบบเดียวกับประวัติการอนุมัติ) */}
      <div className="grid grid-cols-3 gap-5" role="group" aria-label="กรองตามผล">
        {cards.map((c) => {
          const active = filter === c.key;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(c.key)}
              className={`rounded-xl border bg-white p-6 text-left shadow-2xl ${
                active ? "border-[#059669] ring-1 ring-[#059669]" : "border-[#E2E8F0] hover:border-[#A7F3D0]"
              }`}
            >
              <span className="block text-sm text-[#64748B]">{c.label}</span>
              <span className={`money mt-1 block text-3xl font-bold ${c.tone}`}>
                {c.value} <span className="text-sm font-normal text-[#64748B]">{c.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      <section aria-labelledby="pay-history-title" className="mt-9 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <h2 id="pay-history-title" className="text-lg font-bold">
            {filter === "all" ? "ทั้งหมด" : filter === "อนุมัติ" ? "จ่ายแล้ว" : "ตีกลับ"}{" "}
            <span className="text-sm font-normal text-[#64748B]">{shown.length} ครั้ง</span>
          </h2>
          <SearchField
            label="ค้นหา"
            value={query}
            onChange={setQuery}
            placeholder="ค้นหาเลขที่ ผู้รับเงิน หรือเลขอ้างอิง"
            className="w-72"
          />
        </div>

        {shown.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3 border-t border-[#E2E8F0] text-center text-sm text-[#64748B]">
            <CheckCircle1 size={28} aria-hidden="true" />
            {!me ? (
              "กรุณาเข้าสู่ระบบ"
            ) : q ? (
              <>
                <p>ไม่พบรายการที่ตรงกับ “{query.trim()}”</p>
                <button type="button" onClick={() => setQuery("")} className="font-semibold text-[#047857] hover:underline">
                  ล้างคำค้นหา
                </button>
              </>
            ) : acted.length === 0 ? (
              <>
                <p>คุณยังไม่เคยบันทึกการจ่าย</p>
                <Link href="/pay-request" className="font-semibold text-[#047857] hover:underline">
                  ไปที่คำขอทำจ่าย
                </Link>
              </>
            ) : (
              "ไม่มีรายการในตัวกรองนี้"
            )}
          </div>
        ) : (
          <TableRoot fullBleed className="border-[#E2E8F0] text-sm">
            <TableHeader className="bg-[#F8FAFC] text-[#64748B]">
              <TableRow>
                <TableHead>คำขอ</TableHead>
                <TableHead>ผู้รับเงิน / บัญชี</TableHead>
                <TableHead>เลขที่อ้างอิงการโอน</TableHead>
                <TableHead>วันที่</TableHead>
                <TableHead className="text-right">ยอด</TableHead>
                <TableHead>ผล</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map(({ request: r, step }, i) => {
                const rejected = step.status === "ตีกลับ";
                return (
                  <TableRow key={`${r.id}-${step.at}-${i}`} className="hover:bg-[#F8FAFC]">
                    <TableCell>
                      <Link
                        href={`${PAY_DETAIL_PATH}?id=${encodeURIComponent(r.id)}`}
                        className="font-semibold text-[#0F172A] hover:text-[#047857] hover:underline"
                      >
                        {r.title}
                      </Link>
                      <p className="text-xs text-[#64748B]">
                        {r.id} · {r.typeLabel}
                      </p>
                      {rejected && step.note && (
                        <p className="mt-1 text-xs text-[#9F1239]">เหตุผล: “{step.note}”</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-[#0F172A]">{payee(r)}</p>
                      <p className="text-xs text-[#64748B]">{r.bankAccount ?? "ดูในใบแจ้งหนี้"}</p>
                    </TableCell>
                    <TableCell className="money text-[#0F172A]">{rejected ? "–" : (r.payment?.ref ?? "–")}</TableCell>
                    <TableCell>
                      <p className="text-[#0F172A]">{thaiDate(rejected ? step.at : (r.payment?.date ?? step.at))}</p>
                      <p className="text-xs text-[#64748B]">บันทึก {thaiDate(step.at, true)}</p>
                    </TableCell>
                    <TableCell className="money text-right font-bold text-[#0F172A]">{baht(r.total)}</TableCell>
                    <TableCell>
                      <span className={`status ${rejected ? "status-rejected" : "status-paid"}`}>
                        {rejected ? "ตีกลับ" : "จ่ายแล้ว"}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </TableRoot>
        )}
      </section>
    </div>
  );
}
