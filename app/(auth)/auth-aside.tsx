// แผงซ้ายของหน้าเข้าสู่ระบบ / ลงทะเบียน (ใช้ร่วมกัน)
// โลโก้ "฿ budget flow" ตัวเดียวกับ sidebar ในระบบ → ผู้ใช้รู้ว่าเข้ามาระบบเดียวกัน
import Image from "next/image";
import bgCircleR from "@/app/img/bgCircleR.svg";
import bgCircleL from "@/app/img/bgCircleL.svg";

export default function AuthAside() {
  return (
    <div className="relative hidden overflow-hidden bg-[#DCFCE7] lg:block">
      <div className="pointer-events-none absolute right-0" aria-hidden="true">
        <Image src={bgCircleR} alt="" />
      </div>
      <div className="pointer-events-none absolute bottom-0" aria-hidden="true">
        <Image src={bgCircleL} alt="" />
      </div>
      <div className="relative flex h-full max-w-3xl flex-col justify-between p-16">
        <p className="flex items-center gap-2">
          <span
            className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#059669] font-bold text-white"
            aria-hidden="true"
          >
            ฿
          </span>
          <span className="text-2xl font-bold">budget flow</span>
        </p>
        <div>
          <p className="mb-4 text-5xl font-bold leading-tight">ระบบอนุมัติงบประมาณ</p>
          <p className="max-w-md text-balance text-base text-[#475569]">
            ยื่นคำขอ ติดตามสถานะ และอนุมัติงบประมาณได้ในที่เดียว โปร่งใส
            ตรวจสอบได้ทุกขั้นตอน
          </p>
        </div>
        <p className="text-[13px] text-[#64748B]">© 2026 Budget Approval System. สงวนลิขสิทธิ์</p>
      </div>
    </div>
  );
}
