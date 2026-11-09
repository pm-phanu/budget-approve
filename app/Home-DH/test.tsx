import React from 'react';

// ตัวอย่าง Icon Component แบบ SVG ในสไตล์ TailGrids (เพื่อไม่ต้องพึ่งพาแพ็กเกจภายนอก)
const SearchIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const BellIcon = () => (
  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const WalletIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckCircleIcon = ({ className = "w-5 h-5 text-emerald-500" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowRightIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

const XCircleIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const InfoIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#f3f6f8] text-[#1c2a38] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              สวัสดี คุณธันวา 👋
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              วันพฤหัสบดีที่ 15 ตุลาคม 2569 · คำขอรอคุณอนุมัติ <span className="font-semibold text-[#00a86b]">3 รายการ</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input (TailGrids Input Style) */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="ค้นหาคำขอ..."
                className="w-full md:w-64 pl-10 pr-4 py-2.5 bg-white rounded-full text-sm border border-gray-200 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              />
            </div>

            {/* Notification Button */}
            <button className="p-2.5 bg-white rounded-full border border-gray-200 hover:bg-gray-50 relative transition">
              <BellIcon />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Create Request Button (TailGrids Button Style) */}
            <button className="inline-flex items-center justify-center gap-2 bg-[#00875a] text-white px-5 py-2.5 rounded-full hover:bg-[#00704a] transition-all text-sm font-medium shadow-sm">
              <PlusIcon />
              สร้างคำขอ
            </button>
          </div>
        </header>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Budget */}
          <div className="bg-[#0e4b3e] text-white p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between h-44 shadow-sm">
            <div className="relative z-10">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-xs text-emerald-200">
                  <WalletIcon />
                  <span>งบแผนกคงเหลือ</span>
                </div>
                <span className="text-xs bg-white/10 px-2.5 py-0.5 rounded-full text-emerald-200">
                  ปี 2569
                </span>
              </div>
              <div className="mt-2">
                <div className="text-3xl font-bold tracking-tight">฿128,400</div>
                <div className="text-xs text-emerald-300/80 mt-1">จากงบทั้งปี ฿300,000</div>
              </div>
            </div>

            <div className="relative z-10">
              <div className="flex justify-between text-xs text-emerald-200 mb-1.5">
                <span></span>
                <span>ใช้ไปแล้ว 57%</span>
              </div>
              <div className="w-full bg-emerald-950/60 h-2 rounded-full overflow-hidden">
                <div className="bg-[#00e699] h-full rounded-full transition-all duration-500" style={{ width: '57%' }}></div>
              </div>
            </div>
          </div>

          {/* Card 2: Pending Count */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col justify-between h-44 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <ClockIcon />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400">กำลังดำเนินการ</div>
              <div className="text-3xl font-bold mt-1 text-gray-800">
                3 <span className="text-base font-normal text-gray-500">รายการ</span>
              </div>
            </div>
          </div>

          {/* Card 3: Approved Budget */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col justify-between h-44 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircleIcon />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-400">อนุมัติแล้วปีนี้</div>
              <div className="text-3xl font-bold mt-1 text-gray-800">฿45,200</div>
            </div>
          </div>

        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-100 space-y-6 shadow-sm">
            
            {/* Section: รอคุณตรวจสอบ */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-lg text-gray-800">รอคุณตรวจสอบ</h2>
                  <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                    3
                  </span>
                </div>
                <button className="text-xs font-medium text-emerald-700 hover:underline flex items-center gap-1">
                  ดูทั้งหมด <ArrowRightIcon />
                </button>
              </div>

              <div className="space-y-3">
                {/* Item 1 */}
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm shrink-0">
                      เน
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-800">ค่าเดินทางสัมมนา เชียงใหม่</div>
                      <div className="text-xs text-gray-400">คุณเนส ส่งเมื่อ 2 ชม.ที่แล้ว</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-full border border-amber-200">
                      รอ 2 ชม.
                    </span>
                    <div className="font-bold text-sm">฿12,500</div>
                    <button className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1">
                      ตรวจสอบ <ArrowRightIcon />
                    </button>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-sm shrink-0">
                      เฟ
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-800">ค่าจ้างออกแบบโปสเตอร์</div>
                      <div className="text-xs text-gray-400">คุณเฟส ส่งเมื่อวานนี้</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-full border border-amber-200">
                      รอ 1 วัน
                    </span>
                    <div className="font-bold text-sm">฿8,000</div>
                    <button className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1">
                      ตรวจสอบ <ArrowRightIcon />
                    </button>
                  </div>
                </div>

                {/* Skeleton Loader Item */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
                    <div className="space-y-2 w-full">
                      <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-3/4" />
                      <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-1/3" />
                    </div>
                  </div>
                  <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-20 shrink-0" />
                </div>
              </div>

              {/* Notice Banner */}
              <div className="mt-4 bg-gray-50 border border-gray-200/60 rounded-xl p-3 flex items-center gap-2 text-xs text-gray-500">
                <CheckCircleIcon className="w-4 h-4 text-gray-400" />
                <span>คำขอที่รอเกิน 3 วันระบบจะแจ้งเตือนคุณอีกครั้ง</span>
              </div>
            </div>

            {/* Section: อนุมัติล่าสุด */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg text-gray-800">อนุมัติล่าสุด</h2>
                <button className="text-xs font-medium text-emerald-700 hover:underline flex items-center gap-1">
                  ดูประวัติ <ArrowRightIcon />
                </button>
              </div>

              <div className="space-y-3">
                {/* Skeleton Item 1 */}
                <div className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
                    <div className="space-y-2 w-full">
                      <div className="h-3 bg-gray-100 rounded-full animate-pulse w-2/3" />
                      <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-1/4" />
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="h-3 bg-gray-100 rounded-full animate-pulse w-16" />
                    <span className="bg-emerald-50 text-emerald-600 text-xs px-3 py-1 rounded-full font-medium">
                      อนุมัติแล้ว
                    </span>
                  </div>
                </div>

                {/* Skeleton Item 2 */}
                <div className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
                    <div className="space-y-2 w-full">
                      <div className="h-3 bg-gray-100 rounded-full animate-pulse w-2/3" />
                      <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-1/4" />
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="h-3 bg-gray-100 rounded-full animate-pulse w-16" />
                    <span className="bg-emerald-50 text-emerald-600 text-xs px-3 py-1 rounded-full font-medium">
                      อนุมัติแล้ว
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-100 space-y-6 shadow-sm">
            
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg text-gray-800">คำขอของฉัน</h2>
              <button className="text-xs font-medium text-emerald-700 hover:underline flex items-center gap-1">
                ดูทั้งหมด <ArrowRightIcon />
              </button>
            </div>

            <div className="space-y-6">
              
              {/* Item 1 */}
              <div className="space-y-3 pb-4 border-b border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-gray-800">ซื้อคอมพิวเตอร์ให้ทีม 2 เครื่อง</h3>
                    <p className="text-xs text-gray-400 mt-0.5">ส่งเมื่อ 14 ต.ค. <span className="font-semibold text-gray-700">฿56,000</span></p>
                  </div>
                  <span className="bg-amber-50 text-amber-700 text-xs px-2.5 py-0.5 rounded-full font-medium border border-amber-200">
                    รออนุมัติ
                  </span>
                </div>

                {/* Stepper */}
                <div className="relative flex items-center justify-between pt-2 px-2">
                  <div className="absolute left-6 right-6 top-[18px] h-0.5 bg-gray-200">
                    <div className="h-full bg-emerald-500 w-1/2"></div>
                  </div>
                  
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[10px] text-gray-400">ส่งคำขอ</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-white border-2 border-emerald-500 border-dashed flex items-center justify-center" />
                    <span className="text-[10px] font-semibold text-emerald-700">หัวหน้าสายงาน</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center" />
                    <span className="text-[10px] text-gray-400">ฝ่ายบัญชี</span>
                  </div>
                </div>
              </div>

              {/* Item 2 */}
              <div className="space-y-3 pb-4 border-b border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-gray-800">ค่าจัดงานเปิดตัวสินค้า</h3>
                    <p className="text-xs text-gray-400 mt-0.5">ส่งเมื่อ 12 ต.ค. <span className="font-semibold text-gray-700">฿48,000</span></p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
                    อนุมัติแล้ว
                  </span>
                </div>

                {/* Stepper */}
                <div className="relative flex items-center justify-between pt-2 px-2">
                  <div className="absolute left-6 right-6 top-[18px] h-0.5 bg-emerald-500"></div>
                  
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[10px] text-gray-400">ส่งคำขอ</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700">หัวหน้าสายงาน</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[10px] text-gray-400">ฝ่ายบัญชี</span>
                  </div>
                </div>
              </div>

              {/* Item 3 */}
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-gray-800">ค่ารับรองลูกค้าองค์กร</h3>
                    <p className="text-xs text-gray-400 mt-0.5">ส่งเมื่อ 28 ก.ย. <span className="font-semibold text-gray-700">฿15,600</span></p>
                  </div>
                  <span className="bg-rose-50 text-rose-600 text-xs px-2.5 py-0.5 rounded-full font-medium border border-rose-200">
                    ถูกตีกลับ
                  </span>
                </div>

                {/* Stepper */}
                <div className="relative flex items-center justify-between pt-2 px-2">
                  <div className="absolute left-6 right-6 top-[18px] h-0.5 bg-gray-200">
                    <div className="h-full bg-rose-400 w-1/2"></div>
                  </div>
                  
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[10px] text-gray-400">ส่งคำขอ</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center">
                      <XCircleIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-700">หัวหน้าสายงาน</span>
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center" />
                    <span className="text-[10px] text-gray-400">ฝ่ายบัญชี</span>
                  </div>
                </div>

                {/* Alert Box */}
                <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-2.5 flex items-center justify-between text-xs text-rose-600">
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    <InfoIcon className="text-rose-500 shrink-0" />
                    <span className="truncate">
                      <strong className="font-semibold">เหตุผล:</strong> แนบใบเสร็จไม่ครบ ขาดใบเสร็จค่าอาหาร...
                    </span>
                  </div>
                  <button className="font-semibold hover:underline shrink-0 flex items-center gap-0.5">
                    ดูทั้งหมด <ArrowRightIcon />
                  </button>
                </div>
              </div>

            </div>

            {/* Bottom Notice */}
            <div className="bg-gray-50 border border-gray-200/60 rounded-xl p-3 flex items-center justify-center gap-2 text-xs text-gray-500 mt-6">
              <CheckCircleIcon className="w-4 h-4 text-gray-400" />
              <span>คำขอของคุณจะถูกส่งให้หัวหน้าสายงานอนุมัติ</span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}