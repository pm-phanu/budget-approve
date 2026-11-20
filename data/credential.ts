// role ที่มีในระบบตั้งแต่ต้น
export type BuiltInRole =
  | "EMPLOYEE"
  | "HEAD"
  | "DIRECTOR"
  | "MANAGING_DIRECTOR"
  | "ACCOUNTANT"
  | "FINANCE";

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
  // role ในตัว หรือ id ของตำแหน่งผู้อนุมัติที่ฝ่ายบัญชีเพิ่มเอง (เช่น "POS_1794...") ดู data/approval.ts
  role: BuiltInRole | (string & {});
  email?: string;
  password?: string;
  // แผนกที่สังกัด → อ้างถึง departments ใน data/organization.ts
  // null = ไม่สังกัดแผนก (ผอ.ฝ่าย / กรรมการผู้จัดการ / ผู้ลงทะเบียนใหม่ที่ยังไม่ได้กำหนด)
  // ※ optional เพื่อให้ข้อมูลเก่าใน localStorage ยังอ่านได้
  departmentId?: string | null;
  // ผอ.ฝ่าย / ผู้บริหารสายงาน ที่ไม่สังกัดแผนก → เก็บแค่ฝ่าย หรือสายงาน
  // มีแผนกแล้ว ฝ่าย/สายงานให้ดูจากผังของแผนก (ฟิลด์นี้เก็บคู่ไว้เพื่อแสดงผล)
  divisionId?: string | null;
  lineOfWorkId?: string | null;
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
  // สิทธิ์ผู้ดูแลระบบ (แยกจาก role): จัดการผู้ใช้ · Approval Matrix · ตั้งงบประมาณ
  // ไม่ผูกกับ role → คนตรวจคำขอ (บัญชี) ไม่ได้แก้กฎ/วงเงินเองโดยอัตโนมัติ
  isAdmin?: boolean;
};

