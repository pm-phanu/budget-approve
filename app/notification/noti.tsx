"use client";

import { Bell1, CheckCircle1, ChevronDown, ClockThree, Shield1Check } from "@tailgrids/icons";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CURRENT_USER_KEY, subscribeToAuthSession } from "@/utils/auth-session";

// ===== [1] โครงสร้างข้อมูลและไอคอน =====
export type NotiItem = {
  id: string;
  userEmail: string;
  kind: "submitted" | "draft" | "auth";
  title: string;
  message: string;
  details?: string[];
  time: string;
  read: boolean;
};

const KEY = "notifications";
const EVENT = "noti-change";
const EMPTY: NotiItem[] = [];
const ICON = {
  submitted: { bg: "bg-[#D1FAE5] text-[#047857]", Icon: CheckCircle1 },
  draft: { bg: "bg-[#FEF3C7] text-[#B45309]", Icon: ClockThree },
  auth: { bg: "bg-[#E0E7FF] text-[#3730A3]", Icon: Shield1Check },
} as const;

let cache = { raw: null as string | null, user: null as string | null, list: EMPTY };

// ===== [2] อ่านและบันทึกข้อมูลใน localStorage =====
function getEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null")?.email ?? "";
  } catch {
    return "";
  }
}

function readRaw(): NotiItem[] {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(data) ? data : EMPTY;
  } catch {
    return EMPTY;
  }
}

function saveAll(list: NotiItem[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
  window.dispatchEvent(new Event(EVENT));
}

function getList(): NotiItem[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = localStorage.getItem(KEY);
  const user = localStorage.getItem(CURRENT_USER_KEY);
  if (raw === cache.raw && user === cache.user) return cache.list;

  const email = getEmail();
  cache = {
    raw,
    user,
    list: email ? readRaw().filter((n) => n && typeof n.id === "string" && (n.userEmail === email || !n.userEmail)) : EMPTY,
  };
  return cache.list;
}

function subscribe(cb: () => void) {
  const unsub = subscribeToAuthSession(cb);
  window.addEventListener(EVENT, cb);
  return () => {
    unsub();
    window.removeEventListener(EVENT, cb);
  };
}

// ฟังก์ชันให้หน้าอื่นเรียกใช้เมื่อมีเหตุการณ์ใหม่ (ส่งคำขอ / ร่าง / ล็อกอิน)
export function addNotification(input: Omit<NotiItem, "id" | "userEmail" | "time" | "read"> & { userEmail?: string }) {
  if (typeof window === "undefined") return;
  const item: NotiItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userEmail: input.userEmail ?? getEmail(),
    kind: input.kind,
    title: input.title,
    message: input.message,
    details: input.details,
    time: new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }),
    read: false,
  };
  saveAll([item, ...readRaw()]);
}

// ===== [3] ปุ่มกระดิ่ง + หน้าต่างเล็กตรงปุ่ม =====
export function NotificationBell() {
  const list = useSyncExternalStore(subscribe, getList, () => EMPTY);
  const unread = list.filter((n) => !n.read).length;
  const [open, setOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function toggleItem(item: NotiItem) {
    setOpenId((prev) => (prev === item.id ? null : item.id));
    if (!item.read) saveAll(readRaw().map((n) => (n.id === item.id ? { ...n, read: true } : n)));
  }

  function clearAll() {
    const email = getEmail();
    saveAll(readRaw().filter((n) => n.userEmail !== email && Boolean(n.userEmail)));
    setOpenId(null);
  }

  return (
    <div className="relative" ref={boxRef}>
      {/* ปุ่มกระดิ่ง: วงแดงเริ่มที่ 0 และเพิ่มขึ้นเมื่อมีข้อความเข้า */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-gray-50"
      >
        <Bell1 size={20} />
        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      </button>

      {/* หน้าต่างเล็กใต้ปุ่ม: ขนาดพอดี และยืดลงตามรายการที่เพิ่ม */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-bold text-[#0F172A]">การแจ้งเตือน ({list.length})</span>
            {list.length > 0 && (
              <button type="button" onClick={clearAll} className="cursor-pointer text-xs text-red-500 hover:underline">
                ล้างทั้งหมด
              </button>
            )}
          </div>

          {list.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-[#94A3B8]">ยังไม่มีการแจ้งเตือน</p>
          ) : (
            <div className="max-h-[75vh] divide-y divide-gray-100 overflow-y-auto">
              {list.map((item) => {
                const { bg, Icon } = ICON[item.kind] ?? ICON.auth;
                const expanded = openId === item.id;
                return (
                  <div key={item.id} className={item.read ? "bg-white" : "bg-[#ECFDF5]/40"}>
                    <button
                      type="button"
                      onClick={() => toggleItem(item)}
                      className="flex w-full cursor-pointer items-start gap-2.5 px-4 py-3 text-left hover:bg-[#F8FAFC]"
                    >
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bg}`}>
                        <Icon size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-xs ${item.read ? "font-medium text-[#334155]" : "font-bold text-[#0F172A]"}`}>
                            {item.title}
                          </p>
                          {!!item.details?.length && (
                            <ChevronDown size={14} className={`shrink-0 text-[#94A3B8] transition ${expanded ? "rotate-180" : ""}`} />
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#64748B]">{item.message}</p>
                        {item.time && <p className="mt-1 text-[10px] text-[#94A3B8]">{item.time}</p>}
                      </div>
                    </button>

                    {expanded && item.details && item.details.length > 0 && (
                      <div className="space-y-1 border-t border-dashed border-gray-200 bg-[#F8FAFC] px-4 py-2.5 text-[11px] text-[#334155]">
                        {item.details.map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
