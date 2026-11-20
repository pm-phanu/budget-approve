// ════════════════════════════════════════════════════════════
//  โครงสร้างองค์กร 3 ชั้น
//
//    สายงาน (LineOfWork)
//      └─ ฝ่าย (Division)        ← ผอ.ฝ่าย (DIRECTOR) ดูแล
//           └─ แผนก (Department)  ← หัวหน้างาน (HEAD) ดูแล
//                └─ พนักงาน (User.departmentId)
//
//  กรรมการผู้จัดการ (MANAGING_DIRECTOR) อยู่ระดับบริษัท ไม่ผูกกับฝ่ายไหน
//
//  ใช้ร่วมกัน: หน้าสร้างคำขอ (หาผู้อนุมัติ), หน้าจัดการผู้ใช้, หน้ารายงาน
//  ※ id ผู้ใช้ (u_xx) อ้างถึง users ใน data/credential.ts
// ════════════════════════════════════════════════════════════

export type LineOfWork = {
  id: string; // เช่น "LW01"
  name: string; // เช่น "สายงานบัญชีและการเงิน"
};

export type Division = {
  id: string; // เช่น "DV01"
  name: string; // เช่น "ฝ่ายบัญชีและการเงินองค์กร"
  lineOfWorkId: string;
  directorId: string | null; // ผอ.ฝ่าย (null = ยังไม่มีคนดำรงตำแหน่ง)
};

export type Department = {
  id: string; // เช่น "DP01"
  name: string; // เช่น "แผนกงบประมาณและควบคุมต้นทุน"
  divisionId: string;
  headId: string | null; // หัวหน้างาน (null = ยังไม่มีคนดำรงตำแหน่ง)
};

export type Organization = {
  companyName: string;
  managingDirectorId: string | null; // กรรมการผู้จัดการ
  linesOfWork: LineOfWork[];
  divisions: Division[];
  departments: Department[];
};

// ────────────────────────────────────────────────────────────
//  ผังองค์กรตั้งต้น (ยังไม่มี backend) = ตัวเลือกใน dropdown สายงาน / ฝ่าย / แผนก
//  ※ ยังไม่ผูกคนกับตำแหน่ง (headId / directorId / managingDirectorId = null)
//    ผู้อนุมัติหาจาก role + สังกัดของผู้ใช้ (isInApproverScope ด้านล่าง)
//  ※ รหัส DP01–DP06 ผูกกับโครงการใน data/budget.ts · ชื่อ "การตลาด" / "ไอที" ต้องตรงกับ dept ที่นั่น
// ────────────────────────────────────────────────────────────
export const DEFAULT_ORGANIZATION: Organization = {
  companyName: "Budget Flow Co., Ltd.",
  managingDirectorId: null,

  linesOfWork: [
    { id: "LW01", name: "สายงานบัญชีและการเงิน" },
    { id: "LW02", name: "สายงานธุรกิจและปฏิบัติการ" },
    { id: "LW03", name: "สายงานสนับสนุนองค์กร" },
  ],

  divisions: [
    // สายงานบัญชีและการเงิน
    { id: "DV01", name: "ฝ่ายบัญชี", lineOfWorkId: "LW01", directorId: null },
    { id: "DV05", name: "ฝ่ายการเงิน", lineOfWorkId: "LW01", directorId: null },

    // สายงานธุรกิจและปฏิบัติการ
    { id: "DV02", name: "ฝ่ายวาณิชธนกิจ", lineOfWorkId: "LW02", directorId: null },
    { id: "DV03", name: "ฝ่ายการตลาด", lineOfWorkId: "LW02", directorId: null },

    // สายงานสนับสนุนองค์กร
    { id: "DV04", name: "ฝ่ายเทคโนโลยีสารสนเทศ", lineOfWorkId: "LW03", directorId: null },
    { id: "DV06", name: "ฝ่ายทรัพยากรบุคคล", lineOfWorkId: "LW03", directorId: null },
    { id: "DV07", name: "ฝ่ายบริหารทั่วไป", lineOfWorkId: "LW03", directorId: null },
  ],

  departments: [
    // ฝ่ายบัญชี
    { id: "DP01", name: "แผนกงบประมาณและควบคุมต้นทุน", divisionId: "DV01", headId: null },
    { id: "DP02", name: "แผนกบัญชีทั่วไป", divisionId: "DV01", headId: null },

    // ฝ่ายการเงิน
    { id: "DP03", name: "แผนกการเงินและทำจ่าย", divisionId: "DV05", headId: null },

    // ฝ่ายวาณิชธนกิจ
    { id: "DP04", name: "แผนกจัดจำหน่ายตราสารหนี้ (DCM)", divisionId: "DV02", headId: null },

    // ฝ่ายการตลาด
    { id: "DP05", name: "การตลาด", divisionId: "DV03", headId: null },
    { id: "DP07", name: "แผนกขาย", divisionId: "DV03", headId: null },

    // ฝ่ายเทคโนโลยีสารสนเทศ
    { id: "DP06", name: "ไอที", divisionId: "DV04", headId: null },

    // ฝ่ายทรัพยากรบุคคล
    { id: "DP08", name: "แผนกทรัพยากรบุคคล", divisionId: "DV06", headId: null },

    // ฝ่ายบริหารทั่วไป
    { id: "DP09", name: "แผนกธุรการ", divisionId: "DV07", headId: null },
    { id: "DP10", name: "แผนกจัดซื้อ", divisionId: "DV07", headId: null },
  ],
};

