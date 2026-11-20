import { useEffect, useMemo, useRef, useState } from "react";
import { transferStatus, useBudgetData, type Transfer, type TransferStatus } from "./budgetflow-data";

interface Props {
  /** ส่งข้อมูลเข้ามาเองได้ ถ้าไม่ส่งจะอ่านจากแหล่งข้อมูลที่ตั้งไว้ใน budgetflow-data.ts */
  transfers?: Transfer[];
  /** วงเงินที่ต้องผ่านผู้อำนวยการ (ใช้แสดงข้อความกติกาเท่านั้น ขั้นอนุมัติจริงมาจากข้อมูล) */
  directorThreshold?: number;
}

/* ---------- Helpers ---------- */
const STATUS_LABEL: Record<TransferStatus, string> = { ok: "อนุมัติแล้ว", wait: "รออนุมัติ", no: "ไม่อนุมัติ" };
const FILTERS: { key: "all" | TransferStatus; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "ok", label: "อนุมัติแล้ว" },
  { key: "wait", label: "รออนุมัติ" },
  { key: "no", label: "ไม่อนุมัติ" },
];
const baht = (n: number) => "฿" + n.toLocaleString("en-US");
const parse = (iso: string) => new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
const fmtDate = (iso: string) => parse(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (iso: string) =>
  iso.length > 10 ? parse(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false }) + " น." : "";
const fmtDateTime = (iso: string) => [fmtDate(iso), fmtTime(iso)].filter(Boolean).join(" ");

