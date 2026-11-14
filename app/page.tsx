"use client";

import { Search1, Bell1, Plus, } from "@tailgrids/icons";
import { Button } from "@/components/tailgrids/core/button";



export default function Home() {
  return (
    <div>
      <div className="container flex items-center justify-between">
        <header>
          สวัสดี <span>[username]</span>
        </header>
        <div className="menuLinks flex items-center gap-4">
          <div className="flex items-center">
            <Search1 />
            <input
              type="text"
              placeholder="ค้นหาคำขอ..."
              className="border border-[#E2E8F0]"
            />
          </div>
          <div>
            <Button appearance={"outline"}>
              <Bell1 />
            </Button>
          </div>
          <div>
            <Button variant={"success"}>
              <Plus />
              สร้างคำขอ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
