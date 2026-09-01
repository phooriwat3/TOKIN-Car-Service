import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/http.ts';
import { randomToken, sha256Hex, token } from '../_shared/request-access.ts';
import { manageEmail } from '../_shared/email-template.ts';

const outcomes: Record<string, 'approved' | 'rejected' | 'changes_requested'> = {
  approve: 'approved',
  reject: 'rejected',
  request_changes: 'changes_requested',
};

const appBaseUrl = () => {
  const configured = Deno.env.get('APP_BASE_URL')?.trim().replace(/\/+$/, '');
  return configured || 'https://carservice.tokin.co.th';
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
      .select('id,booking_no,status,revision_no,request_type,requester_name,requester_email,requester_department,approver_name,approver_email,using_date,start_time,end_time,pickup_location,destination,purpose')
      .eq('id', access.booking_id).maybeSingle();
    if (bookingError) throw bookingError;
    if (!booking || booking.revision_no !== access.revision_no) {
      return json({ error: 'A newer version of this request exists. Please use the latest approval email.' }, 409);
    }
    if (booking.status !== 'pending_approval') return json({ error: `This request is already ${booking.status}.` }, 409);

    const { data: decision, error: decisionError } = await db.rpc('process_approval_callback', {
      p_booking_id: booking.id,
      p_action: action,
      p_comments: comments,
      p_approver_name: booking.approver_name ?? '',
      p_approver_email: booking.approver_email || access.subject_email || '',
    });
    if (decisionError) throw decisionError;
    const result = decision as { outcome?: string; status?: string } | null;
    if (result?.outcome === 'already_processed') {
      return json({ ok: true, alreadyProcessed: true, requestId: booking.id, status: result.status });
    }
    if (result?.outcome !== 'processed' || result.status !== action)
      throw new Error('Approval processing returned an invalid response.');

    await db.from('request_access_tokens').update({ used_at: new Date().toISOString() }).eq('id', access.id);

    let requesterNotificationStatus: 'sent' | 'failed' | 'not_configured' | 'not_required' = 'not_required';
    let manageUrl: string | null = null;
    if (action === 'changes_requested') {
      const now = new Date().toISOString();
      const manageToken = randomToken();
      const manageTokenHash = await sha256Hex(manageToken);
      const manageTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
      manageUrl = `${appBaseUrl()}/request/manage?token=${encodeURIComponent(manageToken)}`;

      const { error: revokeError } = await db.from('request_access_tokens').update({ revoked_at: now })
        .eq('booking_id', booking.id)
        .eq('token_type', 'requester_manage')
        .is('used_at', null)
        .is('revoked_at', null);
      if (revokeError) throw revokeError;

      const { error: manageTokenError } = await db.from('request_access_tokens').insert({
        booking_id: booking.id,
        token_type: 'requester_manage',
        token_hash: manageTokenHash,
        revision_no: booking.revision_no,
        subject_email: booking.requester_email,
        expires_at: manageTokenExpiresAt,
      });
      if (manageTokenError) throw manageTokenError;

      const requesterManageFlowUrl = Deno.env.get('POWER_AUTOMATE_REQUESTER_MANAGE_FLOW_URL');
      requesterNotificationStatus = requesterManageFlowUrl ? 'failed' : 'not_configured';
      if (requesterManageFlowUrl) {
        try {
          const requesterEmailTemplate = manageEmail({
            event: 'request.changes_requested', requestNo: booking.booking_no,
            requestType: booking.request_type, requesterName: booking.requester_name,
            requesterDepartment: booking.requester_department, approverName: booking.approver_name,
            usingDate: booking.using_date, startTime: booking.start_time, endTime: booking.end_time,
            pickupLocation: booking.pickup_location, destination: booking.destination,
            purpose: booking.purpose, comments, manageUrl, expiresAt: manageTokenExpiresAt,
          });
          const response = await fetch(requesterManageFlowUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'request.changes_requested',
              requestId: booking.id,
              requestNo: booking.booking_no,
              requestType: booking.request_type,
              requester: {
                name: booking.requester_name,
                email: booking.requester_email,
                department: booking.requester_department,
              },
              approver: {
                name: booking.approver_name,
                email: booking.approver_email || access.subject_email,
              },
              usingDate: booking.using_date,
              startTime: booking.start_time,
              endTime: booking.end_time,
              pickupLocation: booking.pickup_location,
              destination: booking.destination,
              purpose: booking.purpose,
              comments,
              manageUrl,
              expiresAt: manageTokenExpiresAt,
              ...requesterEmailTemplate,
            }),
          });
          requesterNotificationStatus = response.ok ? 'sent' : 'failed';
        } catch {
          requesterNotificationStatus = 'failed';
        }
      }

      await db.from('bookings').update({
        requester_manage_email_status: requesterNotificationStatus,
      }).eq('id', booking.id);
    }

    return json({
      ok: true,
      requestId: booking.id,
      requestNo: booking.booking_no,
      status: action,
      requesterNotificationStatus,
      manageUrl,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Unable to record approval.';
    const clientError = /invalid|required|expired|already|newer version/i.test(message);
    return json({ error: message }, clientError ? 400 : 500);
  }
});
