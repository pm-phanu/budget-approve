"use client";

// ════════════════════════════════════════════════════════════
//  การ์ด "แจ้งเตือนล่าสุด" บนแดชบอร์ด (ทั้งหมดดูที่กระดิ่งบน header)
//  ใช้ร่วมทุก role · ข้อมูล / สี / ลิงก์ใช้ของกระดิ่ง (components/notification-bell.tsx)
// ════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { CheckCircle1 } from "@tailgrids/icons";
import { KIND_STYLE, formatTime, getNotificationHref, useNotifications } from "@/components/notification-bell";
import { markAsRead } from "@/data/notification";
import type { Credential } from "@/data/credential";

export default function NotificationsCard({
  me,
  limit = 4,
  className = "",
}: {
  me: Credential | null;
  limit?: number;
  className?: string;
}) {
  const notifications = useNotifications(me?.id ?? "");
  const [now, setNow] = useState(0); // เวลาตอนเปิดหน้า สำหรับ "x นาทีที่แล้ว"
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- เวลาเครื่องอ่านได้หลังเปิดหน้าเท่านั้น (กัน hydration ไม่ตรง) */
    setNow(Date.now());
  }, []);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <section
      aria-labelledby="notif-card-title"
      className={`flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl ${className}`}
    >
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 id="notif-card-title" className="text-base font-bold text-[#0F172A]">
            แจ้งเตือนล่าสุด
            {unread > 0 && (
              <span className="ml-2 rounded-full bg-[#FFF1F2] px-2.5 py-0.5 text-xs font-semibold text-[#BE123C]">
                ยังไม่อ่าน {unread}
              </span>
            )}
          </h2>
        </div>

        {notifications.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#64748B]">ยังไม่มีการแจ้งเตือน</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.slice(0, limit).map((n) => {
              const { bg, Icon } = KIND_STYLE[n.kind] ?? KIND_STYLE.progress;
              return (
                <li key={n.id}>
                  <NextLink
                    href={me ? getNotificationHref(n, me.role) : "#"}
                    onClick={() => !n.read && markAsRead(n.id)}
                    className="flex items-start gap-3 py-4 hover:bg-[#F8FAFC]"
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                      <Icon size={18} aria-hidden={true} />
                    </span>
                    <div className="min-w-0 flex-1 text-sm text-[#334155]">
                      <p>
                        <strong className="text-[#0F172A]">{n.requestTitle}</strong> {n.message}
                      </p>
                      <p className="mt-0.5 text-xs text-[#64748B]">{formatTime(n.createdAt, now)}</p>
                    </div>
                    {/* จุดเขียว = ยังไม่อ่าน */}
                    {!n.read && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#059669]" aria-label="ยังไม่อ่าน" />
                    )}
                  </NextLink>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-xs text-[#64748B]">
        <CheckCircle1 size={16} className="shrink-0" aria-hidden="true" />
        <span>ระบบจะแจ้งเตือนทุกครั้งที่สถานะคำขอเปลี่ยน · ดูทั้งหมดที่กระดิ่งด้านบน</span>
      </div>
    </section>
  );
}
