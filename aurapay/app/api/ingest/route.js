import { authed } from '../../../lib/auth';
import { ingest } from '../../../lib/ingest';
export const maxDuration = 30;
export async function POST(req) {
  if (!authed(req)) return Response.json({ error: 'PIN required' }, { status: 401 });
  try {
    const { text } = await req.json();
    if (!text?.trim()) return Response.json({ error: 'Empty text' }, { status: 400 });
    return Response.json({ items: await ingest(text.slice(0, 4000)) });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
