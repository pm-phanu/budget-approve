"use client";

import AuthAside from "../auth-aside";
import { Button } from "@/components/tailgrids/core/button";
import { Link } from "@/components/tailgrids/core/link";
import { ArrowRight, CheckCircle1, Eye, EyeDisabled, InfoCircle, Shield1Check } from "@tailgrids/icons";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionPopup } from "@/components/action-popup";
import { register } from "@/data/credential";

// ช่องกรอก: สีในธีม · โฟกัสขอบเขียว (เหมือนหน้าเข้าสู่ระบบ)
const FIELD =
  "mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-[15px] text-[#0F172A] placeholder:text-sm placeholder:text-[#94A3B8] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20";
const MIN_PASSWORD = 8;

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showDone, setShowDone] = useState(false); // ป็อปอัพลงทะเบียนสำเร็จ
  const router = useRouter();
  const passwordInputType = showPassword ? "text" : "password";

  // บอกทันทีระหว่างพิมพ์ (ไม่ต้องรอกดลงทะเบียน)
  const passwordShort = formData.password.length > 0 && formData.password.length < MIN_PASSWORD;
  const mismatch =
    formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    if (errorMessage) setErrorMessage("");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง");
      return;
    }

    try {
      register(formData);
      setSuccessMessage("ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ");
      setShowDone(true);
      setFormData({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "ลงทะเบียนไม่สำเร็จ",
      );
    }
  };

  // ปุ่มแสดง / ซ่อนรหัสผ่าน (ใช้ร่วมทั้ง 2 ช่อง)
  const eyeButton = (
    <button
      type="button"
      aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
      aria-pressed={showPassword}
      onClick={() => setShowPassword((show) => !show)}
      className="absolute right-2 top-1/2 mt-1 -translate-y-1/2 rounded-lg p-2 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
    >
      {showPassword ? <EyeDisabled size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0F172A]">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* ซ้าย: แนะนำระบบ (ใช้ร่วมกับอีกหน้า app/(auth)/auth-aside.tsx) */}
        <AuthAside />

        {/* ขวา: ฟอร์มลงทะเบียน */}
        <main className="flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-120 rounded-2xl border border-[#E5E9F0] bg-white p-8 shadow-md sm:p-10">
            <div className="mb-8">
              <p className="mb-6 text-sm font-semibold text-[#047857] lg:hidden">
                ระบบอนุมัติงบประมาณ
              </p>
              <h1 className="mb-2 text-3xl font-bold">ลงทะเบียนเข้าใช้งานระบบ</h1>
              <p className="text-sm text-[#64748B]">
                กรอกข้อมูลพื้นฐาน ระบบจะดึงข้อมูลสังกัดจากฐานข้อมูลกลางของบริษัทให้อัตโนมัติ
              </p>
            </div>

            {successMessage ? (
              // ลงทะเบียนสำเร็จ → บอกขั้นต่อไปชัด ๆ แทนฟอร์มว่าง
              <div role="status" className="flex flex-col items-center gap-4 py-4 text-center">
                <CheckCircle1 size={40} className="text-[#059669]" aria-hidden="true" />
                <p className="font-semibold">{successMessage}</p>
                <Link
                  href="/login"
                  className="font-bold text-alert-success-title underline hover:text-alert-success-title/90"
                >
                  ไปหน้าเข้าสู่ระบบ
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-5">
                  <div>
                    <label htmlFor="username" className="text-sm font-medium">
                      ชื่อ-นามสกุล
                    </label>
                    <input
                      id="username"
                      onChange={handleChange}
                      value={formData.username}
                      type="text"
                      name="username"
                      autoComplete="name"
                      required
                      autoFocus
                      placeholder="กรอกชื่อและนามสกุล"
                      className={FIELD}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="text-sm font-medium">
                      อีเมลบริษัท
                    </label>
                    <input
                      id="email"
                      onChange={handleChange}
                      value={formData.email}
                      type="email"
                      name="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      placeholder="name@company.co.th"
                      className={FIELD}
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="text-sm font-medium">
                      รหัสผ่าน
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        onChange={handleChange}
                        value={formData.password}
                        type={passwordInputType}
                        name="password"
                        autoComplete="new-password"
                        required
                        minLength={MIN_PASSWORD}
                        aria-describedby="password-hint"
                        aria-invalid={passwordShort}
                        placeholder="กำหนดรหัสผ่าน"
                        className={`${FIELD} pr-12`}
                      />
                      {eyeButton}
                    </div>
                    <p
                      id="password-hint"
                      className={`mt-1.5 flex items-center gap-1 text-xs ${passwordShort ? "text-[#B45309]" : "text-[#64748B]"}`}
                    >
                      <Shield1Check size={16} className="shrink-0 text-alert-success-title" aria-hidden="true" />
                      รหัสผ่านต้องมีความยาวอย่างน้อย {MIN_PASSWORD} ตัวอักษร
                      {passwordShort && ` (ตอนนี้ ${formData.password.length})`}
                    </p>
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="text-sm font-medium">
                      ยืนยันรหัสผ่าน
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        onChange={handleChange}
                        value={formData.confirmPassword}
                        type={passwordInputType}
                        name="confirmPassword"
                        autoComplete="new-password"
                        required
                        aria-invalid={mismatch}
                        aria-describedby={mismatch ? "confirm-hint" : undefined}
                        placeholder="กรอกรหัสผ่านอีกครั้ง"
                        className={`${FIELD} pr-12`}
                      />
                      {eyeButton}
                    </div>
                    {mismatch && (
                      <p id="confirm-hint" className="mt-1.5 text-xs text-[#B45309]">
                        รหัสผ่านยังไม่ตรงกัน
                      </p>
                    )}
                  </div>
                </div>

                {errorMessage && (
                  <p
                    role="alert"
                    className="mt-4 flex items-start gap-2 rounded-xl bg-[#FFF1F2] px-3.5 py-2.5 text-sm text-[#9F1239]"
                  >
                    <InfoCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                    {errorMessage}
                  </p>
                )}

                <Button
                  type="submit"
                  variant={"success"}
                  className={"mt-6 w-full bg-alert-success-title"}
                >
                  ลงทะเบียน
                </Button>
                <p className="mt-4 text-center text-xs text-[#64748B]">
                  การลงทะเบียนถือเป็นการยอมรับเงื่อนไขการใช้งานระบบภายในบริษัท
                </p>

                <p className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
                  <span>มีบัญชีอยู่แล้ว?</span>
                  <Link
                    href="/login"
                    className="font-bold text-alert-success-title underline hover:text-alert-success-title/90"
                  >
                    เข้าสู่ระบบ
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </p>
              </form>
            )}
          </div>
          <ActionPopup
            open={showDone}
            title="ลงทะเบียนสำเร็จ"
            message="เข้าสู่ระบบด้วยชื่อผู้ใช้หรืออีเมลที่เพิ่งลงทะเบียน แล้วรอผู้ดูแลระบบกำหนดแผนกให้"
            confirmLabel="ไปหน้าเข้าสู่ระบบ"
            onConfirm={() => router.push("/login")}
            cancelLabel="ปิด"
            onCancel={() => setShowDone(false)}
          />
        </main>
      </div>
    </div>
  );
}
