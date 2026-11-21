// ════════════════════════════════════════════════════════════
//  สังกัดของผู้ใช้ใต้คำทักทายบนแดชบอร์ดทุก role
//  ชั้นที่ลึกสุด (แผนก > ฝ่าย > สายงาน) เด่นสุด เพราะเป็นหน่วยที่ทำงานจริงทุกวัน
// ════════════════════════════════════════════════════════════

import type { Credential } from "@/data/credential";
import { getRoleLabel } from "@/data/approval";
import { getUserAffiliation, loadOrganization } from "@/data/organization";

export function UserAffiliation({ user }: { user: Credential | null }) {
  if (!user) return null;

  const { lineOfWork, division, department } = getUserAffiliation(loadOrganization(), user);
  const mainUnit =
    department?.name ??
    division?.name ??
    lineOfWork?.name ??
    (user.role === "MANAGING_DIRECTOR" ? "ทั้งบริษัท" : null);
  // ชั้นที่อยู่เหนือหน่วยหลัก เช่น แผนก → "ฝ่ายบัญชี สายงานบัญชีและการเงิน"
  const parents = [department && division?.name, (department || division) && lineOfWork?.name]
    .filter(Boolean)
    .join(" ");
  const role = user.role === "EMPLOYEE" ? "พนักงาน" : getRoleLabel(user.role);

  return (
    <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base">
      <span className="rounded-md bg-[#D1FAE5] px-2 py-0.5 text-sm font-medium text-[#065F46]">{role}</span>
      {mainUnit ? (
        <>
          <span className="font-semibold text-[#0F172A]">{mainUnit}</span>
          {parents && <span className="text-[#64748B]">ใน{parents}</span>}
        </>
      ) : (
        <span className="text-[#B45309]">ยังไม่กำหนดสังกัด ติดต่อผู้ดูแลระบบ</span>
      )}
    </p>
  );
}
