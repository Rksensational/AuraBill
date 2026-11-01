import { serverDb } from './db-server';

const SCHEMA = {
  type: 'OBJECT',
  properties: { items: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
    kind: { type: 'STRING', enum: ['bill', 'task'] },
    title: { type: 'STRING' },
    category: { type: 'STRING' },
    amount: { type: 'NUMBER', nullable: true },
    due_date: { type: 'STRING', nullable: true },
    due_time: { type: 'STRING', nullable: true },
    priority: { type: 'STRING', enum: ['urgent', 'high', 'medium', 'low'] },
    account_ref: { type: 'STRING', nullable: true },
    upi_vpa: { type: 'STRING', nullable: true }
  }, required: ['kind', 'title'] } } },
  required: ['items']
};

export const istToday = () => new Date(Date.now() + 19800000).toISOString().slice(0, 10);

export async function parseText(text) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
  const prompt = `Today is ${istToday()} (IST, India). Extract every bill/payment obligation (kind "bill") and every to-do (kind "task") from the text below. Text may be an Indian bank/utility SMS (HDFC, SBI, BESCOM, Airtel...) or plain language. Rules: due_date as YYYY-MM-DD (resolve "due in 2 days", "28th Oct", "5th" relative to today; if only a day is given use the next occurrence); due_time as HH:MM 24h if mentioned; amount in INR as a number (strip Rs/₹/commas); category one of Electricity, Cards, Rent, Broadband, Water, Gas, Insurance, Subscription, Tax, Work, Finance, Home, Health, Other; priority urgent if due within 2 days else high/medium/low by context; upi_vpa only if a UPI ID appears in the text. Never invent amounts or dates.\n\nTEXT:\n${text}`;
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, temperature: 0.1 } }) }
  );
  if (!r.ok) throw new Error('Gemini: ' + (await r.text()).slice(0, 200));
  const j = await r.json();
  const raw = j.candidates?.[0]?.content?.parts?.[0]?.text || '{"items":[]}';
  return JSON.parse(raw).items || [];
}

export async function ingest(text) {
  const items = await parseText(text);
  const db = serverDb();
  const out = [];
  for (const it of items) {
    if (it.kind === 'bill') {
      const { data, error } = await db.from('bills').insert({
        title: it.title, category: it.category || 'Other', amount: it.amount || 0, due_date: it.due_date,
        account_ref: it.account_ref, upi_vpa: it.upi_vpa, priority: it.priority || 'medium'
      }).select().single();
      if (error) throw new Error(error.message);
      out.push({ kind: 'bill', ...data });
    } else {
      const due_at = it.due_date ? `${it.due_date}T${it.due_time || '09:00'}:00+05:30` : null;
      const { data, error } = await db.from('tasks').insert({
        title: it.title, category: it.category || 'General', priority: it.priority || 'medium', due_at
      }).select().single();
      if (error) throw new Error(error.message);
      out.push({ kind: 'task', ...data });
    }
  }
  return out;
}
