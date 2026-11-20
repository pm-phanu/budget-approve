"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  Bell1,
  Check,
  CheckCircle1,
  ClockThree,
  InfoCircle,
  Wallet2,
} from "@tailgrids/icons";
import { Button } from "@/components/tailgrids/core/button";
import type { Credential } from "@/data/credential";
import {
  NOTIFICATIONS_EVENT,
  NOTIFICATIONS_KEY,
  clearUserNotifications,
  getNotifications,
  markAllAsRead,
  markAsRead,
  type AppNotification,
  type NotificationKind,
} from "@/data/notification";
import { loadRequests } from "@/data/request";

// สีและไอคอนตามประเภทแจ้งเตือนใน data/notification.ts
export const KIND_STYLE: Record<
  NotificationKind,
  { bg: string; Icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }> }
> = {
  waiting_you: { bg: "bg-[#FEF3C7] text-[#B45309]", Icon: ClockThree },
  progress: { bg: "bg-[#E0F2FE] text-[#0369A1]", Icon: ClockThree },
  approved: { bg: "bg-[#D1FAE5] text-[#047857]", Icon: CheckCircle1 },
  rejected: { bg: "bg-[#FFE4E6] text-[#BE123C]", Icon: InfoCircle },
  paid: { bg: "bg-[#D1FAE5] text-[#047857]", Icon: Wallet2 },
};

const EMPTY: AppNotification[] = [];
// แคชแยกตาม userId: กระดิ่งกับการ์ดอ่านพร้อมกันคนละ id ได้ (แคชเดียวจะสลับกันทับ → array ใหม่ทุกครั้ง → render วนไม่จบ)
const snapshots = new Map<string, { raw: string; list: AppNotification[] }>();

function readUserNotifications(userId: string): AppNotification[] {
  if (typeof window === "undefined" || !userId) return EMPTY;
  const raw = localStorage.getItem(NOTIFICATIONS_KEY) ?? "";
  const cached = snapshots.get(userId);
  if (cached?.raw === raw) return cached.list;
  const list = getNotifications(userId);
  snapshots.set(userId, { raw, list });
  return list;
}

