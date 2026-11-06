"use client";

import Image from "next/image";
import bgCircleR from "@/app/img/bgCircleR.svg";
import bgCircleL from "@/app/img/bgCircleL.svg";
import { Button } from "@/components/tailgrids/core/button";
import { Link } from "@/components/tailgrids/core/link";
import { ArrowRight, Eye, EyeDisabled, Shield1Check } from "@tailgrids/icons";
import { useState } from "react";
import { auth } from "@/utils/auth";

export default function Register() {
  const { registerUser } = auth();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isFocus, setIsFocus] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerUser(formData);

    if (formData.password !== formData.confirmPassword) {
      alert("รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง");
      return;
    }

    const storeUsers = localStorage.getItem("users");
    const usersArray = storeUsers ? JSON.parse(storeUsers) : [];
  };

  return (
    <div className="bg-[#F5F7FA] h-screen overflow-hidden">
      {/* container */}
      <div className="grid grid-cols-2">
        {/* left */}
        <div className="bg-[#DCFCE7] h-screen relative">
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
          <div className="border border-[#E5E9F0] bg-[#FFFFFF] shadow-md max-w-120 mx-auto my-20 rounded-2xl p-10">
            <div className="mb-6">
              <h2 className="text-3xl font-bold mb-2 text-[#0F172A]">
                ลงทะเบียนเข้าใช้งานระบบ
              </h2>
              <p className="text-[#64748B] text-[14px]">
                กรอกข้อมูลพื้นฐาน <br />
                ระบบจะดึงข้อมูลสังกัดจากฐานข้อมูลกลางของบริษัทให้อัตโนมัติ
              </p>
            </div>
            {/* form */}
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
                <div>
                  <label className="text-[#0F172A]">
                    ชื่อ-นามสกุล (name-lastname)
                  </label>
                  <input
                    onChange={handleChange}
                    value={formData.username}
                    type="text"
                    name="username"
                    required
                    placeholder="กรอกชื่อและนามสกุล"
                    className="w-full border border-[#E5E9F0] rounded-lg mt-2 focus:outline-none focus:ring-alert-success-title placeholder:text-[14px] placeholder:text-[#64748B]"
                  />
                </div>
                <div>
                  <label className="text-[#0F172A]">
                    อีเมลบริษัท (Company Email)
                  </label>
                  <input
                    onChange={handleChange}
                    value={formData.email}
                    type="email"
                    name="email"
                    required
                    placeholder="name@company.co.th"
                    className="w-full border border-[#E5E9F0] rounded-lg mt-2 focus:outline-none focus:ring-alert-success-title placeholder:text-[14px] placeholder:text-[#64748B]"
                  />
                </div>
                <div className="relative">
                  <label className="text-[#0F172A]">รหัสผ่าน (password)</label>
                  <input
                    onChange={handleChange}
                    onFocus={() => setIsFocus(true)}
                    onBlur={() => setIsFocus(false)}
                    value={formData.password}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    placeholder="กำหนดรหัสผ่าน"
                    className="w-full border border-[#E5E9F0] rounded-lg mt-2 focus:outline-none focus:ring-alert-success-title placeholder:text-[14px] placeholder:text-[#64748B]"
                  />
                  {(isFocus || formData.password.length > 0) && (
                    <button
                      className="absolute top-11 right-4 text-[#64748B]"
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeDisabled size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <label className="text-[#0F172A]">
                    ยืนยันรหัสผ่าน (confirm password)
                  </label>
                  <input
                    onChange={handleChange}
                    onFocus={() => setIsFocus(true)}
                    onBlur={() => setIsFocus(false)}
                    value={formData.confirmPassword}
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    required
                    placeholder="กำหนดรหัสผ่านอีกครั้ง"
                    className="w-full border border-[#E5E9F0] rounded-lg mt-2 focus:outline-none focus:ring-alert-success-title placeholder:text-[14px] placeholder:text-[#64748B]"
                  />
                  {(isFocus || formData.confirmPassword.length > 0) && (
                    <button
                      className="absolute top-11 right-4 text-[#64748B]"
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeDisabled size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  )}
                </div>
              </div>
              {/* noti */}
              <div className="flex items-center gap-1 mt-2 text-[#64748B] text-[14px]">
                <Shield1Check className="text-alert-success-title size-5" />
                <p>รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร</p>
              </div>
              {/* btn register */}
              <div className="flex flex-col gap-6 mt-6">
                <div>
                  <Button
                    type="submit"
                    variant={"success"}
                    className={"w-full bg-alert-success-title"}
                  >
                    ลงทะเบียน
                  </Button>
                </div>
                <div className="text-[12px] text-center text-[#647488]">
                  <p>
                    การลงทะเบียนถือเป็นการยอมรับเงื่อนไขการใช้งานระบบภายในบริษัท
                  </p>
                </div>
                <div>
                  <p className="flex gap-2 justify-center items-center">
                    <span className="text-[#0F172A]">มีบัญชีอยู่แล้ว?</span>
                    <Link
                      href="/login"
                      className="text-alert-success-title underline hover:text-alert-success-title/90 font-bold"
                    >
                      เข้าสู่ระบบ
                      <span>
                        <ArrowRight />
                      </span>
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
