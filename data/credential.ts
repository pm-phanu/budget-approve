export type User = {
  id: string;
  username: string;
  fullName: string;
  role: "EMPLOYEE" | "HEAD" | "DIRECTOR" | "MD" | "ACCOUNTANT_ADMIN" | "FINANCE";
  email?: string;
  password?: string;
  departmentInfo: {
    lineOfWork: string;
    department: string;
  };
  hierarchy?: {
    headId: string | null;
    directorId: string | null;
  };
  status: "ACTIVE";
};

export const users: User[] = [
  {
    id: "u_01",
    username: "phanu",
    fullName: "ภาณุ ศรีบุญเพ็ง",
    password: "pass",
    role: "EMPLOYEE",
    departmentInfo: {
      lineOfWork: "สายงานบัญชีและการเงิน",
      department: "แผนกงบประมาณและควบคุมต้นทุน",
    },
    hierarchy: {
      headId: "u_02",
      directorId: "u_03",
    },
    status: "ACTIVE",
  },
  {
    id: "u_02",
    username: "head_dcm",
    fullName: "หัวหน้าแผนก DCM",
    role: "HEAD",
    departmentInfo: {
      lineOfWork: "สายงานธุรกิจและปฏิบัติการ",
      department: "ฝ่ายวาณิชธนกิจ / จัดจำหน่ายตราสารหนี้ (DCM)",
    },
    hierarchy: {
      headId: null,
      directorId: "u_03",
    },
    status: "ACTIVE",
  },
  {
    id: "u_03",
    username: "dir_finance",
    fullName: "ผอ.ฝ่ายการเงิน",
    role: "DIRECTOR",
    departmentInfo: {
      lineOfWork: "สายงานบัญชีและการเงิน",
      department: "ฝ่ายบัญชีและการเงินองค์กร",
    },
    hierarchy: {
      headId: null,
      directorId: null,
    },
    status: "ACTIVE",
  },
  {
    id: "u_04",
    username: "accountant_admin",
    fullName: "เจ้าหน้าที่บัญชีและแอดมิน",
    role: "ACCOUNTANT_ADMIN",
    departmentInfo: {
      lineOfWork: "สายงานบัญชีและการเงิน",
      department: "แผนกบัญชีทั่วไป",
    },
    status: "ACTIVE",
  },
  {
    id: "u_05",
    username: "finance_pay",
    fullName: "เจ้าหน้าที่การเงิน (ทำจ่าย)",
    role: "FINANCE",
    departmentInfo: {
      lineOfWork: "สายงานบัญชีและการเงิน",
      department: "แผนกการเงินและทำจ่าย",
    },
    status: "ACTIVE",
  },
];

export type Credential = Omit<User, "password">;

export type RegistrationInput = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const USERS_KEY = "users";

const isUser = (value: unknown): value is User => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const departmentInfo = candidate.departmentInfo;
  if (typeof departmentInfo !== "object" || departmentInfo === null) {
    return false;
  }

  const department = departmentInfo as Record<string, unknown>;
  const roles = [
    "EMPLOYEE",
    "HEAD",
    "DIRECTOR",
    "MD",
    "ACCOUNTANT_ADMIN",
    "FINANCE",
  ];

  return (
    typeof candidate.id === "string" &&
    typeof candidate.username === "string" &&
    typeof candidate.fullName === "string" &&
    typeof candidate.role === "string" &&
    roles.includes(candidate.role) &&
    (candidate.email === undefined || typeof candidate.email === "string") &&
    (candidate.password === undefined ||
      typeof candidate.password === "string") &&
    typeof department.lineOfWork === "string" &&
    typeof department.department === "string" &&
    candidate.status === "ACTIVE"
  );
};

export const getUsers = (): User[] => {
  if (typeof window === "undefined") return users.map((user) => ({ ...user }));

  const storedUsers = localStorage.getItem(USERS_KEY);
  if (storedUsers === null) {
    const initialUsers = users.map((user) => ({ ...user }));
    localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
    return initialUsers;
  }

  const parsedUsers: unknown = JSON.parse(storedUsers);
  if (!Array.isArray(parsedUsers) || !parsedUsers.every(isUser)) {
    throw new Error("ข้อมูลผู้ใช้ในเครื่องไม่ถูกต้อง กรุณาตรวจสอบ localStorage");
  }
  return parsedUsers;
};

const saveUsers = (nextUsers: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
};

const withoutPassword = (user: User): Credential => {
  const credential = { ...user };
  delete credential.password;
  return credential;
};

export const login = (identifier: string, password: string): Credential => {
  const normalizedIdentifier = identifier.trim().toLocaleLowerCase();
  const user = getUsers().find(
    (candidate) =>
      candidate.status === "ACTIVE" &&
      [candidate.username, candidate.email]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase() === normalizedIdentifier) &&
      candidate.password === password,
  );

  if (!user) {
    throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  }

  const credential = withoutPassword(user);
  localStorage.setItem("current_user", JSON.stringify(credential));
  return credential;
};

export const register = (input: RegistrationInput): Credential => {
  const fullName = input.username.trim();
  const email = input.email.trim().toLocaleLowerCase();
  const password = input.password;

  if (!fullName || !email || !password) {
    throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน");
  }
  if (password !== input.confirmPassword) {
    throw new Error("รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง");
  }
  if (password.length < 8) {
    throw new Error("รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
  }

  const currentUsers = getUsers();
  const existingUser = currentUsers.find(
    (user) =>
      user.username.toLocaleLowerCase() === fullName.toLocaleLowerCase() ||
      user.fullName.toLocaleLowerCase() === fullName.toLocaleLowerCase(),
  );
  const emailOwner = currentUsers.find(
    (user) =>
      user.email?.toLocaleLowerCase() === email && user.id !== existingUser?.id,
  );
  if (emailOwner) {
    throw new Error("อีเมลนี้ถูกลงทะเบียนแล้ว");
  }

  if (existingUser) {
    if (existingUser.password) {
      throw new Error("บัญชีนี้ลงทะเบียนแล้ว กรุณาเข้าสู่ระบบ");
    }

    const updatedUser = { ...existingUser, email, password };
    saveUsers(
      currentUsers.map((user) =>
        user.id === existingUser.id ? updatedUser : user,
      ),
    );
    return withoutPassword(updatedUser);
  }

  const username = email.split("@")[0];
  if (
    currentUsers.some(
      (user) =>
        user.username.toLocaleLowerCase() === username.toLocaleLowerCase(),
    )
  ) {
    throw new Error("ชื่อผู้ใช้จากอีเมลนี้ถูกใช้งานแล้ว");
  }

  const newUser: User = {
    id: `u_${crypto.randomUUID()}`,
    username,
    fullName,
    email,
    password,
    role: "EMPLOYEE",
    departmentInfo: {
      lineOfWork: "",
      department: "",
    },
    hierarchy: {
      headId: null,
      directorId: null,
    },
    status: "ACTIVE",
  };
  saveUsers([...currentUsers, newUser]);
  return withoutPassword(newUser);
};
