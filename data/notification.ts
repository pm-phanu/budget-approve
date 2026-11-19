// ════════════════════════════════════════════════════════════
//  แจ้งเตือน — localStorage "notifications"
//
//  สร้างทุกครั้งที่สถานะคำขอเปลี่ยน (ดู notifyRequestEvent)
//    ส่งคำขอ        → ผู้อนุมัติขั้นแรก: "มีคำขอรอคุณอนุมัติ"
//    อนุมัติ 1 ขั้น   → ผู้ขอ: "<ขั้น> อนุมัติแล้ว รอ<ขั้นถัดไป>" + ผู้อนุมัติขั้นถัดไป
//    อนุมัติครบ      → ผู้ขอ: "อนุมัติครบแล้ว"
//    ตีกลับ         → ผู้ขอ: "ถูกตีกลับ" + เหตุผล
//    ทำจ่าย         → ผู้ขอ: "ได้รับเงินแล้ว"
//
//  ใช้ร่วมกัน: หน้าสร้างคำขอ, หน้าอนุมัติ, กระดิ่งบน header, การ์ด "แจ้งเตือนล่าสุด"
// ════════════════════════════════════════════════════════════

import { isInApproverScope, loadOrganization } from "./organization";
import type { SavedRequest, SavedStep } from "./request";

export const NOTIFICATIONS_KEY = "notifications";

export type NotificationKind =
  | "waiting_you" // มีคำขอรอคุณอนุมัติ
  | "progress" // คำขอของคุณผ่านไป 1 ขั้น
  | "approved" // คำขอของคุณอนุมัติครบแล้ว
  | "rejected" // คำขอของคุณถูกตีกลับ
  | "paid"; // ได้รับเงินแล้ว

export type AppNotification = {
  id: string;
  userId: string; // คนที่ได้รับแจ้งเตือน
  requestId: string;
  requestTitle: string; // ชื่อคำขอ (แสดงตัวหนา)
  kind: NotificationKind;
  message: string; // ข้อความหลังชื่อคำขอ เช่น "หัวหน้าแผนกอนุมัติแล้ว รอฝ่ายบัญชีตรวจ"
  read: boolean;
  createdAt: string; // ISO
};

export type RequestEvent = "submitted" | "approved" | "rejected" | "paid";

// ผู้ใช้ขั้นต่ำที่ต้องรู้ (ส่ง getUsers() มาได้เลย)
type UserLite = {
  id: string;
  role: string;
  status?: string;
  departmentId?: string | null;
  divisionId?: string | null;
};

// ────────────────────────────────────────────────────────────
//  อ่าน / บันทึก
// ────────────────────────────────────────────────────────────
export function loadNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    return stored ? (JSON.parse(stored) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

export function saveNotifications(list: AppNotification[]) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
}

export function addNotifications(list: AppNotification[]) {
  if (list.length === 0) return;
  saveNotifications([...loadNotifications(), ...list]);
}

// ────────────────────────────────────────────────────────────
//  ใช้แสดงผล
// ────────────────────────────────────────────────────────────

// แจ้งเตือนของผู้ใช้ (ใหม่ → เก่า) · limit = เอากี่รายการ
export function getNotifications(userId: string, limit?: number) {
  const mine = loadNotifications()
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return limit === undefined ? mine : mine.slice(0, limit);
}

// จำนวนที่ยังไม่อ่าน (จุดแดงบนกระดิ่ง)
export function countUnread(userId: string) {
  return loadNotifications().filter((n) => n.userId === userId && !n.read).length;
}

export function markAsRead(notificationId: string) {
  saveNotifications(
    loadNotifications().map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
  );
}

export function markAllAsRead(userId: string) {
  saveNotifications(
    loadNotifications().map((n) => (n.userId === userId ? { ...n, read: true } : n)),
  );
}

// ────────────────────────────────────────────────────────────
//  สร้างแจ้งเตือนจากเหตุการณ์ของคำขอ
// ────────────────────────────────────────────────────────────

