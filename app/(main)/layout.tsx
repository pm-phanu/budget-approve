"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/tailgrids/core/sidebar";
import {
  MenuHamburger1,
  ClockThree,
  DashboardSquare1,
  Exit,
  FileText,
  Gear1,
  Plus,
  UserMultiple4,
  FileTextMultiple,
  CheckCircle1,
  TrendUp2,
  Bank1,
  Dollar,
} from "@tailgrids/icons";
import { forwardRef, Suspense, SVGProps, useEffect, useState } from "react";
import { mergeProps } from "react-aria";
import { Button } from "@/components/tailgrids/core/button";
import { Link } from "@/components/tailgrids/core/link";
import { NotificationBell } from "@/components/notification-bell";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Credential, User } from "@/data/credential";
import { getRoleLabel, isApproverRole } from "@/data/approval"
import { getUserAffiliation, loadOrganization } from "@/data/organization";
import { checkLogin, doLogout, getHomePath, HOME_PATHS } from "@/utils/login";
import { HEADER_SEARCH_EVENT } from "@/utils/search";
import { SearchField } from "@/components/search-field";
import { ActionPopup } from "@/components/action-popup";

type Role = User['role']

type MenuItem = {
  title: string,
  url: string,
  icon: React.FunctionComponent<SVGProps<SVGSVGElement>>
  roles?: Role[]
  // true = เฉพาะผู้อนุมัติ (ตำแหน่งในตัว + ที่ฝ่ายบัญชีเพิ่มเอง + บัญชี / การเงิน) ดู isApproverRole
  approverOnly?: boolean
  // true = เฉพาะผู้ดูแลระบบ (user.isAdmin) ไม่ดู role
  adminOnly?: boolean
  group: "main" | "approval" | "manage" | "report" | "pay"
}

const mainItems: MenuItem[] = [
  { title: "สร้างคำขอ", url: "/request", icon: Plus, group: "main" },
  { title: "คำขอของฉัน", url: "/my-request", icon: FileText, group: "main" },
  { title: "ประวัติการเบิก", url: "/withdraw-history", icon: ClockThree, group: "main" },
];

const manageItems: MenuItem[] = [
  { title: "ตั้งงบประมาณ", url: "/home-account/budget", icon: Plus, adminOnly: true, group: "manage" },
  { title: "จัดการผู้ใช้และสิทธิ์", url: "/home-account/setting", icon: UserMultiple4, adminOnly: true, group: "manage" },

]

const approveItems: MenuItem[] = [
  { title: "ประวัติการอนุมัติ", url: "/approval-history", icon: CheckCircle1, approverOnly: true, group: "approval" },
  { title: "คำขอรออนุมัติทั้งหมด", url: "/all-request", icon: FileTextMultiple, approverOnly: true, group: "approval" },

]

const reportItems: MenuItem[] = [
  { title: "รายงานงบประมาณ", url: "/home-account/report", icon: TrendUp2, roles: ["ACCOUNTANT"], group: "report" },
]

const payItems: MenuItem[] = [
  // การเงินทำงานแบบเดียวกับผู้อนุมัติ: รายการรอทำ + ประวัติที่ตัวเองทำ (ไม่มีกลุ่ม "การอนุมัติ")
  { title: "คำขอทำจ่าย", url: "/pay-request", icon: Bank1, roles: ["FINANCE"], group: "pay" },
  { title: "ประวัติการทำจ่าย", url: "/pay-history", icon: Dollar, roles: ["FINANCE"], group: "pay" },
]

// ผู้ใช้นี้เห็น / เข้าเมนูนี้ได้ไหม (ใช้ทั้งใน sidebar และ route guard)
function canAccess(item: MenuItem, user: { role: string; isAdmin?: boolean }) {
  if (item.adminOnly) return !!user.isAdmin
  // การเงินอนุมัติด้วยการทำจ่าย → ใช้เมนูกลุ่ม "การทำจ่าย" แทน
  if (item.approverOnly) return isApproverRole(user.role) && user.role !== "FINANCE"
  return !item.roles || item.roles.includes(user.role)
}

// รวมทุกหมวดเป็นก้อนเดียว: route guard กับ breadcrumb ใช้ค้นหาเมนูจาก pathname
const items: MenuItem[] = [...mainItems, ...approveItems, ...manageItems, ...reportItems, ...payItems]

