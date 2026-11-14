"use client";

import { useRouter } from "next/navigation";
import { addNotification } from "@/app/notification/noti";
import {
  CURRENT_USER_KEY,
  notifyAuthSessionChange,
} from "@/utils/auth-session";

type RegistrationFormData = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type LoginFormData = {
  identifier: string;
  password: string;
};

type StoredUser = Pick<RegistrationFormData, "username" | "email" | "password">;

function isStoredUser(value: unknown): value is StoredUser {
  return (
    typeof value === "object" &&
    value !== null &&
    "username" in value &&
    typeof value.username === "string" &&
    "email" in value &&
    typeof value.email === "string" &&
    "password" in value &&
    typeof value.password === "string"
  );
}

function getStoredUsers(): StoredUser[] {
  const storedUsers = localStorage.getItem("users");

  if (!storedUsers) {
    return [];
  }

  const users: unknown = JSON.parse(storedUsers);

  if (!Array.isArray(users) || !users.every(isStoredUser)) {
    throw new Error("ข้อมูลผู้ใช้ในเบราว์เซอร์ไม่ถูกต้อง");
  }

  return users;
}

export function useAuth() {
  const router = useRouter();

  const registerUser = (formData: RegistrationFormData) => {
    if (formData.password !== formData.confirmPassword) {
      alert("รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง");
      return;
    }

    const usersArray = getStoredUsers();

    const isEmailExist = usersArray.some((user) => user.email === formData.email);

    if (isEmailExist) {
      alert("อีเมลนี้มีอยู่ในระบบแล้ว!");
      return;
    }

    const isUserExist = usersArray.some(
      (user) => user.username === formData.username,
    );

    if (isUserExist) {
      alert("ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว!");
      return;
    }

    const updateUsers = [...usersArray, formData];
    localStorage.setItem("users", JSON.stringify(updateUsers));
    addNotification({
      userEmail: formData.email,
      category: "auth",
      title: "สมัครสมาชิกสำเร็จ",
      message: `สร้างบัญชีสำหรับ ${formData.username || formData.email} เรียบร้อยแล้ว`,
    });

    alert("สมัครสมาชิกสำเร็จ!");
    router.push("/login");
  };

  const loginUser = (formData: LoginFormData) => {
    const usersArray = getStoredUsers();

    const matchUser = usersArray.find(
      (user) =>
        (user.email === formData.identifier ||
          user.username === formData.identifier) &&
        user.password === formData.password,
    );

    if (matchUser) {
      alert("เข้าสู่ระบบสำเร็จ!");
      localStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify({
          username: matchUser.username,
          email: matchUser.email,
        }),
      );
      addNotification({
        userEmail: matchUser.email,
        category: "auth",
        title: "เข้าสู่ระบบสำเร็จ",
        message: `ยินดีต้อนรับ ${matchUser.username || matchUser.email} เข้าสู่ระบบแจ้งเบิกงบประมาณ`,
      });
      notifyAuthSessionChange();
      router.push("/");
    } else {
      alert("ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง!");
    }
  };
  return { registerUser, loginUser };
}
