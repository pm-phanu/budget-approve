"use client";

import { useRouter } from "next/navigation";

export function auth() {
  const router = useRouter();

  const registerUser = (formData: any) => {
    if (formData.password !== formData.confirmPassword) {
      alert;
      return;
    }

    const storeUsers = localStorage.getItem("users");
    const usersArray = storeUsers ? JSON.parse(storeUsers) : [];

    const isEmailExist = usersArray.some(
      (user: any) => user.email === formData.email,
    );

    if (isEmailExist) {
      alert;
      return;
    }

    const updateUsers = [...usersArray, formData];
    localStorage.setItem("users", JSON.stringify(updateUsers));

    alert;
    router.push("/login");
  };

  const loginUser = (formData: any) => {
    const storeUsers = localStorage.getItem("users");
    const usersArray = storeUsers ? JSON.parse(storeUsers) : [];

    const matchUser = usersArray.find(
      (user: any) =>
        user.email === formData.email || user.username === formData.username && user.password === formData.password,
    );

    if (matchUser) {
      alert;
      localStorage.setItem("currentUser", JSON.stringify(matchUser));
      router.push("/");
    } else {
      alert;
    }
  };
  return { registerUser, loginUser };
}
