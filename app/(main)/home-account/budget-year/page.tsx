"use client";

// ════════════════════════════════════════════════════════════
//  งบประมาณประจำปี (/home-account/budget-year · ฝ่ายบัญชี)
//  ภาพรวมงบบอร์ด → สัดส่วนรายฝ่าย → โครงการ/หมวดค่าใช้จ่าย → โอนงบกลางปี
//  อ่านข้อมูลจริงจาก data/budget.ts, data/organization.ts, data/request.ts
// ════════════════════════════════════════════════════════════

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ModalOverlay } from "react-aria-components";
import {
  ArrowBothDirectionHorizontal2,
  ChevronDown,
  Close,
  SlidersDoubleHorizontal,
  Wallet2,
} from "@tailgrids/icons";
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { Input } from "@/components/tailgrids/core/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/tailgrids/core/native-select";
import { TextField } from "@/components/tailgrids/core/text-field";
import {
  ALLOCATIONS_KEY,
  PROJECTS_KEY,
  addRequestsToBudget,
  allocationFromProjects,
  appendBudgetHistory,
  loadAllocations,
  loadProjects,
  projectLimit,
  projectUsed,
  saveProjects,
  transferBudget,
  validateAllocation,
  type BudgetAllocation,
  type Project,
} from "@/data/budget";
import {
  DEFAULT_ORGANIZATION,
  ORGANIZATION_KEY,
  loadOrganization,
  type Division,
  type Organization,
} from "@/data/organization";
import { REQUESTS_KEY, loadRequests, type SavedRequest } from "@/data/request";
import { getCurrentUser } from "@/utils/login";

const BUDGET_YEAR_EVENT = "budget-year:change";

const baht = (n: number) => "฿" + n.toLocaleString("en-US");
const toBE = (year: number) => year + 543;

// สีแถบสัดส่วนงบบอร์ด (Top 3 ฝ่าย + ฝ่ายอื่น ๆ + ยังไม่จัดสรร)
const SEGMENT_COLORS = ["#0F172A", "#047857", "#34D399"] as const;
const OTHER_COLOR = "#94A3B8";
const UNALLOCATED_COLOR = "#CBD5E1";

type BudgetSnapshot = {
  ready: boolean;
  projects: Project[];
  allocations: BudgetAllocation[];
  requests: SavedRequest[];
  org: Organization;
  currentYear: number;
  todayLabel: string;
};

const SERVER_SNAPSHOT: BudgetSnapshot = {
  ready: false,
  projects: [],
  allocations: [],
  requests: [],
  org: DEFAULT_ORGANIZATION,
  currentYear: 2026,
  todayLabel: "",
};

let cacheKey = "";
let cacheSnapshot: BudgetSnapshot = SERVER_SNAPSHOT;
let localRevision = 0;

function readBudgetSnapshot(): BudgetSnapshot {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;

  const rawProjects = localStorage.getItem(PROJECTS_KEY) ?? "";
  const rawAllocs = localStorage.getItem(ALLOCATIONS_KEY) ?? "";
  const rawRequests = localStorage.getItem(REQUESTS_KEY) ?? "";
  const rawOrg = localStorage.getItem(ORGANIZATION_KEY) ?? "";
  const nextKey = `${localRevision}\0${rawProjects}\0${rawAllocs}\0${rawRequests}\0${rawOrg}`;
  if (nextKey === cacheKey) return cacheSnapshot;

  const now = new Date();
  cacheKey = nextKey;
  cacheSnapshot = {
    ready: true,
    projects: loadProjects(),
    allocations: loadAllocations(),
    requests: loadRequests(),
    org: loadOrganization(),
    currentYear: now.getFullYear(),
    todayLabel: now.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  };
  return cacheSnapshot;
}

function subscribeBudgetSnapshot(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === PROJECTS_KEY ||
      event.key === ALLOCATIONS_KEY ||
      event.key === REQUESTS_KEY ||
      event.key === ORGANIZATION_KEY
    ) {
      onChange();
    }
  };
  window.addEventListener(BUDGET_YEAR_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(BUDGET_YEAR_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function notifyBudgetChanged() {
  localRevision += 1;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BUDGET_YEAR_EVENT));
  }
}