// คำกริยาของแต่ละขั้น (ใช้ต่อท้าย "รอ...")
function waitingText(step: SavedStep) {
  if (step.role === "ACCOUNTANT_ADMIN") return `รอ${step.label}ตรวจ`;
  if (step.role === "FINANCE") return `รอ${step.label}ทำจ่าย`;
  return `รอ${step.label}อนุมัติ`;
}

// คนที่ต้องทำขั้นนี้: ระบุตัวไว้ (approverId) → คนนั้น · ไม่ระบุ → ทุกคนใน role นั้น (ยกเว้นผู้ขอ)
// ที่อยู่ในขอบเขตสังกัดของผู้ขอ (หัวหน้า = แผนกเดียวกัน · ผอ. = ฝ่ายเดียวกัน · isInApproverScope)
function recipientsOf(step: SavedStep, request: SavedRequest, users: UserLite[]): string[] {
  const requesterId = request.requester ? String(request.requester.id) : null;
  if (step.approverId) return step.approverId === requesterId ? [] : [step.approverId];

  const role = step.actingRole ?? step.role; // ทางสำรอง → แจ้ง MD
  // หัวหน้า/ผอ. โดยตรงของผู้ขอ → แจ้งคนนั้นคนเดียว
  const direct =
    role === "HEAD" ? request.requester?.headId : role === "DIRECTOR" ? request.requester?.directorId : null;
  if (direct) return direct === requesterId ? [] : [direct];

  const deptId = request.requester?.departmentId ?? null;
  const org = loadOrganization();
  return users
    .filter(
      (u) =>
        u.role === role &&
        u.status !== "INACTIVE" &&
        u.id !== requesterId &&
        (!deptId || isInApproverScope(org, role, u, deptId)),
    )
    .map((u) => u.id);
}

// เรียกหลังบันทึกคำขอแล้ว (request = สถานะล่าสุด) · คืนแจ้งเตือนที่สร้าง (ยังไม่บันทึก)
export function buildRequestNotifications(
  request: SavedRequest,
  event: RequestEvent,
  users: UserLite[],
  options: { note?: string; actedStep?: SavedStep; at?: string } = {},
): AppNotification[] {
  const at = options.at ?? new Date().toISOString();
  const requesterId = request.requester ? String(request.requester.id) : null;
  const out: AppNotification[] = [];

  const push = (userId: string, kind: NotificationKind, message: string) =>
    out.push({
      id: `NT-${Date.now()}-${out.length}-${userId}`,
      userId,
      requestId: request.id,
      requestTitle: request.title,
      kind,
      message,
      read: false,
      createdAt: at,
    });

  const current = request.approvalSteps[request.currentStep];
  const notifyNextApprovers = () => {
    if (!current || current.status !== "รอ" || request.status !== "รออนุมัติ") return;
    for (const id of recipientsOf(current, request, users)) {
      push(id, "waiting_you", "มีคำขอรอคุณอนุมัติ");
    }
  };

  if (event === "submitted") {
    notifyNextApprovers();
  }

  if (event === "approved") {
    const acted = options.actedStep;
    if (request.status === "อนุมัติแล้ว") {
      if (requesterId) push(requesterId, "approved", "อนุมัติครบแล้ว รอทำจ่าย");
    } else {
      if (requesterId) {
        const by = acted ? `${acted.label}อนุมัติแล้ว` : "อนุมัติแล้ว";
        const next = current ? ` ${waitingText(current)}` : "";
        push(requesterId, "progress", by + next);
      }
      notifyNextApprovers();
    }
  }

  if (event === "rejected" && requesterId) {
    const by = options.actedStep ? `ถูก${options.actedStep.label}ตีกลับ` : "ถูกตีกลับ";
    push(requesterId, "rejected", options.note ? `${by}: ${options.note}` : by);
  }

  if (event === "paid" && requesterId) {
    push(requesterId, "paid", "ได้รับเงินแล้ว");
  }

  return out;
}

// สร้าง + บันทึกในครั้งเดียว
export function notifyRequestEvent(
  request: SavedRequest,
  event: RequestEvent,
  users: UserLite[],
  options: { note?: string; actedStep?: SavedStep; at?: string } = {},
) {
  const list = buildRequestNotifications(request, event, users, options);
  addNotifications(list);
  return list;
}
