import { serverDb } from '../../../lib/db-server';
import { tg, esc } from '../../../lib/telegram';
import { istToday } from '../../../lib/ingest';
export const maxDuration = 30;
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: 'Set CRON_SECRET' }, { status: 500 });
  const key = new URL(req.url).searchParams.get('key');
  if (req.headers.get('authorization') !== `Bearer ${secret}` && key !== secret)
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const db = serverDb(), today = istToday();
    const lim = new Date(Date.parse(today) + 2 * 864e5).toISOString().slice(0, 10);
    const { data: bills } = await db.from('bills').select('*').neq('status', 'paid').lte('due_date', lim).order('due_date');
    const { data: tasks } = await db.from('tasks').select('*').eq('done', false).lte('due_at', `${today}T23:59:59+05:30`).order('due_at');
    const app = process.env.APP_URL || '';
    for (const b of bills || []) {
      const overdue = b.due_date < today;
      const pay = b.upi_vpa && app
        ? `${app}/pay?pa=${encodeURIComponent(b.upi_vpa)}&pn=${encodeURIComponent(b.title)}&am=${b.amount}` : null;
      await tg(
        `${overdue ? '⛔' : '🚨'} <b>BILL PAYMENT ALERT (INDIA)${overdue ? ' — OVERDUE' : ''}</b>\n• Payee: ${esc(b.title)}\n• Category: ${esc(b.category)}\n• Amount Due: ₹${Number(b.amount).toLocaleString('en-IN')}\n• Due Date: ${b.due_date}`,
        pay, `📲 Tap to Pay via UPI (₹${Number(b.amount).toLocaleString('en-IN')})`);
    }
    if (tasks?.length)
      await tg('📝 <b>Today\'s tasks</b>\n' + tasks.map((t) => `• ${esc(t.title)} [${t.priority}]`).join('\n'));
    return Response.json({ bills: bills?.length || 0, tasks: tasks?.length || 0 });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