type DivisionSummary = {
  division: Division;
  departmentCount: number;
  projects: Project[];
  budget: number;
  used: number;
  remaining: number;
  usedPct: number;
};

function barColor(pct: number, over: boolean) {
  if (over || pct > 100) return "bg-[#BE123C]";
  if (pct >= 80) return "bg-[#D97706]";
  return "bg-[#059669]";
}

export default function BudgetYearPage() {
  const snapshot = useSyncExternalStore(
    subscribeBudgetSnapshot,
    readBudgetSnapshot,
    () => SERVER_SNAPSHOT,
  );

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedDivId, setSelectedDivId] = useState<string | null>(null);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  // โมดอลโอนงบ
  const [transferOpen, setTransferOpen] = useState(false);
  const [tFrom, setTFrom] = useState("");
  const [tTo, setTTo] = useState("");
  const [tAmount, setTAmount] = useState("");
  const [tNote, setTNote] = useState("");
  const [tError, setTError] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  if (!snapshot.ready) return null;

  const { projects: savedProjects, allocations, requests, org, currentYear, todayLabel } = snapshot;
  const year = selectedYear ?? currentYear;

  const years = [
    ...new Set([
      ...savedProjects.map((p) => p.year),
      ...allocations.map((a) => a.year),
      currentYear,
      currentYear + 1,
    ]),
  ].sort();

  const projectsWithUsage = addRequestsToBudget(requests, savedProjects);
  const yearProjects = projectsWithUsage.filter((p) => p.year === year);

  const yearAlloc =
    allocations.find((a) => a.year === year) ??
    allocationFromProjects(year, savedProjects, org);

  // สรุปงบรายฝ่าย
  const divisionSummaries: DivisionSummary[] = org.divisions.map((division) => {
    const depts = org.departments.filter((d) => d.divisionId === division.id);
    const deptIds = new Set(depts.map((d) => d.id));
    const divProjects = yearProjects.filter((p) => deptIds.has(p.departmentId));
    const projectsTotalLimit = divProjects.reduce((sum, p) => sum + projectLimit(p), 0);
    const allocatedDiv = yearAlloc.divisions[division.id] ?? 0;
    const budget = allocatedDiv > 0 ? allocatedDiv : projectsTotalLimit;
    const used = divProjects.reduce((sum, p) => sum + projectUsed(p), 0);
    const remaining = budget - used;
    const usedPct = budget > 0 ? (used / budget) * 100 : 0;

    return {
      division,
      departmentCount: depts.length,
      projects: divProjects,
      budget,
      used,
      remaining,
      usedPct,
    };
  });

  const divisionsTotalBudget = divisionSummaries.reduce((sum, d) => sum + d.budget, 0);
  const totalBudget = yearAlloc.boardTotal > 0 ? yearAlloc.boardTotal : divisionsTotalBudget;
  const totalUsed = divisionSummaries.reduce((sum, d) => sum + d.used, 0);
  const totalRemaining = totalBudget - totalUsed;
  const totalUsedPct = totalBudget > 0 ? Math.round((totalUsed / totalBudget) * 100) : 0;

  // เลือกฝ่ายเริ่มต้น: ฝ่ายแรกที่มีงบหรือมีโครงการในปีนี้
  const defaultDivision =
    divisionSummaries.find((d) => d.budget > 0 || d.projects.length > 0) ??
    divisionSummaries[0] ??
    null;

  const activeDivision =
    divisionSummaries.find((d) => d.division.id === selectedDivId) ?? defaultDivision;

  // แถบสัดส่วนงบรวมที่บอร์ดอนุมัติ (Top 3 ฝ่าย + ฝ่ายอื่น ๆ + ยังไม่จัดสรร)
  const sortedByBudget = [...divisionSummaries]
    .filter((d) => d.budget > 0)
    .sort((a, b) => b.budget - a.budget);

  const topThree = sortedByBudget.slice(0, 3);
  const othersBudget = sortedByBudget.slice(3).reduce((sum, d) => sum + d.budget, 0);
  const unallocatedBudget = Math.max(0, totalBudget - divisionsTotalBudget);

  const barSegments: { id: string; label: string; amount: number; color: string }[] = [
    ...topThree.map((d, index) => ({
      id: d.division.id,
      label: d.division.name,
      amount: d.budget,
      color: SEGMENT_COLORS[index],
    })),
    ...(othersBudget > 0
      ? [{ id: "others", label: "ฝ่ายอื่น ๆ", amount: othersBudget, color: OTHER_COLOR }]
      : []),
    ...(unallocatedBudget > 0
      ? [{ id: "unallocated", label: "ยังไม่จัดสรร", amount: unallocatedBudget, color: UNALLOCATED_COLOR }]
      : []),
  ];

  // หมวดทั้งหมดในปีนี้สำหรับหน้าต่างโอนงบ (จัดกลุ่มให้ฝ่ายที่เลือกอยู่ด้านบน)
  const activeProjectIds = new Set(activeDivision?.projects.map((p) => p.id) ?? []);
  const categoryOptions = [...yearProjects]
    .sort((a, b) => Number(activeProjectIds.has(b.id)) - Number(activeProjectIds.has(a.id)))
    .flatMap((p) =>
      p.categories.map((c) => {
        const available = Math.max(0, c.limit - c.used);
        return {
          key: `${p.id}/${c.id}`,
          label: `${p.dept} › ${p.name} › ${c.name}`,
          available,
          limit: c.limit,
          inActiveDivision: activeProjectIds.has(p.id),
        };
      }),
    );

  const selectedSource = categoryOptions.find((o) => o.key === tFrom) ?? null;

  function isProjectExpanded(projectId: string, index: number) {
    if (expandedMap[projectId] !== undefined) return expandedMap[projectId];
    return index === 0;
  }

  function toggleProject(projectId: string, index: number) {
    setExpandedMap((prev) => ({
      ...prev,
      [projectId]: !isProjectExpanded(projectId, index),
    }));
  }

  function openTransferModal() {
    const defaultFrom =
      categoryOptions.find((o) => o.inActiveDivision && o.available > 0) ??
      categoryOptions.find((o) => o.available > 0) ??
      null;
    setTFrom(defaultFrom?.key ?? "");
    setTTo("");
    setTAmount("");
    setTNote("");
    setTError("");
    setTransferOpen(true);
  }

  function handleTransferSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const [fp, fc] = tFrom.split("/");
    const [tp, tc] = tTo.split("/");
    const available = selectedSource?.available ?? 0;
    const numericAmount = Number(tAmount.replace(/,/g, ""));

    const me = getCurrentUser();
    const res = transferBudget(
      savedProjects,
      { projectId: fp ?? "", categoryId: fc ?? "" },
      { projectId: tp ?? "", categoryId: tc ?? "" },
      numericAmount,
      available,
      tNote,
      {
        at: new Date().toISOString(),
        byId: me?.id ?? "",
        byName: me?.fullName ?? "-",
      },
    );

    if (!res.ok) {
      setTError(res.error);
      return;
    }

    const storedYearAlloc = allocations.find((a) => a.year === year);
    const allocErrors = storedYearAlloc
      ? validateAllocation(storedYearAlloc, org, res.projects)
      : [];
    if (allocErrors.length > 0) {
      setTError(allocErrors.join(" · "));
      return;
    }

    saveProjects(res.projects);
    appendBudgetHistory([res.entry]);
    notifyBudgetChanged();

    setTransferOpen(false);
    setTError("");
    setToastMessage(`โอนงบสำเร็จ: ${res.entry.item} (${baht(res.entry.amount)})`);
  }

  return (
    <div className="text-[#0F172A]">
      {/* ===== หัวข้อหน้า + ตัวเลือกปี ===== */}
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold text-[#0F172A]">
            งบประมาณประจำปี {toBE(year)}
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            ข้อมูลจริงจากระบบ · สรุป ณ {todayLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-44">
            <NativeSelect
              aria-label="ปีงบประมาณ"
              value={String(year)}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setToastMessage("");
              }}
            >
              {years.map((y) => (
                <NativeSelectOption key={y} value={String(y)}>
                  ปีงบประมาณ {toBE(y)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <Link
            href="/home-account/budget"
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F172A] shadow-xs transition hover:border-[#A7F3D0] hover:bg-[#ECFDF5] hover:text-[#047857]"
          >
            <SlidersDoubleHorizontal size={16} aria-hidden={true} />
            ตั้งงบประมาณ
          </Link>
        </div>
      </header>

      {/* แจ้งเตือนหลังโอนงบสำเร็จ */}
      {toastMessage && (
        <div
          role="status"
          className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-sm font-medium text-[#047857]"
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            aria-label="ปิดข้อความแจ้งเตือน"
            onClick={() => setToastMessage("")}
            className="rounded-lg p-1 text-[#047857] hover:bg-[#D1FAE5]"
          >
            <Close size={16} aria-hidden={true} />
          </button>
        </div>
      )}

      {/* แนะนำให้ไปตั้งงบหากงบบอร์ดยังเป็น 0 */}
      {totalBudget === 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
          <span>
            ยังไม่ได้ตั้งวงเงินงบประมาณสำหรับปี {toBE(year)} (ยอดตั้งต้นเป็น ฿0)
          </span>
          <Link
            href="/home-account/budget"
            className="rounded-lg bg-[#059669] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#047857]"
          >
            ไปตั้งงบประมาณ →
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* ===== การ์ดบน: งบรวมที่บอร์ดอนุมัติ + แถบสัดส่วนรายฝ่าย ===== */}
        <section
          aria-labelledby="board-budget-title"
          className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl"
        >
          <p
            id="board-budget-title"
            className="flex items-center gap-2 text-sm font-medium text-[#64748B]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#059669]">
              <Wallet2 size={16} aria-hidden={true} />
            </span>
            งบรวมที่บอร์ดอนุมัติ
          </p>

          <p className="money mt-2 text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl">
            {baht(totalBudget)}
          </p>

          {/* แถบสัดส่วนแบ่งตามฝ่าย */}
          <div
            className="mt-4 flex h-4 w-full gap-0.5 overflow-hidden rounded-full bg-[#E2E8F0]"
            role="img"
            aria-label={`สัดส่วนงบประมาณประจำปี ${toBE(year)} รวม ${baht(totalBudget)}`}
          >
            {totalBudget > 0 &&
              barSegments.map((seg) => {
                const widthPct = Math.max(0, (seg.amount / totalBudget) * 100);
                if (widthPct <= 0) return null;
                return (
                  <div
                    key={seg.id}
                    title={`${seg.label} ${baht(seg.amount)} (${widthPct.toFixed(1)}%)`}
                    style={{ width: `${widthPct}%`, backgroundColor: seg.color }}
                    className="h-full transition-all"
                  />
                );
              })}
          </div>

          {/* คำอธิบายสีใต้แถบ */}
          {barSegments.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#475569]">
              {barSegments.map((seg) => (
                <span key={seg.id} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span>{seg.label}</span>
                  <span className="money font-semibold text-[#0F172A]">
                    {baht(seg.amount)}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-[#94A3B8]">
              ยังไม่มีการแบ่งงบให้ฝ่ายใดในปีงบประมาณ {toBE(year)}
            </p>
          )}
        </section>

        {/* ===== เนื้อหา 2 คอลัมน์: ซ้ายรายการฝ่าย / ขวารายละเอียดฝ่าย + โครงการ + สรุป ===== */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* คอลัมน์ซ้าย: รายการฝ่าย */}
          <section
            aria-labelledby="divisions-title"
            className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xl lg:col-span-4"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="divisions-title" className="text-base font-bold text-[#0F172A]">
                ฝ่าย
              </h2>
              <span className="text-xs font-medium text-[#64748B]">
                {divisionSummaries.length} ฝ่าย
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {divisionSummaries.map((item) => {
                const isSelected = activeDivision?.division.id === item.division.id;
                const fillPct = Math.min(100, Math.max(0, item.usedPct));
                const over = item.remaining < 0;

                return (
                  <button
                    key={item.division.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedDivId(item.division.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-[#34D399] bg-[#ECFDF5] shadow-xs"
                        : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <p className="truncate text-sm font-bold text-[#0F172A]">
                      {item.division.name}
                    </p>
                    <p className="money mt-0.5 text-xs text-[#64748B]">
                      งบ {baht(item.budget)} ·{" "}
                      <span className={over ? "font-semibold text-[#BE123C]" : ""}>
                        เหลือ {baht(item.remaining)}
                      </span>
                    </p>
                    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
                      <div
                        className={`h-full rounded-full transition-all ${barColor(item.usedPct, over)}`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 border-t border-[#F1F5F9] pt-4">
              <p
                className={`money text-sm font-bold ${
                  totalRemaining < 0 ? "text-[#BE123C]" : "text-[#047857]"
                }`}
              >
                งบคงเหลือรวม {baht(totalRemaining)}
              </p>
            </div>
          </section>

          {/* คอลัมน์ขวา: รายละเอียดฝ่ายที่เลือก */}
          <section
            aria-labelledby="division-detail-title"
            className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xl lg:col-span-8"
          >
            {activeDivision ? (
              <>
                {/* หัวข้อฝ่าย + ปุ่มโอนงบ */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2
                      id="division-detail-title"
                      className="text-xl font-bold text-[#0F172A]"
                    >
                      {activeDivision.division.name}
                    </h2>
                    <p className="money mt-0.5 text-sm text-[#64748B]">
                      งบ {baht(activeDivision.budget)} · ใช้ไป{" "}
                      {Math.round(activeDivision.usedPct)}%
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openTransferModal}
                    disabled={categoryOptions.length < 2}
                    title={
                      categoryOptions.length < 2
                        ? "ต้องมีอย่างน้อย 2 หมวดในปีนี้จึงจะโอนงบได้"
                        : "โอนงบระหว่างหมวด"
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] shadow-xs transition hover:border-[#A7F3D0] hover:bg-[#ECFDF5] hover:text-[#047857] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowBothDirectionHorizontal2 size={16} aria-hidden={true} />
                    โอนงบ
                  </button>
                </div>

                {/* รายการโครงการแบบ Accordion */}
                <div className="mt-5 flex flex-col gap-3">
                  {activeDivision.projects.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-5 py-8 text-center">
                      <p className="text-sm font-medium text-[#475569]">
                        ยังไม่มีโครงการภายใต้{activeDivision.division.name}ในปี {toBE(year)}
                      </p>
                      <Link
                        href="/home-account/budget"
                        className="mt-2 inline-block text-xs font-semibold text-[#047857] hover:underline"
                      >
                        เพิ่มโครงการที่หน้าตั้งงบประมาณ →
                      </Link>
                    </div>
                  ) : (
                    activeDivision.projects.map((project, index) => {
                      const expanded = isProjectExpanded(project.id, index);
                      const pLimit = projectLimit(project);
                      return (
                        <div
                          key={project.id}
                          className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white"
                        >
                          <button
                            type="button"
                            aria-expanded={expanded}
                            onClick={() => toggleProject(project.id, index)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-[#F8FAFC]"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <ChevronDown
                                size={16}
                                aria-hidden={true}
                                className={`shrink-0 text-[#64748B] transition-transform ${
                                  expanded ? "rotate-0" : "-rotate-90"
                                }`}
                              />
                              <span className="truncate text-sm font-bold text-[#0F172A]">
                                {project.name}
                              </span>
                              {!expanded && (
                                <span className="shrink-0 text-xs text-[#94A3B8]">
                                  {project.categories.length} รายการ
                                </span>
                              )}
                              {activeDivision.departmentCount > 1 && project.dept && (
                                <span className="hidden shrink-0 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] text-[#64748B] sm:inline">
                                  {project.dept}
                                </span>
                              )}
                            </div>

                            <span className="money shrink-0 text-sm font-bold text-[#0F172A]">
                              {baht(pLimit)}
                            </span>
                          </button>

                          {expanded && (
                            <div className="border-t border-[#F1F5F9] px-4 pb-4 pt-2">
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-sm">
                                  <thead>
                                    <tr className="text-xs font-medium text-[#94A3B8]">
                                      <th className="py-2 pr-3 text-left font-medium">รายการ</th>
                                      <th className="px-3 py-2 text-right font-medium">เพดาน</th>
                                      <th className="px-3 py-2 text-right font-medium">คงเหลือ</th>
                                      <th className="py-2 pl-4 text-left font-medium">ใช้ไป</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#F8FAFC]">
                                    {project.categories.map((cat) => {
                                      const catRemaining = cat.limit - cat.used;
                                      const catPct =
                                        cat.limit > 0
                                          ? Math.round((cat.used / cat.limit) * 100)
                                          : cat.used > 0
                                            ? 100
                                            : 0;
                                      const over = catRemaining < 0;

                                      return (
                                        <tr key={cat.id}>
                                          <td className="py-2.5 pr-3 text-[#334155]">
                                            {cat.name}
                                          </td>
                                          <td className="money px-3 py-2.5 text-right font-medium text-[#0F172A]">
                                            {baht(cat.limit)}
                                          </td>
                                          <td
                                            className={`money px-3 py-2.5 text-right font-medium ${
                                              over ? "text-[#BE123C]" : "text-[#0F172A]"
                                            }`}
                                          >
                                            {baht(catRemaining)}
                                          </td>
                                          <td className="py-2.5 pl-4">
                                            <div className="flex items-center gap-3">
                                              <div className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-[#E2E8F0]">
                                                <div
                                                  className={`h-full rounded-full ${barColor(catPct, over)}`}
                                                  style={{
                                                    width: `${Math.min(100, Math.max(0, catPct))}%`,
                                                  }}
                                                />
                                              </div>
                                              <span className="money w-10 text-right text-xs text-[#64748B]">
                                                {catPct}%
                                              </span>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* การ์ดสรุปการใช้จ่ายของฝ่ายที่เลือก */}
                <div className="mt-6 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
                  <h3 className="text-sm font-bold text-[#0F172A]">
                    สรุปการใช้จ่าย{activeDivision.division.name}
                  </h3>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-[#64748B]">ใช้ไปแล้ว</p>
                      <p className="money mt-1 text-2xl font-bold text-[#0F172A]">
                        {baht(activeDivision.used)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">คงเหลือ</p>
                      <p
                        className={`money mt-1 text-2xl font-bold ${
                          activeDivision.remaining < 0 ? "text-[#BE123C]" : "text-[#047857]"
                        }`}
                      >
                        {baht(activeDivision.remaining)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B]">ใช้ไปจากงบทั้งหมด</p>
                      <p className="money mt-1 text-2xl font-bold text-[#0F172A]">
                        {activeDivision.usedPct.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1 border-t border-[#E2E8F0] pt-3 text-xs text-[#64748B]">
                    {activeDivision.projects.length > 0 && (
                      <p className="money">
                        {activeDivision.projects
                          .map((p) => `${p.name} ${baht(projectUsed(p))}`)
                          .join(" · ")}
                      </p>
                    )}
                    <p className="money">
                      งบทั้งองค์กร {baht(totalBudget)} · ใช้ไป {baht(totalUsed)} (
                      {totalUsedPct}%)
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="py-12 text-center text-sm text-[#64748B]">
                ไม่พบข้อมูลฝ่ายในโครงสร้างองค์กร
              </p>
            )}
          </section>
        </div>
      </div>

      {/* ===== โมดอลโอนงบกลางปี ===== */}
      <ModalOverlay
        isOpen={transferOpen}
        onOpenChange={setTransferOpen}
        isDismissable
        className="fixed inset-0 z-50 bg-[#0F172A]/40"
      >
        <Dialog className="max-w-lg">
          <form onSubmit={handleTransferSubmit}>
            <DialogHeader>
              <DialogTitle>โอนงบประมาณ ปี {toBE(year)}</DialogTitle>
              <DialogDescription>
                ย้ายวงเงินที่ยังไม่ได้ใช้ระหว่างหมวดในปีงบประมาณเดียวกัน และบันทึกลงประวัติการแก้งบอัตโนมัติ
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="flex flex-col gap-4 text-[#0F172A]">
              <div>
                <label
                  htmlFor="transfer-from"
                  className="mb-1.5 block text-sm font-semibold text-[#0F172A]"
                >
                  จากหมวด (ต้นทาง)
                </label>
                <NativeSelect
                  id="transfer-from"
                  value={tFrom}
                  onChange={(e) => {
                    setTFrom(e.target.value);
                    setTError("");
                  }}
                >
                  <NativeSelectOption value="">เลือกหมวดต้นทาง</NativeSelectOption>
                  {categoryOptions.map((opt) => (
                    <NativeSelectOption key={opt.key} value={opt.key}>
                      {opt.label} (เหลือ {baht(opt.available)})
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {selectedSource && (
                  <p className="money mt-1 text-xs text-[#64748B]">
                    คงเหลือที่โอนได้สูงสุด:{" "}
                    <strong className="text-[#047857]">{baht(selectedSource.available)}</strong>
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="transfer-to"
                  className="mb-1.5 block text-sm font-semibold text-[#0F172A]"
                >
                  ไปหมวด (ปลายทาง)
                </label>
                <NativeSelect
                  id="transfer-to"
                  value={tTo}
                  onChange={(e) => {
                    setTTo(e.target.value);
                    setTError("");
                  }}
                >
                  <NativeSelectOption value="">เลือกหมวดปลายทาง</NativeSelectOption>
                  {categoryOptions.map((opt) => (
                    <NativeSelectOption key={opt.key} value={opt.key}>
                      {opt.label} (วงเงิน {baht(opt.limit)})
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div>
                <label
                  htmlFor="transfer-amount"
                  className="mb-1.5 block text-sm font-semibold text-[#0F172A]"
                >
                  จำนวนเงินที่โอน (บาท)
                </label>
                <TextField
                  aria-label="จำนวนเงินที่โอน"
                  value={tAmount}
                  onChange={(v) => {
                    setTAmount(v.replace(/[^\d,]/g, ""));
                    setTError("");
                  }}
                >
                  <Input
                    id="transfer-amount"
                    inputMode="numeric"
                    placeholder="เช่น 10,000"
                    className="money text-right"
                  />
                </TextField>
              </div>

              <div>
                <label
                  htmlFor="transfer-note"
                  className="mb-1.5 block text-sm font-semibold text-[#0F172A]"
                >
                  เหตุผลการโอนงบ
                </label>
                <TextField
                  aria-label="เหตุผลการโอนงบ"
                  value={tNote}
                  onChange={(v) => {
                    setTNote(v);
                    setTError("");
                  }}
                >
                  <Input
                    id="transfer-note"
                    placeholder="เช่น ย้ายงบค่าเดินทางไปสนับสนุนค่าฝึกอบรม"
                  />
                </TextField>
              </div>

              {tError && (
                <p
                  role="alert"
                  className="rounded-xl bg-[#FFF1F2] px-3.5 py-2.5 text-sm text-[#9F1239]"
                >
                  {tError}
                </p>
              )}
            </DialogBody>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setTransferOpen(false)}
                className="rounded-xl bg-[#F1F5F9] px-4 py-2 text-sm font-semibold text-[#475569] hover:bg-[#E2E8F0]"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#059669] px-5 py-2 text-sm font-bold text-white hover:bg-[#047857]"
              >
                ยืนยันโอนงบ
              </button>
            </DialogFooter>
          </form>
        </Dialog>
      </ModalOverlay>
    </div>
  );
}
