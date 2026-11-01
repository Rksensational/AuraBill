import { authed } from '../../../lib/auth';
import { serverDb } from '../../../lib/db-server';
const tbl = (k) => (k === 'bill' ? 'bills' : 'tasks');
export async function PATCH(req) {
  if (!authed(req)) return Response.json({ error: 'PIN required' }, { status: 401 });
  const { kind, id, done, vpa } = await req.json();
  const now = done ? new Date().toISOString() : null;
  let patch = {};
  if (vpa) patch = { upi_vpa: vpa };
  else if (kind === 'bill') patch = { status: done ? 'paid' : 'unpaid', paid_at: now };
  else patch = { done: !!done, completed_at: now };
  const { error } = await serverDb().from(tbl(kind)).update(patch).eq('id', id);
  return error ? Response.json({ error: error.message }, { status: 500 }) : Response.json({ ok: true });
}
export async function DELETE(req) {
  if (!authed(req)) return Response.json({ error: 'PIN required' }, { status: 401 });
  const { kind, id } = await req.json();
  const { error } = await serverDb().from(tbl(kind)).delete().eq('id', id);
  return error ? Response.json({ error: error.message }, { status: 500 }) : Response.json({ ok: true });
}
