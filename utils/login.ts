import type { Credential } from "@/data/credential";
import { useRouter } from "next/navigation";

type Router = ReturnType<typeof useRouter>;

const CURRENT_USER_KEY = "current_user";

const isCredential = (value: unknown): value is Credential => {
  if (typeof value !== "object" || value === null) return false;
  const user = value as Record<string, unknown>;
  const departmentInfo = user.departmentInfo;
  const roles: Credential["role"][] = [
    "EMPLOYEE",
    "HEAD",
    "DIRECTOR",
    "MD",
    "ACCOUNTANT_ADMIN",
    "FINANCE",
  ];

  return (
    typeof user.id === "string" &&
    typeof user.username === "string" &&
    typeof user.fullName === "string" &&
    typeof user.role === "string" &&
    roles.some((role) => role === user.role) &&
    typeof departmentInfo === "object" &&
    departmentInfo !== null &&
    typeof (departmentInfo as Record<string, unknown>).lineOfWork === "string" &&
    typeof (departmentInfo as Record<string, unknown>).department === "string" &&
    user.status === "ACTIVE"
  );
};

export const checkLogin = (router: Router, returnPath: string) => {
  localStorage.setItem("returnPath", returnPath);

  const currentUserString = localStorage.getItem(CURRENT_USER_KEY);
  if (currentUserString !== null) {
    let currentUser: unknown;
    try {
      currentUser = JSON.parse(currentUserString);
    } catch {
      localStorage.removeItem(CURRENT_USER_KEY);
    }

    if (isCredential(currentUser)) {
      router.replace(returnPath);
      router.refresh();
      return;
    }
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  router.replace("/login");
  router.refresh();
};

export const doLogout = (router: Router, returnPath: string) => {
  localStorage.removeItem(CURRENT_USER_KEY);
  router.replace(returnPath);
  router.refresh();
};
