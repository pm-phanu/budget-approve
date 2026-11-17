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
import { Minus, UserMultiple4 } from "@tailgrids/icons";
import { useEffect, useState } from "react";

import { FieldLabel } from "@/components/tailgrids/core/field";
import { Input } from "@/components/tailgrids/core/input";
import { TextField } from "@/components/tailgrids/core/text-field";

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

  return (
    <div>
      <div>
        <div>
          <h1 className="text-[#111] text-2xl font-bold my-6 flex gap-2 items-center">
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
                <TableHead>ชื่อ-นามสกุล / ติดต่อ</TableHead>
                <TableHead>สังกัด</TableHead>
                <TableHead>บทบาท</TableHead>
                <TableHead>สายการอนุมัติ</TableHead>
                <TableHead>งบร่วม</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead>จัดการ</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {error ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    {error}
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    ยังไม่มีข้อมูล
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.fullName}</TableCell>
                    <TableCell>{u.departmentInfo.department}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>{u.status}</TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </TableRoot>
        </div>
      </div>

      <div>
        <div>
          <h1>ตั้งค่าวงเงิน</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* ช่องที่ 1: ยอดต่ำสุด */}
          <TextField orientation="horizontal">
            <FieldLabel>ยอด</FieldLabel>
            <Input
              placeholder="ยอดต่ำสุด"
              inputMode="numeric"
            />
          </TextField>

          <span>
            <Minus />
          </span>

          {/* ช่องที่ 2: ยอดสูงสุด */}
          <TextField orientation="horizontal">
            <Input
              placeholder="ยอดสูงสุด"
              inputMode="numeric"
            />
          </TextField>

          <span>บาท</span>
        </div>
      </div>
    </div>
  );
}
