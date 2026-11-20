// ════════════════════════════════════════════════════════════
//  คิวทำจ่ายของการเงิน: ใช้ร่วมกันระหว่างแดชบอร์ด (/home-finance) กับ "คำขอทำจ่าย" (/pay-request)
//  ฟังก์ชันช่วย + ตารางรายการรอโอน (คอลัมน์ตาม wireframe Finance / 01)
// ════════════════════════════════════════════════════════════

import Link from "next/link";
import type { SavedRequest } from "@/data/request";
import { canApproveStep } from "@/data/approval";
import { bkkDaysAgo } from "@/utils/date";
import { ErrorCircle } from "@tailgrids/icons";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/tailgrids/core/table";
import { baht } from "@/utils/format";
export { baht }; // หน้าการเงินเดิม import baht จากไฟล์นี้

// โอนเกินกี่วันถือว่า "เลยกำหนด"
export const DUE_DAYS = 3;

export const PAY_DETAIL_PATH = "/home-finance/pay";


// วันที่บัญชีตรวจผ่าน = เวลาของขั้นก่อนหน้าขั้นการเงิน
export function checkedAt(r: SavedRequest) {
  return r.approvalSteps[r.currentStep - 1]?.at ?? null;
}

// วันที่การเงินจ่าย = เวลาของขั้นการเงิน
export function paidAt(r: SavedRequest) {
  return r.approvalSteps.find((s) => s.role === "FINANCE")?.at ?? "";
}

export const waitingDays = (r: SavedRequest) => {
  const at = checkedAt(r);
  return at ? bkkDaysAgo(at) : 0;
};

// ชื่อผู้รับเงิน: สำรองจ่าย = ผู้ขอ (โอนคืน) · ใบแจ้งหนี้ = ผู้ขายตามใบแจ้งหนี้
export function payee(r: SavedRequest) {
  return r.type === "advance" ? (r.requester?.fullName ?? "-") : "ผู้ขายตามใบแจ้งหนี้";
}

// คิวของคนที่ login: ขั้นปัจจุบันเป็นการเงิน และกดได้ · เก่าสุด (รอนานสุด) ขึ้นก่อน
export function getPayQueue(all: SavedRequest[], me: Parameters<typeof canApproveStep>[1]) {
  return all
    .filter((r) => r.approvalSteps[r.currentStep]?.role === "FINANCE" && canApproveStep(r, me))
    .sort((a, b) => (checkedAt(a) ?? "").localeCompare(checkedAt(b) ?? ""));
}

// ป้ายรอกี่วัน: 0–1 วัน เทา · 2–3 วัน เหลือง · เกินกำหนด แดง + ไอคอน (ไม่สื่อด้วยสีอย่างเดียว)
export function DaysBadge({ days }: { days: number }) {
  if (days > DUE_DAYS) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#E11D48] px-2.5 py-1 text-xs font-semibold text-white">
        <ErrorCircle size={14} aria-hidden="true" />
        {days} วันก่อน เลยกำหนด
      </span>
    );
  }
  const color = days >= 2 ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#F1F5F9] text-[#475569]";
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
      {days === 0 ? "วันนี้" : `${days} วันก่อน`}
    </span>
  );
}

export function PayQueueTable({ rows, empty }: { rows: SavedRequest[]; empty: string }) {
  if (rows.length === 0) {
    return <p className="py-12 text-center text-sm text-[#64748B]">{empty}</p>;
  }
  return (
    <TableRoot fullBleed className="border-[#E2E8F0] text-sm">
      <TableHeader className="bg-[#F8FAFC] text-[#64748B]">
        <TableRow>
          <TableHead>คำขอ</TableHead>
          <TableHead>ผู้รับเงิน / บัญชี</TableHead>
          <TableHead>บัญชีตรวจเมื่อ</TableHead>
          <TableHead className="text-right">ยอดโอน</TableHead>
          <TableHead>
            <span className="sr-only">การทำงาน</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const days = waitingDays(r);
          const late = days > DUE_DAYS;
          return (
            <TableRow key={r.id} className={late ? "bg-[#FFF1F2]" : "hover:bg-[#F8FAFC]"}>
              <TableCell>
                <p className="font-semibold text-[#0F172A]">{r.title}</p>
                <p className="text-xs text-[#64748B]">
                  {r.id}{" "}
                  <span className={`whitespace-nowrap font-semibold ${r.type === "advance" ? "text-[#047857]" : "text-[#1D4ED8]"}`}>
                    {r.typeLabel}
                  </span>
                </p>
              </TableCell>
              <TableCell>
                <p className="text-[#0F172A]">{payee(r)}</p>
                <p className="text-xs text-[#64748B]">{r.bankAccount ?? "ดูในใบแจ้งหนี้"}</p>
              </TableCell>
              <TableCell>
                <DaysBadge days={days} />
              </TableCell>
              <TableCell className="money text-right font-bold text-[#0F172A]">{baht(r.total)}</TableCell>
              <TableCell className="text-right">
                <Link
                  href={`${PAY_DETAIL_PATH}?id=${encodeURIComponent(r.id)}`}
                  className="inline-block whitespace-nowrap rounded-lg bg-[#059669] px-4 py-2 text-sm font-semibold text-white hover:bg-[#047857] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#059669]"
                >
                  ดูและจ่าย
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </TableRoot>
  );
}
