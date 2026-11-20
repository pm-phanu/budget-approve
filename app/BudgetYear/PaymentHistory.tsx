import { useEffect, useMemo, useRef, useState } from "react";
import { useBudgetData, type Payment, type PayMethod, type PayStatus } from "./budgetflow-data";

interface Props {
  /** ส่งข้อมูลเข้ามาเองได้ ถ้าไม่ส่งจะอ่านจากแหล่งข้อมูลที่ตั้งไว้ใน budgetflow-data.ts */
  payments?: Payment[];
}

/* ---------- Helpers ---------- */
const STATUS_LABEL: Record<PayStatus, string> = { paid: "จ่ายแล้ว", wait: "รอโอน", ref: "คืนเงินแล้ว" };
const FILTERS: { key: "all" | PayStatus; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "paid", label: "จ่ายแล้ว" },
  { key: "wait", label: "รอโอน" },
  { key: "ref", label: "คืนเงิน" },
];
const baht = (n: number) => "฿" + n.toLocaleString("en-US");
const parse = (iso: string) => new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
const fmtDate = (iso: string) => parse(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (iso: string) =>
  iso.length > 10 ? parse(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }) + " น." : "";
const fmtDateTime = (iso: string) => [fmtDate(iso), fmtTime(iso)].filter(Boolean).join(" ");
const slipKind = (m: PayMethod) =>
  m === "โอนธนาคาร" ? "รูปสลิปการโอนเงิน" : m === "เช็ค" ? "รูปเช็ค" : "รูปหลักฐานการจ่าย";

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = "\ufeff" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- Component ---------- */
export default function PaymentHistory({ payments: override }: Props) {
  const store = useBudgetData<Payment>("payments");
  const payments = override ?? store.data;
  const loading = override ? false : store.loading;
  const error = override ? null : store.error;

  const [filter, setFilter] = useState<"all" | PayStatus>("all");
  const [range, setRange] = useState(0); // 0 = ทั้งหมด, อื่นๆ = จำนวนวันย้อนหลังจากวันนี้
  const [query, setQuery] = useState("");
  const [asc, setAsc] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Payment | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  useEffect(() => {
    if (selected) dlg.current?.showModal();
  }, [selected]);

  // การ์ดสรุปคำนวณจากข้อมูลจริงทั้งหมด
  const summary = useMemo(() => {
    const now = new Date();
    const paidThisMonth = payments.filter((p) => {
      const d = parse(p.date);
      return p.status === "paid" && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    return {
      monthTotal: paidThisMonth.reduce((s, p) => s + p.amount, 0),
      count: paidThisMonth.length,
      waiting: payments.filter((p) => p.status === "wait").length,
      refunded: payments.filter((p) => p.status === "ref").length,
    };
  }, [payments]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments
      .filter((p) => filter === "all" || p.status === filter)
      .filter((p) => !range || (Date.now() - parse(p.date).getTime()) / 864e5 < range)
      .filter((p) => !q || [p.id, p.requester, p.dept, p.requestRef, p.method].join(" ").toLowerCase().includes(q))
      .sort((a, b) => (asc ? 1 : -1) * (parse(a.date).getTime() - parse(b.date).getTime()));
  }, [payments, filter, range, query, asc]);

  const exportCsv = () =>
    downloadCsv("payment-history.csv", [
      ["เลขที่การจ่าย", "ผู้เบิก", "แผนก", "อ้างอิงคำขอ", "จำนวนเงิน", "วิธีจ่าย", "วันที่จ่าย", "สถานะ"],
      ...rows.map((p) => [p.id, p.requester, p.dept, p.requestRef, p.amount, p.method, fmtDateTime(p.date), STATUS_LABEL[p.status]]),
    ]);

  const notice = loading
    ? "กำลังโหลดข้อมูล…"
    : error
      ? error
      : payments.length === 0
        ? "ยังไม่มีประวัติการจ่าย"
        : rows.length === 0
          ? "ไม่พบรายการที่ตรงกับเงื่อนไข"
          : null;

  return (
    <main className="bf">
      <style>{CSS}</style>

      <header className="bf-top">
        <h1>ประวัติการจ่าย</h1>
        <div className="bf-tools">
          <label className="bf-search">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input type="search" placeholder="ค้นหา…" aria-label="ค้นหา" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button className="bf-bell" aria-label="การแจ้งเตือน">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7" /><path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
            <i />
          </button>
        </div>
      </header>

      <section className="bf-stats" aria-label="สรุป">
        <div className="bf-stat"><span>ยอดจ่ายเดือนนี้</span><b>{baht(summary.monthTotal)}</b></div>
        <div className="bf-stat"><span>จำนวนรายการที่จ่าย</span><b>{summary.count}</b></div>
        <div className="bf-stat"><span>รอโอน</span><b>{summary.waiting}</b></div>
        <div className="bf-stat"><span>คืนเงินเข้าระบบ</span><b>{summary.refunded}</b></div>
      </section>

      <section className="bf-panel">
        <div className="bf-bar">
          <div className="bf-chips">
            {FILTERS.map((f) => (
              <button key={f.key} className="bf-chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="bf-acts">
            <div style={{ position: "relative" }}>
              <button
                className="bf-btn"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
              >
                ช่วงวันที่ <small>▾</small>
              </button>
              {menuOpen && (
                <div className="bf-menu" role="menu">
                  {[[0, "ทั้งหมด"], [3, "3 วันล่าสุด"], [7, "7 วันล่าสุด"]].map(([v, l]) => (
                    <button key={v} role="menuitemradio" aria-checked={range === v} onClick={() => { setRange(v as number); setMenuOpen(false); }}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="bf-btn" onClick={exportCsv}>ส่งออก Excel</button>
          </div>
        </div>

        <div className="bf-scroll">
          <table>
            <thead>
              <tr>
                <th>เลขที่การจ่าย</th><th>ผู้เบิก / แผนก</th><th>อ้างอิงคำขอ</th><th>จำนวนเงิน</th><th>วิธีจ่าย</th>
                <th aria-sort={asc ? "ascending" : "descending"}>
                  <button className="bf-link" style={{ color: "inherit" }} onClick={() => setAsc((a) => !a)} title="สลับการเรียง">
                    วันที่จ่าย {asc ? "▲" : "▼"}
                  </button>
                </th>
                <th>สถานะ</th><th>ใบเสร็จ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const isCheque = p.method === "เช็ค";
                const hasLink = p.status !== "wait" || isCheque;
                return (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.requester} · {p.dept}</td>
                    <td>{p.requestRef}</td>
                    <td>{baht(p.amount)}</td>
                    <td>{p.method}</td>
                    <td className="bf-two">{fmtDate(p.date)}{fmtTime(p.date) && <small>{fmtTime(p.date)}</small>}</td>
                    <td><span className={`bf-badge is-${p.status}`}>{STATUS_LABEL[p.status]}</span></td>
                    <td>
                      {hasLink ? (
                        <button className="bf-link" onClick={() => setSelected(p)}>{isCheque ? "ดูเช็ค" : "ดูใบเสร็จ"}</button>
                      ) : (
                        <span className="bf-none">–</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {notice && (
            <div className="bf-empty">
              {notice}
              {error && <> <button className="bf-link" onClick={store.reload}>ลองใหม่</button></>}
            </div>
          )}
        </div>
      </section>

      <dialog ref={dlg} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <h2>{selected.method === "เช็ค" ? "เช็ค " : "ใบเสร็จ "}{selected.id}</h2>
            <div className="bf-slip">
              {selected.slipUrl ? (
                <img src={selected.slipUrl} alt={slipKind(selected.method)} />
              ) : (
                <>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-8 8" />
                  </svg>
                  <span>{slipKind(selected.method)}</span>
                  <span>ยังไม่มีรูป</span>
                </>
              )}
            </div>
            <dl>
              <dt>ผู้เบิก</dt><dd>{selected.requester}</dd>
              <dt>แผนก</dt><dd>{selected.dept}</dd>
              <dt>อ้างอิงคำขอ</dt><dd>{selected.requestRef}</dd>
              <dt>วิธีจ่าย</dt><dd>{selected.method}</dd>
              <dt>วันที่จ่าย</dt><dd>{fmtDateTime(selected.date)}</dd>
              <dt>สถานะ</dt><dd>{STATUS_LABEL[selected.status]}</dd>
              <dt>จำนวนเงิน</dt><dd>{baht(selected.amount)}</dd>
            </dl>
            <button className="bf-btn" onClick={() => dlg.current?.close()}>ปิด</button>
          </>
        )}
      </dialog>
    </main>
  );
}

/* ---------- Styles (scope ด้วย .bf) ---------- */
// ต้องโหลดฟอนต์ Noto Sans Thai ในโปรเจกต์เอง (เช่น next/font หรือ Google Fonts)
const CSS = `
.bf{--bg:#F1F4F9;--card:#fff;--ink:#0F172A;--muted:#64748B;--line:#E8ECF2;--head:#F8FAFC;--green:#059669;--green-ink:#047857;--chip:#EEF1F6;
--ok-bg:#D1FAE5;--ok-ink:#047857;--wait-bg:#FEF3C7;--wait-ink:#92400E;--ref-bg:#DBEAFE;--ref-ink:#1D4ED8;
margin-left:var(--sidebar-w,0px);padding:32px 32px 48px;min-height:100vh;background:var(--bg);color:var(--ink);
font-family:"Noto Sans Thai",system-ui,sans-serif;font-size:15px}
@media (prefers-color-scheme:dark){.bf{--bg:#0B1220;--card:#131C2E;--ink:#F1F5F9;--muted:#94A3B8;--line:#233049;--head:#0F1829;--chip:#1B2740;
--ok-bg:#064E3B;--ok-ink:#6EE7B7;--wait-bg:#78350F;--wait-ink:#FCD34D;--ref-bg:#1E3A8A;--ref-ink:#93C5FD;--green-ink:#34D399}}
.bf *{box-sizing:border-box}.bf svg{display:block}
.bf-top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:28px}
.bf h1{font-size:30px;font-weight:700;margin:0}
.bf-tools{display:flex;gap:14px;align-items:center}
.bf-search{display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:0 14px;height:48px;width:min(340px,40vw)}
.bf-search input{border:0;outline:0;background:none;font:inherit;color:var(--ink);width:100%}
.bf-search input::placeholder{color:var(--muted)}
.bf-search:focus-within,.bf-btn:focus-visible,.bf-chip:focus-visible,.bf-link:focus-visible{outline:2px solid var(--green);outline-offset:2px}
.bf-bell{position:relative;width:48px;height:48px;border-radius:14px;border:1px solid var(--line);background:var(--card);display:grid;place-items:center;color:var(--ink);cursor:pointer}
.bf-bell i{position:absolute;top:11px;right:12px;width:8px;height:8px;border-radius:50%;background:#EF4444}
.bf-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:24px}
.bf-stat{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px 24px}
.bf-stat span{color:var(--muted);font-size:14px}
.bf-stat b{display:block;font-size:34px;font-weight:700;margin-top:8px;line-height:1.2}
.bf-panel{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.bf-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:18px 20px}
.bf-chips,.bf-acts{display:flex;gap:10px;flex-wrap:wrap}
.bf-chip{border:0;background:var(--chip);color:var(--muted);font:inherit;font-weight:500;padding:9px 22px;border-radius:999px;cursor:pointer}
.bf-chip[aria-pressed="true"]{background:var(--green);color:#fff}
.bf-btn{background:var(--card);border:1px solid var(--line);color:var(--ink);font:inherit;padding:9px 18px;border-radius:10px;cursor:pointer}
.bf-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:5;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:6px;min-width:170px;box-shadow:0 8px 24px rgba(15,23,42,.14)}
.bf-menu button{display:block;width:100%;text-align:left;border:0;background:none;color:var(--ink);font:inherit;padding:8px 12px;border-radius:8px;cursor:pointer}
.bf-menu button:hover,.bf-menu button[aria-checked="true"]{background:var(--chip)}
.bf-scroll{overflow-x:auto;border-top:1px solid var(--line)}
.bf table{width:100%;border-collapse:collapse;min-width:900px}
.bf th{background:var(--head);color:var(--muted);font-weight:600;font-size:14px;text-align:left;padding:16px 20px;white-space:nowrap}
.bf td{padding:20px;border-top:1px solid var(--line);white-space:nowrap}
.bf tbody tr:first-child td{border-top:0}
.bf-two small{display:block;color:var(--muted);font-size:13px}
.bf-badge{display:inline-block;padding:6px 16px;border-radius:999px;font-weight:600;font-size:14px}
.is-paid{background:var(--ok-bg);color:var(--ok-ink)}.is-wait{background:var(--wait-bg);color:var(--wait-ink)}.is-ref{background:var(--ref-bg);color:var(--ref-ink)}
.bf-link{background:none;border:0;padding:0;font:inherit;font-weight:600;color:var(--green-ink);cursor:pointer}
.bf-link:hover{text-decoration:underline}
.bf-none{color:var(--muted)}.bf-empty{padding:48px;text-align:center;color:var(--muted)}
.bf dialog{border:1px solid var(--line);border-radius:16px;background:var(--card);color:var(--ink);padding:24px;width:min(420px,92vw);font-family:inherit}
.bf dialog::backdrop{background:rgba(15,23,42,.45)}
.bf dialog h2{margin:0 0 14px;font-size:20px}
.bf dl{display:grid;grid-template-columns:auto 1fr;gap:8px 18px;margin:0 0 20px}
.bf dt{color:var(--muted)}.bf dd{margin:0;text-align:right}
.bf-slip{height:240px;margin-bottom:18px;border:2px dashed var(--line);border-radius:12px;background:var(--head);color:var(--muted);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;font-size:14px}
.bf-slip img{width:100%;height:100%;object-fit:contain;border-radius:10px}
@media(max-width:900px){.bf{padding:20px 16px 40px}.bf-stats{grid-template-columns:repeat(2,1fr)}.bf h1{font-size:24px}}
@media(max-width:520px){.bf-top{flex-direction:column;align-items:stretch}.bf-search{width:auto}}
`;