// เมนูที่ไฮไลต์ = url ตรงกับหน้าปัจจุบัน หรือเป็นหน้าย่อยของเมนูนั้น (เช่น /home-account/approve → แดชบอร์ดบัญชี)
// เอาเมนูที่ url ยาวสุดที่เข้ากัน · "/" ไม่นับแบบหน้าย่อย (ไม่งั้นทุกหน้าเป็นแดชบอร์ด)
function activeUrl(list: MenuItem[], pathname: string) {
  return list
    .filter((item) => item.url === pathname || (item.url !== "/" && pathname.startsWith(item.url + "/")))
    .sort((a, b) => b.url.length - a.url.length)[0]?.url
}

// เมนูที่เลือกอยู่: พื้นเขียวเข้ม ตัวขาว (ขาวบน #047857 = 5.5:1 อ่านชัด) ให้เห็นชัดบนแถบเมนูสีเข้ม
const ACTIVE_MENU = "data-[active=true]:bg-[#047857] data-[active=true]:font-semibold data-[active=true]:text-white"

function renderMenuItems(list: MenuItem[], active: string | undefined) {
  return list.map((item) => (
    <SidebarMenuItem key={item.title + item.url}>
      <SidebarMenuButton
        tooltip={item.title}
        isActive={item.url === active}
        className={ACTIVE_MENU}
        render={({ ref, ...props }) => (
          <SidebarMenuItemLink
            title={item.title}
            url={item.url}
            icon={item.icon}
            aria-current={item.url === active ? "page" : undefined}
            ref={ref as React.Ref<HTMLAnchorElement>}
            {...props}
          />
        )}
      />
    </SidebarMenuItem>
  ))
}


