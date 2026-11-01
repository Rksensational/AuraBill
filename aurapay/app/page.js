'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { browserDb } from '../lib/db-browser';
import { upiUrl } from '../lib/upi';

const db = browserDb();
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const PALETTE = ['#f97316', '#facc15', '#34d399', '#818cf8', '#f472b6', '#38bdf8'];
const istToday = () => new Date(Date.now() + 19800000).toISOString().slice(0, 10);
const daysTo = (d) => Math.round((new Date(d) - new Date(istToday())) / 864e5);
const stateOf = (b) => b.status === 'paid' ? 'paid' : daysTo(b.due_date) < 0 ? 'overdue' : daysTo(b.due_date) <= 2 ? 'urgent' : 'upcoming';
const QUICK = [
  ['+ BESCOM Electricity (₹2,450)', 'BESCOM Bengaluru electricity bill Rs 2,450 due in 2 days'],
  ['+ HDFC Credit Card (₹18,500)', 'HDFC CC bill Rs 18,500 due 10th'],
  ['+ Airtel Broadband (₹1,179)', 'Airtel Xstream Fiber bill Rs 1,179 due in 4 days'],
  ['+ Advance Tax Task', 'Review quarterly advance tax and GST input credits with CA today 4pm']
];

async function api(path, opts = {}) {
  const pin = localStorage.getItem('pin') || '';
  const r = await fetch(path, { ...opts, headers: { 'content-type': 'application/json', 'x-app-pin': pin } });
  if (r.status === 401) {
    const p = prompt('Enter app PIN');
    if (p) { localStorage.setItem('pin', p); return api(path, opts); }
    throw new Error('PIN required');
  }
  const t = await r.text(); let j;
  try { j = JSON.parse(t); } catch { throw new Error(`Server error ${r.status} — open Vercel → Logs for details`); }
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}

