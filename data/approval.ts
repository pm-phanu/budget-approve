// ════════════════════════════════════════════════════════════
//  กฎการอนุมัติตามวงเงิน + ตำแหน่งผู้อนุมัติ
//  ใช้ร่วมกัน: หน้าสร้างคำขอ, หน้าอนุมัติ, หน้าตั้งค่า
//
//  ตำแหน่งผู้อนุมัติ (ApproverPosition) เก็บเป็นข้อมูล → ฝ่ายบัญชีเพิ่มตำแหน่งใหม่ได้เอง
//    ในตัว (แก้ไม่ได้): หัวหน้าแผนก / ผอ.ฝ่าย / กรรมการผู้จัดการ → หาตัวคนจากผังองค์กร
//    เพิ่มเอง: ใครก็ได้ที่มี role = id ของตำแหน่งนั้น (ยกเว้นผู้ขอ)
//  ทุกเส้นทางจบที่ ฝ่ายบัญชี → การเงิน เสมอ (ตั้งในกฎไม่ได้)
// ════════════════════════════════════════════════════════════

import { getUsers } from "./credential";
import { notifyRequestEvent } from "./notification";
import {
  getDirectorId,
  getHeadId,
  isInApproverScope,
  loadOrganization,
  type Organization,
} from "./organization";
import {
  REQUESTS_KEY,
  loadRequests,
  makeHistory,
  type SavedRequest,
  type SavedStep,
} from "./request";

// role ของขั้นอนุมัติ: ตำแหน่งในตัว / ตำแหน่งที่เพิ่มเอง (เช่น "POS_1794...") / บัญชี / การเงิน
export type StepRole = string;

export type ApprovalRule = { max: number | null; approvers: StepRole[] };

// ════════════════════════════════════════════════════════════
//  ตำแหน่งผู้อนุมัติ (localStorage "approverPositions")
// ════════════════════════════════════════════════════════════
export type PositionResolve =
  | "DEPT_HEAD" // หัวหน้าแผนกของผู้ขอ
  | "DIVISION_DIRECTOR" // ผอ. ฝ่ายของผู้ขอ
  | "COMPANY_MD" // กรรมการผู้จัดการ
  | "ANY_WITH_ROLE"; // ใครก็ได้ที่มี role นี้

export type ApproverPosition = {
  id: string; // = role ของ user ที่ดำรงตำแหน่งนี้
  label: string; // ชื่อที่แสดง
  resolve: PositionResolve;
  builtIn: boolean; // ตำแหน่งในตัว → ลบ / แก้ชื่อไม่ได้
};

export const POSITIONS_KEY = "approverPositions";

export const DEFAULT_POSITIONS: ApproverPosition[] = [
  { id: "HEAD", label: "หัวหน้าแผนก", resolve: "DEPT_HEAD", builtIn: true },
  { id: "DIRECTOR", label: "ผอ.ฝ่าย", resolve: "DIVISION_DIRECTOR", builtIn: true },
  { id: "MANAGING_DIRECTOR", label: "กรรมการผู้จัดการ", resolve: "COMPANY_MD", builtIn: true },
];

// ขั้นท้ายที่ต่อให้เสมอ
export const FINAL_STEPS: StepRole[] = ["ACCOUNTANT_ADMIN", "FINANCE"];

// ชื่อ role ในตัว (ตำแหน่งที่เพิ่มเองใช้ getRoleLabel)
export const ROLE_LABEL: Record<string, string> = {
  HEAD: "หัวหน้าแผนก",
  DIRECTOR: "ผอ.ฝ่าย",
  MANAGING_DIRECTOR: "กรรมการผู้จัดการ",
  ACCOUNTANT_ADMIN: "ฝ่ายบัญชี",
  FINANCE: "การเงิน",
};

// ตำแหน่งทั้งหมด = ในตัว (เสมอ) + ที่เพิ่มเอง
export function loadPositions(): ApproverPosition[] {
  if (typeof window === "undefined") return DEFAULT_POSITIONS;
  try {
    const stored = localStorage.getItem(POSITIONS_KEY);
    const custom = stored
      ? (JSON.parse(stored) as ApproverPosition[]).filter((p) => !p.builtIn)
      : [];
    return [...DEFAULT_POSITIONS, ...custom];
  } catch {
    return DEFAULT_POSITIONS;
  }
}

