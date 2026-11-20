"use client";

// ช่องค้นหาแบบเดียวกันทั้งระบบ (หน้ารายการทุกหน้า + ช่องบน header)
// ※ ไม่ใช้ปุ่ม × ของเบราว์เซอร์ (สีน้ำเงิน/เทาไม่เข้าธีม และหน้าตาต่างกันแต่ละเบราว์เซอร์ · ซ่อนใน globals.css)
//   → ใช้ปุ่มล้างของเราเอง โผล่เมื่อมีคำค้น · กด Esc ก็ล้างได้

import { Close, Search1 } from "@tailgrids/icons";
import { cn } from "@/utils/cn";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string; // ชื่อช่องสำหรับ screen reader
  placeholder?: string;
  id?: string;
  name?: string;
  title?: string;
  className?: string; // ความกว้าง เช่น "sm:w-72"
};

export function SearchField({ value, onChange, label, placeholder, id, name, title, className }: Props) {
  return (
    <div
      className={cn(
        "flex h-10 w-full items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white pl-3 pr-1 transition-colors",
        "focus-within:border-[#059669] focus-within:ring-2 focus-within:ring-[#059669]/15",
        className,
      )}
    >
      <Search1 size={18} className="shrink-0 text-[#94A3B8]" aria-hidden="true" />
      <input
        id={id}
        name={name}
        type="search"
        aria-label={label}
        title={title}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onChange("");
          }
        }}
        placeholder={placeholder}
        className="h-full w-full min-w-0 border-0 bg-transparent p-0 text-sm text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:ring-0"
      />
      {value && (
        <button
          type="button"
          aria-label="ล้างคำค้น"
          onClick={() => onChange("")}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[#94A3B8] transition-colors hover:bg-[#F1F5F9] hover:text-[#475569] focus-visible:outline-2 focus-visible:outline-[#059669]"
        >
          <Close size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
