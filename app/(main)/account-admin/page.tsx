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

  const stepStyles = {
    default: "bg-white border border-gray-200 text-gray-800",
    approve: "bg-blue-100 text-blue-700",
    done: "bg-green-100 text-green-700",
  };

  const tiers = [
    {
      min: "0",
      max: "5,000",
      steps: [
        { label: "พนักงานทั่วไปเบิกได้เอง", type: "default" },
        { label: "ส่งตรงฝ่ายบัญชีทำจ่ายทันที", type: "done" },
      ],
    },
    {
      min: "5,001",
      max: "30,000",
      steps: [
        { label: "พนักงานทั่วไปเบิกได้", type: "default" },
        { label: "หัวหน้าแผนกอนุมัติ", type: "approve" },
        { label: "ส่งฝ่ายบัญชี", type: "done" },
      ],
    },
    {
      min: "30,001",
      max: null,
      steps: [
        { label: "เฉพาะหัวหน้างานขึ้นไป", type: "default" },
        { label: "อนุมัติ 1 ขั้นไล่ตามลำดับขั้น", type: "approve" },
        { label: "ส่งฝ่ายบัญชี", type: "done" },
      ],
      note: "กรณีหัวหน้าสายงานสูงสุดเบิก สามารถส่งตรงฝ่ายบัญชีได้ทันที",
    },
  ] as const;

  // ตัวเลือกใน dropdown = ขั้นตอนทั้งหมดที่มีใน tiers (ไม่ซ้ำ)
  const stepOptions = [
    ...new Set(tiers.flatMap((t) => t.steps.map((s) => s.label))),
  ];

  return (
    <div>
      <div className="bg-white p-6 rounded-xl border border-[#CBD5E1]">
        <div>
          <h1 className="text-[#111] text-2xl font-bold mb-6 flex gap-2 items-center">
            <>
              <UserMultiple4 />
            </>
            จัดการผู้ใช้ และ สิทธิ์
          </h1>
        </div>

        <div className="w-full">
          <TableRoot className="bg-white shadow-2xl">
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

      <div className="bg-white p-6 my-6 border border-[#CBD5E1] rounded-xl">
        <div>
          <div className="mb-6">
            <header className="text-2xl text-[#111] font-bold">
              <h1>ตั้งค่าวงเงิน และ สายการอนุมัติ</h1>
            </header>
          </div>

          <div className="flex flex-col gap-3">
            {tiers.map((tier) => (
              <div
                key={tier.min}
                className="flex items-center gap-6 rounded-lg bg-gray-50 p-4"
              >
                {/* ฝั่งซ้าย: ช่องกรอกยอด */}
                <div className="flex w-1/2 items-center gap-3">
                  <TextField orientation="horizontal">
                    <FieldLabel>ยอด</FieldLabel>
                    <Input
                      placeholder={tier.min}
                      inputMode="numeric"
                      className="w-32 text-right"
                    />
                  </TextField>

                  {tier.max === null ? (
                    <span>บาทขึ้นไป</span>
                  ) : (
                    <>
                      <span>–</span>
                      <TextField aria-label="ยอดสูงสุด">
                        <Input
                          placeholder={tier.max}
                          inputMode="numeric"
                          className="w-32 text-right"
                        />
                      </TextField>
                      <span>บาท</span>
                    </>
                  )}
                </div>

                {/* ฝั่งขวา: ขั้นตอนอนุมัติ */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    {tier.steps.map((step, i) => (
                      <Fragment key={step.label}>
                        {i > 0 && (
                          <ArrowRight className="shrink-0 text-gray-400" />
                        )}
                        <NativeSelect
                          aria-label={`ขั้นตอนที่ ${i + 1}`}
                          placeholder="กรุณาเลือกสายการอนุมัติ"
                          defaultValue={step.label}
                          className={`text-sm ${stepStyles[step.type]}`}
                        >
                          {stepOptions.map((option) => (
                            <NativeSelectOption key={option} value={option}>
                              {option}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      </Fragment>
                    ))}
                  </div>
                  {"note" in tier && (
                    <p className="text-xs text-gray-500">{tier.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
