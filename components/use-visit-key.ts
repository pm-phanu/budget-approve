"use client";

import { useEffect, useState } from "react";

// Next.js 16 (Activity) เก็บหน้าที่ซ่อนไว้พร้อม state เดิม → กลับมาเปิดอีกครั้ง ป็อปอัพ/ฟอร์มรอบก่อนยังค้าง
// ใช้เป็น key ของเนื้อหาหน้า: เปลี่ยนทุกครั้งที่หน้าถูกแสดง (effect รันใหม่ตอนหน้าโผล่) → React สร้างใหม่ state สะอาด
export function useVisitKey(id: string | null) {
  const [visit, setVisit] = useState(0);
  /* eslint-disable-next-line react-hooks/set-state-in-effect -- ต้องรู้ว่าหน้าเพิ่งถูกแสดงอีกรอบ */
  useEffect(() => setVisit((v) => v + 1), []);
  return `${id ?? ""}#${visit}`;
}