export default function Home() {
  const [bills, setBills] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [live, setLive] = useState(false);
  const [now, setNow] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [mic, setMic] = useState(false);
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('All');
  const [cfg, setCfg] = useState(null);
  const [upiFor, setUpiFor] = useState(null);
  const [vpaIn, setVpaIn] = useState('');

  const load = useCallback(async () => {
    const [b, t] = await Promise.all([
      db.from('bills').select('*').order('due_date'),
      db.from('tasks').select('*').order('due_at', { nullsFirst: false })
    ]);
    setBills(b.data || []); setTasks(t.data || []);
  }, []);

  useEffect(() => {
    load();
    const ch = db.channel('radar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load)
      .subscribe((s) => setLive(s === 'SUBSCRIBED'));
    return () => { db.removeChannel(ch); };
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000); setNow(new Date());
    return () => clearInterval(t);
  }, []);

  async function add(t = text) {
    if (!t.trim()) return;
    setBusy(true); setMsg('');
    try {
      const j = await api('/api/ingest', { method: 'POST', body: JSON.stringify({ text: t }) });
      setMsg(`✨ Added ${j.items.length} item(s)`); setText(''); load();
    } catch (e) { setMsg('⚠️ ' + e.message); }
    setBusy(false);
  }
  function listen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert('Voice input is not supported in this browser (try Chrome).');
    const r = new SR(); r.lang = 'en-IN';
    r.onresult = (e) => setText(e.results[0][0].transcript);
    r.onend = () => setMic(false);
    setMic(true); r.start();
  }
  async function toggle(kind, id, done) {
    try {
      await api('/api/items', { method: 'PATCH', body: JSON.stringify({ kind, id, done }) });
      if (done) confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 } });
      load();
    } catch (e) { setMsg('⚠️ ' + e.message); }
  }
  async function remove(kind, id) {
    if (!confirm('Delete this item?')) return;
    try { await api('/api/items', { method: 'DELETE', body: JSON.stringify({ kind, id }) }); load(); }
    catch (e) { setMsg('⚠️ ' + e.message); }
  }
  const VPA = /^[\w.\-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;
  const payLink = (b, v) => `/pay?pa=${encodeURIComponent(v)}&pn=${encodeURIComponent(b.title)}&am=${b.amount}&tn=${encodeURIComponent(b.title + ' bill')}`;
  function pay(b) {
    if (b.upi_vpa) window.location.href = payLink(b, b.upi_vpa);
    else { setUpiFor(b); setVpaIn(''); }
  }
  async function saveVpa() {
    const v = vpaIn.trim();
    if (!VPA.test(v)) return setMsg('⚠️ Enter a valid UPI ID like name@bank');
    try {
      await api('/api/items', { method: 'PATCH', body: JSON.stringify({ kind: 'bill', id: upiFor.id, vpa: v }) });
      const b = upiFor; setUpiFor(null); load(); setMsg('');
      window.location.href = payLink(b, v);
    } catch (e) { setMsg('⚠️ ' + e.message); }
  }
  async function openCfg() {
    setCfg({ loading: true });
    setCfg(await (await fetch('/api/status')).json());
  }
  async function testTg() {
    try { await api('/api/status', { method: 'POST', body: '{}' }); alert('Test message sent to Telegram ✅'); }
    catch (e) { alert(e.message); }
  }

  const unpaid = bills.filter((b) => b.status !== 'paid');
  const total = unpaid.reduce((s, b) => s + Number(b.amount || 0), 0);
  const due48 = unpaid.filter((b) => daysTo(b.due_date) <= 2).length;
  const pendingTasks = tasks.filter((t) => !t.done);
  const doneToday = tasks.filter((t) => t.done && t.completed_at && new Date(new Date(t.completed_at).getTime() + 19800000).toISOString().slice(0, 10) === istToday()).length;
  const cats = useMemo(() => {
    const m = {}; unpaid.forEach((b) => { m[b.category || 'Other'] = (m[b.category || 'Other'] || 0) + Number(b.amount || 0); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [bills]);
  const shown = bills.filter((b) => {
    const s = stateOf(b);
    return filter === 'All' ? true : filter === 'Paid' ? s === 'paid' : s === filter.toLowerCase() && s !== 'paid';
  });
  const fmtTask = (d) => d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'No due time';

  return (
    <div className="wrap">
      <div className="row sp">
        <div>
          <h1>AuraPay &amp; Task Radar <span className="pill amber" style={{ fontSize: 11 }}>INDIA (₹ INR)</span></h1>
          <div className="sub">Next.js 15 • Realtime Supabase • Gemini AI • Telegram Push</div>
        </div>
        <div className="row">
          <span className="pill mono">{now ? now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '…'}</span>
          <span className={'pill ' + (live ? 'green' : '')}>● {live ? 'Supabase Realtime' : 'Connecting…'}</span>
          <button className="pill" onClick={openCfg}>⚙ Settings</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="bar">
          <b className="amber" style={{ fontSize: 12 }}>✦ AI INGESTION</b>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Paste bank SMS: 'HDFC CC bill Rs 18,500 due 10 Nov' or 'Review GST with CA'…" />
          <button className="chip" onClick={listen}>{mic ? '🎙 Listening…' : '🎤 Voice'}</button>
          <button className="btn" disabled={busy} onClick={() => add()}>{busy ? '…' : 'Add'}</button>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <span className="sub">Quick SMS Test:</span>
          {QUICK.map(([l, t]) => <button key={l} className="chip" onClick={() => add(t)}>{l}</button>)}
        </div>
        {msg && <div className="sub" style={{ marginTop: 10 }}>{msg}</div>}
      </div>

      <div className="grid g4">
        <div className="card"><div className="sub">Total Unpaid Outflow (INR)</div><div className="big">{inr(total)}</div><div className="sub">{unpaid.length} active obligations</div></div>
        <div className="card"><div className="sub">Due in Next 48 Hours</div><div className="big amber">{due48} Critical Bills</div><div className="sub">Avoid late fees &amp; disconnection</div></div>
        <div className="card"><div className="sub">Pending Daily Tasks</div><div className="big ind">{pendingTasks.length} Scheduled</div><div className="sub">{doneToday} completed today</div></div>
        <div className="card"><div className="sub">Category Breakdown</div>
          <div className="seg">{cats.map(([c, v], i) => <div key={c} style={{ width: (v / (total || 1)) * 100 + '%', background: PALETTE[i % 6] }} />)}</div>
          <div className="row sub">{cats.slice(0, 4).map(([c, v], i) => <span key={c}><span style={{ color: PALETTE[i % 6] }}>●</span> {c} ({Math.round((v / (total || 1)) * 100)}%)</span>)}{!cats.length && 'No unpaid bills'}</div>
        </div>
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="row sp"><b>💳 Bill Radar &amp; Obligations (₹)</b>
            <div className="row tabs">{['All', 'Urgent', 'Upcoming', 'Overdue', 'Paid'].map((f) => <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f}</button>)}</div>
          </div>
          {!shown.length && <div className="sub" style={{ marginTop: 14 }}>Nothing here yet — paste an SMS above.</div>}
          {shown.map((b) => { const s = stateOf(b); return (
            <div key={b.id} className={'item ' + s}>
              <div className="row sp">
                <div>
                  <b>{b.title}</b> <span className={'tag ' + s}>{s.toUpperCase()}</span>
                  <div className="sub" style={{ marginTop: 6 }}>{b.category} • Due: {b.due_date || '—'}{b.account_ref ? ' • ' + b.account_ref : ''}</div>
                </div>
                <div className="row">
                  <b style={{ fontSize: 18 }}>{inr(b.amount)}</b>
                  <button className="x" title="Edit UPI ID" onClick={() => { setUpiFor(b); setVpaIn(b.upi_vpa || ''); }}>✏️</button>
                  <button className="x" onClick={() => remove('bill', b.id)}>🗑</button>
                  <button className="ghost" onClick={() => toggle('bill', b.id, b.status !== 'paid')}>{b.status === 'paid' ? 'Undo' : 'Paid'}</button>
                  {b.status !== 'paid' && <button className="btn" onClick={() => pay(b)}>Pay UPI ↗</button>}
                </div>
              </div>
            </div>); })}
        </div>

        <div className="card">
          <div className="row sp"><b>📅 Day-to-Day Tasks</b><span className="pill mono">{pendingTasks.length} Pending</span></div>
          {!tasks.length && <div className="sub" style={{ marginTop: 14 }}>No tasks yet.</div>}
          {tasks.map((t) => (
            <div key={t.id} className="item">
              <div className="row sp">
                <div className="row" style={{ flex: 1 }}>
                  <button className={'circle ' + (t.done ? 'd' : '')} onClick={() => toggle('task', t.id, !t.done)} />
                  <div><div className={t.done ? 'done' : ''}>{t.title}</div><div className="sub mono">{fmtTask(t.due_at)} • {t.category}</div></div>
                </div>
                <span className="tag">{(t.priority || '').toUpperCase()}</span>
                <button className="x" onClick={() => remove('task', t.id)}>🗑</button>
              </div>
            </div>))}
        </div>
      </div>

      {upiFor && (
        <div className="modal" onClick={() => setUpiFor(null)}>
          <div className="card" onClick={(e) => e.stopPropagation()}>
            <b>Payee UPI ID — {upiFor.title}</b>
            <p className="sub">Format: name@bank (e.g. bescom.collection@icici). Saved for next time.</p>
            <div className="bar"><input autoFocus value={vpaIn} onChange={(e) => setVpaIn(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveVpa()} placeholder="name@bank" /></div>
            {msg && <div className="sub" style={{ marginTop: 8 }}>{msg}</div>}
            <div className="row" style={{ marginTop: 12 }}><button className="btn" onClick={saveVpa}>Save &amp; choose UPI app</button><button className="x" onClick={() => setUpiFor(null)}>Cancel</button></div>
          </div>
        </div>)}

      {cfg && (
        <div className="modal" onClick={() => setCfg(null)}>
          <div className="card" onClick={(e) => e.stopPropagation()}>
            <div className="row sp"><b>Serverless Configuration</b><button className="x" onClick={() => setCfg(null)}>✕</button></div>
            {cfg.loading ? <p className="sub">Checking…</p> : <>
              {[['Supabase (DB + Realtime)', cfg.supabase], ['Gemini 2.5 Flash (AI parsing)', cfg.gemini], ['Telegram Bot', cfg.telegram], ['APP_URL (pay links)', cfg.appUrl], ['CRON_SECRET (daily alerts)', cfg.cron], ['APP_PIN (access lock)', cfg.pin]].map(([n, ok]) => (
                <div key={n} className="item row sp"><span>{n}</span><b className={ok ? 'ok' : 'no'}>{ok ? 'CONFIGURED' : 'MISSING'}</b></div>))}
              <p className="sub">Secrets live in Vercel environment variables, never in the browser.</p>
              <button className="btn" onClick={testTg}>Send Telegram test</button>
            </>}
          </div>
        </div>)}
    </div>
  );
}