// บันทึกเฉพาะตำแหน่งที่เพิ่มเอง (ตำแหน่งในตัวมาจากโค้ดเสมอ)
export function savePositions(positions: ApproverPosition[]) {
  localStorage.setItem(
    POSITIONS_KEY,
    JSON.stringify(positions.filter((p) => !p.builtIn)),
  );
}

// สร้างตำแหน่งใหม่ (ยังไม่บันทึก) · id ใช้เป็น role ของ user ด้วย
export function createPosition(label: string): ApproverPosition {
  return {
    id: `POS_${Date.now()}`,
    label: label.trim(),
    resolve: "ANY_WITH_ROLE",
    builtIn: false,
  };
}

// role นี้เป็นผู้อนุมัติไหม (ใช้เปิดเมนู "คำขอรออนุมัติทั้งหมด" / "ประวัติการอนุมัติ")
// = ตำแหน่งผู้อนุมัติทั้งหมด (รวมที่เพิ่มเอง) + ฝ่ายบัญชี / การเงิน
export function isApproverRole(role: string, positions: ApproverPosition[] = loadPositions()) {
  return FINAL_STEPS.includes(role) || positions.some((p) => p.id === role);
}

// ทำ role ที่มีอยู่แล้วใน users ให้เป็นตำแหน่งผู้อนุมัติ (ยังไม่บันทึก)
// → ผู้ใช้ทุกคนที่มี role นี้อนุมัติได้ (ยกเว้นผู้ขอ)
export function createPositionFromRole(role: string, label: string): ApproverPosition {
  return { id: role, label, resolve: "ANY_WITH_ROLE", builtIn: false };
}

export function getRoleLabel(role: string, positions: ApproverPosition[] = loadPositions()) {
  return positions.find((p) => p.id === role)?.label ?? ROLE_LABEL[role] ?? role;
}

// ════════════════════════════════════════════════════════════
//  กฎ (localStorage "approvalRules")
// ════════════════════════════════════════════════════════════
export const APPROVAL_RULES_KEY = "approvalRules";
export const DEFAULT_RULES: ApprovalRule[] = [
  { max: 3000, approvers: [] }, //                            ≤ 3,000 ไม่ผ่านหัวหน้า
  { max: 30000, approvers: ["HEAD"] }, //                     3,001 – 30,000
  { max: 300000, approvers: ["HEAD", "DIRECTOR"] }, //        30,001 – 300,000
  { max: null, approvers: ["HEAD", "DIRECTOR", "MANAGING_DIRECTOR"] }, //    300,001 ขึ้นไป
];

// ※ เดิมใช้บังคับลำดับ · ตอนนี้เรียงได้อิสระ เก็บไว้ให้โค้ดเดิมที่ import อยู่
export const RULE_APPROVER_ORDER: StepRole[] = DEFAULT_POSITIONS.map((p) => p.id);

// ยอดรวม → ลิสต์ role ตามลำดับ · ทุกช่วงจบที่ บัญชี → การเงิน
// ※ find() หยุดที่ช่วงแรกที่ยอดไม่เกิน max
export function getApprovalSteps(total: number, rules: ApprovalRule[] = DEFAULT_RULES): StepRole[] {
  const rule = rules.find((r) => r.max === null || total <= r.max);
  const approvers = rule ? rule.approvers : [];
  return [...approvers, ...FINAL_STEPS];
}

// ตรวจกฎ → ลิสต์ข้อความผิดพลาด (ว่าง = ถูกต้อง)
export function validateApprovalRules(
  rules: ApprovalRule[],
  positions: ApproverPosition[] = loadPositions(),
): string[] {
  const errors: string[] = [];
  if (!Array.isArray(rules) || rules.length === 0) return ["ต้องมีอย่างน้อย 1 ช่วง"];

  rules.forEach((r, i) => {
    const n = i + 1;
    const isLast = i === rules.length - 1;

    // เพดาน: ทุกช่วงต้องมีตัวเลข ยกเว้นช่วงสุดท้าย (= ขึ้นไป) ต้องเป็น null
    if (isLast && r.max !== null) errors.push(`ช่วงสุดท้ายต้องเป็น "ขึ้นไป" (ไม่มีเพดาน)`);
    if (!isLast) {
      if (r.max === null || !Number.isInteger(r.max) || r.max <= 0) {
        errors.push(`ช่วงที่ ${n}: เพดานต้องเป็นจำนวนเต็มมากกว่า 0`);
      } else {
        const prev = i > 0 ? rules[i - 1].max : 0;
        if (prev !== null && r.max <= prev) {
          errors.push(`ช่วงที่ ${n}: เพดานต้องมากกว่าช่วงก่อนหน้า (${prev.toLocaleString("en-US")})`);
        }
      }
    }

    // ผู้อนุมัติ: ต้องเป็นตำแหน่งที่มีอยู่ · ไม่ซ้ำ · เรียงลำดับได้อิสระ
    if (r.approvers.some((a) => !positions.some((p) => p.id === a))) {
      errors.push(`ช่วงที่ ${n}: มีตำแหน่งผู้อนุมัติที่ไม่มีอยู่แล้ว (อาจถูกลบไป)`);
    }
    if (new Set(r.approvers).size !== r.approvers.length) {
      errors.push(`ช่วงที่ ${n}: เลือกตำแหน่งผู้อนุมัติซ้ำ`);
    }
  });

  return errors;
}

