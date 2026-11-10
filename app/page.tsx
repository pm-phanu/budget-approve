"use client";

import { Button } from "@/components/tailgrids/core/button";
import { Link } from "@/components/tailgrids/core/link";
import {
  ArrowRight,
  Bell1,
  CheckCircle1,
  ClockThree,
  Plus,
  Search1,
  Wallet2,
} from "@tailgrids/icons";
import Image from "next/image";

export default function Home() {
  return (
    <div className="bg-[#F1F5F9] h-screen">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          <header className="text-[32px] font-bold">สวัสดี [user]</header>
          <div className="flex items-center gap-4">
            <div className="flex min-w-65 h-11 w-full items-center rounded-xl bg-white p-1 px-4 border border-[#E2E8F0]">
              <button type="submit">
                <Search1 className="text-[#64748B]" />
              </button>
              <input
                type="text"
                placeholder="ค้นหาคำขอ..."
                className="border-none outline-none focus:outline-none focus:ring-0"
              />
            </div>
            <div className="relative">
              <Button
                appearance={"outline"}
                className="border border-[#e2e8f0]"
              >
                <Bell1 />
                <span className="bg-red-500 rounded-full w-4.5 h-4.5 text-white font-bold absolute top-1 right-3 text-[12px]">
                  0
                </span>
              </Button>
            </div>
            <div className="min-w-40 flex items-center mx-auto">
              <Button className="w-full bg-[#059669] hover:bg-[#036647]">
                <p className="font-bold flex gap-2">
                  <Plus />
                  สร้างคำขอ
                </p>
              </Button>
            </div>
          </div>
        </div>
        <main>
          <div className="container">
            <div className="date mt-2 mb-4">
              <p>
                วันพฤหัสบดีที่ 15 ตุลาคม 2569 · คำขอของคุณกำลังดำเนินการ
                <span> 0</span> รายการ
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
              {/* card 1 */}
              <div className="card h-full w-full text-white bg-linear-to-br from-[#0F172A] from-45% form via-[#0C3136] via-70% to-[#047857] to-100% rounded-[20px]">
                <div className="container p-9">
                  <div className="content">
                    <div className="head-content flex justify-between">
                      <div className="flex gap-1 items-center">
                        <Wallet2 className="text-[#059669]" />
                        <p>งบแผนกคงเหลือ</p>
                      </div>
                      <div className="bg-white/12 rounded-full min-w-15">
                        <p className="px-4 py-2">
                          ปี <span>2569</span>
                        </p>
                      </div>
                    </div>
                    <div className="body-content mt-2">
                      <div>
                        <h1 className="text-[40px] font-bold">
                          <span>฿0,000,000</span>
                        </h1>
                      </div>
                      <div>
                        <p className="text-[#A7F3D0] text-[14px]">
                          จากงบทั้งปี <span>฿0,000,000</span>
                        </p>
                      </div>
                      <div className="mt-4 text-[14px] flex flex-col gap-2">
                        <p>
                          ใช้ไปแล้ว <span>0%</span>
                        </p>
                        <div className="border-6 border-[#F1F5F9]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* card 2 */}
              <div className="card h-full w-full bg-white rounded-[20px]">
                <div className="container p-9">
                  <div className="content">
                    <div className="head-content">
                      <div className="bg-[#FEF3C7] text-badge-warning-text w-fit p-3 rounded-xl">
                        <ClockThree size={32} />
                      </div>
                    </div>
                    <div className="body-content">
                      <div className="text-[#64748B] font-semibold flex flex-col mt-15">
                        <p className=" text-2xl">กำลังดำเนินการ</p>
                        <p className="text-2xl">
                          <span className="text-4xl mr-2 text-badge-warning-text">
                            0
                          </span>
                          รายการ
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* card 3 */}
              <div className="h-full w-full bg-white rounded-[20px]">
                <div className="container p-9">
                  <div className="content">
                    <div className="heade-content">
                      <div className="bg-[#D1FAE5] text-[#047857] rounded-xl p-3 w-fit">
                        <CheckCircle1 size={32} />
                      </div>
                    </div>
                    <div className="body-content">
                      <div className="text-[#647488] font-semibold flex flex-col mt-15">
                        <p className="text-2xl">อนุมัติแล้ว</p>
                        <h1 className="text-4xl text-[#047857]">฿0,000,000</h1>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* content */}
            <div className="bg-white rounded-[20px] mt-4">
              <div className="container p-9">
                <div className="content">
                  <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">คำขอของฉัน</h1>
                    <Link href="/" className="text-[#047857] font-bold">
                      ดูทั้งหมด <ArrowRight />
                    </Link>
                  </div>
                  <div className="">
                    <div className="flex items-center justify-between font-bold">
                      <h1>[เรื่องที่ยื่น]</h1>
                      <div className="bg-warning-500/20 rounded-xl px-4 text-badge-warning-text">
                        <p>รอ [user]</p>
                      </div>
                    </div>
                    <div className="text-[#647488] font-semibold">
                      <p>
                        [ส่งเมื่อ] <span className="text-black">฿0,000,000</span>
                      </p>
                    </div>
                  </div>
                  <div>
                    <div>
                      <div></div>
                      <p>ส่งคำขอ</p>
                    </div>
                    <div>
                      <div></div>
                      <p>หัวหน้าแผนก</p>
                    </div>
                    <div>
                      <div></div>
                      <p>ฝ่ายบัญชี</p>
                    </div>
                    <div>
                      <div>
                        <p>
                          คาดว่าได้เงิน <span>[วันที่]</span>
                        </p>
                      </div>
                      <div>
                        <p>
                          ถ้าหัวหน้าอนุมัติภายใน <span>[วันที่]</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
