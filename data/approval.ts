// ════════════════════════════════════════════════════════════
//  กฎการอนุมัติตามวงเงิน
//  ใช้ร่วมกัน: หน้าสร้างคำขอ, หน้าอนุมัติ, หน้าตั้งค่า
// ════════════════════════════════════════════════════════════

import { getDirectorId, getHeadId, type Organization } from "./organization";
import type { SavedRequest } from "./request";

// บทบาทในเส้นทางอนุมัติ (ชื่อตรงกับ role ใน data/credential.ts)
export type StepRole = "HEAD" | "DIRECTOR" | "MANAGING_DIRECTOR" | "ACCOUNTANT_ADMIN" | "FINANCE";
export type ApprovalRule = { max: number | null; approvers: StepRole[] };

// วงเงินตั้งค่าได้: หน้าตั้งค่าบันทึกลง localStorage "approvalRules" แล้วหน้าอื่นอ่านไปใช้
// max = เพดานของช่วง (null = ไม่มีเพดาน) · ต้องเรียงจากน้อยไปมาก
export const APPROVAL_RULES_KEY = "approvalRules";
export const DEFAULT_RULES: ApprovalRule[] = [
  { max: 3000, approvers: [] }, //                            ≤ 3,000 ไม่ผ่านหัวหน้า
  { max: 30000, approvers: ["HEAD"] }, //                     3,001 – 30,000
  { max: 300000, approvers: ["HEAD", "DIRECTOR"] }, //        30,001 – 300,000
  { max: null, approvers: ["HEAD", "DIRECTOR", "MANAGING_DIRECTOR"] }, //    300,001 ขึ้นไป
];

export const ROLE_LABEL: Record<StepRole, string> = {
  HEAD: "หัวหน้าแผนก",
  DIRECTOR: "ผอ.ฝ่าย",
  MANAGING_DIRECTOR: "กรรมการผู้จัดการ",
  ACCOUNTANT_ADMIN: "ฝ่ายบัญชี",
  FINANCE: "การเงิน",
};

// ยอดรวม → ลิสต์ผู้อนุมัติตามลำดับ · ทุกช่วงจบที่ บัญชี → การเงิน
// ※ find() หยุดที่ช่วงแรกที่ยอดไม่เกิน max
export function getApprovalSteps(total: number, rules: ApprovalRule[] = DEFAULT_RULES): StepRole[] {
  const rule = rules.find((r) => r.max === null || total <= r.max);
  const approvers = rule ? rule.approvers : [];
  return [...approvers, "ACCOUNTANT_ADMIN", "FINANCE"];
}

// ════════════════════════════════════════════════════════════
//  ใครต้องอนุมัติแต่ละขั้น (ใส่ approverId ตั้งแต่ตอนสร้างคำขอ)
//
//  กฎ
//  1) หัวหน้า / ผอ. / กรรมการผู้จัดการ หาจากผังองค์กรของผู้ขอ
//  2) ห้ามอนุมัติคำขอของตัวเอง → ตำแหน่งนั้นเป็นผู้ขอเอง หรือยังว่าง
//     ให้ส่งขึ้นไปตำแหน่งที่สูงกว่า (หัวหน้า → ผอ. → กรรมการผู้จัดการ)
//     ถ้าตำแหน่งที่สูงกว่าอยู่ในเส้นทางอยู่แล้ว ก็ตัดขั้นนี้ทิ้ง (ไม่อนุมัติซ้ำ)
//  3) ฝ่ายบัญชี / การเงิน: approverId = null → ใครก็ได้ใน role นั้น ยกเว้นผู้ขอ
// ════════════════════════════════════════════════════════════

export type PlannedStep = { role: StepRole; approverId: string | null };

type Requester = { id: string; departmentId?: string | null };

// ลำดับขั้นของผู้อนุมัติในสายบังคับบัญชา (ต่ำ → สูง)
const CHAIN: StepRole[] = ["HEAD", "DIRECTOR", "MANAGING_DIRECTOR"];

// คนที่ดำรงตำแหน่ง role นี้ เหนือผู้ขอ (ไม่มี = null)
function holderOf(role: StepRole, requester: Requester, org: Organization): string | null {
  const deptId = requester.departmentId ?? null;
  if (role === "HEAD") return deptId ? getHeadId(org, deptId) : null;
  if (role === "DIRECTOR") return deptId ? getDirectorId(org, deptId) : null;
  if (role === "MANAGING_DIRECTOR") return org.managingDirectorId;
  return null;
}

export function planApprovalSteps(
  total: number,
  requester: Requester,
  org: Organization,
  rules: ApprovalRule[] = DEFAULT_RULES,
): PlannedStep[] {
  const roles = getApprovalSteps(total, rules);
  const chainRoles = roles.filter((r) => CHAIN.includes(r));
  const planned: PlannedStep[] = [];

  for (const role of chainRoles) {
    // ไล่ขึ้นจาก role นี้จนเจอคนที่อนุมัติได้ (มีตัวตน และไม่ใช่ผู้ขอ)
    for (let i = CHAIN.indexOf(role); i < CHAIN.length; i++) {
      const candidateRole = CHAIN[i];
      const holder = holderOf(candidateRole, requester, org);
      if (!holder || holder === requester.id) continue;

      // ตำแหน่งที่สูงกว่าอยู่ในเส้นทางอยู่แล้ว / เพิ่มไปแล้ว → ไม่ต้องซ้ำ
      const alreadyPlanned = planned.some((p) => p.role === candidateRole);
      const laterInRoute = candidateRole !== role && chainRoles.includes(candidateRole);
      if (!alreadyPlanned && !laterInRoute) {
        planned.push({ role: candidateRole, approverId: holder });
      }
      break;
    }
    // ไล่จนสุดแล้วไม่มีใครเลย (เช่น กรรมการผู้จัดการยื่นเอง) → ข้ามขั้นนี้
  }

  return [
    ...planned,
    { role: "ACCOUNTANT_ADMIN", approverId: null },
    { role: "FINANCE", approverId: null },
  ];
}

// ════════════════════════════════════════════════════════════
//  ผู้ใช้คนนี้อนุมัติขั้นปัจจุบันของคำขอได้ไหม
//  ใช้ร่วมกัน: หน้าอนุมัติ (canAct), หน้าคำขอรออนุมัติ (isMyTurn)
// ════════════════════════════════════════════════════════════
export function canApproveStep(
  request: SavedRequest,
  user: { id: string; role: string } | null,
): boolean {
  if (!user || request.status !== "รออนุมัติ") return false;

  const step = request.approvalSteps[request.currentStep];
  if (!step || step.status !== "รอ") return false;

  // ห้ามอนุมัติคำขอของตัวเอง
  if (request.requester && String(request.requester.id) === String(user.id)) return false;

  // มีผู้อนุมัติที่ระบุตัวไว้แล้ว → ต้องเป็นคนนั้นเท่านั้น
  if (step.approverId) return step.approverId === user.id;

  // ไม่ระบุตัว (บัญชี / การเงิน) → role ต้องตรง
  if (step.role !== user.role) return false;

  // คำขอเก่าที่ยังไม่มี approverId: หัวหน้า / ผอ. ต้องเป็นของผู้ขอจริง
  const owner =
    step.role === "HEAD"
      ? request.requester?.headId
      : step.role === "DIRECTOR"
        ? request.requester?.directorId
        : null;
  return !owner || owner === user.id;
}
