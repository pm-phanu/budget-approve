// ════════════════════════════════════════════════════════════
//  รูปแบบ "คำขอเบิก 1 ใบ" ที่เก็บใน localStorage ("requests")
//  หน้าสร้างคำขอเป็นคนบันทึก · หน้าอนุมัติ / ประวัติ / รายงานอ่านไปใช้
// ════════════════════════════════════════════════════════════

import type { StepRole } from "./approval";

export const REQUESTS_KEY = "requests";

// สถานะของคำขอ
export type RequestStatus = "ร่าง" | "รออนุมัติ" | "ตีกลับ" | "อนุมัติแล้ว" | "จ่ายแล้ว";

// 1 แถวค่าใช้จ่าย
export type SavedItem = {
  categoryId: string; // รหัสหมวด เช่น "C01"
  categoryName: string; // ชื่อหมวด เช่น "ค่าเดินทาง"
  name: string; // รายละเอียด
  amount: number; // จำนวนเงิน
  files: string[]; // ชื่อไฟล์หลักฐานของแถวนี้
};

// 1 ขั้นในเส้นทางอนุมัติ
export type SavedStep = {
  role: StepRole; // ใครต้องทำขั้นนี้
  // คนที่ต้องอนุมัติขั้นนี้ (ใส่ตอนสร้างคำขอ ดู planApprovalSteps ใน data/approval.ts)
  // null = ใครก็ได้ใน role นี้ ยกเว้นผู้ขอเอง (ใช้กับขั้นบัญชี / การเงิน)
  // ※ optional เพราะคำขอเก่าใน localStorage ยังไม่มีฟิลด์นี้
  approverId?: string | null;
  label: string; // ชื่อภาษาไทย เช่น "หัวหน้าแผนก"
  status: "รอ" | "อนุมัติ" | "ตีกลับ";
  by: string | null; // ชื่อคนที่กด (ยังไม่กด = null)
  at: string | null; // เวลาที่กด
  note: string; // เหตุผล (ตอนตีกลับ)
};

// คำขอ 1 ใบ
export type SavedRequest = {
  id: string; // เลขที่คำขอ เช่น "REQ-1794659462071"
  createdAt: string; // สร้างเมื่อ
  updatedAt: string; // แก้ล่าสุดเมื่อ
  status: RequestStatus;
  type: "advance" | "invoice"; // advance = สำรองจ่าย · invoice = ใบแจ้งหนี้
  typeLabel: string; // ชื่อประเภทภาษาไทย
  title: string;
  useDate: string; // วันที่ใช้จ่าย
  reason: string;
  project: { id: string; name: string; dept: string } | null;
  items: SavedItem[];
  total: number;
  fileCount: number;
  requester: {
    id: string;
    fullName: string;
    role: string;
    departmentId?: string | null; // แผนกของผู้ขอ ณ วันที่ยื่น (data/organization.ts)
    department: string;
    lineOfWork: string;
    headId: string | null; // หัวหน้าของผู้ขอ
    directorId: string | null; // ผอ. ของผู้ขอ
  } | null;
  payTo: string; // จ่ายเงินให้ใคร
  bankAccount: string | null; // บัญชีรับเงินคืน (เฉพาะสำรองจ่าย)
  approvalSteps: SavedStep[];
  currentStep: number; // ขั้นที่ต้องทำต่อ (ลำดับใน approvalSteps)
  history: { action: string; by: string; at: string }[]; // บันทึกว่าใครทำอะไรเมื่อไหร่
};

// อ่านคำขอทั้งหมด (ยังไม่มี = ลิสต์ว่าง)
export function loadRequests(): SavedRequest[] {
  const stored = localStorage.getItem(REQUESTS_KEY);
  if (!stored) return [];
  return JSON.parse(stored);
}
