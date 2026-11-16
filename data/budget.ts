// ════════════════════════════════════════════════════════════
//  ข้อมูลงบประมาณ: โครงการ → หมวดค่าใช้จ่าย → วงเงิน
//  ใช้ร่วมกัน: หน้าสร้างคำขอ, หน้ารายงาน (และหน้างบประมาณประจำปี)
// ════════════════════════════════════════════════════════════

import type { SavedRequest } from "./request";

export type Category = {
  id: string;
  name: string;
  limit: number;
  used: number;
};
export type Project = {
  id: string;
  name: string;
  dept: string;
  categories: Category[];
};

// ข้อมูลสมมติ (ยังไม่มี backend) · คงเหลือของหมวด = limit − used
export const projects: Project[] = [
  {
    id: "P01",
    name: "สัมมนาการตลาดประจำปี",
    dept: "การตลาด",
    categories: [
      { id: "C01", name: "ค่าเดินทาง", limit: 60000, used: 18000 },
      { id: "C02", name: "ค่าที่พัก", limit: 40000, used: 18000 },
      { id: "C03", name: "ค่าอาหาร", limit: 20000, used: 4500 },
    ],
  },
  {
    id: "P02",
    name: "เปิดตัวสินค้าใหม่",
    dept: "การตลาด",
    categories: [
      { id: "C04", name: "ค่าเช่าสถานที่", limit: 150000, used: 60000 },
      { id: "C05", name: "ค่าออกแบบสื่อ", limit: 50000, used: 35000 },
      { id: "C06", name: "ค่าของที่ระลึก", limit: 30000, used: 2400 },
    ],
  },
  {
    id: "P03",
    name: "ปรับปรุงระบบไอที",
    dept: "ไอที",
    categories: [
      { id: "C07", name: "ค่าอุปกรณ์คอมพิวเตอร์", limit: 800000, used: 120000 },
      { id: "C08", name: "ค่าบริการคลาวด์", limit: 200000, used: 64000 },
    ],
  },
];

// งบรวมของ 1 โครงการ / ทุกโครงการ
export function projectLimit(p: Project) {
  return p.categories.reduce((sum, c) => sum + c.limit, 0);
}
export function projectUsed(p: Project) {
  return p.categories.reduce((sum, c) => sum + c.used, 0);
}

// เอาคำขอที่ส่งแล้วมาบวกเพิ่มในยอด "ใช้ไป" ของแต่ละหมวด
// ※ ไม่นับร่าง กับที่ถูกตีกลับ (เงินยังไม่ได้ถูกจองไว้)
export function addRequestsToBudget(saved: SavedRequest[]): Project[] {
  const counted = saved.filter(
    (r) => r.status !== "ร่าง" && r.status !== "ตีกลับ",
  );

  return projects.map((p) => ({
    ...p,
    categories: p.categories.map((c) => {
      let extra = 0;
      for (const r of counted) {
        for (const it of r.items) {
          if (it.categoryId === c.id) extra += it.amount;
        }
      }
      return { ...c, used: c.used + extra };
    }),
  }));
}
