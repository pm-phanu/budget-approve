"use client";

import { useEffect, useState } from "react";
import {
  canApproveStep,
  claimReviewLock,
  releaseReviewLock,
  REVIEW_LOCK_HEARTBEAT_MS,
  REVIEW_LOCKS_KEY,
  type ReviewLock,
} from "@/data/approval";
import type { Credential } from "@/data/credential";
import type { SavedRequest } from "@/data/request";

// ---- ล็อก "มีคนกำลังตรวจสอบอยู่" (data/approval.ts) · ใช้ในหน้าอนุมัติ/จ่ายเงินทุก role ----
// คนที่มีสิทธิ์อนุมัติเปิดหน้านี้ → จองคำขอ+ขั้นนี้ไว้ และต่ออายุทุก 30 วินาที
// มีคนอื่นจองอยู่ → คืนล็อกของคนนั้น (หน้าใช้ซ่อนปุ่มอนุมัติ/ตีกลับ) · ไม่มี = null
// ปิด/ออกจากหน้า → ปล่อยล็อก · แท็บอื่นปล่อยล็อก → event "storage" → จองต่อได้ทันที
export function useReviewLock(request: SavedRequest | null, me: Credential | null) {
  const [lockedBy, setLockedBy] = useState<ReviewLock | null>(null);
  const lockRequestId = request?.id ?? "";
  const lockStep = request?.currentStep ?? -1;
  const mayAct = !!request && canApproveStep(request, me);
  useEffect(() => {
    if (!lockRequestId || !me || !mayAct) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- ไม่มีสิทธิ์ = ไม่ต้องจอง */
      setLockedBy(null);
      return;
    }
    const sync = () => {
      const res = claimReviewLock(lockRequestId, lockStep, me);
      setLockedBy(res.ok ? null : res.lock);
    };
    const release = () => releaseReviewLock(lockRequestId, me.id);
    const onStorage = (e: StorageEvent) => {
      if (e.key === REVIEW_LOCKS_KEY) sync();
    };
    sync();
    const timer = window.setInterval(sync, REVIEW_LOCK_HEARTBEAT_MS);
    window.addEventListener("storage", onStorage);
    window.addEventListener("pagehide", release);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pagehide", release);
      release();
    };
  }, [lockRequestId, lockStep, me, mayAct]);
  return lockedBy;
}
