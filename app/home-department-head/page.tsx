"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell1,
  Check,
  CheckCircle1,
  ClockThree,
  Plus,
  Search1,
} from "@tailgrids/icons";

export default function departmentHeadHomePage() {
  return (
    <div className=" bg-[#F1F5F9] min-h-screen " >
      <div className="max-w-7xl mx-auto ">
        <header className="flex justify-between gap-4 relative">
          <div>
            <h1 className="text-2xl font-bold items-center justify-between mt-8">
              บูมมี่ อยากกินขาหมู
            </h1>
            <p className="text-sm text-gray-500 mt-3">
              วันพฤหัสบดีที่ 15 ตุลาคม 2569 · คำขอรอคุณอนุมัติ{" "}
              <span className="font-semibold text-[#00a86b]">3 รายการ</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              {/* <span><Search1 /></span> */}
              <input
                type="text"
                placeholder=" ค้นหาคำขอ..."
                className=" w-full md:w-80 pl-10 pr-4 py-2.5 bg-white rounded-xl text-sm border border-gray-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              />
            </div>

            <button className="p-2.5 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 relative transition">
              <Bell1 />
            </button>
            <button className="flex items-center justify-center gap-2 bg-[#00875a] text-white px-5 py-2.5 rounded-xl hover:bg-[#00704a]  text-md font-medium shadow-sm w-42.5">
              <span>
                <Plus />
              </span>
              ยื่นคำขอ
            </button>
          </div>
        </header>
        {/* card1 */}
        <div className="flex gap-5 ">
          <div className="bg-[#0e4b3e] text-white-100 relative flex justify-between p-6 mt-5  overflow-hidden flex-col rounded-2xl w-150 ">
            <div>
              <div className="items-center flex justify-between mb-1 ">
                <div>
                  <span>งบประมาณคงเหลือ</span>
                </div>
                <span>ปี 2569</span>
              </div>
              <div>
                <div className="text-3xl font-bold tracking-tight">
                  ฿128,400
                </div>
                <div className="text-xs text-emerald-300/80 mt-1">
                  จากงบทั้งปี ฿300,000
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex justify-between text-xs text-emerald-200 mb-1.5">
                  <span></span>
                  <span>ใช้ไปแล้ว 57%</span>
                </div>
                <div className="w-full bg-emerald-950/60 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#00e699] h-full rounded-full transition-all duration-500"
                    style={{ width: "57%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          {/* card2 */}
          <div className="bg-white-100  relative flex justify-between p-6 mt-5   flex-col rounded-2xl w-80 border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <ClockThree />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400">
                กำลังดำเนินการ
              </div>
              <div className="text-3xl font-bold mt-1 text-gray-800">
                3{" "}
                <span className="text-base font-normal text-gray-500">
                  รายการ
                </span>
              </div>
            </div>
          </div>
          {/* card3 */}
          <div className="bg-white-100  relative flex justify-between p-6 mt-5   flex-col rounded-2xl w-80 border-gray-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Check />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400">
                อนุมัติแล้วปีนี้
              </div>
              <div className="text-3xl font-bold mt-1 text-gray-800">
                ฿45,200
              </div>
            </div>
          </div>
        </div>

        {/* รอคุณตรวจสอบ */}
        <div className="flex gap5">
          <div className="bg-white-100  relative flex justify-between p-6 mt-5   flex-col rounded-2xl w-180 border-gray-100 shadow-sm">
            <div className="items-center flex justify-between mb-1 ">
              <div>
                <span className="font-bold text-md">รอคุณตรวจสอบ</span>
                <span className="bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-full border border-amber-200 ml-2">
                  3
                </span>
              </div>
              <div>
                <button className="text-green-700 font-bold text- flex text-xs items-center gap-1 ">
                  ดูทั้งหมด <ArrowRight size={15} />
                </button>
              </div>
            </div>
            {/* collum1 */}
            <div className="flex items-center justify-between mb-1 mt-3">
              <div className="flex items-center">
                <div>
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-green-700 font-bold">
                    เน
                  </div>
                </div>
                <div className="flex flex-col ml-3">
                  <div className="font-bold">ค่าเดินทางไป ที่เชียงใหม่</div>
                  <div className="text-xs text-gray-400">
                    เนส เมื่อ2ชั่วโมงที่แล้ว
                  </div>
                </div>
              </div>

              <div>
                <span className="bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-full border border-amber-200">
                  รอ 2 วัน
                </span>
              </div>
              <div>
                <span className="font-bold">$12,800</span>
              </div>
              <div>
                <button className="text-green-700 font-bold text- flex text-xs items-center gap-1 ">
                  ตรวจสอบ <ArrowRight size={15} />
                </button>
              </div>
            </div>
            {/* collum2 */}
            <div className="flex items-center justify-between mb-1 mt-3">
              <div className="flex items-center">
                <div>
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-green-700 font-bold">
                    เน
                  </div>
                </div>
                <div className="flex flex-col ml-3">
                  <div className="font-bold">ค่าเดินทางไป ที่เชียงใหม่</div>
                  <div className="text-xs text-gray-400">
                    เนส เมื่อ2ชั่วโมงที่แล้ว
                  </div>
                </div>
              </div>

              <div>
                <span className="bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-full border border-amber-200">
                  รอ 2 วัน
                </span>
              </div>
              <div>
                <span className="font-bold">$12,800</span>
              </div>
              <div>
                <button className="text-green-700 font-bold text- flex text-xs items-center gap-1 ">
                  ตรวจสอบ <ArrowRight size={15} />
                </button>
              </div>
            </div>
            {/* collum3 */}
            <div className="flex items-center justify-between mb-1 mt-3">
              <div className="flex items-center">
                <div>
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-bold border-amber-200">
                    เน
                  </div>
                </div>
                <div className="flex flex-col ml-3">
                  <div className="font-bold">ค่าเดินทางไป ที่เชียงใหม่</div>
                  <div className="text-xs text-gray-400">
                    เนส เมื่อ2ชั่วโมงที่แล้ว
                  </div>
                </div>
              </div>

              <div>
                <span className="bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-full border border-amber-200">
                  รอ 1 วัน
                </span>
              </div>
              <div>
                <span className="font-bold">$8,000</span>
              </div>
              <div>
                <button className="text-green-700 font-bold text- flex text-xs items-center gap-1 ">
                  ตรวจสอบ <ArrowRight size={15} />
                </button>
              </div>
            </div>
            {/* report */}
            <div className="mt-4 bg-gray-50 border border-gray-200/60 rounded-xl p-3.5 flex items-center gap-2 text-xs text-gray-500">
              <div className="w-5 h-5 rounded-xl  flex items-center justify-center ">
                <CheckCircle1 />
              </div>
              <span>คำขอที่รอเกิน 3 วันระบบจะแจ้งเตือนคุณอีกครั้ง</span>
            </div>
            {/* อนุมัติแล้ว */}
            <div className="mt-5">
              <div className="items-center flex justify-between mb-1 ">
                <div>
                  <span className="font-bold text-md">อนุมัติล่าสุด</span>
                </div>
                <div>
                  <button className="text-green-700 font-bold text- flex text-xs items-center gap-1 ">
                    ดูประวัติ <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
            {/* collum1 */}
            <div className="flex items-center justify-between mb-1 mt-3">
              <div className="flex items-center">
                <div>
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-bold border-amber-200">
                    เน
                  </div>
                </div>
                <div className="flex flex-col ml-3">
                  <div className="font-bold">ค่าเดินทางไป ที่เชียงใหม่</div>
                  <div className="text-xs text-gray-400">
                    อนุมัติเมื่อ 2 ชั่วโมงก่อน
                  </div>
                </div>
              </div>

              <div>
                <span className="font-bold">$8,000</span>
              </div>
              <div>
                <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full border border-emerald-200">
                  อนุมัติแล้ว
                </span>
              </div>
            </div>
            {/* collum2 */}
            <div className="flex items-center justify-between mb-1 mt-3">
              <div className="flex items-center">
                <div>
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-bold border-amber-200">
                    เน
                  </div>
                </div>
                <div className="flex flex-col ml-3">
                  <div className="font-bold">ค่าเดินทางไป ที่เชียงใหม่</div>
                  <div className="text-xs text-gray-400">
                    อนุมัติเมื่อ 2 ชั่วโมงก่อน
                  </div>
                </div>
              </div>

              <div>
                <span className="font-bold">$5,000</span>
              </div>
              <div>
                <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full border border-emerald-200">
                  อนุมัติแล้ว
                </span>
              </div>
            </div>
            {/* collum3 */}
            <div className="flex items-center justify-between mb-1 mt-3">
              <div className="flex items-center">
                <div>
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-bold border-amber-200">
                    เน
                  </div>
                </div>
                <div className="flex flex-col ml-3">
                  <div className="font-bold">ค่าเดินทางไป ที่เชียงใหม่</div>
                  <div className="text-xs text-gray-400">
                    อนุมัติเมื่อ 2 ชั่วโมงก่อน
                  </div>
                </div>
              </div>

              <div>
                <span className="font-bold">$10,000</span>
              </div>
              <div>
                <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full border border-emerald-200">
                  อนุมัติแล้ว
                </span>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-5/12 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 flex flex-col justify-between ml-5 mt-5">
            <div>
              {/* Header: คำขอของฉัน */}
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-base text-gray-800">
                  คำขอของฉัน
                </h2>
                <button className="text-emerald-700 font-semibold text-xs flex items-center gap-1 hover:underline">
                  ดูทั้งหมด →
                </button>
              </div>

              <div className="space-y-6">
                {/* Item 1: รออนุมัติ */}
                <div className="pb-6 border-b border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-gray-800">
                        ซื้อคอมพิวเตอร์ให้ทีม 2 เครื่อง
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        ส่งเมื่อ 14 ต.ค.{" "}
                        <span className="font-bold text-gray-700">฿56,000</span>
                      </div>
                    </div>
                    <span className="bg-amber-50 text-amber-600 text-xs px-3 py-1 rounded-full border border-amber-200 font-medium">
                      รออนุมัติ
                    </span>
                  </div>

                  {/* Stepper Progress */}
                  <div className="relative px-2 py-2">
                    <div className="absolute left-5 right-5 top-5 -translate-y-1/2 h-1 bg-gray-200 z-0"></div>
                    <div className="absolute left-5 right-[50%] top-5 -translate-y-1/2 h-1 bg-emerald-500 z-0"></div>

                    <div className="relative z-10 flex justify-between items-center text-xs">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <span className="text-gray-600 font-medium">
                          ส่งคำขอ
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-white border-2 border-dashed border-emerald-500 flex items-center justify-center"></div>
                        <span className="text-emerald-700 font-bold">
                          หัวหน้าสายงาน
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-white border border-gray-300 text-gray-400 flex items-center justify-center"></div>
                        <span className="text-gray-400">ฝ่ายบัญชี</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Item 2: อนุมัติแล้ว */}
                <div className="pb-6 border-b border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-gray-800">
                        ค่าจัดงานเปิดตัวสินค้า
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        ส่งเมื่อ 12 ต.ค.{" "}
                        <span className="font-bold text-gray-700">฿48,000</span>
                      </div>
                    </div>
                    <span className="bg-emerald-50 text-emerald-600 text-xs px-3 py-1 rounded-full font-medium">
                      อนุมัติแล้ว
                    </span>
                  </div>

                  {/* Stepper Progress */}
                  <div className="relative px-2 py-2">
                    <div className="absolute left-5 right-6 top-5 -translate-y-1/2 h-1 bg-emerald-500 z-0"></div>

                    <div className="relative z-10 flex justify-between items-center text-xs">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <span className="text-gray-600 font-medium">
                          ส่งคำขอ
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <span className="text-emerald-700 font-bold">
                          หัวหน้าสายงาน
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <span className="text-emerald-700 font-medium">
                          ฝ่ายบัญชี
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Item 3: ถูกตีกลับ */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-gray-800">
                        ค่ารับรองลูกค้าองค์กร
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        ส่งเมื่อ 28 ก.ย.{" "}
                        <span className="font-bold text-gray-700">฿15,600</span>
                      </div>
                    </div>
                    <span className="bg-rose-50 text-rose-600 text-xs px-3 py-1 rounded-full border border-rose-200 font-medium">
                      ถูกตีกลับ
                    </span>
                  </div>

                  {/* Stepper Progress */}
                  <div className="relative px-2 py-2">
                    <div className="absolute left-5 right-5 top-5 -translate-y-1/2 h-1 bg-gray-200 z-0"></div>
                    <div className="absolute left-5 right-[50%] top-5 -translate-y-1/2 h-1 bg-emerald-500 z-0"></div>

                    <div className="relative z-10 flex justify-between items-center text-xs">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <span className="text-gray-600 font-medium">
                          ส่งคำขอ
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold">
                          ✕
                        </div>
                        <span className="text-rose-600 font-bold">
                          หัวหน้าสายงาน
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-7 h-7 rounded-full bg-white border border-gray-300 text-gray-400 flex items-center justify-center"></div>
                        <span className="text-gray-400">ฝ่ายบัญชี</span>
                      </div>
                    </div>
                  </div>

                  {/* Reason Box */}
                  <div className="bg-rose-50/60 border border-rose-200/60 rounded-xl p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 text-rose-700">
                      <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center shrink-0 font-bold text-[10px]">
                        !
                      </div>
                      <span>
                        <strong>เหตุผล:</strong> แนบใบเสร็จไม่ครบ
                        ขาดใบเสร็จค่าอาหาร...
                      </span>
                    </div>
                    <button className="text-rose-700 font-semibold hover:underline shrink-0">
                      ดูทั้งหมด →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Notice Banner */}
            <div className="mt-4 bg-gray-50 border border-gray-200/60 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-gray-500">
              <span>✓</span>
              <span>คำขอของคุณจะถูกส่งให้หัวหน้าสายงานอนุมัติ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
