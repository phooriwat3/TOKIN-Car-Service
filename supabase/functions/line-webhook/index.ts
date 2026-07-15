import { createClient } from 'npm:@supabase/supabase-js@2';
const jsonHeaders = { 'Content-Type': 'application/json' };

async function verifyLineSignature(body: string, signature: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  try {
    const expected = Uint8Array.from(atob(signature), (character) => character.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, expected, encoder.encode(body));
  } catch {
    return false;
  }
}

async function sha256Hex(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function lineRequest(path: string, token: string, body: unknown) {
  const response = await fetch(`https://api.line.me${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`LINE API ${response.status}: ${await response.text()}`);
  }
  return response;
}

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { type?: string; userId?: string };
  message?: { type?: string; text?: string };
};

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

async function reply(token: string, replyToken: string | undefined, text: string) {
  if (!replyToken) return;
  await lineRequest('/v2/bot/message/reply', token, {
    replyToken,
    messages: [{ type: 'text', text }],
  });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const body = await request.text();
  const signature = request.headers.get('x-line-signature') ?? '';
  const channelSecret = required('LINE_CHANNEL_SECRET');
  if (!await verifyLineSignature(body, signature, channelSecret)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const accessToken = required('LINE_CHANNEL_ACCESS_TOKEN');
  const admin = createClient(
    required('SUPABASE_URL'),
    required('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } },
  );
  const payload = JSON.parse(body) as { events?: LineEvent[] };

  for (const event of payload.events ?? []) {
    const lineUserId = event.source?.userId;
    if (!lineUserId) continue;

    if (event.type === 'follow') {
      await reply(accessToken, event.replyToken, 'เพิ่มเพื่อนสำเร็จแล้ว กรุณาเปิดหน้า “เชื่อม LINE” ในระบบรถบริษัท แล้วส่ง LINK ตามด้วยรหัสที่ได้รับ');
      continue;
    }

    const text = event.message?.type === 'text' ? event.message.text?.trim() ?? '' : '';
    const match = /^LINK\s+([A-F0-9]{8})$/i.exec(text);
    if (!match) {
      await reply(accessToken, event.replyToken, 'หากต้องการเชื่อมบัญชี กรุณาส่งข้อความในรูปแบบ LINK A1B2C3D4');
      continue;
    }

    const codeHash = await sha256Hex(match[1].toUpperCase());
    const { data: linkCode } = await admin
      .from('line_link_codes')
      .select('id,profile_id,expires_at,used_at')
      .eq('code_hash', codeHash)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (!linkCode) {
      await reply(accessToken, event.replyToken, 'รหัสไม่ถูกต้องหรือหมดอายุ กรุณาสร้างรหัสใหม่จากระบบรถบริษัท');
      continue;
    }

    const { data: existing } = await admin
      .from('line_accounts')
      .select('profile_id')
      .eq('line_user_id', lineUserId)
      .maybeSingle();
    if (existing && existing.profile_id !== linkCode.profile_id) {
      await reply(accessToken, event.replyToken, 'LINE บัญชีนี้เชื่อมกับพนักงานคนอื่นอยู่แล้ว กรุณาติดต่อผู้ดูแลระบบ');
      continue;
    }

    const profileResponse = await fetch(`https://api.line.me/v2/bot/profile/${lineUserId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const lineProfile = profileResponse.ok
      ? await profileResponse.json() as { displayName?: string; pictureUrl?: string }
      : {};

    const { error: accountError } = await admin.from('line_accounts').upsert({
      profile_id: linkCode.profile_id,
      line_user_id: lineUserId,
      display_name: lineProfile.displayName ?? null,
      picture_url: lineProfile.pictureUrl ?? null,
      is_active: true,
      linked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'profile_id' });
    if (accountError) throw accountError;

    await admin.from('line_link_codes').update({ used_at: new Date().toISOString() }).eq('id', linkCode.id);
    await reply(accessToken, event.replyToken, 'เชื่อมบัญชีคนขับสำเร็จแล้ว ระบบจะแจ้งงานใหม่ผ่าน LINE นี้');
  }

  return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
});
