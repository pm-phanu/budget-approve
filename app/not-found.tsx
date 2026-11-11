"use client";

import { useEffect } from "react";

export default function NotFound() {
  useEffect(() => {
    window.location.replace("/login");
  }, []);

  return (
    <div
      aria-live="polite"
      className="visible fixed inset-0 z-9999 flex items-center justify-center bg-[#F5F7FA] text-[#64748B]"
      role="status"
    >
      กำลังกลับไปหน้าเข้าสู่ระบบ...
    </div>
  );
}