// ────────────────────────────────────────────────────────────
//  ข้อมูลตัวอย่าง: ใส่สังกัดให้ผู้ใช้ทดสอบไว้แล้ว (แก้ต่อได้ที่หน้า "การตั้งค่า")
//  username = ชื่อคน (ไม่ใส่ชื่อตำแหน่ง กันสับสนเวลาเปลี่ยน role)
//    ฝ่ายบัญชี DV01: แผนกงบประมาณฯ DP01 = phanu (พนักงาน), somchai (หัวหน้า)
//                    แผนกบัญชีทั่วไป DP02 = kanya, nattaya (บัญชี)
//                    wanida = ผอ.ฝ่ายบัญชี (ไม่สังกัดแผนก · divisionId = DV01)
//    ฝ่ายการเงิน DV05: แผนกการเงินฯ DP03 = preecha (การเงิน)
//    ฝ่ายการตลาด DV03: การตลาด DP05 = kittisak (หัวหน้า), malee (พนักงาน) · ยังไม่มี ผอ.
//    thanakorn = กรรมการผู้จัดการ (ทั้งบริษัท · ไม่สังกัด)
//
//  ผู้ดูแลระบบ (isAdmin) = kanya เท่านั้น · nattaya เป็นบัญชีแต่ไม่มีสิทธิ์จัดการระบบ
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
    lineOfWorkId: "LW01",
    divisionId: "DV01",
    departmentId: "DP01",
    bankAccount: { bank: "กสิกรไทย", number: "xxx-x-x4521-x", name: "ภาณุ ศรีบุญเพ็ง" },
    departmentInfo: { lineOfWork: "สายงานบัญชีและการเงิน", department: "แผนกงบประมาณและควบคุมต้นทุน" },
    status: "ACTIVE",
  },
  {
    id: "u_02",
    username: "somchai",
    fullName: "สมชาย ใจดี",
    role: "HEAD",
    password: "pass",
    lineOfWorkId: "LW01",
    divisionId: "DV01",
    departmentId: "DP01",
    departmentInfo: { lineOfWork: "สายงานบัญชีและการเงิน", department: "แผนกงบประมาณและควบคุมต้นทุน" },
    status: "ACTIVE",
  },
  {
    id: "u_03",
    username: "wanida",
    fullName: "วนิดา รัตนกุล",
    role: "DIRECTOR",
    password: "pass",
    lineOfWorkId: "LW01",
    divisionId: "DV01",
    departmentId: null,
    departmentInfo: { lineOfWork: "สายงานบัญชีและการเงิน", department: "" },
    status: "ACTIVE",
  },
  {
    id: "u_04",
    username: "kanya",
    fullName: "กัญญา ทองดี",
    isAdmin: true, // ผู้ดูแลระบบคนเดียวในข้อมูลตัวอย่าง
    password: "pass",
    role: "ACCOUNTANT",
    lineOfWorkId: "LW01",
    divisionId: "DV01",
    departmentId: "DP02",
    departmentInfo: { lineOfWork: "สายงานบัญชีและการเงิน", department: "แผนกบัญชีทั่วไป" },
    status: "ACTIVE",
  },
  {
    id: "u_05",
    username: "preecha",
    fullName: "ปรีชา มั่นคง",
    role: "FINANCE",
    password: "pass",
    lineOfWorkId: "LW01",
    divisionId: "DV05",
    departmentId: "DP03",
    departmentInfo: { lineOfWork: "สายงานบัญชีและการเงิน", department: "แผนกการเงินและทำจ่าย" },
    status: "ACTIVE",
  },
  {
    id: "u_06",
    username: "thanakorn",
    fullName: "ธนกร วงศ์สวัสดิ์",
    role: "MANAGING_DIRECTOR",
    password: "pass",
    lineOfWorkId: null,
    divisionId: null,
    departmentId: null,
    departmentInfo: { lineOfWork: "", department: "" },
    status: "ACTIVE",
  },
  {
    id: "u_07",
    username: "nattaya",
    fullName: "ณัฐยา สุขใจ",
    role: "ACCOUNTANT",
    password: "pass",
    lineOfWorkId: "LW01",
    divisionId: "DV01",
    departmentId: "DP02",
    departmentInfo: { lineOfWork: "สายงานบัญชีและการเงิน", department: "แผนกบัญชีทั่วไป" },
    status: "ACTIVE",
  },
  {
    id: "u_08",
    username: "kittisak",
    fullName: "กิตติศักดิ์ แสงทอง",
    role: "HEAD",
    password: "pass",
    lineOfWorkId: "LW02",
    divisionId: "DV03",
    departmentId: "DP05",
    departmentInfo: { lineOfWork: "สายงานธุรกิจและปฏิบัติการ", department: "การตลาด" },
    status: "ACTIVE",
  },
  {
    id: "u_09",
    username: "malee",
    fullName: "มาลี พรหมมา",
    role: "EMPLOYEE",
    password: "pass",
    lineOfWorkId: "LW02",
    divisionId: "DV03",
    departmentId: "DP05",
    bankAccount: { bank: "ไทยพาณิชย์", number: "xxx-x-x7788-x", name: "มาลี พรหมมา" },
    departmentInfo: { lineOfWork: "สายงานธุรกิจและปฏิบัติการ", department: "การตลาด" },
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

  return (
    typeof candidate.id === "string" &&
    typeof candidate.username === "string" &&
    typeof candidate.fullName === "string" &&
    // role ในตัว หรือตำแหน่งที่เพิ่มเอง → ขอแค่เป็นข้อความไม่ว่าง
    typeof candidate.role === "string" &&
    candidate.role.length > 0 &&
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
      isAdmin: user.isAdmin ?? seed.isAdmin,
    };
  });
  const missing = users.filter((s) => !stored.some((u) => u.id === s.id));
  return [...merged, ...missing.map((user) => ({ ...user }))];
};

