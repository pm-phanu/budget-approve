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
import { title } from "process";
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
        <div className="flex h-screen w-full rounded-md border border-base-200 overflow-hidden bg-background-100">
          <SidebarProvider className="h-full">
            <Sidebar className="h-full">
              <SidebarHeader className="p-4 flex-row items-center">
                <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-linear-to-r from-cyan-500 to-blue-500 text-text-0">
                  <User2 className="size-4 text-white" />
                </span>
                <span>budget flow</span>
              </SidebarHeader>

              <SidebarContent className="px-4">
                <SidebarGroup>
                  <SidebarGroupLabel>เมนูหลัก</SidebarGroupLabel>

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
                  <SidebarGroupLabel>บัญชี</SidebarGroupLabel>

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
              <header className="flex h-14 items-center gap-4 border-b border-base-200 bg-background-100 px-6">
                <SidebarTrigger>
                  <ChevronLeft className="group-data-[sidebar=closed]/sidebar-wrapper:rotate-180 duration-300" />
                </SidebarTrigger>
                <p className="text-lg font-semibold">Home</p>
              </header>

              <main className="flex-1 overflow-auto p-6 bg-background-50">
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
