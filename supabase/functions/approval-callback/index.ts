import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/http.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rate-limit.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const clientIp = request.headers.get('x-forwarded-for') ?? 'anonymous';
  const rateLimit = checkRateLimit(`approval-callback:${clientIp}`, 30, 60_000);
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { ...corsHeaders, ...getRateLimitHeaders(30, rateLimit.remaining, rateLimit.resetAt) },
    });
  }

  const expectedSecret = Deno.env.get('POWER_AUTOMATE_CALLBACK_SECRET');
  const suppliedSecret = request.headers.get('x-tokin-callback-secret');
  if (!expectedSecret || suppliedSecret !== expectedSecret) return json({ error: 'Unauthorized.' }, 401);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Service configuration is missing.' }, 500);
    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const body = await request.json();
    const bookingId = typeof body.requestId === 'string' ? body.requestId : '';
    const rawOutcome = String(body.outcome ?? '').trim().toLowerCase();
    const outcomes: Record<string, 'approved' | 'rejected'> = {
      approve: 'approved', approved: 'approved',
      reject: 'rejected', rejected: 'rejected',
    };
    const action = outcomes[rawOutcome];
    if (!bookingId || !action) return json({ error: 'Invalid approval response.' }, 400);
    const comments = typeof body.comments === 'string' ? body.comments.trim().slice(0, 2000) : '';
    if (action !== 'approved' && !comments) return json({ error: 'Comments are required.' }, 400);

    const { data: booking, error: lookupError } = await db.from('bookings')
      .select('id,status,approver_name,approver_email').eq('id', bookingId).single();
    if (lookupError || !booking) return json({ error: 'Request not found.' }, 404);
    if (booking.status !== 'pending_approval') return json({ ok: true, alreadyProcessed: true, status: booking.status });

    const { error: approvalError } = await db.from('approvals').insert({
      booking_id: booking.id,
      approver_id: null,
      approver_name: typeof body.approverName === 'string' ? body.approverName.trim().slice(0, 200) : booking.approver_name,
      approver_email: typeof body.approverEmail === 'string' ? body.approverEmail.trim().toLowerCase().slice(0, 240) : booking.approver_email,
      action,
      comments,
    });
    if (approvalError) throw approvalError;

    const { error: updateError } = await db.from('bookings').update({
      status: action,
      reject_reason: action === 'approved' ? null : comments,
      updated_at: new Date().toISOString(),
    }).eq('id', booking.id).eq('status', 'pending_approval');
    if (updateError) throw updateError;

    return json({ ok: true, requestId: booking.id, status: action });
  } catch (cause) {
    return json({ error: cause instanceof Error ? cause.message : 'Unable to record approval.' }, 500);
  }
});
