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

export default function Home() {
  return (
    <div>
      <div>
        <header className="text-[#111] flex items-center justify-between mx-auto mb-9">
          <div>
            <h1 className="text-[32px] font-bold">
              สวัสดี <span>[username]</span>
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

          <div>
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-2xl">
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
          </div>
        </main>
      </div>
    </div>
  );
}