// ────────────────────────────────────────────────────────────
//  อ่านผังองค์กร: มาจากโค้ดเสมอ (ยังไม่มีหน้าแก้ผัง)
//  ※ เดิมเก็บสำเนาใน localStorage "organization" → เครื่องที่เปิดก่อนผังเปลี่ยนค้างผังเก่า
//  shortcut: ผังแก้ได้แค่ในโค้ด, ถ้าจะทำหน้าแก้ผัง → เก็บใน localStorage แล้ว merge กับ DEFAULT_ORGANIZATION แบบ getUsers
// ────────────────────────────────────────────────────────────
export function loadOrganization(): Organization {
  return DEFAULT_ORGANIZATION;
}

// ────────────────────────────────────────────────────────────
//  ฟังก์ชันค้นหา
// ────────────────────────────────────────────────────────────
export function getDepartment(org: Organization, departmentId: string) {
  return org.departments.find((d) => d.id === departmentId) ?? null;
}

export function getDivision(org: Organization, divisionId: string) {
  return org.divisions.find((d) => d.id === divisionId) ?? null;
}

export function getLineOfWork(org: Organization, lineOfWorkId: string) {
  return org.linesOfWork.find((l) => l.id === lineOfWorkId) ?? null;
}

// แผนก → ฝ่าย → สายงาน ในครั้งเดียว (ใช้แสดง "สังกัด" เต็ม)
export function getDepartmentPath(org: Organization, departmentId: string) {
  const department = getDepartment(org, departmentId);
  const division = department ? getDivision(org, department.divisionId) : null;
  const lineOfWork = division ? getLineOfWork(org, division.lineOfWorkId) : null;
  return { department, division, lineOfWork };
}

// หัวหน้างานของแผนก
export function getHeadId(org: Organization, departmentId: string) {
  return getDepartment(org, departmentId)?.headId ?? null;
}

// ผอ.ฝ่าย ที่ดูแลแผนกนี้
export function getDirectorId(org: Organization, departmentId: string) {
  return getDepartmentPath(org, departmentId).division?.directorId ?? null;
}

// ────────────────────────────────────────────────────────────
//  ขอบเขตผู้อนุมัติ (ผูกตามสังกัด)
//    หัวหน้า (HEAD)        → HEAD ที่อยู่แผนกเดียวกับผู้ขอ (หรือเป็น headId ของแผนก)
//    ผอ. (DIRECTOR)        → DIRECTOR ที่อยู่ฝ่ายเดียวกับผู้ขอ (หรือเป็น directorId ของฝ่าย)
//    ตำแหน่งอื่น (MD / บัญชี / การเงิน / ตำแหน่งที่เพิ่มเอง) → ทั้งบริษัท
//  ※ role ต้องตรงกับขั้นอยู่แล้ว (เช็คที่ canApproveStep) ฟังก์ชันนี้ดูแค่สังกัด
// ────────────────────────────────────────────────────────────
type ScopeUser = { id: string; departmentId?: string | null; divisionId?: string | null };

// ฝ่ายของผู้ใช้: สังกัดแผนก → ฝ่ายของแผนกนั้น · ไม่สังกัดแผนก → ฝ่ายที่เลือกไว้ (divisionId) หรือฝ่ายที่ตัวเองเป็น ผอ.
export function getUserDivisionId(org: Organization, user: ScopeUser) {
  if (user.departmentId) return getDepartment(org, user.departmentId)?.divisionId ?? null;
  if (user.divisionId) return user.divisionId;
  return org.divisions.find((d) => d.directorId === user.id)?.id ?? null;
}

// สังกัดเต็มของผู้ใช้ (ไล่จากชั้นที่ลึกที่สุดที่กำหนดไว้): แผนก → ฝ่าย → สายงาน
// ใช้แสดงในหน้าจัดการผู้ใช้ · ยังไม่กำหนด = null
export function getUserAffiliation(
  org: Organization,
  user: ScopeUser & { lineOfWorkId?: string | null },
) {
  const department = user.departmentId ? getDepartment(org, user.departmentId) : null;
  const divisionId = getUserDivisionId(org, user);
  const division = divisionId ? getDivision(org, divisionId) : null;
  const lineId = division?.lineOfWorkId ?? user.lineOfWorkId ?? null;
  const lineOfWork = lineId ? getLineOfWork(org, lineId) : null;
  return { lineOfWork, division, department };
}

export function isInApproverScope(
  org: Organization,
  role: string,
  user: ScopeUser,
  requesterDepartmentId: string | null | undefined,
): boolean {
  if (role === "HEAD") {
    if (!requesterDepartmentId) return false;
    return (
      user.departmentId === requesterDepartmentId ||
      getHeadId(org, requesterDepartmentId) === user.id
    );
  }
  if (role === "DIRECTOR") {
    if (!requesterDepartmentId) return false;
    const divisionId = getDepartment(org, requesterDepartmentId)?.divisionId ?? null;
    return (
      getDirectorId(org, requesterDepartmentId) === user.id ||
      (!!divisionId && getUserDivisionId(org, user) === divisionId)
    );
  }
  return true;
}
