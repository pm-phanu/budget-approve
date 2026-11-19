// ════════════════════════════════════════════════════════════
//  ข้อมูลงบประมาณ: แผนก → โครงการ → หมวดค่าใช้จ่าย → วงเงิน
//  ใช้ร่วมกัน: หน้าสร้างคำขอ, แดชบอร์ด, หน้ารายงาน (และหน้างบประมาณประจำปี)
//
//  ยอด "ใช้ไป" ของหมวด = used (ยอดยกมาก่อนเริ่มใช้ระบบ) + คำขอที่ส่งแล้วในระบบ
//  → อย่าแก้ used ตอนอนุมัติคำขอ ให้คำนวณผ่าน addRequestsToBudget()
// ════════════════════════════════════════════════════════════

import type { Organization } from "./organization";
import type { SavedRequest } from "./request";

export type Category = {
  id: string;
  name: string;
  limit: number; // วงเงินของหมวด
  used: number; // ยอดยกมา (ใช้ไปก่อนเริ่มใช้ระบบ)
};
export type Project = {
  id: string;
  name: string;
  departmentId: string; // แผนกเจ้าของงบ → departments ใน data/organization.ts
  dept: string; // ชื่อแผนก (แสดงผล / หน้าเดิมยังใช้อยู่) ต้องตรงกับชื่อแผนกใน organization.ts
  year: number; // ปีงบประมาณ (ค.ศ.)
  categories: Category[];
};

// ────────────────────────────────────────────────────────────
//  ข้อมูลตัวอย่าง (ยังไม่มี backend) · คงเหลือของหมวด = limit − used
// ────────────────────────────────────────────────────────────
export const projects: Project[] = [
  {
    id: "P01",
    name: "สัมมนาการตลาดประจำปี",
    departmentId: "DP05",
    dept: "การตลาด",
    year: 2026,
    categories: [
      { id: "C01", name: "ค่าเดินทาง", limit: 60000, used: 18000 },
      { id: "C02", name: "ค่าที่พัก", limit: 40000, used: 18000 },
      { id: "C03", name: "ค่าอาหาร", limit: 20000, used: 4500 },
    ],
  },
  {
    id: "P02",
    name: "เปิดตัวสินค้าใหม่",
    departmentId: "DP05",
    dept: "การตลาด",
    year: 2026,
    categories: [
      { id: "C04", name: "ค่าเช่าสถานที่", limit: 150000, used: 60000 },
      { id: "C05", name: "ค่าออกแบบสื่อ", limit: 50000, used: 35000 },
      { id: "C06", name: "ค่าของที่ระลึก", limit: 30000, used: 2400 },
    ],
  },
  {
    id: "P03",
    name: "ปรับปรุงระบบไอที",
    departmentId: "DP06",
    dept: "ไอที",
    year: 2026,
    categories: [
      { id: "C07", name: "ค่าอุปกรณ์คอมพิวเตอร์", limit: 800000, used: 120000 },
      { id: "C08", name: "ค่าบริการคลาวด์", limit: 200000, used: 64000 },
    ],
  },
  {
    // แผนกงบประมาณฯ (phanu / head_dcm) · เดิมไม่มีโครงการ → แดชบอร์ดเลยใช้งบรวมทั้งบริษัท
    id: "P04",
    name: "บริหารงบประมาณและควบคุมต้นทุน",
    departmentId: "DP01",
    dept: "แผนกงบประมาณและควบคุมต้นทุน",
    year: 2026,
    categories: [
      { id: "C09", name: "ค่าฝึกอบรม", limit: 80000, used: 12000 },
      { id: "C10", name: "ค่าซอฟต์แวร์และระบบ", limit: 150000, used: 45000 },
      { id: "C11", name: "ค่าเดินทางตรวจหน่วยงาน", limit: 50000, used: 6500 },
    ],
  },
  {
    id: "P05",
    name: "จัดจำหน่ายตราสารหนี้",
    departmentId: "DP04",
    dept: "แผนกจัดจำหน่ายตราสารหนี้ (DCM)",
    year: 2026,
    categories: [
      { id: "C12", name: "ค่ารับรองลูกค้า", limit: 120000, used: 30000 },
      { id: "C13", name: "ค่าจัดงานนำเสนอ", limit: 200000, used: 50000 },
    ],
  },
];