export default function RootLayout({ children }: { children: React.ReactNode }) {

  const router = useRouter()
  const pathname = usePathname()

  const [user, setUser] = useState<Credential | null>(null)
  const [headerQuery, setHeaderQuery] = useState("") // คำค้นในช่องบน header
  const [askLogout, setAskLogout] = useState(false) // ป็อปอัพยืนยันออกจากระบบ

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- อ่าน localStorage ได้หลังเปิดหน้าเท่านั้น */
    const currentUser = checkLogin(router, pathname)

    if(!currentUser) {
      setUser(null)
      return
    } 

    const menu = items.find((item) => item.url === pathname)

    // หน้าแดชบอร์ดของ role อื่น (เช่น EMPLOYEE เปิด /home-account) → ไม่ให้เข้า
    const isOtherHome =
      Object.values(HOME_PATHS).includes(pathname) &&
      pathname !== getHomePath(currentUser.role)

    if (isOtherHome || (menu && !canAccess(menu, currentUser))) {
      setUser(null)
      router.replace(getHomePath(currentUser.role))
      return
    }

    setUser(currentUser)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [router, pathname])

  if(!user) return null 

  const visibleItems = items.filter(
    (item) => canAccess(item, user),
  )

  const dashboardItem: MenuItem = {
    title: "แดชบอร์ด",
    url: getHomePath(user.role),
    icon: DashboardSquare1,
    group: "main",
  }
  const mainItems = [
    dashboardItem,
    ...visibleItems.filter((item) => item.group === "main"),
  ]
  const approvalItems = visibleItems.filter((item) => item.group === "approval")
  const active = activeUrl([dashboardItem, ...visibleItems], pathname)
  const manageUserItems = visibleItems.filter((item) => item.group === "manage")
  const report = visibleItems.filter((item) => item.group === "report")
  const pay = visibleItems.filter((item) => item.group === "pay")

  // breadcrumb บน header: "แดชบอร์ด / ชื่อหน้าปัจจุบัน" (ชื่อหน้าดึงจาก items)
  const homePath = getHomePath(user.role)
  const isApprovePage = pathname.endsWith("/approve")
  // รายละเอียดคำขอของฉัน: แดชบอร์ด / คำขอของฉัน / รหัสคำขอ
  const isMyRequestDetail = pathname === "/my-request/detail"
  // รายละเอียดทำจ่าย: แดชบอร์ด / คำขอทำจ่าย / รหัสคำขอ
  const isPayDetail = pathname === "/home-finance/pay"
  const currentTitle =
    pathname !== homePath
      ? (items.find((item) => item.url === pathname)?.title ??
        (pathname === "/setting" ? "การตั้งค่า" : undefined)) // ปุ่มท้าย sidebar ไม่ได้อยู่ใน items
      : undefined
  const isHome = !currentTitle && !isApprovePage && !isMyRequestDetail && !isPayDetail

  // สังกัดของผู้ใช้: ชั้นที่ลึกสุด (แผนก > ฝ่าย > สายงาน) เด่นสุด เพราะเป็นหน่วยที่ทำงานจริงทุกวัน
  const { lineOfWork, division, department } = getUserAffiliation(loadOrganization(), user)
  const mainUnit = department?.name ?? division?.name ?? lineOfWork?.name ?? (user.role === "MANAGING_DIRECTOR" ? "ทั้งบริษัท" : "ยังไม่กำหนดสังกัด")
  const parentUnits = [department && division?.name, (department || division) && lineOfWork?.name].filter(Boolean).join(" · ")
  const roleLabel = user.role === "EMPLOYEE" ? "พนักงาน" : getRoleLabel(user.role)

  const handleLogout = () => setAskLogout(true)

  // ช่องค้นหาบน header: ค้นในรายการหลักของ role นี้
  // การเงิน = คำขอทำจ่าย · ผู้อนุมัติ = คำขอรออนุมัติทั้งหมด · คนอื่น = คำขอของฉัน
  const searchTarget =
    user.role === "FINANCE"
      ? { path: "/pay-request", label: "ค้นหาคำขอทำจ่าย" }
      : isApproverRole(user.role)
        ? { path: "/all-request", label: "ค้นหาคำขอรออนุมัติ" }
        : { path: "/my-request", label: "ค้นหาคำขอของฉัน" }

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const q = String(new FormData(event.currentTarget).get("q") ?? "").trim()
    router.push(q ? `${searchTarget.path}?q=${encodeURIComponent(q)}` : searchTarget.path)
    // อยู่หน้านั้นอยู่แล้ว → หน้าไม่โหลดใหม่ จึงบอกคำค้นผ่าน event
    if (pathname === searchTarget.path) {
      window.dispatchEvent(new CustomEvent(HEADER_SEARCH_EVENT, { detail: q }))
    }
  }

  return (
    <div className="flex h-screen w-full print:block print:h-auto">
      <SidebarProvider className="h-full print:block print:h-auto">
        <Sidebar className="h-full bg-[#0F172A] text-[#CBD5E1] py-5 print:hidden">
          <SidebarHeader className="p-4 flex-row items-center">
            <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#059669] text-white">
              ฿
            </span>
            <span className="text-2xl text-white font-bold">budget flow</span>
          </SidebarHeader>

          {/* ผู้ใช้รู้ว่าตัวเองอยู่ แผนก / ฝ่าย / สายงาน ไหน · แก้สังกัดได้ที่ จัดการผู้ใช้ (ผู้ดูแลระบบ) */}
          <section aria-label="ข้อมูลผู้ใช้และสังกัด" className="mx-4 mt-2 rounded-lg bg-[#1E293B] p-3">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <span className="text-sm text-[#CBD5E1]">{user.fullName}</span>
              <span className="shrink-0 rounded-full bg-[#059669]/20 px-2 py-0.5 text-xs font-medium text-[#6EE7B7]">{roleLabel}</span>
            </div>
            <p className="mt-2 text-base font-semibold leading-snug text-white">{mainUnit}</p>
            {parentUnits && <p className="mt-0.5 text-xs leading-snug text-[#94A3B8]">{parentUnits}</p>}
          </section>

          <SidebarContent className="flex flex-col gap-8 px-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-[16px] font-bold">
                เมนูหลัก
              </SidebarGroupLabel>

              <SidebarGroupContent>
                <SidebarMenu>{renderMenuItems(mainItems, active)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

             {manageUserItems.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-[16px] font-bold">
                  จัดการระบบ
                </SidebarGroupLabel>

                <SidebarGroupContent>
                  <SidebarMenu>{renderMenuItems(manageUserItems, active)}</SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {pay.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-[16px] font-bold">
                  การทำจ่าย
                </SidebarGroupLabel>

                <SidebarGroupContent>
                  <SidebarMenu>{renderMenuItems(pay, active)}</SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {approvalItems.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-[16px] font-bold">
                  การอนุมัติ
                </SidebarGroupLabel>

                <SidebarGroupContent>
                  <SidebarMenu>{renderMenuItems(approvalItems, active)}</SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {report.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-[16px] font-bold">
                  รายงาน
                </SidebarGroupLabel>

                <SidebarGroupContent>
                  <SidebarMenu>{renderMenuItems(report, active)}</SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}


            <SidebarGroup>
              <SidebarGroupLabel className="text-[16px] font-bold">
                บัญชี
              </SidebarGroupLabel>

              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="การตั้งค่า"
                      isActive={pathname === "/setting"}
                      aria-current={pathname === "/setting" ? "page" : undefined}
                      className={ACTIVE_MENU}
                      onPress={() => router.push("/setting")}
                    >
                      <Gear1 />
                      <span>การตั้งค่า</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuButton tooltip="ออกจากระบบ" onPress={handleLogout}>
                    <Exit />
                    <span>ออกจากระบบ</span>
                  </SidebarMenuButton>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex justify-between h-14 items-center gap-4 bg-[#F8FAFC] text-[#111] p-9 pt-15 print:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger aria-label="เปิด/ปิดเมนู">
                <MenuHamburger1 />
              </SidebarTrigger>

              {/* เส้นคั่น: แยกปุ่มเมนูออกจาก breadcrumb ให้ชัด */}
              <span className="h-6 w-px bg-[#CBD5E1]" aria-hidden="true" />

              <nav aria-label="breadcrumb" className="flex min-w-0 items-center gap-2 whitespace-nowrap text-lg">
                <Link
                  href={homePath}
                  className={
                    isHome
                      ? "font-semibold text-[#111]"
                      : "text-[#64748B] hover:text-[#047857] hover:underline"
                  }
                >
                  แดชบอร์ด
                </Link>
                {currentTitle && (
                  <>
                    <span className="text-[#64748B]">/</span>
                    <span className="font-semibold text-[#047857]">{currentTitle}</span>
                  </>
                )}
                {isMyRequestDetail && (
                  <>
                    <span className="text-[#64748B]">/</span>
                    <Link href="/my-request" className="text-[#64748B] hover:text-[#047857] hover:underline">
                      คำขอของฉัน
                    </Link>
                  </>
                )}
                {isPayDetail && (
                  <>
                    <span className="text-[#64748B]">/</span>
                    <Link href="/pay-request" className="text-[#64748B] hover:text-[#047857] hover:underline">
                      คำขอทำจ่าย
                    </Link>
                  </>
                )}
                {(isApprovePage || isMyRequestDetail || isPayDetail) && (
                  <Suspense fallback={null}>
                    <RequestIdCrumb />
                  </Suspense>
                )}
              </nav>
            </div>

            <div className="menuLinks flex items-center gap-4">
              {/* ค้นหา: กด Enter → ไปหน้ารายการหลักของ role พร้อมคำค้น (utils/search.ts) */}
              <form role="search" onSubmit={handleSearch} className="w-64 lg:w-80">
                <SearchField
                  id="header-search"
                  name="q"
                  label={searchTarget.label}
                  value={headerQuery}
                  onChange={setHeaderQuery}
                  placeholder={`${searchTarget.label}...`}
                  title="พิมพ์ชื่อคำขอ ผู้ขอ หรือเลขที่ แล้วกด Enter"
                />
              </form>
              <NotificationBell user={user} />
              <div className="shadow-2xl">
                <Button variant={"success"} className="whitespace-nowrap" onPress={() => router.push("/request")}>
                  <Plus />
                  สร้างคำขอ
                </Button>
              </div>
            </div>
          </header>

          {/* relative: ข้อความ sr-only (position absolute) ต้องอยู่ในกรอบ main ไม่งั้นดันทั้งหน้ายาว → scroll bar 2 อัน */}
          <main className="relative flex-1 overflow-auto p-9 bg-[#F8FAFC] print:overflow-visible print:bg-white print:p-0">
            <div>{children}</div>
          </main>
        </div>
      </SidebarProvider>
      <ActionPopup
        open={askLogout}
        tone="warning"
        title="ออกจากระบบ?"
        message="งานที่ยังไม่ได้บันทึกในหน้านี้จะหายไป"
        confirmLabel="ออกจากระบบ"
        onConfirm={() => {
          setAskLogout(false)
          doLogout(router)
        }}
        onCancel={() => setAskLogout(false)}
      />
    </div>
  );
}

// breadcrumb ส่วนท้ายของหน้า approve: แสดงรหัสคำขอจาก ?id=
// useSearchParams ต้องอยู่ใน Suspense ไม่งั้น build ของ Next.js จะ error
function RequestIdCrumb() {
  const id = useSearchParams().get("id")
  if (!id) return null
  return (
    <>
      <span className="text-[#64748B]">/</span>
      <span className="font-semibold text-[#047857]">{id}</span>
    </>
  )
}

const SidebarMenuItemLink = forwardRef<
  HTMLAnchorElement,
  {
    title: string;
    url: string;
    icon: React.FunctionComponent<SVGProps<SVGSVGElement>>;
    // SidebarMenuButton ส่ง props ที่พิมพ์ไว้สำหรับ <button> มาให้ <a> → ชนิดไม่ตรงกัน จึงรับแบบ any (mergeProps รวมให้)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
>(({ title, url, icon: Icon, ...props }, ref) => {
  return (
    <a
      {...mergeProps(props, {
        href: url,
        className: "flex items-center gap-2",
      })}
      ref={ref}
    >
      <Icon />
      <span>{title}</span>
    </a>
  );
});
SidebarMenuItemLink.displayName = "SidebarMenuItemLink";
