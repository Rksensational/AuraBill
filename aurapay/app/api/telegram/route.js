import { ingest } from '../../../lib/ingest';
import { serverDb } from '../../../lib/db-server';
import { tg, esc } from '../../../lib/telegram';
export const maxDuration = 30;
export async function POST(req) {
  const s = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (s && req.headers.get('x-telegram-bot-api-secret-token') !== s) return new Response('no', { status: 401 });
  const m = (await req.json()).message;
  if (!m?.text || String(m.chat.id) !== String(process.env.TELEGRAM_CHAT_ID)) return Response.json({ ok: true });
  try {
    if (m.text.startsWith('/due')) {
      const { data } = await serverDb().from('bills').select('*').neq('status', 'paid').order('due_date');
      await tg(data?.length ? '🧾 <b>Unpaid bills</b>\n' + data.map((b) => `• ${esc(b.title)} — ₹${Number(b.amount).toLocaleString('en-IN')} (${b.due_date})`).join('\n') : '🎉 No unpaid bills');
    } else if (m.text.startsWith('/start')) {
      await tg('Send me a bank SMS or a task in plain text and I will add it. /due lists unpaid bills.');
    } else {
      const items = await ingest(m.text);
      await tg(items.length ? '✅ Added:\n' + items.map((i) => `• ${i.kind}: ${esc(i.title)}${i.amount ? ' ₹' + i.amount : ''}${i.due_date ? ' (' + i.due_date + ')' : ''}`).join('\n') : 'Nothing found to add.');
    }
  } catch (e) { await tg('⚠️ ' + esc(e.message)).catch(() => {}); }
  return Response.json({ ok: true });
}
