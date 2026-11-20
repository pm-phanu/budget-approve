"use client";

// หน้าตรวจ / อนุมัติคำขอ → ใช้ components/approve-review.tsx ร่วมกันทุก role
// homePath = กลับหน้าแดชบอร์ดของ role นี้หลังกดอนุมัติ / ตีกลับ
import ApproveReview from "@/components/approve-review";

export default function ApprovePage() {
  return <ApproveReview homePath="/home-account" />;
}