export function loadApprovalRules(): ApprovalRule[] {
  if (typeof window === "undefined") return DEFAULT_RULES;
  try {
    const stored = localStorage.getItem(APPROVAL_RULES_KEY);
    if (!stored) return DEFAULT_RULES;
    const parsed = JSON.parse(stored) as ApprovalRule[];
    // ข้อมูลในเครื่องผิดรูปแบบ → ใช้ค่าเริ่มต้น (ไม่ให้หน้าสร้างคำขอพัง)
    return validateApprovalRules(parsed).length === 0 ? parsed : DEFAULT_RULES;
  } catch {
    return DEFAULT_RULES;
  }
}

// บันทึก · กฎผิด → throw พร้อมข้อความ (หน้าตั้งค่าเอาไปแสดงได้)
export function saveApprovalRules(rules: ApprovalRule[], positions?: ApproverPosition[]) {
  const errors = validateApprovalRules(rules, positions);
  if (errors.length > 0) throw new Error(errors.join("\n"));
  localStorage.setItem(APPROVAL_RULES_KEY, JSON.stringify(rules));
}

// กลับไปใช้ค่าเริ่มต้นตาม requirement
export function resetApprovalRules() {
  localStorage.removeItem(APPROVAL_RULES_KEY);
}

// กฎ → ช่วงพร้อมยอดต่ำสุด (ใช้แสดงในหน้าตั้งค่า เช่น 0 – 3,000 / 3,001 – 30,000 / 300,001 ขึ้นไป)
export function getRuleRanges(rules: ApprovalRule[]) {
  return rules.map((r, i) => {
    const prevMax = i > 0 ? rules[i - 1].max : null;
    return { min: prevMax === null ? 0 : prevMax + 1, max: r.max, approvers: r.approvers };
  });
}

// ════════════════════════════════════════════════════════════
//  เส้นทางอนุมัติของคำขอ = ตรงตาม Approval Matrix เสมอ (ไม่ข้าม · ไม่ส่งขึ้นชั้นบนเอง)
//    ขั้นตามช่วงวงเงินที่ตั้งไว้ → ต่อท้ายด้วย ฝ่ายบัญชี → การเงิน
//    ทุกขั้น approverId = null → ใครก็ได้ใน role นั้นที่อยู่ในขอบเขตสังกัด (ยกเว้นผู้ขอ)
//      หัวหน้า = แผนกเดียวกับผู้ขอ · ผอ. = ฝ่ายเดียวกัน · อื่นๆ = ทั้งบริษัท (canApproveStep)
//    hasApprover = ขั้นนี้มีคนอนุมัติได้จริงไหม → ไม่มี = หน้าสร้างคำขอไม่ให้ส่ง + แจ้งเหตุผล
//      (เช่น แผนกยังไม่มีหัวหน้า / หัวหน้ายื่นเองและไม่มีหัวหน้าคนอื่น)
// ════════════════════════════════════════════════════════════

export type PlannedStep = { role: StepRole; approverId: string | null; hasApprover: boolean };

type Requester = { id: string; departmentId?: string | null };

// คนที่ผังองค์กรกำหนดให้ดำรงตำแหน่งในตัวนี้ เหนือผู้ขอ (ไม่มี = null)
function holderOf(role: StepRole, requester: Requester, org: Organization): string | null {
  const deptId = requester.departmentId ?? null;
  if (role === "HEAD") return deptId ? getHeadId(org, deptId) : null;
  if (role === "DIRECTOR") return deptId ? getDirectorId(org, deptId) : null;
  if (role === "MANAGING_DIRECTOR") return org.managingDirectorId;
  return null;
}

