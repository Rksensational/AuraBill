const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const link = `upi://pay?pa=${encodeURIComponent(q.get('pa') || '')}&pn=${encodeURIComponent(q.get('pn') || '')}&am=${encodeURIComponent(q.get('am') || '')}&cu=INR`;
  const html = `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><meta http-equiv=refresh content="0;url=${esc(link)}"><title>Pay</title><body style="font-family:sans-serif;background:#050816;color:#fff;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><p>Opening your UPI app…</p><a href="${esc(link)}" style="background:#f97316;color:#fff;padding:14px 22px;border-radius:12px;text-decoration:none;font-weight:700">Pay ₹${esc(q.get('am') || '')} via UPI</a></div>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
