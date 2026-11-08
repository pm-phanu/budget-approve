"use client";

import { useRouter } from "next/navigation";

export function auth() {
  const router = useRouter();

  const registerUser = (formData: any) => {
    if (formData.password !== formData.confirmPassword) {
      alert("รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง");
      return;
    }

    const storeUsers = localStorage.getItem("users");
    const usersArray = storeUsers ? JSON.parse(storeUsers) : [];

    const isEmailExist = usersArray.some(
      (user: any) => user.email === formData.email,
    );

    if (isEmailExist) {
      alert("อีเมลนี้มีอยู่ในระบบแล้ว!");
      return;
    }

    const isUserExist = usersArray.some(
      (user: any) => user.username === formData.username,
    );

    if (isUserExist) {
      alert("ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว!");
      return;
    }

    const updateUsers = [...usersArray, formData];
    localStorage.setItem("users", JSON.stringify(updateUsers));

    alert("สมัครสมาชิกสำเร็จ!");
    router.push("/login");
  };

  const loginUser = (formData: any) => {
    const storeUsers = localStorage.getItem("users");
    const usersArray = storeUsers ? JSON.parse(storeUsers) : [];

    const matchUser = usersArray.find(
      (user: any) =>
        user.email === formData.identifier ||
        (user.username === formData.identifier &&
          user.password === formData.password),
    );

    if (matchUser) {
      alert("เข้าสู่ระบบสำเร็จ!");
      localStorage.setItem("currentUser", JSON.stringify(matchUser));
      router.push("/");
    } else {
      alert("ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง!");
    }
  };
  return { registerUser, loginUser };
}
