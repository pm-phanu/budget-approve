// ════════════════════════════════════════════════════════════
//  ไฟล์แนบของคำขอ (ตัวไฟล์จริง) เก็บใน IndexedDB ของเบราว์เซอร์
//  ※ คำขอใน localStorage เก็บแค่ชื่อไฟล์ (SavedItem.files) · ตัวไฟล์อยู่ที่นี่
//  ※ localStorage จุได้ราว 5MB → ไฟล์ PDF/รูปไม่กี่ไฟล์ก็เต็ม จึงแยกมาเก็บที่นี่
//  key = "<เลขที่คำขอ>/<ชื่อไฟล์>" · ไม่ใช้ลำดับรายการ เพราะลบแถวในร่างแล้วลำดับเลื่อน
//  shortcut: 2 รายการในคำขอเดียวแนบไฟล์ชื่อซ้ำกัน = ใช้ไฟล์ล่าสุดร่วมกัน · ถ้าเจอจริงค่อยเติมลำดับรายการใน key
//  shortcut: เก็บในเครื่องเดียว (เหมือนข้อมูลอื่นของระบบตอนนี้) → มี backend เมื่อไหร่ย้ายไปเก็บที่ server
// ════════════════════════════════════════════════════════════

const DB_NAME = "budget-attachments";
const STORE = "files";

const keyOf = (requestId: string, name: string) => `${requestId}/${name}`;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ทำงาน 1 ครั้งกับ store แล้วรอให้ transaction เสร็จ (ปิดฐานข้อมูลเสมอ)
async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await openDb();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

// บันทึกไฟล์ของคำขอ (ทับไฟล์ชื่อเดิม) · เรียกตอนบันทึกร่าง / ส่งคำขอ
export async function saveAttachments(requestId: string, files: File[]) {
  if (files.length === 0) return;
  await withStore("readwrite", (s) => {
    for (const f of files) s.put(f, keyOf(requestId, f.name));
  });
}

// เปิดในแท็บได้เฉพาะชนิดนี้ · ชนิดอื่น (เช่น .html) ถ้าเปิดจะรันสคริปต์ใน origin ของระบบ → ดาวน์โหลดแทน
const VIEWABLE = new Set(["application/pdf", "image/png", "image/jpeg"]);

// อ่านไฟล์ 1 ไฟล์ · ไม่มี (เช่น คำขอเก่าก่อนมีระบบนี้ / เปิดจากเครื่องอื่น) = null
export async function getAttachment(requestId: string, name: string): Promise<Blob | null> {
  const blob = await withStore<Blob>("readonly", (s) => s.get(keyOf(requestId, name)) as IDBRequest<Blob>);
  return blob ?? null;
}

// เปิดไฟล์ในแท็บใหม่ · คืน false ถ้าไม่มีไฟล์ในเครื่องนี้ (ให้หน้าที่เรียกแจ้งผู้ใช้)
export async function openAttachment(requestId: string, name: string): Promise<boolean> {
  // เปิดแท็บก่อน await (เบราว์เซอร์บล็อก popup ที่เปิดหลัง await) แล้วค่อยใส่ไฟล์
  const win = window.open("", "_blank");
  const blob = await getAttachment(requestId, name).catch(() => null);
  if (!blob) {
    win?.close();
    return false;
  }
  const url = URL.createObjectURL(blob);
  if (win && VIEWABLE.has(blob.type)) win.location.href = url;
  else {
    win?.close();
    // ชนิดที่เปิดในแท็บไม่ปลอดภัย / เบราว์เซอร์บล็อกแท็บใหม่ → ดาวน์โหลดไฟล์แทน (ไม่พาหน้าระบบออกไป)
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000); // ให้แท็บใหม่โหลดเสร็จก่อนค่อยคืนหน่วยความจำ
  return true;
}
