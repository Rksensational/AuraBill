import { authed } from '../../../lib/auth';
import { serverDb } from '../../../lib/db-server';
const tbl = (k) => (k === 'bill' ? 'bills' : 'tasks');
const VPA = /^[\w.\-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;
const fail = (m, s = 500) => Response.json({ error: m }, { status: s });
export async function PATCH(req) {
  if (!authed(req)) return fail('PIN required', 401);
  try {
    const { kind, id, done, vpa } = await req.json();
    const now = done ? new Date().toISOString() : null;
    let patch;
    if (vpa !== undefined) { if (!VPA.test(vpa)) return fail('Invalid UPI ID (use name@bank)', 400); patch = { upi_vpa: vpa }; }
    else if (kind === 'bill') patch = { status: done ? 'paid' : 'unpaid', paid_at: now };
    else patch = { done: !!done, completed_at: now };
    const { error } = await serverDb().from(tbl(kind)).update(patch).eq('id', id);
    return error ? fail(error.message) : Response.json({ ok: true });
  } catch (e) { return fail(e.message); }
}
export async function DELETE(req) {
  if (!authed(req)) return fail('PIN required', 401);
  try {
    const { kind, id } = await req.json();
    const { error } = await serverDb().from(tbl(kind)).delete().eq('id', id);
    return error ? fail(error.message) : Response.json({ ok: true });
  } catch (e) { return fail(e.message); }
}
