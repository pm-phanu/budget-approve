import { useRouter } from "next/navigation";
import { getUsers, type Credential } from "@/data/credential";

type Router = ReturnType<typeof useRouter>;

const CURRENT_USER_KEY = "current_user";

export const getCurrentUser = (): Credential | null => {
  const stored = localStorage.getItem(CURRENT_USER_KEY);

  if (!stored) return null;
  try {
    const user = JSON.parse(stored) as Credential;

    if (!user.id || !user.username || !user.role) return null;

    // current_user เป็นภาพ ณ ตอน login → ถ้าข้อมูลผู้ใช้เปลี่ยนทีหลัง (เช่น เพิ่ม departmentId)
    // ให้ใช้ข้อมูลล่าสุดจากรายชื่อผู้ใช้ (ไม่รวมรหัสผ่าน)
    const latest = getUsers().find((u) => u.id === user.id);
    if (!latest) return user;
    const fresh: Credential = { ...latest };
    delete (fresh as { password?: string }).password;
    return fresh;
  } catch {
    return null;
  }
};

export const checkLogin = (router: Router, returnPath: string) => {
  const user = getCurrentUser();

  if (!user) {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.setItem("returnPath", returnPath);
    router.replace("/login");
    return null;
  }
  return user;
};

export const doLogout = (router: Router) => {
  localStorage.removeItem(CURRENT_USER_KEY);
  router.replace("/login");
};

export const checkGuest = (router: Router): boolean => {
  const user = getCurrentUser()

  if(user) {
    router.replace('/')
    return false // login อยู่แล้ว ไม่ใช่ guest
  }
  return true // ยังไม่ login อยู่หน้านี้ได้
}

export const getHomePath = (role: Credential["role"]) => {
  if (role === "EMPLOYEE") return "/"
  if (role === "HEAD") return "/home-department-head";
  if (role === "ACCOUNTANT_ADMIN") return "/home-account";
  if (role === "DIRECTOR") return "#"
  if (role === "FINANCE") return "#"
  if (role === "MANAGING_DIRECTOR") return "#"
  return "/";
};

export const HOME_PATHS: Record<Credential["role"], string> = {
  EMPLOYEE: "/",
  HEAD: "/home-department-head",
  DIRECTOR: "#",
  MANAGING_DIRECTOR: "#",
  ACCOUNTANT_ADMIN: "/home-account",
  FINANCE: "#",
}