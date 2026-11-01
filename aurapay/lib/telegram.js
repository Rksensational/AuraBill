export async function tg(text, url, label = '📲 Tap to Pay via UPI') {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) throw new Error('Telegram not configured');
  const body = { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true };
  if (url && url.startsWith('https://')) body.reply_markup = { inline_keyboard: [[{ text: label, url }]] };
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('Telegram: ' + (await r.text()));
}
export const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
