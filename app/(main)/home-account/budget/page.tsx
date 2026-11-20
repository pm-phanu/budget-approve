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
import { Close, Copy1, Locked3, Trash1 } from "@tailgrids/icons";

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

const baht = (n: number) => "฿" + n.toLocaleString("en-US");
const toBE = (year: number) => year + 543; // แสดงปีเป็น พ.ศ.

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
  const [year, setYear] = useState(new Date().getFullYear());
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  // ฟอร์มเพิ่มโครงการ
  const [newDept, setNewDept] = useState("");
  const [newName, setNewName] = useState("");

  // ประวัติการแก้งบ + ฟอร์มโอนงบ (หมวด = "projectId/categoryId")
  const [history, setHistory] = useState<BudgetChange[]>([]);
  const [tFrom, setTFrom] = useState("");
  const [tTo, setTTo] = useState("");
  const [tAmount, setTAmount] = useState("");
  const [tNote, setTNote] = useState("");
  const [tError, setTError] = useState("");
  const [tMessage, setTMessage] = useState("");

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
  const thisYear = new Date().getFullYear();
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

  // 1 แถวในตารางแบ่งงบ · childTotal = ชั้นล่างรวมกัน (แผนก = วงเงินโครงการรวม)
  function allocRow(
    level: "lines" | "divisions" | "departments",
    id: string,
    name: string,
    depth: number,
    childTotal: number,
  ) {
    const amount = alloc?.[level][id] ?? 0;
    const left = amount - childTotal;
    return (
      <TableRow key={id} className={depth === 0 ? "bg-[#ECFDF5]" : undefined}>
        <TableCell>
          <span
            style={{ paddingLeft: depth * 24 }}
            className={depth === 0 ? "font-bold" : depth === 1 ? "font-semibold" : ""}
          >
            {depth > 0 && <span aria-hidden="true" className="mr-2 text-[#CBD5E1]">└</span>}
            {name}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <TextField
            aria-label={`วงเงิน ${name}`}
            value={amount.toLocaleString("en-US")}
            onChange={(v) => setAllocAmount(level, id, v)}
          >
            <Input inputMode="numeric" className="money ml-auto w-40 text-right" />
          </TextField>
        </TableCell>
        <TableCell className="money text-right text-[#475569]">{baht(childTotal)}</TableCell>
        <TableCell
          className={`money text-right font-semibold ${left < 0 ? "text-[#BE123C]" : "text-[#047857]"}`}
        >
          {baht(left)}
        </TableCell>
      </TableRow>
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

  function addProject() {
    const dept = departments.find((d) => d.id === newDept);
    if (!dept || !newName.trim()) {
      setErrors(["เลือกแผนกและกรอกชื่อโครงการก่อนเพิ่ม"]);
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
  }

  // ใครแก้ เมื่อไร (ใส่ในประวัติ)
  function changeBase() {
    const me = getCurrentUser();
    return { at: new Date().toISOString(), byId: me?.id ?? "", byName: me?.fullName ?? "-" };
  }

  // โอนงบกลางปี: บันทึกทันที (ไม่ผ่าน draft) → ต้องไม่มีการแก้ค้าง จะได้ไม่ปนกัน
  function handleTransfer() {
    setTMessage("");
    const [fp, fc] = tFrom.split("/");
    const [tp, tc] = tTo.split("/");
    const fromCat = saved.find((p) => p.id === fp)?.categories.find((c) => c.id === fc);
    const available = fromCat ? fromCat.limit - usedOf(fromCat.id) : 0;
    const res = transferBudget(
      saved,
      { projectId: fp ?? "", categoryId: fc ?? "" },
      { projectId: tp ?? "", categoryId: tc ?? "" },
      Number(tAmount.replace(/,/g, "")),
      Math.max(0, available),
      tNote,
      changeBase(),
    );
    if (!res.ok) return setTError(res.error);
    // โอนข้ามแผนกแล้วโครงการรวมเกินงบแผนก → ไม่ให้โอน (ต้องแบ่งงบแผนกใหม่ในขั้นที่ 2 ก่อน)
    const yearAlloc = savedAlloc.find((a) => a.year === year);
    const errs = org && yearAlloc ? validateAllocation(yearAlloc, org, res.projects) : [];
    if (errs.length > 0) return setTError(errs.join(" · "));

    saveProjects(res.projects);
    setSaved(res.projects);
    setDraft(res.projects);
    appendBudgetHistory([res.entry]);
    setHistory(loadBudgetHistory());
    setTError("");
    setTAmount("");
    setTNote("");
    setTMessage(`โอนงบแล้ว: ${res.entry.item} ${baht(res.entry.amount)}`);
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

    return (
      <div key={p.id} className="rounded-xl border border-[#E2E8F0] p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <TextField
            aria-label={`ชื่อโครงการ ${p.id}`}
            value={p.name}
            onChange={(v) => patchProject(p.id, (x) => ({ ...x, name: v }))}
            className="min-w-60 flex-1"
          >
            <Input className="font-semibold" placeholder="ชื่อโครงการ" />
          </TextField>
          <span className="money text-sm text-[#64748B]">
            รวม <strong className="text-[#0F172A]">{baht(limit)}</strong> · ใช้ไป {baht(used)}
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

        {/* งบร่วม: เลือกแผนกในฝ่ายเดียวกันที่ใช้โครงการนี้ได้ด้วย */}
        {(() => {
          const siblings = org ? org.departments.filter((d) => d.id !== p.departmentId && sameDivision(org, p.departmentId, d.id)) : [];
          const shared = p.sharedWith ?? [];
          const toggle = (id: string, on: boolean) =>
            patchProject(p.id, (x) => ({ ...x, sharedWith: on ? [...shared, id] : shared.filter((s) => s !== id) }));
          return (
            <fieldset className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <legend className="sr-only">ใช้งบร่วมกับแผนก</legend>
              <span className="text-[#64748B]">ใช้งบร่วมกับ:</span>
              {siblings.length === 0 && <span className="text-[#94A3B8]">ไม่มีแผนกอื่นในฝ่ายเดียวกัน</span>}
              {siblings.map((d) => (
                <label key={d.id} className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#059669]"
                    checked={shared.includes(d.id)}
                    onChange={(e) => toggle(d.id, e.target.checked)}
                  />
                  {d.name}
                </label>
              ))}
            </fieldset>
          );
        })()}

        <div className="overflow-x-auto">
          <TableRoot className="bg-white">
            <TableHeader className="bg-[#059669] font-bold text-white">
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
    );
  }

  // หัวข้อแต่ละขั้น (เลขขั้น + ชื่อ + คำอธิบาย)
  const stepTitle = (n: number, title: string, hint: string) => (
    <div className="mb-6 flex items-start gap-3">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ECFDF5] text-sm font-bold text-[#047857]"
      >
        {n}
      </span>
      <div>
        <h2 className="text-2xl font-bold">
          <span className="sr-only">ขั้นที่ {n}: </span>
          {title}
        </h2>
        <p className="mt-1 text-sm text-[#64748B]">{hint}</p>
      </div>
    </div>
  );

  return (
    <div className="text-[#0F172A]">
      <header className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold">ตั้งงบประมาณ</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            กรอกงบที่บอร์ดอนุมัติ → แบ่งให้สายงาน / ฝ่าย / แผนก → แผนกแบ่งเป็นโครงการและหมวด · กดบันทึกครั้งเดียวด้านล่าง
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
        {/* ===== ขั้นที่ 1: งบรวมที่บอร์ดอนุมัติ + สรุป ===== */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <p className="mb-2 flex items-center gap-2 text-sm text-[#64748B]">
              <span
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ECFDF5] text-xs font-bold text-[#047857]"
              >
                1
              </span>
              งบที่บอร์ดอนุมัติ ปี {toBE(year)} (บาท)
            </p>
            <TextField
              aria-label="งบที่บอร์ดอนุมัติ"
              value={(alloc?.boardTotal ?? 0).toLocaleString("en-US")}
              onChange={setBoardTotal}
            >
              <Input inputMode="numeric" className="money text-right text-xl font-bold" />
            </TextField>
            {!storedAlloc && (
              <p className="mt-2 text-xs text-[#B45309]">
                ยังไม่เคยบันทึกปีนี้ · ค่าตั้งต้นรวมจากวงเงินโครงการ
              </p>
            )}
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <p className="text-sm text-[#64748B]">แบ่งให้สายงานแล้ว</p>
            <p className="money mt-2 text-2xl font-bold">{baht(linesTotal)}</p>
            <p className={`money mt-1 text-sm ${boardTotal - linesTotal < 0 ? "font-semibold text-[#BE123C]" : "text-[#64748B]"}`}>
              {boardTotal - linesTotal < 0 ? "แบ่งเกินงบบอร์ด " : "ยังไม่ได้แบ่ง "}
              {baht(Math.abs(boardTotal - linesTotal))}
            </p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <p className="text-sm text-[#64748B]">ใช้ไปแล้ว</p>
            <p className="money mt-2 text-2xl font-bold">{baht(totalUsed)}</p>
            <p
              className={`money mt-1 text-sm ${boardTotal - totalUsed < 0 ? "font-semibold text-[#BE123C]" : "text-[#047857]"}`}
            >
              คงเหลือจากงบบอร์ด {baht(boardTotal - totalUsed)}
            </p>
          </div>
        </div>

        {/* ===== ขั้นที่ 2: แบ่งงบบอร์ด → สายงาน → ฝ่าย → แผนก ===== */}
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
          {stepTitle(2, `แบ่งงบตามสายงาน / ฝ่าย / แผนก ปี ${toBE(year)}`, "แต่ละชั้นแบ่งต่อรวมกันได้ไม่เกินวงเงินของตัวเอง · ยอดติดลบสีแดง = แบ่งเกิน")}

          {alloc && org && (
            <div className="overflow-x-auto">
              <TableRoot className="bg-white">
                <TableHeader className="bg-[#059669] font-bold text-white">
                  <TableRow>
                    <TableHead>สายงาน / ฝ่าย / แผนก</TableHead>
                    <TableHead className="text-right">วงเงิน (บาท)</TableHead>
                    <TableHead className="text-right">แบ่งต่อแล้ว</TableHead>
                    <TableHead className="text-right">ยังไม่ได้แบ่ง</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {org.linesOfWork.map((l) => {
                    const divs = org.divisions.filter((v) => v.lineOfWorkId === l.id);
                    return (
                      <Fragment key={l.id}>
                        {allocRow(
                          "lines",
                          l.id,
                          l.name,
                          0,
                          divs.reduce((s, v) => s + (alloc.divisions[v.id] ?? 0), 0),
                        )}
                        {divs.map((v) => {
                          const depts = org.departments.filter((d) => d.divisionId === v.id);
                          return (
                            <Fragment key={v.id}>
                              {allocRow(
                                "divisions",
                                v.id,
                                v.name,
                                1,
                                depts.reduce((s, d) => s + (alloc.departments[d.id] ?? 0), 0),
                              )}
                              {depts.map((d) =>
                                allocRow(
                                  "departments",
                                  d.id,
                                  d.name,
                                  2,
                                  departmentProjectTotal(draft, d.id, year),
                                ),
                              )}
                            </Fragment>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </TableRoot>
            </div>
          )}
        </section>

        {/* ===== ขั้นที่ 3: แผนก → โครงการ → หมวด ===== */}
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
          {stepTitle(3, `วงเงินตามแผนก / โครงการ ปี ${toBE(year)}`, "แผนกแบ่งงบของตัวเองเป็นโครงการ และแต่ละโครงการแบ่งเป็นหมวดค่าใช้จ่าย")}

          {yearProjects.length === 0 && (
            <div className="mb-6 rounded-xl bg-[#F8FAFC] p-6 text-center text-sm text-[#475569]">
              <p>ยังไม่มีโครงการของปี {toBE(year)} · เพิ่มโครงการด้านล่าง</p>
              {prevYearProjects.length > 0 && (
                <button
                  type="button"
                  onClick={copyPreviousYear}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#059669] px-4 py-2 font-semibold text-[#047857] hover:bg-[#ECFDF5]"
                >
                  <Copy1 size={16} aria-hidden="true" />
                  คัดลอกโครงการจากปี {toBE(year - 1)} ({prevYearProjects.length} โครงการ) มาเป็นตั้งต้น
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-8">
            {groups.map(({ dept, list }) => {
              const deptAlloc = alloc?.departments[dept.id] ?? 0;
              const left = deptAlloc - departmentProjectTotal(draft, dept.id, year);
              return (
                <section key={dept.id} aria-label={dept.name}>
                  <h3 className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-lg font-bold">
                    {dept.name}
                    <span className={`money text-sm font-normal ${left < 0 ? "font-semibold text-[#BE123C]" : "text-[#64748B]"}`}>
                      งบแผนก {baht(deptAlloc)} ·{" "}
                      {left < 0 ? `แบ่งเป็นโครงการเกิน ${baht(-left)}` : `เหลือให้แบ่งเป็นโครงการ ${baht(left)}`}
                    </span>
                  </h3>
                  <div className="flex flex-col gap-4">{list.map(renderProject)}</div>
                </section>
              );
            })}
            {orphans.length > 0 && (
              <section aria-label="ไม่พบแผนก">
                <h3 className="mb-3 text-lg font-bold">ไม่พบแผนกในโครงสร้างองค์กร</h3>
                <div className="flex flex-col gap-4">{orphans.map(renderProject)}</div>
              </section>
            )}
          </div>

          {/* เพิ่มโครงการ */}
          <div className="mt-6 rounded-xl border border-dashed border-[#059669] p-4">
            <p className="mb-3 text-sm font-semibold">เพิ่มโครงการ</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full sm:w-72">
                <NativeSelect
                  aria-label="แผนกของโครงการใหม่"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                >
                  <NativeSelectOption value="">เลือกแผนก</NativeSelectOption>
                  {departments.map((d) => (
                    <NativeSelectOption key={d.id} value={d.id}>
                      {d.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <TextField
                aria-label="ชื่อโครงการใหม่"
                value={newName}
                onChange={setNewName}
                className="min-w-60 flex-1"
              >
                <Input
                  placeholder="ชื่อโครงการ"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addProject();
                  }}
                />
              </TextField>
              <button
                type="button"
                onClick={addProject}
                className="rounded-xl bg-[#ECFDF5] px-5 py-2.5 text-sm font-semibold text-[#047857] hover:bg-[#D1FAE5]"
              >
                + เพิ่มโครงการ
              </button>
            </div>
          </div>
        </section>

        {/* ===== แถบบันทึก: ติดขอบล่างเมื่อมีการแก้ (แก้ขั้น 1-2 ด้านบนแล้วไม่ต้องเลื่อนลงมาหา) ===== */}
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

        {/* ===== โอนงบกลางปี: ย้ายวงเงินระหว่างหมวด (บันทึกทันที + ลงประวัติ) ===== */}
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
          {stepTitle(4, `โอนงบกลางปี ${toBE(year)}`, "ย้ายวงเงินที่ยังไม่ได้ใช้จากหมวดหนึ่งไปอีกหมวด · ข้ามแผนกได้ถ้างบแผนกปลายทางยังพอ")}
          {dirty ? (
            <p className="rounded-xl bg-[#FFFBEB] p-3 text-sm text-[#92400E]">
              มีการแก้ไขที่ยังไม่บันทึก · บันทึกหรือยกเลิกการแก้ไขก่อน จึงจะโอนงบได้
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {(
                [
                  ["จากหมวด", tFrom, setTFrom],
                  ["ไปหมวด", tTo, setTTo],
                ] as const
              ).map(([label, value, set]) => (
                <NativeSelect
                  key={label}
                  aria-label={label}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                >
                  <NativeSelectOption value="">{label}</NativeSelectOption>
                  {saved
                    .filter((p) => p.year === year)
                    .flatMap((p) =>
                      p.categories.map((c) => (
                        <NativeSelectOption key={`${p.id}/${c.id}`} value={`${p.id}/${c.id}`}>
                          {p.dept} › {p.name} › {c.name} (เหลือ {baht(Math.max(0, c.limit - usedOf(c.id)))})
                        </NativeSelectOption>
                      )),
                    )}
                </NativeSelect>
              ))}
              <TextField aria-label="จำนวนเงินที่โอน" value={tAmount} onChange={setTAmount}>
                <Input inputMode="numeric" placeholder="จำนวนเงิน (บาท)" className="money text-right" />
              </TextField>
              <TextField aria-label="เหตุผลการโอนงบ" value={tNote} onChange={setTNote}>
                <Input placeholder="เหตุผล เช่น ย้ายงบเดินทางไปค่าโฆษณา Q4" />
              </TextField>
              <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                {tError && (
                  <p role="alert" className="mr-auto rounded-xl bg-[#FFF1F2] px-3 py-2 text-sm text-[#9F1239]">
                    {tError}
                  </p>
                )}
                {tMessage && !tError && (
                  <p role="status" className="mr-auto rounded-xl bg-[#ECFDF5] px-3 py-2 text-sm text-[#047857]">
                    {tMessage}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleTransfer}
                  className="ml-auto rounded-xl bg-[#059669] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#047857]"
                >
                  โอนงบ
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ===== ประวัติการแก้งบ (ปีที่เลือก · ใหม่สุดอยู่บน) ===== */}
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
          {stepTitle(5, `ประวัติการแก้งบ ปี ${toBE(year)}`, "ทุกครั้งที่บันทึกวงเงินหรือโอนงบ ระบบจะเก็บไว้ที่นี่ · แก้หรือลบไม่ได้")}
          {(() => {
            const rows = history.filter((h) => h.year === year).reverse();
            if (rows.length === 0)
              return <p className="text-sm text-[#64748B]">ยังไม่มีการแก้งบของปีนี้</p>;
            return (
              <div className="overflow-x-auto">
                <TableRoot>
                  <TableHeader>
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
                        <TableCell className="whitespace-nowrap">
                          {new Date(h.at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{h.byName}</TableCell>
                        <TableCell>
                          <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${h.kind === "โอนงบ" ? "bg-[#EFF6FF] text-[#1D4ED8]" : "bg-[#F1F5F9] text-[#475569]"}`}>
                            {h.kind}
                          </span>
                        </TableCell>
                        <TableCell className="min-w-56">{h.item}</TableCell>
                        <TableCell className="money whitespace-nowrap text-right">
                          {h.before === null ? "-" : `${baht(h.before)} → ${baht(h.after ?? 0)}`}
                        </TableCell>
                        <TableCell
                          className={`money whitespace-nowrap text-right font-semibold ${h.kind === "โอนงบ" ? "text-[#1D4ED8]" : h.amount < 0 ? "text-[#BE123C]" : "text-[#047857]"}`}
                        >
                          {h.kind === "โอนงบ" ? baht(h.amount) : (h.amount > 0 ? "+" : "−") + baht(Math.abs(h.amount))}
                        </TableCell>
                        <TableCell className="min-w-40">{h.note || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableRoot>
              </div>
            );
          })()}
        </section>
      </div>
    </div>
  );
}
