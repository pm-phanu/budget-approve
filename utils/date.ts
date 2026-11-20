// แบ่งรอบ วัน / เดือน / ปี ตามเวลาไทย (Asia/Bangkok, UTC+7) ไม่ขึ้นกับ Time Zone ของเครื่อง
// ข้อมูลเก็บเป็น UTC (ISO) เหมือนเดิม · ใช้ฟังก์ชันนี้ตอน "นับว่าอยู่วัน/เดือน/ปีไหน" เท่านั้น
// เช่น จ่าย 1 พ.ย. 00:30 เวลาไทย = 31 ต.ค. 17:30 UTC → ต้องนับเป็นเดือน พ.ย.
const TZ = "Asia/Bangkok";

type When = string | number | Date;

// "2026-11-20" (en-CA ให้รูปแบบ ปี-เดือน-วัน เสมอ) · วันที่ไม่ถูกต้อง/ว่าง → "" (ไม่ throw)
export function bkkDay(when: When = Date.now()) {
  const d = new Date(when);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-CA", { timeZone: TZ });
}

// จำนวนวันตามปฏิทินไทย ตั้งแต่ when ถึงวันนี้ (วันนี้ = 0)
export function bkkDaysAgo(when: When) {
  return Math.round((Date.parse(bkkDay()) - Date.parse(bkkDay(when))) / 86400000);
}

// "2026-11"
export const bkkMonth = (when?: When) => bkkDay(when).slice(0, 7);

// 2026
export const bkkYear = (when?: When) => Number(bkkDay(when).slice(0, 4));

// เลื่อนเดือน: ("2026-01", -1) → "2025-12"
export function shiftMonth(key: string, n: number) {
  const [y, m] = key.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

// ชื่อเดือนย่อภาษาไทยของ key: "2026-11" → "พ.ย."
export function monthLabel(key: string) {
  return new Date(`${key}-15T00:00:00Z`).toLocaleDateString("th-TH", { month: "short", timeZone: TZ });
}

// วันที่แบบไทย เช่น "21 พ.ย. 2569" · withTime → "21 พ.ย. 2569 14:05" · ไม่มี/ผิดรูปแบบ = "-"
export function thaiDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}
