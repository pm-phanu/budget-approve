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
import { useEffect, useState } from "react";

const [users, setUsers] = useState<Credential[]>([]);

useEffect(() => {
  setUsers(getUsers().map(({ password, ...rest }) => rest));
}, []);

export default function Account() {
  return (
    <div className="w-full">
      <TableRoot>
        <TableHeader>
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
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8}>ยังไม่มีข้อมูล</TableCell>
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
  );
}