type StepState = "done" | "wait" | "reject" | "idle";
/** approved = ผ่าน, rejected = ไม่ผ่าน, pending ตัวแรกที่ยังไม่ถึงสุดทาง = รอพิจารณา, ที่เหลือ = ยังไม่ถึงขั้น */
function stepStates(t: Transfer): StepState[] {
  let blocked = false;
  return t.approvals.map((a) => {
    if (a.status === "approved") return "done";
    if (a.status === "rejected") { blocked = true; return "reject"; }
    if (blocked) return "idle";
    blocked = true;
    return "wait";
  });
}
const barClass = (s: StepState) => (s === "done" ? "d" : s === "wait" ? "w" : s === "reject" ? "r" : "");

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = "\ufeff" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- Component ---------- */
export default function BudgetTransferHistory({ transfers: override, directorThreshold = 100000 }: Props) {
  const store = useBudgetData<Transfer>("transfers");
  const transfers = override ?? store.data;
  const loading = override ? false : store.loading;
  const error = override ? null : store.error;

  const [filter, setFilter] = useState<"all" | TransferStatus>("all");
  const [range, setRange] = useState(0);
  const [query, setQuery] = useState("");
  const [asc, setAsc] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Transfer | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  useEffect(() => {
    if (selected) dlg.current?.showModal();
  }, [selected]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transfers
      .filter((t) => filter === "all" || transferStatus(t) === filter)
      .filter((t) => !range || (Date.now() - parse(t.date).getTime()) / 864e5 < range)
      .filter((t) => !q || [t.id, t.fromCategory, t.fromDept, t.toCategory, t.toDept, t.requester].join(" ").toLowerCase().includes(q))
      .sort((a, b) => (asc ? 1 : -1) * (parse(a.date).getTime() - parse(b.date).getTime()));
  }, [transfers, filter, range, query, asc]);

  const approvedTotal = transfers.filter((t) => transferStatus(t) === "ok").reduce((s, t) => s + t.amount, 0);
  const count = (s: TransferStatus) => transfers.filter((t) => transferStatus(t) === s).length;
  const doneCount = (t: Transfer) => t.approvals.filter((a) => a.status === "approved").length;

  const exportCsv = () =>
    downloadCsv("budget-transfer-history.csv", [
      ["เลขที่เอกสาร", "วันที่ขอ", "โยกจาก", "แผนกต้นทาง", "โยกไป", "แผนกปลายทาง", "จำนวนเงิน", "ผู้ขอ", "ขั้นอนุมัติ", "สถานะ"],
      ...rows.map((t) => [t.id, fmtDateTime(t.date), t.fromCategory, t.fromDept, t.toCategory, t.toDept, t.amount, t.requester, `${doneCount(t)}/${t.approvals.length}`, STATUS_LABEL[transferStatus(t)]]),
    ]);

  const notice = loading
    ? "กำลังโหลดข้อมูล…"
    : error
      ? error
      : transfers.length === 0
        ? "ยังไม่มีประวัติการโยกงบ"
        : rows.length === 0
          ? "ไม่พบรายการที่ตรงกับเงื่อนไข"
          : null;

  return (
    <main className="bf">
      <style>{CSS}</style>

      <header className="bf-top">
        <h1>ประวัติการโยกงบ</h1>
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
        <div className="bf-stat"><span>ยอดโยกงบที่อนุมัติแล้ว</span><b>{baht(approvedTotal)}</b></div>
        <div className="bf-stat"><span>จำนวนรายการทั้งหมด</span><b>{transfers.length}</b></div>
        <div className="bf-stat"><span>รออนุมัติ</span><b>{count("wait")}</b></div>
        <div className="bf-stat"><span>ไม่อนุมัติ</span><b>{count("no")}</b></div>
      </section>

      <section className="bf-panel">
        <div className="bf-bar">
          <div className="bf-chips">
            {FILTERS.map((f) => (
              <button key={f.key} className="bf-chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>
            ))}
          </div>
          <div className="bf-acts">
            <div style={{ position: "relative" }}>
              <button className="bf-btn" aria-haspopup="true" aria-expanded={menuOpen} onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}>
                ช่วงวันที่ <small>▾</small>
              </button>
              {menuOpen && (
                <div className="bf-menu" role="menu">
                  {[[0, "ทั้งหมด"], [7, "7 วันล่าสุด"], [14, "14 วันล่าสุด"]].map(([v, l]) => (
                    <button key={v} role="menuitemradio" aria-checked={range === v} onClick={() => { setRange(v as number); setMenuOpen(false); }}>{l}</button>
                  ))}
                </div>
              )}
            </div>
            <button className="bf-btn" onClick={exportCsv}>ส่งออก Excel</button>
          </div>
        </div>
        <p className="bf-rule">
          การโยกงบข้ามแผนกต้องผ่านหัวหน้าแผนกทั้งต้นทางและปลายทาง และฝ่ายบัญชีและการเงิน ส่วนยอดเกิน {baht(directorThreshold)} ต้องได้รับอนุมัติจากผู้อำนวยการด้วย
        </p>

        <div className="bf-scroll">
          <table>
            <thead>
              <tr>
                <th>เลขที่เอกสาร</th>
                <th aria-sort={asc ? "ascending" : "descending"}>
                  <button className="bf-link" style={{ color: "inherit" }} onClick={() => setAsc((a) => !a)} title="สลับการเรียง">
                    วันที่ขอ {asc ? "▲" : "▼"}
                  </button>
                </th>
                <th>โยกจาก</th><th>โยกไป</th><th>จำนวนเงิน</th><th>ผู้ขอ</th><th>ขั้นอนุมัติ</th><th>สถานะ</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const st = transferStatus(t);
                return (
                  <tr key={t.id} tabIndex={0} onClick={() => setSelected(t)} onKeyDown={(e) => e.key === "Enter" && setSelected(t)}>
                    <td>{t.id}</td>
                    <td className="bf-two">{fmtDate(t.date)}{fmtTime(t.date) && <small>{fmtTime(t.date)}</small>}</td>
                    <td className="bf-two">{t.fromCategory}<small>{t.fromDept}</small></td>
                    <td className="bf-two">{t.toCategory}<small>{t.toDept}</small></td>
                    <td className="bf-amt">{baht(t.amount)}</td>
                    <td>{t.requester}</td>
                    <td>
                      <div className="bf-prog">
                        {stepStates(t).map((s, i) => <i key={i} className={barClass(s)} />)}
                        <small>{doneCount(t)}/{t.approvals.length}</small>
                      </div>
                    </td>
                    <td><span className={`bf-badge is-${st}`}>{STATUS_LABEL[st]}</span></td>
                    <td><button className="bf-link" onClick={(e) => { e.stopPropagation(); setSelected(t); }}>ดูรายละเอียด</button></td>
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
        {selected && <Detail t={selected} onClose={() => dlg.current?.close()} />}
      </dialog>
    </main>
  );
}

