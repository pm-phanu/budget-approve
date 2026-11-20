// รูปแบบแสดงผลที่ใช้ร่วมกันทุกหน้า

export const baht = (n: number) => "฿" + Number(n || 0).toLocaleString("en-US");

// "เมื่อ 5 นาทีที่แล้ว" · ไม่มีเวลา = ""
export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "";
  const mins = Math.floor(Math.max(0, Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `เมื่อ ${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `เมื่อ ${hours} ชั่วโมงที่แล้ว`;
  return `เมื่อ ${Math.floor(hours / 24)} วันที่แล้ว`;
}
