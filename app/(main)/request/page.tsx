"use client";
// ════════════════════════════════════════════════════════════
//  หน้าสร้างคำขอเบิก  (/request)
// ════════════════════════════════════════════════════════════

//   [1] ชนิดข้อมูล
//   [2] ข้อมูลงบ: โครงการ → หมวด → วงเงิน   (data/budget.ts)
//   [3] กฎการอนุมัติตามวงเงิน             (data/approval.ts)
//   [4] ฟังก์ชันช่วย
//   [5] หน้าหลัก
//       [5.1] state + เปิดร่าง (?id=)   [5.2] ค่าที่คำนวณ (ยอดรวม / จำนวนไฟล์)
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
import { useRouter } from "next/navigation";
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

// แถวว่าง 1 แถว (ใช้ตอนเปิดหน้า / กดเพิ่มรายการ / ลบแถวสุดท้าย)
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
  // ป็อปอัพยืนยันก่อนส่ง: "closed" = ปิด · "confirm" = ถามยืนยัน · "done" = ส่งสำเร็จ กำลังพาไปแดชบอร์ด
  const [popup, setPopup] = useState<"closed" | "confirm" | "done">("closed");
  const router = useRouter(); // ใช้เปลี่ยนหน้า

  // เลขที่ร่างที่กำลังแก้ (ยังไม่เคยบันทึกร่าง = "")
  // ※ กดบันทึกร่างซ้ำ → ทับใบเดิม ไม่เกิดร่างซ้ำหลายใบ
  const [draftId, setDraftId] = useState("");

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
    // กฎวงเงิน: ข้อมูลในเครื่องผิดรูปแบบ → ใช้ค่าเริ่มต้น (ดู loadApprovalRules)
    setRules(loadApprovalRules());
    // ผู้ใช้: ใช้ข้อมูลล่าสุด (มี departmentId) ไม่ใช่ภาพ ณ ตอน login
    setUser(getCurrentUser());
    setOrg(loadOrganization());
    setPositions(loadPositions());
    setBudget(addRequestsToBudget(loadRequests()));

    // ---------- [5.1] เปิดร่างมาแก้ต่อ: /request?id=REQ-xxx ----------
    const params = new URLSearchParams(window.location.search); // อ่านป้ายท้าย URL
    const openId = params.get("id"); // "REQ-xxx" หรือ null ถ้าไม่มีป้าย
    const draft = loadRequests().find(
      (r) => r.id === openId && r.status === "ร่าง",
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
    : getApprovalSteps(total, rules).map((role) => ({ role, approverId: null, hasApprover: true }));
  const steps = plan.map((p) => p.role);
  // ขั้นที่ยังไม่มีใครอนุมัติได้ (ในแผนก/ฝ่ายของผู้ขอ) → ส่งไม่ได้จนกว่าบัญชีจะกำหนดคน
  const missingSteps = plan.filter((p) => !p.hasApprover).map((p) => p.role);

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

    // เคยบันทึกร่างไว้ → ใช้ใบเดิม · ยังไม่เคย → ออกเลขใหม่
    // ※ ใช้เวลาเป็นเลขที่ ไม่ซ้ำแม้ลบคำขอเก่า
    const id = draftId ? draftId : "REQ-" + new Date().getTime();
    const old = all.find((r) => r.id === id);

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

    const request: SavedRequest = {
      id,
      createdAt: old ? old.createdAt : now, // แก้ร่าง = วันสร้างเดิม
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
      // ทุกขั้นเริ่มที่ "รอ" · หน้าอนุมัติเป็นคนเปลี่ยน · approverId = คนที่ต้องอนุมัติขั้นนั้น
      approvalSteps: plan.map(({ role, approverId }) => ({
        role,
        approverId,
        label: getRoleLabel(role, positions),
        status: "รอ",
        by: null,
        at: null,
        note: "",
      })),
      currentStep: 0, // ขั้นแรกในลิสต์
      history: [
        ...(old ? old.history : []), // ประวัติเดิมของร่าง
        makeHistory(status === "ร่าง" ? "บันทึกร่าง" : "ส่งคำขอ", user, { at: now }),
      ],
    };

    // มีใบเดิม = แทนที่ · ไม่มี = ต่อท้าย
    const others = all.filter((r) => r.id !== id);
    localStorage.setItem(REQUESTS_KEY, JSON.stringify([...others, request]));

    // ส่งจริง (ไม่ใช่ร่าง) → แจ้งเตือนผู้อนุมัติขั้นแรก (data/notification.ts)
    if (status !== "ร่าง") notifyRequestEvent(request, "submitted", getUsers(), { at: now });
    return id;
  }

  // ---------- [5.7] ส่ง / บันทึกร่าง ----------
  function submit() {
    const list = validate();
    setErrors(list);
    setMessage("");
    if (list.length > 0) return; // มีข้อผิด → หยุด ไม่บันทึก
    setPopup("confirm"); // ผ่านแล้ว → ถามยืนยันก่อน ยังไม่บันทึก
  }

  // กด "ยืนยัน" ในป็อปอัพ → บันทึกจริง → โชว์สำเร็จแป๊บนึง → ไปแดชบอร์ด
  function confirmSubmit() {
    saveRequest("รออนุมัติ");
    setPopup("done");
    setTimeout(() => router.push("/"), 1200);
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
      <h1 className="mb-9 text-[32px] font-bold text-[#111]">สร้างคำขอเบิก</h1>

      <div className="grid grid-cols-4 gap-5">
        {/* ===== คอลัมน์ซ้าย: ฟอร์ม ===== */}
        <section className="col-span-3 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
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
                className={`${inputClass} cursor-pointer`} // ชี้แล้วเป็นรูปมือ = กดได้
                value={projectId}
                onChange={(e) => changeProject(e.target.value)}
              >
                <option value="">เลือกโครงการ</option>
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
                className={`${inputClass} [&::-webkit-calendar-picker-indicator]:cursor-pointer`} // ช่องพิมพ์ = เคอร์เซอร์พิมพ์ · ไอคอนปฏิทิน = รูปมือ
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
                  className={`${fieldClass} w-36 shrink-0 cursor-pointer bg-white pl-3 pr-8 disabled:cursor-not-allowed`} // กดได้ = รูปมือ · ยังไม่เลือกโครงการ = รูปห้าม
                  value={it.categoryId}
                  onChange={(e) => changeItem(i, "categoryId", e.target.value)}
                  disabled={!project}
                >
                  <option value="">เลือกหมวด</option>
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
                    min={0} // ปุ่มลูกศรลดไม่ต่ำกว่า 0
                    // ห้ามพิมพ์ - + e (ยอดเงินติดลบ / เลขแปลก ๆ ไม่ได้)
                    onKeyDown={(e) => {
                      if (["-", "+", "e", "E"].includes(e.key))
                        e.preventDefault();
                    }}
                    // ซ่อนลูกศรขึ้นลง (ช่องเงินไม่ต้องกดเพิ่มทีละ 1) · เลื่อนเมาส์บนช่องก็ไม่เปลี่ยนเลข
                    className="w-full border-0 bg-transparent px-1 py-2.5 text-right text-sm font-bold outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    onWheel={(e) => e.currentTarget.blur()}
                    inputMode="decimal" // มือถือขึ้นแป้นตัวเลข
                    placeholder="0"
                    value={it.amount}
                    onChange={(e) =>
                      changeItem(i, "amount", e.target.value.replace("-", ""))
                    } // กันวางเลขติดลบ
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
                      {/* มีลิงก์ = กดเปิดดูได้ · ไฟล์จากร่างเก่าไม่มีลิงก์ (ยังไม่มีที่เก็บไฟล์จริง) */}
                      {previews[name] ? (
                        <a
                          href={previews[name]}
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-[#047857]"
                        >
                          {name}
                        </a>
                      ) : (
                        <span title="ไฟล์จากร่างเก่า ดูไม่ได้ ต้องแนบใหม่">
                          {name}
                        </span>
                      )}
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
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-gray-300">
              <span className="flex items-center gap-2 whitespace-nowrap">
                <Calendar size={16} className="text-[#34D399]" />{" "}
                งบโครงการหลังอนุมัติ
              </span>
              {project ? (
                <b className="text-lg text-white">
                  ฿{money(projectRemaining - total)}
                </b>
              ) : (
                <span className="whitespace-nowrap text-xs text-gray-400">
                  เลือกโครงการเพื่อดูงบ
                </span>
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
                warning={missingSteps.includes(role) ? "ยังไม่มีผู้อนุมัติ" : undefined}
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
                  {/* วงกลมเขียว + ไอคอนคน (ใช้ User2 ตัวเดียวกับเส้นทางอนุมัติ) */}
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D1FAE5]">
                    <User2 size={18} className="text-[#059669]" />
                  </div>
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
                  {/* แยก 2 ท่อน ห้ามตัดกลางคำ → ถ้าที่ไม่พอ ท่อนหลังลงบรรทัดใหม่ทั้งก้อน */}
                  <span className="whitespace-nowrap">การเงินจะโอนให้ผู้ขาย</span>{" "}
                  <span className="whitespace-nowrap">ตามใบแจ้งหนี้ที่แนบ</span>
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
              <Send1 size={18} /> ส่งคำขอ
            </button>
            <button
              onClick={saveDraft}
              className="mt-2 w-full rounded-xl bg-gray-100 py-3 font-semibold text-gray-600 hover:bg-gray-200"
            >
              บันทึกร่าง
            </button>
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
                    <b>{getRoleLabel(steps[0], positions)}</b>
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
  warning?: string; // ขั้นที่ยังไม่มีผู้อนุมัติ → แสดงตัวแดงใต้ชื่อขั้น
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
