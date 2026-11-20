// สรุปคำขอแบบครบทุกช่อง ใช้ในป็อปอัพถามยืนยัน (ส่งคำขอ / อนุมัติ / ตีกลับ / ทำจ่าย)
// rows = ข้อมูลหัวคำขอ (ป้าย, ค่า) · items = รายการค่าใช้จ่าย · total = ยอดรวม

import { baht } from "@/utils/format";

type Props = {
  rows: [string, string | null | undefined][];
  items: { category: string; name: string; amount: number; files: string[] }[];
  total: number;
};

export function RequestSummary({ rows, items, total }: Props) {
  return (
    <div className="max-h-[50vh] space-y-3 overflow-y-auto rounded-xl bg-[#F8FAFC] p-4 text-sm">
      <dl className="space-y-2">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="shrink-0 text-[#64748B]">{label}</dt>
              <dd className="text-right font-semibold text-[#0F172A]">{value}</dd>
            </div>
          ))}
      </dl>
      <div className="border-t border-[#E2E8F0] pt-3">
        <p className="mb-2 text-xs font-semibold text-[#64748B]">รายการค่าใช้จ่าย ({items.length})</p>
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex justify-between gap-4">
              <span className="min-w-0">
                <span className="block font-medium text-[#0F172A]">{it.name || "-"}</span>
                <span className="block text-xs text-[#64748B]">
                  {it.category || "-"} · ไฟล์ {it.files.length > 0 ? it.files.join(", ") : "-"}
                </span>
              </span>
              <span className="money shrink-0 font-semibold">{baht(it.amount)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex justify-between border-t border-[#E2E8F0] pt-3 text-base font-bold">
        <span>ยอดรวม</span>
        <span className="money text-[#059669]">{baht(total)}</span>
      </div>
    </div>
  );
}
