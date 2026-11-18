// บัญชีธนาคารสำหรับรับเงินคืน (คำขอแบบสำรองจ่าย)
export type BankAccount = {
  bank: string; // เช่น "กสิกรไทย"
  number: string; // เลขบัญชี (ข้อมูลตัวอย่าง)
  name: string; // ชื่อบัญชี
};

export type User = {
  id: string;
  username: string;
  fullName: string;
  role: "EMPLOYEE" | "HEAD" | "DIRECTOR" | "MANAGING_DIRECTOR" | "ACCOUNTANT_ADMIN" | "FINANCE";
  email?: string;
  password?: string;
  // แผนกที่สังกัด → อ้างถึง departments ใน data/organization.ts
  // null = ไม่สังกัดแผนก (ผอ.ฝ่าย / กรรมการผู้จัดการ / ผู้ลงทะเบียนใหม่ที่ยังไม่ได้กำหนด)
  // ※ optional เพื่อให้ข้อมูลเก่าใน localStorage ยังอ่านได้
  departmentId?: string | null;
  bankAccount?: BankAccount | null;
  // ※ departmentInfo / hierarchy: ของเดิมที่หลายหน้ายังใช้อยู่ เก็บคู่ไปก่อน
  //   ข้อมูลจริงให้ดูจาก departmentId + data/organization.ts
  departmentInfo: {
    lineOfWork: string;
    department: string;
  };
  hierarchy?: {
    headId: string | null;
    directorId: string | null;
  };
  status: "ACTIVE" | "INACTIVE";
};

// ────────────────────────────────────────────────────────────
//  ข้อมูลตัวอย่าง (ผังองค์กรดู data/organization.ts)
//
//  ฝ่ายบัญชีและการเงินองค์กร (ผอ. u_03)
//    ├─ แผนกงบประมาณฯ   หัวหน้า u_02 · พนักงาน u_01
//    ├─ แผนกบัญชีทั่วไป   u_04, u_07
//    └─ แผนกการเงินฯ     u_05
//  ฝ่ายการตลาด (ยังไม่มี ผอ.)
//    └─ การตลาด         หัวหน้า u_08 · พนักงาน u_09
//  กรรมการผู้จัดการ       u_06
//
//  รหัสผ่านทุกคน = "pass" (ข้อมูลทดสอบเท่านั้น)
// ────────────────────────────────────────────────────────────
export const users: User[] = [
  {
    id: "u_01",
    username: "phanu",
    fullName: "ภาณุ ศรีบุญเพ็ง",
    email: "riampaat@gmail.com",
    password: "pass",
    role: "EMPLOYEE",
    departmentId: "DP01",
    bankAccount: { bank: "กสิกรไทย", number: "xxx-x-x4521-x", name: "ภาณุ ศรีบุญเพ็ง" },
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
    fullName: "หัวหน้าแผนกงบประมาณ",
    role: "HEAD",
    password: "pass",
    departmentId: "DP01",
    departmentInfo: {
      lineOfWork: "สายงานบัญชีและการเงิน",
      department: "แผนกงบประมาณและควบคุมต้นทุน",
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
    password: "pass",
    departmentId: null, // ผอ. ดูแลทั้งฝ่าย DV01 (ดู directorId ใน organization.ts)
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
    password: "pass",
    role: "ACCOUNTANT_ADMIN",
    departmentId: "DP02",
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
    password: "pass",
    departmentId: "DP03",
    departmentInfo: {
      lineOfWork: "สายงานบัญชีและการเงิน",
      department: "แผนกการเงินและทำจ่าย",
    },
    status: "ACTIVE",
  },
  {
    id: "u_06",
    username: "md",
    fullName: "กรรมการผู้จัดการ",
    role: "MANAGING_DIRECTOR",
    password: "pass",
    departmentId: null, // ระดับบริษัท (managingDirectorId ใน organization.ts)
    departmentInfo: {
      lineOfWork: "-",
      department: "กรรมการผู้จัดการ",
    },
    status: "ACTIVE",
  },
  {
    id: "u_07",
    username: "accountant_2",
    fullName: "เจ้าหน้าที่บัญชี 2",
    role: "ACCOUNTANT_ADMIN",
    password: "pass",
    departmentId: "DP02",
    departmentInfo: {
      lineOfWork: "สายงานบัญชีและการเงิน",
      department: "แผนกบัญชีทั่วไป",
    },
    status: "ACTIVE",
  },
  {
    id: "u_08",
    username: "head_mkt",
    fullName: "หัวหน้าแผนกการตลาด",
    role: "HEAD",
    password: "pass",
    departmentId: "DP05",
    departmentInfo: {
      lineOfWork: "สายงานธุรกิจและปฏิบัติการ",
      department: "การตลาด",
    },
    hierarchy: {
      headId: null,
      directorId: null, // ฝ่ายการตลาดยังไม่มี ผอ.
    },
    status: "ACTIVE",
  },
  {
    id: "u_09",
    username: "emp_mkt",
    fullName: "พนักงานการตลาด",
    role: "EMPLOYEE",
    password: "pass",
    departmentId: "DP05",
    bankAccount: { bank: "ไทยพาณิชย์", number: "xxx-x-x7788-x", name: "พนักงานการตลาด" },
    departmentInfo: {
      lineOfWork: "สายงานธุรกิจและปฏิบัติการ",
      department: "การตลาด",
    },
    hierarchy: {
      headId: "u_08",
      directorId: null,
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
    "MANAGING_DIRECTOR",
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
    (candidate.status === "ACTIVE" || candidate.status === "INACTIVE")
  );
};

// ข้อมูลเก่าใน localStorage (ก่อนมี departmentId) → เติมฟิลด์ที่ขาดจากข้อมูลตัวอย่าง
// และเพิ่ม user ตัวอย่างใหม่ที่ยังไม่มีในเครื่อง · ไม่ทับค่าที่มีอยู่แล้ว
const mergeWithSeed = (stored: User[]): User[] => {
  const merged = stored.map((user) => {
    const seed = users.find((s) => s.id === user.id);
    if (!seed) return user;
    return {
      ...user,
      departmentId: user.departmentId === undefined ? seed.departmentId : user.departmentId,
      bankAccount: user.bankAccount === undefined ? seed.bankAccount : user.bankAccount,
      password: user.password ?? seed.password,
    };
  });
  const missing = users.filter((s) => !stored.some((u) => u.id === s.id));
  return [...merged, ...missing.map((user) => ({ ...user }))];
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

  const merged = mergeWithSeed(parsedUsers);
  if (JSON.stringify(merged) !== storedUsers) {
    localStorage.setItem(USERS_KEY, JSON.stringify(merged));
  }
  return merged;
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
    departmentId: null, // ผู้ลงทะเบียนใหม่: แอดมินกำหนดแผนกทีหลัง
    bankAccount: null,
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
