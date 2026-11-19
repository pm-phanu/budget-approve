"use client";
// ════════════════════════════════════════════════════════════
//  หน้าสร้างคำขอเบิก  (/request/new)
// ════════════════════════════════════════════════════════════

//   [1] ชนิดข้อมูล
//   [2] ข้อมูลงบ: โครงการ → หมวด → วงเงิน   (data/budget.ts)
//   [3] กฎการอนุมัติตามวงเงิน             (data/approval.ts)
//   [4] ฟังก์ชันช่วย
//   [5] หน้าหลัก
//       [5.1] state + เปิดร่าง / เปิดคำขอที่ถูกตีกลับ (?id=)
//       [5.2] ค่าที่คำนวณ (ยอดรวม / จำนวนไฟล์ / เส้นทางส่งกลับ)
//       [5.3] รายการค่าใช้จ่าย    [5.4] แนบหลักฐานรายแถว
//       [5.5] ตรวจก่อนส่ง        [5.6] บันทึก localStorage
//       [5.7] ส่ง / บันทึกร่าง / ล้างฟอร์ม
//   [6] หน้าจอ
//       [6.1] ข้อมูลคำขอ   [6.2] โครงการ + วันที่   [6.3] เหตุผล
//       [6.4] ตารางค่าใช้จ่าย + หลักฐาน   [6.5] ยอดรวม
//       [6.6] การ์ดสรุป   [6.7] เส้นทางอนุมัติ   [6.8] บัญชีรับเงิน + ปุ่ม
//   [7] ชิ้นส่วนที่ใช้ซ้ำ
//  * เมนูซ้ายอยู่ที่ app/layout.tsx (ใช้ร่วมทุกหน้า)
// ════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // ✅ เพิ่ม: ใช้เปลี่ยนหน้าหลังส่งคำขอที่ถูกตีกลับ
import { getUsers, type Credential } from "@/data/credential";
import { notifyRequestEvent } from "@/data/notification";
import { getCurrentUser } from "@/utils/login";
import { projects, addRequestsToBudget, type Project } from "@/data/budget";
import {
  DEFAULT_RULES,
  loadApprovalRules,
  DEFAULT_POSITIONS,
  getRoleLabel,
  loadPositions,
  type ApproverPosition,
  getApprovalSteps,
  planApprovalSteps,
  type ApprovalRule,
  type PlannedStep,
  type StepRole,
} from "@/data/approval";
import {
  DEFAULT_ORGANIZATION,
  loadOrganization,
  type Organization,
} from "@/data/organization";
import {
  REQUESTS_KEY,
  loadRequests,
  makeHistory,
  type SavedRequest,
  type SavedStep,
  type RequestStatus,
} from "@/data/request";
import {
  ClockThree,
  Wallet2,
  Calendar,
  Trash1,
  Upload1,
  Send1,
  User2,
  Plus,
  FileText,
} from "@tailgrids/icons";

// ✅ เพิ่ม: path หน้า "คำขอของฉัน" (ตรงกับลิงก์ในหน้า Home)
const MY_REQUEST_PATH = "/my-request";

// ════════════════════════════════════════
//  [1] ชนิดข้อมูล
// ════════════════════════════════════════
// 1 แถวค่าใช้จ่าย = หมวด + รายละเอียด + จำนวนเงิน + หลักฐาน (หลายไฟล์ได้)
// ※ amount เป็นข้อความก่อน เพราะช่องกรอกส่งค่ามาเป็นข้อความ ตอนบันทึกค่อยแปลงเป็นตัวเลข
type Item = {
  categoryId: string;
  name: string;
  amount: string;
  files: string[];
};

// ข้อมูลของคำขอที่ "ถูกตีกลับ" และกำลังเปิดมาแก้ไข (ไม่มี = สร้างใหม่ / แก้ร่าง)
type ResubmitInfo = {
  id: string; // เลขที่คำขอ
  stepIndex: number; // ลำดับขั้นที่ตีกลับ ใน approvalSteps
  oldSteps: SavedStep[]; // เส้นทางอนุมัติเดิม (ขั้นที่ผ่านแล้วจะคงสถานะไว้)
  label: string; // ชื่อขั้นที่ตีกลับ เช่น "หัวหน้าแผนก"
  by: string; // ชื่อคนที่ตีกลับ
  reason: string; // เหตุผลที่ตีกลับ
};

// ฟิลด์เสริมที่หน้าอนุมัติบันทึกตอนตีกลับ (ไม่อยู่ใน SavedRequest)
type RejectExtras = {
  reject?: { status: string; comment: string };
  reviewComment?: string;
};

// แถวว่าง 1 แถว (ใช้ตอนเปิดหน้า / กดเพิ่มรายการ / ล้างฟอร์ม)
function emptyItem(): Item {
  return { categoryId: "", name: "", amount: "", files: [] };
}

// ════════════════════════════════════════
//  [2] ข้อมูลงบ: โครงการ → หมวด → วงเงิน
// ════════════════════════════════════════
// อยู่ที่ data/budget.ts (ใช้ร่วมกับหน้ารายงาน)

// ════════════════════════════════════════
//  [3] กฎการอนุมัติตามวงเงิน
// ════════════════════════════════════════
// อยู่ที่ data/approval.ts (ใช้ร่วมกับหน้าอนุมัติ / ตั้งค่า)
//   ≤ 3,000 → บัญชี → การเงิน
//   3,001 – 30,000 → หัวหน้า → บัญชี → การเงิน
//   30,001 – 300,000 → หัวหน้า → ผอ.ฝ่าย → บัญชี → การเงิน
//   300,001 ขึ้นไป → หัวหน้า → ผอ.ฝ่าย → กรรมการผู้จัดการ → บัญชี → การเงิน

