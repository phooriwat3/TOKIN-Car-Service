import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/http.ts';
import { sha256Hex, token } from '../_shared/request-access.ts';

const outcomes: Record<string, 'approved' | 'rejected' | 'changes_requested'> = {
  approve: 'approved',
  reject: 'rejected',
  request_changes: 'changes_requested',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Service configuration is missing.' }, 500);

    const body = await request.json();
    const tokenHash = await sha256Hex(token(body?.token));
    const action = outcomes[String(body?.action ?? '')];
    if (!action) return json({ error: 'Approval action is invalid.' }, 400);
    const comments = typeof body?.comments === 'string' ? body.comments.trim().slice(0, 2000) : '';
    if (action !== 'approved' && !comments) return json({ error: 'Comments are required.' }, 400);

    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: access, error: accessError } = await db.from('request_access_tokens')
      .select('id,booking_id,revision_no,subject_email,expires_at,used_at,revoked_at')
      .eq('token_hash', tokenHash).eq('token_type', 'approval').maybeSingle();
    if (accessError) throw accessError;
    if (!access || access.used_at || access.revoked_at) {
      return json({ error: 'This approval link is invalid or has already been used.' }, 401);
    }
    if (new Date(access.expires_at).getTime() <= Date.now()) return json({ error: 'This approval link has expired.' }, 410);

    const { data: booking, error: bookingError } = await db.from('bookings')
      .select('id,booking_no,status,revision_no,approver_name,approver_email')
      .eq('id', access.booking_id).maybeSingle();
    if (bookingError) throw bookingError;
    if (!booking || booking.revision_no !== access.revision_no) {
      return json({ error: 'A newer version of this request exists. Please use the latest approval email.' }, 409);
    }
    if (booking.status !== 'pending_approval') return json({ error: `This request is already ${booking.status}.` }, 409);

    const { data: updated, error: updateError } = await db.from('bookings').update({
      status: action,
      reject_reason: action === 'approved' ? null : comments,
      updated_at: new Date().toISOString(),
    }).eq('id', booking.id).eq('status', 'pending_approval').eq('revision_no', access.revision_no)
      .select('id,booking_no,status').maybeSingle();
    if (updateError) throw updateError;
    if (!updated) return json({ error: 'This request was already processed.' }, 409);

    const { error: approvalError } = await db.from('approvals').insert({
      booking_id: booking.id,
      approver_id: null,
      approver_name: booking.approver_name,
      approver_email: booking.approver_email || access.subject_email,
      action,
      comments,
    });
    if (approvalError) throw approvalError;
    await db.from('request_access_tokens').update({ used_at: new Date().toISOString() }).eq('id', access.id);

    return json({ ok: true, requestId: booking.id, requestNo: booking.booking_no, status: action });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unable to record approval.';
    const clientError = /invalid|required|expired|already|newer version/i.test(message);
    return json({ error: message }, clientError ? 400 : 500);
  }
});
