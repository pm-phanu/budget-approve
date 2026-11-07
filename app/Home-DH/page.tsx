"use client";

import { ArrowRight, Bell1, Check, ClockThree, Plus, Search1 } from "@tailgrids/icons";

export default function DH() {
  return (
    <div>
      <div className="max-w-7xl mx-auto">
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
                placeholder=" ยื่นคำขอ..."
                className=" w-full md:w-80 pl-10 pr-4 py-2.5 bg-white rounded-xl text-sm border border-gray-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              />
            </div>

            <button className="p-2.5 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 relative transition">
              <Bell1 />
            </button>
            <button className="flex items-center justify-center gap-2 bg-[#00875a] text-white px-5 py-2.5 rounded-xl hover:bg-[#00704a]  text-md font-medium shadow-sm w-42.5">
              <span>
                <Plus />
              </span>{" "}
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
          <div className="bg-gray-200  relative flex justify-between p-6 mt-5   flex-col rounded-2xl w-80">
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
          <div className="bg-gray-200  relative flex justify-between p-6 mt-5   flex-col rounded-2xl w-80">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Check/>
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
          <div className="bg-gray-200  relative flex justify-between p-6 mt-5   flex-col rounded-2xl w-180">
            <div className="items-center flex justify-between mb-1 ">
              <div>
                <span className="font-bold text-md">รอคุณตรวจสอบ</span>
              </div>
              <span className="text-green-700 font-bold text- flex text-xs items-center gap-1 ">
                ดูทั้งหมด  <ArrowRight size={15 }/>
              </span>
            </div>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
