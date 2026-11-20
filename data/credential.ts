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
//  บัญชีธนาคาร = เลขสมมติ 10 หลัก ตั้งไว้ให้ทุกคน · อีเมลว่างไว้ ผู้ใช้กรอกเองที่หน้า "การตั้งค่า"
// ────────────────────────────────────────────────────────────
export const users: User[] = [
  {
    id: "u_01",
    username: "phanu",
    fullName: "ภาณุ ศรีบุญเพ็ง",
    bankAccount: { bank: "กสิกรไทย", number: "1234567890", name: "ภาณุ ศรีบุญเพ็ง" },
    password: "pass",
    role: "EMPLOYEE",
    lineOfWorkId: "LW01",
    divisionId: "DV01",
    departmentId: "DP01",
    departmentInfo: { lineOfWork: "สายงานบัญชีและการเงิน", department: "แผนกงบประมาณและควบคุมต้นทุน" },
    status: "ACTIVE",
  },
  {
    id: "u_02",
    username: "somchai",
    fullName: "สมชาย ใจดี",
    bankAccount: { bank: "กรุงเทพ", number: "2345678901", name: "สมชาย ใจดี" },
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
    bankAccount: { bank: "ไทยพาณิชย์", number: "3456789012", name: "วนิดา รัตนกุล" },
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
    bankAccount: { bank: "กรุงไทย", number: "4567890123", name: "กัญญา ทองดี" },
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
    bankAccount: { bank: "กรุงศรีอยุธยา", number: "5678901234", name: "ปรีชา มั่นคง" },
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
    bankAccount: { bank: "กรุงเทพ", number: "6789012345", name: "ธนกร วงศ์สวัสดิ์" },
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
    bankAccount: { bank: "ทหารไทยธนชาต (ttb)", number: "7890123456", name: "ณัฐยา สุขใจ" },
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
    bankAccount: { bank: "กสิกรไทย", number: "8901234567", name: "กิตติศักดิ์ แสงทอง" },
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
    bankAccount: { bank: "ไทยพาณิชย์", number: "9012345678", name: "มาลี พรหมมา" },
    role: "EMPLOYEE",
    password: "pass",
    lineOfWorkId: "LW02",
    divisionId: "DV03",
    departmentId: "DP05",
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
      // ไม่มีบัญชี / บัญชีตัวอย่างเก่าแบบปิดเลข (xxx-x-x4521-x) → ใช้บัญชีตัวอย่างใหม่
      bankAccount: !user.bankAccount || user.bankAccount.number.includes("x") ? seed.bankAccount : user.bankAccount,
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

export const withoutPassword = (user: User): Credential => {
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

// ════════════════════════════════════════════════════════════
//  หน้าตั้งค่าบัญชีของผู้ใช้ (app/(main)/setting) · ผิด → throw พร้อมข้อความภาษาไทย
// ════════════════════════════════════════════════════════════

// ธนาคารในไทย (พิมพ์ชื่อสั้นแบบข้อมูลตัวอย่างเดิม เช่น "กสิกรไทย")
export const THAI_BANKS = [
  "กรุงเทพ",
  "กสิกรไทย",
  "กรุงไทย",
  "ไทยพาณิชย์",
  "กรุงศรีอยุธยา",
  "ทหารไทยธนชาต (ttb)",
  "ยูโอบี",
  "ซีไอเอ็มบี ไทย",
  "เกียรตินาคินภัทร",
  "แลนด์ แอนด์ เฮ้าส์",
  "ทิสโก้",
  "ไอซีบีซี (ไทย)",
  "ไทยเครดิต",
  "ออมสิน",
  "ธ.ก.ส.",
  "อาคารสงเคราะห์ (ธอส.)",
  "อิสลามแห่งประเทศไทย",
] as const;

// เปลี่ยนรหัสผ่าน: ต้องรู้รหัสเดิม · ใหม่ ≥ 8 ตัว (เท่ากับตอนลงทะเบียน) · ต้องพิมพ์ยืนยันตรงกัน
// คืนข้อความผิด (null = ผ่าน) · หน้าจอเรียกก่อนเปิดป็อปอัพยืนยัน
export const passwordChangeError = (userId: string, current: string, next: string, confirm: string) => {
  const user = getUsers().find((u) => u.id === userId);
  if (!user) return "ไม่พบผู้ใช้";
  if (user.password !== current) return "รหัสผ่านปัจจุบันไม่ถูกต้อง";
  if (next.length < 8) return "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร";
  if (next !== confirm) return "รหัสผ่านใหม่กับยืนยันรหัสผ่านไม่ตรงกัน";
  if (next === current) return "รหัสผ่านใหม่ต้องไม่ซ้ำรหัสเดิม";
  return null;
};

export const changePassword = (userId: string, current: string, next: string, confirm: string) => {
  const error = passwordChangeError(userId, current, next, confirm);
  if (error) throw new Error(error);
  saveUsers(getUsers().map((u) => (u.id === userId ? { ...u, password: next } : u)));
};

// ตรวจ + จัดรูปบัญชีธนาคาร · เลขบัญชีเก็บเป็นตัวเลขล้วน (ธนาคารพาณิชย์ 10 หลัก · ออมสิน/ธ.ก.ส. 12 หลัก)
export const normalizeBankAccount = (input: BankAccount): BankAccount => {
  const bank = input.bank.trim();
  const number = input.number.replace(/[\s-]/g, "");
  const name = input.name.trim();
  if (!(THAI_BANKS as readonly string[]).includes(bank)) throw new Error("กรุณาเลือกธนาคาร");
  if (!/^\d{10,12}$/.test(number)) throw new Error("เลขบัญชีต้องเป็นตัวเลข 10–12 หลัก");
  if (!name) throw new Error("กรุณากรอกชื่อบัญชี");
  return { bank, number, name };
};

export const updateBankAccount = (userId: string, input: BankAccount) => {
  updateUser(userId, { bankAccount: normalizeBankAccount(input) });
};

// เปลี่ยนอีเมล (ใช้เข้าสู่ระบบแทนชื่อผู้ใช้ได้) · คืนอีเมลที่จัดรูปแล้ว · ผิด → throw
export const normalizeEmail = (userId: string, input: string) => {
  const email = input.trim().toLocaleLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("รูปแบบอีเมลไม่ถูกต้อง เช่น name@company.com");
  const owner = getUsers().find((u) => u.email?.toLocaleLowerCase() === email);
  if (owner && owner.id !== userId) throw new Error("อีเมลนี้มีผู้ใช้คนอื่นใช้แล้ว");
  if (owner) throw new Error("อีเมลนี้เป็นอีเมลปัจจุบันของคุณอยู่แล้ว");
  return email;
};

// เปลี่ยนชื่อผู้ใช้ (ใช้เข้าสู่ระบบ) · อังกฤษตัวเล็ก/ตัวเลข/. _ - 3–30 ตัว (ไม่มี @ → ไม่ชนกับอีเมล) · ผิด → throw
export const normalizeUsername = (userId: string, input: string) => {
  const username = input.trim().toLocaleLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username))
    throw new Error("ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษ ตัวเลข หรือ . _ - ยาว 3–30 ตัว");
  const owner = getUsers().find((u) => u.username.toLocaleLowerCase() === username);
  if (owner && owner.id !== userId) throw new Error("ชื่อผู้ใช้นี้มีคนใช้แล้ว");
  if (owner) throw new Error("นี่คือชื่อผู้ใช้ปัจจุบันของคุณอยู่แล้ว");
  return username;
};
