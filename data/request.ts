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
  byId?: string | null; // id คนที่กด (ใช้หา "ประวัติการอนุมัติ" · คำขอเก่าไม่มี → เทียบจากชื่อ)
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
  history: HistoryEntry[]; // บันทึกว่าใครทำอะไรเมื่อไหร่ (เพิ่มต่อท้ายเสมอ ไม่ลบ ไม่แก้)
};

// ════════════════════════════════════════════════════════════
//  ประวัติ (Audit log) — 1 รายการต่อ 1 การกระทำบนคำขอ
//  ※ ฟิลด์ใหม่เป็น optional เพราะหน้าอนุมัติเดิมยังบันทึกแค่ { action, by, at }
// ════════════════════════════════════════════════════════════
export type HistoryType = "บันทึกร่าง" | "ส่งคำขอ" | "ส่งใหม่" | "อนุมัติ" | "ตีกลับ" | "ทำจ่าย";

export type HistoryEntry = {
  action: string; // ข้อความที่แสดง เช่น "อนุมัติ: หัวหน้าแผนก"
  by: string; // ชื่อคนทำ
  at: string; // เวลา (ISO)
  type?: HistoryType; // ประเภท (ใช้กรอง) · ไม่มี = เดาจาก action ด้วย historyType()
  byId?: string | null; // id คนทำ
  role?: string; // role คนทำ ณ ตอนนั้น
  note?: string; // เหตุผล / ความเห็น
};

// สร้างรายการประวัติ 1 รายการ (ใช้ตอนบันทึกคำขอ / อนุมัติ / ตีกลับ)
export function makeHistory(
  type: HistoryType,
  user: { id: string; fullName: string; role: string } | null,
  options: { action?: string; note?: string; at?: string } = {},
): HistoryEntry {
  return {
    type,
    action: options.action ?? type,
    by: user ? user.fullName : "-",
    byId: user ? user.id : null,
    role: user ? user.role : undefined,
    at: options.at ?? new Date().toISOString(),
    ...(options.note ? { note: options.note } : {}),
  };
}

// ประเภทของรายการ · ข้อมูลเก่าไม่มี type → ดูจากคำขึ้นต้นของ action
export function historyType(entry: HistoryEntry): HistoryType | null {
  if (entry.type) return entry.type;
  const types: HistoryType[] = ["บันทึกร่าง", "ส่งคำขอ", "ส่งใหม่", "อนุมัติ", "ตีกลับ", "ทำจ่าย"];
  return types.find((t) => entry.action.startsWith(t)) ?? null;
}

// ไทม์ไลน์ของคำขอ (เก่า → ใหม่)
export function getTimeline(request: SavedRequest): HistoryEntry[] {
  return [...request.history].sort((a, b) => a.at.localeCompare(b.at));
}

// "ประวัติการอนุมัติ" ของผู้ใช้: คำขอที่คนนี้อนุมัติ / ตีกลับไปแล้ว (ใหม่ → เก่า)
// ดูจาก approvalSteps · มี byId ใช้ byId · คำขอเก่าไม่มี → เทียบชื่อ
export function getActedRequests(
  requests: SavedRequest[],
  user: { id: string; fullName: string },
) {
  const rows: { request: SavedRequest; step: SavedStep }[] = [];
  for (const request of requests) {
    for (const step of request.approvalSteps) {
      if (step.status === "รอ") continue;
      const isMine = step.byId ? step.byId === user.id : step.by === user.fullName;
      if (isMine) rows.push({ request, step });
    }
  }
  return rows.sort((a, b) => (b.step.at ?? "").localeCompare(a.step.at ?? ""));
}

// "ประวัติการเบิก" ของผู้ใช้: คำขอของตัวเองที่จบแล้ว (อนุมัติแล้ว / จ่ายแล้ว / ตีกลับ) ใหม่ → เก่า
export function getMyFinishedRequests(requests: SavedRequest[], userId: string) {
  return requests
    .filter(
      (r) =>
        r.requester &&
        String(r.requester.id) === String(userId) &&
        (r.status === "อนุมัติแล้ว" || r.status === "จ่ายแล้ว" || r.status === "ตีกลับ"),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// อ่านคำขอทั้งหมด (ยังไม่มี = ลิสต์ว่าง)
export function loadRequests(): SavedRequest[] {
  const stored = localStorage.getItem(REQUESTS_KEY);
  if (!stored) return [];
  return JSON.parse(stored);
}
