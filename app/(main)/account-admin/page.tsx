'use client'

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow
} from "@/components/tailgrids/core/table";

export default function Account() {
    return(
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
                    <TableRow>
                        
                    </TableRow>
                </TableBody>
            </TableRoot>
        </div>
    )
}