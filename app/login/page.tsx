'use client'

import Image from "next/image";
import bgCircleR from "@/app/img/bgCircleR.svg";
import bgCircleL from "@/app/img/bgCircleL.svg";
import { Button } from "@/components/tailgrids/core/button";
import { Link } from "@/components/tailgrids/core/link";
import { ArrowRight } from "@tailgrids/icons";

export default function Login() {
  return (
    <div className="bg-[#F5F7FA] h-screen overflow-hidden">
      {/* container */}
      <div className="grid grid-cols-2">
        {/* left */}
        <div className="bg-[#DCFCE7] relative">
          {/* bgCircleR */}
          <div className="absolute right-0">
            <Image src={bgCircleR} alt="bgCircleR" />
          </div>
          {/* bgCircleL */}
          <div className="absolute bottom-0">
            <Image src={bgCircleL} alt="bgCircleL" />
          </div>
          {/* container */}
          <div className="max-w-3xl m-16">
            {/* header */}
            <div className="text-[1rem] font-semibold capitalize pb-80">
              <h1>budget approval system</h1>
            </div>
            {/* content */}
            <div className="pb-80">
              {/* container */}
              <div>
                {/* header content */}
                <div className="mb-4">
                  <p className="text-5xl font-bold">ระบบอนุมัตงบประมาณ</p>
                </div>
                {/* footer content */}
                <div className="text-balance text-[1rem]">
                  <p className="text-[#64748B]">
                    ยื่นคำขอ ติดตามสถานะ และอนุมัติงบประมาณได้ในที่เดียว โปร่งใส
                    ตรวจสอบได้ทุกขั้นตอน
                  </p>
                </div>
              </div>
            </div>
            {/* footer */}
            <div>
              <p className="text-[13px]">
                ©{" "}
                <span className="text-[#64748B]">
                  2026 Budget Approval System. สงวนลิขสิทธิ์
                </span>
              </p>
            </div>
          </div>
        </div>
        {/* right */}
        <div>
          {/* container */}
          <div className="border border-[#E5E9F0] bg-[#FFFFFF] shadow-md max-w-120 mx-auto my-60 rounded-2xl p-10">
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-2 text-[#0F172A]">
                เข้าสู่ระบบ
              </h2>
              <p className="text-[#64748B] text-[14px]">
                กรุณากรอกข้อมูลเพื่อเข้าใช้งานระบบอนุมัติงบประมาณ
              </p>
            </div>
            {/* form */}
            <form>
              <div className="mb-6">
                <label className="text-[#0F172A]">
                  ชื่อผู้ใช้ (username) หรือ อีเมลบริษัท (email){" "}
                </label>
                <input
                  type="email"
                  placeholder="กรอกชื่อผู้ใช้ หรือ อีเมลบริษัท"
                  className="w-full border border-[#E5E9F0] rounded-lg mt-2 focus:outline-none focus:ring-alert-success-title placeholder:text-[14px] placeholder:text-[#64748B]"
                />
              </div>
              <div>
                <label className="text-[#0F172A]">รหัสผ่าน (password)</label>
                <input
                  type="password"
                  placeholder="กรอกรหัสผ่าน"
                  className="w-full border border-[#E5E9F0] rounded-lg mt-2 focus:outline-none focus:ring-alert-success-title placeholder:text-[14px] placeholder:text-[#64748B]"
                />
              </div>
              {/* btn login */}
              <div>
                <Button
                  variant={"success"}
                  className={"my-6 w-full bg-alert-success-title"}
                >
                  เข้าสู่ระบบ
                </Button>
                <div className="flex items-center gap-4 my-6">
                  <div className="border-t-2 border-[#E5E9F0] max-w-45 w-full"></div>
                  <p className="text-[#64748B]">or</p>
                  <div className="border-t-2 border-[#E5E9F0] max-w-45 w-full"></div>
                </div>
                <p className="flex gap-2 justify-center items-center">
                  <span className="text-[#0F172A]">พนักงานใหม่?</span>
                  <Link
                    href="/"
                    className="text-alert-success-title underline hover:text-alert-success-title/90 font-bold"
                  >
                    ลงทะเบียนเข้าใช้งานระบบ{" "}
                    <span>
                      <ArrowRight />
                    </span>
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
