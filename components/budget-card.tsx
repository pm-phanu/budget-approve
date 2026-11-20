// ════════════════════════════════════════════════════════════
//  การ์ดตัวเลขหลักของหน้า (พื้นเขียวเข้มไล่สี + วงกลมตกแต่ง) แบบเดียวกับหน้าหัวหน้าแผนก
//  HeroCard   = กรอบอย่างเดียว ใส่เนื้อหาเอง (เช่น ยอดรอทำจ่ายของการเงิน)
//  BudgetCard = งบคงเหลือ + หลอดที่ใช้ไป → ใช้ทุกหน้าที่โชว์งบ ให้หน้าตาเหมือนกันทั้งระบบ
// ════════════════════════════════════════════════════════════

import type { ReactNode } from "react";
import { Wallet2 } from "@tailgrids/icons";
import { baht } from "@/utils/format";


export function HeroCard({
  label,
  badge,
  icon,
  className = "",
  children,
}: {
  label: string;
  badge?: ReactNode;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={`relative flex flex-col overflow-hidden rounded-xl bg-gradient-to-br from-[#0b1f2a] via-[#0e4b3e] to-[#0a8f5f] p-6 text-white shadow-2xl print:bg-none print:text-[#0F172A] print:shadow-none ${className}`}
    >
      {/* ลวดลายวงกลมตกแต่ง */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border border-white/10" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-4 -top-8 h-40 w-40 rounded-full border border-white/10" />

      <div className="relative z-10 flex flex-1 flex-col">
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm">
            {icon ?? <Wallet2 className="h-5 w-5 text-emerald-300" aria-hidden="true" />}
            {label}
          </span>
          {badge && <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs">{badge}</span>}
        </div>
        {children}
      </div>
    </section>
  );
}

export function BudgetCard({
  label = "งบแผนกคงเหลือ",
  limit,
  used,
  year,
  note,
  className,
}: {
  label?: string;
  limit: number; // งบทั้งปี
  used: number; // ใช้ไป (รวมคำขอที่ส่งแล้ว)
  year: number | null; // ค.ศ. · null = ยังไม่รู้ปี
  note?: ReactNode; // บรรทัดเสริมใต้ยอด เช่น งบร่วมจากแผนกอื่น
  className?: string;
}) {
  const remaining = Math.max(0, limit - used);
  const usedPct = limit > 0 ? Math.round((used / limit) * 100) : 0;
  const over = limit > 0 && used > limit;

  return (
    <HeroCard label={label} badge={year !== null ? `ปี ${year + 543}` : undefined} className={`justify-between ${className ?? ""}`}>
      <p className="money text-3xl font-bold tracking-tight">{baht(remaining)}</p>
      <p className="mt-1 text-xs text-emerald-300/80">
        {limit > 0 ? `จากงบทั้งปี ${baht(limit)}` : "ยังไม่ได้ตั้งงบปีนี้"}
      </p>
      {note && <p className="mt-1 text-xs text-emerald-200">{note}</p>}

      <div className="mt-auto pt-3">
        <div className="mb-1.5 flex justify-between text-xs text-emerald-200">
          <span>{over ? "ใช้งบเกินวงเงิน" : ""}</span>
          <span>ใช้ไปแล้ว {usedPct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/15" role="img" aria-label={`ใช้งบไปแล้ว ${usedPct}%`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${over ? "bg-rose-400" : "bg-[#34e0a1]"}`}
            style={{ width: `${Math.min(100, Math.max(0, usedPct))}%` }}
          />
        </div>
      </div>
    </HeroCard>
  );
}