type ScopeCandidate = {
  id: string;
  role: string;
  departmentId?: string | null;
  divisionId?: string | null;
  status?: string;
};

// มีคน (ที่ไม่ใช่ผู้ขอ) อนุมัติขั้นนี้ได้ในขอบเขตสังกัดของผู้ขอไหม
// = ผู้ใช้ role ตรง + ACTIVE + อยู่ในขอบเขต  หรือ คนที่ผังองค์กรกำหนดไว้ (headId / directorId / MD)
function hasApproverInScope(
  role: StepRole,
  requester: Requester,
  org: Organization,
  users: ScopeCandidate[],
) {
  const holder = holderOf(role, requester, org);
  if (holder && holder !== requester.id) return true;
  return users.some(
    (u) =>
      u.role === role &&
      u.status !== "INACTIVE" &&
      u.id !== requester.id &&
      isInApproverScope(org, role, u, requester.departmentId),
  );
}

export function planApprovalSteps(
  total: number,
  requester: Requester,
  org: Organization,
  rules: ApprovalRule[] = DEFAULT_RULES,
  positions: ApproverPosition[] = DEFAULT_POSITIONS,
  users: ScopeCandidate[] = typeof window === "undefined" ? [] : getUsers(),
): PlannedStep[] {
  const rule = rules.find((r) => r.max === null || total <= r.max);
  const approvers = (rule ? rule.approvers : []).filter(
    // ตำแหน่งที่ถูกลบไปแล้ว / ซ้ำ → ข้าม
    (role, i, list) => positions.some((p) => p.id === role) && list.indexOf(role) === i,
  );

  return [...approvers, ...FINAL_STEPS].map((role) => ({
    role,
    approverId: null,
    hasApprover: hasApproverInScope(role, requester, org, users),
  }));
}

// ════════════════════════════════════════════════════════════
//  ผู้ใช้คนนี้อนุมัติขั้นปัจจุบันของคำขอได้ไหม
//  ใช้ร่วมกัน: หน้าอนุมัติ (canAct), หน้าคำขอรออนุมัติ (isMyTurn)
// ════════════════════════════════════════════════════════════
//  ผูกตามสังกัด: role ต้องตรงกับขั้น + อยู่ในขอบเขต (isInApproverScope ใน organization.ts)
//    หัวหน้า → แผนกเดียวกับผู้ขอ · ผอ. → ฝ่ายเดียวกับผู้ขอ · อื่นๆ → ทั้งบริษัท
//    มีหลายคนในขอบเขต → คนไหนก็ได้ (กดซ้อนกันได้คนเดียว ดู actOnRequest)
//  ห้ามอนุมัติคำขอของตัวเองเสมอ
export function canApproveStep(
  request: SavedRequest,
  user: { id: string; role: string; departmentId?: string | null } | null,
  org: Organization = loadOrganization(),
): boolean {
  if (!user || request.status !== "รออนุมัติ") return false;

  const step = request.approvalSteps[request.currentStep];
  if (!step || step.status !== "รอ") return false;

  // ห้ามอนุมัติคำขอของตัวเอง
  if (request.requester && String(request.requester.id) === String(user.id)) return false;

  const deptId = request.requester?.departmentId ?? null;

  // คำขอเก่าที่ไม่มีแผนกของผู้ขอ แต่ระบุตัวผู้อนุมัติไว้ → ต้องเป็นคนนั้น
  if (!deptId && step.approverId) return step.approverId === user.id;

  if (step.role !== user.role) return false;

  // มีแผนกของผู้ขอ → ดูขอบเขตตามสังกัด
  if (deptId) return isInApproverScope(org, step.role, user, deptId);

  // คำขอเก่าที่ไม่มีทั้งแผนกและ approverId: หัวหน้า / ผอ. ต้องเป็นของผู้ขอจริง
  const owner =
    step.role === "HEAD"
      ? request.requester?.headId
      : step.role === "DIRECTOR"
        ? request.requester?.directorId
        : null;
  return !owner || owner === user.id;
}

