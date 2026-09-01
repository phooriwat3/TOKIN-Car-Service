import { createClient } from 'npm:@supabase/supabase-js@2';

const appBaseUrl = () =>
  Deno.env.get('APP_BASE_URL')?.trim().replace(/\/+$/, '') ||
  'https://carservice.tokin.co.th';

const corsHeaders = (request: Request) => {
  const origin = request.headers.get('origin');
  const allowedOrigin = origin === appBaseUrl() ? origin : appBaseUrl();
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
  };
};
const json = (request: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
});

type CompanyUser = {
  displayName?: unknown;
  mail?: unknown;
  department?: unknown;
  jobTitle?: unknown;
};

function normalizeSearchText(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function orderedLetterPenalty(source: string, query: string) {
  let sourceIndex = 0;
  let penalty = 0;
  for (const letter of query) {
    const matchIndex = source.indexOf(letter, sourceIndex);
    if (matchIndex < 0) return null;
    penalty += matchIndex - sourceIndex;
    sourceIndex = matchIndex + 1;
  }
  return penalty;
}

function computeSearchScore(displayName: string, mail: string, query: string): number {
  const q = normalizeSearchText(query);
  if (!q) return 0;
  const name = normalizeSearchText(displayName);
  const email = normalizeSearchText(mail);
  const compactQuery = q.replace(/[^a-z0-9]/g, '');
  const compactName = name.replace(/[^a-z0-9]/g, '');
  const nameWords = name.split(' ');

  if (name === q) return 1_000_000;
  if (name.startsWith(q)) return 900_000 - Math.min(name.length - q.length, 10_000);
  if (compactQuery && compactName.startsWith(compactQuery)) {
    return 850_000 - Math.min(compactName.length - compactQuery.length, 10_000);
  }
  const wordIndex = nameWords.findIndex(word => word.startsWith(q));
  if (wordIndex >= 0) return 800_000 - wordIndex * 1_000 - Math.min(nameWords[wordIndex].length - q.length, 999);
  const containedAt = name.indexOf(q);
  if (containedAt >= 0) return 700_000 - containedAt * 100;
  if (compactQuery) {
    const orderedPenalty = orderedLetterPenalty(compactName, compactQuery);
    if (orderedPenalty !== null) return 600_000 - Math.min(orderedPenalty, 100_000);
  }
  const emailPrefix = email.split('@')[0];
  if (email === q || emailPrefix === q) return 500_000;
  if (emailPrefix.startsWith(q)) return 400_000;
  if (email.includes(q)) return 300_000;
  return 0;
}
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return json(request, { error: 'Method not allowed.' }, 405);

  try {
    const authorization = request.headers.get('authorization') ?? '';
    const accessToken = authorization.replace(/^Bearer\s+/i, '');
    if (!accessToken) return json(request, { error: 'Authentication is required.' }, 401);

    const body = await request.json();
    const query = typeof body.query === 'string' ? body.query.trim().slice(0, 100) : '';
    if (query.length < 3) return json(request, { error: 'Enter at least 3 characters.' }, 400);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const flowUrl = Deno.env.get('POWER_AUTOMATE_USER_SEARCH_FLOW_URL');
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !flowUrl) return json(request, { users: [] });

    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);
    if (authError || !authData.user) return json(request, { error: 'Authentication is required.' }, 401);
    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: profile, error: profileError } = await db.from('profiles')
      .select('id,is_active').eq('id', authData.user.id).maybeSingle();
    if (profileError || !profile?.is_active) return json(request, { error: 'Active company access is required.' }, 403);

    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const bytes = new TextEncoder().encode(`search:${authData.user.id}:${forwarded}`);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const fingerprint = Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('');
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await db.from('public_request_attempts').select('id', { count: 'exact', head: true })
      .eq('fingerprint', fingerprint).gte('created_at', since);
    if ((count ?? 0) >= 30) return json(request, { error: 'Too many searches. Please try again later.' }, 429);
    await db.from('public_request_attempts').insert({ fingerprint });

    const response = await fetch(flowUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) return json(request, { users: [] });
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
      const scoreDifference = computeSearchScore(b.displayName, b.mail, queryStr) -
        computeSearchScore(a.displayName, a.mail, queryStr);
      return scoreDifference || a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' });
    });

    const users = sortedUsers.slice(0, 8);
    return json(request, { users });
  } catch {
    return json(request, { users: [] });
  }
});
