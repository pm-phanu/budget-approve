"use client";

import {
  Bell1,
  Check,
  CheckCircle1,
  ChevronDown,
  ClockThree,
  FileText,
  InfoCircle,
  Shield1Check,
  Trash1,
} from "@tailgrids/icons";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CURRENT_USER_KEY, subscribeToAuthSession } from "@/utils/auth-session";

// ===== ชนิดข้อมูลและการเก็บใน localStorage =====

export const NOTIFICATIONS_STORAGE_KEY = "notifications";
const NOTIFICATION_CHANGE_EVENT = "budget-approve:notifications-change";
const CLOCK_CHANGE_EVENT = "budget-approve:clock-change";
const MAX_STORED_NOTIFICATIONS = 100;

export type NotificationCategory =
  | "request_submitted"
  | "request_draft"
  | "auth"
  | "system";

export type NotificationRequestMeta = {
  requestId?: number;
  requestTitle?: string;
  requestType?: string;
  budgetName?: string;
  total?: number;
  approver?: string;
  status?: string;
  useDate?: string;
  reason?: string;
  items?: { name: string; amount: string }[];
  files?: string[];
};

export type AppNotification = {
  id: string;
  userEmail: string;
  category: NotificationCategory;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  meta?: NotificationRequestMeta;
};

export type AddNotificationInput = {
  userEmail?: string;
  category: NotificationCategory;
  title: string;
  message: string;
  meta?: NotificationRequestMeta;
};

const EMPTY_NOTIFICATIONS: AppNotification[] = [];

let cachedRawNotifications: string | null = null;
let cachedRawUser: string | null = null;
let cachedScopedNotifications: AppNotification[] = EMPTY_NOTIFICATIONS;
let currentNowMs = 0;

function getCurrentUserEmail(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawUser = window.localStorage.getItem(CURRENT_USER_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(rawUser);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "email" in parsed &&
      typeof parsed.email === "string"
    ) {
      return parsed.email;
    }
    return null;
  } catch {
    return null;
  }
}

function isNotificationRecord(value: unknown): value is AppNotification {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    "message" in value &&
    typeof value.message === "string" &&
    "createdAt" in value &&
    typeof value.createdAt === "string" &&
    "read" in value &&
    typeof value.read === "boolean" &&
    "category" in value &&
    typeof value.category === "string"
  );
}

function readAllNotifications(): AppNotification[] {
  if (typeof window === "undefined") {
    return EMPTY_NOTIFICATIONS;
  }

  const raw = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
  if (!raw) {
    return EMPTY_NOTIFICATIONS;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return EMPTY_NOTIFICATIONS;
    }
    return parsed.filter(isNotificationRecord).map((item) => ({
      ...item,
      userEmail: typeof item.userEmail === "string" ? item.userEmail : "",
    }));
  } catch {
    return EMPTY_NOTIFICATIONS;
  }
}

function writeAllNotifications(list: AppNotification[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    NOTIFICATIONS_STORAGE_KEY,
    JSON.stringify(list.slice(0, MAX_STORED_NOTIFICATIONS)),
  );
  currentNowMs = Date.now();
  window.dispatchEvent(new Event(NOTIFICATION_CHANGE_EVENT));
  window.dispatchEvent(new Event(CLOCK_CHANGE_EVENT));
}

function getNotificationsSnapshot(): AppNotification[] {
  if (typeof window === "undefined") {
    return EMPTY_NOTIFICATIONS;
  }

  const rawNotifications = window.localStorage.getItem(
    NOTIFICATIONS_STORAGE_KEY,
  );
  const rawUser = window.localStorage.getItem(CURRENT_USER_KEY);

  if (
    rawNotifications === cachedRawNotifications &&
    rawUser === cachedRawUser
  ) {
    return cachedScopedNotifications;
  }

  cachedRawNotifications = rawNotifications;
  cachedRawUser = rawUser;

  const email = getCurrentUserEmail();
  if (!email) {
    cachedScopedNotifications = EMPTY_NOTIFICATIONS;
    return cachedScopedNotifications;
  }

  cachedScopedNotifications = readAllNotifications()
    .filter((item) => item.userEmail === email || item.userEmail === "")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return cachedScopedNotifications;
}