function subscribeNotifications(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === NOTIFICATIONS_KEY) onChange();
  };
  window.addEventListener(NOTIFICATIONS_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(NOTIFICATIONS_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

// เส้นทางปลายทางเมื่อคลิกแจ้งเตือน 1 รายการ
export function getNotificationHref(item: AppNotification, role: Credential["role"]): string {
  const encodedId = encodeURIComponent(item.requestId);

  if (item.kind === "waiting_you") {
    if (role === "FINANCE") return `/home-finance/pay?id=${encodedId}`;
    if (role === "ACCOUNTANT") return `/home-account/approve?id=${encodedId}`;
    if (role === "DIRECTOR") return `/home-director/approve?id=${encodedId}`;
    if (role === "MANAGING_DIRECTOR") return `/home-managing-director/approve?id=${encodedId}`;
    return `/home-department-head/approve?id=${encodedId}`;
  }

  // คำขอถูกตีกลับ: ถ้าปัจจุบันยังอยู่สถานะ "ตีกลับ" พาไปหน้าแก้ไขส่งใหม่ ไม่งั้นไปหน้ารายละเอียด
  if (item.kind === "rejected") {
    const req = loadRequests().find((r) => r.id === item.requestId);
    if (req?.status === "ตีกลับ") return `/request?id=${encodedId}`;
  }

  return `/my-request/detail?id=${encodedId}`;
}

export function formatTime(iso: string, nowMs: number): string {
  const date = new Date(iso);
  const timeMs = date.getTime();
  if (Number.isNaN(timeMs)) return "";

  const diffMins = Math.max(0, Math.floor((nowMs - timeMs) / 60000));
  if (diffMins < 1) return "เมื่อสักครู่";
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} ชม. ที่แล้ว`;

  return date.toLocaleString("th-TH", { timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// แจ้งเตือนของผู้ใช้ (ใหม่สุดก่อน) · อัปเดตเองเมื่อมีแจ้งเตือนใหม่/อ่านแล้ว
export function useNotifications(userId: string) {
  return useSyncExternalStore(
    subscribeNotifications,
    () => readUserNotifications(userId),
    () => EMPTY,
  );
}

export function NotificationBell({ user }: { user: Credential }) {
  const router = useRouter();
  const list = useNotifications(user.id);
  const unread = list.filter((n) => !n.read).length;

  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false); // กด "ล้างทั้งหมด" แล้ว รอยืนยัน
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleToggle = () => {
    setConfirmClear(false);
    setOpen((prev) => {
      if (!prev) setOpenedAt(Date.now());
      return !prev;
    });
  };

  const handleSelectItem = (item: AppNotification) => {
    if (!item.read) markAsRead(item.id);
    setOpen(false);
    router.push(getNotificationHref(item, user.role));
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="shadow-2xl">
        <Button
          appearance="outline"
          className="relative border border-[#E2E8F0] bg-white"
          aria-label={unread > 0 ? `การแจ้งเตือน (${unread} รายการยังไม่อ่าน)` : "การแจ้งเตือน"}
          aria-expanded={open}
          aria-haspopup="dialog"
          onPress={handleToggle}
        >
          <Bell1 />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="รายการแจ้งเตือน"
          className="absolute right-0 z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xl"
        >
          {/* หัวหน้าต่างแจ้งเตือน */}
          <div className="flex items-center justify-between gap-2 border-b border-[#F1F5F9] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#0F172A]">การแจ้งเตือน</span>
              {unread > 0 && (
                <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#047857]">
                  {unread} ใหม่
                </span>
              )}
            </div>

            {confirmClear ? (
              // ลบแล้วกู้คืนไม่ได้ → ถามก่อน (กดซ้ำที่ "ลบ" เท่านั้นถึงลบ)
              <div role="alert" className="flex items-center gap-2 text-xs">
                <span className="text-[#BE123C]">ลบทั้งหมด {list.length} รายการ?</span>
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    clearUserNotifications(user.id);
                    setConfirmClear(false);
                  }}
                  className="cursor-pointer rounded-md bg-[#BE123C] px-2 py-1 font-semibold text-white hover:bg-[#9F1239]"
                >
                  ลบ
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="cursor-pointer rounded-md px-2 py-1 text-[#475569] hover:bg-[#F1F5F9]"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllAsRead(user.id)}
                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-[#047857] hover:underline"
                  >
                    <Check size={14} aria-hidden={true} />
                    อ่านทั้งหมด
                  </button>
                )}
                {list.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="cursor-pointer text-xs text-[#64748B] hover:text-[#BE123C] hover:underline"
                  >
                    ล้างทั้งหมด
                  </button>
                )}
              </div>
            )}
          </div>

          {/* รายการแจ้งเตือน */}
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F5F9] text-[#94A3B8]">
                <Bell1 size={20} aria-hidden={true} />
              </span>
              <p className="mt-1 text-sm font-medium text-[#334155]">ยังไม่มีการแจ้งเตือน</p>
              <p className="text-xs text-[#94A3B8]">
                ระบบจะแจ้งเตือนเมื่อมีคำขอรออนุมัติหรือสถานะคำขอเปลี่ยน
              </p>
            </div>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-[#F1F5F9] overflow-y-auto">
              {list.map((item) => {
                const { bg, Icon } = KIND_STYLE[item.kind] ?? KIND_STYLE.progress;
                return (
                  <li key={item.id} className={item.read ? "bg-white" : "bg-[#ECFDF5]/40"}>
                    <button
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition hover:bg-[#F8FAFC]"
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bg}`}
                      >
                        <Icon size={17} aria-hidden={true} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`truncate text-xs ${
                              item.read ? "font-medium text-[#334155]" : "font-bold text-[#0F172A]"
                            }`}
                          >
                            {item.requestTitle}
                          </p>
                          {!item.read && (
                            <span
                              className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#059669]"
                              aria-label="ยังไม่อ่าน"
                            />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-[#475569]">{item.message}</p>
                        <p className="mt-1 text-[11px] text-[#94A3B8]">
                          {item.requestId} · {formatTime(item.createdAt, openedAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
