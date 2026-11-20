"use client";

// รายละเอียดคำขอของฉัน (/my-request/detail?id=REQ-xxx)
// ใช้หน้ารายละเอียดเดียวกับหน้าอนุมัติ (components/approve-review.tsx) ไม่ต้องคัดลอกโค้ดซ้ำ
//   ผู้ขอดูของตัวเอง → ไม่มีปุ่มอนุมัติ (canApproveStep ห้ามอนุมัติคำขอตัวเอง)
//   ป้ายสถานะ = "รอ<ชื่อขั้น>" ไม่ใช่ "รอคุณอนุมัติ"
//   ไม่พบคำขอ → ลิงก์กลับไปหน้าคำขอของฉัน
import ApproveReview from "@/components/approve-review";

export default function MyRequestDetail() {
  return <ApproveReview homePath="/my-request" />;
}