// ────────────────────────────────────────────────────────────
//  อ่าน / บันทึก (localStorage "projects")
//  ยังไม่มีในเครื่อง → ใช้ข้อมูลตัวอย่างแล้วบันทึกไว้ (แบบเดียวกับ getUsers)
//  ข้อมูลเก่า → เติม departmentId / year จากข้อมูลตัวอย่าง และเพิ่มโครงการใหม่ที่ยังไม่มี
// ────────────────────────────────────────────────────────────
export const PROJECTS_KEY = "projects";

export function loadProjects(): Project[] {
  if (typeof window === "undefined") return projects;

  const stored = localStorage.getItem(PROJECTS_KEY);
  if (stored === null) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    return projects;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<Project>[];
    const merged = parsed.map((p) => {
      const seed = projects.find((s) => s.id === p.id);
      return {
        ...seed,
        ...p,
        departmentId: p.departmentId ?? seed?.departmentId ?? "",
        year: p.year ?? seed?.year ?? new Date().getFullYear(),
      } as Project;
    });
    const missing = projects.filter((s) => !parsed.some((p) => p.id === s.id));
    const result = [...merged, ...missing];
    if (JSON.stringify(result) !== stored) {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(result));
    }
    return result;
  } catch {
    return projects;
  }
}

export function saveProjects(next: Project[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
}

// ────────────────────────────────────────────────────────────
//  คำนวณ
// ────────────────────────────────────────────────────────────

// งบรวมของ 1 โครงการ
export function projectLimit(p: Project) {
  return p.categories.reduce((sum, c) => sum + c.limit, 0);
}
export function projectUsed(p: Project) {
  return p.categories.reduce((sum, c) => sum + c.used, 0);
}

// เอาคำขอที่ส่งแล้วมาบวกเพิ่มในยอด "ใช้ไป" ของแต่ละหมวด
// ※ ไม่นับร่าง กับที่ถูกตีกลับ (เงินยังไม่ได้ถูกจองไว้)
// ※ base: ไม่ส่งมา = อ่านจาก localStorage (loadProjects)
export function addRequestsToBudget(
  saved: SavedRequest[],
  base: Project[] = loadProjects(),
): Project[] {
  const counted = saved.filter(
    (r) => r.status !== "ร่าง" && r.status !== "ตีกลับ",
  );

  return base.map((p) => ({
    ...p,
    categories: p.categories.map((c) => {
      let extra = 0;
      for (const r of counted) {
        for (const it of r.items) {
          if (it.categoryId === c.id) extra += it.amount;
        }
      }
      return { ...c, used: c.used + extra };
    }),
  }));
}

// งบของแผนก ในปีที่กำหนด (ไม่ส่ง year = รวมทุกปี)
// limit = งบที่แบ่งให้แผนก · ยังไม่แบ่ง = วงเงินโครงการรวม · used = ใช้ไปของทุกโครงการในแผนก
// แผนกไม่มีทั้งงบที่แบ่งและโครงการ → limit = 0 (ไม่ดึงงบทั้งบริษัทมาแสดงแทน)
export function getDepartmentBudget(
  departmentId: string | null | undefined,
  saved: SavedRequest[],
  year?: number,
) {
  const list = addRequestsToBudget(saved).filter(
    (p) => !!departmentId && p.departmentId === departmentId && (year === undefined || p.year === year),
  );
  // วงเงินของแผนก = งบที่บัญชีแบ่งให้แผนก (budgetAllocations) ของปีนั้น
  // ปีที่ยังไม่เคยแบ่งงบ → ใช้วงเงินโครงการรวมแทน (แบบเดิม)
  const allocs = loadAllocations();
  const years =
    year !== undefined
      ? [year]
      : [
          ...new Set([
            ...list.map((p) => p.year),
            ...allocs.filter((a) => departmentId && a.departments[departmentId] !== undefined).map((a) => a.year),
          ]),
        ];
  const limit = years.reduce((sum, y) => {
    const allocated = departmentId
      ? allocs.find((a) => a.year === y)?.departments[departmentId]
      : undefined;
    const fromProjects = list.filter((p) => p.year === y).reduce((s, p) => s + projectLimit(p), 0);
    return sum + (allocated ?? fromProjects);
  }, 0);
  const used = list.reduce((sum, p) => sum + projectUsed(p), 0);
  return { limit, used, remaining: Math.max(0, limit - used), projects: list };
}

// ════════════════════════════════════════════════════════════
//  การแบ่งงบจากบอร์ด (localStorage "budgetAllocations" · 1 รายการต่อปี)
//  งบบอร์ด → สายงาน → ฝ่าย → แผนก → โครงการ/หมวด (Project ด้านบน)
//  ชั้นล่างรวมกันต้องไม่เกินชั้นบน (validateAllocation) · ไม่ผ่าน = ห้ามบันทึก
// ════════════════════════════════════════════════════════════
export type BudgetAllocation = {
  year: number; // ปีงบประมาณ (ค.ศ.)
  boardTotal: number; // งบรวมที่บอร์ดอนุมัติ
  lines: Record<string, number>; // lineOfWorkId → วงเงิน
  divisions: Record<string, number>; // divisionId → วงเงิน
  departments: Record<string, number>; // departmentId → วงเงิน
};

export const ALLOCATIONS_KEY = "budgetAllocations";

export function loadAllocations(): BudgetAllocation[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(ALLOCATIONS_KEY);
    return stored ? (JSON.parse(stored) as BudgetAllocation[]) : [];
  } catch {
    return [];
  }
}

