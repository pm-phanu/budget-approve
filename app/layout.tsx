"use client";

import "./globals.css";
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
  AngleDoubleLeft,
  ChevronLeft,
  ClockThree,
  DashboardSquare1,
  Exit,
  FileText,
  Gear1,
  Plus,
  Search1,
  User2,
} from "@tailgrids/icons";
import { forwardRef, SVGProps } from "react";
import { mergeProps } from "react-aria";

const items = [
  { title: "แดชบอร์ด", url: "#", icon: DashboardSquare1 },
  { title: "สร้างคำขอ", url: "#", icon: Plus },
  { title: "คำขอของฉัน", url: "#", icon: FileText },
  { title: "ประวัตการเบิก", url: "#", icon: ClockThree },
];

const items2 = [{ title: "ออกจากระบบ", url: "#", icon: Exit }];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html>
      <body>
        <div className="flex h-screen w-full">
          <SidebarProvider className="h-full">
            <Sidebar className="h-full bg-[#0F172A] text-[#CBD5E1]">
              <SidebarHeader className="p-4 flex-row items-center">
                <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#059669] text-white">
                  {/* <User2 className="size-4 text-white" /> */}
                  ฿
                </span>
                <span className="text-2xl text-white font-bold">budget flow</span>
              </SidebarHeader>

              <SidebarContent className="px-4">
                <SidebarGroup>
                  <SidebarGroupLabel className="text-[16px] font-bold">เมนูหลัก</SidebarGroupLabel>

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
                  <SidebarGroupLabel className="text-[16px] font-bold">บัญชี</SidebarGroupLabel>

                  <SidebarGroupContent>
                    <SidebarMenu>
                      {items2.map((item) => (
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
              <header className="flex h-14 items-center gap-4 bg-[#F1F5F9] text-[#111] p-9">
                <SidebarTrigger>
                  <AngleDoubleLeft className="group-data-[sidebar=closed]/sidebar-wrapper:rotate-180 duration-300" />
                </SidebarTrigger>
                <p className="text-lg font-semibold">Home</p>
              </header>

              <main className="flex-1 overflow-auto p-9 bg-[#F1F5F9]">
                <div>{children}</div>
              </main>
            </div>
          </SidebarProvider>
        </div>
      </body>
    </html>
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
