"use client";

// ════════════════════════════════════════════════════════════
//  ตั้งงบประมาณ (ฝ่ายบัญชี)
//  หลังบอร์ดอนุมัติงบประจำปี → บัญชีกรอกวงเงินตามแผนก → โครงการ → หมวด
//  บันทึกลง localStorage "projects" ผ่าน saveProjects() (data/budget.ts)
//  → แดชบอร์ด / หน้าสร้างคำขอ / รายงาน ใช้ตัวเลขใหม่ทันที
//
//  ※ "ใช้ไป" = ยอดยกมา (used) + คำขอที่ส่งแล้ว (คำนวณ ไม่ได้กรอก)
//  ※ หมวด / โครงการที่มีคำขออ้างอิงอยู่แล้ว ลบไม่ได้
//  ※ โครงการตั้งต้น (seed) ลบไม่ได้ เพราะ loadProjects() จะเติมกลับเอง → ตั้งวงเงินเป็น 0 แทน
// ════════════════════════════════════════════════════════════

import { Fragment, useEffect, useState } from "react";
import { Check, ChevronRight, Close, Copy1, Locked3, Plus, Trash1 } from "@tailgrids/icons";
import { TransferModal, type TransferItem } from "@/components/budget-transfer-modal";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/tailgrids/core/table";
import { Input } from "@/components/tailgrids/core/input";
import { TextField } from "@/components/tailgrids/core/text-field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/tailgrids/core/native-select";
import {
  addRequestsToBudget,
  allocationFromProjects,
  appendBudgetHistory,
  diffBudgets,
  loadBudgetHistory,
  transferBudget,
  type BudgetChange,
  departmentProjectTotal,
  loadAllocations,
  loadProjects,
  projects as SEED_PROJECTS,
  saveAllocations,
  saveProjects,
  sameDivision,
  validateAllocation,
  type BudgetAllocation,
  type Project,
} from "@/data/budget";
import { loadOrganization, type Organization } from "@/data/organization";
import { loadRequests, type SavedRequest } from "@/data/request";
import { getCurrentUser } from "@/utils/login";
import { bkkYear } from "@/utils/date";
import { baht } from "@/utils/format";
import { ActionPopup } from "@/components/action-popup";

const toBE = (year: number) => year + 543; // แสดงปีเป็น พ.ศ.
// สีของแต่ละสายงานในแท่งงบบอร์ด (เขียวเข้ม → อ่อน ตามธีม)
const LINE_SHADES = ["#047857", "#059669", "#34D399", "#6EE7B7", "#A7F3D0"];
const ORPHANS = "__orphans"; // รายการ "ไม่พบแผนก" ในรายชื่อแผนกขั้นที่ 3