export function saveAllocations(list: BudgetAllocation[]) {
  localStorage.setItem(ALLOCATIONS_KEY, JSON.stringify(list));
}

// ผลรวมวงเงินโครงการของแผนกในปีนั้น
export function departmentProjectTotal(list: Project[], departmentId: string, year: number) {
  return list
    .filter((p) => p.departmentId === departmentId && p.year === year)
    .reduce((sum, p) => sum + projectLimit(p), 0);
}

// ปีที่ยังไม่เคยแบ่งงบ → ตั้งต้นจากวงเงินโครงการที่มีอยู่ แล้วรวมขึ้นไปทีละชั้น
export function allocationFromProjects(
  year: number,
  list: Project[],
  org: Organization,
): BudgetAllocation {
  const departments: Record<string, number> = {};
  for (const d of org.departments) departments[d.id] = departmentProjectTotal(list, d.id, year);

  const divisions: Record<string, number> = {};
  for (const v of org.divisions) {
    divisions[v.id] = org.departments
      .filter((d) => d.divisionId === v.id)
      .reduce((sum, d) => sum + departments[d.id], 0);
  }

  const lines: Record<string, number> = {};
  for (const l of org.linesOfWork) {
    lines[l.id] = org.divisions
      .filter((v) => v.lineOfWorkId === l.id)
      .reduce((sum, v) => sum + divisions[v.id], 0);
  }

  const boardTotal = Object.values(lines).reduce((sum, n) => sum + n, 0);
  return { year, boardTotal, lines, divisions, departments };
}

// ตรวจว่าแต่ละชั้นแบ่งไม่เกินชั้นบน · คืนรายการข้อผิดพลาด (ว่าง = ผ่าน)
export function validateAllocation(
  a: BudgetAllocation,
  org: Organization,
  list: Project[],
): string[] {
  const errs: string[] = [];
  const money = (n: number) => n.toLocaleString("en-US");
  const val = (rec: Record<string, number>, id: string) => rec[id] ?? 0;

  const all = [a.boardTotal, ...Object.values(a.lines), ...Object.values(a.divisions), ...Object.values(a.departments)];
  if (all.some((n) => !Number.isInteger(n) || n < 0)) errs.push("วงเงินทุกช่องต้องเป็นจำนวนเต็มตั้งแต่ 0");

  const linesSum = org.linesOfWork.reduce((s, l) => s + val(a.lines, l.id), 0);
  if (linesSum > a.boardTotal)
    errs.push(`แบ่งให้สายงานรวม ${money(linesSum)} เกินงบบอร์ด ${money(a.boardTotal)}`);

  for (const l of org.linesOfWork) {
    const sum = org.divisions
      .filter((v) => v.lineOfWorkId === l.id)
      .reduce((s, v) => s + val(a.divisions, v.id), 0);
    if (sum > val(a.lines, l.id))
      errs.push(`${l.name}: แบ่งให้ฝ่ายรวม ${money(sum)} เกินงบสายงาน ${money(val(a.lines, l.id))}`);
  }

  for (const v of org.divisions) {
    const sum = org.departments
      .filter((d) => d.divisionId === v.id)
      .reduce((s, d) => s + val(a.departments, d.id), 0);
    if (sum > val(a.divisions, v.id))
      errs.push(`${v.name}: แบ่งให้แผนกรวม ${money(sum)} เกินงบฝ่าย ${money(val(a.divisions, v.id))}`);
  }

  for (const d of org.departments) {
    const sum = departmentProjectTotal(list, d.id, a.year);
    if (sum > val(a.departments, d.id))
      errs.push(`${d.name}: วงเงินโครงการรวม ${money(sum)} เกินงบแผนก ${money(val(a.departments, d.id))}`);
  }

  return errs;
}
