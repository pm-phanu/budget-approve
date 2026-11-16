import { useRouter } from "next/navigation";
import type { Credential } from "@/data/credential";

type Router = ReturnType<typeof useRouter>;

const CURRENT_USER_KEY = "current_user";

export const getCurrentUser = (): Credential | null => {
  const stored = localStorage.getItem(CURRENT_USER_KEY);

  if (!stored) return null;
  try {
    const user = JSON.parse(stored) as Credential;

    if (!user.id || !user.username || !user.role) return null;
    return user;
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
