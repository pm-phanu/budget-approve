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
import {
  ArrowRight,
  Minus,
  UserMultiple4,
} from "@tailgrids/icons";
import { Fragment, useEffect, useState } from "react";

import { FieldLabel } from "@/components/tailgrids/core/field";
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

  useEffect(() => {
    try {
      setUsers(getUsers().map(({ password, ...rest }) => rest));
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    }
  }, []);

  // ตัวเลือกทั้งหมดดึงจาก users ที่โหลดมาจาก localStorage
  const departments = [
    ...new Set(
      users.map((u) => u.departmentInfo?.department).filter(Boolean),
    ),
  ];
  // บทบาทที่เลือกได้ = role ในตัว + ตำแหน่งผู้อนุมัติที่เพิ่มเอง (data/approval.ts)
  const BUILT_IN_ROLES = ["EMPLOYEE", "HEAD", "DIRECTOR", "MANAGING_DIRECTOR", "ACCOUNTANT_ADMIN", "FINANCE"];
  const roleLabel = (r: string) => (r === "EMPLOYEE" ? "พนักงาน" : getRoleLabel(r, positions));
  const statuses = [...new Set(users.map((u) => u.status))];
  const approverIds = new Set(
    users.flatMap((u) => [u.hierarchy?.headId, u.hierarchy?.directorId]),
  );
  const approvers = users.filter((u) => approverIds.has(u.id));

  // ════════════════════════════════════════
  //  Approval Matrix: อ่าน / แก้ / บันทึกกฎ (data/approval.ts)
  // ════════════════════════════════════════
  const [rules, setRules] = useState<ApprovalRule[]>(DEFAULT_RULES);
  const [ruleErrors, setRuleErrors] = useState<string[]>([]);
  const [ruleMessage, setRuleMessage] = useState("");
  const [positions, setPositions] = useState<ApproverPosition[]>(DEFAULT_POSITIONS);
  const [positionMessage, setPositionMessage] = useState("");

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
    setRuleErrors([]);
    setRuleMessage("คืนค่าเริ่มต้นตาม requirement แล้ว");
  };

  return (
    <div>
      <header className="text-[#111] flex items-center justify-between mb-9">
        <h1 className="text-[32px] font-bold">จัดการผู้ใช้และสิทธิ์</h1>
      </header>

      {/* แต่ละส่วนห่างกัน 36px เหมือนหน้า employee */}
      <div className="flex flex-col gap-9">
      <div className="bg-white p-6 rounded-xl border border-[#E2E8F0] shadow-2xl">
        <div>
          <h2 className="text-[#111] text-2xl font-bold mb-6 flex gap-2 items-center">
            <>
              <UserMultiple4 />
            </>
            จัดการผู้ใช้ และ สิทธิ์
          </h2>
        </div>

        <div className="w-full">
          <TableRoot className="bg-white">
            <TableHeader className="bg-[#059669] font-bold text-white">
              <TableRow>
                <TableHead>รหัสพนักงาน</TableHead>
                <TableHead>ชื่อ-นามสกุล</TableHead>
                <TableHead>สังกัด</TableHead>
                <TableHead>บทบาท</TableHead>
                <TableHead>สายการอนุมัติ</TableHead>
                <TableHead>งบร่วม</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {error ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    {error}
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    ยังไม่มีข้อมูล
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.fullName}</TableCell>
                    <TableCell>
                      {u.departmentInfo?.department ? (
                        <NativeSelect
                          aria-label="สังกัด"
                          placeholder="เลือกสังกัด"
                          defaultValue={u.departmentInfo.department}
                        >
                          {departments.map((d) => (
                            <NativeSelectOption key={d} value={d}>
                              {d}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <NativeSelect
                        aria-label="บทบาท"
                        placeholder="เลือกบทบาท"
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                      >
                        {roles.map((r) => (
                          <NativeSelectOption key={r} value={r}>
                            {roleLabel(r)}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </TableCell>
                    <TableCell>
                      <NativeSelect
                        aria-label="สายการอนุมัติ"
                        placeholder="เลือกผู้อนุมัติ"
                        defaultValue={u.hierarchy?.headId ?? undefined}
                      >
                        {approvers.map((a) => (
                          <NativeSelectOption key={a.id} value={a.id}>
                            {a.fullName}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </TableCell>
                    <TableCell>
                      <NativeSelect aria-label="งบร่วม" placeholder="-" />
                    </TableCell>
                    <TableCell>
                      <NativeSelect
                        aria-label="สถานะ"
                        defaultValue={u.status}
                      >
                        {statuses.map((s) => (
                          <NativeSelectOption key={s} value={s}>
                            {s}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </TableRoot>
        </div>
      </div>

      <div className="bg-white p-6 border border-[#E2E8F0] rounded-xl shadow-2xl">
        <div>
          <div className="mb-6">
            <header className="text-2xl text-[#111] font-bold">
              <h2>ตั้งค่าวงเงิน และ สายการอนุมัติ</h2>
            </header>
          </div>

          <p className="-mt-4 mb-4 text-sm text-gray-500">
            คำขอที่ยอดอยู่ในช่วงไหนจะผ่านผู้อนุมัติของช่วงนั้น แล้วต่อด้วยฝ่ายบัญชี → การเงินเสมอ
          </p>

          <div className="flex flex-col gap-3">
            {ranges.map((range, i) => {
              const isLast = i === ranges.length - 1;
              return (
                <div
                  key={i}
                  className="flex items-center gap-6 rounded-lg bg-gray-50 p-4"
                >
                  {/* ฝั่งซ้าย: ช่วงยอด · ต่ำสุดคำนวณให้ · กรอกได้แค่เพดาน */}
                  <div className="flex w-1/2 items-center gap-3">
                    <TextField orientation="horizontal" readOnly>
                      <FieldLabel>ยอด</FieldLabel>
                      <Input
                        value={money(range.min)}
                        readOnly
                        aria-label={`ยอดต่ำสุดช่วงที่ ${i + 1}`}
                        className="w-32 bg-gray-100 text-right text-gray-500"
                      />
                    </TextField>

                    {isLast ? (
                      <span>บาทขึ้นไป</span>
                    ) : (
                      <>
                        <span>–</span>
                        <TextField
                          aria-label={`ยอดสูงสุดช่วงที่ ${i + 1}`}
                          value={range.max === null ? "" : String(range.max)}
                          onChange={(v) => setMax(i, v)}
                        >
                          <Input inputMode="numeric" className="w-32 text-right" />
                        </TextField>
                        <span>บาท</span>
                      </>
                    )}
                  </div>

                  {/* ฝั่งขวา: เส้นทางอนุมัติ + ปุ่มเลือกผู้อนุมัติ */}
                  <div className="flex flex-1 flex-col gap-2">
                    {/* เส้นทางที่ได้ */}
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-gray-800">
                        ผู้ขอ
                      </span>
                      {range.approvers.map((role, idx) => (
                        <Fragment key={role}>
                          <ArrowRight className="shrink-0 text-gray-400" />
                          <span className="flex items-center gap-1 rounded-md bg-blue-100 py-1.5 pl-2 pr-1.5 text-blue-700">
                            {/* เลื่อนก่อน / หลัง · เอาออก */}
                            <button
                              type="button"
                              aria-label={`เลื่อน ${getRoleLabel(role, positions)} ไปก่อน`}
                              disabled={idx === 0}
                              onClick={() => moveApprover(i, idx, -1)}
                              className="px-0.5 disabled:opacity-25"
                            >
                              ‹
                            </button>
                            {getRoleLabel(role, positions)}อนุมัติ
                            <button
                              type="button"
                              aria-label={`เลื่อน ${getRoleLabel(role, positions)} ไปหลัง`}
                              disabled={idx === range.approvers.length - 1}
                              onClick={() => moveApprover(i, idx, 1)}
                              className="px-0.5 disabled:opacity-25"
                            >
                              ›
                            </button>
                            <button
                              type="button"
                              aria-label={`เอา ${getRoleLabel(role, positions)} ออก`}
                              onClick={() => toggleApprover(i, role)}
                              className="ml-0.5 rounded px-1 text-blue-400 hover:bg-blue-200 hover:text-blue-800"
                            >
                              ✕
                            </button>
                          </span>
                        </Fragment>
                      ))}
                      <ArrowRight className="shrink-0 text-gray-400" />
                      <span className="rounded-md bg-green-100 px-3 py-1.5 text-green-700">
                        {range.approvers.length === 0 ? "ส่งตรงฝ่ายบัญชี" : "ฝ่ายบัญชี"}
                      </span>
                      <ArrowRight className="shrink-0 text-gray-400" />
                      <span className="rounded-md bg-green-100 px-3 py-1.5 text-green-700">
                        การเงินทำจ่าย
                      </span>
                    </div>

                    {/* เพิ่มผู้อนุมัติ: dropdown ตำแหน่งจาก localStorage (loadPositions)
                        ตำแหน่งที่อยู่ในเส้นทางของช่วงนี้แล้ว → เลือกไม่ได้ · เลือกแล้วต่อท้ายเส้นทาง */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-gray-500">เพิ่มผู้อนุมัติ:</span>
                      <div className="w-56">
                        <NativeSelect
                          aria-label={`เพิ่มผู้อนุมัติช่วงที่ ${i + 1}`}
                          value=""
                          disabled={positions.every((p) => range.approvers.includes(p.id))}
                          onChange={(e) => {
                            if (e.target.value) toggleApprover(i, e.target.value);
                          }}
                          className="py-1.5 text-xs"
                        >
                          <NativeSelectOption value="">
                            {positions.every((p) => range.approvers.includes(p.id))
                              ? "ใส่ครบทุกตำแหน่งแล้ว"
                              : "+ เลือกตำแหน่ง"}
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
                          className="ml-auto text-red-500 hover:underline"
                        >
                          ลบช่วงนี้
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-gray-500">
            ผู้ขอเป็นหัวหน้า / ผอ. เอง หรือตำแหน่งนั้นว่าง ระบบจะส่งให้ตำแหน่งที่สูงกว่าอนุมัติแทนอัตโนมัติ
          </p>

          {/* ตำแหน่งผู้อนุมัติ: ในตัว (หาจากผังองค์กร) + เพิ่มเอง (ใครก็ได้ที่มีบทบาทนี้) */}
          <div className="mt-6 rounded-lg border border-gray-200 p-4">
            <h3 className="mb-1 text-sm font-bold text-gray-800">ตำแหน่งผู้อนุมัติ</h3>
            <p className="mb-3 text-xs text-gray-500">
              ตำแหน่งที่เพิ่มจากบทบาทผู้ใช้: ผู้ใช้ที่มีบทบาทนี้คนไหนก็อนุมัติได้ (ยกเว้นผู้ขอ)
            </p>
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              {positions.map((p) => (
                <span
                  key={p.id}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${
                    p.builtIn ? "border-gray-200 bg-gray-50 text-gray-600" : "border-blue-200 bg-blue-50 text-blue-700"
                  }`}
                >
                  {p.label}
                  <span className="text-[10px] opacity-70">
                    {p.builtIn ? "· ตามผังองค์กร" : `· ${users.filter((u) => u.role === p.id).length} คน`}
                  </span>
                  {!p.builtIn && (
                    <button
                      type="button"
                      aria-label={`ลบตำแหน่ง ${p.label}`}
                      onClick={() => removePosition(p.id)}
                      className="text-blue-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  )}
                </span>
              ))}
            </div>
            {/* เพิ่มตำแหน่ง: เลือกจาก role ของผู้ใช้ใน localStorage · ที่เป็นตำแหน่งอยู่แล้ว / เลือกไม่ได้ → ปิดไว้ */}
            <div className="w-80">
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
            {positionMessage && <p className="mt-2 text-xs text-gray-600">{positionMessage}</p>}
          </div>

          <button
            type="button"
            onClick={addRange}
            className="mt-4 w-full rounded-xl border border-dashed border-[#059669] py-2.5 text-sm font-semibold text-[#047857] hover:bg-[#ECFDF5]"
          >
            + เพิ่มช่วงวงเงิน
          </button>

          {/* ข้อความผิดพลาด / สำเร็จ */}
          {ruleErrors.length > 0 && (
            <ul className="mt-4 list-disc rounded-xl bg-red-50 py-2 pl-8 pr-3 text-sm text-red-700">
              {ruleErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          {ruleMessage && (
            <p className="mt-4 rounded-xl bg-[#ECFDF5] p-3 text-sm text-[#047857]">
              {ruleMessage}
            </p>
          )}

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleResetRules}
              className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200"
            >
              คืนค่าเริ่มต้น
            </button>
            <button
              type="button"
              onClick={handleSaveRules}
              className="rounded-xl bg-[#059669] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#047857]"
            >
              บันทึก
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
