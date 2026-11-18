"use client";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/tailgrids/core/table";
import { getUsers, type Credential } from "@/data/credential";
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
  DEFAULT_RULES,
  ROLE_LABEL,
  RULE_APPROVER_ORDER,
  getRuleRanges,
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
  const roles = [...new Set(users.map((u) => u.role))];
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

  // อ่านกฎที่บันทึกไว้หลังเปิดหน้า (localStorage มีแค่ในเบราว์เซอร์)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- อ่านได้หลังเปิดหน้าเท่านั้น
    setRules(loadApprovalRules());
  }, []);

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

  // เปิด/ปิดผู้อนุมัติ 1 ตำแหน่งในช่วง i · เรียงตามลำดับ หัวหน้า → ผอ. → กรรมการผู้จัดการ เสมอ
  const toggleApprover = (i: number, role: StepRole) => {
    updateRules(
      rules.map((r, k) => {
        if (k !== i) return r;
        const has = r.approvers.includes(role);
        const next = has ? r.approvers.filter((a) => a !== role) : [...r.approvers, role];
        return {
          ...r,
          approvers: RULE_APPROVER_ORDER.filter((a) => next.includes(a)),
        };
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
      saveApprovalRules(rules);
      setRuleErrors([]);
      setRuleMessage("บันทึกแล้ว · คำขอใหม่จะใช้กฎนี้ทันที (คำขอที่ส่งไปแล้วใช้เส้นทางเดิม)");
    } catch {
      setRuleErrors(validateApprovalRules(rules));
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
                        defaultValue={u.role}
                      >
                        {roles.map((r) => (
                          <NativeSelectOption key={r} value={r}>
                            {r}
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
                      {range.approvers.map((role) => (
                        <Fragment key={role}>
                          <ArrowRight className="shrink-0 text-gray-400" />
                          <span className="rounded-md bg-blue-100 px-3 py-1.5 text-blue-700">
                            {ROLE_LABEL[role]}อนุมัติ
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

                    {/* เลือกผู้อนุมัติ (กดเพื่อเปิด/ปิด) */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-gray-500">ผู้อนุมัติ:</span>
                      {RULE_APPROVER_ORDER.map((role) => {
                        const on = range.approvers.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleApprover(i, role)}
                            className={`rounded-full border px-3 py-1 font-medium ${
                              on
                                ? "border-blue-300 bg-blue-50 text-blue-700"
                                : "border-dashed border-gray-300 bg-white text-gray-400 hover:text-gray-600"
                            }`}
                          >
                            {on ? "✓ " : "+ "}
                            {ROLE_LABEL[role]}
                          </button>
                        );
                      })}

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