// ════════════════════════════════════════
//  [4] ฟังก์ชันช่วย
// ════════════════════════════════════════

// ใส่ลูกน้ำ เช่น 12500 → "12,500"
function money(n: number) {
  return n.toLocaleString("th-TH");
}

// บัญชีรับเงินคืนของผู้ขอ (ข้อมูลสมมติ ยังไม่มีในข้อมูลผู้ใช้)
const BANK_ACCOUNT = "ยังไม่ได้ตั้งค่าบัญชีรับเงิน"; // ใช้เมื่อผู้ขอยังไม่มี bankAccount

// ════════════════════════════════════════
//  [5] หน้าหลัก
// ════════════════════════════════════════
export default function NewRequest() {
  const router = useRouter(); // ✅ เพิ่ม: ตัวเปลี่ยนหน้า

  // ---------- [5.1] state ----------
  // ช่องในฟอร์ม
  const [type, setType] = useState("advance"); // advance = สำรองจ่าย · invoice = ใบแจ้งหนี้
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [useDate, setUseDate] = useState("");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<Item[]>([emptyItem()]);

  // ข้อความแจ้งผล
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  // เลขที่ใบที่กำลังแก้ (ร่าง หรือ คำขอที่ถูกตีกลับ) · ยังไม่เคยบันทึก = ""
  // ※ กดบันทึกร่างซ้ำ → ทับใบเดิม ไม่เกิดร่างซ้ำหลายใบ
  const [draftId, setDraftId] = useState("");

  // คำขอที่ถูกตีกลับและเปิดมาแก้ (ส่งใหม่แล้วจะกลับไปหาคนที่ตีกลับ)
  const [resubmit, setResubmit] = useState<ResubmitInfo | null>(null);

  // ค่าที่อ่านจาก localStorage
  const [rules, setRules] = useState<ApprovalRule[]>(DEFAULT_RULES); // วงเงินอนุมัติ
  const [user, setUser] = useState<Credential | null>(null); // คนที่ล็อกอินอยู่
  const [org, setOrg] = useState<Organization>(DEFAULT_ORGANIZATION); // ผังองค์กร (หาผู้อนุมัติ)
  const [positions, setPositions] = useState<ApproverPosition[]>(DEFAULT_POSITIONS); // ตำแหน่งผู้อนุมัติ (รวมที่เพิ่มเอง)
  const [budget, setBudget] = useState<Project[]>(projects); // งบที่หักคำขอที่ส่งไปแล้ว

  // อ่าน localStorage ครั้งเดียวตอนเปิดหน้า ([] ท้ายสุด = ทำครั้งเดียว)
  // ※ ต้องอ่านใน useEffect เพราะ localStorage มีแค่ในเบราว์เซอร์
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- อ่านได้หลังเปิดหน้าเท่านั้น */
    // ผู้ใช้: ใช้ข้อมูลล่าสุด (มี departmentId) ไม่ใช่ภาพ ณ ตอน login
    const me = getCurrentUser();

    // อ่านป้ายท้าย URL: /request/new?id=REQ-xxx (เปิดร่าง หรือ คำขอที่ถูกตีกลับมาแก้)
    const params = new URLSearchParams(window.location.search);
    const openId = params.get("id"); // "REQ-xxx" หรือ null ถ้าไม่มีป้าย

    // กฎวงเงิน: ข้อมูลในเครื่องผิดรูปแบบ → ใช้ค่าเริ่มต้น (ดู loadApprovalRules)
    setRules(loadApprovalRules());
    setUser(me);
    setOrg(loadOrganization());
    setPositions(loadPositions());
    // งบ: ถ้าเปิดใบเดิมมาแก้ ไม่นับยอดของใบนี้ซ้ำ (ไม่งั้นตรวจงบคงเหลือผิด)
    setBudget(addRequestsToBudget(loadRequests().filter((r) => r.id !== openId)));

    // ---------- [5.1] เปิดร่าง / เปิดคำขอที่ถูกตีกลับ มาแก้ต่อ ----------
    // - ร่าง: เปิดได้
    // - ตีกลับ: เปิดได้เฉพาะเจ้าของคำขอ (ผู้ขอคนเดิม)
    const draft = loadRequests().find(
      (r) =>
        r.id === openId &&
        (r.status === "ร่าง" ||
          (r.status === "ตีกลับ" &&
            !!me &&
            r.requester != null &&
            String(r.requester.id) === String(me.id))),
    );
    if (draft) {
      setType(draft.type);
      setTitle(draft.title);
      setProjectId(draft.project ? draft.project.id : "");
      setUseDate(draft.useDate);
      setReason(draft.reason);
      setItems(
        draft.items.map((it) => ({
          categoryId: it.categoryId,
          name: it.name,
          amount: String(it.amount), // ตอนเก็บเป็นตัวเลข → ฟอร์มใช้ข้อความ
          files: it.files,
        })),
      );
      setDraftId(draft.id); // บันทึก/ส่ง → ทับใบเดิม ไม่สร้างใหม่

      // คำขอที่ถูกตีกลับ: จำว่าใครตีกลับที่ขั้นไหน เพื่อส่งกลับไปหาคนนั้น
      if (draft.status === "ตีกลับ") {
        const idx = draft.approvalSteps.findIndex((s) => s.status === "ตีกลับ");
        if (idx >= 0) {
          const s = draft.approvalSteps[idx];
          const extra = draft as SavedRequest & RejectExtras;
          const why = extra.reject
            ? extra.reject.comment
              ? `${extra.reject.status} — ${extra.reject.comment}`
              : extra.reject.status
            : s.note || extra.reviewComment || "-";
          setResubmit({
            id: draft.id,
            stepIndex: idx,
            oldSteps: draft.approvalSteps,
            label: s.label,
            by: s.by ?? "-",
            reason: why,
          });
        }
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // ---------- [5.2] ค่าที่คำนวณจาก state ----------
  // ※ ไม่ต้องเก็บใน state เพราะคิดใหม่เองทุกครั้งที่ฟอร์มเปลี่ยน

  // ยอดรวม = บวกจำนวนเงินทุกแถว
  let total = 0;
  for (const it of items) total += Number(it.amount || 0);

  // จำนวนไฟล์ทั้งหมด / จำนวนแถวที่แนบแล้ว
  let fileCount = 0;
  let rowsWithFile = 0;
  for (const it of items) {
    fileCount += it.files.length;
    if (it.files.length > 0) rowsWithFile += 1;
  }

  // โครงการที่เลือก + หมวดของโครงการนั้น
  const project = budget.find((p) => p.id === projectId); // ไม่ได้เลือก = undefined
  const categories = project ? project.categories : [];
  const currentYear = user ? new Date().getFullYear() : null
  const myProjects = budget.filter(
    (p) => !!user?.departmentId && p.departmentId === user.departmentId && p.year === currentYear
  )

  // งบคงเหลือของโครงการ = รวม (วงเงิน − ใช้ไป) ทุกหมวด
  let projectRemaining = 0;
  for (const c of categories) projectRemaining += c.limit - c.used;

  // เส้นทางอนุมัติตามยอดรวม + ผู้อนุมัติแต่ละขั้น (ดู planApprovalSteps ใน data/approval.ts)
  // ยังไม่รู้ว่าใครล็อกอิน → แสดงตามวงเงินอย่างเดียว
  const plan: PlannedStep[] = user
    ? planApprovalSteps(total, user, org, rules, positions)
    : getApprovalSteps(total, rules).map((role) => ({ role, approverId: null, hasApprover: true, actingRole: null }));
  const steps = plan.map((p) => p.role);
  // ขั้นที่ยังไม่มีใครอนุมัติได้ (ในแผนก/ฝ่ายของผู้ขอ) → ส่งไม่ได้จนกว่าบัญชีจะกำหนดคน
  const missingSteps = plan.filter((p) => !p.hasApprover).map((p) => p.role);

  // ส่งกลับไปหาคนที่ตีกลับได้หรือไม่:
  // เส้นทางตามยอดใหม่ต้องเหมือนเส้นทางเดิม (ถ้าแก้ยอดจนเส้นทางเปลี่ยน → เริ่มอนุมัติใหม่ตั้งแต่ขั้นแรก)
  const sameRoute =
    !!resubmit &&
    resubmit.oldSteps.length === steps.length &&
    resubmit.oldSteps.every((s, i) => s.role === steps[i]);

  // ปลายทางที่คำขอจะถูกส่งไป (ใช้แสดงข้อความ / ประวัติ)
  const targetLabel =
    resubmit && sameRoute
      ? resubmit.label
      : steps[0]
        ? getRoleLabel(steps[0], positions)
        : "-";

  // บัญชีรับเงินคืน: ของผู้ขอ (data/credential.ts) · ยังไม่มีข้อมูล = แสดงข้อความแทน
  const bankLabel = user?.bankAccount
    ? `${user.bankAccount.bank} ${user.bankAccount.number}`
    : BANK_ACCOUNT;

  // คำที่เปลี่ยนตามประเภท
  const isAdvance = type === "advance";
  const fileLabel = isAdvance ? "ใบเสร็จ" : "ใบแจ้งหนี้";

  // ---------- [5.3] รายการค่าใช้จ่าย ----------
  function addItem() {
    setItems([...items, emptyItem()]); // ... = ก๊อปแถวเดิม แล้วต่อแถวใหม่ท้ายสุด
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index)); // เก็บทุกแถว ยกเว้นแถวที่กดลบ
  }

  // แก้ 1 ช่อง ของ 1 แถว
  function changeItem(
    index: number,
    field: "categoryId" | "name" | "amount",
    value: string,
  ) {
    const copy = [...items]; // ก๊อปทั้งลิสต์ (React ต้องได้ลิสต์ใหม่ถึงจะวาดจอใหม่)
    const row = { ...copy[index] }; // ก๊อปแถวที่จะแก้
    row[field] = value; // เปลี่ยนเฉพาะช่องที่ชื่อ field
    copy[index] = row; // ใส่แถวที่แก้แล้วกลับเข้าไป
    setItems(copy);
  }

  // เปลี่ยนโครงการ → ล้างหมวดเดิมทุกแถว (หมวดผูกกับโครงการ)
  function changeProject(id: string) {
    setProjectId(id);
    setItems(items.map((it) => ({ ...it, categoryId: "" })));
  }

  // ---------- [5.4] แนบหลักฐานรายแถว ----------
  function addFiles(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files; // ไฟล์ที่เลือกมา
    if (!picked) return; // ไม่ได้เลือก = ไม่ทำอะไร

    const names = Array.from(picked).map((f) => f.name); // เก็บแค่ชื่อไฟล์
    const copy = [...items];
    const row = { ...copy[index] };
    row.files = [...row.files, ...names]; // ไฟล์เดิม + ไฟล์ใหม่
    copy[index] = row;
    setItems(copy);

    e.target.value = ""; // ล้างช่อง จะได้เลือกไฟล์ชื่อเดิมซ้ำได้
  }

  function removeFile(index: number, fileIndex: number) {
    const copy = [...items];
    const row = { ...copy[index] };
    row.files = row.files.filter((_, i) => i !== fileIndex);
    copy[index] = row;
    setItems(copy);
  }

  // ---------- [5.5] ตรวจก่อนส่ง ----------
  // คืนลิสต์ข้อความผิด · ลิสต์ว่าง = ผ่าน
  function validate() {
    const list: string[] = [];
    if (!user) list.push("ไม่พบผู้ใช้ กรุณาเข้าสู่ระบบก่อน");
    if (!title) list.push("กรุณากรอกชื่อคำขอ");
    if (!project) list.push("กรุณาเลือกโครงการ");
    if (project && !myProjects.some((p) => p.id === project.id)) list.push("โครงการนี้ไม่ใช่ของคุณ หรือไม่ใช่ปีงบประมาณปัจจุบัน")
    if (!useDate) list.push("กรุณาเลือกวันที่ใช้จ่าย");
    // เส้นทางตาม Approval Matrix ต้องมีผู้อนุมัติครบทุกขั้น (ไม่นับผู้ขอเอง)
    for (const role of missingSteps)
      list.push(`ขั้น "${getRoleLabel(role, positions)}" ยังไม่มีผู้อนุมัติในแผนก/ฝ่ายของคุณ กรุณาติดต่อฝ่ายบัญชี`);

    // ตรวจทีละแถว
    items.forEach((it, i) => {
      const row = "แถวที่ " + (i + 1);
      if (!it.categoryId) list.push(row + ": เลือกหมวดค่าใช้จ่าย");
      if (!it.name) list.push(row + ": กรอกรายละเอียด");
      if (Number(it.amount || 0) <= 0) list.push(row + ": กรอกจำนวนเงิน");
      if (it.files.length === 0)
        list.push(row + ": แนบ" + fileLabel + "อย่างน้อย 1 ไฟล์");
    });

    // รวมยอดต่อหมวด แล้วเทียบกับงบคงเหลือของหมวดนั้น
    // ※ หลายแถวใช้หมวดเดียวกันได้ เลยต้องรวมก่อนเทียบ
    for (const c of categories) {
      let sum = 0;
      for (const it of items) {
        if (it.categoryId === c.id) sum += Number(it.amount || 0);
      }
      const left = c.limit - c.used;
      if (sum > left)
        list.push(c.name + " เกินงบคงเหลือ (เหลือ ฿" + money(left) + ")");
    }
    return list;
  }

  // ---------- [5.6] บันทึก localStorage ----------
  // เก็บครบทุกอย่างที่หน้าอื่นต้องใช้ (หน้าอนุมัติ / ประวัติ / รายงาน)
  // รูปแบบเต็มดูที่ data/request.ts
  function saveRequest(status: RequestStatus) {
    const now = new Date().toISOString();
    const all = loadRequests();

    // เคยบันทึกร่างไว้ / เปิดคำขอที่ถูกตีกลับมาแก้ → ใช้ใบเดิม · ยังไม่เคย → ออกเลขใหม่
    // ※ ใช้เวลาเป็นเลขที่ ไม่ซ้ำแม้ลบคำขอเก่า
    const id = draftId ? draftId : "REQ-" + new Date().getTime();
    const old = all.find((r) => r.id === id);

    // ส่งใหม่หลังถูกตีกลับ (ไม่ใช่การบันทึกร่าง)
    const resubmitted = !!resubmit && status !== "ร่าง";

    // แปลงแถวในฟอร์ม → แถวที่บันทึก (จำนวนเงินเป็นตัวเลข + ใส่ชื่อหมวด)
    const savedItems = items.map((it) => {
      const cat = categories.find((c) => c.id === it.categoryId);
      return {
        categoryId: it.categoryId,
        categoryName: cat ? cat.name : "",
        name: it.name,
        amount: Number(it.amount || 0),
        files: it.files,
      };
    });

    // ข้อมูลผู้ขอ (ไม่ได้ล็อกอิน = null)
    let requester = null;
    if (user) {
      requester = {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        departmentId: user.departmentId ?? null,
        department: user.departmentInfo.department,
        lineOfWork: user.departmentInfo.lineOfWork,
        headId: user.hierarchy ? user.hierarchy.headId : null,
        directorId: user.hierarchy ? user.hierarchy.directorId : null,
      };
    }

    // เส้นทางอนุมัติ + ขั้นที่ต้องทำต่อ
    let approvalSteps: SavedStep[];
    let currentStep = 0;
    if (resubmit && resubmitted && sameRoute) {
      // ส่งกลับไปหาคนที่ตีกลับ: ขั้นที่ผ่านแล้วคงเดิม รีเซ็ตเฉพาะขั้นที่ถูกตีกลับให้กลับเป็น "รอ"
      // และล็อกให้คนที่ตีกลับเป็นผู้อนุมัติขั้นนั้น
      approvalSteps = resubmit.oldSteps.map((s, i): SavedStep =>
        i === resubmit.stepIndex
          ? {
              ...s,
              approverId: s.byId ?? s.approverId ?? null,
              status: "รอ",
              by: null,
              byId: null,
              at: null,
              note: "",
            }
          : s,
      );
      currentStep = resubmit.stepIndex;
    } else {
      // คำขอใหม่ / ร่าง / ยอดเปลี่ยนจนเส้นทางเปลี่ยน → เริ่มที่ขั้นแรก
      // ทุกขั้นเริ่มที่ "รอ" · หน้าอนุมัติเป็นคนเปลี่ยน · approverId = คนที่ต้องอนุมัติขั้นนั้น
      approvalSteps = plan.map(({ role, approverId, actingRole }): SavedStep => ({
        role,
        approverId,
        actingRole,
        // ทางสำรอง → "กรรมการผู้จัดการ (แทนฝ่ายบัญชี)"
        label: actingRole
          ? `${getRoleLabel(actingRole, positions)} (แทน${getRoleLabel(role, positions)})`
          : getRoleLabel(role, positions),
        status: "รอ",
        by: null,
        at: null,
        note: "",
      }));
    }

    // ข้อความในประวัติ
    const historyType = status === "ร่าง" ? "บันทึกร่าง" : resubmitted ? "ส่งใหม่" : "ส่งคำขอ";
    const historyOptions = resubmitted
      ? {
          at: now,
          action: sameRoute ? `ส่งใหม่ → ${targetLabel}` : "ส่งใหม่ (เส้นทางอนุมัติเปลี่ยนตามยอดใหม่)",
          note: sameRoute
            ? `แก้ไขตามที่ ${resubmit?.label} ตีกลับ`
            : "ยอดเงินที่แก้ไขทำให้เส้นทางอนุมัติเปลี่ยน เริ่มอนุมัติใหม่ตั้งแต่ขั้นแรก",
        }
      : { at: now };

    const request: SavedRequest = {
      id,
      createdAt: old ? old.createdAt : now, // แก้ร่าง / แก้ใบที่ถูกตีกลับ = วันสร้างเดิม
      updatedAt: now,
      status,
      type: isAdvance ? "advance" : "invoice",
      typeLabel: isAdvance ? "สำรองจ่ายแล้ว (ขอเบิกคืน)" : "ให้บัญชีจ่ายตามใบแจ้งหนี้",
      title,
      useDate,
      reason,
      project: project
        ? { id: project.id, name: project.name, dept: project.dept }
        : null,
      items: savedItems,
      total,
      fileCount,
      requester,
      payTo: isAdvance ? "โอนคืนเข้าบัญชีผู้ขอ" : "โอนให้ผู้ขายตามใบแจ้งหนี้",
      bankAccount: isAdvance && user?.bankAccount ? bankLabel : null,
      approvalSteps,
      currentStep,
      history: [
        ...(old ? old.history : []), // ประวัติเดิมของร่าง / ของคำขอที่ถูกตีกลับ
        makeHistory(historyType, user, historyOptions),
      ],
    };
    // ※ สร้างอ็อบเจ็กต์ใหม่ทั้งก้อน ฟิลด์ที่หน้าอนุมัติเคยเติมตอนตีกลับ (reject / reviewedAt / reviewComment)
    //   จึงไม่ติดไปด้วย → คำขอพ้นสถานะ "ตีกลับ" แล้วกล่องเหตุผลสีแดงในหน้า "คำขอของฉัน" จะหายไปเอง

    // มีใบเดิม = แทนที่ · ไม่มี = ต่อท้าย
    const others = all.filter((r) => r.id !== id);
    localStorage.setItem(REQUESTS_KEY, JSON.stringify([...others, request]));

    // ส่งจริง (ไม่ใช่ร่าง) → แจ้งเตือนผู้อนุมัติ (data/notification.ts)
    // ※ ส่งใหม่ก็ใช้ event "submitted" เดิม ถ้า notification.ts มี event สำหรับส่งใหม่ ให้เปลี่ยนตรงนี้
    if (status !== "ร่าง") notifyRequestEvent(request, "submitted", getUsers(), { at: now });
    return id;
  }

  // ---------- [5.7] ส่ง / บันทึกร่าง / ล้างฟอร์ม ----------
  function resetForm() {
    setTitle("");
    setProjectId("");
    setUseDate("");
    setReason("");
    setItems([emptyItem()]);
    setDraftId("");
    setResubmit(null);
  }

  function submit() {
    const list = validate();
    setErrors(list);
    if (list.length > 0) {
      setMessage("");
      return; // มีข้อผิด → หยุด ไม่บันทึก
    }
    const wasResubmit = !!resubmit; // จำไว้ก่อน เพราะ resetForm จะล้างค่า
    const id = saveRequest("รออนุมัติ");

    // ✅ เพิ่ม: ส่งคำขอที่ถูกตีกลับสำเร็จ → ไปหน้า "คำขอของฉัน" ทันที
    if (wasResubmit) {
      router.push(MY_REQUEST_PATH);
      return;
    }

    // ส่งแล้วล้างฟอร์ม กันกดส่งซ้ำ + อัปเดตงบคงเหลือใหม่
    resetForm();
    setBudget(addRequestsToBudget(loadRequests()));
    setMessage("ส่งคำขอ " + id + " เรียบร้อย ส่งต่อให้" + targetLabel); // ✅ แก้: เหลือเฉพาะข้อความของคำขอใหม่
  }

  // ร่างไม่ต้องตรวจ (ยังกรอกไม่ครบได้) แต่ต้องมีชื่อคำขอ ไว้หาเจอทีหลัง
  function saveDraft() {
    if (!title) {
      setErrors(["กรอกชื่อคำขอก่อนบันทึกร่าง"]);
      setMessage("");
      return;
    }
    const id = saveRequest("ร่าง");
    setDraftId(id); // กดบันทึกร่างอีกครั้ง → ทับใบนี้
    setErrors([]);
    setMessage("บันทึกร่าง " + id + " แล้ว");
  }

  // ════════════════════════════════════════
  //  [6] หน้าจอ
  // ════════════════════════════════════════
  return (
    <div className="text-[#0F172A]">
      {/* breadcrumb ย้ายไปอยู่บน header ของ layout แล้ว */}
      <h1 className="mb-9 text-[32px] font-bold text-[#111]">
        {resubmit ? "แก้ไขคำขอที่ถูกตีกลับ" : "สร้างคำขอเบิก"}
      </h1>

      <div className="grid grid-cols-4 gap-5">
        {/* ===== คอลัมน์ซ้าย: ฟอร์ม ===== */}
        <section className="col-span-3 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
          {/* ---------- กล่องแจ้ง: คำขอนี้ถูกตีกลับ ---------- */}
          {resubmit && (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <p className="font-bold">
                คำขอ {resubmit.id} ถูกตีกลับโดย {resubmit.label}
                {resubmit.by !== "-" ? ` (${resubmit.by})` : ""}
              </p>
              <p className="mt-1">
                <strong>เหตุผล:</strong> {resubmit.reason}
              </p>
              <p className="mt-1 text-xs text-rose-600">
                {sameRoute
                  ? `แก้ไขแล้วกด "แก้ไขแล้วส่งใหม่" ระบบจะส่งกลับไปให้ ${resubmit.label} พิจารณาต่อ`
                  : "ยอดเงินที่แก้ไขทำให้เส้นทางอนุมัติเปลี่ยน คำขอจะเริ่มอนุมัติใหม่ตั้งแต่ขั้นแรก"}
              </p>
            </div>
          )}

          {/* ---------- [6.1] ข้อมูลคำขอ ---------- */}
          <h2 className="text-lg font-bold">ข้อมูลคำขอ</h2>
          <Label text="ประเภทคำขอ" />
          <div className="mb-4 flex gap-2 rounded-xl bg-gray-100 p-1">
            <TypeButton
              active={type === "invoice"}
              onClick={() => setType("invoice")}
              icon={<ClockThree size={16} />}
              text="ให้บัญชีจ่ายตามใบแจ้งหนี้"
            />
            <TypeButton
              active={type === "advance"}
              onClick={() => setType("advance")}
              text="สำรองจ่ายแล้ว (ขอเบิกคืน)"
            />
          </div>

          <Label text="ชื่อคำขอ" />
          <input
            className={`${inputClass} mb-4`}
            placeholder="เช่น ค่าเดินทางสัมมนา เชียงใหม่"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* ---------- [6.2] โครงการ + วันที่ ---------- */}
          <div className="mb-4 flex gap-4">
            <div className="flex-[2]">
              <Label text="โครงการ" />
              <select
                className={inputClass}
                value={projectId}
                onChange={(e) => changeProject(e.target.value)}
              >
                <option value="">-- เลือกโครงการ --</option>
                {myProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.dept} › {p.name}
                  </option>
                ))}
              </select>
              {/* ไม่มีโครงการให้เลือก: ยังไม่กำหนดแผนก / แผนกยังไม่มีงบปีนี้ */}
              {user && myProjects.length === 0 && (
                <p className="mt-1 text-xs text-[#B45309]">
                  {user.departmentId
                    ? "แผนกของคุณยังไม่มีโครงการในปีนี้ ติดต่อฝ่ายบัญชีให้ตั้งงบก่อน"
                    : "บัญชีของคุณยังไม่ได้กำหนดแผนก ติดต่อฝ่ายบัญชี"}
                </p>
              )}
              {/* ยังไม่เลือก = บอกว่าต้องเลือกก่อน · เลือกแล้ว = โชว์งบคงเหลือ */}
              {/* ※ ไม่มีโครงการให้เลือก → ใช้ข้อความด้านบนแทน (ไม่ขึ้นซ้อนกัน 2 ข้อความ) */}
              {!project && myProjects.length > 0 && (
                <p className="mt-1 text-xs text-[#B45309]">
                  เลือกโครงการก่อน แล้วจึงเลือกหมวดในรายการค่าใช้จ่ายได้
                </p>
              )}
              {project && (
                <p className="mt-1 text-xs text-[#64748B]">
                  งบโครงการคงเหลือ{" "}
                  <b className="text-[#047857]">฿{money(projectRemaining)}</b> ·{" "}
                  {categories.length} หมวด
                </p>
              )}
            </div>
            <div className="flex-1">
              <Label text="วันที่ใช้จ่าย" />
              <input
                type="date"
                className={inputClass}
                value={useDate}
                onChange={(e) => setUseDate(e.target.value)}
              />
            </div>
          </div>

          {/* ---------- [6.3] เหตุผล ---------- */}
          <Label text="เหตุผลการเบิก" />
          <textarea
            className={`${inputClass} mb-6 h-20`}
            placeholder="เช่น เดินทางไปสัมมนาที่เชียงใหม่ ใช้เงินส่วนตัวสำรองจ่ายไปก่อน"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          {/* ---------- [6.4] ตารางค่าใช้จ่าย + หลักฐานรายแถว ---------- */}
          <div className="mb-3 flex items-center justify-between border-t border-gray-100 pt-4">
            <h2 className="text-base font-bold">รายการค่าใช้จ่าย</h2>
            <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs text-[#64748B]">
              {items.length} รายการ
            </span>
          </div>

          <div className="mb-1.5 flex gap-2 px-1 text-xs font-semibold text-[#64748B]">
            <span className="w-36">หมวด</span>
            <span className="flex-1">รายละเอียด</span>
            <span className="w-32">จำนวนเงิน</span>
            <span className="w-28 text-center">{fileLabel}</span>
            <span className="w-10" />
          </div>

          {items.map((it, i) => (
            <div key={i} className="mb-2.5">
              <div className="flex gap-2">
                <select
                  className={`${fieldClass} w-36 shrink-0 bg-white px-3`}
                  value={it.categoryId}
                  onChange={(e) => changeItem(i, "categoryId", e.target.value)}
                  disabled={!project}
                >
                  <option value="">
                    {project ? "-- หมวด --" : "เลือกโครงการก่อน"}
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  className={`${fieldClass} min-w-0 flex-1 bg-white`}
                  placeholder="เช่น ตั๋วเครื่องบินไป-กลับ"
                  value={it.name}
                  onChange={(e) => changeItem(i, "name", e.target.value)}
                />
                <div className="flex w-32 shrink-0 items-center rounded-xl border border-gray-200 bg-white px-3 focus-within:border-[#059669]">
                  <span className="text-sm text-[#94A3B8]">฿</span>
                  <input
                    type="number"
                    className="w-full border-0 bg-transparent px-1 py-2.5 text-right text-sm font-bold outline-none focus:ring-0"
                    placeholder="0"
                    value={it.amount}
                    onChange={(e) => changeItem(i, "amount", e.target.value)}
                  />
                </div>
                {/* ปุ่มแนบ: ยังไม่มีไฟล์ = ขอบแดงประ · มีแล้ว = เขียว + จำนวนไฟล์ */}
                <label
                  className={`flex w-28 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl text-sm font-semibold ${
                    it.files.length > 0
                      ? "border border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]"
                      : "border border-dashed border-[#FDA4AF] bg-[#FFF1F2] text-[#BE123C]"
                  }`}
                >
                  <Upload1 size={16} />
                  {it.files.length > 0 ? `${it.files.length} ไฟล์` : "แนบไฟล์"}
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => addFiles(i, e)}
                  />
                </label>
                <button
                  onClick={() => removeItem(i)}
                  disabled={items.length === 1}
                  className="flex w-10 shrink-0 items-center justify-center rounded-xl border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FECACA] disabled:opacity-30"
                >
                  <Trash1 size={18} />
                </button>
              </div>

              {/* รายชื่อไฟล์ของแถวนี้ */}
              {it.files.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5 pl-[9.5rem]">
                  {it.files.map((name, f) => (
                    <span
                      key={f}
                      className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-[#334155]"
                    >
                      <FileText size={12} className="text-red-600" />
                      {name}
                      <button
                        onClick={() => removeFile(i, f)}
                        className="ml-0.5 text-gray-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addItem}
            className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-[#059669] py-2.5 text-sm font-semibold text-[#047857] hover:bg-[#ECFDF5]"
          >
            <Plus size={16} /> เพิ่มรายการ
          </button>

          {/* ---------- [6.5] ยอดรวม + สถานะหลักฐาน ---------- */}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-[#ECFDF5] px-4 py-3.5">
            <span
              className={`text-sm ${rowsWithFile < items.length ? "text-[#BE123C]" : "text-[#047857]"}`}
            >
              แนบ{fileLabel}แล้ว{" "}
              <b>
                {rowsWithFile}/{items.length}
              </b>{" "}
              รายการ
            </span>
            <span className="text-[#047857]">
              <span className="mr-2 text-sm">ยอดรวม</span>
              <b className="text-2xl">฿{money(total)}</b>
            </span>
          </div>
        </section>

        {/* ===== คอลัมน์ขวา: สรุป ===== */}
        <section className="col-span-1 flex flex-col gap-5">
          {/* ---------- [6.6] การ์ดสรุป ---------- */}
          {/* ตัวเลข total / fileCount / projectRemaining คิดไว้ที่ [5.2] */}
          <div className="rounded-xl bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#047857] p-6 text-white shadow-2xl">
            <p className="flex items-center gap-2 text-sm text-gray-300">
              <Wallet2 size={18} className="text-[#34D399]" /> ยอดรวมที่ขอเบิก
            </p>
            <p className="my-1 text-4xl font-bold">฿{money(total)}</p>
            <p className="text-sm text-[#A7F3D0]">
              {items.length} รายการ · {fileLabel} {fileCount} ไฟล์
            </p>
            <hr className="my-4 border-white/15" />
            <div className="flex items-center justify-between text-sm text-gray-300">
              <span className="flex items-center gap-2">
                <Calendar size={16} className="text-[#34D399]" />{" "}
                งบโครงการหลังอนุมัติ
              </span>
              {project ? (
                <b className="text-lg text-white">
                  ฿{money(projectRemaining - total)}
                </b>
              ) : (
                <span className="text-xs text-gray-400">เลือกโครงการเพื่อดูงบ</span>
              )}
            </div>
            <p className="mt-2 rounded-lg bg-white/10 px-3 py-2 text-xs text-[#D1FAE5]">
              {isAdvance
                ? "ได้รับเงินคืนเมื่อการเงินทำจ่าย"
                : "การเงินโอนให้ผู้ขายตามใบแจ้งหนี้"}
            </p>
          </div>

          {/* ---------- [6.7] เส้นทางอนุมัติ (เปลี่ยนตามยอดเงิน) ---------- */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold">เส้นทางการอนุมัติ</h2>
            <Step
              avatar={
                <span className="text-xs font-bold text-[#0F172A]">คุณ</span>
              }
              color="bg-[#34D399]"
              text={user ? user.fullName : "คุณ (ผู้ขอ)"}
              sub="ส่งคำขอ"
            />
            {steps.map((role, i) => (
              <Step
                key={role}
                avatar={<User2 size={18} className={(STEP_STYLE[role] ?? CUSTOM_STEP_STYLE).icon} />}
                color={(STEP_STYLE[role] ?? CUSTOM_STEP_STYLE).bg}
                text={getRoleLabel(role, positions)}
                sub={STEP_SUB[role] ?? "อนุมัติ"}
                warning={
                  missingSteps.includes(role)
                    ? "ยังไม่มีผู้อนุมัติ"
                    : resubmit && sameRoute && i === resubmit.stepIndex
                      ? "ตีกลับ — จะส่งกลับมาที่ขั้นนี้"
                      : undefined
                }
                last={i === steps.length - 1}
              />
            ))}
            {total > 0 && steps[0] === "ACCOUNTANT_ADMIN" && (
              <p className="mt-1 rounded-lg bg-[#ECFDF5] px-3 py-2 text-xs text-[#047857]">
                ยอดไม่เกิน ฿{money(rules[0].max ?? 0)} ไม่ต้องผ่านหัวหน้า
              </p>
            )}
          </div>

          {/* ---------- [6.8] บัญชีรับเงิน + ปุ่ม ---------- */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            {/* สำรองจ่าย = โอนคืนเข้าบัญชีผู้ขอ · ใบแจ้งหนี้ = โอนให้ผู้ขาย */}
            {isAdvance ? (
              <>
                <Label text="โอนเงินคืนเข้าบัญชี" />
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                  <div className="h-9 w-9 rounded-full bg-[#D1FAE5]" />
                  <div className="flex-1">
                    <p className="text-sm font-bold">{bankLabel}</p>
                    <p className="text-xs text-[#64748B]">
                      {user ? user.fullName : "-"}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Label text="การจ่ายเงิน" />
                <p className="mb-4 rounded-xl border border-gray-200 p-3 text-sm text-[#64748B]">
                  การเงินจะโอนให้ผู้ขายตามใบแจ้งหนี้ที่แนบ
                </p>
              </>
            )}

            {errors.length > 0 && (
              <ul className="mb-3 list-disc rounded-xl bg-red-50 py-2 pl-8 pr-3 text-sm text-red-700">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            {message && (
              <p className="mb-3 rounded-xl bg-[#ECFDF5] p-3 text-sm text-[#047857]">
                {message}
              </p>
            )}

            <button
              onClick={submit}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#059669] py-3 font-bold text-white hover:bg-[#047857]"
            >
              <Send1 size={18} />{" "}
              {resubmit ? "แก้ไขแล้วส่งใหม่" : "ส่งคำขอ"}
            </button>
            {/* คำขอที่ถูกตีกลับ แปลงกลับเป็นร่างไม่ได้ (จะหลุดจากสถานะตีกลับ) จึงซ่อนปุ่มนี้ */}
            {!resubmit && (
              <button
                onClick={saveDraft}
                className="mt-2 w-full rounded-xl bg-gray-100 py-3 font-semibold text-gray-600 hover:bg-gray-200"
              >
                บันทึกร่าง
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
//  [7] ชิ้นส่วนที่ใช้ซ้ำ
// ════════════════════════════════════════

// fieldClass = หน้าตาช่องกรอก · inputClass = แบบเต็มความกว้าง
const fieldClass =
  "rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#059669] focus:bg-white focus:ring-0";
const inputClass = "w-full " + fieldClass;

// สีและคำอธิบายของแต่ละขั้นในเส้นทางอนุมัติ
// ※ ตำแหน่งที่ฝ่ายบัญชีเพิ่มเองไม่มีในตารางนี้ → ใช้ CUSTOM_STEP_STYLE / "อนุมัติ"
const STEP_STYLE: Record<StepRole, { bg: string; icon: string }> = {
  HEAD: { bg: "bg-[#D1FAE5]", icon: "text-[#047857]" },
  DIRECTOR: { bg: "bg-[#FEF3C7]", icon: "text-[#B45309]" },
  MANAGING_DIRECTOR: { bg: "bg-[#FCE7F3]", icon: "text-[#BE185D]" },
  ACCOUNTANT_ADMIN: { bg: "bg-[#E0E7FF]", icon: "text-[#3730A3]" },
  FINANCE: { bg: "bg-[#DBEAFE]", icon: "text-[#1D4ED8]" },
};
const CUSTOM_STEP_STYLE = { bg: "bg-[#F1F5F9]", icon: "text-[#475569]" };
const STEP_SUB: Record<StepRole, string> = {
  HEAD: "อนุมัติ",
  DIRECTOR: "อนุมัติ",
  MANAGING_DIRECTOR: "อนุมัติ",
  ACCOUNTANT_ADMIN: "ตรวจสอบหลักฐาน",
  FINANCE: "ทำจ่าย",
};

// [7.1] หัวข้อช่องกรอก
function Label({ text }: { text: string }) {
  return <p className="mb-1.5 mt-3 text-sm font-semibold">{text}</p>;
}

// [7.2] ปุ่มเลือกประเภทคำขอ
function TypeButton({
  active,
  onClick,
  icon,
  text,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  text: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold ${active ? "border-2 border-[#059669] bg-white text-[#047857]" : "text-[#64748B]"}`}
    >
      {icon} {text}
    </button>
  );
}

// [7.3] 1 ขั้นในเส้นทางอนุมัติ
function Step({
  avatar,
  color,
  text,
  sub,
  warning,
  last,
}: {
  avatar: React.ReactNode;
  color: string;
  text: string;
  sub: string;
  warning?: string; // ข้อความตัวแดงใต้ชื่อขั้น (ขั้นที่ยังไม่มีผู้อนุมัติ / ขั้นที่ตีกลับ)
  last?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full ${color}`}
        >
          {avatar}
        </div>
        {!last && <div className="my-1 w-0.5 flex-1 bg-gray-300" />}
      </div>
      <div className="pb-4">
        <p className="text-sm font-bold">{text}</p>
        <p className="text-xs text-[#64748B]">{sub}</p>
        {warning && <p className="text-xs font-semibold text-red-600">{warning}</p>}
      </div>
    </div>
  );
}