"use client";
// ════════════════════════════════════════════════════════════
//  หน้าสร้างคำขอเบิก  (/request)
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
//       [5.7] ส่ง / บันทึกร่าง
//   [6] หน้าจอ
//       [6.1] ข้อมูลคำขอ   [6.2] โครงการ + วันที่   [6.3] เหตุผล
//       [6.4] ตารางค่าใช้จ่าย + หลักฐาน   [6.5] ยอดรวม
//       [6.6] การ์ดสรุป   [6.7] เส้นทางอนุมัติ   [6.8] บัญชีรับเงิน + ปุ่ม
//   [7] ชิ้นส่วนที่ใช้ซ้ำ
//  * เมนูซ้ายอยู่ที่ app/layout.tsx (ใช้ร่วมทุกหน้า)
// ════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
// component จาก TailGrids (https://tailgrids.com/docs/components)
import { Button } from "@/components/tailgrids/core/button";
import { TextArea } from "@/components/tailgrids/core/text-area";
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
  // ลิงก์ดูไฟล์ที่แนบ (ชื่อไฟล์ → ลิงก์ชั่วคราวในเครื่อง) · ใช้ได้จนกว่าจะปิด/รีเฟรชหน้า
  const [previews, setPreviews] = useState<Record<string, string>>({});

  // ข้อความแจ้งผล
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  // กดส่งแล้วอย่างน้อย 1 ครั้ง → แสดงข้อผิดพลาดใต้ช่อง (ก่อนหน้านั้นไม่เตือน ไม่รบกวนตอนกำลังกรอก)
  const [tried, setTried] = useState(false);
  // ป็อปอัพยืนยันก่อนส่ง: "closed" = ปิด · "confirm" = ถามยืนยัน · "done" = ส่งสำเร็จ กำลังพาไปแดชบอร์ด
  const [popup, setPopup] = useState<"closed" | "confirm" | "done">("closed");

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

  // reduce = บวกทีละแถว (sum = ยอดสะสม เริ่มจาก 0) · ท่าเดียวกับหน้ารายงาน
  const total = items.reduce((sum, it) => sum + Number(it.amount || 0), 0); // ยอดรวม
  const fileCount = items.reduce((sum, it) => sum + it.files.length, 0); // ไฟล์ทั้งหมด
  const rowsWithFile = items.filter((it) => it.files.length > 0).length; // แถวที่แนบแล้ว

  // โครงการที่เลือก + หมวดของโครงการนั้น
  const project = budget.find((p) => p.id === projectId); // ไม่ได้เลือก = undefined
  const categories = project ? project.categories : [];
  const currentYear = user ? new Date().getFullYear() : null
  const myProjects = budget.filter(
    (p) => !!user?.departmentId && p.departmentId === user.departmentId && p.year === currentYear
  )

  // งบคงเหลือของโครงการ = รวม (วงเงิน − ใช้ไป) ทุกหมวด
  const projectRemaining = categories.reduce((sum, c) => sum + c.limit - c.used, 0);

  // เส้นทางอนุมัติตามยอดรวม + ผู้อนุมัติแต่ละขั้น (ดู planApprovalSteps ใน data/approval.ts)
  // ยังไม่รู้ว่าใครล็อกอิน → แสดงตามวงเงินอย่างเดียว
  const plan: PlannedStep[] = user
    ? planApprovalSteps(total, user, org, rules, positions)
    : getApprovalSteps(total, rules).map((role) => ({ role, approverId: null, hasApprover: true, actingRole: null }));
  const steps = plan.map((p) => p.role);
  // ขั้นที่ยังไม่มีใครอนุมัติได้ (ในแผนก/ฝ่ายของผู้ขอ) → ส่งไม่ได้จนกว่าบัญชีจะกำหนดคน
  const missingSteps = plan.filter((p) => !p.hasApprover).map((p) => p.role);

  // ข้อผิดพลาดรายช่อง: ขึ้นหลังกดส่งครั้งแรก แล้วหายเองเมื่อแก้ (ไม่ต้องกดส่งซ้ำ)
  const fieldError = {
    title: tried && !title ? "กรอกชื่อคำขอ" : "",
    project: tried && !project ? "เลือกโครงการ" : "",
    useDate: tried && !useDate ? "เลือกวันที่ใช้จ่าย" : "",
  };
  const rowError = (it: Item) => {
    const e = {
      category: tried && !it.categoryId,
      name: tried && !it.name,
      amount: tried && Number(it.amount || 0) <= 0,
      files: tried && it.files.length === 0,
    };
    return { ...e, any: e.category || e.name || e.amount || e.files };
  };
  // งบคงเหลือรายหมวด + ยอดที่ขอในฟอร์มนี้ (หลายแถวใช้หมวดเดียวกันได้ → รวมก่อนเทียบ)
  const categoryLeft = new Map(categories.map((c) => [c.id, c.limit - c.used]));
  const categoryAsked = new Map<string, number>();
  for (const it of items) {
    if (it.categoryId)
      categoryAsked.set(it.categoryId, (categoryAsked.get(it.categoryId) ?? 0) + Number(it.amount || 0));
  }

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
    // เหลือแถวเดียว = ล้างแถวให้ว่าง (คำขอต้องมีอย่างน้อย 1 แถวเสมอ)
    if (items.length === 1) {
      setItems([emptyItem()]);
      return;
    }
    setItems(items.filter((_, i) => i !== index)); // เก็บทุกแถว ยกเว้นแถวที่กดลบ
  }

  // แก้ 1 แถว: map เดินดูทีละแถว → แถวที่กด (i === index) เอาของเดิม + ค่าใหม่ทับ · แถวอื่นคืนเดิม
  // ※ React ต้องได้ลิสต์ใหม่ถึงจะวาดจอใหม่ (map สร้างลิสต์ใหม่ให้)
  function updateRow(index: number, change: Partial<Item>) {
    setItems(items.map((it, i) => (i === index ? { ...it, ...change } : it)));
  }

  // แก้ 1 ช่อง ของ 1 แถว เช่น changeItem(0, "name", "ตั๋วเครื่องบิน")
  function changeItem(
    index: number,
    field: "categoryId" | "name" | "amount",
    value: string,
  ) {
    updateRow(index, { [field]: value }); // [field] = ใช้ชื่อช่องที่ส่งมาเป็นชื่อ
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

    // ทำลิงก์ดูไฟล์ ไว้กดเปิดดูก่อนส่ง
    const links = { ...previews };
    for (const f of Array.from(picked)) links[f.name] = URL.createObjectURL(f);
    setPreviews(links);
    updateRow(index, { files: [...items[index].files, ...names] }); // ไฟล์เดิม + ไฟล์ใหม่

    e.target.value = ""; // ล้างช่อง จะได้เลือกไฟล์ชื่อเดิมซ้ำได้
  }

  function removeFile(index: number, fileIndex: number) {
    updateRow(index, { files: items[index].files.filter((_, i) => i !== fileIndex) }); // เก็บทุกไฟล์ ยกเว้นไฟล์ที่กด ×
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
      typeLabel: isAdvance
        ? "สำรองจ่ายแล้ว (ขอเบิกคืน)"
        : "ให้บัญชีจ่ายตามใบแจ้งหนี้",
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

  // ---------- [5.7] ส่ง / บันทึกร่าง ----------
  function submit() {
    const list = validate();
    setErrors(list);
    setTried(true); // เริ่มแสดงข้อผิดพลาดใต้ช่อง
    setMessage("");
    if (list.length > 0) return; // มีข้อผิด → หยุด ไม่บันทึก
    setPopup("confirm"); // ผ่านแล้ว → ถามยืนยันก่อน ยังไม่บันทึก
  }

  // กด "ยืนยัน" ในป็อปอัพ → บันทึกจริง → โชว์สำเร็จแป๊บนึง → ไปหน้าถัดไป
  // - คำขอใหม่ → แดชบอร์ด · ส่งใหม่ (เคยถูกตีกลับ) → หน้า "คำขอของฉัน"
  function confirmSubmit() {
    const next = resubmit ? MY_REQUEST_PATH : "/"; // จำไว้ก่อน
    saveRequest("รออนุมัติ");
    setPopup("done");
    setTimeout(() => router.push(next), 1200);
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
      <h1 className="mb-9 text-[32px] font-bold text-[#0F172A]">
        {resubmit ? "แก้ไขคำขอที่ถูกตีกลับ" : "สร้างคำขอเบิก"}
      </h1>

      {/* จอกว้าง (≥1280px) = ฟอร์ม 3 : สรุป 1 เหมือนเดิม · จอแคบ = สรุปต่อท้ายฟอร์ม */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        {/* ===== คอลัมน์ซ้าย: ฟอร์ม ===== */}
        <section className="min-w-0 rounded-xl xl:col-span-3 border border-[#E2E8F0] bg-white p-6 shadow-2xl">
          {/* ---------- กล่องแจ้ง: คำขอนี้ถูกตีกลับ ---------- */}
          {resubmit && (
            <div role="note" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
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

          <p id="type-label" className="mb-1.5 mt-4 text-sm font-semibold">
            ประเภทคำขอ
          </p>
          <div
            role="group"
            aria-labelledby="type-label"
            className="flex gap-1 rounded-xl bg-[#F1F5F9] p-1"
          >
            <TypeButton
              active={type === "invoice"}
              onClick={() => setType("invoice")}
              icon={<ClockThree size={16} />}
              text="ให้บัญชีจ่ายตามใบแจ้งหนี้"
            />
            <TypeButton
              active={type === "advance"}
              onClick={() => setType("advance")}
              icon={<Wallet2 size={16} />}
              text="สำรองจ่ายแล้ว (ขอเบิกคืน)"
            />
          </div>

          <Label htmlFor="req-title" text="ชื่อคำขอ" />
          <input
            id="req-title"
            className={`w-full ${fieldClassFor(!!fieldError.title)}`}
            placeholder="เช่น ค่าเดินทางสัมมนา เชียงใหม่"
            value={title}
            aria-invalid={!!fieldError.title}
            aria-describedby={fieldError.title ? "req-title-error" : undefined}
            onChange={(e) => setTitle(e.target.value)}
          />
          <FieldError id="req-title-error" text={fieldError.title} />

          {/* ---------- [6.2] โครงการ + วันที่ ---------- */}
          <div className="flex gap-4">
            <div className="min-w-0 flex-[2]">
              <Label htmlFor="req-project" text="โครงการ" />
              <select
                id="req-project"
                className={`w-full cursor-pointer ${fieldClassFor(!!fieldError.project)}`} // ชี้แล้วเป็นรูปมือ = กดได้
                value={projectId}
                aria-invalid={!!fieldError.project}
                aria-describedby="req-project-hint"
                onChange={(e) => changeProject(e.target.value)}
              >
                <option value="">เลือกโครงการ</option>
                {myProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div id="req-project-hint">
                <FieldError text={fieldError.project} />
                {/* ไม่มีโครงการให้เลือก: ยังไม่กำหนดแผนก / แผนกยังไม่มีงบปีนี้ */}
                {user && myProjects.length === 0 && (
                  <p className="mt-1.5 text-xs text-[#B45309]">
                    {user.departmentId
                      ? "แผนกของคุณยังไม่มีโครงการในปีนี้ ติดต่อฝ่ายบัญชีให้ตั้งงบก่อน"
                      : "บัญชีของคุณยังไม่ได้กำหนดแผนก ติดต่อฝ่ายบัญชี"}
                  </p>
                )}
                {project && (
                  <p className="mt-1.5 text-xs text-[#64748B]">
                    งบโครงการคงเหลือ{" "}
                    <b className="money text-[#047857]">฿{money(projectRemaining)}</b>{" "}
                    จาก {categories.length} หมวด
                  </p>
                )}
              </div>
            </div>
            <div className="flex-1">
              <Label htmlFor="req-date" text="วันที่ใช้จ่าย" />
              <input
                id="req-date"
                type="date"
                className={`w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${fieldClassFor(!!fieldError.useDate)}`} // ไอคอนปฏิทิน = รูปมือ
                value={useDate}
                aria-invalid={!!fieldError.useDate}
                onChange={(e) => setUseDate(e.target.value)}
              />
              <FieldError text={fieldError.useDate} />
            </div>
          </div>

          {/* ---------- [6.3] เหตุผล ---------- */}
          <Label htmlFor="req-reason" text="เหตุผลการเบิก" optional />
          {/* TailGrids TextArea */}
          <TextArea
            id="req-reason"
            rows={3}
            className="resize-y rounded-xl text-sm"
            placeholder="เช่น เดินทางไปสัมมนาที่เชียงใหม่ ใช้เงินส่วนตัวสำรองจ่ายไปก่อน"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          {/* ---------- [6.4] ตารางค่าใช้จ่าย + หลักฐานรายแถว ---------- */}
          <div className="mb-3 mt-8 flex items-baseline justify-between border-t border-[#E2E8F0] pt-6">
            <h2 className="text-lg font-bold">รายการค่าใช้จ่าย</h2>
            <span className="text-sm text-[#64748B]">
              แนบ{fileLabel}ทุกรายการ อย่างน้อยรายการละ 1 ไฟล์
            </span>
          </div>

          <div className="mb-1.5 flex gap-2 px-1 text-xs font-semibold text-[#64748B]" aria-hidden="true">
            <span className="w-40">หมวด</span>
            <span className="flex-1">รายละเอียด</span>
            <span className="w-36 text-right">จำนวนเงิน</span>
            <span className="w-28 text-center">{fileLabel}</span>
            <span className="w-10" />
          </div>

          <ul className="flex flex-col gap-3">
            {items.map((it, i) => {
              const row = i + 1;
              const err = rowError(it);
              const left = it.categoryId ? categoryLeft.get(it.categoryId) : undefined;
              const asked = it.categoryId ? (categoryAsked.get(it.categoryId) ?? 0) : 0;
              const over = left !== undefined && asked > left;
              return (
                <li key={i} className="rounded-xl border border-[#E2E8F0] p-2">
                  <div className="flex gap-2">
                    <select
                      aria-label={`หมวด รายการที่ ${row}`}
                      className={`${fieldClassFor(err.category || over)} w-40 shrink-0 cursor-pointer px-3 disabled:cursor-not-allowed`} // กดได้ = รูปมือ · ยังไม่เลือกโครงการ = รูปห้าม
                      value={it.categoryId}
                      aria-invalid={err.category || over}
                      onChange={(e) => changeItem(i, "categoryId", e.target.value)}
                      disabled={!project}
                    >
                      <option value="">{project ? "เลือกหมวด" : "เลือกโครงการก่อน"}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label={`รายละเอียด รายการที่ ${row}`}
                      className={`${fieldClassFor(err.name)} min-w-0 flex-1`}
                      placeholder="เช่น ตั๋วเครื่องบินไป-กลับ"
                      value={it.name}
                      aria-invalid={err.name}
                      onChange={(e) => changeItem(i, "name", e.target.value)}
                    />
                    <div
                      className={`flex w-36 shrink-0 items-center rounded-xl border bg-white px-3 focus-within:border-[#059669] ${
                        err.amount || over ? "border-[#FDA4AF]" : "border-[#E2E8F0]"
                      }`}
                    >
                      <span className="text-sm text-[#94A3B8]" aria-hidden="true">
                        ฿
                      </span>
                      <input
                        type="number"
                        min={0} // ปุ่มลูกศรลดไม่ต่ำกว่า 0
                        // ห้ามพิมพ์ - + e (ยอดเงินติดลบ / เลขแปลก ๆ ไม่ได้)
                        onKeyDown={(e) => {
                          if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
                        }}
                        onWheel={(e) => e.currentTarget.blur()} // เลื่อนเมาส์บนช่องไม่เปลี่ยนเลข
                        inputMode="decimal"
                        aria-label={`จำนวนเงิน รายการที่ ${row}`}
                        aria-invalid={err.amount || over}
                        className="money w-full border-0 bg-transparent px-1 py-2.5 text-right text-sm font-semibold outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        placeholder="0"
                        value={it.amount}
                        onChange={(e) => changeItem(i, "amount", e.target.value.replace("-", ""))} // กันวางเลขติดลบ
                      />
                    </div>
                    {/* ปุ่มแนบ: ยังไม่มีไฟล์ = ขอบประ · มีแล้ว = เขียว + จำนวนไฟล์ */}
                    <label
                      className={`flex w-28 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl text-sm font-semibold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#059669] ${
                        it.files.length > 0
                          ? "border border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]"
                          : err.files
                            ? "border border-dashed border-[#FDA4AF] bg-[#FFF1F2] text-[#BE123C]"
                            : "border border-dashed border-[#CBD5E1] bg-white text-[#475569] hover:border-[#059669] hover:text-[#047857]"
                      }`}
                    >
                      <Upload1 size={16} aria-hidden="true" />
                      {it.files.length > 0 ? `${it.files.length} ไฟล์` : "แนบไฟล์"}
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        aria-label={`แนบ${fileLabel} รายการที่ ${row}`}
                        className="sr-only"
                        onChange={(e) => addFiles(i, e)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      aria-label={`ลบรายการที่ ${row}`}
                      title={items.length === 1 ? "ล้างรายการนี้" : `ลบรายการที่ ${row}`}
                      className="flex w-10 shrink-0 items-center justify-center rounded-xl text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#DC2626] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Trash1 size={18} />
                    </button>
                  </div>

                  {/* แถวล่าง: งบคงเหลือของหมวด · ไฟล์ที่แนบ · ข้อผิดพลาดของแถว */}
                  {(left !== undefined || it.files.length > 0 || err.any) && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-xs">
                      {left !== undefined && (
                        <span className={over ? "font-semibold text-[#BE123C]" : "text-[#64748B]"}>
                          {over
                            ? `เกินงบหมวดนี้ ฿${money(asked - left)} (เหลือ ฿${money(left)})`
                            : `งบหมวดนี้เหลือ ฿${money(left - asked)} หลังรายการนี้`}
                        </span>
                      )}
                      {it.files.map((name, f) => (
                        <span
                          key={f}
                          className="flex items-center gap-1 rounded-lg bg-[#F1F5F9] py-0.5 pl-2 pr-1 text-[#334155]"
                        >
                          <FileText size={12} className="text-[#64748B]" aria-hidden="true" />
                          {/* มีลิงก์ = กดเปิดดูได้ · ไฟล์จากร่างเก่าไม่มีลิงก์ (ยังไม่มีที่เก็บไฟล์จริง) */}
                          {previews[name] ? (
                            <a href={previews[name]} target="_blank" rel="noreferrer" className="underline hover:text-[#047857]">
                              {name}
                            </a>
                          ) : (
                            <span title="ไฟล์จากร่างเก่า ดูไม่ได้ ต้องแนบใหม่">{name}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(i, f)}
                            aria-label={`ลบไฟล์ ${name}`}
                            className="rounded px-1 text-[#94A3B8] hover:text-[#DC2626]"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {err.any && (
                        <span className="font-semibold text-[#BE123C]">
                          {[
                            err.category && "เลือกหมวด",
                            err.name && "กรอกรายละเอียด",
                            err.amount && "กรอกจำนวนเงิน",
                            err.files && `แนบ${fileLabel}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={addItem}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-[#059669] py-2.5 text-sm font-semibold text-[#047857] hover:bg-[#ECFDF5]"
          >
            <Plus size={16} aria-hidden="true" /> เพิ่มรายการ
          </button>

          {/* ---------- [6.5] ยอดรวม + สถานะหลักฐาน ---------- */}
          <div className="mt-4 flex items-center justify-between border-t border-[#E2E8F0] px-1 pt-4">
            <span
              className={`text-sm ${rowsWithFile < items.length ? "text-[#B45309]" : "text-[#047857]"}`}
            >
              แนบ{fileLabel}แล้ว{" "}
              <b className="money">
                {rowsWithFile} จาก {items.length}
              </b>{" "}
              รายการ
            </span>
            <span className="flex items-baseline gap-3">
              <span className="text-sm text-[#64748B]">ยอดรวม</span>
              <b className="money text-2xl text-[#0F172A]">฿{money(total)}</b>
            </span>
          </div>
        </section>

        {/* ===== คอลัมน์ขวา: สรุป ===== */}
        <section className="flex min-w-0 flex-col gap-5 xl:col-span-1">
          {/* ---------- [6.6] การ์ดสรุป: ยอดขอ + ผลต่องบโครงการ ---------- */}
          <div className="rounded-xl bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#047857] p-6 text-white shadow-2xl">
            <p className="flex items-center gap-2 text-sm text-[#CBD5E1]">
              <Wallet2 size={18} className="shrink-0 text-[#34D399]" aria-hidden="true" />
              ยอดที่ขอเบิก
            </p>
            <p className="money my-1 text-[clamp(1.75rem,2.6vw,2.25rem)] font-bold leading-tight">฿{money(total)}</p>
            <p className="text-sm text-[#A7F3D0]">
              {items.length} รายการ, {fileLabel} {fileCount} ไฟล์
            </p>

            <div className="mt-5 border-t border-white/15 pt-4">
              <p className="flex items-center gap-2 text-sm text-[#CBD5E1]">
                <Calendar size={16} className="shrink-0 text-[#34D399]" aria-hidden="true" />
                งบโครงการหลังอนุมัติ
              </p>
              {project ? (
                <>
                  <p
                    className={`money mt-1 text-xl font-bold ${projectRemaining - total < 0 ? "text-[#FDA4AF]" : "text-white"}`}
                  >
                    ฿{money(projectRemaining - total)}
                  </p>
                  {/* แถบ: ส่วนที่คำขอนี้จะใช้จากงบคงเหลือของโครงการ */}
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"
                    role="img"
                    aria-label={`คำขอนี้ใช้ ${projectRemaining > 0 ? Math.min(100, Math.round((total / projectRemaining) * 100)) : 0}% ของงบโครงการที่เหลือ`}
                  >
                    <div
                      className={`h-full rounded-full ${projectRemaining - total < 0 ? "bg-[#FB7185]" : "bg-[#34D399]"}`}
                      style={{
                        width: `${projectRemaining > 0 ? Math.min(100, (total / projectRemaining) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-[#CBD5E1]">
                    จากที่เหลืออยู่ <span className="money">฿{money(projectRemaining)}</span>
                  </p>
                </>
              ) : (
                <p className="mt-1 whitespace-nowrap text-xs text-[#94A3B8]">เลือกโครงการเพื่อดูงบ</p>
              )}
            </div>

            <p className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-xs text-[#D1FAE5]">
              {isAdvance ? "ได้รับเงินคืนเมื่อการเงินทำจ่าย" : "การเงินโอนให้ผู้ขายตามใบแจ้งหนี้"}
            </p>
          </div>

          {/* ---------- [6.7] เส้นทางอนุมัติ (เปลี่ยนตามยอดเงิน) ---------- */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-lg font-bold">เส้นทางการอนุมัติ</h2>
            <p className="mb-4 text-xs text-[#64748B]">เปลี่ยนตามยอดรวมที่ขอ</p>
            <ol>
              <Step
                marker={<User2 size={16} aria-hidden="true" />}
                tone="self"
                text={user ? user.fullName : "คุณ (ผู้ขอ)"}
                sub="ส่งคำขอ"
              />
              {steps.map((role, i) => {
                const acting = plan[i]?.actingRole;
                const missing = missingSteps.includes(role);
                const backHere = !!resubmit && sameRoute && i === resubmit.stepIndex;
                return (
                  <Step
                    key={role}
                    marker={i + 1}
                    tone={missing ? "missing" : backHere ? "back" : "next"}
                    text={
                      acting
                        ? `${getRoleLabel(acting, positions)} (แทน${getRoleLabel(role, positions)})`
                        : getRoleLabel(role, positions)
                    }
                    sub={STEP_SUB[role] ?? "อนุมัติ"}
                    warning={
                      missing
                        ? "ยังไม่มีผู้อนุมัติในแผนก/ฝ่ายของคุณ"
                        : backHere
                          ? "ส่งใหม่แล้วจะกลับมาที่ขั้นนี้"
                          : undefined
                    }
                    last={i === steps.length - 1}
                  />
                );
              })}
            </ol>
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
                <p className="mb-1.5 text-sm font-semibold">โอนเงินคืนเข้าบัญชี</p>
                <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#E2E8F0] p-3">
                  {/* วงกลมเขียว + ไอคอนคน (ใช้ User2 ตัวเดียวกับเส้นทางอนุมัติ) */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D1FAE5]">
                    <User2 size={18} className="text-[#059669]" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${user?.bankAccount ? "" : "text-[#B45309]"}`}>
                      {bankLabel}
                    </p>
                    <p className="text-xs text-[#64748B]">{user ? user.fullName : "-"}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="mb-1.5 text-sm font-semibold">การจ่ายเงิน</p>
                <p className="mb-5 rounded-xl border border-[#E2E8F0] p-3 text-sm text-[#64748B]">
                  {/* แยก 2 ท่อน ห้ามตัดกลางคำ → ถ้าที่ไม่พอ ท่อนหลังลงบรรทัดใหม่ทั้งก้อน */}
                  <span className="whitespace-nowrap">การเงินจะโอนให้ผู้ขาย</span>{" "}
                  <span className="whitespace-nowrap">ตามใบแจ้งหนี้ที่แนบ</span>
                </p>
              </>
            )}

            {/* ข้อผิดพลาดรวม: บอกจำนวน + สิ่งที่ต้องแก้ (รายช่องขึ้นใต้ช่องแล้ว) */}
            <div aria-live="polite">
              {errors.length > 0 && (
                <div role="alert" className="mb-3 rounded-xl border border-[#FECDD3] bg-[#FFF1F2] p-3 text-sm text-[#9F1239]">
                  <p className="font-semibold">ยังส่งไม่ได้ ต้องแก้ {errors.length} จุด</p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs">
                    {errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
              {message && (
                <div className="mb-3 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-3 text-sm text-[#047857]">
                  <p>{message}</p>
                </div>
              )}
            </div>

            {/* TailGrids Button: ส่ง = primary · บันทึกร่าง = outline */}
            <Button variant="primary" size="lg" className="w-full font-bold" onPress={submit}>
              <Send1 size={18} aria-hidden="true" />
              {resubmit ? "แก้ไขแล้วส่งใหม่" : "ส่งคำขอ"}
            </Button>
            {/* คำขอที่ถูกตีกลับ แปลงกลับเป็นร่างไม่ได้ (จะหลุดจากสถานะตีกลับ) จึงซ่อนปุ่มนี้ */}
            {!resubmit && (
              <Button variant="primary" appearance="outline" size="lg" className="mt-2 w-full" onPress={saveDraft}>
                บันทึกร่าง
              </Button>
            )}
          </div>
        </section>
      </div>

      {/* ---------- ป็อปอัพยืนยันส่งคำขอ ---------- */}
      {popup !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            {popup === "confirm" ? (
              <>
                <h2 className="text-xl font-bold">ยืนยันส่งคำขอ?</h2>
                <p className="mt-1 text-sm text-[#64748B]">
                  แก้ไขได้จนกว่าฝ่ายบัญชีจะเริ่มตรวจ
                  ถ้าบัญชี/การเงินเริ่มทำเรื่องแล้วจะแก้ไม่ได้
                </p>
                <div className="mt-4 space-y-2 rounded-xl bg-[#F8FAFC] p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">ชื่อคำขอ</span>
                    <b>{title}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">ยอดรวม</span>
                    <b className="text-[#059669]">฿{money(total)}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">ส่งต่อให้</span>
                    <b>{targetLabel}</b>
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={() => setPopup("closed")}
                    className="flex-1 rounded-xl bg-gray-100 py-3 font-semibold text-gray-600 hover:bg-gray-200"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={confirmSubmit}
                    className="flex-1 rounded-xl bg-[#059669] py-3 font-bold text-white hover:bg-[#047857]"
                  >
                    ยืนยัน
                  </button>
                </div>
              </>
            ) : (
              <div className="py-4 text-center">
                {/* วงกลมเขียวอ่อน + เครื่องหมายถูก (วาดด้วย svg ไม่ต้อง import ไอคอนเพิ่ม) */}
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ECFDF5]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-8 w-8"
                    fill="none"
                    stroke="#059669"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </div>
                <h2 className="mt-4 text-xl font-bold text-[#0F172A]">
                  ส่งคำขอแล้ว
                </h2>
                <p className="mt-1 text-sm text-[#64748B]">
                  กำลังพาไปแดชบอร์ด…
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════
//  [7] ชิ้นส่วนที่ใช้ซ้ำ
// ════════════════════════════════════════

// หน้าตาช่องกรอก · ผิด = ขอบแดง
function fieldClassFor(invalid: boolean) {
  return `rounded-xl border bg-white px-4 py-2.5 text-sm outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#059669]/15 disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#94A3B8] ${
    invalid ? "border-[#FDA4AF]" : "border-[#E2E8F0]"
  }`;
}

const STEP_SUB: Record<StepRole, string> = {
  HEAD: "อนุมัติ",
  DIRECTOR: "อนุมัติ",
  MANAGING_DIRECTOR: "อนุมัติ",
  ACCOUNTANT_ADMIN: "ตรวจสอบหลักฐาน",
  FINANCE: "ทำจ่าย",
};

// [7.1] หัวข้อช่องกรอก (ผูกกับช่องด้วย htmlFor → คลิกหัวข้อแล้วโฟกัสช่อง / โปรแกรมอ่านจออ่านถูก)
function Label({ htmlFor, text, optional }: { htmlFor: string; text: string; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 mt-4 block text-sm font-semibold">
      {text}
      {optional && <span className="ml-1.5 font-normal text-[#94A3B8]">ไม่บังคับ</span>}
    </label>
  );
}

// [7.1b] ข้อความผิดใต้ช่อง
function FieldError({ id, text }: { id?: string; text: string }) {
  if (!text) return null;
  return (
    <p id={id} className="mt-1.5 text-xs font-semibold text-[#BE123C]">
      {text}
    </p>
  );
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
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold ${
        active
          ? "bg-white text-[#047857] shadow-sm ring-1 ring-[#A7F3D0]"
          : "text-[#64748B] hover:text-[#0F172A]"
      }`}
    >
      <span aria-hidden="true">{icon}</span>
      {text}
    </button>
  );
}

// [7.3] 1 ขั้นในเส้นทางอนุมัติ (ลำดับจริง → ใช้ <li> ใน <ol>)
const STEP_TONE = {
  self: "bg-[#059669] text-white",
  next: "border border-[#CBD5E1] bg-white text-[#475569]",
  missing: "border border-dashed border-[#FDA4AF] bg-[#FFF1F2] text-[#BE123C]",
  back: "border border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
};
function Step({
  marker,
  tone,
  text,
  sub,
  warning,
  last,
}: {
  marker: React.ReactNode;
  tone: keyof typeof STEP_TONE;
  text: string;
  sub: string;
  warning?: string; // ขั้นที่ยังไม่มีผู้อนุมัติ / ขั้นที่ตีกลับ
  last?: boolean;
}) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={`money flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${STEP_TONE[tone]}`}
        >
          {marker}
        </span>
        {!last && <span className="my-1 w-px flex-1 bg-[#E2E8F0]" aria-hidden="true" />}
      </div>
      <div className="min-w-0 pb-4">
        <p className="text-sm font-semibold">{text}</p>
        <p className="text-xs text-[#64748B]">{sub}</p>
        {warning && (
          <p className={`mt-0.5 text-xs font-semibold ${tone === "back" ? "text-[#B45309]" : "text-[#BE123C]"}`}>
            {warning}
          </p>
        )}
      </div>
    </li>
  );
}