/* ---------- Detail dialog ---------- */
function Account({ title, category, dept, balance, after, delta }: {
  title: string; category: string; dept: string; balance: number; after: string; delta: number;
}) {
  return (
    <div className="bf-acc">
      <div className="bf-t">{title}</div>
      <b>{category}</b>
      <div className="bf-dp">{dept}</div>
      <div className="bf-bal"><span>คงเหลือก่อนโยก</span><span>{baht(balance)}</span></div>
      <div className="bf-bal">
        <span>{after}</span>
        <span className={delta < 0 ? "bf-minus" : delta > 0 ? "bf-plus" : ""}>{baht(balance + delta)}</span>
      </div>
    </div>
  );
}

function Detail({ t, onClose }: { t: Transfer; onClose: () => void }) {
  const status = transferStatus(t);
  const states = stepStates(t);
  const moved = status === "no" ? 0 : t.amount;
  const afterLabel = status === "ok" ? "คงเหลือหลังโยก" : status === "wait" ? "คงเหลือหลังโยก (คาดการณ์)" : "คงเหลือ (ไม่มีการโยก)";
  const rejected = t.approvals.find((a) => a.status === "rejected" && a.note);

  return (
    <>
      <div className="bf-dh">
        <h2>คำขอโยกงบ {t.id}</h2>
        <span className={`bf-badge is-${status}`}>{STATUS_LABEL[status]}</span>
      </div>
      <div className="bf-db">
        <div className="bf-flow">
          <Account title="โยกจาก" category={t.fromCategory} dept={t.fromDept} balance={t.fromBalance} after={afterLabel} delta={-moved} />
          <div className="bf-mid"><span>{baht(t.amount)}</span><small>→</small></div>
          <Account title="โยกไป" category={t.toCategory} dept={t.toDept} balance={t.toBalance} after={afterLabel} delta={moved} />
        </div>

        <p className="bf-sec">รายละเอียดคำขอ</p>
        <dl>
          <dt>ผู้ขอ</dt><dd>{t.requester} · {t.fromDept}</dd>
          <dt>วันที่ขอ</dt><dd>{fmtDateTime(t.date)}</dd>
          <dt>ประเภท</dt><dd>{t.fromDept === t.toDept ? "โยกภายในแผนก" : "โยกข้ามแผนก"}</dd>
          <dt>เหตุผล</dt><dd>{t.reason}</dd>
        </dl>

        <p className="bf-sec">เอกสารแนบ</p>
        <div className="bf-slip">
          {t.attachmentUrl ? (
            <img src={t.attachmentUrl} alt="เอกสารแนบ" />
          ) : (
            <>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" />
              </svg>
              <span>ใบขอโยกงบ / เอกสารประกอบ</span>
              <span>ยังไม่มีไฟล์</span>
            </>
          )}
        </div>

        <p className="bf-sec">ลำดับการอนุมัติ</p>
        <ol>
          <li className="d">
            <i />
            <div className="r1"><b>ยื่นคำขอ</b><small>{fmtDateTime(t.date)}</small></div>
            <small>{t.requester} · {t.fromDept}</small>
          </li>
          {t.approvals.map((a, i) => {
            const s = states[i];
            const when = a.date ? ` · ${fmtDateTime(a.date)}` : "";
            const text =
              s === "done" ? `อนุมัติแล้ว${when}`
              : s === "reject" ? `ไม่อนุมัติ${when}`
              : s === "wait" ? "รอพิจารณา"
              : status === "no" ? "ไม่ดำเนินการต่อ" : "ยังไม่ถึงขั้นตอน";
            return (
              <li key={`${a.role}-${i}`} className={barClass(s)}>
                <i />
                <div className="r1"><b>{a.role}</b><small>{text}</small></div>
                <small>{a.name}</small>
              </li>
            );
          })}
        </ol>

        {rejected && (
          <>
            <p className="bf-sec">หมายเหตุจากผู้พิจารณา ({rejected.name})</p>
            <div className="bf-note">{rejected.note}</div>
          </>
        )}
        <button className="bf-btn" onClick={onClose}>ปิด</button>
      </div>
    </>
  );
}

