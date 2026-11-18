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
//  ข้อมูลตัวอย่าง (ยังไม่มี backend)
//  ※ ชื่อแผนก "การตลาด" / "ไอที" ตั้งให้ตรงกับ dept ใน data/budget.ts
// ────────────────────────────────────────────────────────────
export const DEFAULT_ORGANIZATION: Organization = {
  companyName: "Budget Flow Co., Ltd.",
  managingDirectorId: "u_06",

  linesOfWork: [
    { id: "LW01", name: "สายงานบัญชีและการเงิน" },
    { id: "LW02", name: "สายงานธุรกิจและปฏิบัติการ" },
  ],

  divisions: [
    // สายงานบัญชีและการเงิน
    { id: "DV01", name: "ฝ่ายบัญชีและการเงินองค์กร", lineOfWorkId: "LW01", directorId: "u_03" },

    // สายงานธุรกิจและปฏิบัติการ
    { id: "DV02", name: "ฝ่ายวาณิชธนกิจ", lineOfWorkId: "LW02", directorId: null },
    { id: "DV03", name: "ฝ่ายการตลาด", lineOfWorkId: "LW02", directorId: null },
    { id: "DV04", name: "ฝ่ายเทคโนโลยีสารสนเทศ", lineOfWorkId: "LW02", directorId: null },
  ],

  departments: [
    // ฝ่ายบัญชีและการเงินองค์กร (ผอ. = u_03)
    { id: "DP01", name: "แผนกงบประมาณและควบคุมต้นทุน", divisionId: "DV01", headId: "u_02" },
    { id: "DP02", name: "แผนกบัญชีทั่วไป", divisionId: "DV01", headId: null },
    { id: "DP03", name: "แผนกการเงินและทำจ่าย", divisionId: "DV01", headId: null },

    // ฝ่ายวาณิชธนกิจ
    { id: "DP04", name: "แผนกจัดจำหน่ายตราสารหนี้ (DCM)", divisionId: "DV02", headId: null },

    // ฝ่ายการตลาด
    { id: "DP05", name: "การตลาด", divisionId: "DV03", headId: "u_08" },

    // ฝ่ายเทคโนโลยีสารสนเทศ
    { id: "DP06", name: "ไอที", divisionId: "DV04", headId: null },
  ],
};

// ────────────────────────────────────────────────────────────
//  อ่าน / บันทึก (localStorage "organization")
//  ยังไม่มีข้อมูลในเครื่อง → ใช้ DEFAULT_ORGANIZATION แล้วบันทึกไว้ (แบบเดียวกับ getUsers)
// ────────────────────────────────────────────────────────────
export const ORGANIZATION_KEY = "organization";

export function loadOrganization(): Organization {
  if (typeof window === "undefined") return DEFAULT_ORGANIZATION;

  const stored = localStorage.getItem(ORGANIZATION_KEY);
  if (stored === null) {
    localStorage.setItem(ORGANIZATION_KEY, JSON.stringify(DEFAULT_ORGANIZATION));
    return DEFAULT_ORGANIZATION;
  }

  try {
    return JSON.parse(stored) as Organization;
  } catch {
    return DEFAULT_ORGANIZATION;
  }
}

export function saveOrganization(org: Organization) {
  localStorage.setItem(ORGANIZATION_KEY, JSON.stringify(org));
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