// เลขรหัสถัดไป เช่น P05 → P06 / C13 → C14
function nextId(prefix: string, ids: string[]) {
  const max = ids.reduce((m, id) => {
    const n = Number(id.slice(prefix.length));
    return id.startsWith(prefix) && Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return prefix + String(max + 1).padStart(2, "0");
}

export default function BudgetSetting() {
  // ข้อมูลที่บันทึกไว้ (saved) กับฉบับที่กำลังแก้ (draft) แยกกัน → กดบันทึกถึงจะเขียนลง localStorage
  const [saved, setSaved] = useState<Project[]>([]);
  const [draft, setDraft] = useState<Project[]>([]);
  // การแบ่งงบบอร์ด → สาย → ฝ่าย → แผนก (แยก saved / draft เหมือนกัน)
  const [savedAlloc, setSavedAlloc] = useState<BudgetAllocation[]>([]);
  const [draftAlloc, setDraftAlloc] = useState<BudgetAllocation[]>([]);
  const [requests, setRequests] = useState<SavedRequest[]>([]);
  const [org, setOrg] = useState<Organization | null>(null);
  const [year, setYear] = useState(bkkYear());
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [savedOver, setSavedOver] = useState<string[] | null>(null); // ป็อปอัพบันทึกงบสำเร็จ · หมวดที่วงเงินต่ำกว่ายอดใช้ไป

  // ฟอร์มเพิ่มโครงการ (แผนก = แผนกที่เลือกอยู่ในขั้นที่ 3)
  const [newName, setNewName] = useState("");
  // ขั้นที่ 2: ชั้นที่กาง / พับ (ไม่ได้กด = กางเฉพาะชั้นที่มีจุดเกิน) · ขั้นที่ 3: แผนกที่เลือก
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selDept, setSelDept] = useState<string | null>(null);

  // ประวัติการแก้งบ + ป๊อปอัพโอนงบ (components/budget-transfer-modal.tsx)
  const [history, setHistory] = useState<BudgetChange[]>([]);
  const [transferOpen, setTransferOpen] = useState(false);
  const [tab, setTab] = useState<"setup" | "transfer" | "history">("setup");

  // localStorage มีแค่ในเบราว์เซอร์ → อ่านหลังเปิดหน้า
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage อ่านได้หลังเปิดหน้าเท่านั้น */
    const list = loadProjects();
    setSaved(list);
    setDraft(list);
    const alloc = loadAllocations();
    setSavedAlloc(alloc);
    setDraftAlloc(alloc);
    setRequests(loadRequests());
    setOrg(loadOrganization());
    setHistory(loadBudgetHistory());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const dirty =
    JSON.stringify(saved) !== JSON.stringify(draft) ||
    JSON.stringify(savedAlloc) !== JSON.stringify(draftAlloc);

  // การแบ่งงบของปีที่เลือก · ยังไม่เคยแบ่ง = ตั้งต้นจากวงเงินโครงการที่มีอยู่ (ยังไม่บันทึกจนกว่าจะกดบันทึก)
  const storedAlloc = draftAlloc.find((a) => a.year === year);
  const alloc: BudgetAllocation | null =
    storedAlloc ?? (org ? allocationFromProjects(year, draft, org) : null);

  function patchAlloc(fn: (a: BudgetAllocation) => BudgetAllocation) {
    if (!alloc) return;
    setMessage("");
    const next = fn(alloc);
    setDraftAlloc((list) => [...list.filter((a) => a.year !== year), next]);
  }

  const toAmount = (value: string) => {
    const digits = value.replace(/[^\d]/g, "");
    return digits === "" ? 0 : Number(digits);
  };
  function setBoardTotal(value: string) {
    patchAlloc((a) => ({ ...a, boardTotal: toAmount(value) }));
  }
  function setAllocAmount(level: "lines" | "divisions" | "departments", id: string, value: string) {
    patchAlloc((a) => ({ ...a, [level]: { ...a[level], [id]: toAmount(value) } }));
  }

  // ปีที่เลือกได้ = ปีที่มีงบอยู่แล้ว + ปีนี้ + ปีหน้า
  const thisYear = bkkYear();
  const years = [...new Set([...draft.map((p) => p.year), thisYear, thisYear + 1])].sort();

  // ยอดใช้ไปจริง (ยอดยกมา + คำขอที่ส่งแล้ว) ของแต่ละหมวด
  const withUsage = addRequestsToBudget(requests, draft);
  const usedOf = (categoryId: string) =>
    withUsage.flatMap((p) => p.categories).find((c) => c.id === categoryId)?.used ?? 0;
  const hasRequests = (categoryId: string) =>
    requests.some((r) => r.items.some((it) => it.categoryId === categoryId));

  const yearProjects = draft.filter((p) => p.year === year);
  const boardTotal = alloc?.boardTotal ?? 0;
  const linesTotal = org
    ? org.linesOfWork.reduce((s, l) => s + (alloc?.lines[l.id] ?? 0), 0)
    : 0;

  // ────────────────────────────────────────
  //  ขั้นที่ 2: ต้นไม้ สายงาน → ฝ่าย → แผนก (พับ / กางได้)
  //  childTotal = ชั้นล่างรวมกัน (แผนก = วงเงินโครงการรวม) · ชั้นที่มีจุดเกินกางให้เองตอนเปิดหน้า
  // ────────────────────────────────────────
  const amountOf = (level: "lines" | "divisions" | "departments", id: string) => alloc?.[level][id] ?? 0;
  const divsOf = (lineId: string) => org?.divisions.filter((v) => v.lineOfWorkId === lineId) ?? [];
  const deptsOf = (divId: string) => org?.departments.filter((d) => d.divisionId === divId) ?? [];
  const deptChild = (deptId: string) => departmentProjectTotal(draft, deptId, year);
  const divChild = (divId: string) => deptsOf(divId).reduce((s, d) => s + amountOf("departments", d.id), 0);
  const lineChild = (lineId: string) => divsOf(lineId).reduce((s, v) => s + amountOf("divisions", v.id), 0);
  const deptOver = (deptId: string) => amountOf("departments", deptId) < deptChild(deptId);
  const divIssue = (divId: string) =>
    amountOf("divisions", divId) < divChild(divId) || deptsOf(divId).some((d) => deptOver(d.id));
  const lineIssue = (lineId: string) =>
    amountOf("lines", lineId) < lineChild(lineId) || divsOf(lineId).some((v) => divIssue(v.id));
  const isOpen = (id: string, issue: boolean) => expanded[id] ?? issue;
  const toggleOpen = (id: string, issue: boolean) => setExpanded((e) => ({ ...e, [id]: !isOpen(id, issue) }));

  // 1 แถว: ชื่อ (+ปุ่มพับ) | วงเงิน | แบ่งต่อแล้ว (แท่ง) | ยังไม่ได้แบ่ง / เกิน
  function treeRow(opts: {
    level: "lines" | "divisions" | "departments";
    id: string;
    name: string;
    depth: number;
    childTotal: number;
    childLabel: string;
    toggle?: { open: boolean; issue: boolean; count: string };
  }) {
    const { level, id, name, depth, childTotal, childLabel, toggle } = opts;
    const amount = amountOf(level, id);
    const left = amount - childTotal;
    const share = amount > 0 ? Math.min(100, (childTotal / amount) * 100) : childTotal > 0 ? 100 : 0;
    return (
      <div
        key={id}
        className={`grid grid-cols-[minmax(0,1fr)_11rem_14rem_9rem] items-center gap-4 border-b border-[#F1F5F9] py-2.5 pr-2 ${
          depth === 0 ? "bg-[#F8FAFC]" : ""
        }`}
        style={{ paddingLeft: 12 + depth * 28 }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {toggle ? (
            <button
              type="button"
              aria-expanded={toggle.open}
              onClick={() => toggleOpen(id, toggle.issue)}
              className="flex min-w-0 items-center gap-1.5 rounded-lg py-1 pr-2 text-left hover:text-[#047857]"
            >
              <ChevronRight
                size={16}
                aria-hidden="true"
                className={`shrink-0 text-[#94A3B8] transition-transform ${toggle.open ? "rotate-90" : ""}`}
              />
              <span className={`truncate ${depth === 0 ? "font-bold" : "font-semibold"}`}>{name}</span>
              <span className="shrink-0 text-xs font-normal text-[#94A3B8]">{toggle.count}</span>
              {toggle.issue && !toggle.open && (
                <span className="shrink-0 rounded-full bg-[#FFF1F2] px-2 py-0.5 text-xs font-semibold text-[#BE123C]">มีจุดเกินด้านใน</span>
              )}
            </button>
          ) : (
            <span className="truncate pl-6 text-sm">{name}</span>
          )}
        </div>
        <TextField aria-label={`วงเงิน ${name}`} value={amount.toLocaleString("en-US")} onChange={(v) => setAllocAmount(level, id, v)}>
          <Input inputMode="numeric" className="money w-full bg-white text-right" />
        </TextField>
        <div>
          <div className="money flex justify-between text-xs text-[#64748B]">
            <span>{childLabel}</span>
            <span>{baht(childTotal)}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]" aria-hidden="true">
            <div className={`h-full rounded-full ${left < 0 ? "bg-[#BE123C]" : "bg-[#059669]"}`} style={{ width: `${share}%` }} />
          </div>
        </div>
        <span className={`money text-right text-sm font-semibold ${left < 0 ? "text-[#BE123C]" : left === 0 ? "text-[#64748B]" : "text-[#047857]"}`}>
          {left < 0 ? `เกิน ${baht(-left)}` : left === 0 ? "แบ่งครบ" : `เหลือ ${baht(left)}`}
        </span>
      </div>
    );
  }

  const totalUsed = yearProjects.reduce(
    (s, p) => s + p.categories.reduce((a, c) => a + usedOf(c.id), 0),
    0,
  );

  // จัดกลุ่มตามแผนก (เรียงตามลำดับใน organization)
  const departments = org?.departments ?? [];
  const groups = departments
    .map((d) => ({ dept: d, list: yearProjects.filter((p) => p.departmentId === d.id) }))
    .filter((g) => g.list.length > 0);
  const orphans = yearProjects.filter((p) => !departments.some((d) => d.id === p.departmentId));
  const currentDept = selDept ?? groups[0]?.dept.id ?? departments[0]?.id ?? null;
  const selectedDept = departments.find((d) => d.id === currentDept) ?? null;

  const prevYearProjects = draft.filter((p) => p.year === year - 1);

  // ────────────────────────────────────────
  //  แก้ draft
  // ────────────────────────────────────────
  function patchProject(projectId: string, fn: (p: Project) => Project) {
    setMessage("");
    setDraft((list) => list.map((p) => (p.id === projectId ? fn(p) : p)));
  }

  function setLimit(projectId: string, categoryId: string, value: string) {
    const digits = value.replace(/[^\d]/g, "");
    patchProject(projectId, (p) => ({
      ...p,
      categories: p.categories.map((c) =>
        c.id === categoryId ? { ...c, limit: digits === "" ? 0 : Number(digits) } : c,
      ),
    }));
  }

  function renameCategory(projectId: string, categoryId: string, name: string) {
    patchProject(projectId, (p) => ({
      ...p,
      categories: p.categories.map((c) => (c.id === categoryId ? { ...c, name } : c)),
    }));
  }

  function addCategory(projectId: string) {
    const id = nextId("C", draft.flatMap((p) => p.categories.map((c) => c.id)));
    patchProject(projectId, (p) => ({
      ...p,
      categories: [...p.categories, { id, name: "", limit: 0, used: 0 }],
    }));
  }

  function removeCategory(projectId: string, categoryId: string) {
    patchProject(projectId, (p) => ({
      ...p,
      categories: p.categories.filter((c) => c.id !== categoryId),
    }));
  }

  function addProject(deptId: string) {
    const dept = departments.find((d) => d.id === deptId);
    if (!dept || !newName.trim()) {
      setErrors(["กรอกชื่อโครงการก่อนเพิ่ม"]);
      return;
    }
    const id = nextId("P", draft.map((p) => p.id));
    const categoryId = nextId("C", draft.flatMap((p) => p.categories.map((c) => c.id)));
    setErrors([]);
    setMessage("");
    setDraft((list) => [
      ...list,
      {
        id,
        name: newName.trim(),
        departmentId: dept.id,
        dept: dept.name,
        year,
        categories: [{ id: categoryId, name: "", limit: 0, used: 0 }],
      },
    ]);
    setNewName("");
  }

  function removeProject(projectId: string) {
    setMessage("");
    setDraft((list) => list.filter((p) => p.id !== projectId));
  }

  // คัดลอกโครงการ/หมวดของปีก่อนมาเป็นตั้งต้น (รหัสใหม่ · ยอดยกมา = 0 · วงเงินเดิมให้แก้ต่อ)
  function copyPreviousYear() {
    let pIds = draft.map((p) => p.id);
    let cIds = draft.flatMap((p) => p.categories.map((c) => c.id));
    const copies = prevYearProjects.map((p) => {
      const id = nextId("P", pIds);
      pIds = [...pIds, id];
      return {
        ...p,
        id,
        year,
        categories: p.categories.map((c) => {
          const cid = nextId("C", cIds);
          cIds = [...cIds, cid];
          return { ...c, id: cid, used: 0 };
        }),
      };
    });
    setMessage("");
    setDraft((list) => [...list, ...copies]);
    // การแบ่งงบของปีก่อน (ถ้ามี) คัดลอกมาเป็นตั้งต้นด้วย
    const prevAlloc = draftAlloc.find((a) => a.year === year - 1);
    if (prevAlloc) {
      setDraftAlloc((list) => [...list.filter((a) => a.year !== year), { ...prevAlloc, year }]);
    }
  }

  // ────────────────────────────────────────
  //  ตรวจ + บันทึก
  // ────────────────────────────────────────
  function validate(list: Project[]) {
    const errs: string[] = [];
    for (const p of list) {
      const label = `${p.name || "(ไม่มีชื่อ)"} ปี ${toBE(p.year)}`;
      if (!p.name.trim()) errs.push(`โครงการ ${p.id}: ยังไม่ได้ตั้งชื่อ`);
      if (p.categories.length === 0) errs.push(`${label}: ต้องมีอย่างน้อย 1 หมวด`);
      const names = p.categories.map((c) => c.name.trim());
      if (names.some((n) => !n)) errs.push(`${label}: มีหมวดที่ยังไม่ได้ตั้งชื่อ`);
      if (new Set(names.filter(Boolean)).size !== names.filter(Boolean).length)
        errs.push(`${label}: ชื่อหมวดซ้ำกัน`);
      for (const c of p.categories) {
        if (!Number.isInteger(c.limit) || c.limit < 0)
          errs.push(`${label} › ${c.name}: วงเงินต้องเป็นจำนวนเต็มตั้งแต่ 0`);
      }
      // งบร่วม: ข้ามฝ่าย / ข้ามสายงานไม่ได้ (เช่น ย้ายแผนกไปฝ่ายอื่นหลังแชร์ไว้)
      for (const d of p.sharedWith ?? []) {
        if (d === p.departmentId || (org && !sameDivision(org, p.departmentId, d)))
          errs.push(`${label}: แชร์งบได้เฉพาะแผนกอื่นในฝ่ายเดียวกัน`);
      }
    }
    return errs;
  }

  function handleSave() {
    const clean = draft.map((p) => ({
      ...p,
      name: p.name.trim(),
      categories: p.categories.map((c) => ({ ...c, name: c.name.trim() })),
    }));
    // บันทึกการแบ่งงบของปีที่เปิดอยู่ด้วยเสมอ (ปีที่ยังไม่เคยแบ่งจะได้ค่าตั้งต้นไปเก็บไว้)
    const allocs = alloc ? [...draftAlloc.filter((a) => a.year !== year), alloc] : draftAlloc;
    // ตรวจโครงการ + ตรวจการแบ่งงบทุกปีที่มี (แก้โครงการปีอื่นแล้วเกินงบแผนกก็ถูกจับ)
    const errs = [
      ...validate(draft),
      ...(org
        ? allocs.flatMap((a) =>
            validateAllocation(a, org, clean).map((e) => `ปี ${toBE(a.year)} · ${e}`),
          )
        : []),
    ];
    setErrors(errs);
    if (errs.length > 0) {
      setMessage("");
      return;
    }
    const changes = diffBudgets(saved, clean, savedAlloc, allocs, org, changeBase());
    saveProjects(clean);
    setSaved(clean);
    setDraft(clean);
    saveAllocations(allocs);
    appendBudgetHistory(changes);
    setHistory(loadBudgetHistory());
    setSavedAlloc(allocs);
    setDraftAlloc(allocs);
    // หมวดที่วงเงินต่ำกว่ายอดใช้ไป → บันทึกได้ แต่เตือน
    const over = clean
      .filter((p) => p.year === year)
      .flatMap((p) => p.categories.filter((c) => c.limit < usedOf(c.id)).map((c) => `${p.name} › ${c.name}`));
    setMessage(
      over.length > 0
        ? `บันทึกแล้ว · หมวดที่วงเงินต่ำกว่ายอดใช้ไป: ${over.join(", ")}`
        : "บันทึกงบประมาณแล้ว",
    );
    setSavedOver(over);
  }

  // ใครแก้ เมื่อไร (ใส่ในประวัติ)
  function changeBase() {
    const me = getCurrentUser();
    return { at: new Date().toISOString(), byId: me?.id ?? "", byName: me?.fullName ?? "-" };
  }

  // โอนงบกลางปี: บันทึกทันที (ไม่ผ่าน draft) → ต้องไม่มีการแก้ค้าง จะได้ไม่ปนกัน
  // เรียกจากป๊อปอัพ (หมวด = "projectId/categoryId") · คืนข้อความผิด หรือ null = สำเร็จ
  function handleTransfer(fromKey: string, toKey: string, amount: number, note: string): string | null {
    const [fp, fc] = fromKey.split("/");
    const [tp, tc] = toKey.split("/");
    const fromCat = saved.find((p) => p.id === fp)?.categories.find((c) => c.id === fc);
    const available = fromCat ? fromCat.limit - usedOf(fromCat.id) : 0;
    const res = transferBudget(
      saved,
      { projectId: fp ?? "", categoryId: fc ?? "" },
      { projectId: tp ?? "", categoryId: tc ?? "" },
      amount,
      Math.max(0, available),
      note,
      changeBase(),
    );
    if (!res.ok) return res.error;
    // โอนข้ามแผนกแล้วโครงการรวมเกินงบแผนก → ไม่ให้โอน (ต้องแบ่งงบแผนกใหม่ในขั้นที่ 2 ก่อน)
    const yearAlloc = savedAlloc.find((a) => a.year === year);
    const errs = org && yearAlloc ? validateAllocation(yearAlloc, org, res.projects) : [];
    if (errs.length > 0) return errs.join(" · ");

    saveProjects(res.projects);
    setSaved(res.projects);
    setDraft(res.projects);
    appendBudgetHistory([res.entry]);
    setHistory(loadBudgetHistory());
    return null;
  }

  function handleDiscard() {
    setDraft(saved);
    setDraftAlloc(savedAlloc);
    setErrors([]);
    setMessage("ยกเลิกการแก้ไขแล้ว");
  }

  // ────────────────────────────────────────
  //  ตารางของ 1 โครงการ
  // ────────────────────────────────────────
  function renderProject(p: Project) {
    const isSeed = SEED_PROJECTS.some((s) => s.id === p.id);
    const projectLocked = isSeed || p.categories.some((c) => hasRequests(c.id));
    const limit = p.categories.reduce((s, c) => s + c.limit, 0);
    const used = p.categories.reduce((s, c) => s + usedOf(c.id), 0);
    // งบร่วม: แผนกอื่นในฝ่ายเดียวกันที่เลือกให้ใช้โครงการนี้ได้
    const siblings = org ? org.departments.filter((d) => d.id !== p.departmentId && sameDivision(org, p.departmentId, d.id)) : [];
    const shared = p.sharedWith ?? [];
    const toggleShare = (id: string, on: boolean) =>
      patchProject(p.id, (x) => ({ ...x, sharedWith: on ? [...shared, id] : shared.filter((s) => s !== id) }));

    return (
      <div key={p.id} className="rounded-xl border border-[#E2E8F0] bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#E2E8F0] p-4">
          <TextField
            aria-label={`ชื่อโครงการ ${p.id}`}
            value={p.name}
            onChange={(v) => patchProject(p.id, (x) => ({ ...x, name: v }))}
            className="min-w-60 flex-1"
          >
            <Input className="font-semibold" placeholder="ชื่อโครงการ" />
          </TextField>
          <span className="money text-sm text-[#64748B]">
            วงเงิน <strong className="text-[#0F172A]">{baht(limit)}</strong> ใช้ไป {baht(used)}
          </span>
          {projectLocked ? (
            <span
              className="flex items-center gap-1 text-xs text-[#94A3B8]"
              title={isSeed ? "โครงการตั้งต้นของระบบ ลบไม่ได้ (ตั้งวงเงินเป็น 0 แทน)" : "มีคำขออ้างอิงโครงการนี้"}
            >
              <Locked3 size={14} aria-hidden="true" /> ลบไม่ได้
            </span>
          ) : (
            <button
              type="button"
              onClick={() => removeProject(p.id)}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-[#BE123C] hover:bg-[#FFF1F2]"
            >
              <Trash1 size={16} aria-hidden="true" /> ลบโครงการ
            </button>
          )}
        </div>

        <div className="p-4">
          {/* งบร่วม: ปุ่มเม็ดยาต่อแผนก กดเปิด / ปิด (บันทึกพร้อมปุ่มบันทึกงบประมาณ) */}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm" role="group" aria-label={`แผนกที่ใช้งบ ${p.name || p.id} ร่วม`}>
            <span className="text-[#64748B]">ให้แผนกอื่นใช้ร่วม</span>
            {siblings.length === 0 && <span className="text-[#94A3B8]">ไม่มีแผนกอื่นในฝ่ายเดียวกัน</span>}
            {siblings.map((d) => {
              const on = shared.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleShare(d.id, !on)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${
                    on
                      ? "border-[#059669] bg-[#ECFDF5] font-semibold text-[#047857]"
                      : "border-[#E2E8F0] text-[#475569] hover:border-[#A7F3D0]"
                  }`}
                >
                  {on ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                  {d.name}
                </button>
              );
            })}
          </div>

          <div>
            <TableRoot className="bg-white">
              <TableHeader className="bg-[#F8FAFC] text-xs font-semibold text-[#64748B]">
                <TableRow>
                  <TableHead>หมวดค่าใช้จ่าย</TableHead>
                  <TableHead className="text-right">วงเงิน (บาท)</TableHead>
                  <TableHead className="text-right">ใช้ไป</TableHead>
                  <TableHead className="text-right">คงเหลือ</TableHead>
                  <TableHead className="w-16">
                    <span className="sr-only">ลบ</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.categories.map((c) => {
                  const u = usedOf(c.id);
                  const remaining = c.limit - u;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="min-w-48">
                        <TextField
                          aria-label={`ชื่อหมวด ${c.id}`}
                          value={c.name}
                          onChange={(v) => renameCategory(p.id, c.id, v)}
                        >
                          <Input placeholder="ชื่อหมวด" />
                        </TextField>
                      </TableCell>
                      <TableCell className="text-right">
                        <TextField
                          aria-label={`วงเงิน ${p.name} ${c.name}`}
                          value={c.limit.toLocaleString("en-US")}
                          onChange={(v) => setLimit(p.id, c.id, v)}
                        >
                          <Input inputMode="numeric" className="money ml-auto w-40 text-right" />
                        </TextField>
                      </TableCell>
                      <TableCell className="money text-right text-[#475569]">{baht(u)}</TableCell>
                      <TableCell
                        className={`money text-right font-semibold ${remaining < 0 ? "text-[#BE123C]" : "text-[#047857]"}`}
                      >
                        {baht(remaining)}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasRequests(c.id) ? (
                          <span className="text-xs text-[#94A3B8]" title="มีคำขออ้างอิงหมวดนี้ ลบไม่ได้">
                            ใช้งานอยู่
                          </span>
                        ) : (
                          <button
                            type="button"
                            aria-label={`ลบหมวด ${c.name || c.id}`}
                            onClick={() => removeCategory(p.id, c.id)}
                            className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#FFF1F2] hover:text-[#BE123C]"
                          >
                            <Close size={16} aria-hidden="true" />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </TableRoot>
          </div>

          <button
            type="button"
            onClick={() => addCategory(p.id)}
            className="mt-3 rounded-lg px-2 py-1 text-sm font-semibold text-[#047857] hover:bg-[#ECFDF5]"
          >
            + เพิ่มหมวด
          </button>
        </div>
      </div>
    );
  }

  // หัวข้อแต่ละส่วน (เลขขั้น + ชื่อ + คำอธิบาย) · n = null → ไม่แสดงเลขขั้น
  const stepTitle = (n: number | null, title: string, hint: string) => (
    <div className="mb-6 flex items-start gap-3">
      {n !== null && (
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ECFDF5] text-sm font-bold text-[#047857]"
        >
          {n}
        </span>
      )}
      <div>
        <h2 className="text-2xl font-bold">
          {n !== null && <span className="sr-only">ขั้นที่ {n}: </span>}
          {title}
        </h2>
        <p className="mt-1 text-sm text-[#64748B]">{hint}</p>
      </div>
    </div>
  );

  // ---------- ภาพรวม: แท่งงบบอร์ดแบ่งตามสายงาน ----------
  const unallocated = boardTotal - linesTotal;
  const lineParts = org
    ? org.linesOfWork
        .map((l, i) => ({ id: l.id, name: l.name, amount: alloc?.lines[l.id] ?? 0, color: LINE_SHADES[i % LINE_SHADES.length] }))
        .filter((x) => x.amount > 0)
    : [];
  const barBase = Math.max(boardTotal, linesTotal, 1); // แบ่งเกิน → แท่งยาวเท่ายอดที่แบ่ง และขอบบอร์ดขยับเข้ามา
  const pct = (n: number) => `${(n / barBase) * 100}%`;

  // จุดที่แบ่งเกินในขั้นที่ 2 (ชั้นล่างรวมกันเกินชั้นบน)
  const overSpots =
    org && alloc
      ? [
          ...org.linesOfWork.map(
            (l) => (alloc.lines[l.id] ?? 0) - org.divisions.filter((v) => v.lineOfWorkId === l.id).reduce((s, v) => s + (alloc.divisions[v.id] ?? 0), 0),
          ),
          ...org.divisions.map(
            (v) => (alloc.divisions[v.id] ?? 0) - org.departments.filter((d) => d.divisionId === v.id).reduce((s, d) => s + (alloc.departments[d.id] ?? 0), 0),
          ),
          ...org.departments.map((d) => (alloc.departments[d.id] ?? 0) - departmentProjectTotal(draft, d.id, year)),
        ].filter((x) => x < 0).length
      : 0;
  const historyCount = history.filter((h) => h.year === year).length;

  // ป๊อปอัพโอนงบ: หมวดของปีที่เลือก + วงเงินที่ยังไม่ได้ใช้ (โอนออกได้สูงสุด)
  const transferItems: TransferItem[] = saved
    .filter((p) => p.year === year)
    .flatMap((p) =>
      p.categories.map((c) => ({
        key: `${p.id}/${c.id}`,
        name: `${p.dept} › ${p.name} › ${c.name}`,
        remaining: Math.max(0, c.limit - usedOf(c.id)),
      })),
    );
  const transferCount = history.filter((h) => h.year === year && h.kind === "โอนงบ").length;

  const tabs = [
    { key: "setup" as const, label: "แบ่งงบและโครงการ", badge: dirty ? "ยังไม่บันทึก" : overSpots > 0 ? `เกิน ${overSpots} จุด` : "", warn: overSpots > 0 },
    { key: "transfer" as const, label: "โอนงบกลางปี", badge: "", warn: false },
    { key: "history" as const, label: "ประวัติการแก้งบ", badge: String(historyCount), warn: false },
  ];

  return (
    <div className="text-[#0F172A]">
      <header className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold">ตั้งงบประมาณ</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            กรอกงบที่บอร์ดอนุมัติ แบ่งให้สายงาน ฝ่าย และแผนก แล้วแผนกแบ่งเป็นโครงการ กดบันทึกครั้งเดียวที่แถบด้านล่าง
          </p>
        </div>
        <div className="w-44">
          <NativeSelect
            aria-label="ปีงบประมาณ"
            value={String(year)}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <NativeSelectOption key={y} value={String(y)}>
                ปีงบประมาณ {toBE(y)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </header>

      <div className="flex flex-col gap-9">
        {/* ===== ขั้นที่ 1: งบบอร์ด + แท่งการแบ่งให้สายงาน ===== */}
        <section aria-labelledby="board-title" className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div>
              <h2 id="board-title" className="mb-2 flex items-center gap-2 text-sm text-[#64748B]">
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ECFDF5] text-xs font-bold text-[#047857]"
                >
                  1
                </span>
                งบที่บอร์ดอนุมัติ ปี {toBE(year)}
              </h2>
              <TextField
                aria-label="งบที่บอร์ดอนุมัติ (บาท)"
                value={(alloc?.boardTotal ?? 0).toLocaleString("en-US")}
                onChange={setBoardTotal}
              >
                <Input inputMode="numeric" className="money text-right text-2xl font-bold" />
              </TextField>
              {!storedAlloc && (
                <p className="mt-2 text-xs text-[#B45309]">ยังไม่เคยบันทึกปีนี้ ค่าตั้งต้นรวมจากวงเงินโครงการ</p>
              )}
            </div>

            <div className="flex flex-col justify-between gap-4">
              <dl className="grid grid-cols-3 gap-4">
                <div>
                  <dt className="text-xs text-[#64748B]">แบ่งให้สายงานแล้ว</dt>
                  <dd className="money mt-1 text-xl font-bold">{baht(linesTotal)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#64748B]">{unallocated < 0 ? "แบ่งเกินงบบอร์ด" : "ยังไม่ได้แบ่ง"}</dt>
                  <dd className={`money mt-1 text-xl font-bold ${unallocated < 0 ? "text-[#BE123C]" : ""}`}>
                    {baht(Math.abs(unallocated))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#64748B]">ใช้ไปแล้ว</dt>
                  <dd className="money mt-1 text-xl font-bold">{baht(totalUsed)}</dd>
                  <dd className={`money text-xs ${boardTotal - totalUsed < 0 ? "font-semibold text-[#BE123C]" : "text-[#047857]"}`}>
                    คงเหลือ {baht(boardTotal - totalUsed)}
                  </dd>
                </div>
              </dl>

              {/* แท่งงบบอร์ด: แต่ละช่วงสี = สายงาน · พื้นเทา = ยังไม่แบ่ง · แดง = แบ่งเกิน */}
              <div>
                <div
                  className="relative flex h-4 overflow-hidden rounded-full bg-[#F1F5F9]"
                  role="img"
                  aria-label={`แบ่งให้สายงาน ${baht(linesTotal)} จากงบบอร์ด ${baht(boardTotal)}`}
                >
                  {lineParts.map((x) => (
                    <span key={x.id} style={{ width: pct(x.amount), background: x.color }} title={`${x.name} ${baht(x.amount)}`} />
                  ))}
                  {unallocated < 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 right-0 bg-[#BE123C]/80"
                      style={{ width: pct(-unallocated) }}
                    />
                  )}
                </div>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#475569]">
                  {lineParts.map((x) => (
                    <li key={x.id} className="flex items-center gap-1.5">
                      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: x.color }} />
                      {x.name} <span className="money">{baht(x.amount)}</span>
                    </li>
                  ))}
                  {lineParts.length === 0 && <li>ยังไม่ได้แบ่งให้สายงานใด กรอกในขั้นที่ 2</li>}
                </ul>
              </div>
            </div>
          </div>

        </section>

        {/* แท็บ: แบ่งหน้ายาวเป็นส่วน ๆ (ใช้บน PC เท่านั้น) */}
        <div role="tablist" aria-label="ส่วนของหน้า" className="-mb-3 flex gap-1 border-b border-[#E2E8F0]">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`panel-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm ${
                tab === t.key
                  ? "border-[#059669] font-bold text-[#047857]"
                  : "border-transparent font-semibold text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {t.label}
              {t.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    t.warn ? "bg-[#FFF1F2] text-[#BE123C]" : "bg-[#F1F5F9] text-[#475569]"
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        {tab === "setup" && (
          <div role="tabpanel" id="panel-setup" aria-labelledby="tab-setup" className="flex flex-col gap-9">
        {/* ===== ขั้นที่ 2: แบ่งงบบอร์ด → สายงาน → ฝ่าย → แผนก (ต้นไม้พับได้) ===== */}
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            {stepTitle(2, `แบ่งงบตามสายงาน / ฝ่าย / แผนก ปี ${toBE(year)}`, "กดชื่อเพื่อกางดูชั้นล่าง ชั้นที่มีจุดเกินจะกางให้เอง")}
            {org && (
              <div className="flex shrink-0 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded(Object.fromEntries([...org.linesOfWork.map((l) => [l.id, true]), ...org.divisions.map((v) => [v.id, true])]))
                  }
                  className="rounded-lg px-2.5 py-1.5 font-semibold text-[#047857] hover:bg-[#ECFDF5]"
                >
                  กางทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setExpanded(Object.fromEntries([...org.linesOfWork.map((l) => [l.id, false]), ...org.divisions.map((v) => [v.id, false])]))
                  }
                  className="rounded-lg px-2.5 py-1.5 font-semibold text-[#475569] hover:bg-[#F1F5F9]"
                >
                  พับทั้งหมด
                </button>
              </div>
            )}
          </div>

          {alloc && org && (
            <div className="overflow-hidden rounded-xl border border-[#E2E8F0]">
              <div className="grid grid-cols-[minmax(0,1fr)_11rem_14rem_9rem] gap-4 border-b border-[#E2E8F0] bg-[#059669] py-2.5 pl-3 pr-2 text-sm font-bold text-white">
                <span>สายงาน / ฝ่าย / แผนก</span>
                <span className="text-right">วงเงิน (บาท)</span>
                <span>แบ่งต่อแล้ว</span>
                <span className="text-right">คงเหลือ</span>
              </div>
              {org.linesOfWork.map((l) => {
                const lOpen = isOpen(l.id, lineIssue(l.id));
                return (
                  <Fragment key={l.id}>
                    {treeRow({
                      level: "lines",
                      id: l.id,
                      name: l.name,
                      depth: 0,
                      childTotal: lineChild(l.id),
                      childLabel: "ให้ฝ่าย",
                      toggle: { open: lOpen, issue: lineIssue(l.id), count: `${divsOf(l.id).length} ฝ่าย` },
                    })}
                    {lOpen &&
                      divsOf(l.id).map((v) => {
                        const vOpen = isOpen(v.id, divIssue(v.id));
                        return (
                          <Fragment key={v.id}>
                            {treeRow({
                              level: "divisions",
                              id: v.id,
                              name: v.name,
                              depth: 1,
                              childTotal: divChild(v.id),
                              childLabel: "ให้แผนก",
                              toggle: { open: vOpen, issue: divIssue(v.id), count: `${deptsOf(v.id).length} แผนก` },
                            })}
                            {vOpen &&
                              deptsOf(v.id).map((d) =>
                                treeRow({
                                  level: "departments",
                                  id: d.id,
                                  name: d.name,
                                  depth: 2,
                                  childTotal: deptChild(d.id),
                                  childLabel: "เป็นโครงการ",
                                }),
                              )}
                          </Fragment>
                        );
                      })}
                  </Fragment>
                );
              })}
            </div>
          )}
        </section>

        {/* ===== ขั้นที่ 3: เลือกแผนกทางซ้าย → โครงการของแผนกนั้นทางขวา ===== */}
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
          {stepTitle(3, `วงเงินตามแผนก / โครงการ ปี ${toBE(year)}`, "เลือกแผนกทางซ้าย แล้วแบ่งงบแผนกเป็นโครงการและหมวดทางขวา")}

          {yearProjects.length === 0 && prevYearProjects.length > 0 && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-xl bg-[#F8FAFC] p-4 text-sm text-[#475569]">
              <p>ยังไม่มีโครงการของปี {toBE(year)}</p>
              <button
                type="button"
                onClick={copyPreviousYear}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#059669] px-4 py-2 font-semibold text-[#047857] hover:bg-[#ECFDF5]"
              >
                <Copy1 size={16} aria-hidden="true" />
                คัดลอกโครงการจากปี {toBE(year - 1)} ({prevYearProjects.length} โครงการ) มาเป็นตั้งต้น
              </button>
            </div>
          )}

          <div className="grid grid-cols-[18rem_minmax(0,1fr)] items-start gap-6">
            {/* ซ้าย: รายชื่อแผนก จัดตามฝ่าย (ติดอยู่ขณะเลื่อนดูโครงการ) */}
            <nav aria-label="เลือกแผนก" className="sticky top-0 flex flex-col gap-4">
              {(org?.divisions ?? [])
                .filter((v) => deptsOf(v.id).length > 0)
                .map((v) => (
                  <div key={v.id}>
                    <p className="mb-1 px-2 text-xs font-semibold text-[#64748B]">{v.name}</p>
                    <ul className="flex flex-col gap-1">
                      {deptsOf(v.id).map((d) => {
                        const deptAlloc = amountOf("departments", d.id);
                        const inProjects = deptChild(d.id);
                        const count = yearProjects.filter((p) => p.departmentId === d.id).length;
                        const over = inProjects > deptAlloc;
                        const active = currentDept === d.id;
                        return (
                          <li key={d.id}>
                            <button
                              type="button"
                              aria-current={active ? "true" : undefined}
                              onClick={() => setSelDept(d.id)}
                              className={`w-full rounded-lg border px-3 py-2 text-left ${
                                active ? "border-[#059669] bg-[#ECFDF5]" : "border-transparent hover:bg-[#F8FAFC]"
                              }`}
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className={`truncate text-sm ${active ? "font-bold text-[#047857]" : "font-semibold"}`}>{d.name}</span>
                                <span className="shrink-0 text-xs text-[#64748B]">{count} โครงการ</span>
                              </span>
                              <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-[#E2E8F0]" aria-hidden="true">
                                <span
                                  className={`block h-full rounded-full ${over ? "bg-[#BE123C]" : "bg-[#059669]"}`}
                                  style={{ width: `${deptAlloc > 0 ? Math.min(100, (inProjects / deptAlloc) * 100) : inProjects > 0 ? 100 : 0}%` }}
                                />
                              </span>
                              {over && <span className="mt-1 block text-xs font-semibold text-[#BE123C]">แบ่งเป็นโครงการเกินงบแผนก</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              {orphans.length > 0 && (
                <button
                  type="button"
                  aria-current={currentDept === ORPHANS ? "true" : undefined}
                  onClick={() => setSelDept(ORPHANS)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold text-[#B45309] ${
                    currentDept === ORPHANS ? "border-[#FDE68A] bg-[#FFFBEB]" : "border-transparent hover:bg-[#FFFBEB]"
                  }`}
                >
                  ไม่พบแผนกในผังองค์กร ({orphans.length})
                </button>
              )}
            </nav>

            {/* ขวา: โครงการของแผนกที่เลือก */}
            <div className="min-w-0">
              {currentDept === ORPHANS ? (
                <div className="flex flex-col gap-4">
                  <p className="rounded-xl bg-[#FFFBEB] p-3 text-sm text-[#92400E]">
                    โครงการเหล่านี้อ้างถึงแผนกที่ไม่มีในผังองค์กรแล้ว แก้วงเงินเป็น 0 หรือลบโครงการ
                  </p>
                  {orphans.map(renderProject)}
                </div>
              ) : selectedDept ? (
                (() => {
                  const deptAlloc = amountOf("departments", selectedDept.id);
                  const inProjects = deptChild(selectedDept.id);
                  const left = deptAlloc - inProjects;
                  const list = yearProjects.filter((p) => p.departmentId === selectedDept.id);
                  return (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-end justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                        <h3 className="text-xl font-bold">{selectedDept.name}</h3>
                        <dl className="money flex gap-6 text-right text-sm">
                          <div>
                            <dt className="text-xs text-[#64748B]">งบแผนก</dt>
                            <dd className="font-bold">{baht(deptAlloc)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-[#64748B]">แบ่งเป็นโครงการ</dt>
                            <dd className="font-bold">{baht(inProjects)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-[#64748B]">{left < 0 ? "เกินงบแผนก" : "เหลือให้แบ่ง"}</dt>
                            <dd className={`font-bold ${left < 0 ? "text-[#BE123C]" : "text-[#047857]"}`}>{baht(Math.abs(left))}</dd>
                          </div>
                        </dl>
                      </div>

                      {list.length === 0 && (
                        <p className="rounded-xl bg-[#F8FAFC] p-6 text-center text-sm text-[#475569]">
                          แผนกนี้ยังไม่มีโครงการปี {toBE(year)} เพิ่มโครงการแรกด้านล่าง
                        </p>
                      )}
                      {list.map(renderProject)}

                      {/* เพิ่มโครงการในแผนกที่เลือก */}
                      <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#059669] p-3">
                        <TextField
                          aria-label={`ชื่อโครงการใหม่ของ${selectedDept.name}`}
                          value={newName}
                          onChange={setNewName}
                          className="flex-1"
                        >
                          <Input
                            placeholder={`ชื่อโครงการใหม่ของ${selectedDept.name}`}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addProject(selectedDept.id);
                            }}
                          />
                        </TextField>
                        <button
                          type="button"
                          onClick={() => addProject(selectedDept.id)}
                          className="shrink-0 rounded-xl bg-[#ECFDF5] px-5 py-2.5 text-sm font-semibold text-[#047857] hover:bg-[#D1FAE5]"
                        >
                          + เพิ่มโครงการ
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="rounded-xl bg-[#F8FAFC] p-6 text-center text-sm text-[#475569]">ยังไม่มีแผนกในผังองค์กร</p>
              )}
            </div>
          </div>
        </section>

        {/* ===== แถบบันทึก: ติดขอบล่างเมื่อมีการแก้ (แก้ขั้น 1-3 แล้วไม่ต้องเลื่อนมาหา) ===== */}
        <div
          className={`rounded-xl border bg-white p-4 shadow-2xl ${
            dirty || errors.length > 0 ? "sticky bottom-4 z-10 border-[#FDE68A]" : "border-[#E2E8F0]"
          }`}
        >
          {errors.length > 0 && (
            <ul role="alert" className="mb-3 max-h-40 list-disc overflow-y-auto rounded-xl bg-[#FFF1F2] py-2.5 pl-8 pr-3 text-sm text-[#9F1239]">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {message && (
            <p role="status" className="mb-3 rounded-xl bg-[#ECFDF5] p-3 text-sm text-[#047857]">
              {message}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <span className={`mr-auto text-sm ${dirty ? "font-semibold text-[#B45309]" : "text-[#64748B]"}`}>
              {dirty ? "มีการแก้ไขที่ยังไม่บันทึก" : "บันทึกล่าสุดแล้ว"}
            </span>
            <button
              type="button"
              onClick={handleDiscard}
              disabled={!dirty}
              className="rounded-xl bg-[#F1F5F9] px-5 py-2.5 text-sm font-semibold text-[#475569] hover:bg-[#E2E8F0] disabled:opacity-50"
            >
              ยกเลิกการแก้ไข
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty}
              className="rounded-xl bg-[#059669] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#047857] disabled:opacity-50"
            >
              บันทึกงบประมาณ
            </button>
          </div>
        </div>

          </div>
        )}
        {tab === "transfer" && (
          <div role="tabpanel" id="panel-transfer" aria-labelledby="tab-transfer" className="flex flex-col gap-9">
        {/* ===== ขั้นที่ 4: โอนงบกลางปี (บันทึกทันที + ลงประวัติ) ===== */}
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
          {stepTitle(null, `โอนงบกลางปี ${toBE(year)}`, "ย้ายวงเงินที่ยังไม่ได้ใช้จากหมวดหนึ่งไปอีกหมวด ข้ามแผนกได้ถ้างบแผนกปลายทางยังพอ")}
          {dirty ? (
            <p className="rounded-xl bg-[#FFFBEB] p-3 text-sm text-[#92400E]">
              มีการแก้ไขที่ยังไม่บันทึก บันทึกหรือยกเลิกการแก้ไขก่อน จึงจะโอนงบได้
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="mr-auto text-sm text-[#64748B]">
                โอนงบไปแล้วปีนี้ {transferCount} รายการ · ดูรายละเอียดได้ที่แท็บ &quot;ประวัติการแก้งบ&quot;
              </p>
              <button
                type="button"
                onClick={() => setTransferOpen(true)}
                className="rounded-xl bg-[#059669] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#047857]"
              >
                ⇆ โอนงบ
              </button>
            </div>
          )}
          <TransferModal
            open={transferOpen}
            onClose={() => setTransferOpen(false)}
            items={transferItems}
            transferCount={transferCount}
            onSubmit={handleTransfer}
          />
        </section>

          </div>
        )}
        {tab === "history" && (
          <div role="tabpanel" id="panel-history" aria-labelledby="tab-history" className="flex flex-col gap-9">
        {/* ===== ขั้นที่ 5: ประวัติการแก้งบ (ปีที่เลือก · ใหม่สุดอยู่บน) ===== */}
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
          {stepTitle(null, `ประวัติการแก้งบ ปี ${toBE(year)}`, "ทุกครั้งที่บันทึกวงเงินหรือโอนงบ ระบบจะเก็บไว้ที่นี่ แก้หรือลบไม่ได้")}
          {(() => {
            const rows = history.filter((h) => h.year === year).reverse();
            if (rows.length === 0)
              return <p className="rounded-xl bg-[#F8FAFC] p-6 text-center text-sm text-[#64748B]">ยังไม่มีการแก้งบของปีนี้</p>;
            return (
              <div>
                <TableRoot>
                  <TableHeader className="bg-[#F8FAFC] text-xs font-semibold text-[#64748B]">
                    <TableRow>
                      <TableHead>เวลา</TableHead>
                      <TableHead>ผู้แก้</TableHead>
                      <TableHead>ประเภท</TableHead>
                      <TableHead>รายการ</TableHead>
                      <TableHead className="text-right">ก่อน → หลัง</TableHead>
                      <TableHead className="text-right">เปลี่ยน</TableHead>
                      <TableHead>เหตุผล</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="whitespace-nowrap text-[#475569]">
                          {new Date(h.at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{h.byName}</TableCell>
                        <TableCell>
                          <span
                            className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                              h.kind === "โอนงบ"
                                ? "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]"
                                : "border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]"
                            }`}
                          >
                            {h.kind}
                          </span>
                        </TableCell>
                        <TableCell className="min-w-56">{h.item}</TableCell>
                        <TableCell className="money whitespace-nowrap text-right text-[#475569]">
                          {h.before === null ? "-" : `${baht(h.before)} → ${baht(h.after ?? 0)}`}
                        </TableCell>
                        <TableCell
                          className={`money whitespace-nowrap text-right font-semibold ${
                            h.kind === "โอนงบ" ? "text-[#B45309]" : h.amount < 0 ? "text-[#BE123C]" : "text-[#047857]"
                          }`}
                        >
                          {h.kind === "แชร์งบ" ? "-" : h.kind === "โอนงบ" ? baht(h.amount) : (h.amount > 0 ? "+" : "−") + baht(Math.abs(h.amount))}
                        </TableCell>
                        <TableCell className="min-w-40 text-[#475569]">{h.note || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableRoot>
              </div>
            );
          })()}
        </section>
          </div>
        )}
      </div>
      <ActionPopup
        open={savedOver !== null}
        tone={savedOver?.length ? "warning" : "success"}
        title="บันทึกงบประมาณแล้ว"
        message={
          savedOver?.length
            ? `หมวดที่วงเงินต่ำกว่ายอดใช้ไป: ${savedOver.join(", ")}`
            : `งบปี ${toBE(year)} มีผลกับคำขอใหม่ทันที`
        }
        onConfirm={() => setSavedOver(null)}
      />
    </div>
  );
}
