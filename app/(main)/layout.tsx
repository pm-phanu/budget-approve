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
  Search1,
  Bell1,
  MenuHamburger1,
  ClockThree,
  DashboardSquare1,
  Exit,
  FileText,
  Gear1,
  Plus,
  UserMultiple4,
  SlidersDoubleHorizontal,
  FileTextMultiple,
  CheckCircle1,
  TrendUp2,
} from "@tailgrids/icons";
import { forwardRef, Suspense, SVGProps, useEffect, useState } from "react";
import { mergeProps } from "react-aria";
import { Button } from "@/components/tailgrids/core/button";
import { Link } from "@/components/tailgrids/core/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Credential, User } from "@/data/credential";
import { isApproverRole } from "@/data/approval";
import { checkLogin, doLogout, getHomePath, HOME_PATHS } from "@/utils/login";

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
  group: "main" | "approval" | "manage" | "report"
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
  { title: "รายงานงบประมาณ", url: "/home-account/report", icon: TrendUp2, roles: ["ACCOUNTANT_ADMIN"], group: "report" },

]

// ผู้ใช้นี้เห็น / เข้าเมนูนี้ได้ไหม (ใช้ทั้งใน sidebar และ route guard)
function canAccess(item: MenuItem, user: { role: string; isAdmin?: boolean }) {
  if (item.adminOnly) return !!user.isAdmin
  if (item.approverOnly) return isApproverRole(user.role)
  return !item.roles || item.roles.includes(user.role)
}

// รวมทุกหมวดเป็นก้อนเดียว: route guard กับ breadcrumb ใช้ค้นหาเมนูจาก pathname
const items: MenuItem[] = [...mainItems, ...approveItems, ...manageItems, ...reportItems]

function renderMenuItems(list: MenuItem[]) {
  return list.map((item) => (
    <SidebarMenuItem key={item.title + item.url}>
      <SidebarMenuButton
        tooltip={item.title}
        render={({ ref, ...props }) => (
          <SidebarMenuItemLink
            title={item.title}
            url={item.url}
            icon={item.icon}
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

  useEffect(() => {
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
  const manageUserItems = visibleItems.filter((item) => item.group === "manage")
  const report = visibleItems.filter((item) => item.group === "report")

  // breadcrumb บน header: "แดชบอร์ด / ชื่อหน้าปัจจุบัน" (ชื่อหน้าดึงจาก items)
  const homePath = getHomePath(user.role)
  const isApprovePage = pathname.endsWith("/approve")
  // รายละเอียดคำขอของฉัน: แดชบอร์ด / คำขอของฉัน / รหัสคำขอ
  const isMyRequestDetail = pathname === "/my-request/detail"
  const currentTitle =
    pathname !== homePath
      ? items.find((item) => item.url === pathname)?.title
      : undefined
  const isHome = !currentTitle && !isApprovePage && !isMyRequestDetail

  const handleLogout = () => doLogout(router)

  return (
    <div className="flex h-screen w-full">
      <SidebarProvider className="h-full">
        <Sidebar className="h-full bg-[#0F172A] text-[#CBD5E1] py-5">
          <SidebarHeader className="p-4 flex-row items-center">
            <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#059669] text-white">
              ฿
            </span>
            <span className="text-2xl text-white font-bold">budget flow</span>
          </SidebarHeader>

          <SidebarContent className="flex flex-col gap-8 px-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-[16px] font-bold">
                เมนูหลัก
              </SidebarGroupLabel>

              <SidebarGroupContent>
                <SidebarMenu>{renderMenuItems(mainItems)}</SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

             {manageUserItems.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-[16px] font-bold">
                  จัดการระบบ
                </SidebarGroupLabel>

                <SidebarGroupContent>
                  <SidebarMenu>{renderMenuItems(manageUserItems)}</SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {approvalItems.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-[16px] font-bold">
                  การอนุมัติ
                </SidebarGroupLabel>

                <SidebarGroupContent>
                  <SidebarMenu>{renderMenuItems(approvalItems)}</SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {report.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-[16px] font-bold">
                  รายงาน
                </SidebarGroupLabel>

                <SidebarGroupContent>
                  <SidebarMenu>{renderMenuItems(report)}</SidebarMenu>
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
                    <SidebarMenuButton tooltip="การตั้งค่า">
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

        <div className="flex flex-1 flex-col">
          <header className="flex justify-between h-14 items-center gap-4 bg-[#F1F5F9] text-[#111] p-9 pt-15">
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
                {(isApprovePage || isMyRequestDetail) && (
                  <Suspense fallback={null}>
                    <RequestIdCrumb />
                  </Suspense>
                )}
              </nav>
            </div>

            <div className="menuLinks flex items-center gap-4">
              <div className="flex justify-center items-center bg-white border border-[#E2E8F0] rounded-lg px-4 shadow-2xl">
                <Search1 />
                <input
                  type="text"
                  placeholder="ค้นหาคำขอ..."
                  className="border-0 focus:ring-0 w-full"
                />
              </div>
              <div className="shadow-2xl">
                {/* เขียนฟังก์ชั่นการแจ้งเตือนที่นี้ */}
                <Button
                  appearance={"outline"}
                  className={"border border-[#E2E8F0]"}
                >
                  <Bell1 />
                </Button>
              </div>
              <div className="shadow-2xl">
                <Button variant={"success"} className="whitespace-nowrap" onPress={() => router.push("/request")}>
                  <Plus />
                  สร้างคำขอ
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-9 bg-[#F1F5F9]">
            <div>{children}</div>
          </main>
        </div>
      </SidebarProvider>
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
