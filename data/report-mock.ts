// ════════════════════════════════════════════════════════════
//  ข้อมูลสมมติของหน้ารายงาน (ยังไม่มี backend)
//  ใช้ที่ app/(main)/home-account/report/page.tsx
//  1 บรรทัด = คำขอที่จ่ายแล้ว 1 ใบ
// ════════════════════════════════════════════════════════════

// คำขอเบิก 1 ใบ ในรายงาน ต้องมีอะไรบ้าง
export type Request = {
  doc: string; // เลขที่เอกสาร
  daysAgo: number; // เบิกเมื่อกี่วันก่อน
  date: string; // วันที่ (ไว้โชว์)
  dept: string; // ฝ่าย
  title: string; // รายการ
  requester: string; // ผู้ขอ
  amount: number; // จำนวนเงิน
  approveDays: number; // ใช้เวลาอนุมัติกี่วัน
};

export const requests: Request[] = [
  { doc: "EX-0021", daysAgo: 1, date: "06 พ.ย.", dept: "ไอที", title: "ค่าบริการคลาวด์", requester: "คุณวิชัย", amount: 6800, approveDays: 1 },
  { doc: "EX-0012", daysAgo: 2, date: "05 พ.ย.", dept: "การตลาด", title: "ค่าเดินทางสัมมนา", requester: "คุณสมชาย", amount: 12500, approveDays: 1 },
  { doc: "EX-0020", daysAgo: 3, date: "04 พ.ย.", dept: "อื่นๆ", title: "ค่าส่งเอกสารด่วน", requester: "คุณปรีชา", amount: 950, approveDays: 1 },
  { doc: "EX-0011", daysAgo: 5, date: "02 พ.ย.", dept: "ขาย", title: "ค่ารับรองลูกค้า", requester: "คุณมานี", amount: 8200, approveDays: 2 },
  { doc: "EX-0019", daysAgo: 6, date: "01 พ.ย.", dept: "การตลาด", title: "ค่าพิมพ์แผ่นพับ", requester: "คุณสุดา", amount: 4300, approveDays: 2 },
  { doc: "EX-0018", daysAgo: 9, date: "29 ต.ค.", dept: "ขาย", title: "ค่าตัวอย่างสินค้าให้ลูกค้า", requester: "คุณมานี", amount: 3900, approveDays: 1 },
  { doc: "EX-0010", daysAgo: 12, date: "26 ต.ค.", dept: "ไอที", title: "ค่าซื้อเมาส์และคีย์บอร์ด", requester: "คุณวิชัย", amount: 4600, approveDays: 1 },
  { doc: "EX-0017", daysAgo: 14, date: "24 ต.ค.", dept: "อื่นๆ", title: "ค่าซ่อมเครื่องถ่ายเอกสาร", requester: "คุณปรีชา", amount: 2800, approveDays: 2 },
  { doc: "EX-0016", daysAgo: 16, date: "22 ต.ค.", dept: "ไอที", title: "ค่าอุปกรณ์เครือข่าย", requester: "คุณวิชัย", amount: 3500, approveDays: 1 },
  { doc: "EX-0009", daysAgo: 20, date: "18 ต.ค.", dept: "การตลาด", title: "ค่าที่พักสัมมนา", requester: "คุณสุดา", amount: 9800, approveDays: 2 },
  { doc: "EX-0015", daysAgo: 22, date: "16 ต.ค.", dept: "ขาย", title: "ค่าเดินทางพบลูกค้า", requester: "คุณสมศักดิ์", amount: 6100, approveDays: 2 },
  { doc: "EX-0014", daysAgo: 25, date: "13 ต.ค.", dept: "การตลาด", title: "ค่าโฆษณาเฟซบุ๊ก", requester: "คุณสมชาย", amount: 8000, approveDays: 1 },
  { doc: "EX-0013", daysAgo: 27, date: "11 ต.ค.", dept: "ไอที", title: "ค่าหมึกพิมพ์", requester: "คุณวิชัย", amount: 1900, approveDays: 1 },
  { doc: "EX-0008", daysAgo: 28, date: "10 ต.ค.", dept: "อื่นๆ", title: "ค่าอาหารประชุม", requester: "คุณปรีชา", amount: 3200, approveDays: 1 },
  { doc: "EX-0007", daysAgo: 45, date: "23 ก.ย.", dept: "ขาย", title: "ค่าน้ำมันเยี่ยมลูกค้า", requester: "คุณมานี", amount: 5400, approveDays: 2 },
  { doc: "EX-0006", daysAgo: 60, date: "08 ก.ย.", dept: "การตลาด", title: "ค่าออกแบบโปสเตอร์", requester: "คุณสมชาย", amount: 15000, approveDays: 3 },
  { doc: "EX-0005", daysAgo: 80, date: "19 ส.ค.", dept: "ไอที", title: "ค่าต่ออายุโปรแกรม", requester: "คุณวิชัย", amount: 18900, approveDays: 1 },
  { doc: "EX-0004", daysAgo: 120, date: "10 ก.ค.", dept: "การตลาด", title: "ค่าเช่าบูธงานแสดงสินค้า", requester: "คุณสุดา", amount: 42000, approveDays: 2 },
  { doc: "EX-0003", daysAgo: 145, date: "15 มิ.ย.", dept: "ขาย", title: "ค่าเดินทางต่างจังหวัด", requester: "คุณมานี", amount: 7600, approveDays: 1 },
  { doc: "EX-0002", daysAgo: 220, date: "01 เม.ย.", dept: "อื่นๆ", title: "ค่าอุปกรณ์สำนักงาน", requester: "คุณปรีชา", amount: 6300, approveDays: 2 },
  { doc: "EX-0001", daysAgo: 300, date: "12 ม.ค.", dept: "การตลาด", title: "ค่าโฆษณาออนไลน์", requester: "คุณสมชาย", amount: 30000, approveDays: 1 },
];
