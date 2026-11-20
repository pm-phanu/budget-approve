"use client";

// ป็อปอัพหลังทำเรื่องใหญ่ (ส่ง/อนุมัติ/ตีกลับ/บันทึก/เข้าสู่ระบบ/ลงทะเบียน/ออกจากระบบ) แบบเดียวกันทั้งระบบ
//   แจ้งผล: ไม่ส่ง onCancel → ไม่มีปุ่มยกเลิก · ไม่ส่ง onConfirm ด้วย → ไม่มีปุ่มเลย (หน้าที่เรียกพาไปต่อเอง)
//   ถามยืนยัน: ส่งทั้ง onConfirm + onCancel → กด Esc / คลิกพื้นหลัง = ยกเลิก
// ใช้ Dialog ของ TailGrids (react-aria) → โฟกัสอยู่ในป็อปอัพ + screen reader อ่านหัวข้อให้

import type { ReactNode } from "react";
import { ModalOverlay } from "react-aria-components";
import { Check, Xmark } from "@tailgrids/icons";
import { Button } from "@/components/tailgrids/core/button";
import { Dialog, DialogTitle } from "@/components/tailgrids/core/dialog";

type Tone = "success" | "danger" | "warning";

const ICON: Record<Tone, { wrap: string; icon: ReactNode }> = {
  success: { wrap: "bg-[#ECFDF5] text-[#059669]", icon: <Check size={32} aria-hidden="true" /> },
  danger: { wrap: "bg-[#FFF1F2] text-[#E11D48]", icon: <Xmark size={32} aria-hidden="true" /> },
  warning: { wrap: "bg-[#FFFBEB] text-[#D97706]", icon: <span className="text-3xl font-bold" aria-hidden="true">!</span> },
};

type Props = {
  open: boolean;
  tone?: Tone;
  title: string;
  message?: ReactNode;
  children?: ReactNode; // รายละเอียดเพิ่ม (เช่น สรุปคำขอ)
  confirmLabel?: string;
  onConfirm?: () => void;
  cancelLabel?: string;
  onCancel?: () => void;
};

export function ActionPopup({
  open,
  tone = "success",
  title,
  message,
  children,
  confirmLabel = "ตกลง",
  onConfirm,
  cancelLabel = "ยกเลิก",
  onCancel,
}: Props) {
  const asking = !!onCancel;
  return (
    <ModalOverlay
      isOpen={open}
      onOpenChange={(isOpen) => !isOpen && onCancel?.()}
      isDismissable={asking}
      isKeyboardDismissDisabled={!asking}
      className="fixed inset-0 z-50 bg-[#0F172A]/40"
    >
      <Dialog
        role={asking ? "alertdialog" : "dialog"}
        showCloseButton={false}
        className="max-w-md rounded-2xl bg-white p-6 text-center shadow-xl"
      >
        <div className={`mx-auto flex size-16 items-center justify-center rounded-full ${ICON[tone].wrap}`}>
          {ICON[tone].icon}
        </div>
        <DialogTitle className="mt-4 text-xl font-bold leading-snug text-[#0F172A]">{title}</DialogTitle>
        {message && <div className="mt-2 text-sm text-[#64748B]">{message}</div>}
        {children && <div className="mt-4 text-left">{children}</div>}
        {(onConfirm || asking) && (
          <div className="mt-6 flex gap-2">
            {asking && (
              <Button variant="primary" appearance="outline" className="flex-1" onPress={onCancel}>
                {cancelLabel}
              </Button>
            )}
            {onConfirm && (
              <Button
                autoFocus
                variant={tone === "danger" ? "danger" : "success"}
                className="flex-1 font-bold"
                onPress={onConfirm}
              >
                {confirmLabel}
              </Button>
            )}
          </div>
        )}
      </Dialog>
    </ModalOverlay>
  );
}