/* ---------- Styles (scope ด้วย .bf) ---------- */
// ต้องโหลดฟอนต์ Noto Sans Thai ในโปรเจกต์เอง (เช่น next/font หรือ Google Fonts)
const CSS = `
.bf{--bg:#F1F4F9;--card:#fff;--ink:#0F172A;--muted:#64748B;--line:#E8ECF2;--head:#F8FAFC;--green:#059669;--green-ink:#047857;--chip:#EEF1F6;
--ok-bg:#D1FAE5;--ok-ink:#047857;--wait-bg:#FEF3C7;--wait-ink:#92400E;--no-bg:#FEE2E2;--no-ink:#B91C1C;
margin-left:var(--sidebar-w,0px);padding:32px 32px 48px;min-height:100vh;background:var(--bg);color:var(--ink);
font-family:"Noto Sans Thai",system-ui,sans-serif;font-size:15px}
@media (prefers-color-scheme:dark){.bf{--bg:#0B1220;--card:#131C2E;--ink:#F1F5F9;--muted:#94A3B8;--line:#233049;--head:#0F1829;--chip:#1B2740;
--ok-bg:#064E3B;--ok-ink:#6EE7B7;--wait-bg:#78350F;--wait-ink:#FCD34D;--no-bg:#7F1D1D;--no-ink:#FCA5A5;--green-ink:#34D399}}
.bf *{box-sizing:border-box}.bf svg{display:block}
.bf-top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:28px}
.bf h1{font-size:30px;font-weight:700;margin:0}
.bf-tools{display:flex;gap:14px;align-items:center}
.bf-search{display:flex;align-items:center;gap:10px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:0 14px;height:48px;width:min(340px,40vw)}
.bf-search input{border:0;outline:0;background:none;font:inherit;color:var(--ink);width:100%}
.bf-search input::placeholder{color:var(--muted)}
.bf-search:focus-within,.bf-btn:focus-visible,.bf-chip:focus-visible,.bf-link:focus-visible,.bf tbody tr:focus-visible{outline:2px solid var(--green);outline-offset:2px}
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
.bf-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:5;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:6px;min-width:190px;box-shadow:0 8px 24px rgba(15,23,42,.14)}
.bf-menu button{display:block;width:100%;text-align:left;border:0;background:none;color:var(--ink);font:inherit;padding:8px 12px;border-radius:8px;cursor:pointer}
.bf-menu button:hover,.bf-menu button[aria-checked="true"]{background:var(--chip)}
.bf-rule{margin:0;padding:0 20px 16px;color:var(--muted);font-size:13.5px}
.bf-scroll{overflow-x:auto;border-top:1px solid var(--line)}
.bf table{width:100%;border-collapse:collapse;min-width:1100px}
.bf th{background:var(--head);color:var(--muted);font-weight:600;font-size:14px;text-align:left;padding:16px 18px;white-space:nowrap}
.bf td{padding:16px 18px;border-top:1px solid var(--line);white-space:nowrap;vertical-align:middle}
.bf tbody tr:first-child td{border-top:0}
.bf tbody tr{cursor:pointer}.bf tbody tr:hover{background:var(--head)}
.bf-two small{display:block;color:var(--muted);font-size:13px}
.bf-amt{font-weight:600}
.bf-badge{display:inline-block;padding:6px 16px;border-radius:999px;font-weight:600;font-size:14px}
.is-ok{background:var(--ok-bg);color:var(--ok-ink)}.is-wait{background:var(--wait-bg);color:var(--wait-ink)}.is-no{background:var(--no-bg);color:var(--no-ink)}
.bf-prog{display:flex;gap:4px;align-items:center}
.bf-prog i{width:18px;height:6px;border-radius:3px;background:var(--line)}
.bf-prog i.d{background:var(--green)}.bf-prog i.w{background:#F59E0B}.bf-prog i.r{background:#EF4444}
.bf-prog small{margin-left:6px;color:var(--muted)}
.bf-link{background:none;border:0;padding:0;font:inherit;font-weight:600;color:var(--green-ink);cursor:pointer}
.bf-link:hover{text-decoration:underline}
.bf-empty{padding:48px;text-align:center;color:var(--muted)}
.bf dialog{border:1px solid var(--line);border-radius:16px;background:var(--card);color:var(--ink);padding:0;width:min(680px,94vw);max-height:90vh;font-family:inherit}
.bf dialog::backdrop{background:rgba(15,23,42,.45)}
.bf-dh{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:20px 24px;border-bottom:1px solid var(--line)}
.bf-dh h2{margin:0;font-size:20px}
.bf-db{padding:20px 24px 24px}
.bf-sec{margin:0 0 10px;font-size:15px;font-weight:600}
.bf-flow{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:stretch;margin-bottom:22px}
.bf-acc{border:1px solid var(--line);border-radius:12px;padding:14px 16px;background:var(--head)}
.bf-acc .bf-t,.bf-acc .bf-dp{color:var(--muted);font-size:13px}
.bf-acc b{display:block;margin:2px 0}
.bf-bal{display:flex;justify-content:space-between;margin-top:10px;font-size:14px;gap:8px}
.bf-bal span:first-child{color:var(--muted)}
.bf-minus{color:var(--no-ink)}.bf-plus{color:var(--ok-ink)}
.bf-mid{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:4px;font-weight:700}
.bf-mid small{font-weight:400;color:var(--muted)}
.bf dl{display:grid;grid-template-columns:130px 1fr;gap:8px 16px;margin:0 0 22px}
.bf dt{color:var(--muted)}.bf dd{margin:0}
.bf-slip{height:110px;margin-bottom:22px;border:2px dashed var(--line);border-radius:12px;background:var(--head);color:var(--muted);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font-size:14px}
.bf-slip img{width:100%;height:100%;object-fit:contain;border-radius:10px}
.bf ol{list-style:none;margin:0 0 22px;padding:0}
.bf ol li{position:relative;padding:0 0 16px 30px}
.bf ol li:last-child{padding-bottom:0}
.bf ol li::before{content:"";position:absolute;left:6px;top:20px;bottom:-2px;width:2px;background:var(--line)}
.bf ol li:last-child::before{display:none}
.bf ol li i{position:absolute;left:0;top:3px;width:14px;height:14px;border-radius:50%;background:var(--line)}
.bf ol li.d i{background:var(--green)}.bf ol li.w i{background:#F59E0B}.bf ol li.r i{background:#EF4444}
.bf ol li .r1{display:flex;justify-content:space-between;gap:10px}
.bf ol li small{color:var(--muted)}
.bf-note{margin:0 0 22px;padding:12px 14px;border-radius:10px;background:var(--no-bg);color:var(--no-ink);font-size:14px}
@media(max-width:900px){.bf{padding:20px 16px 40px}.bf-stats{grid-template-columns:repeat(2,1fr)}.bf h1{font-size:24px}.bf-flow{grid-template-columns:1fr}.bf-mid{flex-direction:row}}
@media(max-width:520px){.bf-top{flex-direction:column;align-items:stretch}.bf-search{width:auto}.bf dl{grid-template-columns:1fr}}
`;
