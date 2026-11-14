"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasCurrentUserSession } from "@/utils/auth-session";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace(hasCurrentUserSession() ? "/" : "/login");
  }, [router]);

  return (
    <div
      aria-live="polite"
      className="visible fixed inset-0 z-9999 flex items-center justify-center bg-[#F5F7FA] text-[#64748B]"
      role="status"
    >
      กำลังเปลี่ยนเส้นทาง...
    </div>
  );
}