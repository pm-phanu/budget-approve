// ════════════════════════════════════════════════════════════
//  กฎการอนุมัติตามวงเงิน
//  ใช้ร่วมกัน: หน้าสร้างคำขอ, หน้าอนุมัติ, หน้าตั้งค่า
// ════════════════════════════════════════════════════════════

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
