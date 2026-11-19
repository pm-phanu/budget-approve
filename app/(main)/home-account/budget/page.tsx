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
import { Wallet2 } from "@tailgrids/icons";

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
  departmentProjectTotal,
  loadAllocations,
  loadProjects,
  projects as SEED_PROJECTS,
  saveAllocations,
  saveProjects,
  validateAllocation,
  type BudgetAllocation,
  type Project,
} from "@/data/budget";
import { loadOrganization, type Organization } from "@/data/organization";
import { loadRequests, type SavedRequest } from "@/data/request";

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

  // localStorage มีแค่ในเบราว์เซอร์ → อ่านหลังเปิดหน้า
  useEffect(() => {
    const list = loadProjects();
    setSaved(list);
    setDraft(list);
    const alloc = loadAllocations();
    setSavedAlloc(alloc);
    setDraftAlloc(alloc);
    setRequests(loadRequests());
    setOrg(loadOrganization());
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
            {depth > 0 && <span className="mr-2 text-gray-400">└</span>}
            {name}
          </span>
        </TableCell>
        <TableCell className="text-right">
          <TextField
            aria-label={`วงเงิน ${name}`}
            value={amount.toLocaleString("en-US")}
            onChange={(v) => setAllocAmount(level, id, v)}
          >
            <Input inputMode="numeric" className="ml-auto w-40 text-right" />
          </TextField>
        </TableCell>
        <TableCell className="text-right text-gray-600">{baht(childTotal)}</TableCell>
        <TableCell
          className={`text-right font-semibold ${left < 0 ? "text-red-600" : "text-[#047857]"}`}
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
    saveProjects(clean);
    setSaved(clean);
    setDraft(clean);
    saveAllocations(allocs);
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
            className="flex-1"
          >
            <Input className="font-semibold" />
          </TextField>
          <span className="text-sm text-gray-500">
            รวม {baht(limit)} · ใช้ไป {baht(used)}
          </span>
          {!projectLocked && (
            <button
              type="button"
              onClick={() => removeProject(p.id)}
              className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              ลบโครงการ
            </button>
          )}
        </div>

        <TableRoot className="bg-white">
          <TableHeader className="bg-[#059669] font-bold text-white">
            <TableRow>
              <TableHead>หมวดค่าใช้จ่าย</TableHead>
              <TableHead className="text-right">วงเงินที่บอร์ดอนุมัติ (บาท)</TableHead>
              <TableHead className="text-right">ใช้ไป</TableHead>
              <TableHead className="text-right">คงเหลือ</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {p.categories.map((c) => {
              const u = usedOf(c.id);
              const remaining = c.limit - u;
              return (
                <TableRow key={c.id}>
                  <TableCell>
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
                      <Input inputMode="numeric" className="ml-auto w-40 text-right" />
                    </TextField>
                  </TableCell>
                  <TableCell className="text-right text-gray-600">{baht(u)}</TableCell>
                  <TableCell
                    className={`text-right font-semibold ${remaining < 0 ? "text-red-600" : "text-[#047857]"}`}
                  >
                    {baht(remaining)}
                  </TableCell>
                  <TableCell className="text-center">
                    {hasRequests(c.id) ? (
                      <span className="text-xs text-gray-400" title="มีคำขออ้างอิงหมวดนี้">
                        ใช้งานอยู่
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-label={`ลบหมวด ${c.name}`}
                        onClick={() => removeCategory(p.id, c.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </TableRoot>

        <button
          type="button"
          onClick={() => addCategory(p.id)}
          className="mt-3 text-sm font-semibold text-[#047857] hover:underline"
        >
          + เพิ่มหมวด
        </button>
      </div>
    );
  }

  return (
    <div>
      <header className="text-[#111] flex items-center justify-between mb-9">
        <h1 className="text-[32px] font-bold">ตั้งงบประมาณ</h1>
      </header>

      <div className="flex flex-col gap-9">
        {/* สรุปปีที่เลือก */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <p className="mb-2 text-sm text-gray-500">ปีงบประมาณ</p>
            <NativeSelect
              aria-label="ปีงบประมาณ"
              value={String(year)}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <NativeSelectOption key={y} value={String(y)}>
                  พ.ศ. {toBE(y)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          {/* ขั้นที่ 1: กรอกงบรวมที่บอร์ดอนุมัติ */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <p className="mb-2 text-sm text-gray-500">งบที่บอร์ดอนุมัติ (บาท)</p>
            <TextField
              aria-label="งบที่บอร์ดอนุมัติ"
              value={(alloc?.boardTotal ?? 0).toLocaleString("en-US")}
              onChange={setBoardTotal}
            >
              <Input inputMode="numeric" className="text-right text-xl font-bold" />
            </TextField>
            {!storedAlloc && (
              <p className="mt-2 text-xs text-[#B45309]">
                ยังไม่เคยบันทึกปีนี้ · ค่าตั้งต้นรวมจากวงเงินโครงการ
              </p>
            )}
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <p className="text-sm text-gray-500">แบ่งให้สายงานแล้ว</p>
            <p className="mt-2 text-2xl font-bold text-[#111]">{baht(linesTotal)}</p>
            <p className={`mt-1 text-sm ${boardTotal - linesTotal < 0 ? "text-red-600" : "text-gray-500"}`}>
              ยังไม่ได้แบ่ง {baht(boardTotal - linesTotal)}
            </p>
          </div>
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
            <p className="text-sm text-gray-500">ใช้ไปแล้ว</p>
            <p className="mt-2 text-2xl font-bold text-[#111]">{baht(totalUsed)}</p>
            <p
              className={`mt-1 text-sm ${boardTotal - totalUsed < 0 ? "text-red-600" : "text-[#047857]"}`}
            >
              คงเหลือจากงบบอร์ด {baht(boardTotal - totalUsed)}
            </p>
          </div>
        </div>

        {/* ขั้นที่ 2: แบ่งงบบอร์ด → สายงาน → ฝ่าย → แผนก */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-2xl">
          <h2 className="text-[#111] text-2xl font-bold mb-2 flex gap-2 items-center">
            <Wallet2 />
            แบ่งงบตามสายงาน / ฝ่าย / แผนก ปี {toBE(year)}
          </h2>
          <p className="mb-6 text-sm text-gray-500">
            แต่ละชั้นแบ่งต่อรวมกันได้ไม่เกินวงเงินของตัวเอง · แผนกแบ่งต่อเป็นโครงการด้านล่าง
          </p>

          {alloc && org && (
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
          )}
        </div>

        {/* รายการงบตามแผนก */}
        <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-2xl">
          <h2 className="text-[#111] text-2xl font-bold mb-6 flex gap-2 items-center">
            <Wallet2 />
            วงเงินตามแผนก / โครงการ ปี {toBE(year)}
          </h2>

          {yearProjects.length === 0 && (
            <div className="mb-6 rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-600">
              <p>ยังไม่มีงบของปี {toBE(year)}</p>
              {prevYearProjects.length > 0 && (
                <button
                  type="button"
                  onClick={copyPreviousYear}
                  className="mt-3 rounded-xl border border-[#059669] px-4 py-2 font-semibold text-[#047857] hover:bg-[#ECFDF5]"
                >
                  คัดลอกโครงการจากปี {toBE(year - 1)} ({prevYearProjects.length} โครงการ) มาเป็นตั้งต้น
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-8">
            {groups.map(({ dept, list }) => (
              <Fragment key={dept.id}>
                <section>
                  <h3 className="mb-3 flex flex-wrap items-baseline gap-3 text-lg font-bold text-[#111]">
                    {dept.name}
                    {(() => {
                      const deptAlloc = alloc?.departments[dept.id] ?? 0;
                      const left = deptAlloc - departmentProjectTotal(draft, dept.id, year);
                      return (
                        <span className={`text-sm font-normal ${left < 0 ? "text-red-600" : "text-gray-500"}`}>
                          งบแผนก {baht(deptAlloc)} · เหลือให้แบ่งเป็นโครงการ {baht(left)}
                        </span>
                      );
                    })()}
                  </h3>
                  <div className="flex flex-col gap-4">{list.map(renderProject)}</div>
                </section>
              </Fragment>
            ))}
            {orphans.length > 0 && (
              <section>
                <h3 className="mb-3 text-lg font-bold text-[#111]">ไม่พบแผนกในโครงสร้างองค์กร</h3>
                <div className="flex flex-col gap-4">{orphans.map(renderProject)}</div>
              </section>
            )}
          </div>

          {/* เพิ่มโครงการ */}
          <div className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-[#059669] p-4">
            <div className="w-72">
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
              className="flex-1"
            >
              <Input placeholder="ชื่อโครงการ" />
            </TextField>
            <button
              type="button"
              onClick={addProject}
              className="rounded-xl bg-[#ECFDF5] px-5 py-2.5 text-sm font-semibold text-[#047857] hover:bg-[#D1FAE5]"
            >
              + เพิ่มโครงการ
            </button>
          </div>

          {/* ข้อความผิดพลาด / สำเร็จ */}
          {errors.length > 0 && (
            <ul className="mt-4 list-disc rounded-xl bg-red-50 py-2 pl-8 pr-3 text-sm text-red-700">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {message && (
            <p className="mt-4 rounded-xl bg-[#ECFDF5] p-3 text-sm text-[#047857]">{message}</p>
          )}

          <div className="mt-4 flex items-center justify-end gap-3">
            {dirty && <span className="text-sm text-[#B45309]">มีการแก้ไขที่ยังไม่บันทึก</span>}
            <button
              type="button"
              onClick={handleDiscard}
              disabled={!dirty}
              className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-50"
            >
              ยกเลิกการแก้ไข
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty}
              className="rounded-xl bg-[#059669] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#047857] disabled:opacity-50"
            >
              บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
