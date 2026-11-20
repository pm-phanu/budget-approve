// ช่องค้นหาบน header (app/(main)/layout.tsx) → ส่งคำค้นไปหน้ารายการของ role
//   เปิดหน้าใหม่: คำค้นอยู่ใน ?q= → หน้ารายการอ่านตอนโหลด (readSearchParam)
//   อยู่หน้านั้นอยู่แล้ว: หน้าไม่โหลดใหม่ → header ส่ง event นี้แทน

export const HEADER_SEARCH_EVENT = "header-search";

// คำค้นจาก ?q= ของ URL ตอนนี้ (เรียกใน useEffect เท่านั้น เพราะใช้ window)
export function readSearchParam() {
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

// ฟังคำค้นจาก header ขณะอยู่หน้าเดิม · คืนฟังก์ชันเลิกฟัง (ใช้เป็น cleanup ของ useEffect)
export function onHeaderSearch(handler: (q: string) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<string>).detail ?? "");
  window.addEventListener(HEADER_SEARCH_EVENT, listener);
  return () => window.removeEventListener(HEADER_SEARCH_EVENT, listener);
}