// id พนักงาน = เลขรัน u_01, u_02, … (คนใหม่ได้เลขถัดจากเลขมากสุด)
const RUNNING_ID = /^u_\d+$/;
export const nextUserId = (list: { id: string }[]) => {
  const max = Math.max(0, ...list.map((u) => (RUNNING_ID.test(u.id) ? Number(u.id.slice(2)) : 0)));
  return `u_${String(max + 1).padStart(2, "0")}`;
};

// ข้อมูลเก่า: คนที่ลงทะเบียนก่อนหน้านี้ได้ id แบบสุ่ม (u_<uuid>) → เปลี่ยนเป็นเลขรัน
// และแก้ id เดิมในทุก key ของ localStorage (คำขอ, แจ้งเตือน, ผังองค์กร, หัวหน้าโดยตรง, ล็อก, ประวัติงบ, current_user)
// ※ uuid ไม่ซ้ำกับข้อความอื่น → แทนแบบข้อความ "<id เดิม>" ได้ปลอดภัย
export const renumberUsers = (list: User[], storage: Storage = localStorage): User[] => {
  const taken = list.filter((u) => RUNNING_ID.test(u.id)).map((u) => ({ id: u.id }));
  const renames = new Map<string, string>();
  for (const u of list) {
    if (RUNNING_ID.test(u.id)) continue;
    const id = nextUserId(taken);
    taken.push({ id });
    renames.set(u.id, id);
  }
  if (renames.size === 0) return list;

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    const value = key === null ? null : storage.getItem(key);
    if (key === null || value === null) continue;
    let next = value;
    for (const [from, to] of renames) next = next.split(`"${from}"`).join(`"${to}"`);
    if (next !== value) storage.setItem(key, next);
  }
  return list.map((u) => ({ ...u, id: renames.get(u.id) ?? u.id }));
};

// ข้อมูลเก่า: role ฝ่ายบัญชีเคยชื่อ "ACCOUNTANT_ADMIN" → เปลี่ยนเป็น "ACCOUNTANT" ในทุก key ของ localStorage
// (ผู้ใช้, current_user, ขั้นอนุมัติในคำขอ, กฎวงเงิน, ตำแหน่ง ฯลฯ) · แทนเฉพาะค่าที่มีเครื่องหมายคำพูดครอบทั้งก้อน
// ทำตอนโหลดไฟล์นี้ (ฝั่ง browser) ครั้งเดียว → ก่อนทุกหน้าอ่านคำขอ/ผู้ใช้ใน useEffect
const OLD_ACCOUNTANT_ROLE = '"ACCOUNTANT_ADMIN"';
export const migrateRoleNames = (storage: Storage) => {
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    const value = key === null ? null : storage.getItem(key);
    if (key !== null && value?.includes(OLD_ACCOUNTANT_ROLE))
      storage.setItem(key, value.split(OLD_ACCOUNTANT_ROLE).join('"ACCOUNTANT"'));
  }
};
if (typeof window !== "undefined") {
  try {
    migrateRoleNames(localStorage);
  } catch {
    /* localStorage ใช้ไม่ได้ (เช่น โหมดส่วนตัวบางเบราว์เซอร์) → ข้าม */
  }
}

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

  const merged = mergeWithSeed(renumberUsers(parsedUsers));
  if (JSON.stringify(merged) !== storedUsers) {
    localStorage.setItem(USERS_KEY, JSON.stringify(merged));
  }
  return merged;
};

const saveUsers = (nextUsers: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
};

// แก้ข้อมูลผู้ใช้ 1 คน (เช่น เปลี่ยน role เป็นตำแหน่งผู้อนุมัติที่เพิ่มเอง) · ไม่แตะรหัสผ่าน
export const updateUser = (id: string, patch: Partial<Omit<User, "id" | "password">>) => {
  saveUsers(getUsers().map((u) => (u.id === id ? { ...u, ...patch } : u)));
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
    id: nextUserId(currentUsers),
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
