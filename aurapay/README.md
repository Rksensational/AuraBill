# AuraPay & Task Radar (India) — free stack
Next.js 15 on Vercel • Supabase (Postgres + Realtime) • Gemini 2.5 Flash • Telegram bot • UPI deep links

## Deploy (all free tiers)
1. **Supabase**: new project → SQL Editor → run `supabase/schema.sql`. Copy Project URL, `anon` key, `service_role` key (Settings → API).
2. **Gemini**: free key at https://aistudio.google.com/apikey
3. **Telegram**: talk to @BotFather → `/newbot` → token. Send any message to your bot, open `https://api.telegram.org/bot<TOKEN>/getUpdates`, copy `chat.id`.
4. **GitHub + Vercel**: push this folder to a repo → vercel.com → Import → add every variable from `.env.example` (APP_URL = your Vercel URL) → Deploy.
5. **Telegram webhook** (lets you add bills by chatting with the bot):
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>`
6. **Daily 09:00 IST alert**: `vercel.json` already schedules `/api/cron` at 03:30 UTC (= 09:00 IST). Vercel sends `CRON_SECRET` automatically.
   Alternative: cron-job.org → GET `<APP_URL>/api/cron?key=<CRON_SECRET>` daily 09:00 Asia/Kolkata.
7. Open the app → ⚙ Settings → all green → "Send Telegram test".

## Local
`cp .env.example .env.local` → fill → `npm install && npm run dev`

## Notes
- Writes go through server routes (service role key); the browser only reads via anon key + Realtime. `APP_PIN` locks writes behind a PIN (asked once, stored in your browser).
- Telegram buttons only accept https links, so "Tap to Pay" opens `<APP_URL>/pay`, which hands off to GPay/PhonePe/Paytm via `upi://pay`. A bill needs a payee UPI ID: Gemini picks it up if the SMS has one, otherwise the app asks once on first "Pay UPI" and remembers it.
- This is single-user. For multi-user, add Supabase Auth and a `user_id` column with per-user RLS.