function subscribeToNotifications(callback: () => void) {
  const unsubscribeAuth = subscribeToAuthSession(callback);
  window.addEventListener(NOTIFICATION_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    unsubscribeAuth();
    window.removeEventListener(NOTIFICATION_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function subscribeToClock(callback: () => void) {
  if (currentNowMs === 0) {
    currentNowMs = Date.now();
  }
  const timer = setInterval(() => {
    currentNowMs = Date.now();
    callback();
  }, 30000);
  window.addEventListener(CLOCK_CHANGE_EVENT, callback);

  return () => {
    clearInterval(timer);
    window.removeEventListener(CLOCK_CHANGE_EVENT, callback);
  };
}

function useNowMs() {
  return useSyncExternalStore(
    subscribeToClock,
    () => currentNowMs,
    () => 0,
  );
}

// ===== ฟังก์ชันเพิ่ม / อ่าน / ลบ แจ้งเตือน =====

export function addNotification(input: AddNotificationInput) {
  if (typeof window === "undefined") {
    return;
  }

  const targetEmail = input.userEmail ?? getCurrentUserEmail() ?? "";
  const newItem: AppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userEmail: targetEmail,
    category: input.category,
    title: input.title,
    message: input.message,
    createdAt: new Date().toISOString(),
    read: false,
    meta: input.meta,
  };

  const existing = readAllNotifications();
  writeAllNotifications([newItem, ...existing]);
}

function markAsRead(id: string) {
  const existing = readAllNotifications();
  let changed = false;
  const next = existing.map((item) => {
    if (item.id === id && !item.read) {
      changed = true;
      return { ...item, read: true };
    }
    return item;
  });
  if (changed) {
    writeAllNotifications(next);
  }
}

function markAllAsRead() {
  const email = getCurrentUserEmail();
  if (!email) return;

  const existing = readAllNotifications();
  let changed = false;
  const next = existing.map((item) => {
    if ((item.userEmail === email || item.userEmail === "") && !item.read) {
      changed = true;
      return { ...item, read: true };
    }
    return item;
  });
  if (changed) {
    writeAllNotifications(next);
  }
}

function deleteNotification(id: string) {
  const existing = readAllNotifications();
  const next = existing.filter((item) => item.id !== id);
  if (next.length !== existing.length) {
    writeAllNotifications(next);
  }
}

function clearUserNotifications() {
  const email = getCurrentUserEmail();
  if (!email) return;

  const existing = readAllNotifications();
  const next = existing.filter(
    (item) => item.userEmail !== email && item.userEmail !== "",
  );
  if (next.length !== existing.length) {
    writeAllNotifications(next);
  }
}

function useNotifications() {
  const notifications = useSyncExternalStore(
    subscribeToNotifications,
    getNotificationsSnapshot,
    () => EMPTY_NOTIFICATIONS,
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  return { notifications, unreadCount };
}

// ===== ช่วยจัดรูปแบบข้อความและไอคอน =====

function formatMoney(amount: number) {
  return amount.toLocaleString("th-TH");
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function formatRelativeTime(iso: string, nowMs: number) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t) || nowMs === 0) return "";
  const diffSec = Math.max(0, Math.floor((nowMs - t) / 1000));
  if (diffSec < 60) return "เมื่อสักครู่";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} ชั่วโมงที่แล้ว`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} วันที่แล้ว`;
  return formatDateTime(iso);
}

