"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
  AngleDoubleLeft,
  ClockThree,
  DashboardSquare1,
  Exit,
  FileText,
  Gear1,
  Plus,
} from "@tailgrids/icons";
import { forwardRef, SVGProps, useEffect, useState } from "react";
import { mergeProps } from "react-aria";
import { Button } from "@/components/tailgrids/core/button";
import { Link } from "@/components/tailgrids/core/link";
import { usePathname, useRouter } from "next/navigation";
import { Credential } from "@/data/credential";
import { checkLogin, doLogout } from "@/utils/login";

const items = [
  { title: "แดชบอร์ด", url: "/", icon: DashboardSquare1 },
  { title: "สร้างคำขอ", url: "/request", icon: Plus },
  { title: "คำขอของฉัน", url: "#", icon: FileText },
  { title: "ประวัตการเบิก", url: "#", icon: ClockThree },
];


export default function RootLayout({ children }: { children: React.ReactNode }) {

  const router = useRouter()
  const pathname = usePathname()

  const [user, setUser] = useState<Credential | null>(null)

  useEffect(() => {
    setUser(checkLogin(router, pathname))
  }, [router, pathname])

  if(!user) return null

  const handleLogout = () => doLogout(router)

  return (
    <div className="flex h-screen w-full">
      <SidebarProvider className="h-full">
        <Sidebar className="h-full bg-[#0F172A] text-[#CBD5E1] py-5">
          <SidebarHeader className="p-4 flex-row items-center">
            <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#059669] text-white">
              {/* <User2 className="size-4 text-white" /> */}฿
            </span>
            <span className="text-2xl text-white font-bold">budget flow</span>
          </SidebarHeader>

          <SidebarContent className="flex flex-col gap-8 px-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-[16px] font-bold">
                เมนูหลัก
              </SidebarGroupLabel>

              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
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
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-[16px] font-bold">
                บัญชี
              </SidebarGroupLabel>

              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuButton tooltip="ออกจากระบบ" onPress={handleLogout}>
                    <Exit />
                    <span>ออกจากระบบ</span>
                  </SidebarMenuButton>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Settings">
                  <Gear1 />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 flex-col">
          <header className="flex justify-between h-14 items-center gap-4 bg-[#F1F5F9] text-[#111] p-9 pt-15">
            <div className="flex items-center gap-2">
              <SidebarTrigger>
                <AngleDoubleLeft className="group-data-[sidebar=closed]/sidebar-wrapper:rotate-180 duration-300" />
              </SidebarTrigger>
              <Link href="/" className="text-lg font-semibold">
                แดชบอร์ด
              </Link>
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
                <Button variant={"success"}>
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
