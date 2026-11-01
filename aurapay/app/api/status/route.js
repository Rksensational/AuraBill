import { authed } from '../../../lib/auth';
import { tg } from '../../../lib/telegram';
export async function GET() {
  const e = process.env;
  return Response.json({
    supabase: !!(e.NEXT_PUBLIC_SUPABASE_URL && e.NEXT_PUBLIC_SUPABASE_ANON_KEY && e.SUPABASE_SERVICE_ROLE_KEY),
    gemini: !!e.GEMINI_API_KEY, telegram: !!(e.TELEGRAM_BOT_TOKEN && e.TELEGRAM_CHAT_ID),
    pin: !!e.APP_PIN, appUrl: !!e.APP_URL, cron: !!e.CRON_SECRET
  });
}
export async function POST(req) {
  if (!authed(req)) return Response.json({ error: 'PIN required' }, { status: 401 });
  try { await tg('✅ AuraPay test message — Telegram is connected.'); return Response.json({ ok: true }); }
  catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