function getCategoryStyle(category: NotificationCategory) {
  switch (category) {
    case "request_submitted":
      return {
        bg: "bg-[#D1FAE5]",
        text: "text-[#047857]",
        icon: <CheckCircle1 size={18} />,
      };
    case "request_draft":
      return {
        bg: "bg-[#FEF3C7]",
        text: "text-[#B45309]",
        icon: <ClockThree size={18} />,
      };
    case "auth":
      return {
        bg: "bg-[#E0E7FF]",
        text: "text-[#3730A3]",
        icon: <Shield1Check size={18} />,
      };
    default:
      return {
        bg: "bg-[#F1F5F9]",
        text: "text-[#475569]",
        icon: <InfoCircle size={18} />,
      };
  }
}

// ===== คอมโพเนนต์ปุ่มกระดิ่ง + หน้าต่างเล็กตรงปุ่ม =====

export function NotificationBell() {
  const { notifications, unreadCount } = useNotifications();
  const nowMs = useNowMs();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleToggleItem = (item: AppNotification) => {
    markAsRead(item.id);
    setExpandedId((prev) => (prev === item.id ? null : item.id));
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* ปุ่มกระดิ่ง + วงกลมสีแดง default เป็น 0 และขยับขึ้นตามจำนวนข้อความเข้า */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`การแจ้งเตือน ${unreadCount} รายการ`}
        aria-expanded={isOpen}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] transition hover:bg-gray-50 cursor-pointer"
      >
        <Bell1 size={20} />
        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white shadow-sm">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      </button>

      {/* หน้าต่างเล็กตรงปุ่ม: กรอบเริ่มต้นขนาดพอดี และยืดลงตามรายการแจ้งเตือนที่เพิ่มเข้ามา */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="หน้าต่างแจ้งเตือน"
          className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xl"
        >
          {/* หัวกรอบ */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#0F172A]">
                การแจ้งเตือน
              </span>
              <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-semibold text-[#475569]">
                {notifications.length}
              </span>
            </div>

            {notifications.length > 0 && (
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllAsRead()}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#047857] hover:underline cursor-pointer"
                  >
                    <Check size={12} /> อ่านทั้งหมด
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    clearUserNotifications();
                    setExpandedId(null);
                  }}
                  className="text-[11px] font-medium text-[#94A3B8] hover:text-red-600 cursor-pointer"
                >
                  ล้างทั้งหมด
                </button>
              </div>
            )}
          </div>

          {/* เนื้อหา: ยืดขนาดอัตโนมัติตามจำนวนแจ้งเตือน (จำกัดสูงสุด 75vh เผื่อกรณีรายการเยอะมาก) */}
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs font-semibold text-[#334155]">
                ยังไม่มีการแจ้งเตือน
              </p>
              <p className="mt-1 text-[11px] text-[#94A3B8]">
                เมื่อส่งคำขอ บันทึกร่าง หรือเข้าสู่ระบบ จะแสดงที่นี่
              </p>
            </div>
          ) : (
            <div className="max-h-[75vh] divide-y divide-gray-100 overflow-y-auto">
              {notifications.map((item) => {
                const style = getCategoryStyle(item.category);
                const isExpanded = expandedId === item.id;

                return (
                  <div
                    key={item.id}
                    className={
                      !item.read ? "bg-[#ECFDF5]/40" : "bg-white"
                    }
                  >
                    {/* แถวหัวข้อแจ้งเตือน (กดเพื่อดูรายละเอียด) */}
                    <button
                      type="button"
                      onClick={() => handleToggleItem(item)}
                      className="flex w-full items-start gap-2.5 px-4 py-3 text-left transition hover:bg-[#F8FAFC] cursor-pointer"
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.bg} ${style.text}`}
                      >
                        {style.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1.5">
                          <p
                            className={`text-xs leading-snug ${
                              !item.read
                                ? "font-bold text-[#0F172A]"
                                : "font-semibold text-[#334155]"
                            }`}
                          >
                            {item.title}
                          </p>
                          <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                            {!item.read && (
                              <span
                                aria-label="ยังไม่อ่าน"
                                className="h-2 w-2 rounded-full bg-[#059669]"
                              />
                            )}
                            <ChevronDown
                              size={14}
                              className={`text-[#94A3B8] transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </div>

                        <p
                          className={`mt-0.5 text-[11px] text-[#64748B] ${
                            isExpanded ? "" : "line-clamp-2"
                          }`}
                        >
                          {item.message}
                        </p>

                        <p className="mt-1 text-[10px] text-[#94A3B8]">
                          {formatRelativeTime(item.createdAt, nowMs) ||
                            formatDateTime(item.createdAt)}
                        </p>
                      </div>
                    </button>

                    {/* รายละเอียดเพิ่มเติมเมื่อกดเข้าไปดู */}
                    {isExpanded && (
                      <div className="border-t border-dashed border-gray-200 bg-[#F8FAFC] px-4 py-3 text-[11px] text-[#334155] space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                          <span>เวลา: {formatDateTime(item.createdAt)}</span>
                          <button
                            type="button"
                            onClick={() => {
                              deleteNotification(item.id);
                              setExpandedId(null);
                            }}
                            className="inline-flex items-center gap-1 text-red-600 hover:underline cursor-pointer"
                          >
                            <Trash1 size={12} /> ลบ
                          </button>
                        </div>

                        {item.meta && (
                          <div className="space-y-1.5 rounded-xl border border-gray-200 bg-white p-2.5">
                            <div className="flex items-center justify-between gap-2 font-bold text-[#0F172A]">
                              <span className="inline-flex items-center gap-1">
                                <FileText size={13} className="text-[#059669]" />
                                {item.meta.requestTitle || "-"}
                              </span>
                              {item.meta.status && (
                                <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] text-[#B45309]">
                                  {item.meta.status}
                                </span>
                              )}
                            </div>

                            {item.meta.total !== undefined && (
                              <p>
                                ยอดรวม:{" "}
                                <b className="text-[#047857]">
                                  ฿{formatMoney(item.meta.total)}
                                </b>
                              </p>
                            )}
                            {item.meta.requestType && (
                              <p>
                                ประเภท:{" "}
                                {item.meta.requestType === "invoice"
                                  ? "ให้บัญชีจ่ายตามใบแจ้งหนี้"
                                  : "สำรองจ่ายแล้ว (ขอเบิกคืน)"}
                              </p>
                            )}
                            {item.meta.budgetName && (
                              <p>งบที่ใช้: {item.meta.budgetName}</p>
                            )}
                            {item.meta.useDate && (
                              <p>วันที่ใช้จ่าย: {item.meta.useDate}</p>
                            )}
                            {item.meta.approver && (
                              <p>ผู้อนุมัติ: {item.meta.approver}</p>
                            )}
                            {item.meta.reason && (
                              <p>เหตุผล: {item.meta.reason}</p>
                            )}
                            {item.meta.items && item.meta.items.length > 0 && (
                              <div className="border-t border-gray-100 pt-1">
                                <p className="font-semibold text-[#64748B]">
                                  รายการ ({item.meta.items.length}):
                                </p>
                                <ul className="mt-0.5 space-y-0.5">
                                  {item.meta.items.map((row, idx) => (
                                    <li
                                      key={`${row.name}-${idx}`}
                                      className="flex justify-between gap-2"
                                    >
                                      <span className="truncate">
                                        • {row.name || `รายการ ${idx + 1}`}
                                      </span>
                                      <span className="shrink-0 font-semibold">
                                        ฿{formatMoney(Number(row.amount || 0))}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {item.meta.files && item.meta.files.length > 0 && (
                              <p className="border-t border-gray-100 pt-1 text-[#64748B]">
                                ไฟล์แนบ: {item.meta.files.join(", ")}
                              </p>
                            )}
                          </div>
                        )}
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