// ════════════════════════════════════════════════════════════
//  อนุมัติ / ตีกลับ แบบปลอดภัย (กันกดซ้อน)
//
//  ตำแหน่งแบบ "ใครก็ได้ใน role" มีหลายคนเปิดคำขอเดียวกันได้พร้อมกัน
//    A เปิด → B เปิด → A กดอนุมัติ → B (ยังเห็นหน้าเดิม) กดอนุมัติ
//  ฟังก์ชันนี้อ่านคำขอล่าสุดจาก localStorage ก่อนบันทึกทุกครั้ง แล้วเช็คว่า
//    ยังเป็นขั้นเดิม (expectedStep) และยังไม่มีใครกด → ถ้าไม่ใช่ ไม่บันทึก + บอกว่าใครกดไปแล้ว
//  ※ หน้าจอส่ง expectedStep = currentStep ตอนที่เปิดหน้า
// ════════════════════════════════════════════════════════════
export type ActResult =
  | { ok: true; request: SavedRequest; actedStep: SavedStep }
  | { ok: false; reason: string };

export function actOnRequest(
  requestId: string,
  user: { id: string; fullName: string; role: string } | null,
  action: "approve" | "reject",
  options: {
    expectedStep: number;
    note?: string;
    historyNote?: string;
    // ฟิลด์เพิ่มเติมที่หน้าจอเก็บไว้ในคำขอ (เช่น reviewedAt, reject) · ได้เวลาเดียวกับที่บันทึก
    extra?: (now: string, byName: string) => Record<string, unknown>;
  },
): ActResult {
  if (!user) return { ok: false, reason: "กรุณาเข้าสู่ระบบก่อน" };

  const all = loadRequests();
  const idx = all.findIndex((r) => r.id === requestId);
  if (idx < 0) return { ok: false, reason: "ไม่พบคำขอนี้" };
  const latest = all[idx];

  // มีคนดำเนินการไปก่อนแล้ว → บอกว่าใคร ทำอะไร
  const stepAtOpen = latest.approvalSteps[options.expectedStep];
  const moved =
    latest.currentStep !== options.expectedStep ||
    latest.status !== "รออนุมัติ" ||
    !stepAtOpen ||
    stepAtOpen.status !== "รอ";
  if (moved) {
    const who = stepAtOpen?.by ? `${stepAtOpen.by} ` : "";
    const what = stepAtOpen && stepAtOpen.status !== "รอ" ? stepAtOpen.status : "ดำเนินการ";
    return {
      ok: false,
      reason: `ขั้นนี้ถูก${who ? who : "คนอื่น"}${what}ไปแล้ว กรุณารีเฟรชเพื่อดูสถานะล่าสุด`,
    };
  }

  if (!canApproveStep(latest, user)) {
    return { ok: false, reason: "คุณไม่มีสิทธิ์ดำเนินการขั้นนี้" };
  }

  const now = new Date().toISOString();
  const steps = latest.approvalSteps.map((s) => ({ ...s }));
  const cur = steps[latest.currentStep];
  cur.status = action === "approve" ? "อนุมัติ" : "ตีกลับ";
  cur.by = user.fullName;
  cur.byId = user.id;
  cur.at = now;
  cur.note = options.note ?? "";

  const next: SavedRequest = {
    ...latest,
    ...(options.extra ? options.extra(now, user.fullName) : {}),
    approvalSteps: steps,
    updatedAt: now,
  };
  if (action === "approve") {
    if (latest.currentStep >= steps.length - 1) next.status = "อนุมัติแล้ว";
    else next.currentStep = latest.currentStep + 1;
  } else {
    next.status = "ตีกลับ";
  }
  next.history = [
    ...latest.history,
    makeHistory(action === "approve" ? "อนุมัติ" : "ตีกลับ", user, {
      action: `${action === "approve" ? "อนุมัติ" : "ตีกลับ"}: ${cur.label}${options.historyNote ? ` (${options.historyNote})` : ""}`,
      note: options.note,
      at: now,
    }),
  ];

  all[idx] = next;
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(all));

  // แจ้งเตือนผู้ขอ / ผู้อนุมัติขั้นถัดไป (data/notification.ts)
  const finishedByFinance = action === "approve" && next.status === "อนุมัติแล้ว" && cur.role === "FINANCE";
  notifyRequestEvent(
    next,
    action === "reject" ? "rejected" : finishedByFinance ? "paid" : "approved",
    getUsers(),
    { actedStep: cur, note: options.note, at: now },
  );

  return { ok: true, request: next, actedStep: cur };
}
