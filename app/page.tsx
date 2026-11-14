"use client";

import { NotificationBell } from "@/app/notification/noti";
import { Button } from "@/components/tailgrids/core/button";
import { Link } from "@/components/tailgrids/core/link";
import {
  ArrowRight,
  CheckCircle1,
  ClockThree,
  Plus,
  Search1,
  Wallet2,
} from "@tailgrids/icons";

export default function Home() {
  return (
    <div className="h-screen bg-[#F1F5F9]">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          <header className="text-[32px] font-bold">สวัสดี [user]</header>
          <div className="flex items-center gap-4">
            <div className="flex h-11 min-w-65 w-full items-center rounded-xl border border-[#E2E8F0] bg-white p-1 px-4">
              <button type="submit">
                <Search1 className="text-[#64748B]" />
              </button>
              <input
                type="text"
                placeholder="ค้นหาคำขอ..."
                className="border-none outline-none focus:outline-none focus:ring-0"
              />
            </div>
            <NotificationBell />
            <div className="mx-auto flex min-w-40 items-center">
              <Button className="w-full bg-[#059669] hover:bg-[#036647]">
                <p className="flex gap-2 font-bold">
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
              <div className="card h-full w-full rounded-[20px] bg-linear-to-br from-[#0F172A] from-45% form via-[#0C3136] via-70% to-[#047857] to-100% text-white">
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
                      <h1 className="text-[40px] font-bold">฿0,000,000</h1>
                      <p className="text-[14px] text-[#A7F3D0]">
                        จากงบทั้งปี <span>฿0,000,000</span>
                      </p>
                      <div className="mt-4 flex flex-col gap-2 text-[14px]">
                        <p>
                          ใช้ไปแล้ว <span>0%</span>
                        </p>
                        <div className="border-6 border-[#F1F5F9]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card h-full w-full rounded-[20px] bg-white">
                <div className="container p-9">
                  <div className="content">
                    <div className="head-content">
                      <div className="w-fit rounded-xl bg-[#FEF3C7] p-3 text-badge-warning-text">
                        <ClockThree size={32} />
                      </div>
                    </div>
                    <div className="body-content">
                      <div className="mt-15 flex flex-col font-semibold text-[#64748B]">
                        <p className="text-2xl">กำลังดำเนินการ</p>
                        <p className="text-2xl">
                          <span className="mr-2 text-4xl text-badge-warning-text">
                            0
                          </span>
                          รายการ
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-full w-full rounded-[20px] bg-white">
                <div className="container p-9">
                  <div className="content">
                    <div className="heade-content">
                      <div className="w-fit rounded-xl bg-[#D1FAE5] p-3 text-[#047857]">
                        <CheckCircle1 size={32} />
                      </div>
                    </div>
                    <div className="body-content">
                      <div className="mt-15 flex flex-col font-semibold text-[#647488]">
                        <p className="text-2xl">อนุมัติแล้ว</p>
                        <h1 className="text-4xl text-[#047857]">฿0,000,000</h1>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <div className="mt-4 rounded-[20px] bg-white">
                <div className="container p-9">
                  <div className="content">
                    <div className="mb-4 flex items-center justify-between">
                      <h1 className="text-2xl font-bold">คำขอของฉัน</h1>
                      <Link href="/" className="text-[#047857] font-bold">
                        ดูทั้งหมด <ArrowRight />
                      </Link>
                    </div>

                    <div className="request-item">
                      <div className="flex items-center justify-between font-bold">
                        <h1>[เรื่องที่ยื่น]</h1>
                        <div className="rounded-xl bg-warning-500/20 px-4 text-badge-warning-text">
                          <p>รอ [user]</p>
                        </div>
                      </div>
                      <div className="font-semibold text-[#647488]">
                        <p>
                          [ส่งเมื่อ]{" "}
                          <span className="text-black">฿0,000,000</span>
                        </p>
                      </div>

                      <div className="relative mt-4">
                        <div className="absolute left-3 right-3 top-3 h-0.5 -translate-y-1/2 bg-[#E2E8F0]">
                          <div className="h-full w-1/2 bg-[#059669]" />
                        </div>

                        <div className="relative grid grid-cols-3 text-xs">
                          <div className="flex flex-col items-start gap-1.5">
                            <div className="z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#059669] font-bold text-white">
                              ✓
                            </div>
                            <p className="text-[#94A3B8]">ส่งคำขอ</p>
                          </div>

                          <div className="flex flex-col items-center gap-1.5">
                            <div className="z-10 h-6 w-6 rounded-full border-2 border-dashed border-[#059669] bg-white" />
                            <p className="font-bold text-[#047857]">
                              หัวหน้าแผนก
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-1.5">
                            <div className="z-10 h-6 w-6 rounded-full border-2 border-[#CBD5E1] bg-white" />
                            <p className="text-[#94A3B8]">ฝ่ายบัญชี</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between rounded-lg bg-[#FEF3C7] px-4 py-1.5 text-sm text-badge-warning-text">
                        <p>
                          คาดว่าได้เงิน <span>[วันที่]</span>
                        </p>
                        <p>
                          ถ้าหัวหน้าอนุมัติภายใน <span>[วันที่]</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-fit rounded-[20px] bg-white">
                <div className="container p-9">
                  <div className="content">
                    <div className="mb-4 flex items-center justify-between">
                      <h1 className="text-2xl font-bold">แจ้งเตือนล่าสุด</h1>
                      <Link href="/" className="text-[#047857] font-bold">
                        ดูทั้งหมด <ArrowRight />
                      </Link>
                    </div>

                    <div className="divide-y divide-[#E2E8F0]">
                      <div className="notification-item flex gap-3 py-4 first:pt-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D1FAE5] text-[#047857]">
                          <CheckCircle1 size={22} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm">
                            <span className="font-bold">[ชื่อคำขอ]</span>{" "}
                            [ข้อความแจ้งเตือน]
                          </p>
                          <p className="mt-1 text-xs text-[#94A3B8]">[เวลา]</p>
                        </div>
                      </div>

                      <div className="notification-item flex gap-3 py-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-badge-warning-text">
                          <ClockThree size={22} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm">
                            <span className="font-bold">[ชื่อคำขอ]</span>{" "}
                            [ข้อความแจ้งเตือน]
                          </p>
                          <p className="mt-1 text-xs text-[#94A3B8]">[เวลา]</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-xs text-[#64748B]">
                      <CheckCircle1 size={16} />
                      <p>ระบบจะแจ้งเตือนทุกครั้งที่สถานะคำขอเปลี่ยน</p>
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
