"use client";

import AuthAside from "../auth-aside";
import { Button } from "@/components/tailgrids/core/button";
import { Link } from "@/components/tailgrids/core/link";
import { ArrowRight, Eye, EyeDisabled, InfoCircle } from "@tailgrids/icons";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "@/data/credential";

// ช่องกรอก: สีในธีม · โฟกัสขอบเขียว
const FIELD =
  "mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-[15px] text-[#0F172A] placeholder:text-sm placeholder:text-[#94A3B8] focus:border-[#059669] focus:outline-none focus:ring-2 focus:ring-[#059669]/20";

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    if (errorMessage) setErrorMessage("");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    try {
      login(formData.identifier.trim(), formData.password);
      const requestedPath = localStorage.getItem("returnPath");
      localStorage.removeItem("returnPath");
      const returnPath =
        requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
          ? requestedPath
          : "/";
      router.replace(returnPath);
      // Next เก็บหน้านี้ไว้ (ซ่อน) แทนการทิ้ง → ตอน logout กลับมาจะเห็นปุ่มค้าง "กำลังเข้าสู่ระบบ…" + รหัสเดิม
      setSubmitting(false);
      setFormData({ identifier: "", password: "" });
    } catch (error) {
      setSubmitting(false);
      setErrorMessage(
        error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ",
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#0F172A]">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* ซ้าย: แนะนำระบบ (ใช้ร่วมกับอีกหน้า app/(auth)/auth-aside.tsx) */}
        <AuthAside />

        {/* ขวา: ฟอร์มเข้าสู่ระบบ */}
        <main className="flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-120 rounded-2xl border border-[#E5E9F0] bg-white p-8 shadow-md sm:p-10">
            <div className="mb-8">
              {/* ชื่อระบบบนจอเล็ก (แผงซ้ายถูกซ่อน) */}
              <p className="mb-6 text-sm font-semibold text-[#047857] lg:hidden">
                ระบบอนุมัติงบประมาณ
              </p>
              <h1 className="mb-2 text-3xl font-bold">เข้าสู่ระบบ</h1>
              <p className="text-sm text-[#64748B]">
                กรุณากรอกข้อมูลเพื่อเข้าใช้งานระบบอนุมัติงบประมาณ
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label htmlFor="identifier" className="text-sm font-medium">
                  ชื่อผู้ใช้ หรือ อีเมลบริษัท
                </label>
                <input
                  id="identifier"
                  onChange={handleChange}
                  value={formData.identifier}
                  type="text"
                  name="identifier"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  autoFocus
                  aria-invalid={!!errorMessage}
                  aria-describedby={errorMessage ? "login-error" : undefined}
                  placeholder="กรอกชื่อผู้ใช้ หรือ อีเมลบริษัท"
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
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    required
                    aria-invalid={!!errorMessage}
                    aria-describedby={errorMessage ? "login-error" : undefined}
                    placeholder="กรอกรหัสผ่าน"
                    className={`${FIELD} pr-12`}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 mt-1 -translate-y-1/2 rounded-lg p-2 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                  >
                    {showPassword ? (
                      <EyeDisabled size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <p
                  id="login-error"
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
                disabled={submitting}
                className={"mt-6 w-full bg-alert-success-title"}
              >
                {submitting ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
              </Button>

              <div className="my-6 flex items-center gap-4" aria-hidden="true">
                <div className="w-full border-t border-[#E5E9F0]"></div>
                <p className="text-sm text-[#94A3B8]">หรือ</p>
                <div className="w-full border-t border-[#E5E9F0]"></div>
              </div>

              <p className="flex flex-wrap items-center justify-center gap-2 text-sm">
                <span>พนักงานใหม่?</span>
                <Link
                  href="/register"
                  className="font-bold text-alert-success-title underline hover:text-alert-success-title/90"
                >
                  ลงทะเบียนเข้าใช้งานระบบ
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </p>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
