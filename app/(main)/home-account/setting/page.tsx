"use client";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/tailgrids/core/table";
import { getUsers, updateUser, type Credential } from "@/data/credential";
import { getCurrentUser } from "@/utils/login";
import {
  DEFAULT_ORGANIZATION,
  getDepartment,
  getDepartmentPath,
  getDivision,
  getLineOfWork,
  getUserAffiliation,
  getDirectorId,
  getHeadId,
  loadOrganization,
  type Organization,
} from "@/data/organization";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Close,
  InfoCircle,
  Locked3,
  Search1,
  Trash1,
  UserMultiple4,
} from "@tailgrids/icons";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { Fragment, useEffect, useState } from "react";

import { Input } from "@/components/tailgrids/core/input";
import { TextField } from "@/components/tailgrids/core/text-field";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/tailgrids/core/native-select";
import {
  DEFAULT_POSITIONS,
  DEFAULT_RULES,
  getRoleLabel,
  getRuleRanges,
  loadPositions,
  type ApproverPosition,
  loadApprovalRules,
  resetApprovalRules,
  saveApprovalRules,
  validateApprovalRules,
  type ApprovalRule,
  type StepRole,
} from "@/data/approval";

export default function Account() {
  const [users, setUsers] = useState<Credential[]>([]);
  const [error, setError] = useState("");
  const [org, setOrg] = useState<Organization>(DEFAULT_ORGANIZATION);

  // คนที่ login อยู่: แก้ role / สิทธิ์ admin ของตัวเองไม่ได้ (กันตั้งสิทธิ์ให้ตัวเอง / ล็อกตัวเองออก)
  const [meId, setMeId] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null); // ผู้ใช้ที่เปิดแผงแก้สังกัดอยู่
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [tab, setTab] = useState<"users" | "rules">("users");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage อ่านได้หลังเปิดหน้าเท่านั้น */
    try {
      setMeId(getCurrentUser()?.id ?? "");
      setUsers(getUsers().map(({ password, ...rest }) => rest));
      setOrg(loadOrganization());
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // ════════════════════════════════════════
  //  สังกัดของผู้ใช้: สายงาน → ฝ่าย → แผนก (dropdown กรองต่อกัน · ตัวเลือกจาก data/organization.ts)
  //  เริ่มต้นเป็นค่าว่าง · ฝ่ายบัญชีกำหนดเอง · เปลี่ยนชั้นบน → ชั้นล่างล้างเป็นค่าว่าง
  //  ผอ.ฝ่าย เลือกถึงฝ่ายพอ · กรรมการผู้จัดการ เว้นว่างได้ (ระดับบริษัท)
  // ════════════════════════════════════════
  const setAffiliation = (
    userId: string,
    lineOfWorkId: string | null,
    divisionId: string | null,
    departmentId: string | null,
  ) => {
    const line = lineOfWorkId ? getLineOfWork(org, lineOfWorkId) : null;
    const department = departmentId ? getDepartment(org, departmentId) : null;
    const patch = {
      lineOfWorkId,
      divisionId,
      departmentId,
      // ฟิลด์เดิมที่หน้าสร้างคำขอยังอ่านอยู่ → อัปเดตให้ตรงกัน
      departmentInfo: { lineOfWork: line?.name ?? "", department: department?.name ?? "" },
      hierarchy: departmentId
        ? { headId: getHeadId(org, departmentId), directorId: getDirectorId(org, departmentId) }
        : { headId: null, directorId: null },
    };
    updateUser(userId, patch);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)));
  };

  // หัวหน้า / ผอ. โดยตรงของผู้ใช้ (spec §3) → คำขอของคนนี้จะไปหาคนที่เลือกเท่านั้น
  // ※ เปลี่ยนสังกัด (setAffiliation) จะรีเซ็ตค่านี้ เพราะคนเดิมอาจอยู่คนละแผนกแล้ว
  const setSupervisor = (u: Credential, key: "headId" | "directorId", value: string) => {
    const hierarchy = {
      headId: u.hierarchy?.headId ?? null,
      directorId: u.hierarchy?.directorId ?? null,
      [key]: value || null,
    };
    updateUser(u.id, { hierarchy });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, hierarchy } : x)));
  };
  const changeLine = (u: Credential, lineOfWorkId: string) =>
    setAffiliation(u.id, lineOfWorkId || null, null, null);
  const changeDivision = (u: Credential, divisionId: string) => {
    const lineId = divisionId ? getDivision(org, divisionId)?.lineOfWorkId ?? null : affiliationIds(u).lineId;
    setAffiliation(u.id, lineId, divisionId || null, null);
  };
  const changeDepartment = (u: Credential, departmentId: string) => {
    if (!departmentId) {
      const { lineId, divisionId } = affiliationIds(u);
      setAffiliation(u.id, lineId, divisionId, null);
      return;
    }
    const { division, lineOfWork } = getDepartmentPath(org, departmentId);
    setAffiliation(u.id, lineOfWork?.id ?? null, division?.id ?? null, departmentId);
  };
  // id ของแต่ละชั้นที่ผู้ใช้สังกัดอยู่ตอนนี้ (ไล่จากชั้นลึกสุด)
  const affiliationIds = (u: Credential) => {
    const a = getUserAffiliation(org, u);
    return {
      lineId: a.lineOfWork?.id ?? null,
      divisionId: a.division?.id ?? null,
      departmentId: a.department?.id ?? null,
    };
  };
  // บทบาทที่เลือกได้ = role ในตัว + ตำแหน่งผู้อนุมัติที่เพิ่มเอง (data/approval.ts)
  const BUILT_IN_ROLES = ["EMPLOYEE", "HEAD", "DIRECTOR", "MANAGING_DIRECTOR", "ACCOUNTANT", "FINANCE"];
  const roleLabel = (r: string) => (r === "EMPLOYEE" ? "พนักงาน" : getRoleLabel(r, positions));

  // ════════════════════════════════════════
  //  Approval Matrix: อ่าน / แก้ / บันทึกกฎ (data/approval.ts)
  // ════════════════════════════════════════
  const [rules, setRules] = useState<ApprovalRule[]>(DEFAULT_RULES);
  const [ruleErrors, setRuleErrors] = useState<string[]>([]);
  const [ruleMessage, setRuleMessage] = useState("");
  const [positions, setPositions] = useState<ApproverPosition[]>(DEFAULT_POSITIONS);
  // กฎที่แก้แล้วยังไม่กดบันทึก · ยืนยันก่อนคืนค่าเริ่มต้น
  const [rulesDirty, setRulesDirty] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // อ่านกฎ + ตำแหน่งที่บันทึกไว้หลังเปิดหน้า (localStorage มีแค่ในเบราว์เซอร์)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- อ่านได้หลังเปิดหน้าเท่านั้น */
    setRules(loadApprovalRules());
    setPositions(loadPositions());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // บทบาทที่เลือกได้ในตาราง (ต่อจาก BUILT_IN_ROLES ข้างบน)
  const roles = [
    ...BUILT_IN_ROLES,
    ...positions.filter((p) => !p.builtIn).map((p) => p.id),
  ];

  // เปลี่ยนบทบาทของผู้ใช้ → บันทึกทันที (ใช้มอบตำแหน่งผู้อนุมัติที่เพิ่มเอง)
  // สิทธิ์ผู้ดูแลระบบ: ต้องเหลือ admin อย่างน้อย 1 คนเสมอ
  const adminCount = users.filter((u) => u.isAdmin).length;
  const toggleAdmin = (userId: string, isAdmin: boolean) => {
    if (!isAdmin && adminCount <= 1) return;
    updateUser(userId, { isAdmin });
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isAdmin } : u)));
  };

  const changeRole = (userId: string, role: string) => {
    updateUser(userId, { role });
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
  };

  // ยอดต่ำสุดของแต่ละช่วง = เพดานช่วงก่อนหน้า + 1 (คำนวณให้ ไม่ต้องกรอก)
  const ranges = getRuleRanges(rules);
  const money = (n: number) => n.toLocaleString("en-US");

  // แก้ค่าแล้วล้างข้อความเดิม
  const updateRules = (next: ApprovalRule[]) => {
    setRules(next);
    setRuleErrors([]);
    setRuleMessage("");
    setRulesDirty(true);
  };

  // แก้เพดานของช่วง i (ช่องว่าง = null → ตอนบันทึกจะเตือน)
  const setMax = (i: number, value: string) => {
    const n = value === "" ? null : Number(value.replace(/,/g, ""));
    updateRules(rules.map((r, k) => (k === i ? { ...r, max: n } : r)));
  };

  // เพิ่ม (ต่อท้าย) / เอาออก ผู้อนุมัติ 1 ตำแหน่งในช่วง i · ลำดับจัดเองได้ด้วย moveApprover
  const toggleApprover = (i: number, role: StepRole) => {
    updateRules(
      rules.map((r, k) => {
        if (k !== i) return r;
        const has = r.approvers.includes(role);
        return { ...r, approvers: has ? r.approvers.filter((a) => a !== role) : [...r.approvers, role] };
      }),
    );
  };

  // เลื่อนผู้อนุมัติตำแหน่งที่ idx ในช่วง i ไปก่อน (-1) / หลัง (+1)
  const moveApprover = (i: number, idx: number, dir: -1 | 1) => {
    updateRules(
      rules.map((r, k) => {
        if (k !== i) return r;
        const to = idx + dir;
        if (to < 0 || to >= r.approvers.length) return r;
        const next = [...r.approvers];
        [next[idx], next[to]] = [next[to], next[idx]];
        return { ...r, approvers: next };
      }),
    );
  };

  // เพิ่มช่วงใหม่ก่อนช่วงสุดท้าย (ช่วงสุดท้ายต้องเป็น "ขึ้นไป" เสมอ)
  const addRange = () => {
    const finite = rules.slice(0, -1);
    const lastMax = finite.length > 0 ? (finite[finite.length - 1].max ?? 0) : 0;
    updateRules([
      ...finite,
      { max: lastMax + 10000, approvers: [] },
      rules[rules.length - 1],
    ]);
  };

  const removeRange = (i: number) => {
    updateRules(rules.filter((_, k) => k !== i));
  };

  const handleSaveRules = () => {
    try {
      saveApprovalRules(rules, positions);
      setRulesDirty(false);
      setRuleErrors([]);
      setRuleMessage("บันทึกแล้ว · คำขอใหม่จะใช้กฎนี้ทันที (คำขอที่ส่งไปแล้วใช้เส้นทางเดิม)");
    } catch {
      setRuleErrors(validateApprovalRules(rules, positions));
      setRuleMessage("");
    }
  };

  const handleResetRules = () => {
    resetApprovalRules();
    setRules(DEFAULT_RULES);
    setRulesDirty(false);
    setRuleErrors([]);
    setRuleMessage("คืนค่าเริ่มต้นตาม requirement แล้ว");
  };

  // ยังไม่กำหนดสังกัด (กรรมการผู้จัดการไม่ต้องสังกัด) → เตือนให้ตั้งก่อนใช้งาน
  const needsAffiliation = (u: Credential) =>
    !u.departmentId && !u.divisionId && u.role !== "MANAGING_DIRECTOR";
  const unassignedCount = users.filter(needsAffiliation).length;
  // ค้นหาผู้ใช้: ชื่อ / รหัสพนักงาน / username
  const q = query.trim().toLowerCase();
  const shownUsers = users.filter(
    (u) =>
      (!onlyUnassigned || unassignedCount === 0 || needsAffiliation(u)) &&
      (!q ||
        u.fullName.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        (u.username ?? "").toLowerCase().includes(q)),
  );

  const tabs = [
    { key: "users" as const, label: "ผู้ใช้และสังกัด", badge: unassignedCount > 0 ? `ยังไม่กำหนด ${unassignedCount}` : String(users.length), warn: unassignedCount > 0 },
    { key: "rules" as const, label: "วงเงินและสายการอนุมัติ", badge: rulesDirty ? "ยังไม่บันทึก" : `${ranges.length} ช่วง`, warn: false },
  ];

  return (
    <div className="text-[#0F172A]">
      <header className="mb-9">
        <h1 className="text-[32px] font-bold">จัดการผู้ใช้และสิทธิ์</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          กำหนดสังกัด บทบาท และผู้อนุมัติของแต่ละคน · ตารางผู้ใช้แก้แล้วบันทึกทันที
        </p>
      </header>

      {/* แต่ละส่วนห่างกัน 36px เหมือนหน้า employee */}
      <div className="flex flex-col gap-9">
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
        {tab === "users" && (
          <div role="tabpanel" id="panel-users" aria-labelledby="tab-users">
        {/* ===== ผู้ใช้ ===== */}
        {/* แถวละ 1 คน: อ่านสังกัด / หัวหน้า เป็นข้อความ · กด "แก้ไขสังกัด" ถึงเปิดช่องเลือกใต้แถว */}
        <section
          aria-labelledby="users-title"
          className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="users-title" className="flex items-center gap-2 text-2xl font-bold">
              <UserMultiple4 aria-hidden="true" />
              ผู้ใช้ทั้งหมด{" "}
              <span className="text-sm font-normal text-[#64748B]">
                {shownUsers.length === users.length ? users.length : `${shownUsers.length} จาก ${users.length}`} คน
              </span>
            </h2>
            <label className="flex w-full items-center gap-2 rounded-xl border border-[#E2E8F0] px-3 py-2 focus-within:border-[#059669] sm:w-72">
              <Search1 size={18} className="shrink-0 text-[#94A3B8]" aria-hidden="true" />
              <span className="sr-only">ค้นหาผู้ใช้</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อ รหัส หรือ username"
                className="w-full border-0 bg-transparent p-0 text-sm outline-none focus:ring-0"
              />
            </label>
          </div>

          {/* ยังไม่กำหนดสังกัด → กดเพื่อกรองเฉพาะคนกลุ่มนี้ */}
          {unassignedCount > 0 && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FFFBEB] px-3.5 py-2.5 text-sm text-[#B45309]">
              <p className="flex items-start gap-2">
                <InfoCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                มีผู้ใช้ {unassignedCount} คนยังไม่กำหนดสังกัด คำขอของคนกลุ่มนี้จะหาผู้อนุมัติไม่เจอ
              </p>
              <button
                type="button"
                aria-pressed={onlyUnassigned}
                onClick={() => setOnlyUnassigned((v) => !v)}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#FEF3C7]"
              >
                {onlyUnassigned ? "แสดงทุกคน" : "แสดงเฉพาะคนที่ยังไม่กำหนด"}
              </button>
            </div>
          )}

          <TableRoot className="bg-white">
            <TableHeader className="bg-[#059669] font-bold text-white">
              <TableRow>
                <TableHead>ผู้ใช้</TableHead>
                <TableHead>สังกัด</TableHead>
                <TableHead>ผู้อนุมัติโดยตรง</TableHead>
                <TableHead>บทบาท</TableHead>
                <TableHead className="text-center">ผู้ดูแลระบบ</TableHead>
                <TableHead>
                  <span className="sr-only">แก้ไข</span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {error ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-[#BE123C]">
                    {error}
                  </TableCell>
                </TableRow>
              ) : shownUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-[#64748B]">
                    {q ? (
                      <>
                        ไม่พบผู้ใช้ที่ตรงกับ “{query.trim()}”{" "}
                        <button
                          type="button"
                          onClick={() => setQuery("")}
                          className="font-semibold text-[#047857] hover:underline"
                        >
                          ล้างคำค้นหา
                        </button>
                      </>
                    ) : (
                      "ยังไม่มีข้อมูล"
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                shownUsers.map((u) => {
                  const ids = affiliationIds(u);
                  const isMe = u.id === meId;
                  const isEditing = editing === u.id;
                  const a = getUserAffiliation(org, u);
                  const path = [a.lineOfWork?.name, a.division?.name, a.department?.name].filter(Boolean);
                  const nameOf = (id: string | null | undefined) => users.find((x) => x.id === id)?.fullName;
                  return (
                    <Fragment key={u.id}>
                      <TableRow className={isEditing ? "bg-[#F8FAFC]" : undefined}>
                        {/* ผู้ใช้: ชื่อ + รหัส · ป้ายคุณ / ปิดใช้งาน */}
                        <TableCell className="min-w-52">
                          <div className="flex items-center gap-3">
                            <span
                              aria-hidden="true"
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ECFDF5] text-sm font-bold text-[#047857]"
                            >
                              {u.fullName.slice(0, 2)}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold">
                                {u.fullName}
                                {isMe && (
                                  <span className="ml-1.5 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-xs font-semibold text-[#047857]">
                                    คุณ
                                  </span>
                                )}
                                {u.status !== "ACTIVE" && (
                                  <span className="status status-draft ml-1.5">ปิดใช้งาน</span>
                                )}
                              </p>
                              <p className="text-xs text-[#64748B]">
                                {u.id} · {u.username}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* สังกัด: สายงาน › ฝ่าย › แผนก (ข้อความ) */}
                        <TableCell className="min-w-48 text-sm">
                          {path.length > 0 ? (
                            <>
                              <p className="font-medium">{path[path.length - 1]}</p>
                              {path.length > 1 && (
                                <p className="text-xs text-[#64748B]">{path.slice(0, -1).join(" › ")}</p>
                              )}
                            </>
                          ) : needsAffiliation(u) ? (
                            <span className="text-[#B45309]">ยังไม่กำหนดสังกัด</span>
                          ) : (
                            <span className="text-[#64748B]">ระดับบริษัท</span>
                          )}
                        </TableCell>

                        <TableCell className="min-w-44 text-xs text-[#475569]">
                          <p>หัวหน้า: {nameOf(u.hierarchy?.headId) ?? "ใครก็ได้ในแผนก"}</p>
                          <p>ผอ.: {nameOf(u.hierarchy?.directorId) ?? "ใครก็ได้ในฝ่าย"}</p>
                        </TableCell>

                        <TableCell className="min-w-40">
                          <NativeSelect
                            aria-label={`บทบาทของ ${u.fullName}`}
                            value={u.role}
                            disabled={isMe}
                            title={isMe ? "แก้บทบาทของตัวเองไม่ได้" : undefined}
                            onChange={(e) => changeRole(u.id, e.target.value)}
                          >
                            {roles.map((r) => (
                              <NativeSelectOption key={r} value={r}>
                                {roleLabel(r)}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        </TableCell>

                        <TableCell className="text-center">
                          {/* TailGrids Checkbox · ห้ามห่อด้วย <label> (กดแล้วสลับ 2 ครั้ง) */}
                          <Checkbox
                            size="md"
                            aria-label={`สิทธิ์ผู้ดูแลระบบของ ${u.fullName}`}
                            checked={!!u.isAdmin}
                            disabled={isMe || (!!u.isAdmin && adminCount <= 1)}
                            title={
                              isMe
                                ? "แก้สิทธิ์ของตัวเองไม่ได้"
                                : u.isAdmin && adminCount <= 1
                                  ? "ต้องมีผู้ดูแลระบบอย่างน้อย 1 คน"
                                  : undefined
                            }
                            onChange={(e) => toggleAdmin(u.id, e.target.checked)}
                          />
                        </TableCell>

                        <TableCell className="text-right">
                          <button
                            type="button"
                            aria-expanded={isEditing}
                            aria-controls={`edit-${u.id}`}
                            onClick={() => setEditing(isEditing ? null : u.id)}
                            className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold text-[#047857] hover:bg-[#ECFDF5]"
                          >
                            {isEditing ? "เสร็จ" : "แก้ไขสังกัด"}
                          </button>
                        </TableCell>
                      </TableRow>

                      {/* แผงแก้สังกัด: สายงาน → ฝ่าย → แผนก กรองต่อกัน + ผู้อนุมัติโดยตรง · เลือกแล้วบันทึกทันที */}
                      {isEditing && (
                        <TableRow className="bg-[#F8FAFC]">
                          <TableCell colSpan={6} id={`edit-${u.id}`}>
                            <div className="grid grid-cols-1 gap-3 pb-2 sm:grid-cols-2 lg:grid-cols-5">
                              <label className="text-xs font-semibold text-[#475569]">
                                สายงาน
                                <NativeSelect
                                  className="mt-1 bg-white"
                                  value={ids.lineId ?? ""}
                                  onChange={(e) => changeLine(u, e.target.value)}
                                >
                                  <NativeSelectOption value="">- ยังไม่กำหนด -</NativeSelectOption>
                                  {org.linesOfWork.map((l) => (
                                    <NativeSelectOption key={l.id} value={l.id}>
                                      {l.name}
                                    </NativeSelectOption>
                                  ))}
                                </NativeSelect>
                              </label>
                              <label className="text-xs font-semibold text-[#475569]">
                                ฝ่าย
                                <NativeSelect
                                  className="mt-1 bg-white"
                                  value={ids.divisionId ?? ""}
                                  onChange={(e) => changeDivision(u, e.target.value)}
                                  disabled={!ids.lineId}
                                >
                                  <NativeSelectOption value="">
                                    {ids.lineId ? "- ยังไม่กำหนด -" : "เลือกสายงานก่อน"}
                                  </NativeSelectOption>
                                  {org.divisions
                                    .filter((d) => d.lineOfWorkId === ids.lineId)
                                    .map((d) => (
                                      <NativeSelectOption key={d.id} value={d.id}>
                                        {d.name}
                                      </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                              </label>
                              <label className="text-xs font-semibold text-[#475569]">
                                แผนก
                                <NativeSelect
                                  className="mt-1 bg-white"
                                  value={ids.departmentId ?? ""}
                                  onChange={(e) => changeDepartment(u, e.target.value)}
                                  disabled={!ids.divisionId}
                                >
                                  <NativeSelectOption value="">
                                    {ids.divisionId ? "- ยังไม่กำหนด -" : "เลือกฝ่ายก่อน"}
                                  </NativeSelectOption>
                                  {org.departments
                                    .filter((d) => d.divisionId === ids.divisionId)
                                    .map((d) => (
                                      <NativeSelectOption key={d.id} value={d.id}>
                                        {d.name}
                                      </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                              </label>
                              <label className="text-xs font-semibold text-[#475569]">
                                หัวหน้าโดยตรง
                                <NativeSelect
                                  className="mt-1 bg-white"
                                  value={u.hierarchy?.headId ?? ""}
                                  onChange={(e) => setSupervisor(u, "headId", e.target.value)}
                                >
                                  <NativeSelectOption value="">ใครก็ได้ในแผนก</NativeSelectOption>
                                  {users
                                    .filter((x) => x.role === "HEAD" && x.id !== u.id && !!u.departmentId && x.departmentId === u.departmentId)
                                    .map((x) => (
                                      <NativeSelectOption key={x.id} value={x.id}>
                                        {x.fullName}
                                      </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                              </label>
                              <label className="text-xs font-semibold text-[#475569]">
                                ผอ.โดยตรง
                                <NativeSelect
                                  className="mt-1 bg-white"
                                  value={u.hierarchy?.directorId ?? ""}
                                  onChange={(e) => setSupervisor(u, "directorId", e.target.value)}
                                >
                                  <NativeSelectOption value="">ใครก็ได้ในฝ่าย</NativeSelectOption>
                                  {users
                                    .filter((x) => x.role === "DIRECTOR" && x.id !== u.id && !!u.divisionId && x.divisionId === u.divisionId)
                                    .map((x) => (
                                      <NativeSelectOption key={x.id} value={x.id}>
                                        {x.fullName}
                                      </NativeSelectOption>
                                    ))}
                                </NativeSelect>
                              </label>
                            </div>
                            <p className="text-xs text-[#64748B]">
                              เปลี่ยนสายงาน / ฝ่าย / แผนก แล้วหัวหน้าและผอ.โดยตรงจะรีเซ็ตเป็นค่าตามผังองค์กร
                            </p>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </TableRoot>
        </section>

          </div>
        )}
        {tab === "rules" && (
          <div role="tabpanel" id="panel-rules" aria-labelledby="tab-rules">
        {/* ===== วงเงิน + สายการอนุมัติ ===== */}
        <section
          aria-labelledby="rules-title"
          className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl"
        >
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="rules-title" className="text-2xl font-bold">
                ตั้งค่าวงเงิน และ สายการอนุมัติ
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                คำขอที่ยอดอยู่ในช่วงไหนจะผ่านผู้อนุมัติของช่วงนั้น แล้วต่อด้วยฝ่ายบัญชี → การเงินเสมอ
              </p>
            </div>
            {rulesDirty && (
              <span className="rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-3 py-1 text-xs font-semibold text-[#B45309]">
                มีการแก้ไขที่ยังไม่บันทึก
              </span>
            )}
          </div>

          <ol className="flex flex-col gap-3">
            {ranges.map((range, i) => {
              const isLast = i === ranges.length - 1;
              const allTaken = positions.every((p) => range.approvers.includes(p.id));
              return (
                <li
                  key={i}
                  className="flex flex-col gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 lg:flex-row lg:items-start"
                >
                  {/* ซ้าย: ช่วงยอด · ต่ำสุดคำนวณให้ · กรอกได้แค่เพดาน */}
                  <div className="flex flex-wrap items-center gap-2 lg:w-[42%]">
                    <span className="w-full text-xs font-semibold text-[#64748B]">ช่วงที่ {i + 1}</span>
                    <TextField readOnly>
                      <Input
                        value={money(range.min)}
                        readOnly
                        aria-label={`ยอดต่ำสุดช่วงที่ ${i + 1}`}
                        className="money w-36 bg-[#F1F5F9] text-right text-[#64748B]"
                      />
                    </TextField>
                    {isLast ? (
                      <span className="text-sm">บาทขึ้นไป</span>
                    ) : (
                      <>
                        <span aria-hidden="true">–</span>
                        <TextField
                          aria-label={`ยอดสูงสุดช่วงที่ ${i + 1}`}
                          value={range.max === null ? "" : String(range.max)}
                          onChange={(v) => setMax(i, v)}
                        >
                          <Input inputMode="numeric" className="money w-36 bg-white text-right" />
                        </TextField>
                        <span className="text-sm">บาท</span>
                      </>
                    )}
                  </div>

                  {/* ขวา: เส้นทางอนุมัติ + เพิ่มผู้อนุมัติ */}
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5">ผู้ขอ</span>
                      {range.approvers.map((role, idx) => {
                        const label = getRoleLabel(role, positions);
                        return (
                          <Fragment key={role}>
                            <ArrowRight size={16} className="shrink-0 text-[#94A3B8]" aria-hidden="true" />
                            <span className="flex items-center gap-0.5 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] p-1 font-semibold text-[#047857]">
                              <button
                                type="button"
                                aria-label={`เลื่อน ${label} ไปก่อน`}
                                disabled={idx === 0}
                                onClick={() => moveApprover(i, idx, -1)}
                                className="rounded p-0.5 hover:bg-[#D1FAE5] disabled:opacity-25"
                              >
                                <ChevronLeft size={14} aria-hidden="true" />
                              </button>
                              <span className="px-1">{label}อนุมัติ</span>
                              <button
                                type="button"
                                aria-label={`เลื่อน ${label} ไปหลัง`}
                                disabled={idx === range.approvers.length - 1}
                                onClick={() => moveApprover(i, idx, 1)}
                                className="rounded p-0.5 hover:bg-[#D1FAE5] disabled:opacity-25"
                              >
                                <ChevronRight size={14} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                aria-label={`เอา ${label} ออก`}
                                onClick={() => toggleApprover(i, role)}
                                className="ml-0.5 rounded p-0.5 text-[#64748B] hover:bg-[#FFE4E6] hover:text-[#BE123C]"
                              >
                                <Close size={14} aria-hidden="true" />
                              </button>
                            </span>
                          </Fragment>
                        );
                      })}
                      {/* ขั้นท้ายตายตัว: เปลี่ยนไม่ได้ */}
                      <ArrowRight size={16} className="shrink-0 text-[#94A3B8]" aria-hidden="true" />
                      <span
                        className="flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-[#475569]"
                        title="ขั้นนี้มีทุกเส้นทาง เปลี่ยนไม่ได้"
                      >
                        <Locked3 size={14} aria-hidden="true" />
                        {range.approvers.length === 0 ? "ส่งตรงฝ่ายบัญชี" : "ฝ่ายบัญชี"}
                      </span>
                      <ArrowRight size={16} className="shrink-0 text-[#94A3B8]" aria-hidden="true" />
                      <span
                        className="flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-[#475569]"
                        title="ขั้นนี้มีทุกเส้นทาง เปลี่ยนไม่ได้"
                      >
                        <Locked3 size={14} aria-hidden="true" />
                        การเงินทำจ่าย
                      </span>
                    </div>

                    {/* เพิ่มผู้อนุมัติ: ตำแหน่งที่อยู่ในเส้นทางของช่วงนี้แล้ว → เลือกไม่ได้ · เลือกแล้วต่อท้ายเส้นทาง */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="w-60">
                        <NativeSelect
                          aria-label={`เพิ่มผู้อนุมัติช่วงที่ ${i + 1}`}
                          value=""
                          disabled={allTaken}
                          onChange={(e) => {
                            if (e.target.value) toggleApprover(i, e.target.value);
                          }}
                          className="bg-white py-1.5 text-xs"
                        >
                          <NativeSelectOption value="">
                            {allTaken ? "ใส่ครบทุกตำแหน่งแล้ว" : "+ เพิ่มผู้อนุมัติ"}
                          </NativeSelectOption>
                          {positions.map((p) => {
                            const taken = range.approvers.includes(p.id);
                            return (
                              <NativeSelectOption key={p.id} value={p.id} disabled={taken}>
                                {p.label}
                                {taken ? " (อยู่ในเส้นทางแล้ว)" : ""}
                              </NativeSelectOption>
                            );
                          })}
                        </NativeSelect>
                      </div>

                      {/* ลบช่วง: ช่วงสุดท้าย ("ขึ้นไป") ลบไม่ได้ · ต้องเหลืออย่างน้อย 2 ช่วง */}
                      {!isLast && ranges.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeRange(i)}
                          className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-[#BE123C] hover:bg-[#FFF1F2]"
                        >
                          <Trash1 size={14} aria-hidden="true" /> ลบช่วงนี้
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <button
            type="button"
            onClick={addRange}
            className="mt-3 w-full rounded-xl border border-dashed border-[#059669] py-2.5 text-sm font-semibold text-[#047857] hover:bg-[#ECFDF5]"
          >
            + เพิ่มช่วงวงเงิน
          </button>

          <p className="mt-3 flex items-start gap-2 text-xs text-[#64748B]">
            <InfoCircle size={16} className="shrink-0" aria-hidden="true" />
            ผู้ขอเป็นหัวหน้า / ผอ. เอง หรือตำแหน่งนั้นว่าง ระบบจะส่งให้ตำแหน่งที่สูงกว่าอนุมัติแทนอัตโนมัติ
          </p>

          {/* ข้อความผิดพลาด / สำเร็จ */}
          {ruleErrors.length > 0 && (
            <ul role="alert" className="mt-4 list-disc rounded-xl bg-[#FFF1F2] py-2.5 pl-8 pr-3 text-sm text-[#9F1239]">
              {ruleErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {ruleMessage && (
            <p role="status" className="mt-4 rounded-xl bg-[#ECFDF5] p-3 text-sm text-[#047857]">
              {ruleMessage}
            </p>
          )}

          {/* คืนค่าเริ่มต้น = เขียนทับกฎที่บันทึกไว้ทันที → ถามยืนยันก่อน */}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            {confirmReset ? (
              <>
                <span className="text-sm text-[#9F1239]">คืนกฎทั้งหมดเป็นค่าเริ่มต้น?</span>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-xl bg-[#F1F5F9] px-4 py-2.5 text-sm font-semibold text-[#475569] hover:bg-[#E2E8F0]"
                >
                  ไม่ใช่
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleResetRules();
                    setConfirmReset(false);
                  }}
                  className="rounded-xl bg-[#BE123C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#9F1239]"
                >
                  ยืนยันคืนค่า
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="rounded-xl bg-[#F1F5F9] px-5 py-2.5 text-sm font-semibold text-[#475569] hover:bg-[#E2E8F0]"
              >
                คืนค่าเริ่มต้น
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveRules}
              disabled={!rulesDirty}
              className="rounded-xl bg-[#059669] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#047857] disabled:opacity-50"
            >
              บันทึกวงเงินและสายอนุมัติ
            </button>
          </div>
        </section>
          </div>
        )}
      </div>
    </div>
  );
}
