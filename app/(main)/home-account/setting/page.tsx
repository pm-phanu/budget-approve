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
  createPositionFromRole,
  getRoleLabel,
  getRuleRanges,
  loadPositions,
  savePositions,
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
  const BUILT_IN_ROLES = ["EMPLOYEE", "HEAD", "DIRECTOR", "MANAGING_DIRECTOR", "ACCOUNTANT_ADMIN", "FINANCE"];
  const roleLabel = (r: string) => (r === "EMPLOYEE" ? "พนักงาน" : getRoleLabel(r, positions));

  // ════════════════════════════════════════
  //  Approval Matrix: อ่าน / แก้ / บันทึกกฎ (data/approval.ts)
  // ════════════════════════════════════════
  const [rules, setRules] = useState<ApprovalRule[]>(DEFAULT_RULES);
  const [ruleErrors, setRuleErrors] = useState<string[]>([]);
  const [ruleMessage, setRuleMessage] = useState("");
  const [positions, setPositions] = useState<ApproverPosition[]>(DEFAULT_POSITIONS);
  const [positionMessage, setPositionMessage] = useState("");
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

  // ---------- ตำแหน่งผู้อนุมัติ ----------
  // role ของผู้ใช้ใน localStorage (ไม่ซ้ำ) → ใช้เป็นตัวเลือกใน dropdown "เพิ่มตำแหน่งผู้อนุมัติ"
  const userRoles = [...new Set(users.map((u) => u.role))];
  // เหตุผลที่เลือกไม่ได้ (ว่าง = เลือกได้)
  const roleBlockedReason = (role: string) => {
    if (positions.some((p) => p.id === role)) return "เป็นตำแหน่งผู้อนุมัติอยู่แล้ว";
    if (role === "ACCOUNTANT_ADMIN" || role === "FINANCE") return "อยู่ท้ายเส้นทางเสมอ";
    if (role === "EMPLOYEE") return "พนักงานทั่วไป";
    return "";
  };

  // เพิ่ม role ที่เลือกเป็นตำแหน่งผู้อนุมัติ → บันทึกทันที
  const addPosition = (role: string) => {
    if (!role || roleBlockedReason(role)) return;
    const label = roleLabel(role);
    const next = [...positions, createPositionFromRole(role, label)];
    savePositions(next);
    setPositions(next);
    setPositionMessage(`เพิ่ม "${label}" เป็นตำแหน่งผู้อนุมัติแล้ว · เลือกใส่ในช่วงวงเงินได้`);
  };

  // ลบได้เฉพาะตำแหน่งที่เพิ่มเอง และต้องไม่ถูกใช้อยู่ (ในกฎ หรือมีผู้ใช้ถือตำแหน่งนี้)
  const removePosition = (id: string) => {
    const usedInRules = rules.some((r) => r.approvers.includes(id));
    const holders = users.filter((u) => u.role === id).length;
    if (usedInRules) return setPositionMessage("ลบไม่ได้: ตำแหน่งนี้ยังอยู่ในช่วงวงเงิน เอาออกจากช่วงก่อน");
    if (holders > 0) return setPositionMessage(`ลบไม่ได้: มีผู้ใช้ ${holders} คนถือตำแหน่งนี้ เปลี่ยนบทบาทก่อน`);
    const next = positions.filter((p) => p.id !== id);
    savePositions(next);
    setPositions(next);
    setPositionMessage("ลบตำแหน่งแล้ว");
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

  // ค้นหาผู้ใช้: ชื่อ / รหัสพนักงาน / username
  const q = query.trim().toLowerCase();
  const shownUsers = users.filter(
    (u) =>
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q) ||
      (u.username ?? "").toLowerCase().includes(q),
  );
  // ยังไม่กำหนดสังกัด (กรรมการผู้จัดการไม่ต้องสังกัด) → เตือนให้ตั้งก่อนใช้งาน
  const needsAffiliation = (u: Credential) =>
    !u.departmentId && !u.divisionId && u.role !== "MANAGING_DIRECTOR";
  const unassignedCount = users.filter(needsAffiliation).length;

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
        {/* ===== ผู้ใช้ ===== */}
        <section
          aria-labelledby="users-title"
          className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="users-title" className="flex items-center gap-2 text-2xl font-bold">
              <UserMultiple4 aria-hidden="true" />
              ผู้ใช้ทั้งหมด{" "}
              <span className="text-sm font-normal text-[#64748B]">
                {q ? `${shownUsers.length} จาก ${users.length}` : users.length} คน
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

          {unassignedCount > 0 && (
            <p className="mb-4 flex items-start gap-2 rounded-xl bg-[#FFFBEB] px-3.5 py-2.5 text-sm text-[#B45309]">
              <InfoCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              มีผู้ใช้ {unassignedCount} คนยังไม่กำหนดสังกัด · คำขอของคนกลุ่มนี้จะหาผู้อนุมัติไม่เจอจนกว่าจะตั้งสายงาน / ฝ่าย / แผนก
            </p>
          )}

          {/* ตารางกว้าง (11 คอลัมน์) → เลื่อนแนวนอนในกรอบ ไม่ให้ทั้งหน้าเลื่อน */}
          <div className="w-full overflow-x-auto">
            <TableRoot className="bg-white">
              <TableHeader className="bg-[#059669] font-bold text-white">
                <TableRow>
                  <TableHead>รหัสพนักงาน</TableHead>
                  <TableHead>ชื่อ-นามสกุล</TableHead>
                  <TableHead>สายงาน</TableHead>
                  <TableHead>ฝ่าย</TableHead>
                  <TableHead>แผนก</TableHead>
                  <TableHead>บทบาท</TableHead>
                  <TableHead>หัวหน้าโดยตรง</TableHead>
                  <TableHead>ผอ.โดยตรง</TableHead>
                  <TableHead>งบร่วม</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-center">ผู้ดูแลระบบ</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {error ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-10 text-center text-[#BE123C]">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : shownUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-10 text-center text-[#64748B]">
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
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="whitespace-nowrap text-[#64748B]">{u.id}</TableCell>
                        <TableCell className="min-w-44">
                          <span className="font-semibold">{u.fullName}</span>
                          {isMe && (
                            <span className="ml-1.5 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-xs font-semibold text-[#047857]">
                              คุณ
                            </span>
                          )}
                          {needsAffiliation(u) && (
                            <span className="mt-0.5 block text-xs text-[#B45309]">ยังไม่กำหนดสังกัด</span>
                          )}
                        </TableCell>
                        {/* สายงาน → ฝ่าย (เฉพาะในสายงานที่เลือก) → แผนก (เฉพาะในฝ่ายที่เลือก) */}
                        <TableCell className="min-w-44">
                          <NativeSelect
                            aria-label={`สายงานของ ${u.fullName}`}
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
                        </TableCell>
                        <TableCell className="min-w-44">
                          <NativeSelect
                            aria-label={`ฝ่ายของ ${u.fullName}`}
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
                        </TableCell>
                        <TableCell className="min-w-44">
                          <NativeSelect
                            aria-label={`แผนกของ ${u.fullName}`}
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
                        </TableCell>
                        <TableCell className="min-w-40">
                          <NativeSelect
                            aria-label={`บทบาทของ ${u.fullName}`}
                            placeholder="เลือกบทบาท"
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
                        <TableCell className="min-w-44">
                          <NativeSelect
                            aria-label={`หัวหน้าโดยตรงของ ${u.fullName}`}
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
                        </TableCell>
                        <TableCell className="min-w-44">
                          <NativeSelect
                            aria-label={`ผอ.โดยตรงของ ${u.fullName}`}
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
                        </TableCell>
                        {/* งบร่วม: ยังไม่มีข้อมูล / ฟังก์ชัน → แสดงขีดแทน dropdown ว่าง */}
                        <TableCell className="text-center text-[#94A3B8]" title="ยังไม่เปิดใช้">
                          —
                        </TableCell>
                        {/* สถานะ: แสดงอย่างเดียว (เดิมเป็น dropdown ที่เลือกแล้วไม่บันทึก) */}
                        <TableCell>
                          <span className={`status ${u.status === "ACTIVE" ? "status-approved" : "status-draft"}`}>
                            {u.status === "ACTIVE" ? "ใช้งาน" : "ปิดใช้งาน"}
                          </span>
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
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </TableRoot>
          </div>
        </section>

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

        {/* ===== ตำแหน่งผู้อนุมัติ ===== */}
        <section
          aria-labelledby="positions-title"
          className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl"
        >
          <h2 id="positions-title" className="text-2xl font-bold">ตำแหน่งผู้อนุมัติ</h2>
          <p className="mt-1 mb-4 text-sm text-[#64748B]">
            ตำแหน่งตามผังองค์กรหาผู้อนุมัติจากสังกัดของผู้ขอ · ตำแหน่งที่เพิ่มจากบทบาท: ผู้ใช้ที่มีบทบาทนี้คนไหนก็อนุมัติได้ (ยกเว้นผู้ขอ) · เพิ่ม / ลบแล้วบันทึกทันที
          </p>
          <ul className="mb-4 flex flex-wrap gap-2 text-sm">
            {positions.map((p) => (
              <li
                key={p.id}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${
                  p.builtIn
                    ? "border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]"
                    : "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]"
                }`}
              >
                {p.label}
                <span className="text-xs opacity-70">
                  {p.builtIn ? "· ตามผังองค์กร" : `· ${users.filter((u) => u.role === p.id).length} คน`}
                </span>
                {!p.builtIn && (
                  <button
                    type="button"
                    aria-label={`ลบตำแหน่ง ${p.label}`}
                    onClick={() => removePosition(p.id)}
                    className="rounded-full p-0.5 hover:bg-[#FFE4E6] hover:text-[#BE123C]"
                  >
                    <Close size={14} aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {/* เพิ่มตำแหน่ง: เลือกจาก role ของผู้ใช้ · ที่เป็นตำแหน่งอยู่แล้ว / เลือกไม่ได้ → ปิดไว้ พร้อมเหตุผล */}
          <div className="w-full sm:w-96">
            <NativeSelect
              aria-label="เพิ่มตำแหน่งผู้อนุมัติ"
              value=""
              onChange={(e) => addPosition(e.target.value)}
              className="text-sm"
            >
              <NativeSelectOption value="">+ เพิ่มตำแหน่งผู้อนุมัติจากบทบาทผู้ใช้</NativeSelectOption>
              {userRoles.map((role) => {
                const blocked = roleBlockedReason(role);
                return (
                  <NativeSelectOption key={role} value={role} disabled={!!blocked}>
                    {roleLabel(role)}
                    {blocked ? ` (${blocked})` : ""}
                  </NativeSelectOption>
                );
              })}
            </NativeSelect>
          </div>
          {positionMessage && (
            <p role="status" className="mt-3 text-sm text-[#475569]">
              {positionMessage}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
