"use client";

// ปุ่มเปิดไฟล์แนบของคำขอ (ตัวไฟล์อยู่ใน IndexedDB · utils/attachments.ts)
// ใช้ในหน้าอนุมัติ (components/approve-review.tsx) และหน้าทำจ่ายของการเงิน
// ไม่พบไฟล์ในเครื่องนี้ (คำขอเก่าก่อนมีระบบเก็บไฟล์ / แนบจากเครื่องอื่น) → ขึ้นข้อความแทนการเงียบ

import { useState } from "react";
import { Eye } from "@tailgrids/icons";
import { openAttachment } from "@/utils/attachments";

export default function AttachmentButton({ requestId, name }: { requestId: string; name: string }) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <span role="status" className="px-1 text-[11px] font-semibold text-[#B45309]">
        ไม่พบไฟล์ในเครื่องนี้
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={`ดูเอกสาร ${name}`}
      title="เปิดดูไฟล์ในแท็บใหม่"
      onClick={async () => {
        if (!(await openAttachment(requestId, name))) setMissing(true);
      }}
      className="rounded p-1 text-[#64748B] hover:text-[#047857]"
    >
      <Eye size={16} aria-hidden="true" />
    </button>
  );
}
