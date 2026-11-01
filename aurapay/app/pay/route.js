const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const APPS = [
  ['Google Pay', 'gpay://upi/pay', 'com.google.android.apps.nbu.paisa.user', '#1a73e8'],
  ['PhonePe', 'phonepe://pay', 'com.phonepe.app', '#5f259f'],
  ['Paytm', 'paytmmp://pay', 'net.one97.paytm', '#00b9f1'],
  ['BHIM', 'bhim://upi/pay', 'in.org.npci.upiapp', '#e8590c']
];
export async function GET(req) {
  const u = new URL(req.url), p = u.searchParams;
  const pa = p.get('pa') || '', pn = p.get('pn') || '', am = p.get('am') || '', tn = p.get('tn') || pn;
  if (!/^[\w.\-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/.test(pa)) return new Response('Invalid UPI ID', { status: 400 });
  const q = `pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${encodeURIComponent(am)}&cu=INR&tn=${encodeURIComponent(tn)}`;
  const android = /android/i.test(req.headers.get('user-agent') || '');
  const link = (scheme, pkg) => android ? `intent://upi/pay?${q}#Intent;scheme=upi;package=${pkg};end` : `${scheme}?${q}`;
  const btn = (label, href, color) => `<a class="b" style="background:${color}" href="${esc(href)}">${esc(label)}</a>`;
  const html = `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>Pay ${esc(pn)}</title>
<style>body{margin:0;background:#050816;color:#e6e9f5;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;padding:16px}
.c{width:min(420px,100%);background:#0b1226;border:1px solid #1c2745;border-radius:18px;padding:22px}h2{margin:0 0 4px}.m{color:#8a96bd;font-size:13px}
.amt{font-size:34px;font-weight:800;margin:14px 0}.b{display:block;text-align:center;color:#fff;text-decoration:none;font-weight:700;padding:14px;border-radius:12px;margin-top:10px}
button{width:100%;margin-top:10px;padding:12px;border-radius:12px;border:1px solid #243257;background:#10172e;color:#e6e9f5;font:inherit}</style>
<div class=c><h2>${esc(pn)}</h2><div class=m>${esc(pa)}</div><div class=amt>₹${esc(Number(am || 0).toLocaleString('en-IN'))}</div>
${btn('📲 Open any UPI app', `upi://pay?${q}`, '#ea580c')}
${APPS.map(([n, s, pkg, c]) => btn(n, link(s, pkg), c)).join('')}
<button onclick="navigator.clipboard.writeText('${esc(pa)}').then(()=>this.textContent='✅ UPI ID copied')">📋 Copy UPI ID (pay manually in any app)</button>
<p class=m>Best on your phone. Not opening? Install the app, or copy the UPI ID and pay manually. Some apps decline pre-filled payments to registered merchants; if that happens use the UPI ID or the biller's own app.</p></div>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
