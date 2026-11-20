// กฎอนุมัติ + งบ (logic เงิน) · รัน: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { canApproveStep, planApprovalSteps } from "../data/approval";
import { addRequestsToBudget, transferBudget, type Project } from "../data/budget";
import { users } from "../data/credential";
import { DEFAULT_ORGANIZATION as org } from "../data/organization";
import type { SavedRequest } from "../data/request";

const user = (id: string) => users.find((u) => u.id === id)!;
const phanu = user("u_01"); // พนักงาน แผนก DP01
const somchai = user("u_02"); // หัวหน้า DP01
const kittisak = user("u_08"); // หัวหน้า DP05 (คนละแผนก)
const plan = (total: number, who = phanu) =>
  planApprovalSteps(total, who, org, undefined, undefined, users);

test("เส้นทางอนุมัติตามวงเงิน (ทุกช่วงจบที่ บัญชี → การเงิน)", () => {
  const roles = (total: number) => plan(total).map((s) => s.role);
  assert.deepEqual(roles(3000), ["ACCOUNTANT", "FINANCE"]);
  assert.deepEqual(roles(3001), ["HEAD", "ACCOUNTANT", "FINANCE"]);
  assert.deepEqual(roles(30001), ["HEAD", "DIRECTOR", "ACCOUNTANT", "FINANCE"]);
  assert.deepEqual(roles(300001), ["HEAD", "DIRECTOR", "MANAGING_DIRECTOR", "ACCOUNTANT", "FINANCE"]);
  assert.ok(plan(300001).every((s) => s.hasApprover));
});

test("หัวหน้ายื่นเอง → ข้ามขั้นตัวเอง ขึ้นไป ผอ.", () => {
  assert.deepEqual(plan(10000, somchai).map((s) => s.role), ["DIRECTOR", "ACCOUNTANT", "FINANCE"]);
});

test("สิทธิ์อนุมัติ: หัวหน้าแผนกเดียวกันเท่านั้น และห้ามอนุมัติของตัวเอง", () => {
  const request = {
    status: "รออนุมัติ",
    currentStep: 0,
    requester: { id: phanu.id, departmentId: "DP01", headId: null, directorId: null },
    approvalSteps: [{ role: "HEAD", approverId: null, label: "หัวหน้าแผนก", status: "รอ", by: null, at: null, note: "" }],
  } as unknown as SavedRequest;
  assert.equal(canApproveStep(request, somchai, org), true);
  assert.equal(canApproveStep(request, kittisak, org), false);
  assert.equal(canApproveStep({ ...request, requester: { ...request.requester!, id: somchai.id } }, somchai, org), false);
});

const base: Project[] = [
  {
    id: "P1", name: "A", departmentId: "DP01", dept: "A", year: 2026,
    categories: [
      { id: "C1", name: "x", limit: 10000, used: 1000 },
      { id: "C2", name: "y", limit: 5000, used: 0 },
    ],
  },
];
const req = (status: string, amount: number) =>
  ({ status, items: [{ categoryId: "C1", amount }] }) as unknown as SavedRequest;

test("ยอดใช้ไป: นับคำขอที่ส่งแล้ว ไม่นับร่าง / ตีกลับ", () => {
  const used = addRequestsToBudget([req("รออนุมัติ", 2000), req("จ่ายแล้ว", 500), req("ร่าง", 9000), req("ตีกลับ", 9000)], base);
  assert.equal(used[0].categories[0].used, 3500);
  assert.equal(used[0].categories[1].used, 0);
});

test("โอนงบ: โอนเกินยอดคงเหลือไม่ได้ · โอนได้แล้ววงเงินรวมเท่าเดิม", () => {
  const who = { at: "2026-01-01T00:00:00.000Z", byId: "u_04", byName: "k" };
  const from = { projectId: "P1", categoryId: "C1" };
  const to = { projectId: "P1", categoryId: "C2" };
  assert.equal(transferBudget(base, from, to, 9001, 9000, "r", who).ok, false);
  const r = transferBudget(base, from, to, 4000, 9000, "r", who);
  assert.ok(r.ok);
  if (r.ok) assert.deepEqual(r.projects[0].categories.map((c) => c.limit), [6000, 9000]);
});
