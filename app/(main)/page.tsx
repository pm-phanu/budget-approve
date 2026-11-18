"use client";

import {
  Search1,
  Bell1,
  Plus,
  Wallet2,
  ClockThree,
  CheckCircle1,
  ArrowRight,
  InfoCircle,
  Check,
} from "@tailgrids/icons";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Link } from "@/components/tailgrids/core/link";
import { Badge } from "@/components/tailgrids/core/badge";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/utils/login";
import type { Credential } from "@/data/credential";

export default function Home() {
  const [me, setMe] = useState<Credential | null>(null);

  // localStorage อ่านได้เฉพาะฝั่ง browser จึงต้องโหลดใน useEffect
  useEffect(() => {
    setMe(getCurrentUser());
  }, []);

  return (
    <div>
      <div>
        <header className="text-[#111] flex items-center justify-between mx-auto mb-9">
          <div>
            <h1 className="text-[32px] font-bold">
              สวัสดี <span>{me ? me.fullName : "-"}</span>
            </h1>
          </div>
        </header>

        <main className="flex flex-col gap-9">
          <div className="grid grid-cols-4 gap-5">
            <div className="card shadow-2xl col-span-2 rounded-xl bg-[linear-gradient(160deg,#0F172A_0%,#0F172A_55%,#0C3136_70%,#047857_100%)]">
              <div className="p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-success-500">
                      <Wallet2 size={32} />
                    </span>
                    <h1 className="text-2xl font-bold">งบแผนกคงเหลือ</h1>
                  </div>
                  <p className="text-[14px] border border-white/20 bg-white/12 rounded-full px-2 py-1">
                    ปี [years]
                  </p>
                </div>
                <div className="text-[64px] font-bold">
                  <h1>
                    ฿ <span>[total]</span>
                  </h1>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2 text-[#CBD5E1]">
                    <p>
                      จากงบทั้งปี ฿ <span>[sum]</span>
                    </p>
                    <p className="flex gap-1">
                      ใช้ไปแล้ว<span>[total use percent]</span>%
                    </p>
                  </div>
                  <div className="border-4 border-success-500 rounded-full"></div>
                </div>
              </div>
            </div>
            <div className="card shadow-2xl">
              <div className="h-full p-6 flex flex-col justify-between bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl">
                <div className="text-alert-warning-title flex flex-col gap-3 text-2xl font-semibold">
                  <p className="bg-[#FEF3C7] w-fit rounded-xl p-2">
                    <ClockThree size={32} />
                  </p>
                  <p>กำลังดำเนินการ</p>
                </div>
                <div>
                  <p className="flex gap-1 items-center font-bold text-2xl">
                    <span className="text-alert-warning-title">[count]</span>
                    รายการ
                  </p>
                </div>
              </div>
            </div>
            <div className="card shadow-2xl">
              <div className="h-full p-6 flex flex-col justify-between bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl">
                <div className=" text-alert-success-title flex flex-col gap-3 text-2xl font-semibold">
                  <p className="bg-[#D1FAE5] w-fit rounded-xl p-2">
                    <CheckCircle1 size={32} />
                  </p>
                  <p>อนุมัติแล้วปีนี้</p>
                </div>
                <div>
                  <p className="flex gap-1 items-center font-bold text-2xl">
                    ฿<span className="text-alert-success-title">[count]</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* grid 4 คอลัมน์: คำขอของฉัน 2 คอลัมน์ / แจ้งเตือนล่าสุด 2 คอลัมน์ */}
          <div className="grid grid-cols-4 gap-5">
            <div className="col-span-2 bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-2xl">
              <div className="text-2xl font-bold text-black flex items-center justify-between mb-4">
                <h1>คำขอของฉัน</h1>
                <Link
                  href="#"
                  className="font-bold text-alert-success-title hover:text-success-500"
                >
                  ดูทั้งหมด <ArrowRight />
                </Link>
              </div>

              {/* กรณีไม่มีข้อมูล */}
              {/* <div className="no-data text-xl text-center">
                <h1>ยังไม่มีคำขอที่คุณขอ</h1>
              </div> */}

              <div className="text-2xl font-bold flex items-center justify-between mb-4">
                <span>[เรื่องที่ขอเบิก]</span>
                <Badge size={"lg"} color="warning" className="font-semibold">
                  [รอหัวหน้าแผนกอนุมัติ]
                </Badge>
              </div>

              <div className="w-full space-y-2">
                <div className="flex items-center w-full px-3">
                  <div className="bg-success-500 w-8 h-8 rounded-full text-white flex items-center justify-center shrink-0">
                    <Check />
                  </div>
                  <div className="flex-1 h-0.5 bg-success-500"></div>

                  <div className="w-8 h-8 rounded-full border-2 border-dotted border-success-500 bg-white shrink-0"></div>
                  <div className="flex-1 h-0.5 bg-slate-200"></div>

                  <div className="w-8 h-8 rounded-full border-2 border-slate-300 bg-white shrink-0"></div>
                  <div className="flex-1 h-0.5 bg-slate-200"></div>

                  <div className="w-8 h-8 rounded-full border-2 border-slate-300 bg-white shrink-0"></div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span>[requset]</span>
                  <span>[head]</span>
                  <span>[account]</span>
                  <span>[finace]</span>
                </div>
              </div>
            </div>

            {/* แจ้งเตือนล่าสุด (ข้อมูลตัวอย่าง) */}
            <div className="col-span-2 flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-2xl">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-800">แจ้งเตือนล่าสุด</h2>
                  <Link href="#" className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">
                    ดูทั้งหมด →
                  </Link>
                </div>

                <ul className="divide-y divide-gray-100">
                  {/* แจ้งเตือนที่ 1: ได้รับเงินแล้ว */}
                  <li className="flex items-start gap-3 py-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <Check size={18} />
                    </span>
                    <div className="text-sm text-gray-700">
                      <p>
                        คำขอ <strong className="text-gray-900">ค่าอบรมทีมการตลาด</strong> ได้รับเงินแล้ว
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">วันนี้ 09.00 น.</p>
                    </div>
                  </li>

                  {/* แจ้งเตือนที่ 2: รอขั้นถัดไป */}
                  <li className="flex items-start gap-3 py-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <ClockThree size={18} />
                    </span>
                    <div className="text-sm text-gray-700">
                      <p>
                        <strong className="text-gray-900">ซื้อหมึกพิมพ์สำนักงาน</strong> หัวหน้าแผนกอนุมัติแล้ว รอฝ่ายบัญชีตรวจ
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">12 ต.ค. 10:15</p>
                    </div>
                  </li>

                  {/* แจ้งเตือนที่ 3: ได้รับเงินแล้ว */}
                  <li className="flex items-start gap-3 py-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <Check size={18} />
                    </span>
                    <div className="text-sm text-gray-700">
                      <p>
                        คำขอ <strong className="text-gray-900">ค่าอบรมทีมการตลาด</strong> ได้รับเงินแล้ว
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">วันนี้ 09.00 น.</p>
                    </div>
                  </li>

                  {/* แจ้งเตือนที่ 4: ได้รับเงินแล้ว */}
                  <li className="flex items-start gap-3 py-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <Check size={18} />
                    </span>
                    <div className="text-sm text-gray-700">
                      <p>
                        คำขอ <strong className="text-gray-900">ค่าอบรมทีมการตลาด</strong> ได้รับเงินแล้ว
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">วันนี้ 09.00 น.</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-gray-200/60 bg-gray-50 p-3.5 text-xs text-gray-500">
                <span>✓</span>
                <span>ระบบจะแจ้งเตือนทุกครั้งที่สถานะคำขอเปลี่ยน</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
