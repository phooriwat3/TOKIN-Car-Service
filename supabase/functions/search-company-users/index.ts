import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

type CompanyUser = {
  displayName?: unknown;
  mail?: unknown;
  department?: unknown;
  jobTitle?: unknown;
};

function computeSearchScore(displayName: string, mail: string, query: string): number {
  const q = query.toLowerCase().trim();
  const name = displayName.toLowerCase();
  const email = mail.toLowerCase();

  if (name === q) return 1000;
  if (email === q || email.split('@')[0] === q) return 900;

  if (name.startsWith(q)) return 500;
  if (email.startsWith(q)) return 400;

  const nameWords = name.split(/\s+/);
  if (nameWords.some((word) => word.startsWith(q))) return 300;

  const emailPrefix = email.split('@')[0];
  const emailParts = emailPrefix.split(/[\._\-]/);
  if (emailParts.some((part) => part.startsWith(q))) return 200;

  if (name.includes(q)) return 100;
  if (email.includes(q)) return 50;

  return 0;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const body = await request.json();
    const query = typeof body.query === 'string' ? body.query.trim().slice(0, 100) : '';
    if (query.length < 2) return json({ users: [] });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const flowUrl = Deno.env.get('POWER_AUTOMATE_USER_SEARCH_FLOW_URL');
    if (!supabaseUrl || !serviceRoleKey || !flowUrl) return json({ users: [] });

    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const bytes = new TextEncoder().encode(`search:${forwarded}:${request.headers.get('user-agent') || ''}`);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const fingerprint = Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('');
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await db.from('public_request_attempts').select('id', { count: 'exact', head: true })
      .eq('fingerprint', fingerprint).gte('created_at', since);
    if ((count ?? 0) >= 30) return json({ error: 'Too many searches. Please try again later.' }, 429);
    await db.from('public_request_attempts').insert({ fingerprint });

    const response = await fetch(flowUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) return json({ users: [] });
    const result = await response.json();
    const source: CompanyUser[] = Array.isArray(result) ? result : Array.isArray(result?.users) ? result.users : [];
    
    const mappedUsers = source.flatMap((item) => {
      const displayName = typeof item.displayName === 'string' ? item.displayName.trim() : '';
      const mail = typeof item.mail === 'string' ? item.mail.trim().toLowerCase() : '';
      if (!displayName || !mail || !mail.includes('@')) return [];
      return [{
        displayName,
        mail,
        department: typeof item.department === 'string' ? item.department.trim() : '',
        jobTitle: typeof item.jobTitle === 'string' ? item.jobTitle.trim() : '',
      }];
    });

    const queryStr = query.toLowerCase();
    const sortedUsers = mappedUsers.sort((a, b) => {
      const scoreA = computeSearchScore(a.displayName, a.mail, queryStr);
      const scoreB = computeSearchScore(b.displayName, b.mail, queryStr);
      return scoreB - scoreA;
    });

    const users = sortedUsers.slice(0, 8);
    return json({ users });
  } catch {
    return json({ users: [] });
  }
});
